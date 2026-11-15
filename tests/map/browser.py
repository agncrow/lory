#!/usr/bin/env python3
"""The map example's web build, checked in headless Chrome.

    python3 -I tests/map/browser.py [BUILD] [--shots DIR]

BUILD is the example's web build, examples/map/main_web by default (made by
`crow build --target web main.co` in examples/map). The build's folder is
served on a free port of this Mac's own address, and
this Mac's Chrome (LORY_CHROME names another) opens it headless. Nothing
reaches the network: every tile asked of tile.openstreetmap.org is answered
here with a picture made for it (a pale square, its colour telling its zoom,
edged in a darker line), and anything else the page asks of another host is
refused. Then, as a reader would:

  - the world is drawn in its tiles, with the zoom buttons, the scale bar and
    the credit over them, and nothing thrown;
  - a slow drag moves the picture with the pointer, as far as it went;
  - the wheel zooms in, and the next zoom's tiles are asked for and drawn;
  - the Tokyo button flies the map there, its tiles asked for at zoom 9, its
    cafés drawn in clusters;
  - a press on Tokyo's marker opens its popup.

`--shots DIR` keeps a picture of each step. Python's own library alone is
used; nothing is installed.
"""

import argparse
import base64
import http.server
import json
import math
import os
import re
import shutil
import socket
import struct
import subprocess
import sys
import tempfile
import threading
import time
import urllib.parse
import urllib.request
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
BUILT = os.path.join(HERE, '..', '..', 'examples', 'map', 'main_web')
CHROME = os.environ.get('LORY_CHROME') or '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
WIDE, TALL = 1000, 700
BAR = 56
TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm',
         '.json': 'application/json', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.ico': 'image/x-icon'}


class Failed(Exception):
    """A check that did not hold, said in a line."""


# ---- pictures: a tile made, a screenshot read ----

def tile_png(z):
    """A 256-pixel tile for zoom z: pale, a shade darker each zoom, edged in a darker line."""
    base = (226, 238 - 4 * z, 228)
    edge = (110, 130, 120)
    rows = []
    for y in range(256):
        row = bytearray([0])
        for x in range(256):
            row += bytes(edge if x < 2 or y < 2 else base)
        rows.append(bytes(row))
    raw = zlib.compress(b''.join(rows), 6)

    def chunk(kind, data):
        return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!IIBBBBB', 256, 256, 8, 2, 0, 0, 0)) + chunk(b'IDAT', raw) + chunk(b'IEND', b'')


def tile_colour(z):
    return (226, 238 - 4 * z, 228)


class Picture:
    """A PNG's pixels (8 bits a channel, not interlaced, as Chrome writes them)."""

    def __init__(self, data):
        if data[:8] != b'\x89PNG\r\n\x1a\n':
            raise Failed('a screenshot was not a PNG')
        at, idat = 8, b''
        while at < len(data):
            n, kind = struct.unpack('!I4s', data[at:at + 8])
            body = data[at + 8:at + 8 + n]
            if kind == b'IHDR':
                self.w, self.h, depth, ctype = struct.unpack('!IIBB', body[:10])
                if depth != 8 or ctype not in (2, 6):
                    raise Failed('a screenshot of an unexpected kind (%d bits, colour type %d)' % (depth, ctype))
                self.bpp = 3 if ctype == 2 else 4
            elif kind == b'IDAT':
                idat += body
            at += 12 + n
        raw = zlib.decompress(idat)
        stride = self.w * self.bpp
        out = bytearray(stride * self.h)
        prev = bytearray(stride)
        p = 0
        for y in range(self.h):
            f = raw[p]
            line = bytearray(raw[p + 1:p + 1 + stride])
            p += 1 + stride
            b = self.bpp
            for i in range(stride):
                a = line[i - b] if i >= b else 0
                c = prev[i - b] if i >= b else 0
                u = prev[i]
                if f == 1:
                    line[i] = (line[i] + a) & 255
                elif f == 2:
                    line[i] = (line[i] + u) & 255
                elif f == 3:
                    line[i] = (line[i] + (a + u) // 2) & 255
                elif f == 4:
                    pa, pb, pc = abs(u - c), abs(a - c), abs(a + u - 2 * c)
                    line[i] = (line[i] + (a if pa <= pb and pa <= pc else u if pb <= pc else c)) & 255
            out[y * stride:(y + 1) * stride] = line
            prev = line
        self.px = out

    def at(self, x, y):
        i = (int(y) * self.w + int(x)) * self.bpp
        return tuple(self.px[i:i + 3])


def near(a, b, by=12):
    return all(abs(p - q) <= by for p, q in zip(a, b))


def mercator_y(lat, z):
    """How far down the world's picture at zoom z a latitude is, in pixels."""
    s = math.sin(math.radians(lat))
    return 256 * 2 ** z * (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi))


