#!/usr/bin/env python3
"""Kite's charts example (examples/charts) in a browser: every card's chart
drawn, its legend toggling a dataset, its tooltip under the pointer, and the
select switching the data.

    python3 -I tests/charts/browser.py [--built] [--shot FILE]

Run it from Lory's root. It builds the example for the web (`crow build
--target web main.co` in examples/charts; `--built` takes the build already
there), serves the build on a free port of 127.0.0.1, and opens it in this
Mac's Chrome, headless (LORY_CHROME names another), in a page 1600 by 1100.
When the charts have settled it checks that:

- the page started, and neither threw nor said an error;
- each of the gallery's sixteen cards has its chart's marks drawn: pixels of
  Kite's palette (its colours, and their fills at half strength over the
  card) below the legend's band, where only marks are drawn;
- the sparkline beside the select is drawn in gui's accent;
- a click on the bar chart's first legend item hides its dataset (its bars'
  colour leaves the plot) and a second click shows it again;
- the pointer over a bar shows a tooltip (its dark box, which was not there
  before);
- a click on the select, then the down arrow, picks the next data: the bar
  chart's bars change.

`--shot FILE` keeps the first picture as a PNG. Nothing is installed or
downloaded: the browser is this machine's Chrome, and the rest is Python's
own library. CROW names the crow to build with (else the one on PATH). The
socket and PNG reading are tests/colors/browser.py's.
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
EXAMPLE = os.path.join(ROOT, 'examples', 'charts')
BUILD = os.path.join(EXAMPLE, 'main_web')
CHROME = os.environ.get('LORY_CHROME') or '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
WIDE, TALL = 1600, 1100
TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm',
         '.json': 'application/json', '.png': 'image/png', '.css': 'text/css; charset=utf-8'}

# How main.co lays the cards out, in CSS pixels: the room round the page and
# between cards, the header's height, a card's least height, its caption's
# height and the room inside it. Keep these as main.co's `_margin` …
# `_inset` are.
MARGIN, GAP, HEAD, LEAST, CAPTION, INSET = 24.0, 16.0, 56.0, 230.0, 30.0, 10.0
CARDS = ['Bars', 'Bars across', 'Stacked bars', 'Floating bars', 'Lines', 'Gaps', 'Scatter', 'Bubbles', 'Pie',
         'Doughnut', 'Polar area', 'Radar', 'Bars and a line', 'Logarithmic', 'Time', 'Two axes']
# Kite's palette (charts_model.palette) and gui's light look's accent
PALETTE = ['#3b7dd8', '#e0525e', '#ef9a2d', '#2fae9e', '#8a63d2', '#6aa84f', '#8d96a7']
ACCENT = (37, 99, 235)
# a legend's band: its boxes, its words and the room round them (Chart.js's
# legend at the top: 10 above, a 12-pixel box, 10 below), and more
BAND = 36.0


class Refused(Exception):
    """Something that could not be done, said in a line."""


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

    def key(self, name, code):
        for kind in ('rawKeyDown', 'keyUp'):
            self.ask('Input.dispatchKeyEvent', {'type': kind, 'key': name, 'code': name, 'windowsVirtualKeyCode': code,
                                                'nativeVirtualKeyCode': code})

    def picture(self):
        r = self.ask('Page.captureScreenshot', {'format': 'png'}, timeout=60)
        return base64.b64decode(r['data'])


class Chrome:
    def __init__(self):
        if not os.path.exists(CHROME):
            raise Refused('no Chrome at %s (LORY_CHROME names another)' % CHROME)
        self.dir = tempfile.mkdtemp(prefix='lory-charts-')
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

def hex_rgb(code):
    return tuple(int(code[i:i + 2], 16) for i in (1, 3, 5))


def columns_of(wide):
    return 4 if wide >= 1180 else 3 if wide >= 880 else 2 if wide >= 580 else 1


def card_box(wide, tall, n, i):
    columns = columns_of(wide)
    rows = -(-n // columns)
    top = MARGIN + HEAD + GAP
    w = (wide - 2 * MARGIN - GAP * (columns - 1)) / columns
    h = max(LEAST, (tall - top - MARGIN - GAP * (rows - 1)) / rows)
    return (MARGIN + (i % columns) * (w + GAP), top + (i // columns) * (h + GAP), w, h)


def chart_box(wide, tall, i):
    x, y, w, h = card_box(wide, tall, len(CARDS), i)
    return (x + INSET, y + CAPTION, w - 2 * INSET, h - CAPTION - INSET)


def half_over(color, under):
    return tuple(round(color[k] * 0.5 + under[k] * 0.5) for k in range(3))


def marks_part(box, i):
    """Where only a chart's marks (and its axes) are drawn: below the
    legend's band, and left of it where the legend stands on the right."""
    x, y, w, h = box
    if CARDS[i] == 'Bars across':
        return (x, y, x + w - 110, y + h)
    return (x, y + BAND, x + w, y + h)


