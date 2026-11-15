"""Vue's own examples, run and recorded: what each shows after each action.

The twenty examples of vuejs.org/examples (Basic, Practical and the 7
GUIs), from the vuejs/docs repository at a pinned commit, are run in
headless Chrome on the pinned Vue, marked and lodash-es, and driven by a
fixed script of actions: presses, typing, choices, slides, a canvas's
clicks and right-clicks, and time stepped by a fake clock (the Timer's
frames, the Markdown editor's debounce). After each action the page
records what the example shows (its text, its fields' values, its list's
items, what is disabled, an alert's words, a transition's opacity and
scale at fixed times) and this script writes it all to reference.json
beside it, with the actions themselves. tests/vue/parity.co drives Lory's
versions (examples/vue) with the same actions and holds what they show to
it. Markdown is also held block for block: marked's HTML for a set of
inputs, read as a structure.

    python3 -I tests/vue/reference.py REF DOCS     (from the repository's root)

REF is a folder holding node_modules with the pinned libraries,
installed there and nowhere else:

    npm install --prefix REF vue@3.5.44 marked@18.1.2 lodash-es@4.18.1

DOCS is the vuejs/docs repository's `src/examples/src` folder at commit
40aa88af0094f7bab4aaf786e55c748a6a251d88 (each example's App and parts,
read where they are and never copied into Lory). The Composition API's
files are run (vuejs.org shows the Options API's beside them; the two
differ only in the Tree's leaf names, `world` for `wat`). The browser is
this Mac's Chrome (LORY_CHROME names another). Nothing else is installed.

What the reference is given so that a run is the same every time: today's
date is 2026-11-14 (the Flight Booker's default), Math.random is a
Park-Miller generator seeded with 42 (the List's inserts and lodash's
shuffle), GitHub's answers are canned (the commits below), and alert()
records its words.
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

HERE = os.path.dirname(os.path.abspath(__file__))
CHROME = os.environ.get('LORY_CHROME') or '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
VERSIONS = {'vue': '3.5.44', 'marked': '18.1.2', 'lodash-es': '4.18.1',
            'vuejs/docs': '40aa88af0094f7bab4aaf786e55c748a6a251d88'}

# ---- the actions, the same for Vue and for Lory ----
#
# Each action happens at `at` milliseconds. `on` names a control of the
# example (Lory's id is the example's short name, a colon and `on`, and
# `:value` after it where a control stands for one value of several);
# the page finds Vue's element for it.


def act(do, on='', at=None, **more):
    a = {'do': do}
    if on:
        a['on'] = on
    if at is not None:
        a['at'] = at
    a.update(more)
    return a


def timed(actions, start=0, step=1000):
    """The actions at `step` apart, from `start`, where they say no time."""
    t = start
    out = []
    for a in actions:
        if 'at' not in a:
            a['at'] = t
        t = a['at'] + step
        out.append(a)
    return out


def start(at=0):
    return act('start', at=at)


def _of(of):
    return {} if of is None else {'of': of}


def press(on, of=None, at=None):
    return act('press', on, at, **_of(of))


def fill(on, text, of=None, at=None):
    return act('fill', on, at, text=text, **_of(of))


def commit(on, of=None, at=None):
    return act('commit', on, at, **_of(of))


def check(on, of=None, at=None):
    return act('check', on, at, **_of(of))


def choose(on, value, label=None, at=None):
    return act('choose', on, at, value=value, label=label if label is not None else value)


def pick(on, value, add=False, at=None):
    return act('pick', on, at, value=value, add=add)


def slide(on, value, of=None, at=None):
    return act('slide', on, at, value=value, **_of(of))


def double(on, of, at=None):
    return act('double', on, at, of=of)


def frame(at):
    return act('frame', at=at)


def sample(at, after):
    return act('sample', at=at, after=after)


def settle(at):
    return act('settle', at=at)


COMMITS = {
    'main': [
        {'sha': '3f1c2a9e8b7d6c5a4f3e2d1c0b9a8f7e6d5c4b3a',
         'html_url': 'https://github.com/vuejs/core/commit/3f1c2a9e8b7d6c5a4f3e2d1c0b9a8f7e6d5c4b3a',
         'author': {'html_url': 'https://github.com/ada-builder'},
         'commit': {'message': 'fix(runtime-core): keep a slot\'s fallback when its content is empty\n\ncloses #13001',
                    'author': {'name': 'Ada Builder', 'date': '2026-11-12T08:30:00Z'}}},
        {'sha': 'b4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f7',
         'html_url': 'https://github.com/vuejs/core/commit/b4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f7',
         'author': {'html_url': 'https://github.com/lin-reviewer'},
         'commit': {'message': 'chore: bump the compiler\'s tests',
                    'author': {'name': 'Lin Reviewer', 'date': '2026-11-11T17:05:42Z'}}},
        {'sha': '0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b',
         'html_url': 'https://github.com/vuejs/core/commit/0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b',
         'author': {'html_url': 'https://github.com/sam-maintainer'},
         'commit': {'message': 'perf(reactivity): fewer allocations in effect scopes\n\nMeasured on the\nbenchmarks.',
                    'author': {'name': 'Sam Maintainer', 'date': '2026-11-10T23:59:01Z'}}}],
    'minor': [
        {'sha': 'c0ffee1234567890abcdef1234567890abcdef12',
         'html_url': 'https://github.com/vuejs/core/commit/c0ffee1234567890abcdef1234567890abcdef12',
         'author': {'html_url': 'https://github.com/kai-contributor'},
         'commit': {'message': 'feat(compiler-sfc): read a type\'s props from a re-export',
                    'author': {'name': 'Kai Contributor', 'date': '2026-11-13T06:00:00Z'}}},
        {'sha': 'deadbeef00112233445566778899aabbccddeeff',
         'html_url': 'https://github.com/vuejs/core/commit/deadbeef00112233445566778899aabbccddeeff',
         'author': {'html_url': 'https://github.com/ada-builder'},
         'commit': {'message': 'release: v3.6.0-rc.16',
                    'author': {'name': 'Ada Builder', 'date': '2026-11-12T12:12:12Z'}}},
        {'sha': '1234abcd5678ef901234abcd5678ef901234abcd',
         'html_url': 'https://github.com/vuejs/core/commit/1234abcd5678ef901234abcd5678ef901234abcd',
         'author': {'html_url': 'https://github.com/lin-reviewer'},
         'commit': {'message': 'test: cover the vapor mode\'s teleport\n\nand its unmount',
                    'author': {'name': 'Lin Reviewer', 'date': '2026-11-09T09:09:09Z'}}}]}

MARKDOWN = [
    '# hello',
    '## Second\n\nSome *emphasis* and **strong** text.',
    'Inline `code` and a [link](https://vuejs.org).',
    '- one\n- two\n- three',
    '1. first\n2. second\n3. third',
    '3. three\n4. four',
    '> quoted *words*\n> and more',
    '```js\nconst a = 1\nconsole.log(a)\n```',
    'above\n\n---\n\nbelow',
    '***both*** and _under_ and __strong__',
    'line one\nline two',
    '# A\n\nB\n\n## C\n\nD',
    '- a\n  - nested\n- b',
    '\\*not emphasis\\*',
    'Hard  \nbreak',
    '    indented code',
    'Setext\n===',
    '* star\n* list',
    '**a**',
    '[link *em*](http://x.y "the title")',
    '~~gone~~ and `two` and **bold `code`**',
    '###### six',
    '- loose\n\n- items',
    'a *b **c** d* e',
]

SCRIPTS = {
    'hello-world': [start()],
    'handling-input': timed([start(), press('reverse'), press('reverse'), press('append'), press('link'),
                             act('dismiss'), press('reverse')]),
    'attribute-bindings': timed([start(), press('red'), press('red'), press('color'), press('color'),
                                 press('color')]),
    'conditionals-and-loops': timed([start(), press('push'), press('reverse'), press('toggle'), press('toggle'),
                                     press('pop'), press('pop'), press('pop'), press('pop'), press('pop'),
                                     press('push'), press('toggle'), press('push'), press('toggle'),
                                     press('reverse')]),
    'form-bindings': timed([start(), fill('text', 'Hi there'), fill('text', ''), check('checked'),
                            check('names', 'John'), check('names', 'Jack'), check('names', 'Mike'),
                            check('names', 'Jack'), choose('picked', 'Two'), choose('picked', 'One'),
                            choose('selected', 'C'), choose('selected', 'B'), pick('multi', 'B'),
                            pick('multi', 'C', add=True), pick('multi', 'A', add=True),
                            pick('multi', 'B', add=True), pick('multi', 'C'), check('checked')]),
    'simple-component': [start()],
    'markdown': [start(0), fill('source', '# hello\n\n**a**', at=1000), frame(1050), frame(1150),
                 fill('source', 'x', at=3000), fill('source', 'xy', at=3060), fill('source', 'xyz', at=3120),
                 frame(3200), frame(3230), fill('source', '- a *b*\n- `c`', at=4000), frame(4099),
                 frame(4101), fill('source', '', at=5000), frame(5200)],
    'fetching-data': timed([start(), act('answer', request=0), choose('branch', 'minor'),
                            act('answer', request=1), choose('branch', 'main'), act('answer', request=2)]),
    'grid': timed([start(), press('sort', 'power'), press('sort', 'power'), press('sort', 'name'),
                   press('sort', 'name'), fill('query', 'li'), fill('query', 'zzz'), fill('query', ''),
                   fill('query', '9'), fill('query', 'INF'), fill('query', 'e'), fill('query', ''),
                   press('sort', 'power')]),
    'tree': timed([start(), press('row', 'r'), press('row', 'r.2'), double('row', 'r.0'),
                   press('add', 'r.0'), press('row', 'r.0'), press('row', 'r.2.0'), double('row', 'r.1'),
                   press('add', 'r'), press('row', 'r.2'), press('row', 'r')]),
    'svg': timed([start(), slide('value', 50, 'A', at=1000), slide('value', 0, 'C', at=2000), press('remove', 'F'),
                  press('remove', 'E'), press('remove', 'D'), press('remove', 'C'), act('dismiss'),
                  fill('label', 'G'), press('add'), press('add'), slide('value', 25, 'G'), fill('label', 'H'),
                  commit('label'), press('remove', 'A')]),
    'modal': [start(0), press('show', at=1000)] + [sample(1000 + k * 75, k * 75) for k in range(5)] +
             [settle(1500), press('ok', at=2000)] + [sample(2000 + k * 75, k * 75) for k in range(5)] +
             [settle(2500), press('show', at=3000), settle(3500)],
    'list-transition': [start(0), press('insert', at=1000)] + [sample(1000 + k * 125, k * 125) for k in range(5)] +
                       [settle(2000), press('insert', at=3000), settle(4000), press('remove', '3', at=5000)] +
                       [sample(5000 + k * 125, k * 125) for k in range(5)] +
                       [settle(6000), press('shuffle', at=7000), settle(8000), press('reset', at=9000),
                        settle(10000), press('shuffle', at=11000), settle(12000), press('insert', at=13000),
                        settle(14000), press('remove', '1', at=15000), settle(16000)],
    'counter': timed([start(), press('count'), press('count'), press('count')]),
    'temperature-converter': timed([start(), fill('celsius', '100'), commit('celsius'), fill('fahrenheit', '50'),
                                    commit('fahrenheit'), fill('celsius', '-40'), commit('celsius'),
                                    fill('celsius', ''), commit('celsius'), fill('fahrenheit', '0'),
                                    commit('fahrenheit'), fill('celsius', '37.5'), commit('celsius')]),
    'flight-booker': timed([start(), choose('type', 'return flight', 'Return Flight'),
                            fill('return', '2026-11-15'), press('book'), act('dismiss'),
                            fill('departure', '2026-11-16'), choose('type', 'one-way flight', 'One-way Flight'),
                            press('book'), act('dismiss'), choose('type', 'return flight', 'Return Flight'),
                            fill('return', '2026-11-17'), fill('departure', '2026-11-13'),
                            choose('type', 'one-way flight', 'One-way Flight')]),
    'timer': [start(0), frame(2500), frame(7500), frame(15000), frame(16000), slide('duration', 20000, at=16000),
              frame(17000), press('reset', at=17000), frame(18000), slide('duration', 500, at=18000),
              frame(18100), frame(19000), slide('duration', 30000, at=19000), frame(20000)],
    'crud': timed([start(), fill('prefix', 't'), fill('prefix', 'M'), fill('prefix', ''),
                   choose('names', 'Emil, Hans'), fill('first', 'Jane'), fill('last', 'Doe'), press('create'),
                   choose('names', 'Doe, Jane'), fill('first', 'John'), press('update'), press('delete'),
                   press('create'), fill('first', 'Hans'), fill('last', 'Emil'), press('create'),
                   fill('first', '  '), press('create'), choose('names', 'Tisch, Roman'), fill('last', 'Tusch'),
                   press('update'), fill('prefix', 'tu')]),
    'circle-drawer': timed([start(), act('click', 'canvas', x=100, y=120), act('click', 'canvas', x=300, y=200),
                            act('click', 'canvas', x=110, y=130), act('context', 'canvas', x=110, y=130),
                            slide('radius', 100), act('click', 'canvas', x=40, y=380), press('undo'),
                            press('redo'), press('undo'), press('undo'), act('click', 'canvas', x=450, y=120),
                            act('context', 'canvas', x=560, y=330), act('click', 'canvas', x=455, y=125),
                            act('context', 'canvas', x=455, y=125), slide('radius', 20),
                            act('click', 'canvas', x=40, y=380), press('undo'), press('undo'), press('undo'),
                            press('redo')]),
    'cells': timed([start(), press('cell', 'A0'), fill('cell', '2', 'A0'), commit('cell', 'A0'),
                    press('cell', 'B0'), fill('cell', '=A0*3', 'B0'), commit('cell', 'B0'),
                    press('cell', 'A0'), fill('cell', '5', 'A0'), commit('cell', 'A0'),
                    press('cell', 'C0'), fill('cell', '=A0+B0', 'C0'), commit('cell', 'C0'),
                    press('cell', 'D0'), fill('cell', '=C0/0', 'D0'), commit('cell', 'D0'),
                    press('cell', 'E0'), fill('cell', '=(', 'E0'), commit('cell', 'E0'),
                    press('cell', 'A1'), fill('cell', '  hello  ', 'A1'), commit('cell', 'A1'),
                    press('cell', 'B1'), fill('cell', '=A1*2', 'B1'), commit('cell', 'B1'),
                    press('cell', 'C1'), fill('cell', '=A1+1', 'C1'), commit('cell', 'C1'),
                    press('cell', 'D1'), fill('cell', '=A19', 'D1'), commit('cell', 'D1'),
                    press('cell', 'E1'), fill('cell', '=(A0+1)*2-B0/5', 'E1'), commit('cell', 'E1'),
                    press('cell', 'A2'), fill('cell', '=A0%3', 'A2'), commit('cell', 'A2'),
                    press('cell', 'B2'), fill('cell', '=-A0+0.5', 'B2'), commit('cell', 'B2'),
                    press('cell', 'C2'), fill('cell', '=1/3', 'C2'), commit('cell', 'C2'),
                    press('cell', 'D2'), fill('cell', '=A0/4', 'D2'), commit('cell', 'D2'),
                    press('cell', 'E2'), fill('cell', '2.50', 'E2'), commit('cell', 'E2'),
                    press('cell', 'A3'), fill('cell', '=E2*2', 'A3'), commit('cell', 'A3'),
                    press('cell', 'B3'), fill('cell', '=E0', 'B3'), commit('cell', 'B3'),
                    press('cell', 'C3'), fill('cell', '=E0*2', 'C3'), commit('cell', 'C3'),
                    press('cell', 'D3'), fill('cell', '=D3', 'D3'), commit('cell', 'D3'),
                    press('cell', 'A0'), fill('cell', '10', 'A0'), commit('cell', 'A0'),
                    press('cell', 'E3'), fill('cell', '=A0+1', 'E3'), press('cell', 'A4'),
                    fill('cell', '=E3*E3', 'A4'), commit('cell', 'A4'),
                    press('cell', 'B4'), fill('cell', '=F0', 'B4'), commit('cell', 'B4'),
                    press('cell', 'C4'), fill('cell', '=1+', 'C4'), commit('cell', 'C4')]),
}

ORDER = ['hello-world', 'handling-input', 'attribute-bindings', 'conditionals-and-loops', 'form-bindings',
         'simple-component', 'markdown', 'fetching-data', 'grid', 'tree', 'svg', 'modal', 'list-transition',
         'counter', 'temperature-converter', 'flight-booker', 'timer', 'crud', 'circle-drawer', 'cells']

# ---- the page ----

PAGE = r"""<!DOCTYPE html><html><head><meta charset="utf-8"><title>waiting</title>
<script>
// Park-Miller's generator, seeded, in Math.random's place before any
// module reads it (lodash keeps Math.random as it finds it)
(function () {
  let s = 42;
  window.__seed = (v) => { s = v; };
  Math.random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
})();
</script>
<script>
// (a failure is told to the script, which is waiting for the page)
const told = (what) => fetch('/result', { method: 'POST', body: JSON.stringify({ failed: what }) });
window.addEventListener('error', (e) => told(e.message + ' ' + (e.filename || '') + ':' + (e.lineno || '')));
window.addEventListener('unhandledrejection', (e) => told(String(e.reason && e.reason.stack || e.reason)));
</script>
<script type="importmap">{"imports": {"vue": "/lib/vue.js", "marked": "/lib/marked.js", "lodash-es": "/lib/lodash.js"}}</script>
<style>body{margin:0}</style>
</head><body><div id="stage"></div><pre id="out" style="display:none">pending</pre>
<script type="module" src="/driver.js"></script>
<img src="/hold" alt="" style="display:none">
</body></html>"""

DRIVER = r"""
import * as Vue from 'vue';
import { marked } from 'marked';

