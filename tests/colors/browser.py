#!/usr/bin/env python3
"""The colours example (examples/colors) in a browser, its picture held to
lory.colors' own colours.

    python3 -I tests/colors/browser.py [--built] [--shot FILE]

Run it from Lory's root. It builds the example for the web (`crow build
--target web main.co` in examples/colors; `--built` takes the build already
there), asks lory.colors for every swatch's colour (`crow run -i
tests/colors/swatches.co`), serves the build on a free port of 127.0.0.1,
and opens it in this Mac's Chrome, headless (LORY_CHROME names another), in
a page 1400 by 900. Then it checks that:

- the page started, and neither threw nor said an error;
- every swatch is drawn in its colour where main.co lays it out: the 31
  scales' 12 steps in light and in dark, and the overlays' row (black over
  the light card's checkers, white over the dark card's), each read inside
  its swatch;
- the pointer over a swatch outlines it in its card's text colour;
- a click on a scale's name makes it the theme's accent: the theme's
  controls are filled with its step 9 after it, and not with the old one's.

`--shot FILE` keeps the first picture as a PNG. Nothing is installed or
downloaded: the browser is this machine's Chrome, and the rest is Python's
own library. CROW names the crow to build with (else the one on PATH).
"""
import argparse
import base64
import http.server
import json
import os
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
ROOT = os.path.dirname(os.path.dirname(HERE))
EXAMPLE = os.path.join(ROOT, 'examples', 'colors')
BUILD = os.path.join(EXAMPLE, 'main_web')
CHROME = os.environ.get('LORY_CHROME') or '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
WIDE, TALL = 1400, 900
TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm',
         '.json': 'application/json', '.png': 'image/png', '.css': 'text/css; charset=utf-8'}

# How main.co lays the cards out, in its units (a CSS pixel, fewer where the
# page is too small): where they start, a card's width and height and the gap
# between them, the room inside a card, a title's and the header's height, a
# row's height, the names' column and a swatch's stride. Keep these as
# main.co's `_left` … `_cell` are.
LEFT, TOP, CARD_W, CARD_H, CARD_GAP = 348.0, 24.0, 414.0, 680.0, 16.0
INSET, TITLE_H, HEAD_H, ROW_H, NAME_W, CELL = 12.0, 26.0, 16.0, 19.0, 58.0, 22.0
# the checkers' first square under the overlays: white in light, 0.06 in dark
CHECKER = {'light': (1.0, 1.0, 1.0), 'dark': (0.06, 0.06, 0.06)}


class Refused(Exception):
    """Something that could not be done, said in a line."""


# ---- the build and the colours it should show ----

def crow():
    found = os.environ.get('CROW') or shutil.which('crow')
    if not found:
        raise Refused('no crow on PATH (CROW names one)')
    return found


def build():
    r = subprocess.run([crow(), 'build', '--target', 'web', 'main.co'], cwd=EXAMPLE, capture_output=True, text=True)
    if r.returncode != 0:
        raise Refused('the web build failed:\n' + (r.stderr or r.stdout)[-2000:])


def expected():
    r = subprocess.run([crow(), 'run', '-i', os.path.join('tests', 'colors', 'swatches.co')], cwd=ROOT,
                       capture_output=True, text=True)
    lines = [line for line in r.stdout.splitlines() if line.startswith('{')]
    if r.returncode != 0 or not lines:
        raise Refused('tests/colors/swatches.co did not run:\n' + (r.stderr or r.stdout)[-2000:])
    return json.loads(lines[-1])


def hex_rgb(code):
    return tuple(int(code[i:i + 2], 16) for i in (1, 3, 5))


# ---- the build, served ----

def serve():
    class Handler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            name = urllib.parse.urlparse(self.path).path.lstrip('/') or 'index.html'
            path = os.path.realpath(os.path.join(BUILD, name))
            if not path.startswith(os.path.realpath(BUILD) + os.sep) or not os.path.isfile(path):
                self.send_error(404)
                return
            with open(path, 'rb') as f:
                body = f.read()
            self.send_response(200)
            self.send_header('Content-Type', TYPES.get(os.path.splitext(path)[1], 'application/octet-stream'))
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, *args):
            pass

    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


# ---- Chrome, headless, spoken to over its debugging socket ----

