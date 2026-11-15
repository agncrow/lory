#!/usr/bin/env python3
"""lory.datagrid in a real browser: the data grid example (examples/datagrid,
built for the web first: `crow build --target web main.co` there), driven in
headless Chrome at 1400 by 1400 CSS pixels. The page steps the program's
frames itself, 16 ms apart, asks it where its controls are (it tells the
program 'boxes') and what it holds (it tells 'state'; the program logs
both). It then checks:

- A press on a person's hours focuses that cell, and the focus ring (the
  look's focus colour) is drawn round it.
- A double press edits the cell in the edit bar; keys typed there and Enter
  make the edit, kept as a draft: one person changed, the row's hours as
  they were until Save is pressed, then the new hours.
- ArrowDown moves the focus down a row, as TOAST UI Grid's keymap has it.
- The wheel over the grid scrolls its rows.
- On the Live tab the feed's ticks come in as the frames' time runs, and
  the drawing changes from frame to frame with no input.
- On the Sheet tab the total's formula shows its sum.

The page says what it found in its title, which this script reads.

    python3 -I tests/datagrid/browser.py      (from the repository's root)

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
BUILD = os.path.join(ROOT, 'examples', 'datagrid', 'main_web')
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
    const box = (id) => boxes[id].map(Math.round);
    const middle = (id) => { const b = box(id); return [b[0] + b[2] / 2, b[1] + b[3] / 2]; };
    const states = { first: state() };
    // a person's hours: the fourth column (its width 100 of 560 shares of 860), the third row
    const gb = box('people');
    const cell = [gb[0] + Math.round(860 * 460 / 560) + 4, gb[1] + 34 + 60 + 2, Math.round(860 * 100 / 560) - 8, 26];
    const at = [cell[0] + 20, cell[1] + 12];
    const ringBefore = count(drawing(), cell, FOCUS);
    press(...at);
    states.pressed = state();
    const ring = count(drawing(), [cell[0] - 4, cell[1] - 4, cell[2] + 8, cell[3] + 8], FOCUS);
    give('double', ...at); step(2);
    states.editing = state();
    key('Backspace'); key('Backspace');
    page.give({ type: 'text', text: '8' }); step(2);
    states.typed = state();
    key('Enter');
    states.edited = state();
    key('ArrowDown');
    states.down = state();
    press(...middle('save'));
    states.saved = state();
    page.give({ type: 'wheel', x: gb[0] + 100, y: gb[1] + 150, dx: 0, dy: 240 }); step(2);
    states.wheeled = state();
    // the tabs: pressed along their row until the one wanted is chosen
    const tb = box('tab');
    const tab = (name) => { for (let x = tb[0] + 8; x < tb[0] + tb[2]; x += 12) {
      press(x, tb[1] + tb[3] / 2); const s = state(); if (s && s.tab === name) return s; } return state(); };
    states.live = tab('live');
    const before = drawing();
    step(70);
    states.ticked = state();
    const moved = changed(before, drawing());
    states.sheet = tab('sheet');
    finish({ boxes: Object.keys(boxes), states, ring: [ringBefore, ring], moved });
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
    for name in ['people', 'people:editor', 'tab', 'save', 'discard', 'group', 'look']:
        if name not in got['boxes']:
            failures.append(f'no control {name}')
    s = got['states']
    if any(v is None for v in s.values()):
        failures.append(f'the program did not say what it holds: {s}')
        return failures
    if failures:
        return failures
    print('first:', s['first'])
    if s['first']['tab'] != 'people' or s['first']['hours'] != '26':
        failures.append(f"the first frame held {s['first']}")
    print('pressed:', s['pressed']['focus'], '; the focus ring', got['ring'][0], '->', got['ring'][1], 'pixels')
    if s['pressed']['focus'] != 'p2 hours':
        failures.append(f"a press on the third person's hours focused {s['pressed']['focus']!r}")
    if not got['ring'][1] > got['ring'][0] + 40:
        failures.append('no focus ring was drawn round the cell pressed')
    print('editing:', s['editing']['editing'], repr(s['editing']['draft']), '; typed', repr(s['typed']['draft']))
    if s['editing']['editing'] != 'p2 hours' or s['editing']['draft'] != '26':
        failures.append(f"a double press did not edit the cell: {s['editing']}")
    if s['typed']['draft'] != '8':
        failures.append(f"the edit bar held {s['typed']['draft']!r} after two Backspaces and 8")
    print('edited:', s['edited'])
    if s['edited']['editing'].strip() or s['edited']['changed'] != '1' or s['edited']['hours'] != '26':
        failures.append(f"Enter did not keep the edit as a draft: {s['edited']}")
    if s['down']['focus'] != 'p3 hours':
        failures.append(f"ArrowDown moved the focus to {s['down']['focus']!r}")
    print('saved:', s['saved']['changed'], 'changed, hours', s['saved']['hours'])
    if s['saved']['changed'] != '0' or s['saved']['hours'] != '8':
        failures.append(f"Save did not write the draft: {s['saved']}")
    print('scrolled:', s['wheeled']['scroll'])
    if not float(s['wheeled']['scroll']) > 0:
        failures.append('the wheel did not scroll the grid')
    print('live:', s['live']['tab'], s['live']['ticks'], '->', s['ticked']['ticks'], 'readings;', got['moved'], 'pixels changed over 70 frames')
    if s['live']['tab'] != 'live':
        failures.append('the Live tab was not found')
    elif not int(s['ticked']['ticks']) >= int(s['live']['ticks']) + 2:
        failures.append('the feed did not tick as the time ran')
    if got['moved'] < 50:
        failures.append('the live grid did not change between frames')
    print('sheet:', s['sheet']['tab'], 'total', s['sheet']['total'])
    if s['sheet']['tab'] != 'sheet' or s['sheet']['total'] != '1725':
        failures.append(f"the Sheet tab showed {s['sheet']}")
    return failures


def main():
    if not os.path.exists(os.path.join(BUILD, 'main.wasm')):
        print('no build: run `crow build --target web main.co` in examples/datagrid first')
        return 1
    folder = tempfile.mkdtemp(prefix='lory-datagrid-browser-')
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
            print('✓ the data grid in a browser: cells pressed, edited, saved, moved by keys and scrolled; the feed ticks; the sheet sums')
        return 1 if failures else 0
    finally:
        shutil.rmtree(folder, ignore_errors=True)


if __name__ == '__main__':
    sys.exit(main())