const SCRIPTS = __SCRIPTS__;
const ORDER = __ORDER__;
const COMMITS = __COMMITS__;
const MARKDOWN = __MARKDOWN__;

const realTimeout = window.setTimeout.bind(window);
const realClearTimeout = window.clearTimeout.bind(window);
const realFrame = window.requestAnimationFrame.bind(window);
const realCancelFrame = window.cancelAnimationFrame.bind(window);
const realNow = performance.now.bind(performance);
const RealDate = window.Date;

const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
const wait = (ms) => new Promise((r) => realTimeout(r, ms));
const frameReal = () => new Promise((r) => realFrame(() => r()));
async function flush() { for (let i = 0; i < 6; i++) { await Vue.nextTick(); await Promise.resolve(); } }
const fmt = (x) => String(x);

// ---- a fake clock: Date.now, performance.now, timers and frames ----
const clock = { on: false, now: 0, timers: [], frames: [], ids: 1 };
function installClock() {
  clock.on = true; clock.now = 0; clock.timers = []; clock.frames = [];
  const base = new RealDate(2026, 10, 14, 12, 0, 0).getTime();
  window.Date = class extends RealDate {
    constructor(...a) { if (a.length === 0) super(base + clock.now); else super(...a); }
    static now() { return base + clock.now; }
  };
  performance.now = () => clock.now;
  window.setTimeout = (fn, ms) => { const id = clock.ids++; clock.timers.push({ id, at: clock.now + (ms || 0), fn }); return id; };
  window.clearTimeout = (id) => { clock.timers = clock.timers.filter((t) => t.id !== id); };
  window.requestAnimationFrame = (fn) => { const id = clock.ids++; clock.frames.push({ id, fn }); return id; };
  window.cancelAnimationFrame = (id) => { clock.frames = clock.frames.filter((f) => f.id !== id); };
}
function removeClock() {
  clock.on = false;
  window.Date = RealDate; performance.now = realNow;
  window.setTimeout = realTimeout; window.clearTimeout = realClearTimeout;
  window.requestAnimationFrame = realFrame; window.cancelAnimationFrame = realCancelFrame;
}
async function advance(to) {
  for (;;) {
    clock.timers.sort((a, b) => a.at - b.at || a.id - b.id);
    const next = clock.timers[0];
    if (!next || next.at > to) break;
    clock.timers.shift();
    clock.now = Math.max(clock.now, next.at);
    next.fn();
    await flush();
  }
  clock.now = Math.max(clock.now, to);
}
async function runFrames() {
  const due = clock.frames; clock.frames = [];
  for (const f of due) f.fn(clock.now);
  await flush();
}

