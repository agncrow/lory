#!/usr/bin/env python3
"""three.js's scenes in Lory, held to three's own pictures of them.

Each scene of examples/threejs that tests/threejs/scenes.js also states
for three.js 0.187.0 is drawn by Lory's web build (examples/threejs, built
first: `crow build --target web main.co` there) in headless Chrome, over a
canvas of 480 by 360 at one second on its clock, and held to the picture
three drew of it (tests/threejs/pictures/<scene>.png), pixel by pixel:

  exact     where nothing is lit (three's basic materials, lines, points,
            pictures drawn as they are): every pixel the same;
  lit       Lambert's and Phong's materials under three's lights: no
            pixel more than 2 of 255 apart in any channel, but for a few
            along edges (a thousandth of the picture), and the things'
            outlines the same (where they cover the background);
  physical  three's standard material, whose rough surfaces' lost light
            three reads from a table and Lory from a published fit of
            the same integral: within 12 of 255, the outlines the same;
  shadows   a lamp's shadows: the outlines and the shadows' extent held
            (shadow maps differ where a texel's depth meets a surface).

    python3 -I tests/threejs/picture.py                 (from the root)
    python3 -I tests/threejs/picture.py --three DIR     (three's own
        pictures drawn first, from three's package folder DIR — its
        build/three.module.js and three.core.js — and kept)

Nothing is installed: the browser is this Mac's Chrome (LORY_CHROME names
another), the rest Python's own library; three is read from the folder
given (npm install --prefix <scratch> three@0.187.0 puts it there).
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

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
BUILD = os.path.join(ROOT, 'examples', 'threejs', 'main_web')
PICTURES = os.path.join(HERE, 'pictures')
CHROME = os.environ.get('LORY_CHROME') or '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
W, H, T = 480, 360, 1000

# the suite's scenes three draws no picture of here (the headset's, the
# controls', marching cubes and SVG's): drawn by Lory's build all the same,
# each held to drawing something over a fifth of a percent of the canvas
# (unlike its corner) without the program stopping
ALSO = ['controls_fly', 'controls_trackball', 'controls_drag', 'marching', 'svg', 'dragging',
        'ball_shooter', 'paint', 'teleport', 'look_to_select', 'point_to_select']

# what each kind of scene is held to: the share of pixels allowed past
# `within` of 255, the largest difference allowed anywhere, and the least
# overlap of the two outlines (pixels unlike the background, the overlap
# over their union)
RULES = {
    'exact': dict(within=0, share=0.0, largest=0, overlap=1.0),
    'lit': dict(within=2, share=0.001, largest=64, overlap=0.995),
    'physical': dict(within=12, share=0.002, largest=96, overlap=0.995),
    'shadows': dict(within=24, share=0.03, largest=255, overlap=0.99),
}

THREE_PAGE = """<!DOCTYPE html><html><head><title>waiting</title>
<style>html,body{margin:0;background:#000}canvas{display:block}</style>
<script type="importmap">{"imports": {"three": "./three.module.js"}}</script>
</head><body><pre id="out"></pre><script type="module">
import * as THREE from 'three';
import { SCENES } from './scenes.js';
const W = %d, H = %d, T = %d;
const out = {}, kinds = {};
try {
  if (THREE.REVISION !== '187') throw new Error('three r' + THREE.REVISION + ', not r187');
  for (const name of Object.keys(SCENES)) {
    const canvas = document.createElement('canvas');
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    document.body.appendChild(canvas);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    const s = SCENES[name].draw(THREE, T, W / H, W, H);
    if (s.clipping) renderer.localClippingEnabled = true;
    if (s.shadows) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.BasicShadowMap;
    }
    if (s.views) {
      renderer.setScissorTest(true);
      for (const v of s.views) {
        renderer.setViewport(v.box[0], H - v.box[1] - v.box[3], v.box[2], v.box[3]);
        renderer.setScissor(v.box[0], H - v.box[1] - v.box[3], v.box[2], v.box[3]);
        if (v.before) v.before();
        renderer.render(s.scene, v.camera);
      }
    } else {
      renderer.render(s.scene, s.camera);
    }
    out[name] = canvas.toDataURL('image/png');
    kinds[name] = { kind: SCENES[name].kind, pointer: SCENES[name].pointer || null, picked: s.picked === undefined ? null : s.picked, ground: s.scene.background ? s.scene.background.getHexString() : '000000' };
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  }
  document.getElementById('out').textContent = JSON.stringify({ out, kinds });
  document.title = 'done';
} catch (e) {
  document.title = 'failed: ' + (e && e.message || e);
}
</script></body></html>
"""

LORY_PAGE = """<!DOCTYPE html><html><head><title>waiting</title>
<style>html,body{margin:0;background:#000;overflow:hidden}canvas{display:block;width:%dpx;height:%dpx}</style>
</head><body><canvas id="c"></canvas><script src="crow.js"></script><script>
const W = %d, H = %d, T = %d;
const kinds = %s;
const also = %s;
const canvas = document.getElementById('c');
const load = (src) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => no(new Error('no picture ' + src)); im.src = src; });
const pixels = (source) => { const c2 = document.createElement('canvas'); c2.width = W; c2.height = H;
  const x = c2.getContext('2d'); x.drawImage(source, 0, 0); return x.getImageData(0, 0, W, H).data; };