# ---- the build served, and Chrome spoken to over its debugging socket ----

def serving(folder):
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=folder, **k)

        def guess_type(self, path):
            return TYPES.get(os.path.splitext(path)[1], 'application/octet-stream')

        def log_message(self, *a):
            pass
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


class Tab:
    """A page of Chrome's: methods asked, events heard, tiles answered as they are asked for."""

    def __init__(self, url, origin):
        u = urllib.parse.urlparse(url)
        self.s = socket.create_connection((u.hostname, u.port), timeout=30)
        key = base64.b64encode(os.urandom(16)).decode()
        self.s.sendall(('GET %s HTTP/1.1\r\nHost: %s:%d\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
                        'Sec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n' % (u.path, u.hostname, u.port, key)).encode())
        head = b''
        while b'\r\n\r\n' not in head:
            head += self.s.recv(4096)
        self.rest = head.split(b'\r\n\r\n', 1)[1]
        self.n = 0
        self.origin = origin
        self.tiles = []
        self.refused = []
        self.thrown = []
        self.pngs = {}

    def _send(self, data):
        n = len(data)
        head = struct.pack('!BB', 0x81, 0x80 | n) if n < 126 else struct.pack('!BBH', 0x81, 0xfe, n) if n < 65536 else struct.pack('!BBQ', 0x81, 0xff, n)
        self.s.sendall(head + b'\x00\x00\x00\x00' + data)

    def _take(self, n):
        while len(self.rest) < n:
            got = self.s.recv(1 << 16)
            if not got:
                raise Failed('Chrome closed its debugging socket')
            self.rest += got
        out, self.rest = self.rest[:n], self.rest[n:]
        return out

    def _message(self):
        whole = b''
        while True:
            b0, b1 = self._take(2)
            n = b1 & 0x7f
            if n == 126:
                n = struct.unpack('!H', self._take(2))[0]
            elif n == 127:
                n = struct.unpack('!Q', self._take(8))[0]
            body = self._take(n)
            if b0 & 0x0f in (0, 1, 2):
                whole += body
                if b0 & 0x80:
                    return json.loads(whole)

    def _post(self, method, params):
        self.n += 1
        self._send(json.dumps({'id': self.n, 'method': method, 'params': params}).encode())
        return self.n

    def _heard(self, m):
        method = m.get('method')
        if method == 'Fetch.requestPaused':
            p = m['params']
            url = p['request']['url']
            found = re.match(r'https://tile\.openstreetmap\.org/(\d+)/(-?\d+)/(-?\d+)\.png$', url)
            if url.startswith(self.origin):
                self._post('Fetch.continueRequest', {'requestId': p['requestId']})
            elif found:
                z = int(found.group(1))
                self.tiles.append((z, int(found.group(2)), int(found.group(3))))
                if z not in self.pngs:
                    self.pngs[z] = base64.b64encode(tile_png(z)).decode()
                self._post('Fetch.fulfillRequest', {'requestId': p['requestId'], 'responseCode': 200, 'body': self.pngs[z],
                                                    'responseHeaders': [{'name': 'Content-Type', 'value': 'image/png'},
                                                                        {'name': 'Access-Control-Allow-Origin', 'value': '*'}]})
            else:
                self.refused.append(url)
                self._post('Fetch.failRequest', {'requestId': p['requestId'], 'errorReason': 'BlockedByClient'})
        elif method == 'Runtime.exceptionThrown':
            d = m['params']['exceptionDetails']
            self.thrown.append(d.get('exception', {}).get('description') or d.get('text', ''))
        elif method == 'Runtime.consoleAPICalled' and m['params'].get('type') == 'error':
            self.thrown.append(' '.join(str(a.get('value', a.get('description', ''))) for a in m['params'].get('args', [])))

    def ask(self, method, params=None, timeout=30):
        mine = self._post(method, params or {})
        till = time.time() + timeout
        while True:
            self.s.settimeout(max(0.05, till - time.time()))
            try:
                m = self._message()
            except socket.timeout:
                raise Failed('%s was not answered in %d s' % (method, timeout))
            if m.get('id') == mine:
                if 'error' in m:
                    raise Failed('%s: %s' % (method, m['error'].get('message')))
                return m.get('result', {})
            self._heard(m)

    def wait(self, seconds):
        """Seconds let pass, the page's asking answered meanwhile."""
        till = time.time() + seconds
        while time.time() < till:
            self.s.settimeout(max(0.01, till - time.time()))
            try:
                self._heard(self._message())
            except socket.timeout:
                pass

    def picture(self):
        shot = self.ask('Page.captureScreenshot', {'format': 'png'})
        return Picture(base64.b64decode(shot['data']))

    def mouse(self, kind, x, y, buttons=0, **more):
        params = {'type': kind, 'x': x, 'y': y, 'button': 'left' if kind != 'mouseMoved' or buttons else 'none', 'buttons': buttons, 'clickCount': 1 if kind != 'mouseMoved' else 0}
        params.update(more)
        self.ask('Input.dispatchMouseEvent', params)

    def press(self, x, y):
        self.mouse('mouseMoved', x, y)
        self.mouse('mousePressed', x, y, 1)
        self.mouse('mouseReleased', x, y, 0)


