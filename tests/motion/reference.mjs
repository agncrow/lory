// Lory's motion, held to the libraries it follows.
//
// This script runs the real libraries on fixed inputs and writes
// reference.json beside itself; tests/motion/reference.co holds
// packages/lory/motion.co to every number in it.
//
// Pinned versions (installed into a scratch folder, never system-wide):
//   animejs 4.5.0
//   motion 14.7.1 (with motion-dom 14.7.1, motion-utils 14.7.0,
//     framer-motion 14.7.1, which it installs)
//   aos 2.3.4 (its easing names and cubic-béziers are read from
//     aos/dist/aos.css)
//
//   npm install --prefix <scratch>/ref --ignore-scripts animejs@4.5.0 motion@14.7.1 aos@2.3.4
//   node tests/motion/reference.mjs <scratch>/ref/node_modules
//
// Where a library draws on Math.random (anime's irregular easing, motion's
// random stagger), Math.random is given, while that call runs, the same
// seeded sequence Lory draws from (anime's createSeededRandom before its
// scaling), so the numbers can be held.

import { readFileSync, writeFileSync } from 'node:fs';

const ref = process.argv[2];
if (!ref) {
  console.error('usage: node reference.mjs <folder holding node_modules of the pinned libraries>');
  process.exit(2);
}
const anime = await import(ref + '/animejs/dist/modules/index.js');
const motion = await import(ref + '/motion/dist/es/index.mjs');
const scroll = await import(ref + '/framer-motion/dist/es/render/dom/scroll/offsets/index.mjs');
const css = readFileSync(ref + '/aos/dist/aos.css', 'utf8');
const versions = {};
for (const p of ['animejs', 'motion', 'motion-dom', 'motion-utils', 'framer-motion', 'aos']) {
  versions[p] = JSON.parse(readFileSync(ref + '/' + p + '/package.json', 'utf8')).version;
}