// ---- what the page gives the examples ----
let shownAlert = '';
window.alert = (m) => { shownAlert = String(m); };
let lastPrevented = null;
window.addEventListener('click', (e) => {
  if (e.target.closest && e.target.closest('a')) { lastPrevented = e.defaultPrevented; e.preventDefault(); }
});
const realFetch = window.fetch.bind(window);
const fetched = [];
window.fetch = (url) => new Promise((resolve) => {
  fetched.push({ url: String(url), resolve });
});
function answer(k) {
  const f = fetched[k];
  const branch = new URL(f.url).searchParams.get('sha');
  const body = JSON.stringify(COMMITS[branch]);
  f.resolve({ ok: true, status: 200, json: async () => JSON.parse(body), text: async () => body });
}

// ---- reading a transition where it stands ----
async function transitions() {
  for (let i = 0; i < 20; i++) {
    const running = document.getAnimations();
    if (running.length) return running;
    await frameReal();
  }
  return [];
}
async function sampleAt(ms) {
  // (the first sample of a transition lets it start: Vue's enter and
  // leave begin a frame or two after the change, its moves at once)
  if (ms === 0) { await transitions(); for (let i = 0; i < 6; i++) await frameReal(); }
  for (const a of document.getAnimations()) { a.pause(); a.currentTime = ms; }
}
async function settleAll() {
  // (every transition run to its end, and time enough after for Vue to
  // take a leaving element out: it ends a transition by its event, or by
  // its own timer a millisecond past the transition's duration)
  for (const a of document.getAnimations()) a.finish();
  await flush();
  await wait(650);
  await flush();
}
function matrixOf(el) {
  const t = getComputedStyle(el).transform;
  if (!t || t === 'none') return [1, 0, 0, 1, 0, 0];
  return t.slice(t.indexOf('(') + 1, -1).split(',').map(Number);
}
const opacityOf = (el) => Number(getComputedStyle(el).opacity);
const round6 = (x) => Math.round(x * 1e6) / 1e6;