def palette_pixels(pic, part, ground):
    colors = [hex_rgb(c) for c in PALETTE]
    wanted = colors + [half_over(c, ground) for c in colors]
    n = 0
    x0, y0, x1, y1 = [int(v) for v in part]
    for y in range(max(y0, 0), min(y1, pic.h)):
        row = pic.rows[y]
        for x in range(max(x0, 0), min(x1, pic.w)):
            i = x * pic.bpp
            r, g, b = row[i], row[i + 1], row[i + 2]
            for c in wanted:
                if abs(r - c[0]) <= 3 and abs(g - c[1]) <= 3 and abs(b - c[2]) <= 3:
                    n += 1
                    break
    return n


def found(pic, color, part, near=3):
    """The places of a colour's pixels in a part of the picture."""
    out = []
    x0, y0, x1, y1 = [int(v) for v in part]
    for y in range(max(y0, 0), min(y1, pic.h)):
        row = pic.rows[y]
        for x in range(max(x0, 0), min(x1, pic.w)):
            i = x * pic.bpp
            if abs(row[i] - color[0]) <= near and abs(row[i + 1] - color[1]) <= near and abs(row[i + 2] - color[2]) <= near:
                out.append((x, y))
    return out


def build():
    found_crow = os.environ.get('CROW') or shutil.which('crow')
    if not found_crow:
        raise Refused('no crow on PATH (CROW names one)')
    r = subprocess.run([found_crow, 'build', '--target', 'web', 'main.co'], cwd=EXAMPLE, capture_output=True, text=True)
    if r.returncode != 0:
        raise Refused('the web build failed:\n' + (r.stderr or r.stdout)[-2000:])


def click(tab, x, y):
    tab.mouse('mouseMoved', x, y)
    tab.mouse('mousePressed', x, y)
    tab.mouse('mouseReleased', x, y)


