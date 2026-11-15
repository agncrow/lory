#!/usr/bin/env python3
"""lory.models in a real browser: the models example (examples/models,
built for the web first: `crow build --target web main.co` there) driven in
headless Chrome. Its first picture is the cottage, read from its OBJ and MTL
when the page starts; a drag across the scene turns it; Tab and ArrowDown
choose the next model in the list (the painted cube, read from its PLY);
Tab to the OBJ button and Space show the file the OBJ writer writes of it
in the panel. The page keeps the drawing at each stage and measures it: how
much of the scene's box the model covers, how far each stage's picture is
from the last in the scene, and how far the panel moved when the file was
shown. It says what it found in its title, which this script reads.

    python3 -I tests/models/browser.py      (from the repository's root)

Nothing is installed: the browser is this Mac's Chrome (LORY_CHROME names
another), served on a free port of 127.0.0.1, and the rest is Python's own
library.
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
BUILD = os.path.join(ROOT, 'examples', 'models', 'main_web')
CHROME = os.environ.get('LORY_CHROME') or '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

# The page drives the program by hand (`manual`): frames stepped, input given
# between them, the drawing kept after each stage. The scene's box is the
# example's: right of its 320-pixel panel (and 48 more), 24 pixels in from
# the page's edges; the panel is the 320 pixels from 24 in (at one drawing
# pixel a CSS pixel, as headless Chrome draws).
DRIVER = """<!DOCTYPE html><html><head><title>waiting</title>
<style>html,body{margin:0;height:100%;background:#000}canvas{display:block;width:100vw;height:100vh}</style>
</head><body><canvas id="c"></canvas><script src="crow.js"></script><script>
const canvas = document.getElementById('c');
Crow.start({ canvas, module: 'main.wasm', manual: true, keep: true }).then((page) => {
  let t = 0;
  const step = (n) => { for (let i = 0; i < (n || 1); i++) { t += 16; page.step(t); } };
  const at = (type, x, y) => page.give({ type, device: 'mouse', id: 1, x, y, button: 0, shift: false, ctrl: false, alt: false, meta: false });
  const key = (k, code) => page.give({ type: 'key', key: k, code: code || k, shift: false, ctrl: false, alt: false, meta: false });
  const kept = () => { const c2 = document.createElement('canvas'); c2.width = canvas.width; c2.height = canvas.height;
    const x = c2.getContext('2d'); x.drawImage(canvas, 0, 0); return x.getImageData(0, 0, c2.width, c2.height).data; };
  const w = () => canvas.width, h = () => canvas.height;
  const scene = () => [392, 24, w() - 24, h() - 24];
  const panel = () => [24, 24, 344, h() - 24];
  const ground = (a) => { const b = scene(), i = ((b[1] + 4) * w() + b[0] + 4) * 4; return [a[i], a[i + 1], a[i + 2]]; };
  const covered = (a) => { const g = ground(a), b = scene(); let n = 0, all = 0;
    for (let y = b[1]; y < b[3]; y++) for (let x = b[0]; x < b[2]; x++) { const i = (y * w() + x) * 4; all++;
      if (Math.abs(a[i] - g[0]) + Math.abs(a[i + 1] - g[1]) + Math.abs(a[i + 2] - g[2]) > 30) n++; }
    return n / all; };
  const apart = (a, c, b) => { let s = 0, n = 0;
    for (let y = b[1]; y < b[3]; y++) for (let x = b[0]; x < b[2]; x++) { const i = (y * w() + x) * 4;
      s += (Math.abs(a[i] - c[i]) + Math.abs(a[i + 1] - c[i + 1]) + Math.abs(a[i + 2] - c[i + 2])) / 3; n++; }
    return n ? s / n : 0; };
  step(3);
  const first = kept();
  at('down', 660, 350); step(); at('move', 760, 360); step(); at('up', 760, 360); step(2);
  const turned = kept();
  key('Tab'); step(); key('ArrowDown'); step(3);
  const chosen = kept();
  key('Tab'); step(); key(' ', 'Space'); step(3);
  const written = kept();
  document.title = JSON.stringify({ stopped: page.stopped, size: [w(), h()],
    covered: covered(first), turned: apart(first, turned, scene()), chosen: apart(turned, chosen, scene()),
    covered_chosen: covered(chosen), panel_written: apart(chosen, written, panel()),
    scene_written: apart(chosen, written, scene()) });
});
</script></body></html>
"""


def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def main():
    if not os.path.exists(os.path.join(BUILD, 'main.wasm')):
        print('no build: run `crow build --target web main.co` in examples/models first')
        return 1
    folder = tempfile.mkdtemp(prefix='lory-models-browser-')
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
                              '--window-size=1000,700', f'--user-data-dir={folder}/profile',
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
        print(f"at {got['size'][0]}x{got['size'][1]}: the cottage covers {got['covered'] * 100:.1f}% of the scene; "
              f"turned, the scene moves {got['turned']:.1f} a pixel; the cube chosen, {got['chosen']:.1f} "
              f"(it covers {got['covered_chosen'] * 100:.1f}%); its OBJ shown, the panel moves "
              f"{got['panel_written']:.1f} and the scene {got['scene_written']:.1f}")
        failures = []
        if got['stopped']:
            failures.append(f"the program stopped: {got['stopped']}")
        if got['covered'] < 0.03:
            failures.append('the scene shows no cottage')
        if got['turned'] < 1.0:
            failures.append('a drag across the scene did not turn it')
        if got['chosen'] < 1.0:
            failures.append('Tab and ArrowDown did not choose another model')
        if got['covered_chosen'] < 0.03:
            failures.append('the cube chosen is not drawn')
        if got['panel_written'] < 1.0:
            failures.append('the OBJ button did not show the file it writes')
        if got['scene_written'] > 0.5:
            failures.append('showing the file changed the scene')
        for f in failures:
            print('✗', f)
        if not failures:
            print('✓ models in a browser: the cottage read and drawn, turned by a drag, the cube chosen '
                  'by keys, and the file its OBJ writer writes shown by its button')
        return 1 if failures else 0
    finally:
        shutil.rmtree(folder, ignore_errors=True)


if __name__ == '__main__':
    sys.exit(main())