def chrome():
    if not os.path.exists(CHROME):
        raise Failed('no Chrome at %s (LORY_CHROME names another)' % CHROME)
    folder = tempfile.mkdtemp(prefix='lory-map-')
    p = subprocess.Popen([CHROME, '--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + folder, '--no-first-run',
                          '--no-default-browser-check', '--disable-extensions', '--mute-audio', '--hide-scrollbars',
                          '--window-size=%d,%d' % (WIDE, TALL), '--ignore-gpu-blocklist', '--disable-background-timer-throttling',
                          '--disable-renderer-backgrounding', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    told = os.path.join(folder, 'DevToolsActivePort')
    till = time.time() + 20
    while not os.path.exists(told) or not open(told).read().strip():
        if time.time() > till or p.poll() is not None:
            raise Failed('Chrome did not start')
        time.sleep(0.05)
    port = int(open(told).read().split('\n')[0])
    return p, folder, port


# ---- the checks ----

def map_share(pic, z):
    """How much of the map's box shows zoom z's tiles (their fill or their edge)."""
    fill, edge, seen, hits = tile_colour(z), (110, 130, 120), 0, 0
    for y in range(BAR + 90, TALL - 60, 9):
        for x in range(60, WIDE - 20, 9):
            seen += 1
            c = pic.at(x, y)
            if near(c, fill, 3) or near(c, edge, 10):
                hits += 1
    return hits / seen


def edge_columns(pic, y):
    """Where the tiles' vertical edges cross a row of the map."""
    out = []
    for x in range(1, WIDE - 1):
        if near(pic.at(x, y), (110, 130, 120), 10) and not near(pic.at(x - 1, y), (110, 130, 120), 10):
            out.append(x)
    return out


def buttons(pic):
    """The bar's buttons, left to right: (left, right) of each run of columns unlike the page."""
    page = pic.at(4, 4)
    runs, start, gap = [], -1, 0
    for x in range(0, WIDE):
        unlike = any(not near(pic.at(x, y), page, 20) for y in range(12, 48, 2))
        if unlike:
            if start < 0:
                start = x
            gap = 0
        elif start >= 0:
            gap += 1
            if gap >= 5:
                runs.append((start, x - gap))
                start, gap = -1, 0
    return [r for r in runs if r[1] - r[0] >= 30]


def run(build, shots):
    if not os.path.exists(os.path.join(build, 'index.html')):
        raise Failed('no web build at %s (crow build --target web main.co in examples/map)' % build)
    server = serving(build)
    origin = 'http://127.0.0.1:%d/' % server.server_address[1]
    p, folder, port = chrome()
    held = []
    try:
        with urllib.request.urlopen('http://127.0.0.1:%d/json/list' % port, timeout=6) as r:
            page = [t for t in json.load(r) if t.get('type') == 'page'][0]
        tab = Tab(page['webSocketDebuggerUrl'], origin)
        tab.ask('Runtime.enable')
        tab.ask('Page.enable')
        tab.ask('Fetch.enable', {'patterns': [{'urlPattern': '*', 'requestStage': 'Request'}]})
        tab.ask('Emulation.setDeviceMetricsOverride', {'width': WIDE, 'height': TALL, 'deviceScaleFactor': 1, 'mobile': False})
        tab.ask('Page.navigate', {'url': origin + 'index.html'})

        def keep(name, pic):
            if shots:
                os.makedirs(shots, exist_ok=True)
                shot = tab.ask('Page.captureScreenshot', {'format': 'png'})
                with open(os.path.join(shots, name + '.png'), 'wb') as f:
                    f.write(base64.b64decode(shot['data']))
            return pic

        def check(what, holds):
            held.append((what, bool(holds)))
            print(('  held  ' if holds else '  FAILED ') + what)

        # (the world, once its tiles have come)
        till = time.time() + 40
        while time.time() < till and len({t for t in tab.tiles if t[0] == 2}) < 8:
            tab.wait(0.25)
        tab.wait(1.5)
        world = keep('world', tab.picture())
        asked = {t for t in tab.tiles if t[0] == 2}
        check('the world asks for its tiles at zoom 2 (%d of them)' % len(asked), len(asked) >= 8)
        share = map_share(world, 2)
        check('the tiles are drawn over the map (%.0f%% of it)' % (100 * share), share > 0.55)
        check('the zoom-in button is white with a dark cross',
              near(world.at(16, BAR + 16), (255, 255, 255), 10) and sum(world.at(27, BAR + 27)) < 120)
        greys = sum(1 for x in range(5, 140) for y in range(TALL - 45, TALL - 4) if near(world.at(x, y), (119, 119, 119), 14))
        check('the scale bar is drawn at the bottom left (%d grey pixels of its edge)' % greys, greys > 60)
        pale = sum(1 for x in range(WIDE - 150, WIDE) for y in range(TALL - 15, TALL) if min(world.at(x, y)) >= 236)
        check('the credit is written on its pale strip at the bottom right', pale > 600)
        # (Paris at zoom 2, from the map's middle at 30 10: across by its
        # longitude, down by Mercator's y)
        paris = (WIDE / 2 + (2.3522 - 10.0) / 360 * 1024, BAR + (TALL - BAR) / 2 + mercator_y(48.8566, 2) - mercator_y(30.0, 2))
        head = world.at(paris[0], paris[1] - 36)
        check('the Paris marker stands at its place (its head %s)' % (head,), near(head, (51, 136, 255), 40))
        check('nothing was thrown', not tab.thrown)

        # (a slow drag: no throw at its end, the picture moved as far as the pointer)
        row = BAR + 300
        before = edge_columns(world, row)
        tab.mouse('mouseMoved', 500, 400)
        tab.mouse('mousePressed', 500, 400, 1)
        for i in range(1, 11):
            tab.mouse('mouseMoved', 500 + 10 * i, 400, 1)
            tab.wait(0.03)
        tab.wait(0.25)
        tab.mouse('mouseReleased', 600, 400, 0)
        tab.wait(0.8)
        dragged = keep('dragged', tab.picture())
        after = edge_columns(dragged, row)
        check('a slow drag moves the picture with the pointer, 100 pixels (edges %s, then %s)' % (before[:4], after[:4]),
              len(before) > 0 and len(after) > 0 and all((b + 100) % 256 in {a % 256 for a in after} for b in before))

        # (the wheel: a zoom in about the pointer, and the next zoom's tiles)
        tab.ask('Input.dispatchMouseEvent', {'type': 'mouseWheel', 'x': 500, 'y': 400, 'deltaX': 0, 'deltaY': -120})
        till = time.time() + 10
        while time.time() < till and len({t for t in tab.tiles if t[0] == 3}) < 6:
            tab.wait(0.25)
        tab.wait(1.0)
        wheeled = keep('wheeled', tab.picture())
        check('the wheel zooms in: zoom 3\'s tiles asked for and drawn (%.0f%%)' % (100 * map_share(wheeled, 3)),
              len({t for t in tab.tiles if t[0] == 3}) >= 6 and map_share(wheeled, 3) > 0.55)

        # (the Tokyo button: a flight, and Tokyo's tiles at zoom 9)
        found = buttons(wheeled)
        check('the bar shows its six buttons (%s)' % found[:6], len(found) >= 6)
        if len(found) >= 6:
            left, right = found[2]
            tab.press((left + right) / 2, 28)
            till = time.time() + 15
            near_tokyo = lambda: [t for t in tab.tiles if t[0] == 9 and 452 <= t[1] <= 457 and 199 <= t[2] <= 204]
            while time.time() < till and len(near_tokyo()) < 6:
                tab.wait(0.25)
            tab.wait(2.0)
            tokyo = keep('tokyo', tab.picture())
            check('the Tokyo button flies the map there: its tiles asked for at zoom 9 (%d)' % len(near_tokyo()), len(near_tokyo()) >= 6)
            amber = sum(1 for x in range(0, WIDE, 3) for y in range(BAR, TALL, 3) if near(tokyo.at(x, y), (240, 160, 30), 30))
            blue = sum(1 for x in range(0, WIDE, 3) for y in range(BAR, TALL, 3) if near(tokyo.at(x, y), (51, 136, 255), 30))
            check('its cafés are drawn in clusters (%d amber and %d blue pixels)' % (amber, blue), amber + blue > 40)
            middle = (WIDE / 2, BAR + (TALL - BAR) / 2)
            tab.press(middle[0], middle[1] - 22)
            tab.wait(1.0)
            popped = keep('popup', tab.picture())
            white = sum(1 for x in range(int(middle[0]) - 60, int(middle[0]) + 60, 2) for y in range(int(middle[1]) - 110, int(middle[1]) - 70, 2)
                        if near(popped.at(x, y), (255, 255, 255), 6))
            check('a press on Tokyo\'s marker opens its popup above it (%d white pixels)' % white, white > 300)
        check('nothing was thrown, nothing else asked of the network (%d refused)' % len(tab.refused), not tab.thrown and not tab.refused)
        for t in tab.thrown[:5]:
            print('    thrown: ' + t[:300])
        for u in tab.refused[:5]:
            print('    refused: ' + u)
    finally:
        p.terminate()
        try:
            p.wait(5)
        except subprocess.TimeoutExpired:
            p.kill()
        shutil.rmtree(folder, ignore_errors=True)
        server.shutdown()
    failed = [w for w, h in held if not h]
    print('%d of %d checks held' % (len(held) - len(failed), len(held)))
    return 1 if failed else 0


def main():
    a = argparse.ArgumentParser(description='The map example checked in headless Chrome.')
    a.add_argument('build', nargs='?', default=BUILT, help="the example's web build (examples/map/main_web by default)")
    a.add_argument('--shots', help='a folder to keep a picture of each step in')
    args = a.parse_args()
    try:
        sys.exit(run(os.path.abspath(args.build), args.shots))
    except Failed as e:
        print('failed: %s' % e)
        sys.exit(1)


if __name__ == '__main__':
    main()