// the seeded sequence: anime's createSeededRandom, unscaled
const seeded = seed => {
  let t = seed;
  return () => {
    t += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};
const withRandom = (seed, f) => {
  const kept = Math.random;
  Math.random = seeded(seed);
  try { return f(); } finally { Math.random = kept; }
};

const times = Array.from({ length: 21 }, (_, i) => i / 20);
const eases = [];
const curve = (name, f) => eases.push({ name, values: times.map(t => f(t)) });

// ---- anime's named easings, as its parser reads a name ----
const families = ['', 'Quad', 'Cubic', 'Quart', 'Quint', 'Sine', 'Circ', 'Expo', 'Bounce', 'Back', 'Elastic'];
const turns = ['in', 'out', 'inOut', 'outIn'];
curve('linear', anime.eases.linear);
curve('none', anime.eases.none);
for (const turn of turns) {
  for (const family of families) {
    const name = turn + family;
    const takes = family === '' || family === 'Back' || family === 'Elastic';
    curve(name, takes ? anime.eases[name]() : anime.eases[name]);
  }
}
const animeNamed = text => {
  const open = text.indexOf('(');
  const name = text.slice(0, open);
  const args = text.slice(open + 1, -1).split(',');
  return anime.eases[name](...args);
};
for (const text of ['in(3)', 'out(3)', 'inOut(3)', 'outIn(3)', 'in(0.5)', 'out(1.2)', 'inOut(2.5)',
  'inBack(2.5)', 'outBack(1.70158)', 'inOutBack(3)', 'outInBack(.5)',
  'inElastic(2, .5)', 'outElastic(1, .3)', 'inOutElastic(1.5, .4)', 'outInElastic(1, .3)',
  'outElastic(0.5, 3)', 'inElastic(12, 0)']) {
  curve(text, animeNamed(text));
}
// anime's functions
for (const p of [[.6, -.28, .735, .045], [.25, .1, .25, 1], [.68, -.55, .265, 1.55], [.17, .67, .83, .67], [0.5, 0, 0.5, 1], [.2, .2, .8, .8], [0, 0, 1, 1], [.9, .1, .1, .9]]) {
  curve('cubicBezier(' + p.join(', ') + ')', anime.cubicBezier(...p));
}
for (const [n, fromStart] of [[10, undefined], [4, undefined], [4, true], [3, false], [1, undefined], [7, true]]) {
  const text = fromStart === undefined ? 'steps(' + n + ')' : 'steps(' + n + ', ' + fromStart + ')';
  curve(text, anime.steps(n, fromStart));
}
const linears = [
  [0, 1],
  [0, 0.25, 1],
  [0, '0.25 25%', '0.8 50%', 1],
  [0, 0.6, 0.2, 1],
  [1, '0 30%', '0.5 60%', 0.25],
  [0, 0.5, '0.5 75%', 1],
];
for (const pts of linears) curve('linear(' + pts.join(', ') + ')', anime.linear(...pts));
for (const [length, randomness, seed] of [[10, 1, 0], [6, 0.5, 42], [20, 1, 7], [4, 0, 3]]) {
  const f = withRandom(seed, () => anime.irregular(length, randomness));
  curve('irregular(' + length + ', ' + randomness + ', ' + seed + ')', f);
}

// ---- motion's named easings ----
const motionNamed = ['easeIn', 'easeOut', 'easeInOut', 'circIn', 'circOut', 'circInOut', 'backIn', 'backOut', 'backInOut', 'anticipate'];
for (const name of motionNamed) curve(name, motion[name]);
// CSS's keywords and cubic-bezier(), solved as motion solves a bézier
const cssWords = { 'ease': [.25, .1, .25, 1], 'ease-in': [.42, 0, 1, 1], 'ease-out': [0, 0, .58, 1], 'ease-in-out': [.42, 0, .58, 1] };
for (const word in cssWords) curve(word, motion.cubicBezier(...cssWords[word]));
for (const p of [[.6, -.28, .735, .045], [.17, .67, .83, .67], [.68, -.55, .265, 1.55], [0, 0, 1, 1], [1, 0, 0, 1], [.33, 1.53, .69, .99], [.9, .1, .1, .9]]) {
  curve('cubic-bezier(' + p.join(', ') + ')', motion.cubicBezier(...p));
}
// AOS's easing names, read from its stylesheet
const aos = [];
const rule = /\[data-aos-easing=([a-z-]+)\][^{]*\{transition-timing-function:([^}]+)\}/g;
for (const m of css.matchAll(rule)) {
  const name = m[1];
  const value = m[2].trim();
  let p;
  if (value.startsWith('cubic-bezier(')) p = value.slice(13, -1).split(',').map(Number);
  else p = cssWords[value];
  aos.push({ name, value });
  if (!eases.some(e => e.name === name)) curve(name, motion.cubicBezier(...p));
}

// ---- anime's springs, as easings ----
const animeSprings = [];
const animeSpring = (text, params) => {
  const s = anime.spring(params);
  animeSprings.push({
    name: text, stiffness: s.s, damping: s.d, mass: s.m, velocity: s.v,
    settling: s.settlingDuration, solver: s.solverDuration,
    values: times.map(t => s.ease(t)),
  });
};
animeSpring('spring()', {});
animeSpring('spring(1, 100, 10, 0)', { mass: 1, stiffness: 100, damping: 10, velocity: 0 });
animeSpring('spring(2, 200, 15, 3)', { mass: 2, stiffness: 200, damping: 15, velocity: 3 });
animeSpring('spring(1, 100, 20, 0)', { mass: 1, stiffness: 100, damping: 20, velocity: 0 });
animeSpring('spring(1, 50, 30, 0)', { mass: 1, stiffness: 50, damping: 30, velocity: 0 });
animeSpring('spring(1, 80, 5, -2)', { mass: 1, stiffness: 80, damping: 5, velocity: -2 });
animeSpring('springBounce(0.5, 628)', { bounce: 0.5 });
animeSpring('springBounce(0.2, 400)', { bounce: 0.2, duration: 400 });
animeSpring('springBounce(-0.5, 800)', { bounce: -0.5, duration: 800 });
animeSpring('springBounce(0.5, 300)', { duration: 300 });
animeSpring('springBounce(0, 500)', { bounce: 0, duration: 500 });

// ---- motion's springs, sampled every 16 ms until at rest ----
const springs = [];
const sampled = (g, until = 10000) => {
  const out = [];
  for (let t = 0; t <= until; t += 16) {
    const v = g.velocity(t);
    const s = g.next(t);
    out.push([t, s.value, v, s.done ? 1 : 0]);
    if (s.done) break;
  }
  return out;
};
const motionSpring = (c) => {
  const options = { keyframes: [c.from, c.to] };
  if (c.form === 'physics') Object.assign(options, { stiffness: c.stiffness, damping: c.damping, mass: c.mass, velocity: c.velocity });
  if (c.form === 'duration') Object.assign(options, { duration: c.duration, bounce: c.bounce });
  if (c.form === 'visual') Object.assign(options, { visualDuration: c.visual, bounce: c.bounce });
  if (c.rest_speed) options.restSpeed = c.rest_speed;
  if (c.rest_delta) options.restDelta = c.rest_delta;
  const g = motion.spring(options);
  springs.push({ stiffness: 0, damping: 0, mass: 1, velocity: 0, duration: 0, bounce: 0, visual: 0, rest_speed: 0, rest_delta: 0, ...c, samples: sampled(g) });
};
motionSpring({ form: 'physics', from: 0, to: 100, stiffness: 100, damping: 10, mass: 1, velocity: 0 });
motionSpring({ form: 'physics', from: 0, to: 100, stiffness: 300, damping: 20, mass: 1, velocity: 0 });
motionSpring({ form: 'physics', from: 0, to: 1, stiffness: 100, damping: 20, mass: 1, velocity: 0 });
motionSpring({ form: 'physics', from: 0, to: 100, stiffness: 100, damping: 50, mass: 1, velocity: 0 });
motionSpring({ form: 'physics', from: 0, to: 100, stiffness: 4000000, damping: 100000, mass: 1, velocity: 0 });
motionSpring({ form: 'physics', from: 0, to: 100, stiffness: 100, damping: 10, mass: 1, velocity: 1000 });
motionSpring({ form: 'physics', from: 100, to: 0, stiffness: 200, damping: 5, mass: 2, velocity: -500 });
motionSpring({ form: 'physics', from: 0, to: 1, stiffness: 170, damping: 26, mass: 1, velocity: 0 });
motionSpring({ form: 'physics', from: 0, to: 300, stiffness: 500, damping: 25, mass: 1, velocity: 0, rest_speed: 5, rest_delta: 1 });
motionSpring({ form: 'duration', from: 0, to: 100, duration: 800, bounce: 0.3 });
motionSpring({ form: 'duration', from: 0, to: 100, duration: 500, bounce: 0 });
motionSpring({ form: 'duration', from: 0, to: 100, duration: 1200, bounce: -0.5 });
motionSpring({ form: 'duration', from: 20, to: -40, duration: 300, bounce: 0.6 });
motionSpring({ form: 'visual', from: 0, to: 100, visual: 0.5, bounce: 0.25 });
motionSpring({ form: 'visual', from: 0, to: 1, visual: 0.3, bounce: 0.3 });
motionSpring({ form: 'visual', from: 0, to: 100, visual: 0.4, bounce: -0.3 });

// a spring given a new target as it runs keeps its speed
const retargets = [];
for (const c of [
  { from: 0, to: 100, stiffness: 170, damping: 26, at: 160, next: 40 },
  { from: 0, to: 100, stiffness: 100, damping: 10, at: 96, next: 250 },
  { from: 0, to: 1, stiffness: 300, damping: 30, at: 48, next: 0 },
]) {
  const g = motion.spring({ keyframes: [c.from, c.to], stiffness: c.stiffness, damping: c.damping });
  const before = [];
  for (let t = 0; t <= c.at; t += 16) before.push([t, g.next(t).value, g.velocity(t), 0]);
  const value = g.next(c.at).value;
  const speed = g.velocity(c.at);
  g.retarget([value, c.next], speed);
  retargets.push({ ...c, value, speed, before, after: sampled(g) });
}

// ---- staggers ----
const staggers = [];
const animeStagger = (each, params, total, note) => {
  const f = anime.stagger(each, params);
  const targets = Array.from({ length: total }, () => ({}));
  const from = params.from;
  staggers.push({
    rule: 'anime', note, total,
    each: Array.isArray(each) ? each[0] : each, upto: Array.isArray(each) ? each[1] : 0, ranged: Array.isArray(each) ? 1 : 0,
    base: params.start || 0,
    origin: from === undefined ? 'first' : Array.isArray(from) ? 'point' : String(from),
    origin_x: Array.isArray(from) ? from[0] : 0, origin_y: Array.isArray(from) ? from[1] : 0,
    reversed: params.reversed ? 1 : 0, ease: params.ease || '',
    columns: params.grid ? params.grid[0] : 0, rows: params.grid ? params.grid[1] : 0,
    axis: params.axis || '', seed: params.seed || 0,
    values: targets.map((t, i) => f(t, i, targets)),
  });
};
animeStagger(100, {}, 5, 'each');
animeStagger(100, { from: 'center' }, 5, 'center');
animeStagger(100, { from: 'center' }, 6, 'center, even');
animeStagger(100, { from: 'last' }, 5, 'last');
animeStagger(50, { from: 2 }, 6, 'index');
animeStagger(100, { start: 500 }, 4, 'start');
animeStagger([0, 1000], {}, 5, 'range');
animeStagger([200, 800], { from: 'center' }, 6, 'range, center');
animeStagger(100, { reversed: true }, 5, 'reversed');
animeStagger(100, { from: 'center', reversed: true }, 7, 'center, reversed');
animeStagger(100, { ease: 'inQuad' }, 6, 'eased');
animeStagger(100, { ease: 'outElastic(1, .3)', from: 'center' }, 9, 'elastic, center');
animeStagger(50, { grid: [4, 3], from: 'center' }, 12, 'grid, center');
animeStagger(50, { grid: [4, 3], from: 5 }, 12, 'grid, index');
animeStagger(50, { grid: [4, 3], from: 'center', axis: 'x' }, 12, 'grid, axis x');
animeStagger(50, { grid: [5, 5], from: 'last', axis: 'y' }, 25, 'grid, last, axis y');
animeStagger(50, { grid: [4, 3], from: 'center', reversed: true }, 12, 'grid, reversed');
animeStagger(50, { grid: [4, 3], from: 'center', axis: 'x', reversed: true }, 12, 'grid, axis, reversed');
animeStagger(80, { grid: [5, 4], from: 'first', ease: 'outQuad' }, 20, 'grid, eased');
animeStagger(60, { grid: [6, 4], from: [0.25, 0.75] }, 24, 'grid, from a point');
animeStagger(100, { from: 'random', seed: 42 }, 8, 'random');
animeStagger(40, { grid: [3, 3], from: 'random', seed: 7 }, 9, 'grid, random');

const motionStagger = (each, params, total, note, seed) => {
  const f = motion.stagger(each, params);
  const run = () => Array.from({ length: total }, (_, i) => f(i, total));
  const values = seed === undefined ? run() : withRandom(seed, run);
  const ease = Array.isArray(params.ease) ? 'cubic-bezier(' + params.ease.join(', ') + ')' : params.ease || '';
  staggers.push({
    rule: 'motion', note, total, each, upto: 0, ranged: 0, base: params.startDelay || 0,
    origin: String(params.from === undefined ? 0 : params.from), origin_x: 0, origin_y: 0,
    reversed: 0, ease, columns: params.grid ? params.grid[0] : 0, rows: params.grid ? params.grid[1] : 0,
    axis: '', seed: seed || 0, values,
  });
};
motionStagger(0.1, {}, 5, 'each');
motionStagger(0.1, { from: 'center' }, 5, 'center');
motionStagger(0.1, { from: 'center' }, 6, 'center, even');
motionStagger(0.1, { from: 'last' }, 5, 'last');
motionStagger(0.05, { from: 2 }, 6, 'index');
motionStagger(0.1, { startDelay: 0.5 }, 4, 'start');
motionStagger(0.1, { ease: 'easeIn' }, 6, 'eased');
motionStagger(0.1, { ease: [.17, .67, .83, .67], from: 'center' }, 7, 'bézier, center');
motionStagger(0.08, { from: 'edges' }, 7, 'edges');
motionStagger(0.05, { grid: [4, 3], from: 'center' }, 12, 'grid, center');
motionStagger(0.05, { grid: [4, 3], from: 5 }, 12, 'grid, index');
motionStagger(0.05, { grid: [4, 3], from: 'edges' }, 12, 'grid, edges');
motionStagger(0.05, { grid: [5, 2], from: 'last' }, 10, 'grid, last');
motionStagger(0.05, { grid: [4, 3], from: 'first', ease: 'circIn' }, 12, 'grid, eased');
motionStagger(0.1, { from: 'random' }, 8, 'random', 7);
motionStagger(0.03, { grid: [4, 4], from: 'random' }, 16, 'grid, random', 11);

// ---- timeline positions ----
const timelines = [];
const timeline = (params, steps, note) => {
  const tl = anime.createTimeline({ autoplay: false, ...params });
  const children = [];
  const labels = [];
  for (const s of steps) {
    if (s.op === 'add') {
      const p = { duration: s.duration };
      if (s.delay) p.delay = s.delay;
      if (s.loop) p.loop = s.loop;
      tl.add(p, s.position === '' ? undefined : s.position);
      const child = tl._tail;
      children.push([child._offset, child._delay, child.duration]);
    } else {
      tl.label(s.name, s.position === '' ? undefined : s.position);
      labels.push([s.name, tl.labels[s.name]]);
    }
  }
  timelines.push({
    note, loop: params.loop || 0, loop_delay: params.loopDelay || 0,
    steps: steps.map(s => ({ op: s.op, name: s.name || '', duration: s.duration || 0, delay: s.delay || 0, loop: s.loop || 0, position: String(s.position) })),
    children, labels, iteration_duration: tl.iterationDuration, duration: tl.duration,
  });
};
const add = (duration, position = '', more = {}) => ({ op: 'add', duration, position, ...more });
const label = (name, position = '') => ({ op: 'label', name, position });
timeline({}, [add(500), add(300), add(200, '-=100'), add(400, '+=50'), add(100, 200), add(250, '<'), add(150, '<<'),
  add(100, '<<+=50'), add(100, '<-=20'), add(80, '<+=10'), add(60, '250')], 'positions');
timeline({}, [add(400), label('a'), label('b', 1000), add(300, 'a'), add(200, 'b+=100'), add(100, 'b-=50'),
  add(100, 'nowhere'), label('c', '<'), add(50, 'c'), add(70, 'c+=30'), label('d', '+=100'), add(40, 'd'), add(30, '*=0.5')], 'labels');
timeline({}, [add(400, '', { delay: 100 }), add(200, '<'), add(300, '<<', { delay: 50 }), add(100, '-=200'), add(200, '', { loop: 2 }), add(100, '<')], 'delays and loops');
timeline({ loop: 2, loopDelay: 100 }, [add(300), add(200, '-=100'), add(250, '+=50')], 'a looped timeline');
timeline({}, [label('start', 0), add(0, ''), add(100, 'start'), add(0, '<'), add(50, '<')], 'zero durations');

// ---- the timer's clock: loops, alternation, reversal ----
const timers = [];
for (const c of [
  { duration: 400 },
  { duration: 400, loop: 2 },
  { duration: 400, loop: 2, alternate: true },
  { duration: 400, loop: 3, alternate: true, reversed: true },
  { duration: 400, loop: 2, loopDelay: 100 },
  { duration: 400, loop: 1, alternate: true, loopDelay: 50, delay: 100 },
  { duration: 300, reversed: true },
  { duration: 250, loop: 4, alternate: true, loopDelay: 30 },
]) {
  const timer = anime.createTimer({ autoplay: false, ...c });
  const samples = [];
  const end = timer.duration + 150;
  const at = [];
  for (let s = -150; s <= end; s += 50) at.push(s);
  at.push(timer.duration, c.duration, c.duration + (c.loopDelay || 0));
  for (const s of at) {
    timer.seek(s);
    samples.push([s, timer._currentIteration, timer._iterationTime]);
  }
  timers.push({ duration: c.duration, loop: c.loop || 0, alternate: c.alternate ? 1 : 0, reversed: c.reversed ? 1 : 0, loop_delay: c.loopDelay || 0, delay: c.delay || 0, total: timer.duration, samples });
}

// ---- motion's keyframes ----
const keyframes = [];
for (const c of [
  { values: [0, 100], duration: 400 },
  { values: [0, 100, 50], duration: 600 },
  { values: [0, 100, 50, 80], times: [0, 0.2, 0.7, 1], eases: ['easeIn', 'linear', 'backOut'], duration: 1000 },
  { values: [10, -20, 30], ease: 'circOut', duration: 500 },
  { values: [5, 5], duration: 300 },
  { values: [0, 100], times: [0.25, 0.75], ease: 'linear', duration: 400 },
  { values: [0, 40, 40, 100], eases: ['anticipate', 'easeOut', 'backInOut'], duration: 900 },
  { values: [0, 100], ease: 'backOut', duration: 0 },
]) {
  const options = { keyframes: c.values, duration: c.duration };
  if (c.times) options.times = c.times;
  if (c.eases) options.ease = c.eases;
  if (c.ease) options.ease = c.ease;
  const g = motion.keyframes(options);
  const samples = [];
  for (let t = 0; t <= c.duration + 32; t += 16) {
    const s = g.next(t);
    samples.push([t, s.value, s.done ? 1 : 0]);
  }
  keyframes.push({ times: [], eases: [], ease: '', ...c, samples });
}

// ---- motion's inertia, sampled every 16 ms until at rest ----
const inertias = [];
for (const c of [
  { origin: 0, velocity: 1000 },
  { origin: 100, velocity: -800, power: 0.5, time_constant: 200 },
  { origin: 0, velocity: 2000, max: 300 },
  { origin: 0, velocity: -1500, min: -200, max: 400, bounce_stiffness: 300, bounce_damping: 20 },
  { origin: 0, velocity: 1000, snap: 50 },
  { origin: 500, velocity: 0, min: 0, max: 400 },
  { origin: 0, velocity: 1200, rest_delta: 1, max: 1000 },
  { origin: 50, velocity: 600, min: 0, max: 200, rest_speed: 10 },
]) {
  const options = { keyframes: [c.origin], velocity: c.velocity };
  if (c.power !== undefined) options.power = c.power;
  if (c.time_constant !== undefined) options.timeConstant = c.time_constant;
  if (c.min !== undefined) options.min = c.min;
  if (c.max !== undefined) options.max = c.max;
  if (c.bounce_stiffness !== undefined) options.bounceStiffness = c.bounce_stiffness;
  if (c.bounce_damping !== undefined) options.bounceDamping = c.bounce_damping;
  if (c.rest_delta !== undefined) options.restDelta = c.rest_delta;
  if (c.rest_speed !== undefined) options.restSpeed = c.rest_speed;
  if (c.snap) options.modifyTarget = v => Math.round(v / c.snap) * c.snap;
  const g = motion.inertia(options);
  const samples = [];
  for (let t = 0; t <= 10000; t += 16) {
    const s = g.next(t);
    samples.push([t, s.value, s.done ? 1 : 0]);
    if (s.done) break;
  }
  inertias.push({
    power: 0.8, time_constant: 325, bounce_stiffness: 500, bounce_damping: 10, rest_delta: 0.5, rest_speed: 0, snap: 0,
    has_min: c.min !== undefined ? 1 : 0, has_max: c.max !== undefined ? 1 : 0, min: 0, max: 0, ...c, samples,
  });
}

// ---- motion's scroll offsets: a target's progress through its container ----
const scrolls = [];
for (const c of [
  { container: 800, target: 200, inset: 1500, offsets: [] },
  { container: 800, target: 200, inset: 1500, offsets: ['start end', 'end start'] },
  { container: 800, target: 200, inset: 1500, offsets: ['start start', 'end end'] },
  { container: 600, target: 300, inset: 900, offsets: ['center center'] },
  { container: 800, target: 200, inset: 1500, offsets: ['0 1', '1 0'] },
  { container: 800, target: 400, inset: 1200, offsets: ['100px end', 'end 50%'] },
  { container: 700, target: 250, inset: 1000, offsets: ['start end', 'center center', 'end start'] },
  { container: 800, target: 200, inset: 1500, offsets: ['end start', 'start end'] },
  { container: 900, target: 3000, inset: 0, offsets: ['start start', 'end end'] },
  { container: 500, target: 100, inset: 700, offsets: ['-50px 25%', '0.5 75%'] },
]) {
  const samples = [];
  for (let s = 0; s <= 3200; s += 100) {
    const info = {};
    for (const axis of ['x', 'y']) {
      info[axis] = { offset: [], containerLength: c.container, targetLength: c.target, targetOffset: c.inset, current: s, progress: 0 };
    }
    const options = c.offsets.length ? { offset: c.offsets } : {};
    scroll.resolveOffsets(info, options);
    samples.push([s, info.y.progress]);
  }
  scrolls.push({ ...c, samples });
}

// ---- anime's number helpers and seeded random ----
const helpers = { damp: [], lerp: [], map_range: [], wrap: [], snap: [], random: [] };
for (const [a, b, dt, f] of [[0, 100, 16, 0.5], [0, 100, 16, 0], [0, 100, 16, 1], [10, -30, 33.3, 0.25], [5, 5, 16, 0.7], [0, 1, 1000, 0.1]]) {
  helpers.damp.push([a, b, dt, f, anime.utils.damp(a, b, dt, f)]);
}
for (const [a, b, f] of [[0, 100, 0.25], [0, 100, 1], [0, 100, 0], [-3, 7, 0.3], [0.1, 0.7, 0.9]]) helpers.lerp.push([a, b, f, anime.utils.lerp(a, b, f)]);
for (const [v, a, b, c, d] of [[5, 0, 10, 0, 100], [0.3, 0, 1, -1, 1], [150, 100, 200, 1, 0]]) helpers.map_range.push([v, a, b, c, d, anime.utils.mapRange(v, a, b, c, d)]);
for (const [v, a, b] of [[370, 0, 360], [-10, 0, 360], [7.5, 2, 5], [0.3, 0, 1]]) helpers.wrap.push([v, a, b, anime.utils.wrap(v, a, b)]);
for (const [v, inc] of [[17, 5], [12.5, 5], [-12.5, 5], [0.33, 0.1], [7, 0]]) helpers.snap.push([v, inc, anime.utils.snap(v, inc)]);
for (const seed of [0, 42, 12345]) {
  const r = anime.utils.createSeededRandom(seed);
  const calls = [];
  for (const [lo, hi, places] of [[0, 1, 0], [0, 100, 0], [-1, 1, 4], [0, 1, 6], [5, 10, 2], [0, 9, 0], [0, 1, 0], [-50, 50, 1]]) {
    calls.push([lo, hi, places, r(lo, hi, places)]);
  }
  const raw = seeded(seed);
  helpers.random.push({ seed, calls, raw: Array.from({ length: 6 }, () => raw()) });
}

const out = { versions, times, eases, aos, anime_springs: animeSprings, springs, retargets, staggers, timelines, timers, keyframes, inertias, scrolls, helpers };
const path = new URL('./reference.json', import.meta.url);
writeFileSync(path, JSON.stringify(out) + '\n');
let count = 0;
const walk = v => { if (typeof v === 'number') count++; else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
walk({ eases, anime_springs: animeSprings, springs, retargets, staggers, timelines, timers, keyframes, inertias, scrolls, helpers });
console.log('wrote', path.pathname, '-', eases.length, 'easings,', springs.length + retargets.length, 'motion springs,', animeSprings.length, 'anime springs,', staggers.length, 'staggers,', timelines.length, 'timelines,', timers.length, 'timers,', keyframes.length, 'keyframe tracks,', inertias.length, 'inertias,', scrolls.length, 'scroll offsets;', count, 'numbers');
