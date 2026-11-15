// Solid's examples, run as Solid runs them, to hold Lory's to.
//
// Each example of solidjs.com/examples (the solid-site repository's
// public/examples/*.json, read where they were fetched: nothing of them is
// kept in Lory) is compiled as the Solid playground compiles it (Babel with
// babel-preset-solid, TypeScript stripped; styled-jsx's plugin for the one
// that styles with it), bundled with Solid by esbuild, and run in headless
// Chrome under a fake clock: setTimeout, setInterval, requestAnimationFrame,
// Date and performance.now answer to it, frames come every 16 ms of it, and
// every CSS transition and animation (and Web Animation) is paused where it
// starts and moved by the same clock, so what a step shows at a time is the
// same at every run. Random numbers come from one seeded source
// (Park-Miller: x = x * 48271 mod 2^31 - 1, x / (2^31 - 1)), as Lory's
// examples draw theirs; fetch answers canned records after 300 ms.
//
// Each example is driven by a fixed script of steps, and what it shows after
// each step is written to reference.json beside this script, with the steps:
// tests/solid/parity.co replays the same steps on Lory's examples and holds
// them to it.
//
//     npm install --prefix <scratch>/ref solid-js@1.9.17 babel-preset-solid@1.9.16 \
//       solid-transition-group@0.3.0 @solid-primitives/transition-group@1.1.2 \
//       @babel/core@7.29.7 @babel/preset-typescript@7.29.7 esbuild@0.28.2 \
//       solid-styled-jsx@0.27.1 styled-jsx@3.4.7
//     (the examples: github.com/solidjs/solid-site at
//      e7b40ef162004710122906366a0ddb3fa2c2da10, public/examples/*.json,
//      fetched into <scratch>/site)
//     node tests/solid/reference.mjs <scratch>/site <scratch>/ref
//
// Chrome is this Mac's (LORY_CHROME names another); its version is written
// into the JSON. Nothing is installed by this script.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFileSync, spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const SITE = path.resolve(process.argv[2] || '');
const REF = path.resolve(process.argv[3] || '');
const CHROME = process.env.LORY_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const COMMIT = 'e7b40ef162004710122906366a0ddb3fa2c2da10';
const require = createRequire(path.join(REF, 'node_modules', 'x.js'));
const babel = require('@babel/core');
const esbuild = require('esbuild');

// ---- the steps each example is driven by, and what is read after each ----
//
// A step: press a control; wait (ms, a multiple of 16: a frame each 16 ms)
// or jump (one frame at its end); type text at the end of a field; set a field (all
// of it replaced); clear one; blur or focus one; key Enter in the focused
// one; hover a cell; wait (ms, a multiple of 16); reload (the app mounted
// afresh over what it stored); go to an address (#hash); pick a colour; put
// the page under a `dark` ancestor or take it out. Names are the controls'
// as Lory's examples name them (tests/solid/parity.co prefixes each with its
// example's name).

const W = (ms) => ({ do: 'wait', ms });
const J = (ms) => ({ do: 'jump', ms });

