#!/usr/bin/env python3
"""Lory's icons in a real browser: the icons example (examples/icons, built
for the web first: `crow build --target web main.co` there) drawn in headless
Chrome on a page tall enough for its whole sheet, every icon at 24 and 15
pixels on the light look and the dark, and kept as tests/icons/icons.png to
be looked at (an icon that reads wrongly is seen there, not counted).

The page steps the program by hand, so the font atlas is asked for and
answered before the picture is taken. It counts the pixels of ink in each
half (dark on the light half, light on the dark), and says what it found in
its title, which this script reads. The check is that the program ran, and
that both halves drew about as much: the same icons, in each look.

    python3 -I tests/icons/picture.py      (from the repository's root)

Nothing is installed: the browser is this Mac's Chrome (LORY_CHROME names
another), and the rest is Python's own library.
"""
import base64
import functools
import html
import http.server
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import threading

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BUILD = os.path.join(ROOT, 'examples', 'icons', 'main_web')
PICTURE = os.path.join(ROOT, 'tests', 'icons', 'icons.png')
CHROME = os.environ.get('LORY_CHROME') or '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
# (at 1600 wide a half holds four cells across, and the sheet is about 6,250
# pixels tall)
WIDE, TALL = 1600, 6400

DRIVER = """<!DOCTYPE html><html><head><title>waiting</title>
<style>html,body{margin:0;height:100%;background:#000}canvas{display:block;width:100vw;height:100vh}</style>
</head><body><canvas id="c"></canvas><textarea id="png"></textarea><script src="crow.js"></script><script>
const canvas = document.getElementById('c');
Crow.start({ canvas, module: 'main.wasm', manual: true, keep: true }).then((page) => {
  let t = 0;
  for (let i = 0; i < 6; i++) { t += 16; page.step(t); }
  const w = canvas.width, h = canvas.height;
  const copy = document.createElement('canvas'); copy.width = w; copy.height = h;
  const x2 = copy.getContext('2d'); x2.drawImage(canvas, 0, 0);
  const px = x2.getImageData(0, 0, w, h).data;
  const lum = (i) => (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
  // (the halves from below the band to the light half's foot, found down
  // its left edge, where no cell reaches: ink is dark on the light half,
  // light on the dark one)
  let foot = 160;
  while (foot < h && lum((foot * w + 24) * 4) > 0.9) foot++;
  const count = (x0, x1, dark_ink) => { let n = 0;
    for (let y = 160; y < foot; y++) for (let x = x0; x < x1; x++) { const l = lum((y * w + x) * 4);
      if (dark_ink ? l < 0.5 : l > 0.5) n++; }
    return n; };
  const light = count(24, Math.floor(w / 2) - 16, true);
  const dark = count(Math.floor(w / 2) + 16, w - 24, false);
  document.getElementById('png').textContent = canvas.toDataURL('image/png');
  document.title = JSON.stringify({ stopped: page.stopped, size: [w, h], foot, light, dark });
});
</script></body></html>
"""


def free_port():
    while True:
        with socket.socket() as s:
            s.bind(('127.0.0.1', 0))
            port = s.getsockname()[1]
        # (never the ports Lory's and Myna's own servers keep)
        if port not in (3800, 3900):
            return port


def main():
    if not os.path.exists(os.path.join(BUILD, 'main.wasm')):
        print('no build: run `crow build --target web main.co` in examples/icons first')
        return 1
    folder = tempfile.mkdtemp(prefix='lory-icons-picture-')
    try:
        shutil.copy(os.path.join(BUILD, 'crow.js'), folder)
        shutil.copy(os.path.join(BUILD, 'main.wasm'), folder)
        with open(os.path.join(folder, 'drive.html'), 'w') as f:
            f.write(DRIVER)
        port = free_port()
        quiet = type('Quiet', (http.server.SimpleHTTPRequestHandler,), {'log_message': lambda *a: None})
        quiet.extensions_map = dict(quiet.extensions_map, **{'.wasm': 'application/wasm'})
        server = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(quiet, directory=folder))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        dom = subprocess.run([CHROME, '--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
                              f'--window-size={WIDE},{TALL}', f'--user-data-dir={folder}/profile',
                              '--virtual-time-budget=20000', '--dump-dom',
                              f'http://127.0.0.1:{port}/drive.html'],
                             capture_output=True, text=True, timeout=300).stdout
        server.shutdown()
        title = re.search(r'<title>(.*?)</title>', dom, re.S)
        said = html.unescape(title.group(1)) if title else ''
        if not said.startswith('{'):
            print('✗ the page said nothing of what it found:', said[:200] or dom[:200])
            return 1
        got = json.loads(said)
        png = re.search(r'data:image/png;base64,([A-Za-z0-9+/=]+)', dom)
        failures = []
        if got['stopped']:
            failures.append(f"the program stopped: {got['stopped']}")
        if got['size'][0] != WIDE or got['foot'] >= got['size'][1]:
            failures.append(f"the page ({got['size'][0]}x{got['size'][1]}) did not show the sheet's foot")
        if png:
            with open(PICTURE, 'wb') as f:
                f.write(base64.b64decode(png.group(1)))
            print(f"kept {os.path.relpath(PICTURE, ROOT)}: {got['size'][0]}x{got['size'][1]}, "
                  f"the halves' foot at {got['foot']}, {got['light']} pixels of ink on the light half, {got['dark']} on the dark")
        else:
            failures.append('the page gave no picture')
        if got['light'] < 20000 or got['dark'] < 20000:
            failures.append('a half drew next to nothing')
        elif abs(got['light'] - got['dark']) > 0.25 * max(got['light'], got['dark']):
            failures.append('the halves drew unlike amounts: the looks do not show the same icons')
        for f in failures:
            print('✗', f)
        if not failures:
            print('✓ icons in a browser: the whole sheet drawn in both looks (look at the picture)')
        return 1 if failures else 0
    finally:
        shutil.rmtree(folder, ignore_errors=True)


if __name__ == '__main__':
    sys.exit(main())
