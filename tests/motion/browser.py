#!/usr/bin/env python3
"""lory.motion in a real browser: the motion example (examples/motion,
built for the web first: `crow build --target web main.co` there), driven in
headless Chrome at 1400 by 1400 CSS pixels. The page steps the program's
frames itself, 16 ms apart, and asks it where its controls are (it tells
the program 'boxes', and the program logs them). It then reads its drawing:

- The timeline's playhead (the one line drawn in the look's ink in the
  track) moves on while playing, stands while paused, runs back reversed,
  runs on played again, and jumps to three quarters of the track when the
  seek slider is pressed there.
- The drawing moves between frames.
- The ball (the accent's disc on the spring's track) is at the track's left
  end, and pressed, a spring carries it to the right end.
- The large curve, outElastic(1, .3) at first, rises above the line of 1;
  once outExpo is pressed in the gallery, it does not.

The page says what it found in its title, which this script reads.

    python3 -I tests/motion/browser.py      (from the repository's root)

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
BUILD = os.path.join(ROOT, 'examples', 'motion', 'main_web')
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
  const press = (x, y) => { give('down', x, y); give('up', x, y); };
  const w = () => canvas.width, h = () => canvas.height;
  const drawing = () => { const copy = document.createElement('canvas'); copy.width = w(); copy.height = h();
    const g = copy.getContext('2d'); g.drawImage(canvas, 0, 0); return g.getImageData(0, 0, w(), h()).data; };
  const ACCENT = [59, 130, 246];
  const INK = [232, 237, 242];
  const near = (d, i, rgb) => Math.abs(d[i] - rgb[0]) + Math.abs(d[i + 1] - rgb[1]) + Math.abs(d[i + 2] - rgb[2]) < 30;
  // where a colour stands in a box of the drawing: the mean x of its pixels and how many there are
  const found = (d, box, rgb) => { let sum = 0, n = 0;
    for (let y = Math.max(0, box[1]); y < Math.min(h(), box[1] + box[3]); y++)
      for (let x = Math.max(0, box[0]); x < Math.min(w(), box[0] + box[2]); x++)
        if (near(d, (y * w() + x) * 4, rgb)) { sum += x; n++; }
    return [n ? sum / n : -1, n]; };
  const changed = (a, b) => { let n = 0;
    for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 72) n++;
    return n; };
  const finish = (o) => { document.title = JSON.stringify(Object.assign({ stopped: page.stopped || null, troubles, size: [w(), h()] }, o)); };
  try {
    step(5);
    page.give({ type: 'told', text: 'boxes' });
    step();
    const told = logs.filter((l) => l.startsWith('{'));
    if (!told.length) return finish({ boxes: null });
    const boxes = JSON.parse(told[told.length - 1]);
    const box = (id) => boxes[id].map(Math.round);
    const middle = (id) => { const b = box(id); return [b[0] + b[2] / 2, b[1] + b[3] / 2]; };
    // the timeline: the playhead in its track, and where the track's time runs
    const tb = box('track');
    const left = tb[0] + 64, wide = tb[2] - 64 - 14;
    const head = () => found(drawing(), tb, INK)[0];
    const heads = [];
    heads.push(head());
    step(20); heads.push(head());
    press(...middle('pause')); step(2); heads.push(head());
    step(20); heads.push(head());
    press(...middle('reverse')); step(20); heads.push(head());
    press(...middle('play')); step(20); heads.push(head());
    const sb = box('seek');
    press(sb[0] + sb[2] * 0.75, sb[1] + sb[3] / 2); step(2); heads.push(head());
    // the drawing moves
    const before = drawing();
    step(20);
    const moved = changed(before, drawing());
    // the ball, before and after a press sends it
    const bb = box('ball');
    const strip = [bb[0], bb[1], bb[2], 50];
    const ball = [found(drawing(), strip, ACCENT)[0]];
    press(bb[0] + bb[2] / 2, bb[1] + bb[3] / 2); step(90);
    ball.push(found(drawing(), strip, ACCENT)[0]);
    // the large curve above the line of 1, before and after outExpo is chosen
    const cb = box('curve');
    const pad = 12, top = cb[1] + pad, tall = cb[3] - 2 * pad;
    const one = top + tall * 0.3 / 1.6;
    const above = [cb[0] + pad, top, cb[2] - 3 * pad - 44, Math.max(0, Math.floor(one - 4 - top))];
    const over = [found(drawing(), above, ACCENT)[1]];
    press(...middle('thumb:3')); step(2);
    over.push(found(drawing(), above, ACCENT)[1]);
    finish({ boxes: Object.keys(boxes), track: [left, wide], heads, moved, ball: [bb[0], bb[2]].concat(ball), over });
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
    for name in ['track', 'pause', 'reverse', 'play', 'seek', 'ball', 'curve', 'thumb:3', 'dots']:
        if name not in got['boxes']:
            failures.append(f'no control {name}')
    if failures:
        return failures
    left, wide = got['track']
    heads = got['heads']
    if min(heads) < 0:
        failures.append(f'the playhead was not found in the track: {heads}')
        return failures
    at = [round((x - left) / wide, 3) for x in heads]
    print('the playhead stood at', at, 'of the track: playing, then paused, still paused, reversed, played, sought')
    if not heads[1] > heads[0] + 10:
        failures.append('the playhead did not move on while playing')
    if abs(heads[3] - heads[2]) > 2:
        failures.append('the playhead moved while paused')
    if not heads[4] < heads[3] - 10:
        failures.append('the playhead did not run back once reversed')
    if not heads[5] > heads[4] + 10:
        failures.append('the playhead did not run on once played')
    if not 0.6 <= at[6] <= 0.9:
        failures.append(f'the seek slider pressed at three quarters put the playhead at {at[6]}')
    print(f"{got['moved']} pixels changed over 20 frames")
    if got['moved'] < 300:
        failures.append('the drawing barely moved between frames')
    x0, w0, before, after = got['ball']
    print(f'the ball stood at {round((before - x0) / w0, 3)} of its box, and {round((after - x0) / w0, 3)} after a press')
    if before < 0 or after < 0 or not (before < x0 + 0.3 * w0 and after > x0 + 0.7 * w0):
        failures.append('the ball did not go from the left end to the right end when pressed')
    over = got['over']
    print(f'pixels of the large curve above the line of 1: {over[0]} for outElastic(1, .3), {over[1]} for outExpo')
    if not (over[0] > 10 and over[1] < 3):
        failures.append('the large curve did not change from an overshooting easing to outExpo')
    return failures


def main():
    if not os.path.exists(os.path.join(BUILD, 'main.wasm')):
        print('no build: run `crow build --target web main.co` in examples/motion first')
        return 1
    folder = tempfile.mkdtemp(prefix='lory-motion-browser-')
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
                              f'--user-data-dir={folder}/profile', '--virtual-time-budget=30000', '--dump-dom',
                              f'http://127.0.0.1:{port}/drive.html'],
                             capture_output=True, text=True, timeout=300).stdout
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
            print('✓ motion in a browser: the timeline plays, pauses, reverses and seeks; the ball springs; the curve changes')
        return 1 if failures else 0
    finally:
        shutil.rmtree(folder, ignore_errors=True)


if __name__ == '__main__':
    sys.exit(main())