const PLANS = {
  counter: { steps: [W(0), W(992), W(16), W(992), W(1008)] },
  todos: {
    steps: [W(0), { do: 'type', into: 'new', text: 'a' }, { do: 'press', on: 'add' },
      { do: 'type', into: 'new', text: 'b' }, { do: 'press', on: 'add' },
      { do: 'press', on: 'row0.done' }, { do: 'set', into: 'row1.title', text: 'bc' },
      { do: 'blur', into: 'row1.title' }, { do: 'press', on: 'row0.done' }, { do: 'press', on: 'row0.done' },
      { do: 'press', on: 'row0.remove' }, { do: 'reload' }, { do: 'type', into: 'new', text: 'd' },
      { do: 'press', on: 'add' }, { do: 'reload' }, { do: 'press', on: 'row0.remove' },
      { do: 'press', on: 'row0.remove' }, { do: 'reload' }],
    // where the three ways of writing it part: "+" with nothing typed, and
    // Enter in the field
    edges: [W(0), { do: 'press', on: 'add' }, { do: 'type', into: 'new', text: 'c' }, { do: 'key', key: 'Enter' },
      { do: 'press', on: 'add' }],
  },
  forms: {
    steps: [W(0), { do: 'type', into: 'email', text: 'mary@gmail.com' }, { do: 'focus', into: 'password' },
      W(192), W(16), { do: 'type', into: 'email', text: 'x' }, { do: 'set', into: 'email', text: 'abc' },
      { do: 'blur', into: 'email' }, { do: 'set', into: 'email', text: '@b.org' }, { do: 'blur', into: 'email' },
      { do: 'set', into: 'email', text: 'abc@' }, { do: 'blur', into: 'email' },
      { do: 'clear', into: 'email' }, { do: 'blur', into: 'email' },
      { do: 'type', into: 'password', text: 'abc' }, { do: 'blur', into: 'password' },
      { do: 'type', into: 'password', text: 'defgh' }, { do: 'blur', into: 'password' },
      { do: 'type', into: 'confirmpassword', text: 'abcdefgX' }, { do: 'blur', into: 'confirmpassword' },
      { do: 'press', on: 'submit' }, W(16),
      { do: 'set', into: 'email', text: 'new@person.org' }, { do: 'set', into: 'confirmpassword', text: 'abcdefgh' },
      { do: 'press', on: 'submit' }, W(96), W(112), W(96), W(16),
      { do: 'set', into: 'email', text: 'djacobs@move.org' }, { do: 'press', on: 'submit' }, W(208), W(16),
      // (a password of one character: the browser's words for one)
      { do: 'set', into: 'password', text: 'a' }, { do: 'blur', into: 'password' }],
  },
  cssanimations: {
    seed: 4242,
    steps: [W(0), { do: 'press', on: 'toggle' }, W(16), W(16), W(16), W(96), W(144), W(160), W(112), W(112),
      W(96), W(64), W(96), W(16), { do: 'press', on: 'toggle' }, W(16), W(16), W(16), W(144), W(144), W(192),
      W(208), W(160), { do: 'press', on: 'toggle' }, W(160), { do: 'press', on: 'toggle' }, W(160), W(320), W(560),
      { do: 'press', on: 'next' }, W(16), W(16), W(16), W(240), W(240), W(16), W(16), W(16), W(240), W(240), W(32),
      { do: 'press', on: 'next' }, W(560), W(576), { do: 'press', on: 'next' }, W(1152),
      { do: 'press', on: 'add' }, W(16), W(16), W(16), W(240), W(240), W(32),
      { do: 'press', on: 'add' }, W(576), { do: 'press', on: 'remove' }, W(16), W(16), W(16), W(240), W(240), W(32),
      { do: 'press', on: 'shuffle' }, W(16), W(16), W(240), W(240), W(32),
      { do: 'press', on: 'shuffle' }, W(576), { do: 'press', on: 'remove' }, W(576)],
  },
  context: {
    steps: [W(0), { do: 'pick', on: 'color', value: '#ff0000' }, { do: 'pick', on: 'color', value: '#00aa77' }],
  },
  clock: {
    // (a jump moves the clock with one frame at its end: the clock reads the
    // time at each frame, so frames between show nothing a step reads)
    steps: [W(0), W(16), W(240), W(752), W(1008), J(14992), J(3552992), W(16), J(28799484), W(16), J(484), W(16)],
  },
  ethasketch: {
    seed: 777,
    steps: [W(0), { do: 'hover', on: 'grid', index: 0 }, W(480), { do: 'hover', on: 'grid', index: 1 }, W(32),
      { do: 'hover', on: 'grid', index: 99 }, W(448), W(32), { do: 'hover', on: 'grid', index: 2 },
      { do: 'hover', on: 'grid', index: 3 }, W(112), { do: 'hover', on: 'grid', index: 2 }, W(400),
      { do: 'set', into: 'side', text: '5' }, W(96), { do: 'hover', on: 'grid', index: 4 },
      { do: 'hover', on: 'grid', index: 24 }, W(512), { do: 'set', into: 'side', text: '3' },
      { do: 'set', into: 'side', text: '0' }, { do: 'set', into: 'side', text: '150' },
      { do: 'clear', into: 'side' }, { do: 'set', into: 'side', text: '-4' }, { do: 'set', into: 'side', text: '4' },
      { do: 'dark', on: true }, { do: 'hover', on: 'grid', index: 5 }, { do: 'dark', on: false }, W(512)],
  },
  scoreboard: {
    steps: [W(0), W(16), { do: 'set', into: 'Jenny.score', text: '9' }, W(16), W(64), W(64), W(64), W(64), W(16),
      { do: 'set', into: 'David.score', text: '0' }, W(16), W(128), W(128), W(16),
      { do: 'type', into: 'name', text: 'Zed' }, { do: 'set', into: 'score', text: '5' }, { do: 'press', on: 'add' },
      W(16), W(128), W(128), { do: 'press', on: 'Mark.remove' }, W(16), W(128), W(128),
      { do: 'press', on: 'add' }, { do: 'type', into: 'name', text: 'Amy' }, { do: 'press', on: 'add' },
      W(16), W(256)],
  },
  asyncresource: {
    steps: [W(0), { do: 'type', into: 'id', text: '1' }, W(112), { do: 'type', into: 'id', text: '2' },
      W(176), W(16), W(112), W(16), { do: 'clear', into: 'id' }, W(304), { do: 'type', into: 'id', text: '2' },
      W(288), W(16), { do: 'set', into: 'id', text: '99' }, W(304), { do: 'set', into: 'id', text: '1' }, W(304)],
  },
  suspensetabs: {
    seed: 2024,
    steps: [W(0), W(160), W(208), W(224), { do: 'press', on: 'Dos' }, W(96), W(16), W(64), W(80), W(96),
      W(96), W(64), W(48), W(16), W(240), W(256), { do: 'press', on: 'Tres' }, W(112), W(112), W(112),
      W(112), W(112), W(112), { do: 'press', on: 'Tres' }, W(304), { do: 'press', on: 'Uno' }, W(48),
      { do: 'press', on: 'Dos' }, W(608), W(512)],
  },
  routing: {
    steps: [W(0), { do: 'press', on: 'profile' }, { do: 'press', on: 'settings' }, { do: 'go', to: '#nowhere' },
      { do: 'go', to: '' }, { do: 'go', to: '#home' }, { do: 'press', on: 'profile' }, { do: 'press', on: 'home' }],
  },
  counterstore: {
    steps: [W(0), { do: 'press', on: 'more' }, { do: 'press', on: 'less' }, { do: 'press', on: 'less' },
      { do: 'press', on: 'less' }, { do: 'press', on: 'more' }],
  },
  styledjsx: {
    steps: [W(0), { do: 'press', on: 'button0' }, { do: 'press', on: 'button1' }, { do: 'press', on: 'button0' },
      { do: 'press', on: 'button0' }],
  },
};

