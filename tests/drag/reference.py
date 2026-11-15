"""lory.drag held to the libraries it follows, run on fixed inputs.

Two references, each a pinned version installed in a scratch folder (never
Lory's own), its folder given as LORY_REF:

    npm install --prefix <scratch>/ref sortablejs@1.15.7 motion@14.7.1
    LORY_REF=<scratch>/ref python3 -I tests/drag/reference.py

- SortableJS 1.15.7, its UMD build (Sortable.js, with the AutoScroll,
  OnSpill, Swap and MultiDrag plugins mounted), driven in this machine's
  headless Chrome. Each scenario lays lists out on a page as Lory lays them
  out (lists side by side from (24, 24), 20 apart, items 40 high), makes a
  Sortable of each (in its fallback mode, which pointer events drive), and
  plays the scenario's steps: a press, a move or a release at a point, 50
  ms apart. The page runs on a clock of its own: every timer Sortable sets
  (its next ticks, its 30 ms of silence after a move, its animations' ends,
  AutoScroll's 24 ms steps and 30 ms throttle) fires at its time on that
  clock, and the CSS transitions its animation starts are held at that
  clock's time, so where an item stands mid-animation is read as the
  browser draws it there. Sortable's 50 ms loop that looks under the
  pointer (`_emulateDragOver`) runs once a step, after the step's input,
  as Lory looks once a frame. After each step the script keeps the events
  Sortable told (with their indices, pull mode, swapped item, selected
  items), each list's children in order, and in some scenarios where each
  item stands on the page and how far each scroll is turned.
- Motion 14.7.1 (motion-dom 14.7.1), in Node: tests/drag/motion.mjs runs
  its inertia and spring generators, as its drag releases with them, and
  its elastic constraint, on fixed inputs.

It writes tests/drag/reference.json beside it, which tests/drag/reference.co
holds lory.drag to.
"""
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
STEP_MS = 50


def column(id, items, width=300, gap=0, pad=0, tall=0, **options):
    """A list of entries one under another: `items` are ids (40 high) or
    (id, height) pairs."""
    entries = [(i, 40) if isinstance(i, str) else tuple(i) for i in items]
    return {'id': id, 'kind': 'column', 'width': width, 'gap': gap, 'pad': pad, 'tall': tall,
            'items': [{'id': i, 'w': 0, 'h': h} for i, h in entries], 'options': options}


def row(id, items, width, gap=0, pad=0, **options):
    """A list of entries side by side: `items` are (id, width) pairs, 40 high."""
    return {'id': id, 'kind': 'row', 'width': width, 'gap': gap, 'pad': pad, 'tall': 0,
            'items': [{'id': i, 'w': w, 'h': 40} for i, w in items], 'options': options}


def grid(id, items, columns, width, gap, height, **options):
    """A list of entries in `columns` equal columns, `height` high."""
    return {'id': id, 'kind': 'grid', 'width': width, 'gap': gap, 'pad': 0, 'tall': 0,
            'columns': columns, 'items': [{'id': i, 'w': 0, 'h': height} for i in items],
            'options': options}


def ids(prefix, n):
    return ['%s%d' % (prefix, i) for i in range(n)]