class Tab:
    def __init__(self, ws_url):
        u = urllib.parse.urlparse(ws_url)
        self.s = socket.create_connection((u.hostname, u.port), timeout=30)
        key = base64.b64encode(os.urandom(16)).decode()
        self.s.sendall(('GET %s HTTP/1.1\r\nHost: %s:%d\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
                        'Sec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n' % (u.path, u.hostname, u.port, key)).encode())
        head = b''
        while b'\r\n\r\n' not in head:
            got = self.s.recv(4096)
            if not got:
                raise Refused('the browser closed its debugging socket')
            head += got
        if b' 101 ' not in head.split(b'\r\n', 1)[0]:
            raise Refused('the browser refused its debugging socket')
        self.rest = head.split(b'\r\n\r\n', 1)[1]
        self.n = 0
        self.events = []

    def _send(self, op, data):
        n = len(data)
        if n < 126:
            h = struct.pack('!BB', 0x80 | op, 0x80 | n)
        elif n < 65536:
            h = struct.pack('!BBH', 0x80 | op, 0x80 | 126, n)
        else:
            h = struct.pack('!BBQ', 0x80 | op, 0x80 | 127, n)
        # (a client's frame is masked; a mask of zeros leaves its bytes as they are)
        self.s.sendall(h + b'\x00\x00\x00\x00' + data)

    def _take(self, n):
        while len(self.rest) < n:
            got = self.s.recv(1 << 16)
            if not got:
                raise Refused('the browser closed its debugging socket')
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
            op = b0 & 0x0f
            if op == 9:
                self._send(10, body)
            elif op == 8:
                raise Refused('the browser closed its debugging socket')
            elif op in (0, 1, 2):
                whole += body
                if b0 & 0x80:
                    return json.loads(whole.decode('utf-8'))

    def ask(self, method, params=None, timeout=30):
        self.n += 1
        mine = self.n
        self.s.settimeout(timeout)
        self._send(1, json.dumps({'id': mine, 'method': method, 'params': params or {}}).encode('utf-8'))
        while True:
            m = self._message()
            if m.get('id') == mine:
                if 'error' in m:
                    raise Refused('%s: %s' % (method, m['error'].get('message', m['error'])))
                return m.get('result', {})
            if 'method' in m:
                self.events.append(m)

    def evaluate(self, js):
        r = self.ask('Runtime.evaluate', {'expression': js, 'awaitPromise': True, 'returnByValue': True})
        if 'exceptionDetails' in r:
            raise Refused('the page threw: %s' % json.dumps(r['exceptionDetails'])[:400])
        return r.get('result', {}).get('value')

    def faults(self):
        """What the page threw or logged as an error so far."""
        out = []
        for m in self.events:
            if m['method'] == 'Runtime.exceptionThrown':
                d = m['params']['exceptionDetails']
                out.append('threw: ' + (d.get('exception', {}).get('description') or d.get('text', '')))
            elif m['method'] == 'Runtime.consoleAPICalled' and m['params'].get('type') == 'error':
                out.append('error: ' + ' '.join(str(a.get('value', a.get('description', ''))) for a in m['params'].get('args', [])))
        return out

    def mouse(self, kind, x, y):
        params = {'type': kind, 'x': x, 'y': y, 'button': 'none' if kind == 'mouseMoved' else 'left', 'clickCount': 0 if kind == 'mouseMoved' else 1}
        self.ask('Input.dispatchMouseEvent', params)

    def picture(self):
        r = self.ask('Page.captureScreenshot', {'format': 'png'}, timeout=60)
        return base64.b64decode(r['data'])


class Chrome:
    def __init__(self):
        if not os.path.exists(CHROME):
            raise Refused('no Chrome at %s (LORY_CHROME names another)' % CHROME)
        self.dir = tempfile.mkdtemp(prefix='lory-colors-')
        args = [CHROME, '--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + self.dir, '--no-first-run',
                '--no-default-browser-check', '--disable-extensions', '--mute-audio', '--hide-scrollbars',
                '--window-size=%d,%d' % (WIDE, TALL), '--force-device-scale-factor=1', '--force-color-profile=srgb',
                '--ignore-gpu-blocklist', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
                '--disable-backgrounding-occluded-windows', 'about:blank']
        self.p = subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        told = os.path.join(self.dir, 'DevToolsActivePort')
        till = time.time() + 20
        while not os.path.exists(told) or not open(told).read().strip():
            if time.time() > till or self.p.poll() is not None:
                raise Refused('Chrome did not start')
            time.sleep(0.05)
        self.port = int(open(told).read().split('\n')[0])

    def tab(self):
        till = time.time() + 10
        while True:
            with urllib.request.urlopen('http://127.0.0.1:%d/json/list' % self.port, timeout=6) as r:
                found = [t for t in json.load(r) if t.get('type') == 'page']
            if found:
                return Tab(found[0]['webSocketDebuggerUrl'])
            if time.time() > till:
                raise Refused('Chrome opened no page')
            time.sleep(0.1)

    def close(self):
        if self.p.poll() is None:
            self.p.terminate()
            try:
                self.p.wait(5)
            except subprocess.TimeoutExpired:
                self.p.kill()
        shutil.rmtree(self.dir, ignore_errors=True)