// canned answers for Async Resource, as swapi.dev's people would answer
// (a few of their fields), and its answer for a person it does not have
const CANNED = {
  '1': { name: 'Luke Skywalker', height: '172', mass: '77', hair_color: 'blond', films: ['A New Hope', 'The Empire Strikes Back'] },
  '2': { name: 'C-3PO', height: '167', mass: '75', hair_color: 'n/a', films: ['A New Hope'] },
  '12': { name: 'Wilhuff Tarkin', height: '180', mass: 'unknown', hair_color: 'auburn, grey', films: [] },
  '': { count: 82, next: 'https://swapi.dev/api/people/?page=2', previous: null },
};
const MISSING = { detail: 'Not found' };

// ---- the page's own clock, random numbers and fetch ----

const FAKES = String.raw`
(() => {
  const R = { setTimeout: window.setTimeout.bind(window), raf: window.requestAnimationFrame.bind(window), Date: window.Date };
  window.__real = R;
  const clock = { now: 0, seq: 0, id: 1, timers: new Map(), rafs: [] };
  window.__clock = clock;
  const epoch = new R.Date(2026, 10, 14, 15, 0, 30, 0).getTime();
  window.setTimeout = (fn, ms, ...args) => { const id = clock.id++; clock.timers.set(id, { due: clock.now + Math.max(0, Number(ms) || 0), fn, args, every: 0, seq: clock.seq++ }); return id; };
  window.setInterval = (fn, ms, ...args) => { const id = clock.id++; const every = Math.max(1, Number(ms) || 0); clock.timers.set(id, { due: clock.now + every, fn, args, every, seq: clock.seq++ }); return id; };
  window.clearTimeout = window.clearInterval = (id) => { clock.timers.delete(id); };
  window.requestAnimationFrame = (fn) => { const id = clock.id++; clock.rafs.push({ id, fn }); return id; };
  window.cancelAnimationFrame = (id) => { clock.rafs = clock.rafs.filter((r) => r.id !== id); };
  class FakeDate extends R.Date {
    constructor(...a) { if (a.length === 0) super(epoch + clock.now); else super(...a); }
    static now() { return epoch + clock.now; }
  }
  window.Date = FakeDate;
  performance.now = () => clock.now;
  let x = window.__SEED || 1;
  Math.random = () => { x = (x * 48271) % 2147483647; return x / 2147483647; };
  window.__asked = [];
  window.__logged = [];
  const log = console.log.bind(console);
  console.log = (...a) => { window.__logged.push(a.map(String).join(' ')); log(...a); };
  window.fetch = (url) => {
    window.__asked.push(String(url));
    const m = /people\/([^/]*)\/$/.exec(String(url));
    const key = m ? m[1] : '?';
    const body = Object.prototype.hasOwnProperty.call(window.__CANNED, key) ? window.__CANNED[key] : window.__MISSING;
    return new Promise((resolve) => window.setTimeout(() => resolve({ ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(body)) }), 300));
  };
})();
`;

// ---- the driver: steps, the clock moved, what is shown read ----