// ---- markdown as a structure ----
const BLOCKS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'PRE', 'BLOCKQUOTE', 'HR', 'TABLE', 'DIV']);
function escaped(t) { return t.replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}').replace(/\n/g, '\\n'); }
function structure(node, inPre) {
  let out = '';
  const kids = Array.from(node.childNodes);
  kids.forEach((k, i) => {
    if (k.nodeType === 3) {
      let t = k.textContent;
      if (!inPre) {
        const prev = kids[i - 1], next = kids[i + 1];
        const blocky = (n) => !n || (n.nodeType === 1 && BLOCKS.has(n.tagName));
        if (/^\s*$/.test(t) && (blocky(prev) || blocky(next))) return;
        t = t.replace(/\s+/g, ' ');
        if (blocky(prev)) t = t.replace(/^ /, '');
        if (blocky(next)) t = t.replace(/ $/, '');
      }
      out += escaped(t);
    } else if (k.nodeType === 1) {
      const tag = k.tagName.toLowerCase();
      const attrs = [];
      if (tag === 'a') { attrs.push('href=' + k.getAttribute('href')); if (k.hasAttribute('title')) attrs.push('title=' + k.getAttribute('title')); }
      if (tag === 'ol' && k.hasAttribute('start')) attrs.push('start=' + k.getAttribute('start'));
      if (tag === 'code' && k.hasAttribute('class')) attrs.push('class=' + k.getAttribute('class'));
      if (tag === 'img') { attrs.push('src=' + k.getAttribute('src')); attrs.push('alt=' + k.getAttribute('alt')); }
      out += tag + (attrs.length ? '[' + attrs.join(',') + ']' : '') + '{' + structure(k, inPre || tag === 'pre') + '}';
    }
  });
  return out;
}
function markdownOf(source) {
  const d = document.createElement('div');
  d.innerHTML = marked(source);
  return structure(d, false);
}