# ---- a picture's pixels ----

class Picture:
    """A PNG as Chrome writes it (8-bit RGB or RGBA, not interlaced), read
    into rows of bytes."""

    def __init__(self, png):
        if png[:8] != b'\x89PNG\r\n\x1a\n':
            raise Refused('the picture is not a PNG')
        i, data = 8, b''
        while i < len(png):
            n = struct.unpack('!I', png[i:i + 4])[0]
            kind, body = png[i + 4:i + 8], png[i + 8:i + 8 + n]
            i += 12 + n
            if kind == b'IHDR':
                self.w, self.h, depth, color, _, _, interlaced = struct.unpack('!IIBBBBB', body)
                if depth != 8 or color not in (2, 6) or interlaced:
                    raise Refused('a PNG this script does not read (depth %d, colour type %d)' % (depth, color))
                self.bpp = 3 if color == 2 else 4
            elif kind == b'IDAT':
                data += body
            elif kind == b'IEND':
                break
        raw = zlib.decompress(data)
        stride, bpp = self.w * self.bpp, self.bpp
        self.rows, prev, at = [], bytearray(stride), 0
        for _ in range(self.h):
            f, line = raw[at], bytearray(raw[at + 1:at + 1 + stride])
            at += 1 + stride
            if f == 1:
                for x in range(bpp, stride):
                    line[x] = (line[x] + line[x - bpp]) & 255
            elif f == 2:
                for x in range(stride):
                    line[x] = (line[x] + prev[x]) & 255
            elif f == 3:
                for x in range(stride):
                    line[x] = (line[x] + ((line[x - bpp] if x >= bpp else 0) + prev[x]) // 2) & 255
            elif f == 4:
                for x in range(stride):
                    a = line[x - bpp] if x >= bpp else 0
                    b = prev[x]
                    c = prev[x - bpp] if x >= bpp else 0
                    pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                    line[x] = (line[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
            self.rows.append(bytes(line))
            prev = line

    def at(self, x, y):
        x, y = int(x), int(y)
        row = self.rows[y]
        return tuple(row[x * self.bpp:x * self.bpp + 3])

    def count(self, color, x0, y0, x1, y1, near=1):
        n = 0
        for y in range(int(y0), int(y1)):
            row = self.rows[y]
            for x in range(int(x0), int(x1)):
                i = x * self.bpp
                if abs(row[i] - color[0]) <= near and abs(row[i + 1] - color[1]) <= near and abs(row[i + 2] - color[2]) <= near:
                    n += 1
        return n


# ---- where main.co draws ----

class Layout:
    def __init__(self, wide, tall, ratio):
        k = min(1.0, (wide - LEFT - 24.0) / (2 * CARD_W + CARD_GAP), (tall - TOP - 24.0) / CARD_H)
        self.s, self.u = ratio, max(k, 0.3) * ratio

    def card_x(self, which):
        return LEFT * self.s + which * (CARD_W + CARD_GAP) * self.u

    def row_y(self, row):
        y = TOP * self.s + (INSET + TITLE_H + HEAD_H + row * ROW_H) * self.u
        return y + (6.0 * self.u if row >= 31 else 0.0)

    def swatch_x(self, which, place):
        return self.card_x(which) + (INSET + NAME_W + place * CELL) * self.u


def off(got, want):
    return max(abs(a - b) for a, b in zip(got, want))


def laid_over(top, under):
    """A translucent colour laid over an opaque one, as the page blends it
    (SRC_ALPHA, ONE_MINUS_SRC_ALPHA), in 8-bit."""
    under8 = [round(x * 255) / 255 for x in under]
    return tuple(round((top[i] * top[3] + under8[i] * (1 - top[3])) * 255) for i in range(3))


def check(args):
    if not args.built:
        print('building examples/colors for the web')
        build()
    if not os.path.exists(os.path.join(BUILD, 'index.html')):
        raise Refused('no web build at %s' % BUILD)
    want = expected()
    server = serve()
    chrome = Chrome()
    failed = []
    try:
        tab = chrome.tab()
        tab.ask('Runtime.enable')
        tab.ask('Page.enable')
        tab.ask('Emulation.setDeviceMetricsOverride', {'width': WIDE, 'height': TALL, 'deviceScaleFactor': 1, 'mobile': False})
        tab.ask('Page.navigate', {'url': 'http://127.0.0.1:%d/index.html' % server.server_address[1]})
        till = time.time() + 60
        while not tab.evaluate('typeof window.crow === "object"'):
            said = tab.evaluate('(document.getElementById("said") || {}).textContent || ""')
            if said or time.time() > till:
                raise Refused('the page did not start: %s' % (said or 'no answer in 60 s'))
            time.sleep(0.2)
        time.sleep(2.0)
        size = tab.evaluate('[innerWidth, innerHeight, devicePixelRatio]')
        at = Layout(size[0], size[1], size[2])
        first = tab.picture()
        if args.shot:
            with open(args.shot, 'wb') as f:
                f.write(first)
        shown = Picture(first)
        print('the page started: %d by %d CSS pixels at %g' % tuple(size))

        # every swatch in its colour
        misses, worst, read = [], 0, 0
        for which, look in enumerate(['light', 'dark']):
            for row, name in enumerate(want['names']):
                for place, code in enumerate(want['scales'][name][look]):
                    x = at.swatch_x(which, place) + 10.5 * at.u
                    y = at.row_y(row) + 9.0 * at.u
                    d = off(shown.at(x, y), hex_rgb(code))
                    worst, read = max(worst, d), read + 1
                    if d > 2:
                        misses.append('%s %d %s: %s, not %s' % (name, place + 1, look, shown.at(x, y), code))
            overlay = want['blacks'] if look == 'light' else want['whites']
            for place, color in enumerate(overlay):
                x = at.swatch_x(which, place) + 5.0 * at.u
                y = at.row_y(31) + 4.5 * at.u
                d = off(shown.at(x, y), laid_over(color, CHECKER[look]))
                worst, read = max(worst, d), read + 1
                if d > 2:
                    misses.append('%s overlay %d: %s, not %s' % ('black' if look == 'light' else 'white', place + 1, shown.at(x, y), laid_over(color, CHECKER[look])))
        print('swatches read in their colours: %d of %d (the most a channel was off: %d)' % (read - len(misses), read, worst))
        failed += misses[:12]

        # the pointer over a swatch outlines it (2 units outside it, over
        # the edge of the swatch before it)
        blue = want['names'].index('blue')
        x, y = at.swatch_x(0, 8), at.row_y(blue)
        edge = (x - 1.25 * at.u, y + 9.0 * at.u)
        before = shown.at(*edge)
        tab.mouse('mouseMoved', x + 10.0 * at.u, y + 9.0 * at.u)
        time.sleep(0.8)
        hovered = Picture(tab.picture())
        ink = hex_rgb(want['ink']['light'])
        outlined = off(hovered.at(*edge), ink) <= 2 and off(before, ink) > 10
        print('the pointer over blue 9 outlines it: %s (beside it %s before, %s after)' % ('yes' if outlined else 'NO', before, hovered.at(*edge)))
        if not outlined:
            failed.append('blue 9 was not outlined under the pointer')

        # a click on a scale's name makes it the accent
        old = hex_rgb(want['scales']['indigo']['light'][8])
        new = hex_rgb(want['scales']['grass']['light'][8])
        column = (0, 0, LEFT * at.s - 8, hovered.h)
        had = hovered.count(old, *column)
        grass = want['names'].index('grass')
        x, y = at.card_x(0) + (INSET + 10.0) * at.u, at.row_y(grass) + 6.0 * at.u
        tab.mouse('mouseMoved', x, y)
        tab.mouse('mousePressed', x, y)
        tab.mouse('mouseReleased', x, y)
        time.sleep(0.8)
        after = Picture(tab.picture())
        took, kept = after.count(new, *column), after.count(old, *column)
        themed = had > 200 and took > 200 and kept < 20
        print('a click on grass makes it the accent: %s (pixels of indigo 9 in the theme: %d before, %d after; of grass 9: %d after)' % ('yes' if themed else 'NO', had, kept, took))
        if not themed:
            failed.append('the click on grass did not make it the theme\'s accent')

        said = tab.evaluate('(document.getElementById("said") || {}).textContent || ""')
        faults = tab.faults() + (['the page said: ' + said] if said else [])
        print('the page threw nothing and said no error: %s' % ('yes' if not faults else 'NO'))
        failed += faults[:6]
    finally:
        chrome.close()
        server.shutdown()
    for line in failed:
        print('  ' + line)
    print('browser check: ' + ('every check held' if not failed else 'a check did not hold'))
    return 0 if not failed else 1


def main():
    p = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    p.add_argument('--built', action='store_true', help='take the web build already in examples/colors/main_web')
    p.add_argument('--shot', default='', help='a file to keep the first picture in (PNG)')
    args = p.parse_args()
    try:
        return check(args)
    except Refused as e:
        print('browser check: %s' % e, file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