const DRIVER = String.raw`
const clock = window.__clock, R = window.__real;
const tick = () => new Promise((r) => { const ch = new MessageChannel(); ch.port1.onmessage = r; ch.port2.postMessage(0); });
const settle = async () => { for (let i = 0; i < 3; i++) await tick(); };
const realFrame = () => new Promise((r) => { let done = false; R.raf(() => { done = true; r(); }); R.setTimeout(() => { if (!done) r(); }, 40); });
const known = new WeakMap();
// every animation paused where it began and put at the clock's time;
// what has ended finished (its events then dispatched by a real frame)
async function sync() {
  for (let round = 0; round < 6; round++) {
    let ended = false;
    for (const a of document.getAnimations()) {
      if (!known.has(a)) { known.set(a, clock.now); a.pause(); }
      const local = clock.now - known.get(a);
      const end = a.effect.getComputedTiming().endTime;
      if (local >= end) { if (a.playState !== 'finished') { a.finish(); ended = true; } }
      else a.currentTime = local;
    }
    if (!ended) return;
    await settle(); await realFrame(); await settle();
  }
}
async function timersTo(t) {
  for (;;) {
    let next = null;
    for (const [id, tm] of clock.timers) if (tm.due <= t && (!next || tm.due < next[1].due || (tm.due === next[1].due && tm.seq < next[1].seq))) next = [id, tm];
    if (!next) return;
    const [id, tm] = next;
    clock.now = tm.due;
    if (tm.every) { tm.due += tm.every; tm.seq = clock.seq++; } else clock.timers.delete(id);
    tm.fn(...tm.args);
    await settle();
  }
}
async function frame(t) {
  clock.now = t;
  const due = clock.rafs; clock.rafs = [];
  for (const r of due) r.fn(t);
  await settle();
  await sync();
}
async function wait(ms) {
  const end = clock.now + ms;
  while (clock.now < end) {
    const next = Math.min(end, (Math.floor(clock.now / 16) + 1) * 16);
    await timersTo(next);
    await frame(next);
  }
}
// what the page does itself: the clock moved, a page mounted afresh, an
// address, a picked colour, a dark ancestor. Pressing, typing, keys and the
// pointer's moves are the browser's own input (the script's, below).
async function act(step) {
  if (step.do === 'wait') return wait(step.ms);
  if (step.do === 'jump') { const end = clock.now + step.ms; await timersTo(end); await frame(end); return; }
  if (step.do === 'reload') { const fresh = document.createElement('div'); fresh.id = 'app'; document.getElementById('app').replaceWith(fresh); window.__mount(); }
  else if (step.do === 'go') location.hash = step.to;
  else if (step.do === 'pick') { const el = READER.find(step.on); el.value = step.value; el.dispatchEvent(new Event('input', { bubbles: true })); }
  else if (step.do === 'dark') document.body.classList.toggle('dark', step.on);
  else if (step.do === 'focus') READER.find(step.into).focus();
  await after();
}
async function after() { await settle(); await sync(); }
// where a control is on the page (its middle, or a cell's), or null where
// the page no longer shows it
function target(name, index) {
  let el = READER.find(name);
  if (el && index !== undefined) el = el.children[index];
  if (!el) return null;
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, right: r.right };
}
function focus(name) { const el = READER.find(name); if (!el) return false; el.focus(); return true; }
// ---- what is shown ----
const css = (el, prop) => getComputedStyle(el)[prop];
const nums = (s) => (String(s).match(/-?[\d.]+(e-?\d+)?/g) || []).map(Number);
const rgb = (s) => nums(s).slice(0, 3);
const matrix = (el) => { const t = css(el, 'transform'); if (!t || t === 'none') return [1, 0, 0, 1, 0, 0]; return nums(t); };
const hex = (s) => '#' + rgb(s).map((v) => v.toString(16).padStart(2, '0')).join('');
const app = () => document.getElementById('app');
const PAGES = { home: 'Welcome to this Simple Routing Example', profile: 'Your Profile', settings: 'Settings' };
const READERS = {
  counter: { find: () => null, read: () => ({ text: app().textContent }) },
  todos: {
    find: (n) => {
      if (n === 'new') return app().querySelector('input[placeholder]');
      if (n === 'add') return [...app().querySelectorAll('button')].find((b) => b.textContent.trim() === '+');
      const m = /^row(\d+)\.(done|title|remove)$/.exec(n);
      const row = [...app().querySelectorAll('input[type=checkbox]')].map((c) => c.parentElement)[Number(m[1])];
      if (!row) return null;
      return m[2] === 'done' ? row.querySelector('input[type=checkbox]') : m[2] === 'title' ? row.querySelector('input[type=text]') : row.querySelector('button');
    },
    read: () => {
      const rows = [...app().querySelectorAll('input[type=checkbox]')].map((c) => ({ done: c.checked, title: c.parentElement.querySelector('input[type=text]').value }));
      const kept = localStorage.getItem('todo list') ?? localStorage.getItem('todos');
      let saved = null, stored_new = null;
      if (kept !== null) { const j = JSON.parse(kept); saved = (Array.isArray(j) ? j : j.todos).map((t) => ({ done: t.done, title: t.title })); if (!Array.isArray(j)) stored_new = j.newTitle; }
      return { new: app().querySelector('input[placeholder]').value, rows, saved, stored_new };
    },
  },
  forms: {
    find: (n) => n === 'submit' ? app().querySelector('button[type=submit]') : app().querySelector('input[name=' + n + ']'),
    read: () => {
      const errors = {}, glow = {};
      for (const name of ['email', 'password', 'confirmpassword']) {
        const input = app().querySelector('input[name=' + name + ']');
        const said = input.parentElement.querySelector('.error-message');
        errors[name] = said ? said.textContent : '';
        glow[name] = input.classList.contains('error-input');
      }
      const a = document.activeElement;
      return { errors, glow, focus: a && a.name ? a.name : (a && a.tagName === 'BUTTON' ? 'submit' : ''), logged: window.__logged.slice() };
    },
  },
  cssanimations: {
    find: (n) => [...app().querySelectorAll('button')].find((b) => ({ toggle: ['Hide', 'Show'], next: ['Next'], add: ['Add'], remove: ['Remove'], shuffle: ['Shuffle'] })[n].includes(b.textContent.trim())),
    read: () => {
      const blocks = [[], [], []];
      let at = -1;
      for (const el of app().children) {
        if (el.tagName === 'B') at = ['Transition:', 'Animation:', 'Custom JS:'].indexOf(el.textContent.trim());
        else if (el.tagName === 'DIV' && at >= 0) { const m = matrix(el); blocks[at].push({ opacity: Number(css(el, 'opacity')), tx: m[4], scale: m[0] }); }
      }
      const switched = [...app().querySelectorAll('p.container')].map((p) => ({ text: p.textContent, opacity: Number(css(p, 'opacity')) }));
      const list = [...app().querySelectorAll('span.list-item')].map((s) => {
        const m = matrix(s);
        // (how much of a move is left: where it is drawn over where its
        // move began, 1 at its start and 0 at its end; whatever the
        // distance, which is the page's own layout of the numbers)
        let left = null;
        if (s.classList.contains('list-item-move')) {
          const a = s.getAnimations().find((x) => x.transitionProperty === 'transform');
          if (a) { const from = new DOMMatrix(a.effect.getKeyframes()[0].transform); left = from.m41 ? m[4] / from.m41 : from.m42 ? m[5] / from.m42 : 0; }
        }
        return { n: Number(s.textContent), opacity: Number(css(s, 'opacity')), ty: m[5], out: css(s, 'position') === 'absolute', left };
      });
      const label = app().querySelector('button').textContent.trim();
      return { label, blocks, switch: switched, list };
    },
  },
  context: {
    find: () => app().querySelector('input[type=color]'),
    read: () => { const h = app().querySelector('h1'); return { title: h.textContent, color: hex(css(h, 'color')), picker: app().querySelector('input[type=color]').value }; },
  },
  clock: {
    find: () => null,
    read: () => {
      const lines = [...app().querySelectorAll('line')];
      const hands = {};
      for (const l of lines) if (!l.hasAttribute('y1')) hands[l.getAttribute('class')] = l.getAttribute('transform');
      const handsOf = lines.filter((l) => !l.hasAttribute('y1')).map((l) => ({ class: l.getAttribute('class'), length: -Number(l.getAttribute('y2')), width: Number(l.getAttribute('stroke-width')), color: hex(css(l, 'color')) }));
      const ticks = lines.filter((l) => l.hasAttribute('y1'));
      const tickOf = (cls) => { const t = ticks.filter((l) => l.getAttribute('class') === cls); return { count: t.length, from: -Number(t[0].getAttribute('y1')), to: -Number(t[0].getAttribute('y2')), width: Number(t[0].getAttribute('stroke-width')), color: hex(css(t[0], 'color')), turns: t.map((l) => l.getAttribute('transform')) }; };
      const dial = app().querySelector('circle');
      return { hands, face: { dial: Number(dial.getAttribute('r')), view: app().querySelector('svg').getAttribute('viewBox'), minor: tickOf('subsecond'), major: tickOf('hour'), hands: handsOf } };
    },
  },
  ethasketch: {
    find: (n) => n === 'side' ? app().querySelector('input') : app().children[1],
    read: () => {
      const grid = app().children[1];
      const cells = [...grid.querySelectorAll('.cell')];
      const colored = [];
      cells.forEach((c, i) => { const b = css(c, 'backgroundColor'); if (b !== 'rgba(0, 0, 0, 0)') colored.push([i, b]); });
      const fallback = cells.length ? '' : grid.textContent;
      return { side: app().querySelector('input').value, cells: cells.length, size: cells.length ? cells[0].getBoundingClientRect().width : 0,
        wide: cells.length ? cells.reduce((w, c, i) => i < Math.round(Math.sqrt(cells.length)) ? w + c.getBoundingClientRect().width : w, 0) : 0,
        colored, fallback, outline: cells.length ? css(cells[0], 'outlineColor') : '' };
    },
  },
  scoreboard: {
    find: (n) => {
      const admin = app().querySelector('form.admin');
      const rows = [...admin.querySelectorAll('div.player')];
      if (n === 'name') return admin.querySelector('input[name=name]');
      if (n === 'score') return admin.querySelector('input[name=score]');
      if (n === 'add') return [...admin.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Add');
      const [who, what] = n.split('.');
      const row = rows.find((r) => r.firstChild && r.firstChild.nodeType === 3 && r.firstChild.textContent === who);
      if (!row) return null;
      return what === 'score' ? row.querySelector('input') : row.querySelector('button');
    },
    read: () => {
      const board = [...app().querySelectorAll('.board .player')].map((p) => ({ name: p.querySelector('.name').textContent, score: p.querySelector('.score').textContent, ty: matrix(p)[5] }));
      const admin = [...app().querySelectorAll('form.admin div.player')].filter((r) => !r.querySelector('input[name=name]')).map((r) => ({ name: r.firstChild.textContent, score: r.querySelector('input').value }));
      const adding = app().querySelector('form.admin input[name=name]');
      return { board, admin, name: adding.value, score: app().querySelector('form.admin input[name=score]').value };
    },
  },
  asyncresource: {
    find: () => app().querySelector('input'),
    read: () => ({ loading: app().querySelector('span').textContent, shown: app().querySelector('pre').textContent, asked: window.__asked.slice() }),
  },
  suspensetabs: {
    find: (n) => [...app().querySelectorAll('li')].find((l) => l.textContent.trim() === n),
    read: () => {
      const tabs = [...app().querySelectorAll('li')];
      const tab = app().querySelector('.tab');
      const content = app().querySelector('.tab-content');
      let said = '';
      if (content) for (const node of content.childNodes) if (node.nodeType === 3) said += node.textContent;
      return { selected: tabs.findIndex((l) => l.classList.contains('selected')), pending: tab.classList.contains('pending'), color: rgb(css(tab, 'color')),
        tabs: tabs.map((l) => ({ color: rgb(css(l, 'color')), under: rgb(css(l, 'borderBottomColor')) })),
        loader: !!app().querySelector('.loader'), said: said.trim(), paragraph: !!(content && content.querySelector('p') && content.querySelector('p').textContent.length > 0) };
    },
  },
  routing: {
    find: (n) => app().querySelector('a[href="#' + n + '"]'),
    read: () => { const h = app().querySelector('h1'); const page = h ? Object.keys(PAGES).find((k) => PAGES[k] === h.textContent) || '?' : ''; return { hash: location.hash, shown: page }; },
  },
  counterstore: {
    find: (n) => [...app().querySelectorAll('button')].find((b) => b.textContent.trim() === (n === 'more' ? '+' : '-')),
    read: () => ({ count: app().querySelector('p').textContent }),
  },
  styledjsx: {
    find: (n) => app().querySelectorAll('button')[Number(n.slice(6))],
    read: () => ({ buttons: [...app().querySelectorAll('button')].map((b) => ({ words: b.textContent, color: rgb(css(b, 'backgroundColor')) })) }),
  },
};
let READER = null;
window.__ref = {
  async start(reader) {
    localStorage.clear();
    READER = READERS[reader];
    window.__mount();
    await after();
    return true;
  },
  act, after, target, focus,
  read: () => Object.assign({ t: clock.now }, READER.read()),
};
`;

