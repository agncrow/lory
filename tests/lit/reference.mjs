// Lit's examples held to Lory's (examples/lit).
//
// Each example of Lit's playground is written again here in plain
// JavaScript (static properties, no decorators), as the playground shows
// it, and run against the real libraries in headless Chrome; the
// documentation's examples are written the way their pages show. A fake
// clock steps every example's time (timers, frames, `Date`,
// `performance.now` and the Web Animations it starts), each is driven by
// fixed actions, and what it shows after every step is written beside this
// script as reference.json, which reference.co holds Lory's examples to:
// the words shown, what each field holds, which boxes are ticked, the
// controls shown but off, the looks a step names, and for
// @lit-labs/motion the animations started (when, how long, how eased and
// filled), each element's opacity and how much of its starting transform
// is left at fixed times, and where the layouts that use no font come to
// rest. The libraries it was written with:
//
//   lit 3.3.3 (lit-html 3.3.3, lit-element 4.2.2, @lit/reactive-element 2.1.2)
//   @lit/context 1.1.6, @lit/task 1.0.3, @lit/localize 0.12.2
//   @lit-labs/motion 1.1.0, @lit-labs/signals 0.3.0 (signal-polyfill 0.2.2)
//   @lit/react 1.0.8, react 18.3.1, react-dom 18.3.1
//
// Install them into a folder of your own (nothing here downloads
// anything), then name that folder's node_modules:
//
//   npm install --prefix <dir> lit@3.3.3 @lit/context@1.1.6 @lit/task@1.0.3 \
//       @lit/localize@0.12.2 @lit-labs/motion@1.1.0 @lit-labs/signals@0.3.0 \
//       @lit/react@1.0.8 react@18.3.1 react-dom@18.3.1
//   node tests/lit/reference.mjs <dir>/node_modules
//
// The page reaches nothing outside this machine: every host name resolves
// to nothing, and `fetch` answers from the table below (npm's facts for
// `lit` as the async task example asks for them, a 404 for any other).
// Math.random is seeded, and the draws an example took are written down
// for Lory's to take. The page is 800 by 600, in UTC and American English.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

process.env.TZ = 'UTC';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIB = path.resolve(process.argv[2] || '');
const CHROME = process.env.LORY_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PACKAGES = ['lit', 'lit-html', 'lit-element', '@lit/reactive-element', '@lit/context', '@lit/task', '@lit/localize',
  '@lit-labs/motion', '@lit-labs/signals', 'signal-polyfill', '@lit/react', 'react', 'react-dom'];
const versions = {};
for (const p of PACKAGES) {
  versions[p] = JSON.parse(fs.readFileSync(path.join(LIB, p, 'package.json'), 'utf8')).version;
}
const at = (rel) => pathToFileURL(path.join(LIB, rel)).href;
const imports = {
  'lit': at('lit/index.js'), 'lit/': at('lit/'),
  'lit-html': at('lit-html/lit-html.js'), 'lit-html/': at('lit-html/'),
  'lit-element/': at('lit-element/'),
  '@lit/reactive-element': at('@lit/reactive-element/reactive-element.js'), '@lit/reactive-element/': at('@lit/reactive-element/'),
  '@lit/context': at('@lit/context/index.js'), '@lit/task': at('@lit/task/index.js'),
  '@lit/localize': at('@lit/localize/lit-localize.js'), '@lit/localize/': at('@lit/localize/'),
  '@lit-labs/motion': at('@lit-labs/motion/index.js'),
  '@lit-labs/signals': at('@lit-labs/signals/index.js'), 'signal-polyfill': at('signal-polyfill/dist/index.js'),
  '@lit/react': at('@lit/react/index.js'),
};

// npm's answer for `lit`, as the async task example shows it (its
// description and two of its tags)
const NPM = { lit: { description: 'A small library for building fast, light web components.', 'dist-tags': { latest: '3.3.3', next: '3.3.0-pre.0' } } };

// ---------------------------------------------------------------- the clock

// Installed before anything else on the page: timers, frames, `Date` and
// `performance.now` run on a clock the page steps, from a time each
// example begins at (`__clock.begin`), when the day is 2026-11-14 12:00 UTC.
function clock() {
  const EPOCH = Date.UTC(2026, 10, 14, 12, 0, 0);
  const RealDate = Date;
  let now = 0;
  let base = 0;
  let seq = 0;
  const timers = new Map();
  const add = (fn, due, every, args) => {
    const id = ++seq;
    timers.set(id, { id, fn, due, every, args });
    return id;
  };
  window.setTimeout = (fn, ms, ...args) => add(fn, now + Math.max(0, Number(ms) || 0), 0, args);
  window.setInterval = (fn, ms, ...args) => add(fn, now + Math.max(1, Number(ms) || 0), Math.max(1, Number(ms) || 0), args);
  window.clearTimeout = window.clearInterval = (id) => { timers.delete(id); };
  window.requestAnimationFrame = (fn) => add(() => fn(now), now + 16, 0, []);
  window.cancelAnimationFrame = (id) => { timers.delete(id); };
  performance.now = () => now;
  class FakeDate extends RealDate {
    constructor(...given) {
      if (given.length === 0) super(EPOCH + now - base);
      else super(...given);
    }
    static now() { return EPOCH + now - base; }
  }
  window.Date = FakeDate;
  // a seeded Math.random, its draws kept
  let seed = 1;
  let draws = [];
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const v = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    draws.push(v);
    return v;
  };
  window.__clock = {
    get now() { return now - base; },
    get draws() { return draws; },
    begin(s) {
      timers.clear();
      base = Math.ceil((now + 1) / 100000) * 100000;
      now = base;
      seed = s;
      draws = [];
    },
    // the timer due next, at or before `limit` (page time)
    next(limit) {
      let pick = null;
      for (const t of timers.values()) {
        if (t.due - base <= limit && (pick === null || t.due < pick.due || (t.due === pick.due && t.id < pick.id))) pick = t;
      }
      return pick;
    },
    run(t) {
      now = Math.max(now, t.due);
      if (t.every > 0) t.due += t.every;
      else timers.delete(t.id);
      t.fn(...t.args);
    },
    to(limit) { now = Math.max(now, base + limit); },
    dueOf(t) { return t.due - base; },
  };
}

// ---------------------------------------------------------------- the page