def at(i, x=174, top=24, h=40):
    """The middle of the `i`th 40-high entry of a list at `top`."""
    return [x, top + h * i + h // 2]


def down(p):
    return ['down'] + list(p)


def move(p):
    return ['move'] + list(p)


def up(p):
    return ['up'] + list(p)


def click(p):
    return ['click'] + list(p)


WAIT = ['wait']

A = lambda **o: column('a', ids('a', 6), **o)
B = lambda **o: column('b', ids('b', 4), **o)
SHARED = {'group': 'shared'}

SCENARIOS = [
    # the simple list: a0 dragged down past three neighbours, then a4 up
    {'name': 'reorder_down', 'lists': [A()],
     'steps': [down(at(0)), move([174, 46]), move([174, 70]), move([174, 110]), move([174, 150]), up([174, 150])],
     'rects': True},
    {'name': 'reorder_up', 'lists': [A()],
     'steps': [down(at(4)), move([174, 202]), move([174, 180]), move([174, 140]), move([174, 100]), up([174, 100])]},
    # the other entries slide into place over `animation` ms, and an entry
    # just passed is not passed back until it has slid
    {'name': 'animated', 'lists': [A(animation=150)],
     'steps': [down(at(0)), move([174, 46]), move([174, 70]), move([174, 50]), WAIT, WAIT, move([174, 30]),
               WAIT, move([174, 110]), WAIT, up([174, 110]), WAIT, WAIT, WAIT, WAIT],
     'rects': True},
    # turned back mid-slide: the slide back takes the part of the time it
    # had gone (Sortable's real time)
    {'name': 'animated_back', 'lists': [A(animation=150)],
     'steps': [down(at(0)), move([174, 46]), move([174, 70]), move([174, 110]), move([174, 40]), WAIT, WAIT,
               WAIT, up([174, 40]), WAIT, WAIT, WAIT, WAIT],
     'rects': True},
    # shared lists: a1 dropped into b between b1 and b2, then b0 into a
    {'name': 'between', 'lists': [A(**SHARED), B(**SHARED)],
     'steps': [down(at(1)), move([174, 86]), move([494, 110]), up([494, 110]),
               down(at(0, 494)), move([494, 46]), move([174, 30]), up([174, 30])],
     'rects': True},
    # into an empty list, met within its emptyInsertThreshold (5 px)
    {'name': 'empty', 'lists': [A(group='g'), column('b', [], tall=40, group='g')],
     'steps': [down(at(0)), move([174, 46]), move([340, 40]), up([340, 40]),
               down(at(0)), move([174, 46]), move([494, 60]), up([494, 60])]},
    # entries of two sizes: past a tall one, the pointer is still over it,
    # and Sortable's shadow of the dragged entry decides when it goes back
    {'name': 'sizes', 'lists': [column('a', [('a0', 40), ('a1', 80), ('a2', 40), ('a3', 80), ('a4', 40)])],
     'steps': [down(at(0)), move([174, 46]), move([174, 70]), move([174, 80]), move([174, 60]), move([174, 50]),
               move([174, 90]), move([174, 130]), move([174, 170]), move([174, 200]), move([174, 230]),
               up([174, 230])]},
    # cloning: a's entries are copied into b, a keeps them and takes none,
    # and a is not reordered
    {'name': 'clone', 'lists': [A(group={'name': 'shared', 'pull': 'clone', 'put': False}, sort=False), B(**SHARED)],
     'steps': [down(at(2)), move([174, 126]), move([174, 50]), move([494, 60]), move([174, 200]), move([494, 140]),
               up([494, 140]), down(at(0, 494)), move([494, 46]), move([174, 90]), up([174, 90])]},
    # sort false: a cannot be reordered, and an entry taken from it and
    # brought back goes back where it was
    {'name': 'sort_false', 'lists': [A(group='shared', sort=False), B(**SHARED)],
     'steps': [down(at(0)), move([174, 46]), move([174, 120]), move([494, 70]), move([174, 200]), up([174, 200])]},
    # put false: b takes nothing
    {'name': 'put_false', 'lists': [A(**SHARED), B(group={'name': 'shared', 'put': False})],
     'steps': [down(at(0)), move([174, 46]), move([494, 70]), move([494, 110]), up([494, 110])]},
    # pull by name: a gives only to lists named in its pull, b takes only from those named in its put
    {'name': 'named_groups',
     'lists': [A(group={'name': 'left', 'pull': ['right']}), B(group={'name': 'right', 'put': ['left']}),
               column('c', ids('c', 2), group={'name': 'other', 'put': ['left']})],
     'steps': [down(at(0)), move([174, 46]), move([814, 70]), move([494, 70]), up([494, 70])]},
    # a handle: a press elsewhere on the entry starts nothing
    {'name': 'handle', 'lists': [A(handle=True)],
     'steps': [down(at(0)), move([174, 46]), move([174, 90]), up([174, 90]),
               down([46, 44]), move([46, 46]), move([46, 90]), up([46, 90])]},
    # a filtered entry tells `filter` and is not dragged; others pass it
    {'name': 'filter', 'lists': [A(filter=['a3'])],
     'steps': [down(at(3)), move([174, 166]), move([174, 210]), up([174, 210]),
               down(at(0)), move([174, 46]), move([174, 70]), move([174, 110]), move([174, 150]), up([174, 150])]},
    # swapThreshold 0.5: the middle half of a neighbour is where it is passed
    {'name': 'threshold', 'lists': [A(swapThreshold=0.5)],
     'steps': [down(at(0)), move([174, 46]), move([174, 70]), move([174, 80]), move([174, 100]), move([174, 108]),
               move([174, 118]), move([174, 112]), move([174, 100]), move([174, 90]), up([174, 90])]},
    # invertSwap: the outer parts of a neighbour are where it is passed
    {'name': 'invert', 'lists': [A(invertSwap=True)],
     'steps': [down(at(0)), move([174, 46]), move([174, 70]), move([174, 90]), move([174, 100]), move([174, 126]),
               move([174, 140]), move([174, 120]), up([174, 120])]},
    {'name': 'invert_threshold', 'lists': [A(invertSwap=True, invertedSwapThreshold=0.4)],
     'steps': [down(at(0)), move([174, 46]), move([174, 80]), move([174, 100]), move([174, 108]), move([174, 130]),
               move([174, 140]), move([174, 74]), move([174, 60]), up([174, 60])]},
    # past the last entry and before the first, the dragged one goes to the end and the start
    {'name': 'ends', 'lists': [A(tall=400, pad=20)],
     'steps': [down(at(1, 174, 44)), move([174, 106]), move([174, 330]), move([174, 30]), move([174, 340]), up([174, 340])]},
    # side by side: a row's direction is across
    {'name': 'horizontal', 'lists': [row('h', [('h%d' % i, 100) for i in range(5)], width=540, gap=10)],
     'steps': [down([74, 44]), move([76, 44]), move([150, 44]), move([260, 44]), move([370, 44]), move([300, 44]),
               up([300, 44])]},
    # a grid of three columns: a cell dropped on the middle one goes after it
    {'name': 'grid', 'lists': [grid('g', ids('g', 9), columns=3, width=320, gap=10, height=60)],
     'steps': [down([74, 54]), move([76, 54]), move([184, 124]), move([300, 200]), up([300, 200])]},
    # the swap plugin: neighbours stay; on the drop two entries trade places
    {'name': 'swap', 'lists': [A(swap=True)],
     'steps': [down(at(0)), move([174, 46]), move([174, 110]), move([174, 164]), up([174, 164])]},
    {'name': 'swap_between', 'lists': [A(swap=True, **SHARED), B(swap=True, **SHARED)],
     'steps': [down(at(1)), move([174, 86]), move([494, 110]), up([494, 110])]},
    # the multi-drag plugin: two entries chosen by clicks are dragged as one
    # and unfold in their order where they are dropped; a click elsewhere
    # lets them go
    {'name': 'multi', 'lists': [A(multiDrag=True)],
     'steps': [click(at(1)), click(at(3)), down(at(1)), move([174, 86]), move([174, 210]), up([174, 210]),
               click([800, 600]), click(at(2)), click(at(2))]},
    # the OnSpill plugin: dropped outside every list, it goes back, or is taken away
    {'name': 'spill_revert', 'lists': [A(revertOnSpill=True, **SHARED), B(**SHARED)],
     'steps': [down(at(1)), move([174, 86]), move([174, 150]), move([494, 70]), move([800, 600]), up([800, 600])]},
    {'name': 'spill_remove', 'lists': [A(removeOnSpill=True)],
     'steps': [down(at(2)), move([174, 126]), move([174, 200]), move([800, 600]), up([800, 600])]},
    # a press held in place for `delay` ms before a drag begins; moved
    # sooner, it is no drag
    {'name': 'delay', 'lists': [A(delay=120)],
     'steps': [down(at(0)), WAIT, WAIT, WAIT, move([174, 46]), move([174, 70]), up([174, 70]),
               down(at(2)), move([174, 128]), move([174, 170]), up([174, 170])]},
    # fallbackTolerance: a drag begins once the pointer has moved that far
    {'name': 'tolerance', 'lists': [A(fallbackTolerance=8)],
     'steps': [down(at(0)), move([174, 48]), move([174, 50]), move([174, 53]), move([174, 70]), up([174, 70])]},
    {'name': 'disabled', 'lists': [A(disabled=True)],
     'steps': [down(at(0)), move([174, 46]), move([174, 90]), up([174, 90])]},
    # AutoScroll: near the edge of a scrolled list it turns 10 px each 24 ms
    # (SortableJS goes on scrolling a step after the pointer leaves the
    # zone, from a timer it does not clear: Lory stops, so reference.co
    # holds this scenario up to 450 ms)
    {'name': 'autoscroll', 'lists': [dict(column('a', ids('a', 12)), scroll=160)],
     'steps': [down(at(0)), move([174, 46]), move([174, 100]), move([174, 170]), WAIT, WAIT, WAIT, WAIT,
               move([174, 100]), WAIT, move([174, 30]), WAIT, WAIT, up([174, 30])],
     'scrolls': True},
]


def place(scenario):
    """Where each list stands: side by side from (24, 24), 20 apart."""
    x = 24
    for l in scenario['lists']:
        l['x'] = x
        l['y'] = 24
        x += l['width'] + 20


def list_html(l):
    """A list as the page lays it out, as Lory lays the same list out."""
    style = ['box-sizing:border-box', 'width:%dpx' % l['width'], 'padding:%dpx' % l['pad']]
    if l['tall']:
        style.append('min-height:%dpx' % l['tall'])
    if l['kind'] == 'column':
        style += ['display:flex', 'flex-direction:column', 'gap:%dpx' % l['gap']]
    elif l['kind'] == 'row':
        style += ['display:flex', 'flex-direction:row', 'gap:%dpx' % l['gap'], 'align-items:flex-start']
    else:
        cell = (l['width'] - l['gap'] * (l['columns'] - 1)) / l['columns']
        style += ['display:grid', 'grid-template-columns:repeat(%d, %gpx)' % (l['columns'], cell),
                  'gap:%dpx' % l['gap'], 'align-items:start']
    blocked = set(l['options'].get('filter', []))
    kids = []
    for item in l['items']:
        s = ['position:relative', 'box-sizing:border-box', 'height:%dpx' % item['h'], 'flex:none']
        if item['w']:
            s.append('width:%dpx' % item['w'])
        inner = ''
        if l['options'].get('handle'):
            inner = '<span class="handle" style="position:absolute;left:10px;top:%dpx;width:24px;height:24px"></span>' % ((item['h'] - 24) // 2)
        cls = ' class="blocked"' if item['id'] in blocked else ''
        kids.append('<div data-id="%s"%s style="%s">%s</div>' % (item['id'], cls, ';'.join(s), inner))
    body = '<div id="%s" style="%s">%s</div>' % (l['id'], ';'.join(style), ''.join(kids))
    if 'scroll' in l:
        return ('<div id="%s:scroll" class="scroller" style="position:absolute;left:%dpx;top:%dpx;width:%dpx;'
                'height:%dpx;overflow-y:auto;scrollbar-width:none">%s</div>') % (
                    l['id'], l['x'], l['y'], l['width'], l['scroll'], body)
    return body.replace('style="', 'style="position:absolute;left:%dpx;top:%dpx;' % (l['x'], l['y']), 1)


DRIVER = r'''
// ---- a clock of the page's own: Sortable's timers fire at their times on it ----
let now = 0, seq = 0, nextId = 1;
const timers = new Map(), loops = new Map();
window.setTimeout = (fn, ms, ...args) => {
  const id = nextId++;
  timers.set(id, {due: now + Math.max(0, Number(ms) || 0), seq: seq++, fn: () => fn(...args), every: 0});
  return id;
};
window.setInterval = (fn, ms, ...args) => {
  const id = nextId++;
  // (Sortable's 50 ms loop that looks under the pointer runs once a step)
  if (ms === 50) loops.set(id, () => fn(...args));
  else timers.set(id, {due: now + ms, seq: seq++, fn: () => fn(...args), every: ms});
  return id;
};
window.clearTimeout = window.clearInterval = (id) => { timers.delete(id); loops.delete(id); };
function advance(to) {
  for (;;) {
    let best = null, bestId = null;
    for (const [id, t] of timers) {
      if (t.due <= to && (!best || t.due < best.due || (t.due === best.due && t.seq < best.seq))) { best = t; bestId = id; }
    }
    if (!best) break;
    now = best.due;
    if (best.every) { best.due += best.every; best.seq = seq++; } else timers.delete(bestId);
    best.fn();
  }
  now = to;
}
// ---- CSS transitions held at the clock's time ----
const begun = new Map();
function hold() {
  for (const a of document.getAnimations()) {
    if (!begun.has(a)) { begun.set(a, now); a.pause(); }
    const d = a.effect.getComputedTiming().duration;
    a.currentTime = Math.min(now - begun.get(a), d);
  }
}
// ---- pointer input as a mouse gives it ----
function fire(kind, x, y) {
  const target = document.elementFromPoint(x, y) || document.body;
  const init = {bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0,
                buttons: kind === 'up' ? 0 : 1, pointerId: 1, pointerType: 'mouse', isPrimary: true};
  const names = {down: ['pointerdown', 'mousedown'], move: ['pointermove', 'mousemove'], up: ['pointerup', 'mouseup', 'click']}[kind];
  for (const name of names) {
    const ev = name.startsWith('pointer') ? new PointerEvent(name, init) : new MouseEvent(name, init);
    target.dispatchEvent(ev);
  }
}
function idOf(el) {
  if (!el) return null;
  if (el.dataset && el.dataset.id) return el.dataset.id + (el === Sortable.clone ? '+' : '');
  return el.id || null;
}
function ordersOf(lists) {
  const out = {};
  for (const l of lists) {
    const el = document.getElementById(l.id);
    out[l.id] = [...el.children].filter(c => c !== Sortable.ghost && getComputedStyle(c).display !== 'none').map(idOf);
  }
  return out;
}
function rectsOf(lists) {
  const out = {};
  for (const l of lists) {
    const el = document.getElementById(l.id);
    const r = el.getBoundingClientRect();
    out[l.id] = [r.left, r.top, r.width, r.height];
    for (const c of el.children) {
      if (c === Sortable.ghost || getComputedStyle(c).display === 'none') continue;
      const b = c.getBoundingClientRect();
      out[idOf(c)] = [b.left, b.top, b.width, b.height];
    }
  }
  if (Sortable.ghost) {
    const g = Sortable.ghost.getBoundingClientRect();
    out['ghost'] = [g.left, g.top, g.width, g.height];
  }
  return out;
}
function scrollsOf() {
  const out = {};
  for (const s of document.querySelectorAll('.scroller')) out[s.id] = s.scrollTop;
  return out;
}
const NAMES = ['choose', 'unchoose', 'start', 'end', 'add', 'update', 'sort', 'remove', 'filter', 'move', 'clone',
               'change', 'spill', 'select', 'deselect'];
function run(scenario) {
  const stage = document.getElementById('stage');
  stage.innerHTML = scenario.html;
  const told = [];
  let step = -1;
  const sortables = scenario.lists.map(l => {
    const o = Object.assign({forceFallback: true, fallbackOnBody: true}, l.options);
    if (o.handle) o.handle = '.handle';
    if (o.filter) o.filter = '.blocked';
    for (const name of NAMES) {
      const key = 'on' + name[0].toUpperCase() + name.slice(1);
      o[key] = function (evt) {
        const e = {step: step, e: name, list: this.el.id, item: idOf(evt.item || evt.dragged), from: idOf(evt.from),
                   to: idOf(evt.to), old: evt.oldIndex === undefined ? null : evt.oldIndex,
                   new: evt.newIndex === undefined ? null : evt.newIndex,
                   pull: evt.pullMode === undefined ? null : String(evt.pullMode)};
        if (name === 'move') { e.related = idOf(evt.related); e.after = !!evt.willInsertAfter; }
        if (evt.swapItem !== undefined) e.swap = idOf(evt.swapItem);
        if (evt.items) {
          e.items = evt.items.map(idOf);
          e.olds = evt.oldIndicies.map(x => x.index === undefined ? null : x.index);
          e.news = evt.newIndicies.map(x => x.index === undefined ? null : x.index);
        }
        told.push(e);
      };
    }
    return new Sortable(document.getElementById(l.id), o);
  });
  const steps = [];
  const start = now;
  steps.push({t: 0, orders: ordersOf(scenario.lists), rects: rectsOf(scenario.lists), scrolls: scrollsOf()});
  scenario.steps.forEach((s, i) => {
    step = i;
    advance(start + (i + 1) * STEP);
    hold();
    const kind = s[0];
    if (kind === 'click') { fire('down', s[1], s[2]); fire('up', s[1], s[2]); }
    else if (kind !== 'wait') fire(kind, s[1], s[2]);
    advance(now);
    for (const f of [...loops.values()]) f();
    advance(now);
    hold();
    const rec = {t: now - start, orders: ordersOf(scenario.lists)};
    if (scenario.rects) rec.rects = rectsOf(scenario.lists);
    if (scenario.scrolls) rec.scrolls = scrollsOf();
    steps.push(rec);
  });
  sortables.forEach(s => s.destroy());
  advance(now + 2000);
  stage.innerHTML = '';
  return {told: told, steps: steps};
}
const out = SCENARIOS.map(s => Object.assign({name: s.name}, run(s)));
document.getElementById('out').textContent = JSON.stringify({version: Sortable.version, scenarios: out});
'''


def sortable(ref):
    lib = os.path.join(ref, 'node_modules', 'sortablejs', 'Sortable.js')
    for s in SCENARIOS:
        place(s)
        s['html'] = ''.join(list_html(l) for l in s['lists'])
    page = '''<!doctype html><html><head><style>
html, body { margin: 0; padding: 0; width: 900px; height: 700px; overflow: hidden; }
.scroller::-webkit-scrollbar { display: none; }
#stage > div, #stage div { font: 0/0 a; }
</style></head><body><div id="stage"></div><pre id="out">pending</pre>
<script src="file://%s"></script>
<script>const STEP = %d; const SCENARIOS = %s;%s</script></body></html>''' % (
        lib, STEP_MS, json.dumps(SCENARIOS), DRIVER)
    with tempfile.TemporaryDirectory() as tmp:
        html = os.path.join(tmp, 'sortable.html')
        with open(html, 'w') as f:
            f.write(page)
        dom = subprocess.run([CHROME, '--headless=new', '--allow-file-access-from-files', '--window-size=900,700',
                              '--hide-scrollbars', '--user-data-dir=' + os.path.join(tmp, 'profile'),
                              '--virtual-time-budget=10000', '--dump-dom', 'file://' + html],
                             capture_output=True, text=True, timeout=180).stdout
    start = dom.index('<pre id="out">') + len('<pre id="out">')
    text = dom[start:dom.index('</pre>', start)]
    text = text.replace('&quot;', '"').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    got = json.loads(text)
    for s, r in zip(SCENARIOS, got['scenarios']):
        s.pop('html')
        r['lists'] = s['lists']
        r['steps_given'] = s['steps']
    return got


def motion(ref):
    script = os.path.join(HERE, 'motion.mjs')
    done = subprocess.run(['node', script], env=dict(os.environ, LORY_REF=ref), capture_output=True, text=True,
                          timeout=120)
    if done.returncode != 0:
        raise SystemExit(done.stderr)
    return json.loads(done.stdout)


def main():
    ref = os.environ.get('LORY_REF')
    if not ref:
        raise SystemExit('LORY_REF: the folder sortablejs 1.15.7 and motion 14.7.1 are installed in')
    got = {'step_ms': STEP_MS, 'sortable': sortable(ref), 'motion': motion(ref)}
    with open(os.path.join(HERE, 'reference.json'), 'w') as f:
        json.dump(got, f, indent=None, separators=(',', ':'))
    told = sum(len(s['told']) for s in got['sortable']['scenarios'])
    print('SortableJS %s: %d scenarios, %d events; Motion: %d curves' % (
        got['sortable']['version'], len(got['sortable']['scenarios']), told, len(got['motion']['curves'])))


main()