// ---- building an example as the playground does ----

// The one repair made to a published example so that it runs at all: the
// counter store imports its provider as a type (`type CounterProvider`), so
// TypeScript's transform takes the import away and the page stops at once
// with "CounterProvider is not defined"; the word `type` is dropped.
const REPAIRS = { counterstore: [['{ type CounterProvider,', '{ CounterProvider,']] };

function sources(id) {
  const j = JSON.parse(fs.readFileSync(path.join(SITE, id + '.json'), 'utf8'));
  return j.files.map((f) => ({ name: f.name, type: f.type || '', content: Array.isArray(f.content) ? f.content.join('\n') : f.content }));
}

async function build(id, dir) {
  const files = sources(id);
  let style = '';
  fs.mkdirSync(dir, { recursive: true });
  for (const f of files) {
    if (f.type === 'css') { style += f.content + '\n'; continue; }
    let code = f.content.replace(/^import\s+["'][^"']+\.css["'];?\s*$/gm, '');
    // (the playground resolves a file of the example by its bare name)
    code = code.replace(/from\s+["']([A-Za-z]\w*)\.tsx["']/g, 'from "./$1"');
    for (const [from, to] of REPAIRS[id] || []) code = code.replace(from, to);
    const plugins = id === 'styledjsx' ? [require.resolve('solid-styled-jsx/babel')] : [];
    const out = babel.transformSync(code, {
      filename: f.name + '.tsx', babelrc: false, configFile: false, plugins,
      presets: [[require.resolve('babel-preset-solid'), { generate: 'dom' }], [require.resolve('@babel/preset-typescript'), { isTSX: true, allExtensions: true, onlyRemoveTypeImports: false }]],
    });
    fs.writeFileSync(path.join(dir, f.name + '.js'), out.code);
  }
  const bundled = await esbuild.build({
    entryPoints: [path.join(dir, 'main.js')], bundle: true, write: false, format: 'iife', platform: 'browser',
    nodePaths: [path.join(REF, 'node_modules')], logLevel: 'silent', target: 'es2020',
  });
  return { js: bundled.outputFiles[0].text, style };
}

function page(built, seed) {
  const safe = (s) => s.replace(/<\/script/g, '<\\/script');
  return `<!doctype html><html><head><meta charset="utf-8"><title>reference</title><style>${built.style}</style></head>
<body><div id="app"></div>
<script>window.__SEED = ${seed}; window.__CANNED = ${JSON.stringify(CANNED)}; window.__MISSING = ${JSON.stringify(MISSING)};</script>
<script>${safe(FAKES)}</script>
<script>window.__mount = function () { ${safe(built.js)} };</script>
<script>${safe(DRIVER)}</script>
</body></html>`;
}

function serve(folder) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const file = path.join(folder, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!file.startsWith(folder) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(file));
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

// ---- Chrome, driven over its DevTools protocol (Node's own WebSocket) ----

async function launch(profile) {
  const p = spawn(CHROME, ['--headless=new', '--disable-gpu', '--lang=en-US', '--window-size=1000,900',
    '--force-device-scale-factor=1', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
  { stdio: ['ignore', 'ignore', 'pipe'], env: Object.assign({}, process.env, { LANG: 'en_US.UTF-8' }) });
  const url = await new Promise((resolve, reject) => {
    let err = '';
    p.stderr.on('data', (d) => { err += d; const m = /DevTools listening on (ws:\/\/\S+)/.exec(err); if (m) resolve(m[1]); });
    p.on('close', () => reject(new Error('Chrome stopped: ' + err.slice(0, 400))));
  });
  const ws = new WebSocket(url);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const waiting = new Map();
  ws.addEventListener('message', (m) => {
    const j = JSON.parse(m.data);
    if (j.id && waiting.has(j.id)) { const [ok, no] = waiting.get(j.id); waiting.delete(j.id); j.error ? no(new Error(JSON.stringify(j.error))) : ok(j.result); }
  });
  const send = (method, params = {}, sessionId) => new Promise((ok, no) => { id += 1; waiting.set(id, [ok, no]); ws.send(JSON.stringify({ id, method, params, sessionId })); });
  return { process: p, send, close: () => { ws.close(); p.kill(); } };
}

async function open(browser, url) {
  const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await browser.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (method, params) => browser.send(method, params, sessionId);
  await send('Page.navigate', { url });
  for (let i = 0; i < 200; i++) {
    const r = await send('Runtime.evaluate', { expression: 'document.readyState === "complete" && !!window.__ref', returnByValue: true });
    if (r.result.value) break;
    await new Promise((ok) => setTimeout(ok, 25));
  }
  const page = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(expression + ': ' + (r.exceptionDetails.exception ? r.exceptionDetails.exception.description : r.exceptionDetails.text));
    return r.result.value;
  };
  const mouse = async (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', clickCount: type === 'mouseMoved' ? 0 : 1 });
  const command = async (name) => {
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', commands: [name] });
    await send('Input.dispatchKeyEvent', { type: 'keyUp' });
  };
  const key = async (name, code, text) => {
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: name, code, windowsVirtualKeyCode: name === 'Enter' ? 13 : 0, text });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: name, code, windowsVirtualKeyCode: name === 'Enter' ? 13 : 0 });
  };
  return { page, mouse, command, key, send, close: () => browser.send('Target.closeTarget', { targetId }) };
}

