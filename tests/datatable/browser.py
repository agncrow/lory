#!/usr/bin/env python3
"""lory.datatable in a real browser: the data table example
(examples/datatable, built for the web first: `crow build --target web
main.co` there), driven in headless Chrome at 1400 by 1400 CSS pixels. The
page steps the program's frames itself, 16 ms apart, and asks it where its
controls are (it tells the program 'boxes'; the program logs them). It then
checks that each of these changes what is drawn:

- a press on Next (the next page of people);
- a press on a column's sort button;
- typing in the search field;
- a press on a person's row (it is selected).

A page of ten fits without scrolling; the table's scroll is held by the
example's own headset test (the thumbstick).

The page says what it found in its title, which this script reads.

    python3 -I tests/datatable/browser.py      (from the repository's root)

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
BUILD = os.path.join(ROOT, 'examples', 'datatable', 'main_web')
CHROME = os.environ.get('LORY_CHROME') or '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

DRIVER = """<!DOCTYPE html><html><head><title>waiting</title>
<style>html,body{margin:0;height:100%;background:#000}canvas{display:block;width:100vw;height:100vh}</style>
</head><body><canvas id="c"></canvas><script src="crow.js"></script><script>
const canvas = document.getElementById('c');
const logs = [];
const troubles = [];
const said = (kind, line) => { if (kind === 'log') logs.push(line); else troubles.push(kind + ': ' + line); };
Crow.start({ canvas, module: 'main.wasm', manual: true, keep: true, said }).then((page) => {
  let t = 0;
  const step = (n) => { for (let i = 0; i < (n || 1); i++) { t += 16; page.step(t); } };
  const give = (type, x, y) => page.give({ type, device: 'mouse', id: 1, x, y, button: 0, shift: false, ctrl: false, alt: false, meta: false });
  const press = (x, y) => { give('down', x, y); give('up', x, y); step(2); };
  const key = (k) => { page.give({ type: 'key', key: k, code: k, shift: false, ctrl: false, alt: false, meta: false }); step(2); };
  const w = () => canvas.width, h = () => canvas.height;
  const drawing = () => { const copy = document.createElement('canvas'); copy.width = w(); copy.height = h();
    const g = copy.getContext('2d'); g.drawImage(canvas, 0, 0); return g.getImageData(0, 0, w(), h()).data; };
  const FOCUS = [96, 165, 250];
  const near = (d, i, rgb) => Math.abs(d[i] - rgb[0]) + Math.abs(d[i + 1] - rgb[1]) + Math.abs(d[i + 2] - rgb[2]) < 30;
  const count = (d, box, rgb) => { let n = 0;
    for (let y = Math.max(0, box[1]); y < Math.min(h(), box[1] + box[3]); y++)
      for (let x = Math.max(0, box[0]); x < Math.min(w(), box[0] + box[2]); x++)
        if (near(d, (y * w() + x) * 4, rgb)) n++;
    return n; };
  const changed = (a, b) => { let n = 0;
    for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 24) n++;
    return n; };
  const state = () => { page.give({ type: 'told', text: 'state' }); step();
    const got = logs.filter((l) => l.startsWith('state '));
    return got.length ? JSON.parse(got[got.length - 1].slice(6)) : null; };
  const finish = (o) => { document.title = JSON.stringify(Object.assign({ stopped: page.stopped || null, troubles, size: [w(), h()] }, o)); };
  try {
    step(5);
    page.give({ type: 'told', text: 'boxes' });
    step();
    const told = logs.filter((l) => l.startsWith('{'));
    if (!told.length) return finish({ boxes: null });
    const boxes = JSON.parse(told[told.length - 1]);
    const middle = (id) => { const b = boxes[id]; return [b[0] + b[2] / 2, b[1] + b[3] / 2]; };
    const moves = {};
    let last = drawing();
    const after = (name, act) => { if (!boxes[name.split(' ')[0]]) { moves[name] = null; return; }
      act(); step(3); const now = drawing(); moves[name] = changed(last, now); last = now; };
    after('next', () => press(...middle('next')));
    after('sort_age', () => press(...middle('sort_age')));
    after('search', () => { press(...middle('search')); page.give({ type: 'text', text: 'ka' }); step(2); });
    const pb = boxes['people'] || [0, 0, 0, 0];
    after('people row', () => press(pb[0] + 100, pb[1] + 30 + 45));
    finish({ boxes: Object.keys(boxes), moves });
  } catch (e) {
    finish({ error: String(e && e.stack || e) });
  }
});
</script></body></html>
"""


def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def checked(got):
    """What the page found, held to what the example should do: the
    failures, each in words."""
    failures = []
    if got.get('stopped'):
        failures.append(f"the program stopped: {got['stopped']}")
    if got.get('troubles'):
        failures.append(f"the page said: {got['troubles'][:3]}")
    if got.get('error'):
        failures.append(f"the driver failed: {got['error'][:300]}")
        return failures
    if not got.get('boxes'):
        failures.append("the program never said where its controls are")
        return failures
    for name, n in got['moves'].items():
        print(name, ':', n, 'pixels changed')
        if n is None:
            failures.append(f'no control {name.split(" ")[0]}')
        elif n < 50:
            failures.append(f'{name} changed nothing drawn')
    return failures


def main():
    if not os.path.exists(os.path.join(BUILD, 'main.wasm')):
        print('no build: run `crow build --target web main.co` in examples/datatable first')
        return 1
    folder = tempfile.mkdtemp(prefix='lory-datatable-browser-')
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
                              '--window-size=1400,1400', '--force-device-scale-factor=1',
                              f'--user-data-dir={folder}/profile', '--virtual-time-budget=60000', '--dump-dom',
                              f'http://127.0.0.1:{port}/drive.html'],
                             capture_output=True, text=True, timeout=600).stdout
        server.shutdown()
        title = re.search(r'<title>(.*?)</title>', dom, re.S)
        said = html.unescape(title.group(1)) if title else ''
        if not said.startswith('{'):
            print('✗ the page said nothing of what it found:', said[:200] or dom[:200])
            return 1
        failures = checked(json.loads(said))
        for f in failures:
            print('✗', f)
        if not failures:
            print('✓ the data table in a browser: paged, sorted, searched and a row chosen')
        return 1 if failures else 0
    finally:
        shutil.rmtree(folder, ignore_errors=True)


if __name__ == '__main__':
    sys.exit(main())
