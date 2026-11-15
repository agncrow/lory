#!/usr/bin/env python3
"""gui's layers in a real browser: the controls example (examples/controls,
built for the web first: `crow build --target web main.co` there) driven in
headless Chrome. Its select is pressed and its choices open as a layer over
the controls under it; ArrowDown and Enter choose the next and close it; the
select opened again is closed by a press outside it. The page keeps the
drawing at each stage and finds the layer where the opened drawing differs
from the first; the check is that it is there when opened and gone when
closed. The page says what it found in its title, which this script reads.

    python3 -I tests/gui/browser.py      (from the repository's root)

Nothing is installed: the browser is this Mac's Chrome (LORY_CHROME names
another), and the rest is Python's own library.
"""
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
BUILD = os.path.join(ROOT, 'examples', 'controls', 'main_web')
CHROME = os.environ.get('LORY_CHROME') or '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

# The page drives the program by hand (`manual`): frames stepped, input given
# between them, the drawing kept after each stage (read in the same task as
# the frame that drew it, before the page shows it and lets it go).
DRIVER = """<!DOCTYPE html><html><head><title>waiting</title>
<style>html,body{margin:0;height:100%;background:#000}canvas{display:block;width:100vw;height:100vh}</style>
</head><body><canvas id="c"></canvas><script src="crow.js"></script><script>
const canvas = document.getElementById('c');
Crow.start({ canvas, module: 'main.wasm', manual: true, keep: true }).then((page) => {
  let t = 0;
  const step = (n) => { for (let i = 0; i < (n || 1); i++) { t += 16; page.step(t); } };
  const at = (type, x, y) => page.give({ type, device: 'mouse', id: 1, x, y, button: 0, shift: false, ctrl: false, alt: false, meta: false });
  const key = (k) => page.give({ type: 'key', key: k, code: k, shift: false, ctrl: false, alt: false, meta: false });
  const kept = () => { const c2 = document.createElement('canvas'); c2.width = canvas.width; c2.height = canvas.height;
    const x = c2.getContext('2d'); x.drawImage(canvas, 0, 0); return x.getImageData(0, 0, c2.width, c2.height).data; };
  const w = () => canvas.width, h = () => canvas.height;
  const differs = (a, b, i) => Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 72;
  const mean = (a, b, box) => { let s = 0, n = 0;
    for (let y = box[1]; y < box[3]; y++) for (let x = box[0]; x < box[2]; x++) { const i = (y * w() + x) * 4;
      s += (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2])) / 3; n++; }
    return n ? s / n : 0; };
  step(3);
  const first = kept();
  at('down', 80, 335); at('up', 80, 335); step(2);
  const opened = kept();
  key('ArrowDown'); step(); key('Enter'); step(2);
  const chosen = kept();
  at('down', 80, 335); at('up', 80, 335); step(2);
  const again = kept();
  at('down', 700, 600); at('up', 700, 600); step(2);
  const outside = kept();
  let box = [w(), h(), 0, 0];
  for (let y = 0; y < h(); y++) for (let x = 0; x < w(); x++) if (differs(first, opened, (y * w() + x) * 4)) {
    box = [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x + 1), Math.max(box[3], y + 1)]; }
  const found = box[2] > box[0];
  const height = box[3] - box[1];
  const low = [box[0] + 4, box[3] - Math.floor(height / 4), box[2] - 4, box[3] - 4];
  document.title = JSON.stringify({ stopped: page.stopped, size: [w(), h()], box: found ? box : null,
    opened: found ? mean(first, opened, low) : 0, again: found ? mean(first, again, low) : 0,
    chosen: found ? mean(first, chosen, low) : 0, outside: found ? mean(first, outside, low) : 0 });
});
</script></body></html>
"""


def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def main():
    if not os.path.exists(os.path.join(BUILD, 'main.wasm')):
        print('no build: run `crow build --target web main.co` in examples/controls first')
        return 1
    folder = tempfile.mkdtemp(prefix='lory-gui-browser-')
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
                              '--window-size=900,700', f'--user-data-dir={folder}/profile',
                              '--virtual-time-budget=8000', '--dump-dom',
                              f'http://127.0.0.1:{port}/drive.html'],
                             capture_output=True, text=True, timeout=180).stdout
        server.shutdown()
        title = re.search(r'<title>(.*?)</title>', dom, re.S)
        said = html.unescape(title.group(1)) if title else ''
        if not said.startswith('{'):
            print('✗ the page said nothing of what it found:', said[:200] or dom[:200])
            return 1
        got = json.loads(said)
        failures = []
        if got['stopped']:
            failures.append(f"the program stopped: {got['stopped']}")
        if not got['box']:
            failures.append('pressing the select changed nothing: no layer opened')
        else:
            left, top, right, bottom = got['box']
            print(f"the layer opened over {right - left}x{bottom - top} px of {got['size'][0]}x{got['size'][1]}; its lower "
                  f"quarter differs from the page by {got['opened']:.1f} opened, {got['chosen']:.1f} once chosen, "
                  f"{got['again']:.1f} opened again, {got['outside']:.1f} once pressed outside")
            if right - left < 60 or bottom - top < 100:
                failures.append(f'the opened layer is only {right - left}x{bottom - top} px')
            if got['opened'] < 8.0 or got['again'] < 8.0:
                failures.append('the layer drew nothing over the page under it')
            if got['chosen'] > 2.0:
                failures.append('Enter chose and the layer stayed')
            if got['outside'] > 2.0:
                failures.append('a press outside left the layer open')
        for f in failures:
            print('✗', f)
        if not failures:
            print("✓ gui in a browser: the select's layer opens over the page; Enter, and a press outside, close it")
        return 1 if failures else 0
    finally:
        shutil.rmtree(folder, ignore_errors=True)


if __name__ == '__main__':
    sys.exit(main())