// one step: the page's own (the clock, an address) or the browser's input
// (a press, typing, a key, the pointer moved), then what the page shows
async function step(tab, s) {
  const J = JSON.stringify;
  let missing = null;
  if (s.do === 'press' || s.do === 'hover') {
    const at = await tab.page(`__ref.target(${J(s.on)}, ${s.index === undefined ? 'undefined' : s.index})`);
    if (!at) missing = s.on;
    // (the pointer goes into the cell and off the page again: it stands
    // nowhere a later step's page could move a cell under it)
    else if (s.do === 'hover') { await tab.mouse('mouseMoved', at.x, at.y); await tab.mouse('mouseMoved', 995, 895); }
    else { await tab.mouse('mouseMoved', at.x, at.y); await tab.mouse('mousePressed', at.x, at.y); await tab.mouse('mouseReleased', at.x, at.y); }
  } else if (s.do === 'blur') {
    // (a press on nothing: the page's empty corner)
    await tab.mouse('mouseMoved', 995, 895); await tab.mouse('mousePressed', 995, 895); await tab.mouse('mouseReleased', 995, 895);
  } else if (s.do === 'type' || s.do === 'set' || s.do === 'clear') {
    if (!(await tab.page(`__ref.focus(${J(s.into)})`))) missing = s.into;
    else {
      await tab.command(s.do === 'type' ? 'moveToEndOfDocument' : 'selectAll');
      if (s.do === 'clear') await tab.command('deleteBackward');
      else await tab.send('Input.insertText', { text: s.text });
    }
  } else if (s.do === 'key') {
    await tab.key(s.key, s.key, s.key === 'Enter' ? '\r' : undefined);
  } else {
    await tab.page(`__ref.act(${J(s)})`);
  }
  if (s.do !== 'wait' && s.do !== 'jump' && !(['reload', 'go', 'pick', 'dark', 'focus'].includes(s.do))) await tab.page('__ref.after()');
  const seen = await tab.page('__ref.read()');
  return missing ? Object.assign({ t: seen.t, missing }, seen) : seen;
}