// Everything that runs on the page: the examples, the actions and what is
// read of them. It is handed the npm table and writes its findings into
// `#out`.
async function page(NPM) {
  const { LitElement, html, css, nothing, svg } = await import('lit');
  const { classMap } = await import('lit/directives/class-map.js');
  const { styleMap } = await import('lit/directives/style-map.js');
  const { repeat } = await import('lit/directives/repeat.js');
  const { map } = await import('lit/directives/map.js');
  const { asyncAppend } = await import('lit/directives/async-append.js');
  const { asyncReplace } = await import('lit/directives/async-replace.js');
  const { cache } = await import('lit/directives/cache.js');
  const { guard } = await import('lit/directives/guard.js');
  const { until } = await import('lit/directives/until.js');
  const { ifDefined } = await import('lit/directives/if-defined.js');
  const { live } = await import('lit/directives/live.js');
  const { ref, createRef } = await import('lit/directives/ref.js');
  const { templateContent } = await import('lit/directives/template-content.js');
  const { unsafeHTML } = await import('lit/directives/unsafe-html.js');
  const { unsafeSVG } = await import('lit/directives/unsafe-svg.js');
  const statics = await import('lit/static-html.js');
  const { ContextProvider, ContextConsumer, createContext } = await import('@lit/context');
  const { Task, initialState } = await import('@lit/task');
  const motion = await import('@lit-labs/motion');
  const { animate, AnimateController, flyBelow, fade, fadeIn, fadeInSlow, fadeOut } = motion;
  const { SignalWatcher, watch, signal } = await import('@lit-labs/signals');
  const { createComponent } = await import('@lit/react');
  const localize = await import('@lit/localize');
  const React = window.React;
  const ReactDOM = window.ReactDOM;
  const C = window.__clock;

  // ------------------------------------------------ fetch, answered here

  window.fetch = (url, init = {}) => new Promise((resolve, reject) => {
    const signal = init.signal;
    if (signal && signal.aborted) { reject(new DOMException('aborted', 'AbortError')); return; }
    const name = String(url).replace('https://registry.npmjs.org/', '');
    const known = name in NPM;
    const body = known ? JSON.stringify(NPM[name]) : 'Not found';
    queueMicrotask(() => {
      if (signal && signal.aborted) { reject(new DOMException('aborted', 'AbortError')); return; }
      resolve(new Response(body, { status: known ? 200 : 404 }));
    });
  });

  // ------------------------------------------------ animations, stepped

  // Every animation an element starts is held still (its playback rate 0)
  // and its time moved on with the clock's, while it runs; at its end it is
  // finished, which settles its promise as the browser's own would.
  let started = [];
  let held = [];
  // (made as `animate` makes one, its rate set before it plays: a rate
  // changed on an animation already playing waits for its next frame)
  Element.prototype.animate = function (frames, options) {
    const a = new Animation(new KeyframeEffect(this, frames, options), document.timeline);
    if (options && typeof options === 'object' && options.id) a.id = options.id;
    a.playbackRate = 0;
    a.play();
    a.currentTime = 0;
    const o = typeof options === 'number' ? { duration: options } : (options || {});
    const id = this.getAttribute && this.getAttribute('data-lory');
    const role = this.__loryRole || 'plain';
    this.__loryRole = undefined;
    const first = Array.isArray(frames) && frames.length ? frames[0] : {};
    held.push({ a, el: this, id, first: first.transform || '' });
    if (id) {
      const r2 = (x) => String(Math.round(x * 100) / 100);
      started.push(`${id} ${role} ${r2(C.now)} ${r2(o.delay || 0)} ${r2(o.duration || 0)} ${o.easing || 'linear'} ${o.fill || 'none'}`);
    }
    return a;
  };
  // the role of an animation as the library starts it: an element going
  // (put back for its `out`), one whose box moved or that comes from one
  // that went (`flip`), or one coming (`in`)
  const A = motion.Animate.prototype;
  const disconnected = A.disconnected;
  A.disconnected = function () { this.element.__loryGoing = true; return disconnected.call(this); };
  const calculate = A.calculateKeyframes;
  A.calculateKeyframes = function (...given) { this.__loryFlip = true; return calculate.apply(this, given); };
  const animateIt = A.animate;
  A.animate = function (frames, options) {
    if (this.element.__loryGoing) this.element.__loryRole = 'out';
    else this.element.__loryRole = this.__loryFlip ? 'flip' : 'in';
    this.element.__loryGoing = false;
    this.__loryFlip = false;
    return animateIt.call(this, frames, options);
  };
  const ownEnd = (a) => a.effect.getComputedTiming().endTime;
  const running = () => held.filter((h) => h.a.playState === 'running');
  // the page time the next running animation ends at
  const nextEnd = () => {
    let soonest = Infinity;
    for (const h of running()) soonest = Math.min(soonest, C.now + (ownEnd(h.a) - (h.a.currentTime || 0)));
    return soonest;
  };
  const stepped = (dt) => {
    for (const h of running()) {
      h.a.currentTime = Math.min(ownEnd(h.a), (h.a.currentTime || 0) + dt);
    }
  };
  const finishDone = () => {
    for (const h of running()) {
      if ((h.a.currentTime || 0) >= ownEnd(h.a) - 1e-6) {
        h.a.playbackRate = 1;
        h.a.finish();
      }
    }
    held = held.filter((h) => h.a.playState !== 'idle' && !(h.a.playState === 'finished' && !h.el.isConnected));
  };

  // ------------------------------------------------ time, stepped

  const turn = () => new Promise((r) => { const ch = new MessageChannel(); ch.port1.onmessage = () => r(); ch.port2.postMessage(0); });
  const settle = async () => {
    for (let i = 0; i < 6; i++) {
      for (let k = 0; k < 4; k++) await turn();
      await new Promise((r) => window.__realTimeout(r, 1));
    }
  };
  // the clock moved on by `ms`, every timer and animation end on the way
  // run in its turn
  const advance = async (ms) => {
    const target = C.now + ms;
    for (;;) {
      await settle();
      const timer = C.next(target);
      const ends = nextEnd();
      const timerAt = timer ? C.dueOf(timer) : Infinity;
      const when = Math.min(timerAt, ends);
      if (when > target) break;
      stepped(when - C.now);
      C.to(when);
      finishDone();
      await settle();
      if (timer && timerAt <= when) C.run(timer);
    }
    stepped(target - C.now);
    C.to(target);
    finishDone();
    await settle();
  };

  // ------------------------------------------------ what is shown

  const MARKS = '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';
  const tokens = (words) => {
    const out = [];
    let run = '';
    for (const ch of words) {
      if (/\s/.test(ch)) { if (run) out.push(run); run = ''; }
      else if (MARKS.includes(ch)) { if (run) out.push(run); run = ''; out.push(ch); }
      else run += ch;
    }
    if (run) out.push(run);
    return out;
  };
  const hex = (css) => {
    const m = /rgba?\(([^)]*)\)/.exec(css || '');
    if (!m) return css;
    const v = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    if (v.length > 3 && v[3] === 0) return 'none';
    return '#' + v.slice(0, 3).map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');
  };
  const lookOf = (el, key) => {
    const cs = getComputedStyle(el);
    if (key === 'bg') return hex(cs.backgroundColor);
    if (key === 'color') return hex(cs.color);
    if (key === 'border') return Number.parseFloat(cs.borderTopWidth) > 0 ? hex(cs.borderTopColor) : 'none';
    if (key === 'line') return String(Number.parseFloat(cs.borderTopWidth));
    if (key === 'pad') return String(Number.parseFloat(cs.paddingLeft));
    if (key === 'opacity') return String(Number(cs.opacity));
    if (key === 'align') return cs.textAlign === 'center' ? 'center' : 'start';
    if (key === 'tag') return el.localName;
    if (key === 'src') return el.getAttribute('src') || '';
    if (key === 'fill') return hex(cs.fill);
    if ('xywh'.includes(key) && key.length === 1) {
      const r = el.getBoundingClientRect();
      const o = (el.ownerSVGElement || el.parentElement).getBoundingClientRect();
      return String(Math.round({ x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height }[key] * 10) / 10);
    }
    return '';
  };
  const shown = (el) => getComputedStyle(el).display !== 'none';
  // the facts of what an element shows, read in the order it is drawn:
  // through shadow roots and the slots children are drawn in
  const factsOf = (root) => {
    const f = { words: [], fields: {}, checks: {}, off: [], looks: {}, ids: [] };
    const text = [];
    const walk = (n) => {
      if (n.nodeType === Node.TEXT_NODE) { text.push(n.data); return; }
      if (n.nodeType === Node.DOCUMENT_FRAGMENT_NODE) { n.childNodes.forEach(walk); return; }
      if (n.nodeType !== Node.ELEMENT_NODE) return;
      const tag = n.localName;
      if (tag === 'style' || tag === 'script' || tag === 'template' || tag === 'pre-out') return;
      if (!shown(n)) return;
      const id = n.getAttribute('data-lory');
      if (id) {
        f.ids.push(id);
        if (n.disabled) f.off.push(id);
        if (tag === 'input' && n.type === 'checkbox') f.checks[id] = n.checked;
        else if (tag === 'input' || tag === 'textarea') f.fields[id] = n.value;
        const keys = n.getAttribute('data-look');
        if (keys) {
          const l = {};
          for (const k of keys.split(',')) l[k] = lookOf(n, k);
          f.looks[id] = l;
        }
      }
      text.push(' ');
      if (tag === 'slot') {
        const given = n.assignedNodes();
        (given.length ? given : [...n.childNodes]).forEach(walk);
      } else if (n.shadowRoot) {
        n.shadowRoot.childNodes.forEach(walk);
      } else {
        n.childNodes.forEach(walk);
      }
      text.push(' ');
    };
    walk(root);
    f.words = tokens(text.join(''));
    return f;
  };
  // every element of an example a test names, inside its shadow roots
  const tagged = (root) => {
    const out = [];
    const walk = (n) => {
      if (n.nodeType !== Node.ELEMENT_NODE && n.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
      if (n.nodeType === Node.ELEMENT_NODE && n.getAttribute('data-lory')) out.push(n);
      if (n.shadowRoot) n.shadowRoot.childNodes.forEach(walk);
      n.childNodes.forEach(walk);
    };
    walk(root);
    return out;
  };
  const find = (root, id) => tagged(root).find((n) => n.getAttribute('data-lory') === id);
  // how much of the transform an element started from is left: the
  // largest of its moves (across, down, wider, taller) as it stands now
  // against as it started; none where no animation moving it is in effect
  const startOf = (transform) => {
    const v = { x: 0, y: 0, sx: 1, sy: 1, fly: 0 };
    const fly = /translate[XY]\(-?100%\)\s*scale\(0\)/.test(transform);
    if (fly) { v.fly = 1; return v; }
    const num = (re) => { const m = re.exec(transform); return m ? Number(m[1]) : null; };
    const tx = num(/translateX\((-?[\d.e+-]+)px\)/); if (tx !== null) v.x = tx;
    const ty = num(/translateY\((-?[\d.e+-]+)px\)/); if (ty !== null) v.y = ty;
    const sx = num(/scaleX\((-?[\d.e+-]+)\)/); if (sx !== null) v.sx = sx;
    const sy = num(/scaleY\((-?[\d.e+-]+)\)/); if (sy !== null) v.sy = sy;
    return v;
  };
  // (read from the animation itself, not the style it gives: its eased
  // progress between its keyframes, each keyframe's share of the start
  // left, since an element whose earlier animation still fills may be
  // drawn by either)
  const shareOf = (transform, s) => {
    if (!transform || transform === 'none') return 0;
    const v = startOf(transform);
    if (s.fly) return v.fly;
    const axes = [[s.x, v.x], [s.y, v.y], [s.sx - 1, v.sx - 1], [s.sy - 1, v.sy - 1]];
    let best = null;
    for (const [from, at] of axes) {
      if (Math.abs(from) > 1e-9 && (best === null || Math.abs(from) > Math.abs(best[0]))) best = [from, at];
    }
    return best === null ? 0 : best[1] / best[0];
  };
  const leftOf = (el) => {
    const live = held.filter((h) => h.el === el && h.a.playState !== 'idle' && h.a.effect.getComputedTiming().progress !== null);
    if (!live.length) return null;
    const h = live[live.length - 1];
    // (a keyframe left out at either end is the element's own: none)
    const frames = h.a.effect.getKeyframes();
    if (!frames.some((k) => k.transform && k.transform !== 'none')) return null;
    if (frames[0].computedOffset > 0) frames.unshift({ computedOffset: 0, transform: 'none' });
    if (frames[frames.length - 1].computedOffset < 1) frames.push({ computedOffset: 1, transform: 'none' });
    const first = h.first || frames.find((k) => k.transform && k.transform !== 'none').transform;
    const s = startOf(first);
    const p = h.a.effect.getComputedTiming().progress;
    let k = 0;
    while (k < frames.length - 2 && frames[k + 1].computedOffset <= p) k++;
    const o0 = frames[k].computedOffset;
    const o1 = frames[Math.min(k + 1, frames.length - 1)].computedOffset;
    const f0 = shareOf(frames[k].transform, s);
    const f1 = shareOf(frames[Math.min(k + 1, frames.length - 1)].transform, s);
    const q = o1 > o0 ? (p - o0) / (o1 - o0) : 1;
    return Math.round((f0 + (f1 - f0) * q) * 10000) / 10000;
  };
  const seenOf = (root) => tagged(root).filter((el) => el.isConnected && shown(el)).map((el) => {
    const id = el.getAttribute('data-lory');
    return [id, Math.round(Number(getComputedStyle(el).opacity) * 10000) / 10000, leftOf(el)];
  }).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  // the boxes elements rest in, from the example's own corner
  const rectsOf = (root) => {
    const out = {};
    const o = root.getBoundingClientRect();
    for (const el of tagged(root)) {
      const r = el.getBoundingClientRect();
      out[el.getAttribute('data-lory')] = [r.left - o.left, r.top - o.top, r.width, r.height].map((v) => Math.round(v * 10) / 10);
    }
    return out;
  };

  // ------------------------------------------------ the actions

  // `press` clicks, `type` sets a field's words as typing does (its input
  // event), `commit` is the change a field tells when it is left or Enter
  // is pressed, `pick` is a date chosen whole (its input and change at
  // once, as a date input tells them), `check` clicks a box, `wait` moves
  // the clock on
  const act = async (root, step) => {
    const [what, id, words] = step;
    if (what === 'wait') { await advance(id); return; }
    const el = find(root, id);
    if (!el) throw new Error(`no ${id} to ${what}`);
    if (what === 'press' || what === 'check') el.click();
    else if (what === 'type') { el.value = words; el.dispatchEvent(new Event('input', { bubbles: true, composed: true })); }
    else if (what === 'commit') el.dispatchEvent(new Event('change', { bubbles: true }));
    else if (what === 'pick') {
      el.value = words;
      el.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    await settle();
  };

  // ------------------------------------------------ the examples

  let made = 0;
  // a custom element defined under a name of its own (every example's
  // `my-element` is another element)
  const define = (name, cls) => {
    const tag = `${name}-${++made}`;
    customElements.define(tag, cls);
    return tag;
  };
  const el = (tag, attrs = {}, kids = []) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'text') n.textContent = v;
      else n.setAttribute(k, v);
    }
    for (const k of kids) n.append(k);
    return n;
  };
  const textOf = (words) => document.createTextNode(words);

  const cases = [];
  const example = (name, mount, steps, more = {}) => cases.push({ name, mount, steps, ...more });

  // ---- Basics

  example('hello-world', (root) => {
    class Greeting extends LitElement {
      static properties = { name: {} };
      static styles = css`p { color: blue }`;
      constructor() { super(); this.name = 'Somebody'; }
      render() { return html`<p data-lory="hello" data-look="color">Hello, ${this.name}!</p>`; }
    }
    root.append(el(define('simple-greeting', Greeting), { name: 'World' }));
  }, []);

  example('full-component', (root) => {
    class Planet extends LitElement {
      static properties = { greeting: {}, planet: {} };
      static styles = css`
        :host { display: inline-block; padding: 10px; background: lightgray; }
        .planet { color: var(--planet-color, blue); }`;
      constructor() { super(); this.greeting = 'Hello'; this.planet = 'World'; }
      render() {
        const n = this.getAttribute('n');
        return html`<span @click=${this.turn}>${this.greeting}
          <span class="planet" data-lory="fc-${n}" data-look="color">${this.planet}</span></span>`;
      }
      turn() { this.planet = this.planet === 'World' ? 'Mars' : 'World'; }
    }
    const tag = define('planet-greeting', Planet);
    root.append(el('style', { text: '.mars { --planet-color: red; }' }));
    root.append(el(tag, { n: '1', 'data-lory': 'fc-1-hello', 'data-look': 'bg,pad' }), el('hr'),
      el(tag, { n: '2', class: 'mars', planet: 'Mars', 'data-lory': 'fc-2-hello', 'data-look': 'bg,pad' }));
  }, [['press', 'fc-1'], ['press', 'fc-2'], ['press', 'fc-1']]);

  // ---- Reactive properties

  example('properties-basic', (root) => {
    class NameTag extends LitElement {
      static properties = { name: {} };
      render() { return html`Hello I'm ${this.name}.`; }
    }
    const tag = define('name-tag', NameTag);
    root.append(el(tag, { name: 'statically initialized' }), el('hr'));
    const made = document.createElement(tag);
    made.name = 'dynamically created';
    root.append(made);
  }, []);

  example('properties-has-changed', (root) => {
    const sameDay = (a, b) => a?.toLocaleDateString() === b?.toLocaleDateString();
    class DateShown extends LitElement {
      static properties = { date: { hasChanged: (v, old) => !sameDay(v, old) } };
      render() { return html`<span id="datefield" data-lory="date-shown" data-look="bg">${this.date?.toLocaleDateString()}</span>`; }
      updated(changed) {
        if (changed.has('date')) {
          this.renderRoot.querySelector('#datefield').animate([{ backgroundColor: '#fff' }, { backgroundColor: '#324fff' }, { backgroundColor: '#fff' }], 1000);
        }
      }
    }
    const shownTag = define('date-display', DateShown);
    const shownIn = statics.unsafeStatic(shownTag);
    class Chooser extends LitElement {
      static properties = { date: {} };
      render() {
        return statics.html`
          <p>Choose a date:
          <input type="date" data-lory="date-input" @change=${this.changed}></p>
          <p><button data-lory="date-today" @click=${this.today}>Choose Today</button></p>
          <p>Date chosen: <${shownIn} .date=${this.date}></${shownIn}></p>`;
      }
      changed(e) {
        const utc = e.target.valueAsDate;
        if (utc) this.date = new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
      }
      today() { this.date = new Date(); }
    }
    root.append(el(define('date-chooser', Chooser)));
  }, [['press', 'date-today'], ['wait', 250], ['wait', 750], ['pick', 'date-input', '2026-11-14'],
    ['wait', 300], ['pick', 'date-input', '2026-12-25'], ['wait', 500], ['wait', 600]]);

  example('properties-custom-converter', (root) => {
    class Dated extends LitElement {
      static properties = { date: { converter: (v) => (v ? new Date(v) : undefined) } };
      render() {
        return html`${this.date
          ? html`<p>Date is <span id="datefield" data-lory="conv-date">${this.date.toLocaleDateString()}</span></p>`
          : 'No date set'}`;
      }
    }
    const tag = define('dated-element', Dated);
    root.append(el(tag), el('hr'), el(tag, { date: 'Oct 20 2021' }));
  }, []);

  // ---- Template concepts

  example('expressions', (root) => {
    class Expressions extends LitElement {
      static properties = { bodyText: {}, label: {}, editing: {}, value: {} };
      constructor() { super(); this.bodyText = 'Text in child expression.'; this.label = 'A label, for ARIA.'; this.editing = true; this.value = 7; }
      render() {
        return html`
          <div>Child expression: ${this.bodyText}</div>
          <div aria-label=${this.label}>Attribute expression.</div>
          <div>Boolean attribute expression. <input type="text" data-lory="expr-text" ?disabled=${!this.editing} /></div>
          <div>Property expression. <input type="number" data-lory="expr-number" .valueAsNumber=${this.value} /></div>
          <div>Event listener expression. <button data-lory="expr-click" @click=${this.clicked}>Click</button></div>`;
      }
      clicked() { this.editing = !this.editing; }
    }
    root.append(el(define('expression-types', Expressions)));
  }, [['press', 'expr-click'], ['press', 'expr-click']]);

  example('templates-conditional', (root) => {
    class Conditional extends LitElement {
      static properties = { condition: {} };
      constructor() { super(); this.condition = true; }
      render() {
        return html`<p>Render content conditionally:</p>
          ${this.condition ? html`<p>Render some HTML if condition is true.</p>` : html`<p>Render some other HTML if condition is false.</p>`}
          <button data-lory="cond-toggle" @click=${() => { this.condition = !this.condition; }}>Toggle condition</button>`;
      }
    }
    root.append(el(define('conditional-templates', Conditional)));
  }, [['press', 'cond-toggle'], ['press', 'cond-toggle']]);

  example('repeating-and-conditional', (root) => {
    class Listed extends LitElement {
      static properties = { list: {} };
      constructor() { super(); this.list = ['Peas', 'Carrots', 'Tomatoes']; }
      render() { return html`<p>Render a list:</p><ul>${this.list.map((item, i) => html`<li>${i}: ${item}</li>`)}</ul>`; }
    }
    root.append(el(define('repeating-list', Listed)));
  }, []);

  example('slotting-children', (root) => {
    class Slotting extends LitElement {
      static styles = css`::slotted(*) { border: 1px solid blue; padding: 6px; }`;
      render() { return html`<div><slot></slot></div>`; }
    }
    const tag = define('slotting-element', Slotting);
    const p = (words, id) => el('p', { text: words, 'data-lory': id, 'data-look': 'border,line,pad' });
    root.append(el('p', {}, [textOf('Use the '), el('code', { text: 'slot' }), textOf(' element to render children')]),
      el(tag, {}, [p('Render me', 'slot-1-0')]),
      el('p', { text: 'Arbitarily many  children may populate a single slot' }),
      el(tag, {}, [p('Render me', 'slot-2-0'), p('Me too', 'slot-2-1'), p('Me three', 'slot-2-2')]));
  }, []);

  example('element-composition', (root) => {
    class Header extends LitElement {
      static styles = css`h1 { text-align: center; }`;
      render() { return html`<header><h1 data-lory="title" data-look="align">Element composition</h1></header>`; }
    }
    class Article extends LitElement {
      static styles = css`article { padding: 20px; }`;
      render() {
        return html`<article data-lory="article" data-look="pad"><p>Manage complexity by building large, complex components
          out of smaller, simpler components that do one thing well.</p></article>`;
      }
    }
    class Footer extends LitElement {
      static styles = css`footer { display: flex; justify-content: center; }`;
      render() { return html`<footer><p data-lory="footer">THE END</p></footer>`; }
    }
    const h = statics.unsafeStatic(define('page-header', Header));
    const a = statics.unsafeStatic(define('page-article', Article));
    const f = statics.unsafeStatic(define('page-footer', Footer));
    class Page extends LitElement {
      render() { return statics.html`<${h}></${h}><${a}></${a}><${f}></${f}>`; }
    }
    root.append(el(define('composed-page', Page)));
  }, []);

  example('template-composition', (root) => {
    class Page extends LitElement {
      static properties = { article: { attribute: false } };
      constructor() {
        super();
        this.article = { title: 'Template composition', text: `Defining partial templates as instance methods
           breaks the template into manageable pieces—and
           allows a subclass to override individual parts of the template.` };
      }
      headerTemplate() { return html`<header><h1>${this.article.title}</h1></header>`; }
      articleTemplate() { return html`<article>${this.article.text}</article>`; }
      render() { return html`${this.headerTemplate()}${this.articleTemplate()}`; }
    }
    root.append(el(define('template-page', Page)));
  }, []);

  // ---- Directives

  example('directive-async-append', (root) => {
    async function* coins(count) {
      for (let i = 0; i < count; i++) {
        yield Math.random() > 0.5 ? 'Heads' : 'Tails';
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    class Coins extends LitElement {
      static properties = { tosses: { state: true } };
      constructor() { super(); this.tosses = coins(10); }
      render() { return html`<ul>${asyncAppend(this.tosses, (v) => html`<li>${v}</li>`)}</ul>`; }
    }
    root.append(el(define('coin-tosses', Coins)));
  }, [['wait', 1000], ['wait', 1000], ['wait', 2000], ['wait', 5000], ['wait', 2000]]);

  example('directive-async-replace', (root) => {
    async function* countDown(count) {
      while (count > 0) {
        yield count--;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    class Timer extends LitElement {
      static properties = { timer: { state: true } };
      constructor() { super(); this.timer = countDown(10); }
      render() { return html`Timer: <span>${asyncReplace(this.timer)}</span>.`; }
    }
    root.append(el(define('count-down', Timer)));
  }, [['wait', 1000], ['wait', 1000], ['wait', 3000], ['wait', 4000], ['wait', 2000]]);

  example('directive-cache', (root) => {
    class Cached extends LitElement {
      static properties = { selectedView: { type: Number } };
      constructor() { super(); this.selectedView = 1; }
      render() {
        const v = this.selectedView;
        return html`<h3>cache directive example</h3>
          <button data-lory="cache-toggle" @click=${this.toggle}>Toggle View</button><hr>
          Un-cached (DOM re-created when template re-rendered):<br>
          ${v == 1 ? html`View 1: <input data-lory="cache-plain" value="edit me then toggle">` : html`View 2: <input data-lory="cache-plain" value="edit me then toggle">`}<hr>
          Cached (DOM cached and re-used when template re-rendered):<br>
          ${cache(v == 1 ? html`View 1: <input data-lory="cache-kept" value="edit me then toggle">` : html`View 2: <input data-lory="cache-kept" value="edit me then toggle">`)}`;
      }
      toggle() { this.selectedView = this.selectedView === 1 ? 2 : 1; }
    }
    root.append(el(define('cache-element', Cached)));
  }, [['type', 'cache-plain', 'typed plain'], ['type', 'cache-kept', 'typed kept'], ['press', 'cache-toggle'],
    ['type', 'cache-kept', 'second view'], ['press', 'cache-toggle'], ['press', 'cache-toggle']]);

  example('directive-class-map', (root) => {
    class Classed extends LitElement {
      static styles = css`.enabled { background: lightgreen; } .hidden { opacity: 0.2; } .padded { padding: 10px; }`;
      static properties = { enabled: { type: Boolean }, hidden: { type: Boolean } };
      constructor() { super(); this.enabled = true; this.hidden = false; }
      render() {
        return html`<h3>classMap directive example</h3>
          <div data-lory="cm-box" data-look="bg,opacity,pad" class=${classMap({ enabled: this.enabled, hidden: this.hidden, padded: true })}>Classy text</div>
          <hr>
          <label><input type="checkbox" data-lory="cm-enabled" .checked=${this.enabled} @change=${() => { this.enabled = !this.enabled; }}> Enabled</label>
          <label><input type="checkbox" data-lory="cm-hidden" .checked=${this.hidden} @change=${() => { this.hidden = !this.hidden; }}> Hidden</label>`;
      }
    }
    root.append(el(define('class-map-element', Classed)));
  }, [['check', 'cm-enabled'], ['check', 'cm-hidden'], ['check', 'cm-enabled'], ['check', 'cm-hidden']]);

  example('directive-guard', (root) => {
    const sha = async (message) => {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
      const words = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
      await new Promise((r) => setTimeout(r, 1000));
      return words;
    };
    class Guarded extends LitElement {
      static properties = { value: { state: true }, counter: { state: true } };
      constructor() { super(); this.value = 'test string'; this.counter = 0; }
      render() {
        return html`<h3>guard directive example</h3>
          <input id="value" data-lory="guard-value" .value=${this.value}>
          <button data-lory="guard-calc" @click=${this.take}>Calculate</button><br>
          The SHA for '${this.value}' is:
          <div>${guard([this.value], () => until(sha(this.value), 'Calculating sha...'))}</div>
          <hr>
          Incrementing the counter does not recalculate SHA:<br>
          <button data-lory="guard-inc" @click=${() => { this.counter++; }}>Increment: ${this.counter}</button>`;
      }
      take() { this.value = this.renderRoot.querySelector('#value').value; }
    }
    root.append(el(define('guard-element', Guarded)));
  }, [['wait', 1000], ['press', 'guard-inc'], ['type', 'guard-value', 'hello'], ['press', 'guard-inc'], ['press', 'guard-calc'],
    ['wait', 500], ['press', 'guard-inc'], ['wait', 600]]);

  example('directive-if-defined', (root) => {
    const pictures = { beach: { domain: 'picsum.photos', id: 100 }, river: { domain: 'picsum.photos', id: 1015 }, canyon: { domain: 'picsum.photos', id: 1016 } };
    class Pictured extends LitElement {
      static properties = { imageName: { state: true } };
      constructor() { super(); this.imageName = 'beach'; }
      render() {
        const info = pictures[this.imageName];
        return html`<h3>ifDefined directive example</h3>
          Type one of 'beach', 'river', or 'canyon':<br>
          <input id="name" data-lory="ifd-name" .value=${this.imageName} @input=${this.picked}><hr>
          Using ifDefined (src removed when undefined):<br>
          <img data-lory="ifd-with" data-look="src" src="https://${ifDefined(info?.domain)}/id/${ifDefined(info?.id)}/200/200"><hr>
          Without ifDefined (will 404 when undefined):<br>
          <img data-lory="ifd-without" data-look="src" src="https://${info?.domain}/id/${info?.id}/200/200">`;
      }
      picked() { this.imageName = this.renderRoot.querySelector('#name').value; }
    }
    root.append(el(define('if-defined-element', Pictured)));
  }, [['type', 'ifd-name', 'river'], ['type', 'ifd-name', 'cat'], ['type', 'ifd-name', 'canyon']]);

  example('directive-live', (root) => {
    class Lively extends LitElement {
      static properties = { data: { state: true } };
      constructor() { super(); this.data = { value: 'test' }; }
      render() {
        return html`<h3>live directive example</h3>
          Set this value to the inputs below.<br>
          <input id="value" data-lory="live-source" .value=${this.data.value}>
          <button data-lory="live-commit" @click=${this.commit}>Commit</button><hr>
          With live: will update if out of sync with last rendered value<br>
          <input data-lory="live-with" .value=${live(this.data.value)} placeholder="type here, click commit"><hr>
          Without live: will not update if out of sync with last rendered value<br>
          <input data-lory="live-without" .value=${this.data.value} placeholder="type here, click commit">`;
      }
      commit() { this.data = { ...this.data, value: this.renderRoot.querySelector('#value').value }; }
    }
    root.append(el(define('live-element', Lively)));
  }, [['type', 'live-with', 'typed with'], ['type', 'live-without', 'typed without'], ['press', 'live-commit'],
    ['type', 'live-source', 'new'], ['press', 'live-commit'], ['type', 'live-without', 'again'], ['press', 'live-commit']]);

  example('directive-ref', (root) => {
    const lorem = Array(100).fill(0).map(() => 'Lorem ipsum dolor sit amet.').join(' ');
    class Reffed extends LitElement {
      static styles = css`.scroll { height: 100px; overflow: auto; padding: 10px; border: 1px solid gray; }`;
      constructor() { super(); this.inputRef = createRef(); }
      render() {
        return html`Passing ref directive a Ref object that will hold the element in .value:<br>
          <input data-lory="ref-input" ${ref(this.inputRef)}>
          <hr>
          Passing ref directive a change callback
          <div class="scroll" data-lory="ref-scroll">${lorem}<p ${ref(this.ensureInView)}>Scrolled into view!</p>${lorem}</div>`;
      }
      firstUpdated() { this.inputRef.value.focus(); }
      ensureInView(element) { requestAnimationFrame(() => element.scrollIntoView(true)); }
    }
    root.append(el(define('ref-element', Reffed)));
  }, [['type', 'ref-input', 'hi']]);

  example('directive-repeat', (root) => {
    class Repeated extends LitElement {
      static properties = { items: { state: true } };
      constructor() {
        super();
        this.items = ['Justin', 'Steve', 'Kevin', 'Russell', 'Liz', 'Peter'].map((name, id) => ({ id, name }));
      }
      render() {
        return html`<h3>repeat directive example</h3>
          <button data-lory="rep-up" @click=${() => this.sort(1)}>Sort ascending</button>
          <button data-lory="rep-down" @click=${() => this.sort(-1)}>Sort descending</button><hr>
          With keying (DOM including checkbox state moves with items):
          <ul>${repeat(this.items, (item) => item.id, (item, i) => html`
            <li>${i}: <label><input type="checkbox" data-lory="rk-${item.id}">${item.name}</label></li>`)}</ul><hr>
          Without keying (items are re-used in place, checkbox state does not change):
          <ul>${repeat(this.items, (item, i) => html`
            <li>${i}: <label><input type="checkbox" data-lory="ru-${i}">${item.name}</label></li>`)}</ul>`;
      }
      sort(way) { this.items = [...this.items.sort((a, b) => a.name.localeCompare(b.name) * way)]; }
    }
    root.append(el(define('repeat-element', Repeated)));
  }, [['check', 'rk-1'], ['check', 'ru-1'], ['press', 'rep-up'], ['check', 'rk-4'], ['press', 'rep-down'], ['press', 'rep-up']]);

  example('directive-style-map', (root) => {
    class Styled extends LitElement {
      static properties = { enabled: { type: Boolean }, hidden: { type: Boolean } };
      constructor() { super(); this.enabled = true; this.hidden = false; }
      render() {
        const styles = { backgroundColor: this.enabled ? 'lightgreen' : 'transparent', opacity: this.hidden ? '0.2' : '1', padding: '10px' };
        return html`<h3>styleMap directive example</h3>
          <p data-lory="sm-box" data-look="bg,opacity,pad" style=${styleMap(styles)}>Hello style!</p>
          <hr>
          <label><input type="checkbox" data-lory="sm-enabled" .checked=${this.enabled} @change=${() => { this.enabled = !this.enabled; }}> Enabled</label>
          <label><input type="checkbox" data-lory="sm-hidden" .checked=${this.hidden} @change=${() => { this.hidden = !this.hidden; }}> Hidden</label>`;
      }
    }
    root.append(el(define('style-map-element', Styled)));
  }, [['check', 'sm-enabled'], ['check', 'sm-hidden'], ['check', 'sm-enabled'], ['check', 'sm-hidden']]);

  example('directive-template-content', (root) => {
    const t = document.createElement('template');
    t.innerHTML = '<h3>This is content stamped from an HTML &lt;template&gt;!</h3><img data-lory="tc-picture" data-look="src" src="https://picsum.photos/id/429/200">';
    class Stamped extends LitElement {
      render() { return html`<h3>templateContent directive example</h3> Here's some content from a template element: ${templateContent(t)}`; }
    }
    root.append(el(define('template-content-element', Stamped)));
  }, []);

  example('directive-unsafe-html', (root) => {
    class Marked extends LitElement {
      render() { return html`<h3>unsafeHTML directive example</h3> Look out, potentially unsafe HTML ahead: ${unsafeHTML('<h3>Some HTML to render.</h3>')}`; }
    }
    root.append(el(define('unsafe-html-element', Marked)));
  }, []);

  example('directive-unsafe-svg', (root) => {
    class Drawn extends LitElement {
      render() {
        return html`<h3>unsafeSVG directive example</h3> Look out, potentially unsafe SVG ahead:
          <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" version="1.1">
            ${unsafeSVG('<circle data-lory="usvg-circle" data-look="fill,x,y,w,h" cx="50" cy="50" r="40" fill="red" />')}
          </svg>`;
      }
    }
    root.append(el(define('unsafe-svg-element', Drawn)));
  }, []);

  example('directive-until', (root) => {
    const later = async () => { await new Promise((r) => setTimeout(r, 2000)); return 'Lorem Ipsum'; };
    class Waiting extends LitElement {
      static properties = { content: { state: true } };
      constructor() { super(); this.content = later(); }
      render() { return html`<h3>until directive example</h3> ${until(this.content, html`<span>Loading...</span>`)}`; }
    }
    root.append(el(define('until-element', Waiting)));
  }, [['wait', 1000], ['wait', 1000], ['wait', 1000]]);

  // ---- Managing data

  example('async-task', (root) => {
    const facts = async (name, signal) => {
      await new Promise((r) => setTimeout(r, 1000));
      const response = await fetch(`https://registry.npmjs.org/${name}`, { signal });
      if (response.status === 200) return response.json();
      throw response.text();
    };
    class NpmInfo extends LitElement {
      static properties = { _packageName: { state: true } };
      static styles = css`header { display: flex; justify-content: space-between; } .error { color: red; }`;
      constructor() {
        super();
        this._packageName = 'lit';
        this._task = new Task(this, {
          task: async ([name], { signal }) => (name === undefined || name === '' ? initialState : await facts(name, signal)),
          args: () => [this._packageName],
        });
      }
      render() {
        return html`<label>Enter a package name: <input data-lory="task-name" .value=${this._packageName} @change=${(e) => { this._packageName = e.target.value; }} /></label>
          <header><h1>${this._packageName}</h1><img id="logo" data-lory="task-logo" alt="npm logo" /></header>
          <div>${this._task.render({
            initial: () => html`<span class="initial">Enter a package name to display its npm info</span>`,
            pending: () => html`Loading npm info for <code>${this._packageName}</code>`,
            complete: (pkg) => html`<h3>${pkg.description}</h3><h4>dist-tags:</h4>
              <ul>${map(Object.entries(pkg['dist-tags']), ([tag, version]) => html`<li><pre>${tag}: ${version}</pre></li>`)}</ul>`,
            error: (e) => html`<span class="error" data-lory="task-error" data-look="color">Error: ${e.message}</span>`,
          })}</div>`;
      }
    }
    root.append(el(define('npm-info', NpmInfo)));
  }, [['wait', 500], ['wait', 600], ['type', 'task-name', 'no-such-package'], ['commit', 'task-name'], ['wait', 1100],
    ['type', 'task-name', ''], ['commit', 'task-name'], ['type', 'task-name', 'lit'], ['commit', 'task-name'], ['wait', 400],
    ['type', 'task-name', 'other'], ['commit', 'task-name'], ['wait', 300], ['type', 'task-name', 'lit'], ['commit', 'task-name'], ['wait', 1100]]);

  example('context-basics', (root) => {
    const context = createContext(Symbol('contextKey'));
    class Provider extends LitElement {
      static styles = css`slot { display: block; } :host { display: block; }`;
      static properties = { data: {} };
      constructor() { super(); this._provider = new ContextProvider(this, { context }); this.data = 'Initial'; }
      set data(v) { this._data = v; this._provider?.setValue(v); }
      get data() { return this._data; }
      render() { return html`<h3>Provider's data: <code>${this.data}</code></h3><slot></slot>`; }
    }
    class Consumer extends LitElement {
      constructor() { super(); this._consumer = new ContextConsumer(this, { context }); }
      render() { return html`<h3>Consumer data: <code>${this._consumer.value}</code></h3>`; }
    }
    const provider = define('provider-el', Provider);
    const consumer = define('consumer-el', Consumer);
    root.append(el('h3', { text: 'Basic Context Example' }),
      el('p', {}, [textOf('The '), el('code', { text: '<consumer-el>' }), textOf(' receives its data from '), el('code', { text: '<provider-el>' }), textOf(' without property drilling.')]),
      el('hr'), el(provider, {}, [el(consumer)]), el('hr'), el(provider, { data: 'specified from attribute' }, [el(consumer)]), el('hr'),
      el('p', {}, [textOf('Checkout our '), el('a', { text: 'Context documentation' }), textOf('!')]));
  }, []);

  example('context-consume-provide', (root) => {
    const levelContext = createContext(Symbol('level'));
    const COLORS = ['blue', 'orange', 'green', 'purple'];
    class Heading extends LitElement {
      constructor() { super(); this._level = new ContextConsumer(this, { context: levelContext }); }
      get _tag() {
        const level = this._level.value?.level;
        return typeof level === 'number' && level >= 0 && level <= 5 ? statics.unsafeStatic(`h${level + 1}`) : statics.literal`p`;
      }
      render() {
        return statics.html`<${this._tag} data-lory=${this.getAttribute('n')} data-look="tag,color,align" style=${styleMap({ color: this._level.value?.color })}><slot></slot></${this._tag}>`;
      }
    }
    class Section extends LitElement {
      static styles = css`:host { display: block; text-align: center; }`;
      constructor() {
        super();
        this._provider = new ContextProvider(this, { context: levelContext, initialValue: { level: 0, color: COLORS[0] } });
        this._consumer = new ContextConsumer(this, { context: levelContext, callback: ({ level }) => this._provider.setValue({ level: level + 1, color: COLORS[(level + 1) % COLORS.length] }) });
      }
      render() { return html`<section><slot></slot></section>`; }
    }
    const heading = define('my-heading', Heading);
    const section = define('my-section', Section);
    let n = 0;
    // a section of a heading at its level and the sections under it
    const tree = (level, under) => el(section, {}, [el(heading, { n: `ctx-${n++}`, text: `Heading level ${level}` }), ...under.map((u) => u())]);
    const s = (level, ...under) => () => tree(level, under);
    root.append(el('p', {}, [textOf('Example inspired by: '), el('a', { text: 'https://react.dev/learn/passing-data-deeply-with-context' })]));
    root.append(s(1, s(2), s(2, s(3), s(3, s(4))), s(2, s(3, s(4), s(4))))());
    root.append(s(1, s(2, s(3, s(4, s(5)))), s(2, s(3, s(4))))());
  }, []);

  example('signals', (root) => {
    const count = signal(0);
    class Counter extends SignalWatcher(LitElement) {
      render() {
        return html`<slot></slot><p>count = ${watch(count)}</p>
          <button data-lory=${this.getAttribute('n')} @click=${() => count.set(count.get() + 1)}>Increment</button>`;
      }
    }
    const tag = define('shared-counter', Counter);
    root.append(el(tag, { n: 'sig-inc-1' }, [el('h2', { text: 'Instance 1' })]), el(tag, { n: 'sig-inc-2' }, [el('h2', { text: 'Instance 2' })]));
  }, [['press', 'sig-inc-1'], ['press', 'sig-inc-2'], ['press', 'sig-inc-2']]);

  // ---- @lit/react

  const reactRoot = (root, app) => {
    const holder = el('div');
    root.append(holder);
    ReactDOM.createRoot(holder).render(app);
  };

  example('react-basics', (root) => {
    class Greeting extends LitElement {
      static styles = css`p { display: inline-block; border: solid 1px gray; background: white; padding: 0 1em; }`;
      static properties = { name: {} };
      constructor() { super(); this.name = 'Somebody'; }
      render() { return html`<p data-lory="react-greeting" data-look="border,line,bg,pad">Hello, ${this.name}!</p>`; }
    }
    const Wrapped = createComponent({ react: React, tagName: define('demo-greeting', Greeting), elementClass: Greeting });
    reactRoot(root, React.createElement(Wrapped, { name: 'React' }));
    root.append(el('p', {}, [textOf('Checkout our '), el('a', { text: 'React framework docs' }), textOf('!')]));
  }, []);

  example('react-events', (root) => {
    class Roulette extends LitElement {
      static styles = css`div { display: inline-block; border: solid 1px gray; background: white; padding: 1em; }`;
      static properties = { count: { type: Number }, fired: { type: Boolean }, _loaded: { state: true } };
      constructor() { super(); this.count = 0; this.fired = false; this._loaded = Math.floor(Math.random() * 6) + 1; }
      clicked(e) {
        e.stopPropagation();
        if (++this.count === this._loaded) {
          this.fired = true;
          this.dispatchEvent(new Event('pop', { bubbles: true, composed: true }));
        }
      }
      reset(e) {
        e.stopPropagation();
        this.count = 0;
        this.fired = false;
        this._loaded = Math.floor(Math.random() * 6) + 1;
        this.dispatchEvent(new Event('reset', { bubbles: true, composed: true }));
      }
      render() {
        return html`<div><p>Clicked: ${this.count}</p>
          <button data-lory="roulette-click" @click=${this.clicked} ?disabled=${this.fired}>Click</button>
          <button data-lory="roulette-reset" @click=${this.reset}>Reset</button></div>`;
      }
    }
    const Wrapped = createComponent({ react: React, tagName: define('click-roulette', Roulette), elementClass: Roulette, events: { onPop: 'pop', onReset: 'reset' } });
    const App = () => {
      const [message, setMessage] = React.useState('😬');
      return React.createElement('main', null, React.createElement('h1', null, "Let's play Click Roulette!"),
        React.createElement(Wrapped, { onPop: () => setMessage('🎉'), onReset: () => setMessage('😬') }),
        React.createElement('p', null, message));
    };
    reactRoot(root, React.createElement(App));
  }, [['press', 'roulette-click'], ['press', 'roulette-click'], ['press', 'roulette-click'], ['press', 'roulette-click'],
    ['press', 'roulette-click'], ['press', 'roulette-click'], ['press', 'roulette-reset'], ['press', 'roulette-click'], ['press', 'roulette-click']]);

  example('react-slots', (root) => {
    class Slots extends LitElement {
      static styles = css`:host, slot { border: 4px solid #343434; display: block; padding: 8px; } slot { border-color: cornflowerblue; }`;
      render() { return html`<p>slot="head"</p><slot name="head"></slot><p>default slot</p><slot></slot><p>slot="tail"</p><slot name="tail"></slot>`; }
    }
    const Wrapped = createComponent({ react: React, tagName: define('simple-slots', Slots), elementClass: Slots });
    const e = React.createElement;
    reactRoot(root, e(Wrapped, null,
      e('p', { slot: 'head' }, 'This element will be projected onto the "head" slot.'),
      e('p', { slot: 'tail' }, 'This element will be projected onto the "tail" slot.'),
      e('div', { slot: 'tail' }, 'React Components must be a descendant of an element with a slot attribute otherwise they will be projected onto the default slot.'),
      e('p', null, 'Elements without a slot attribute will be projected onto the default slot.')));
  }, []);

  example('react-refs', (root) => {
    // a player of its own (its pictures are not what is held: its state is)
    class Player extends LitElement {
      static properties = { isPlaying: { state: true } };
      constructor() { super(); this.isPlaying = false; }
      render() {
        return html`<div data-lory="tri-canvas" @click=${this.turn}><canvas height="300" width="300"></canvas>
          <p>${this.isPlaying ? 'click to pause' : 'click to play'}</p></div>`;
      }
      play() { if (this.isPlaying) return; this.isPlaying = true; this.told(); }
      pause() { if (!this.isPlaying) return; this.isPlaying = false; this.told(); }
      turn() { this.isPlaying ? this.pause() : this.play(); }
      told() { this.dispatchEvent(new Event('playing-change', { composed: true })); }
    }
    const Wrapped = createComponent({ react: React, tagName: define('flying-triangles', Player), elementClass: Player, events: { onPlayingChange: 'playing-change' } });
    const App = () => {
      const r = React.useRef(null);
      const [playing, setPlaying] = React.useState(false);
      return React.createElement(React.Fragment, null,
        React.createElement(Wrapped, { ref: r, onPlayingChange: () => setPlaying(!!r.current?.isPlaying) }),
        React.createElement('button', { 'data-lory': 'tri-play', disabled: playing, onClick: () => r.current?.play() }, 'play'),
        React.createElement('button', { 'data-lory': 'tri-pause', disabled: !playing, onClick: () => r.current?.pause() }, 'pause'));
    };
    reactRoot(root, React.createElement(App));
  }, [['press', 'tri-play'], ['press', 'tri-pause'], ['press', 'tri-canvas'], ['press', 'tri-canvas']]);

  // ---- @lit-labs/motion

  // the springy curve the hero's moves take (Lory's own: a spring settling
  // past its mark and back, 27 steps), as its `onFrames` writes them
  const SPRINGY = Array.from({ length: 27 }, (_, k) => {
    const x = k / 26;
    return Math.round((1 - Math.exp(-6 * x) * Math.cos(8 * x)) * 10000) / 10000;
  });

  example('motion-circle', (root) => {
    class Slide extends LitElement {
      static properties = { slid: { type: Boolean } };
      static styles = css`
        .circle { position: relative; background: steelblue; --box-size: 25vw; height: var(--box-size); width: var(--box-size); border-radius: 50%; }
        .slid { left: calc(100% - var(--box-size)); }`;
      constructor() { super(); this.slid = false; }
      render() {
        return html`<p><button data-lory="slide" @click=${() => { this.slid = !this.slid; }}>Slide</button></p>
          <p data-lory="circle" class="circle ${classMap({ slid: this.slid })}" ${animate()}></p>`;
      }
    }
    root.append(el(define('motion-slide', Slide)));
  }, [['press', 'slide'], ['wait', 100], ['wait', 100], ['wait', 200], ['press', 'slide'], ['wait', 150], ['press', 'slide'], ['wait', 400]],
  { motion: true, rects: 'xwh' });

  example('motion-logo', (root) => {
    class Logo extends LitElement {
      static properties = { letters: { type: Array } };
      static styles = css`:host { display: flex; height: 100%; width: 100%; align-items: center; position: relative; overflow: hidden; cursor: pointer; }
        .letter { flex: 1; font-size: 30vw; text-align: center; }`;
      constructor() {
        super();
        this.lit = ['L', 'I', 'T'];
        this.letters = this.lit;
        this.duration = 1000;
        this.controller = new AnimateController(this, { defaultOptions: { keyframeOptions: { duration: this.duration, fill: 'backwards' } }, onComplete: () => this.changeLayout() });
        this.addEventListener('click', () => this.pressed());
      }
      render() {
        const delay = this.duration / (this.letters.length * 2.5);
        return html`${this.letters?.map((letter, i) => html`<span class="letter" data-lory="letter-${i}"
          ${animate({ keyframeOptions: { delay: i * delay }, in: fade, out: flyBelow })}>${letter}</span>`)}`;
      }
      pressed() { if (this.controller.isAnimating) this.controller.togglePlay(); else this.changeLayout(); }
      changeLayout() { this.letters = this.letters.length ? [] : this.lit; }
    }
    root.append(el(define('motion-lit', Logo), { style: 'display: flex; height: 600px' }));
  }, [['wait', 500], ['wait', 800], ['press', 'letter-1'], ['wait', 300], ['press', 'letter-1'], ['wait', 700], ['wait', 1500], ['wait', 1000]],
  { motion: true });

  example('motion-list', (root) => {
    class List extends LitElement {
      static styles = css`:host { display: flex; height: 600px; width: 100%; align-items: center; justify-content: center; position: relative; overflow: hidden; }
        ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; } .row { flex-direction: row; }
        li { text-align: center; flex: 1; background: #ef5350; padding: 16px; border: 4px solid #b61827; border-radius: 8px; margin: 8px; min-width: 100px; }`;
      static properties = { list: { state: true }, row: { state: true }, count: { state: true } };
      constructor() {
        super();
        this.data = ['One', 'Two', 'Three', 'Four', 'Five'].map((value) => ({ value }));
        this.list = this.data;
        this.row = false;
        this.count = 0;
        this.duration = 500;
      }
      render() {
        return html`<ul class="tabs ${classMap({ row: this.row })}">${repeat(this.list, (i) => i, (item, i) => html`<li data-lory="item-${item.value}"
          ${animate({ keyframeOptions: { duration: this.duration, delay: (i * this.duration) / this.list.length, fill: 'both' }, in: fadeIn, out: flyBelow,
            onComplete: i === this.list.length - 1 ? () => this.changeLayout() : undefined })}>${item.value}</li>`)}</ul>`;
      }
      async changeLayout() {
        await new Promise(requestAnimationFrame);
        this.count++;
        if (this.count % this.data.length === 0) {
          this.list = [];
        } else {
          this.row = !this.row;
          this.list = this.data.slice().sort(() => 0.5 - Math.random());
          window.__orders.push(this.list.map((i) => i.value).join(','));
        }
      }
    }
    window.__orders = [];
    root.append(el(define('motion-list', List)));
  }, [['wait', 300], ['wait', 700], ['wait', 400], ['wait', 600], ['wait', 1000], ['wait', 1000], ['wait', 1000], ['wait', 1500], ['wait', 1000]],
  { motion: true });

  example('motion-grid', (root) => {
    class Grid extends LitElement {
      static properties = { layout: { state: true } };
      static styles = css`
        .container { display: grid; height: 600px; width: 800px; }
        .container.layout0 { grid-template-areas: 'a a a a a a' 'b c c c c d' 'b c c c c d' 'b c c c c d' 'b c c c c d' 'b c c c c d' 'e e e e e e'; }
        .container.layout2 { grid-template-areas: 'b a a a a d' 'b c c c c d' 'b c c c c d' 'b c c c c d' 'b c c c c d' 'b c c c c d' 'b e e e e d'; }
        .container.layout1 { grid-template-areas: 'a a c c c c' 'a a c c c c' 'a a d d d d' 'b b d d d d' 'b b e e e e' 'b b e e e e'; }
        .container.layout3 { grid-template-areas: 'a a a a c c' 'a a a a c c' 'a a a a d d' 'b b b b d d' 'b b b b e e' 'b b b b e e'; }
        .item0 { grid-area: a; background: #002171; } .item1 { grid-area: b; background: #5472d3; } .item2 { grid-area: c; background: #e1e2e1; }
        .item3 { grid-area: d; background: #7f0000; } .item4 { grid-area: e; background: #560027; }
        .message { position: absolute; top: 1em; left: 1em; color: #aaa; font-style: italic; font-weight: bold; font-size: 2em; }`;
      constructor() { super(); this.layout = 0; }
      render() {
        const d = 1000;
        const cells = Array(5).fill(null, 0);
        return html`<section data-lory="grid" @click=${() => { this.layout = (this.layout + 1) % (cells.length - 1); }} class="container layout${this.layout}">
          ${cells.map((v, i) => html`<div class="item${i}" data-lory="cell-${i}" ${animate({ keyframeOptions: { delay: (i * d) / (cells.length * 2), duration: d, fill: 'both' } })}></div>`)}
          </section><span class="message">click</span>`;
      }
    }
    root.append(el(define('motion-grid', Grid)));
  }, [['press', 'cell-2'], ['wait', 250], ['wait', 500], ['wait', 1300], ['press', 'cell-0'], ['wait', 600], ['press', 'cell-4'], ['wait', 2000],
    ['press', 'cell-1'], ['wait', 2000]],
  { motion: true, rects: 'xywh' });

  example('motion-carousel', (root) => {
    class Carousel extends LitElement {
      static properties = { selected: { type: Number } };
      static styles = css`
        .container { display: flex; align-items: center; justify-content: center; --size: 400px; width: calc(var(--size) + 80px); gap: 8px;
          border-radius: 8px; padding: 8px; overflow: hidden; border: 4px solid #002071; background: #e1e2e1; }
        .card { background: #e1e2e1; border-radius: 8px; border: 1px solid #002071; height: var(--size); min-width: var(--size); padding: 8px;
          display: flex; align-items: center; justify-content: center; color: white; font-size: var(--size); cursor: pointer; user-select: none; line-height: 1; overflow: hidden; }`;
      constructor() { super(); this.selected = 0; this.data = Array(7).fill(null, 0); }
      render() {
        return html`<section class="container">${this.data.map((_v, i) => {
          const count = this.data.length;
          const center = Math.trunc(count / 2);
          const order = (count + center + i - this.selected) % count;
          const zIndex = order === 0 || order === count - 1 ? -1 : 1;
          const fraction = i / this.data.length;
          return html`<div data-lory="card-${i}" @click=${order < center ? this.dec : this.inc}
            style=${styleMap({ order: String(order), zIndex: String(zIndex), background: `hsl(${Math.trunc(360 * fraction)}, ${20 + Math.trunc(60 * fraction)}%, ${30 + Math.trunc(30 * fraction)}%)` })}
            class="card" ${animate()}>${i}</div>`;
        })}</section>`;
      }
      shift(i) { const last = this.data.length - 1; return i > last ? 0 : i < 0 ? last : i; }
      dec() { this.selected = this.shift(this.selected - 1); }
      inc() { this.selected = this.shift(this.selected + 1); }
    }
    root.append(el(define('motion-carousel', Carousel)));
  }, [['press', 'card-4'], ['wait', 100], ['wait', 100], ['wait', 200], ['press', 'card-0'], ['wait', 400], ['press', 'card-3'], ['wait', 150],
    ['press', 'card-5'], ['wait', 400]],
  { motion: true, rects: 'xywh', mountedIn: 'center' });

  example('motion-hero', (root) => {
    const items = [['Cats', 'Cats are the very best pets.'], ['Dogs', 'Dogs have a lot of energy.'], ['Hippos', 'Hippos are very fat and mean.'],
      ['Elephants', 'Elephants are really huge.'], ['Mosquitoes', 'Mosquitoes bite you.'], ['Snakes', 'Snakes are pretty scary.'],
      ['Frogs', 'Frogs are amphibious.'], ['Alligators', 'Alligators sneak up on you.'], ['Cows', 'Cows make good hamburgers.']].map(([value, summary], id) => ({ id, value, summary }));
    const onFrames = (a) => {
      const { animatingProperties: props, frames } = a;
      if (frames === undefined || props === undefined) return frames;
      return [frames[0], ...SPRINGY.map((v) => {
        const x = props.left ? `translateX(${props.left * (1 - v)}px)` : '';
        const y = props.top ? `translateY(${props.top * (1 - v)}px)` : '';
        const sx = props.width ? `scaleX(${props.width + (1 - props.width) * v})` : '';
        const sy = props.height ? `scaleY(${props.height + (1 - props.height) * v})` : '';
        return { transform: `${x} ${y} ${sx} ${sy}` };
      }), frames[1]];
    };
    class Hero extends LitElement {
      static properties = { data: { type: Array }, detail: { state: true } };
      static styles = css`
        :host { display: flex; color: #040424; height: 600px; overflow: hidden; justify-content: center; }
        * { box-sizing: border-box; }
        .fit { position: absolute; inset: 0; }
        .icon { font-style: normal; color: #29434e; }
        .divider { border-bottom: 2px solid #29434e; } .divider-top { border-top: 2px solid #29434e; }
        .container { width: 800px; position: relative; }
        .cards { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; }
        li { position: relative; overflow: hidden; display: flex; flex-direction: column; flex: 1; flex-basis: 30%; cursor: pointer; margin: 8px; padding: 16px;
          border-radius: 8px; background: #546e7a; color: white; }
        .card-background { border-radius: 8px; border: 8px solid #29434e; }
        .card-icon { font-size: 9em; text-align: center; margin: 8px 0; }
        .card-content { flex: 1; display: flex; align-items: center; justify-content: center; }
        .card-header { padding-top: 8px; min-height: 40px; }
        .detail { display: flex; flex-direction: column; flex: 1; color: black; margin: 8px; padding: 16px; overflow: hidden; background: #819ca9; border-radius: 8px; border: 8px solid #29434e; }
        .detail-header { display: flex; align-items: center; }
        .hero-text { display: inline-block; width: 218px; }
        .detail-header-text { margin-left: 8px; }
        .detail-header-icon { font-size: 3em; min-width: 48px; }
        .detail-content { padding: 16px; font-size: 1.1em; line-height: 200%; }`;
      constructor() {
        super();
        this.data = items;
        this.controller = new AnimateController(this, { defaultOptions: { keyframeOptions: { duration: 750, fill: 'both' }, onFrames } });
      }
      render() {
        const d = this.detail;
        return html`<div class="container"><ul class="cards fit">${repeat(d ? [] : this.data, (i) => i, (i) => html`<li data-lory="card-${i.id}"
            @click=${(e) => this.pressed(e, i)} ${animate({ out: fadeOut, id: `${i.id}:card`, inId: `${i.id}:detail` })}>
            <div class="card-background fit" data-lory="card-${i.id}-bg" ${animate({ in: fadeInSlow, skipInitial: true })}></div>
            <div class="card-content"><div class="icon card-icon" data-lory="card-${i.id}-icon" ${animate({ id: `${i.id}:card-icon`, inId: `${i.id}:detail-icon`, skipInitial: true })}>pets</div></div>
            <div class="divider" data-lory="card-${i.id}-divider" ${animate({ in: fadeInSlow, skipInitial: true })}></div>
            <div class="card-header hero-text"><div data-lory="card-${i.id}-header" ${animate({ id: `${i.id}:card-header`, inId: `${i.id}:detail-header`, skipInitial: true })}>
              <div class="card-header-title">${i.value}</div><div>${i.summary}</div></div></div></li>`)}</ul>
          ${d ? html`<div class="detail fit" data-lory="detail" @click=${this.pressed} ${animate({ id: `${d.id}:detail`, inId: `${d.id}:card` })}>
            <div class="detail-header"><div class="icon detail-header-icon" data-lory="detail-icon" ${animate({ id: `${d.id}:detail-icon`, inId: `${d.id}:card-icon` })}>pets</div>
              <div class="detail-header-text hero-text" data-lory="detail-header" ${animate({ id: `${d.id}:detail-header`, inId: `${d.id}:card-header` })}>
                <div>${d.value}</div><div>${d.summary}</div></div></div>
            <div class="detail-content divider-top" data-lory="detail-content" ${animate({ in: fadeInSlow })}>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.</div>
          </div>` : ''}</div>`;
      }
      pressed(e, item) { if (this.controller.isAnimating) this.controller.togglePlay(); else this.detail = item; }
    }
    root.append(el(define('motion-hero', Hero)));
  }, [['press', 'card-2-icon'], ['wait', 100], ['wait', 200], ['press', 'detail-header'], ['wait', 200], ['press', 'detail'], ['wait', 500],
    ['press', 'detail-content'], ['wait', 150], ['wait', 650], ['press', 'card-4'], ['wait', 900]],
  { motion: true });

  example('motion-todos', (root) => {
    const first = [['Go running.', false], ['Strength training', true], ['Walk with friends.', false], ['Feed the cats.', true],
      ['Shop for dinner.', false], ['Order clothes.', false], ['BBQ!', false]].map(([value, completed], k) => ({ id: k + 1, value, completed }));
    class Todos extends LitElement {
      static styles = css`:host { display: inline-block; padding: 8px; width: 600px; } .lists { display: flex; } .list { flex: 1; } ul { margin: 0; padding: 0; }
        li { position: relative; background: #ffeb3b; padding: 8px; border-radius: 12px; margin: 8px; display: flex; align-items: center; }
        li > button { border: none; background: none; font-size: 12px; } li > label { flex: 1; } .list.completed li { background: #4caf50; }`;
      static properties = { data: { type: Array } };
      constructor() { super(); this.data = first; }
      addItem() {
        const field = this.renderRoot.querySelector('input[type=text]');
        if (!field.value) return;
        const next = this.data[this.data.length - 1].id + 1;
        this.data = [...this.data, { id: next, value: field.value, completed: false }];
        field.value = '';
      }
      removeItem(item) { this.data = this.data.filter((i) => i != item); }
      updateItem(item, completed) { this.data = this.data.map((i) => { if (item === i) item.completed = completed; return i; }); }
      render() {
        const keyframeOptions = { duration: 500, fill: 'both' };
        const list = (completed = false) => html`<div class="list ${classMap({ completed })}"><h3>${completed ? 'Completed' : 'Todos'}</h3>
          <ul>${repeat(this.data.filter((item) => (completed ? item.completed : !item.completed)), (item) => item.id, (item) => html`<li
            data-lory="todo-${item.id}-${completed ? 'right' : 'left'}"
            ${animate({ keyframeOptions, in: flyBelow, out: fadeOut, stabilizeOut: true, id: `${item.id}:${completed ? 'right' : 'left'}`,
              inId: `${item.id}:${completed ? 'left' : 'right'}`, skipInitial: true })}>
            <label><input type="checkbox" data-lory="todo-${item.id}-check" ?checked=${completed} @change=${(e) => this.updateItem(item, e.target.checked)}>${item.id}. ${item.value}</label><button
              data-lory="todo-${item.id}-remove" @click=${() => this.removeItem(item)}>remove_circle_outline</button></li>`)}</ul></div>`;
        return html`<input type="text" data-lory="todo-text" placeholder="Enter a todo...">
          <div class="controls"><button data-lory="todo-add" @click=${this.addItem}>Add Todo</button></div>
          <div class="lists">${list()} ${list(true)}</div>`;
      }
    }
    root.append(el(define('motion-todos', Todos)));
  }, [['check', 'todo-1-check'], ['wait', 100], ['wait', 150], ['wait', 300], ['press', 'todo-3-remove'], ['wait', 250], ['wait', 300],
    ['type', 'todo-text', 'Water the plants.'], ['press', 'todo-add'], ['wait', 200], ['wait', 400], ['check', 'todo-2-check'], ['wait', 600]],
  { motion: true });

  // ---- the documentation's own

  example('docs-events', (root) => {
    class Child extends LitElement {
      render() { return html`<button data-lory="ev-child" @click=${() => this.dispatchEvent(new CustomEvent('increment', { bubbles: true, composed: true }))}>Increment</button>`; }
    }
    class Shown extends LitElement {
      static properties = { count: { type: Number } };
      render() { return html`Count: ${this.count}`; }
    }
    const child = statics.unsafeStatic(define('count-button', Child));
    const shownTag = statics.unsafeStatic(define('count-shown', Shown));
    class Parent extends LitElement {
      static properties = { count: { state: true } };
      constructor() { super(); this.count = 0; }
      render() {
        return statics.html`<h3>Events up, properties down</h3>
          <p>The button is a child component and the count its sibling: the child tells its parent, and the parent hands the count down.</p>
          <div @increment=${() => { this.count++; }}><${child}></${child}> <${shownTag} .count=${this.count}></${shownTag}></div>`;
      }
    }
    root.append(el(define('events-parent', Parent)));
  }, [['press', 'ev-child'], ['press', 'ev-child'], ['press', 'ev-child']]);

  example('docs-clock', (root) => {
    class Clock {
      constructor(host, every = 1000) { this.host = host; this.every = every; this.value = new Date(); host.addController(this); }
      hostConnected() { this._timer = setInterval(() => { this.value = new Date(); this.host.requestUpdate(); }, this.every); }
      hostDisconnected() { clearInterval(this._timer); this._timer = undefined; }
    }
    class Ticking extends LitElement {
      constructor() { super(); this.clock = new Clock(this); }
      render() { return html`Time: ${this.clock.value.toLocaleTimeString('en-US')}`; }
    }
    const ticking = statics.unsafeStatic(define('my-clock', Ticking));
    class Page extends LitElement {
      static properties = { hidden: { state: true } };
      constructor() { super(); this.hidden = false; }
      render() {
        return statics.html`<h3>A clock kept by a controller</h3>
          ${this.hidden ? '' : statics.html`<p><${ticking}></${ticking}></p>`}
          <button data-lory="clock-toggle" @click=${() => { this.hidden = !this.hidden; }}>${this.hidden ? 'Show clock' : 'Hide clock'}</button>`;
      }
    }
    root.append(el(define('clock-page', Page)));
  }, [['wait', 1000], ['wait', 1500], ['press', 'clock-toggle'], ['wait', 2300], ['press', 'clock-toggle'], ['wait', 900], ['wait', 200], ['wait', 1000]]);

  example('docs-batching', (root) => {
    class Batched extends LitElement {
      static properties = { a: { type: Number }, b: { type: Number }, frozen: { type: Boolean } };
      constructor() { super(); this.a = 0; this.b = 0; this.frozen = false; this.renders = 0; }
      shouldUpdate() { return !this.frozen; }
      render() {
        this.renders++;
        return html`<h3>Changes batched into one update</h3><p>a = ${this.a}, b = ${this.b}</p><p>Updates: ${this.renders}</p>
          <button data-lory="batch-both" @click=${() => { this.a++; this.b++; }}>Set both</button>
          <button data-lory="batch-freeze" @click=${() => { this.frozen = !this.frozen; }}>${this.frozen ? 'Thaw' : 'Freeze'}</button>`;
      }
    }
    root.append(el(define('batched-element', Batched)));
  }, [['press', 'batch-both'], ['press', 'batch-both'], ['press', 'batch-freeze'], ['press', 'batch-both'], ['press', 'batch-both'],
    ['press', 'batch-freeze'], ['press', 'batch-both']]);

  example('docs-slots', (root) => {
    class Slotted extends LitElement {
      render() { return html`<div><slot>Fallback content</slot></div>`; }
    }
    const tag = define('fallback-slot', Slotted);
    const holder = el(tag, {}, [el('span', { text: 'Slotted child' })]);
    const button = el('button', { 'data-lory': 'slot-toggle', text: 'Remove child' });
    button.addEventListener('click', () => {
      if (holder.firstChild) { holder.firstChild.remove(); button.textContent = 'Add child'; }
      else { holder.append(el('span', { text: 'Slotted child' })); button.textContent = 'Remove child'; }
    });
    root.append(el('h3', { text: 'A slot and its fallback' }), holder, button);
  }, [['press', 'slot-toggle'], ['press', 'slot-toggle'], ['press', 'slot-toggle']]);

  example('docs-localize', async (root) => {
    // the Spanish templates, loaded a tenth of a second after they are asked
    // for, as a locale module fetched over the network would be
    const spanish = { greeting: '¡Hola, Mundo!' };
    const { getLocale, setLocale } = localize.configureLocalization({
      sourceLocale: 'en', targetLocales: ['es'],
      loadLocale: () => new Promise((r) => setTimeout(() => r({ templates: spanish }), 100)),
    });
    let status = 'ready';
    window.addEventListener('lit-localize-status', (e) => {
      status = e.detail.status === 'loading' ? `loading ${e.detail.loadingLocale}` : e.detail.status;
    });
    class Localized extends LitElement {
      constructor() { super(); localize.updateWhenLocaleChanges(this); }
      connectedCallback() {
        super.connectedCallback();
        this._told = () => this.requestUpdate();
        window.addEventListener('lit-localize-status', this._told);
      }
      render() {
        return html`<h3>${localize.msg('Hello, World!', { id: 'greeting' })}</h3><p>Locale: ${getLocale()} (${status})</p>
          <button data-lory="loc-en" @click=${() => setLocale('en')}>English</button>
          <button data-lory="loc-es" @click=${() => setLocale('es')}>Español</button>`;
      }
    }
    root.append(el(define('localized-element', Localized)));
  }, [['press', 'loc-es'], ['wait', 50], ['wait', 60], ['press', 'loc-en'], ['wait', 10], ['press', 'loc-es'], ['wait', 150]]);

  // ------------------------------------------------ run each

  const found = {};
  let seed = 7;
  for (const c of cases) {
    document.documentElement.setAttribute('data-at', c.name);
    C.begin(seed++);
    started = [];
    held = [];
    const root = el('div', { class: 'example' });
    if (c.mountedIn === 'center') root.setAttribute('style', 'display: flex; justify-content: center; align-items: center; height: 600px; width: 800px');
    document.body.replaceChildren(root);
    await c.mount(root);
    await settle();
    const steps = [{ do: ['open'], at: 0, facts: factsOf(root) }];
    const samples = [];
    if (c.motion) samples.push({ at: 0, seen: seenOf(root) });
    for (const step of c.steps) {
      await act(root, step);
      steps.push({ do: step, at: C.now, facts: factsOf(root) });
      if (c.motion) samples.push({ at: C.now, seen: seenOf(root) });
    }
    const out = { draws: C.draws.slice(), steps };
    if (c.motion) {
      out.started = started.slice();
      out.samples = samples;
      if (c.name === 'motion-list') out.orders = window.__orders.slice();
      if (c.rects) {
        await advance(5000);
        out.rects = rectsOf(root);
        out.compared = c.rects;
      }
    }
    found[c.name] = out;
    document.body.replaceChildren();
    await settle();
  }
  document.body.append(Object.assign(document.createElement('pre'), { id: 'out', textContent: JSON.stringify(found) }));
}

// ---------------------------------------------------------------- run

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lory-lit-'));
try {
  const html = path.join(tmp, 'reference.html');
  const pageText = `<!doctype html><html lang="en-US"><head><meta charset="utf-8">
<style>body { margin: 8px; font-family: sans-serif; font-size: 16px; } </style>
<script>window.__realTimeout = window.setTimeout.bind(window); (${clock.toString()})();</script>
<script src="${at('react/umd/react.production.min.js')}"></script>
<script src="${at('react-dom/umd/react-dom.production.min.js')}"></script>
<script type="importmap">${JSON.stringify({ imports })}</script>
</head><body>
<script type="module">(${page.toString()})(${JSON.stringify(NPM)}).catch((e) => {
  document.body.append(Object.assign(document.createElement('pre'), { id: 'out', textContent: JSON.stringify({ failed: String(e && e.stack || e) }) }));
});</script>
</body></html>`;
  fs.writeFileSync(html, pageText);
  // the page run (again, up to three times, where Chrome closed before it
  // wrote its findings out: it does so now and then on a busy machine)
  const run = () => {
    fs.rmSync(path.join(tmp, 'profile'), { recursive: true, force: true });
    try {
      return execFileSync(CHROME, ['--headless=new', '--allow-file-access-from-files', '--user-data-dir=' + path.join(tmp, 'profile'),
        '--window-size=800,600', '--lang=en-US', '--host-resolver-rules=MAP * ~NOTFOUND', '--no-first-run', '--no-default-browser-check',
        '--virtual-time-budget=600000', '--dump-dom', pathToFileURL(html).href],
        { encoding: 'utf8', timeout: 600000, maxBuffer: 256 << 20, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, TZ: 'UTC' } });
    } catch (e) {
      // Chrome may stop with an error as it closes after writing the page out
      return e.stdout || '';
    }
  };
  let dom = '';
  for (let attempt = 0; attempt < 3 && !dom.includes('<pre id="out">'); attempt++) dom = run();
  const start = dom.indexOf('<pre id="out">');
  if (start < 0) throw new Error('the page wrote nothing out (it stood at ' + (/data-at="([^"]*)"/.exec(dom) || [])[1] + ')');
  const from = start + '<pre id="out">'.length;
  const text = dom.slice(from, dom.indexOf('</pre>', from)).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  const examples = JSON.parse(text);
  if (examples.failed) throw new Error('the page failed: ' + examples.failed);
  const reference = { versions, npm: NPM, examples };
  fs.writeFileSync(path.join(HERE, 'reference.json'), JSON.stringify(reference, null, 1) + '\n');
  console.log(`wrote ${Object.keys(examples).length} examples to tests/lit/reference.json`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