const unlike = (a, i, g) => Math.abs(a[i] - g[0]) + Math.abs(a[i + 1] - g[1]) + Math.abs(a[i + 2] - g[2]) > 12;
function compared(mine, theirs, ground, within) {
  const g = [parseInt(ground.slice(0, 2), 16), parseInt(ground.slice(2, 4), 16), parseInt(ground.slice(4, 6), 16)];
  let differ = 0, past = 0, largest = 0, total = 0, both = 0, either = 0, mx = 0, my = 0, tx = 0, ty = 0, mn = 0, tn = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const d = Math.max(Math.abs(mine[i] - theirs[i]), Math.abs(mine[i + 1] - theirs[i + 1]), Math.abs(mine[i + 2] - theirs[i + 2]));
    if (d > 0) differ++;
    if (d > within) past++;
    if (d > largest) largest = d;
    total += d;
    const a = unlike(mine, i, g), b = unlike(theirs, i, g);
    if (a && b) both++;
    if (a || b) either++;
    if (a) { mx += x; my += y; mn++; }
    if (b) { tx += x; ty += y; tn++; }
  }
  const n = W * H;
  return { differ: differ / n, past: past / n, largest, mean: total / n, overlap: either ? both / either : 1,
    covered: mn / n, shift: mn && tn ? Math.hypot(mx / mn - tx / tn, my / mn - ty / tn) : 0 };
}
Crow.start({ canvas, module: 'main.wasm', manual: true, keep: true }).then(async (page) => {
  let t = 0;
  const step = (n) => { for (let i = 0; i < n; i++) { t += 16; page.step(t); } };
  const results = {};
  try {
    for (const name of Object.keys(kinds)) {
      page.give({ type: 'told', text: 'scene ' + name + ' at ' + T + ' whole' + (kinds[name].pointer ? ' point ' + kinds[name].pointer.join(' ') : '') });
      step(4);
      const mine = pixels(canvas);
      const theirs = pixels(await load('pictures/' + name + '.png'));
      results[name] = compared(mine, theirs, kinds[name].ground, kinds[name].within);
    }
    for (const name of also) {
      page.give({ type: 'told', text: 'scene ' + name + ' at ' + T + ' whole' });
      step(4);
      const mine = pixels(canvas);
      let drawn = 0;
      for (let i = 0; i < W * H * 4; i += 4) if (Math.abs(mine[i] - mine[0]) + Math.abs(mine[i + 1] - mine[1]) + Math.abs(mine[i + 2] - mine[2]) > 12) drawn++;
      results['also ' + name] = { covered: drawn / (W * H) };
    }
  } catch (e) {
    results.failed = String(e && e.message || e);
  }
  document.title = JSON.stringify({ stopped: page.stopped, size: [canvas.width, canvas.height], results });
});
</script></body></html>
"""


def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def served(folder, page, budget):
    """The page's DOM once headless Chrome has run it, served from `folder`
    on a free port of 127.0.0.1."""
    port = free_port()
    quiet = type('Quiet', (http.server.SimpleHTTPRequestHandler,), {'log_message': lambda *a: None})
    quiet.extensions_map = dict(quiet.extensions_map, **{'.wasm': 'application/wasm', '.js': 'text/javascript'})
    server = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(quiet, directory=folder))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        return subprocess.run([CHROME, '--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
                               '--window-size=900,700', f'--user-data-dir={folder}/profile',
                               f'--virtual-time-budget={budget}', '--dump-dom',
                               f'http://127.0.0.1:{port}/{page}'],
                              capture_output=True, text=True, timeout=600).stdout
    finally:
        server.shutdown()


def title_of(dom):
    found = re.search(r'<title>(.*?)</title>', dom, re.S)
    return html.unescape(found.group(1)) if found else ''


def draw_three(three):
    """three's pictures of the scenes, kept in pictures/ with what each is."""
    module = os.path.join(three, 'build', 'three.module.js')
    if not os.path.exists(module):
        print(f'✗ no three at {three} (its build/three.module.js)')
        return 1
    version = json.load(open(os.path.join(three, 'package.json')))['version']
    if version != '0.187.0':
        print(f'✗ three {version} at {three}: the pictures are three 0.187.0\'s')
        return 1
    folder = tempfile.mkdtemp(prefix='lory-threejs-three-')
    try:
        for name in ('three.module.js', 'three.core.js'):
            shutil.copy(os.path.join(three, 'build', name), folder)
        shutil.copy(os.path.join(HERE, 'scenes.js'), folder)
        with open(os.path.join(folder, 'three.html'), 'w') as f:
            f.write(THREE_PAGE % (W, H, T))
        dom = served(folder, 'three.html', 60000)
        said = title_of(dom)
        if said != 'done':
            print('✗ three\'s page said:', said[:300] or dom[:300])
            return 1
        found = re.search(r'<pre id="out">(.*?)</pre>', dom, re.S)
        got = json.loads(html.unescape(found.group(1)))
        os.makedirs(PICTURES, exist_ok=True)
        for name, url in got['out'].items():
            with open(os.path.join(PICTURES, name + '.png'), 'wb') as f:
                f.write(base64.b64decode(url.split(',', 1)[1]))
        with open(os.path.join(PICTURES, 'scenes.json'), 'w') as f:
            json.dump({'three': version, 'size': [W, H], 'at': T, 'scenes': got['kinds']}, f, indent=1, sort_keys=True)
            f.write('\n')
        print(f'three {version} drew {len(got["out"])} scenes into tests/threejs/pictures/')
        return 0
    finally:
        shutil.rmtree(folder, ignore_errors=True)