async function main() {
  if (!fs.existsSync(path.join(SITE, 'counter.json')) || !fs.existsSync(path.join(REF, 'node_modules', 'solid-js'))) {
    console.error('usage: node tests/solid/reference.mjs <folder of the examples\' json> <folder with solid-js installed>');
    process.exit(2);
  }
  // (the pages and Chrome's profile are made beside the installed packages)
  const tmp = fs.mkdtempSync(path.join(REF, 'run-'));
  const server = await serve(tmp);
  const port = server.address().port;
  const browser = await launch(path.join(tmp, 'profile'));
  const version = (id) => JSON.parse(fs.readFileSync(path.join(REF, 'node_modules', id, 'package.json'), 'utf8')).version;
  const out = {
    reference: { site: 'github.com/solidjs/solid-site', commit: COMMIT, chrome: execFileSync(CHROME, ['--version']).toString().trim(),
      packages: Object.fromEntries(['solid-js', 'babel-preset-solid', 'solid-transition-group', '@solid-primitives/transition-group', 'solid-styled-jsx', 'styled-jsx', '@babel/core', '@babel/preset-typescript', 'esbuild'].map((p) => [p, version(p)])),
      // (the canned answers as the text a server sends, keys in order)
      frame_ms: 16, seed: 'x = x * 48271 mod 2147483647, x / 2147483647', canned_ms: 300,
      canned: Object.fromEntries(Object.entries(CANNED).map(([k, v]) => [k, JSON.stringify(v)])), missing: JSON.stringify(MISSING) },
    examples: {},
  };
  try {
    for (const [id, plan] of Object.entries(PLANS)) {
      const variants = id === 'todos' ? ['todos', 'simpletodos', 'simpletodoshyperscript'] : [id];
      for (const v of variants) {
        const built = await build(v, path.join(tmp, 'build', v));
        fs.writeFileSync(path.join(tmp, v + '.html'), page(built, plan.seed || 1));
        for (const kind of plan.edges ? ['steps', 'edges'] : ['steps']) {
          const tab = await open(browser, `http://127.0.0.1:${port}/${v}.html`);
          await tab.page(`__ref.start(${JSON.stringify(id)})`);
          const seen = [];
          for (const s of plan[kind]) seen.push(await step(tab, s));
          await tab.close();
          const e = out.examples[id] || (out.examples[id] = { seed: plan.seed || 1 });
          e[kind] = plan[kind];
          if (id === 'todos') (e['seen_' + kind] || (e['seen_' + kind] = {}))[v] = seen;
          else e['seen_' + kind] = seen;
          console.log(`${v} ${kind}: ${seen.length} steps`);
        }
      }
    }
  } finally {
    const gone = new Promise((r) => browser.process.on('close', r));
    browser.close();
    server.close();
    await gone;
  }
  fs.writeFileSync(path.join(HERE, 'reference.json'), JSON.stringify(out, null, 1) + '\n');
  fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  console.log('wrote', path.join(HERE, 'reference.json'));
}

main().catch((e) => { console.error(e); process.exit(1); });