def check(args):
    if not args.built:
        print('building examples/charts for the web')
        build()
    if not os.path.exists(os.path.join(BUILD, 'index.html')):
        raise Refused('no web build at %s' % BUILD)
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
        time.sleep(3.0)
        size = tab.evaluate('[innerWidth, innerHeight, devicePixelRatio]')
        wide, tall, ratio = size
        if ratio != 1:
            raise Refused('the page is at %g pixels to a CSS pixel, not 1' % ratio)
        first = tab.picture()
        if args.shot:
            with open(args.shot, 'wb') as f:
                f.write(first)
        shown = Picture(first)
        print('the page started: %d by %d CSS pixels at %g' % tuple(size))

        # every card's marks
        bare = []
        for i, name in enumerate(CARDS):
            box = chart_box(wide, tall, i)
            ground = shown.at(box[0] - INSET + 3, box[1] + box[3] / 2)
            n = palette_pixels(shown, marks_part(box, i), ground)
            if n < 300:
                bare.append('%s: %d pixels of its marks' % (name, n))
        print('cards with their marks drawn: %d of %d' % (len(CARDS) - len(bare), len(CARDS)))
        failed += bare

        # the sparkline in the header
        spark = len(found(shown, ACCENT, (MARGIN, MARGIN, min(wide, 900), MARGIN + HEAD), near=12))
        print('the sparkline is drawn in the accent: %s (%d pixels)' % ('yes' if spark > 40 else 'NO', spark))
        if spark <= 40:
            failed.append('the sparkline was not drawn')

        # the bar chart's legend hides its first dataset and shows it again
        box = chart_box(wide, tall, 0)
        ground = shown.at(box[0] - INSET + 3, box[1] + box[3] / 2)
        blue = half_over(hex_rgb(PALETTE[0]), ground)
        red = half_over(hex_rgb(PALETTE[1]), ground)
        part = marks_part(box, 0)
        had = len(found(shown, blue, part))
        legend = found(shown, blue, (box[0], box[1], box[0] + box[2], box[1] + BAND))
        if not legend:
            raise Refused('no legend item of the bar chart\'s first dataset was found')
        lx = (min(p[0] for p in legend) + max(p[0] for p in legend)) / 2.0
        ly = (min(p[1] for p in legend) + max(p[1] for p in legend)) / 2.0
        click(tab, lx, ly)
        time.sleep(1.6)
        hidden = Picture(tab.picture())
        gone = len(found(hidden, blue, part))
        click(tab, lx, ly)
        time.sleep(1.6)
        again = Picture(tab.picture())
        back = len(found(again, blue, part))
        toggled = had > 1000 and gone < had * 0.05 and back > had * 0.8
        print('the legend hides the first dataset and shows it again: %s (its bars\' pixels %d, hidden %d, shown again %d)' % ('yes' if toggled else 'NO', had, gone, back))
        if not toggled:
            failed.append('the legend did not hide and show the first dataset')

        # the pointer over a bar shows its tooltip
        dark = (51, 51, 51)
        before = len(found(again, dark, box, near=8))
        reds = found(again, red, part)
        if not reds:
            raise Refused('no bar of the second dataset was found')
        columns = {}
        for p in reds:
            columns.setdefault(p[0], []).append(p[1])
        x = max(columns, key=lambda k: len(columns[k]))
        ys = sorted(columns[x])
        y = ys[len(ys) // 2]
        tab.mouse('mouseMoved', x, y)
        time.sleep(0.8)
        over = Picture(tab.picture())
        after = len(found(over, dark, box, near=8))
        tipped = before < 50 and after > 400
        print('the pointer over a bar shows its tooltip: %s (dark pixels %d before, %d after)' % ('yes' if tipped else 'NO', before, after))
        if not tipped:
            failed.append('no tooltip showed over a bar')
        tab.mouse('mouseMoved', 5, 5)
        time.sleep(0.5)

        # the select picks the next data
        before_bars = found(again, blue, part)
        click(tab, MARGIN + 30, MARGIN + 14)
        time.sleep(0.4)
        tab.key('ArrowDown', 40)
        time.sleep(0.3)
        tab.key('Escape', 27)
        time.sleep(0.3)
        click(tab, wide - 5, tall - 5)
        time.sleep(2.5)
        picked = Picture(tab.picture())
        after_bars = found(picked, blue, part)
        moved = len(set(before_bars) ^ set(after_bars)) > max(500, len(before_bars) * 0.2)
        print('the select picks the next data: %s (the first dataset\'s bars: %d pixels before, %d after, %d not in both)' % ('yes' if moved else 'NO', len(before_bars), len(after_bars), len(set(before_bars) ^ set(after_bars))))
        if not moved:
            failed.append('the select did not change the data')

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
    p.add_argument('--built', action='store_true', help='take the web build already in examples/charts/main_web')
    p.add_argument('--shot', default='', help='a file to keep the first picture in (PNG)')
    args = p.parse_args()
    try:
        return check(args)
    except Refused as e:
        print('browser check: %s' % e, file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