// ---- the examples: their controls by name, and what each shows ----
const $ = (root, q) => root.querySelector(q);
const $$ = (root, q) => Array.from(root.querySelectorAll(q));
const yes = (b) => (b ? 'true' : 'false');

const EXAMPLES = {
  'hello-world': {
    seen: (r) => ({ heading: norm($(r, 'h1').textContent) }) },
  'handling-input': {
    target: (r, on) => ({ reverse: $$(r, 'button')[0], append: $$(r, 'button')[1], link: $(r, 'a') })[on],
    seen: (r) => ({ heading: norm($(r, 'h1').textContent), alert: shownAlert,
                    prevented: lastPrevented === null ? '' : yes(lastPrevented) }) },
  'attribute-bindings': {
    target: (r, on) => ({ red: $$(r, 'p')[1], color: $$(r, 'p')[2] })[on],
    seen: (r) => ({ title: $(r, 'span').getAttribute('title'), red: yes($$(r, 'p')[1].classList.contains('red')),
                    color: $$(r, 'p')[2].style.color }) },
  'conditionals-and-loops': {
    target: (r, on) => ({ toggle: $$(r, 'button')[0], push: $$(r, 'button')[1], pop: $$(r, 'button')[2],
                          reverse: $$(r, 'button')[3] })[on],
    seen: (r) => ({ items: $$(r, 'li').map((li) => norm(li.textContent)).join('\n'),
                    message: $(r, 'p') ? norm($(r, 'p').textContent) : '' }) },
  'form-bindings': {
    target: (r, on, value) => {
      if (on === 'text') return $(r, 'input:not([type])');
      if (on === 'checked') return $(r, '#checkbox');
      if (on === 'names') return $(r, '#' + value.toLowerCase());
      if (on === 'picked') return $(r, '#' + value.toLowerCase());
      if (on === 'selected') return $$(r, 'select')[0];
      if (on === 'multi') return $$(r, 'select')[1];
    },
    seen: (r) => {
      const ps = $$(r, 'p');
      return { text: $(r, 'input:not([type])').value, text_echo: norm(ps[0].textContent),
               checked: yes($(r, '#checkbox').checked), checked_echo: norm($(r, 'label[for=checkbox]').textContent),
               names_echo: norm(ps[1].textContent), picked_echo: norm(ps[2].textContent),
               selected_echo: norm(ps[3].textContent), multi_echo: norm(ps[4].textContent) };
    } },
  'simple-component': {
    seen: (r) => ({ items: $$(r, 'li').map((li) => norm(li.textContent)).join('\n') }) },
  'markdown': {
    clock: true,
    target: (r, on) => $(r, 'textarea'),
    seen: (r) => ({ source: $(r, 'textarea').value, preview: structure($(r, '.output'), false) }) },
  'fetching-data': {
    target: (r, on, value) => $(r, '#' + value),
    seen: (r) => ({ branch: norm($(r, 'p').textContent), picked: ($(r, 'input:checked') || {}).value || '',
                    rows: $$(r, 'li').map((li) => norm(li.textContent)).join('\n'),
                    links: $$(r, 'li').map((li) => $$(li, 'a').map((a) => a.getAttribute('href')).join(' ')).join('\n'),
                    requests: fetched.map((f) => f.url).join('\n') }) },
  'grid': {
    target: (r, on, value) => {
      if (on === 'query') return $(r, 'input');
      return $$(r, 'th').find((th) => norm(th.textContent).toLowerCase() === value);
    },
    seen: (r) => ({ rows: $$(r, 'tbody tr').map((tr) => $$(tr, 'td').map((td) => norm(td.textContent)).join(' | ')).join('\n'),
                    headers: $$(r, 'th').map((th) => [norm(th.textContent), $(th, '.arrow').classList.contains('asc') ? 'asc' : 'dsc',
                                                      th.classList.contains('active') ? 'active' : ''].join(' ').trim()).join('\n'),
                    empty: $(r, 'p') ? norm($(r, 'p').textContent) : '' }) },
  'tree': {
    target: (r, on, value) => {
      let li = $(r, 'ul > li');
      for (const i of value.split('.').slice(1).map(Number)) li = $$(li, ':scope > ul > li:not(.add)')[i];
      return on === 'row' ? li.firstElementChild : $(li, ':scope > ul > li.add');
    },
    seen: (r) => {
      const lines = [];
      const walk = (li, depth) => {
        const row = li.firstElementChild;
        if (!row.checkVisibility()) return;
        lines.push(depth + ' ' + norm(row.textContent) + (row.classList.contains('bold') ? ' bold' : ''));
        for (const k of $$(li, ':scope > ul > li')) {
          if (k.classList.contains('add')) { if (k.checkVisibility()) lines.push((depth + 1) + ' +'); }
          else walk(k, depth + 1);
        }
      };
      walk($(r, 'ul > li'), 0);
      return { lines: lines.join('\n') };
    } },
  'svg': {
    target: (r, on, value) => {
      const row = $$(r, 'div').find((d) => $(d, 'label') && norm($(d, 'label').textContent) === value);
      if (on === 'value') return $(row, 'input');
      if (on === 'remove') return $(row, 'button');
      if (on === 'label') return $(r, 'input[name=newlabel]');
      if (on === 'add') return $(r, '#add button');
    },
    seen: (r) => ({ points: $(r, 'polygon').getAttribute('points'),
                    labels: $$(r, 'text').map((t) => norm(t.textContent) + ' ' + t.getAttribute('x') + ' ' + t.getAttribute('y')).join('\n'),
                    values: $$(r, 'div').filter((d) => $(d, 'label')).map((d) => norm($(d, 'label').textContent) + '=' + $(d, 'span').textContent).join(' '),
                    label: $(r, 'input[name=newlabel]').value, raw: norm($(r, '#raw').textContent), alert: shownAlert }) },
  'modal': {
    target: (r, on) => on === 'show' ? $(r, '#show-modal') : document.querySelector('.modal-default-button'),
    seen: (r) => {
      const mask = document.querySelector('.modal-mask');
      if (!mask) return { shown: 'false', header: '', body: '', footer: '', opacity: '', scale: '' };
      const box = $(mask, '.modal-container');
      return { shown: 'true', header: norm($(box, '.modal-header').textContent), body: norm($(box, '.modal-body').textContent),
               footer: norm($(box, '.modal-footer').textContent), opacity: fmt(round6(opacityOf(mask))),
               scale: fmt(round6(matrixOf(box)[0])) };
    } },
  'list-transition': {
    seed: 42,
    target: (r, on, value) => {
      if (on === 'remove') return $(($$(r, 'li').find((li) => norm(li.firstChild.textContent) === value)), 'button');
      return ({ insert: $$(r, 'button')[0], reset: $$(r, 'button')[1], shuffle: $$(r, 'button')[2] })[on];
    },
    seen: (r) => {
      const lis = $$(r, 'li');
      const items = lis.filter((li) => !li.classList.contains('fade-leave-active')).map((li) => norm(li.firstChild.textContent));
      const entering = lis.find((li) => li.classList.contains('fade-enter-active'));
      const leaving = lis.find((li) => li.classList.contains('fade-leave-active'));
      const moving = lis.find((li) => li.classList.contains('fade-move'));
      const motion = (li) => { if (!li) return ''; const m = matrixOf(li); return [round6(opacityOf(li)), round6(m[3]), round6(m[4])].join(' '); };
      return { items: items.join(' '), enter: motion(entering), leave: motion(leaving),
               move: moving ? norm(moving.firstChild.textContent) + ' ' + round6(matrixOf(moving)[5]) : '' };
    } },
  'counter': {
    target: (r) => $(r, 'button'),
    seen: (r) => ({ count: norm(Array.from(r.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join('')) }) },
  'temperature-converter': {
    target: (r, on) => $$(r, 'input')[on === 'celsius' ? 0 : 1],
    seen: (r) => ({ celsius: $$(r, 'input')[0].value, fahrenheit: $$(r, 'input')[1].value }) },
  'flight-booker': {
    today: true,
    target: (r, on) => ({ type: $(r, 'select'), departure: $$(r, 'input')[0], return: $$(r, 'input')[1], book: $(r, 'button') })[on],
    seen: (r) => ({ type: $(r, 'select').value, departure: $$(r, 'input')[0].value, return: $$(r, 'input')[1].value,
                    return_disabled: yes($$(r, 'input')[1].disabled), book_disabled: yes($(r, 'button').disabled),
                    message: norm($(r, 'p').textContent), alert: shownAlert }) },
  'timer': {
    clock: true,
    target: (r, on) => on === 'duration' ? $(r, 'input') : $(r, 'button'),
    seen: (r) => ({ elapsed: norm($$(r, 'div')[0].textContent), progress: fmt($(r, 'progress').value),
                    duration: norm($$(r, 'div')[1].textContent).replace('Duration: ', '') }) },
  'crud': {
    target: (r, on) => ({ prefix: $(r, 'input[placeholder]'), names: $(r, 'select'), first: $$(r, 'label input')[0],
                          last: $$(r, 'label input')[1], create: $$(r, 'button')[0], update: $$(r, 'button')[1],
                          delete: $$(r, 'button')[2] })[on],
    seen: (r) => ({ names: $$(r, 'option').map((o) => norm(o.textContent)).join('\n'), selected: $(r, 'select').value,
                    first: $$(r, 'label input')[0].value, last: $$(r, 'label input')[1].value,
                    prefix: $(r, 'input[placeholder]').value }) },
  'circle-drawer': {
    target: (r, on) => ({ undo: $$(r, '.controls button')[0], redo: $$(r, '.controls button')[1],
                          radius: $(r, '.dialog input') })[on],
    seen: (r) => ({ circles: $$(r, 'circle').map((c) => [c.getAttribute('cx'), c.getAttribute('cy'), c.getAttribute('r'), c.getAttribute('fill')].join(' ')).join('\n'),
                    undo: $$(r, '.controls button')[0].disabled ? 'disabled' : 'enabled',
                    redo: $$(r, '.controls button')[1].disabled ? 'disabled' : 'enabled',
                    dialog: $(r, '.dialog p') ? norm($(r, '.dialog p').textContent) : '',
                    radius: $(r, '.dialog input') ? $(r, '.dialog input').value : '' }) },
  'cells': {
    target: (r, on, value, a) => {
      const col = value.charCodeAt(0) - 65, row = Number(value.slice(1));
      const td = $$($$(r, 'tbody tr')[row], 'td')[col];
      return a.do === 'press' ? $(td, '.cell') : $(td, 'input');
    },
    seen: (r) => {
      const shown = [];
      let editing = '';
      $$(r, 'tbody tr').forEach((tr, row) => $$(tr, 'td').forEach((td, col) => {
        const name = String.fromCharCode(65 + col) + row;
        if ($(td, 'input')) editing = name;
        else { const t = $(td, 'span').textContent; if (t !== '') shown.push(name + '=' + t); }
      }));
      return { cells: shown.join('\n'), editing };
    } },
};

async function perform(def, root, a) {
  const el = () => def.target(root, a.on, a.of === undefined ? (a.value === undefined ? undefined : String(a.value)) : String(a.of), a);
  if (a.do === 'start' || a.do === 'frame') return;
  if (a.do === 'press' || a.do === 'check') { el().click(); return; }
  if (a.do === 'fill' || a.do === 'slide') { const e = el(); e.value = String(a.do === 'fill' ? a.text : a.value); e.dispatchEvent(new Event('input', { bubbles: true })); return; }
  if (a.do === 'commit') {
    if (a.on === 'label') { $(root, '#add button').click(); return; }
    el().dispatchEvent(new Event('change', { bubbles: true })); return;
  }
  if (a.do === 'choose') {
    const e = el();
    if (e.tagName === 'SELECT') { e.value = a.value; e.dispatchEvent(new Event('change', { bubbles: true })); }
    else e.click();
    return;
  }
  if (a.do === 'pick') {
    const e = el();
    for (const o of e.options) o.selected = a.add ? (o.value === a.value ? !o.selected : o.selected) : o.value === a.value;
    e.dispatchEvent(new Event('change', { bubbles: true })); return;
  }
  if (a.do === 'double') {
    const e = el();
    e.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    e.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 2 }));
    e.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, detail: 2 }));
    return;
  }
  if (a.do === 'click' || a.do === 'context') {
    const e = document.elementFromPoint(a.x, a.y);
    e.dispatchEvent(new MouseEvent(a.do === 'click' ? 'click' : 'contextmenu',
      { bubbles: true, cancelable: true, clientX: a.x, clientY: a.y, button: a.do === 'click' ? 0 : 2 }));
    return;
  }
  if (a.do === 'dismiss') { shownAlert = ''; return; }
  if (a.do === 'answer') { answer(a.request); return; }
  if (a.do === 'sample') { await sampleAt(a.after); return; }
  if (a.do === 'settle') { await settleAll(); return; }
  throw new Error('no such action: ' + a.do);
}