def compare():
    if not os.path.exists(os.path.join(BUILD, 'main.wasm')):
        print('no build: run `crow build --target web main.co` in examples/threejs first')
        return 1
    kept = json.load(open(os.path.join(PICTURES, 'scenes.json')))
    kinds = {name: dict(k, within=RULES[k['kind']]['within']) for name, k in kept['scenes'].items()}
    folder = tempfile.mkdtemp(prefix='lory-threejs-picture-')
    try:
        shutil.copy(os.path.join(BUILD, 'crow.js'), folder)
        shutil.copy(os.path.join(BUILD, 'main.wasm'), folder)
        shutil.copytree(PICTURES, os.path.join(folder, 'pictures'))
        with open(os.path.join(folder, 'drive.html'), 'w') as f:
            f.write(LORY_PAGE % (W, H, W, H, T, json.dumps(kinds), json.dumps(ALSO)))
        said = title_of(served(folder, 'drive.html', 120000))
        if not said.startswith('{'):
            print('✗ the page said nothing of what it found:', said[:300])
            return 1
        got = json.loads(said)
        failures = []
        if got['stopped']:
            failures.append(f"the program stopped: {got['stopped']}")
        if got['size'] != [W, H]:
            failures.append(f"the canvas is {got['size']}, not {W}x{H}")
        results = got['results']
        if 'failed' in results:
            failures.append(results.pop('failed'))
        for name in sorted(kinds):
            if name not in results:
                failures.append(f'{name}: not drawn')
                continue
            r, rule = results[name], RULES[kinds[name]['kind']]
            print(f"{name:24} {kinds[name]['kind']:9} differ {r['differ'] * 100:6.3f}%  past {rule['within']:>2}: "
                  f"{r['past'] * 100:6.3f}%  largest {r['largest']:3}  mean {r['mean']:.4f}  "
                  f"outlines {r['overlap'] * 100:6.2f}% alike, {r['shift']:.2f} px apart, covering {r['covered'] * 100:.1f}%")
            if r['past'] > rule['share'] or r['largest'] > rule['largest'] or r['overlap'] < rule['overlap']:
                failures.append(f"{name} is further from three's picture than a {kinds[name]['kind']} scene may be")
            if r['covered'] < 0.002:
                failures.append(f'{name} draws nothing')
        for name in ALSO:
            r = results.get('also ' + name)
            if r is None:
                failures.append(f'{name}: not drawn')
                continue
            print(f"{name:24} drawn over {r['covered'] * 100:.1f}% (no picture of three's)")
            if r['covered'] < 0.002:
                failures.append(f'{name} draws nothing')
        for f in failures:
            print('✗', f)
        if not failures:
            print(f"✓ three.js's scenes in Lory: {len(kinds)} pictures held to three {kept['three']}'s, {len(ALSO)} more drawn")
        return 1 if failures else 0
    finally:
        shutil.rmtree(folder, ignore_errors=True)


def main():
    if '--three' in sys.argv:
        drawn = draw_three(sys.argv[sys.argv.index('--three') + 1])
        if drawn:
            return drawn
    return compare()


if __name__ == '__main__':
    sys.exit(main())