async function source(path) { return (await realFetch(path)).text(); }

async function run(slug) {
  const def = EXAMPLES[slug];
  const actions = SCRIPTS[slug];
  const stage = document.getElementById('stage');
  const root = document.createElement('div');
  stage.appendChild(root);
  const style = document.createElement('style');
  style.textContent = await source('/style/' + slug);
  document.head.appendChild(style);
  shownAlert = ''; lastPrevented = null; fetched.length = 0;
  if (def.seed) window.__seed(def.seed);
  if (def.clock || def.today) installClock();
  const App = (await import('/comp/' + slug + '/App.js')).default;
  const app = Vue.createApp(App);
  app.mount(root);
  await flush();
  const steps = [];
  for (const a of actions) {
    if (def.clock && a.do !== 'start') { await advance(a.at); if (a.do === 'frame') await runFrames(); }
    await perform(def, root, a);
    await flush();
    steps.push(Object.assign({}, a, { seen: def.seen(root) }));
  }
  if (slug === 'list-transition' || slug === 'modal') await settleAll();
  app.unmount();
  root.remove();
  style.remove();
  if (def.clock || def.today) removeClock();
  return steps;
}

(async () => {
  const out = { examples: {}, markdown: [] };
  try {
    for (const slug of ORDER) { document.getElementById('out').textContent = 'running ' + slug; out.examples[slug] = await run(slug); }
    out.markdown = MARKDOWN.map((m) => ({ source: m, structure: markdownOf(m) }));
  } catch (e) {
    out.failed = String(e && e.stack || e);
  }
  document.getElementById('out').textContent = 'done';
  await realFetch('/result', { method: 'POST', body: JSON.stringify(out) });
})();
"""

# ---- serving the libraries and the examples ----


class Site:
    def __init__(self, ref, docs):
        self.mods = os.path.join(ref, 'node_modules')
        self.docs = docs

    def comp(self, slug, name):
        """A component as a module: its composition.js, its template set."""
        folder = os.path.join(self.docs, slug, name)
        with open(os.path.join(folder, 'template.html')) as f:
            template = f.read()
        return ("import def from '/src/%s/%s/composition.js';\ndef.template = %s;\nexport default def;\n"
                % (slug, name, json.dumps(template)))

    def src(self, slug, name):
        with open(os.path.join(self.docs, slug, name, 'composition.js')) as f:
            text = f.read()
        text = re.sub(r"from '\./(\w+)\.vue'", lambda m: "from '/comp/%s/%s.js'" % (slug, m.group(1)), text)
        text = re.sub(r"from '\./(\w+)\.js'", lambda m: "from '/shared/%s/%s.js'" % (slug, m.group(1)), text)
        return text

    def shared(self, slug, name):
        with open(os.path.join(self.docs, slug, name + '.js')) as f:
            return f.read()

    def style(self, slug):
        out = []
        for name in sorted(os.listdir(os.path.join(self.docs, slug))):
            css = os.path.join(self.docs, slug, name, 'style.css')
            if os.path.exists(css):
                with open(css) as f:
                    out.append(f.read())
        return '\n'.join(out)

    def answer(self, path):
        """The body and type of a path, or None."""
        js = 'text/javascript'
        if path == '/':
            return PAGE, 'text/html'
        if path == '/driver.js':
            text = (DRIVER.replace('__SCRIPTS__', json.dumps(SCRIPTS)).replace('__ORDER__', json.dumps(ORDER))
                    .replace('__COMMITS__', json.dumps(COMMITS)).replace('__MARKDOWN__', json.dumps(MARKDOWN)))
            return text, js
        if path == '/lib/vue.js':
            return open(os.path.join(self.mods, 'vue/dist/vue.esm-browser.prod.js')).read(), js
        if path == '/lib/marked.js':
            return open(os.path.join(self.mods, 'marked/lib/marked.esm.js')).read(), js
        if path == '/lib/lodash.js':
            return ("export { default as debounce } from '/lodash-es/debounce.js';\n"
                    "export { default as shuffle } from '/lodash-es/shuffle.js';\n"), js
        m = re.match(r'^/lodash-es/([\w.]+\.js)$', path)
        if m:
            return open(os.path.join(self.mods, 'lodash-es', m.group(1))).read(), js
        m = re.match(r'^/comp/([\w-]+)/(\w+)\.js$', path)
        if m:
            return self.comp(m.group(1), m.group(2)), js
        m = re.match(r'^/src/([\w-]+)/(\w+)/composition\.js$', path)
        if m:
            return self.src(m.group(1), m.group(2)), js
        m = re.match(r'^/shared/([\w-]+)/(\w+)\.js$', path)
        if m:
            return self.shared(m.group(1), m.group(2)), js
        m = re.match(r'^/style/([\w-]+)$', path)
        if m:
            return self.style(m.group(1)), 'text/css'
        return None


def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def main():
    if len(sys.argv) != 3:
        print(__doc__)
        return 1
    site = Site(os.path.expanduser(sys.argv[1]), os.path.expanduser(sys.argv[2]))

    result = {}
    posted = threading.Event()

    class Handler(http.server.BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def do_POST(self):
            body = self.rfile.read(int(self.headers.get('Content-Length', '0'))).decode('utf-8')
            if not posted.is_set():
                result['text'] = body
                posted.set()
            self.send_response(204)
            self.end_headers()

        def do_GET(self):
            if self.path == '/hold':
                # (the page's load waits on this picture until its result is in,
                # so Chrome reads the page only once the driver has finished)
                posted.wait(600)
                self.send_response(204)
                self.end_headers()
                return
            got = site.answer(self.path.split('?')[0])
            if got is None:
                self.send_response(404)
                self.end_headers()
                return
            body, kind = got
            data = body.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', kind + '; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)

    port = free_port()
    server = http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler)
    server.daemon_threads = True
    threading.Thread(target=server.serve_forever, daemon=True).start()
    folder = tempfile.mkdtemp(prefix='lory-vue-reference-')
    try:
        subprocess.run([CHROME, '--headless=new', '--window-size=900,700', '--user-data-dir=' + folder,
                        '--dump-dom', 'http://127.0.0.1:%d/' % port],
                       capture_output=True, text=True, timeout=600)
    finally:
        server.shutdown()
        shutil.rmtree(folder, ignore_errors=True)
    if 'text' not in result:
        print('the page said nothing of what it found')
        return 1
    got = json.loads(result['text'])
    if 'failed' in got:
        print('the page stopped:', got['failed'])
        return 1
    reference = {'versions': VERSIONS, 'today': '2026-11-14', 'seed': 42,
                 'commits': {b: json.dumps(cs) for b, cs in COMMITS.items()},
                 'order': ORDER, 'examples': got['examples'], 'markdown': got['markdown']}
    with open(os.path.join(HERE, 'reference.json'), 'w') as f:
        json.dump(reference, f, indent=1, sort_keys=True)
        f.write('\n')
    steps = sum(len(s) for s in got['examples'].values())
    seen = sum(len(st['seen']) for s in got['examples'].values() for st in s)
    print('wrote %d examples: %d actions, %d things seen; %d Markdown structures'
          % (len(got['examples']), steps, seen, len(got['markdown'])))
    return 0


if __name__ == '__main__':
    sys.exit(main())
