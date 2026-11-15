// What Tone.js itself answers on fixed inputs, for Lory's sound package to
// be held to (tests/sound/reference.co). reference.py serves this page with
// the pinned Tone.js beside it, in headless Chrome, and keeps what it posts
// as reference.json. Each part runs Tone's own code: its notation, its
// envelopes' and parameters' values (number for number), its transport's
// events (which fall when), and patches rendered offline (Tone.Offline at a
// fixed rate) measured by `measure` below, the same measures
// sound.analysis computes in Crow.
'use strict';

const RATE = 16000;
const out = { tone: Tone.version, rate: RATE };

// ---- the measures, as sound.analysis computes them ----

// RMS over consecutive windows of `w` samples from the first
function windows(xs, w) {
  const n = Math.floor(xs.length / w);
  const res = [];
  for (let k = 0; k < n; k++) {
    let s = 0;
    for (let i = k * w; i < (k + 1) * w; i++) s += xs[i] * xs[i];
    res.push(Math.sqrt(s / w));
  }
  return res;
}

// an iterative radix-2 FFT of a power-of-two length, in place
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len;
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k), wi = Math.sin(ang * k);
        const ar = re[i + k + len / 2], ai = im[i + k + len / 2];
        const xr = ar * wr - ai * wi, xi = ar * wi + ai * wr;
        re[i + k + len / 2] = re[i + k] - xr; im[i + k + len / 2] = im[i + k] - xi;
        re[i + k] += xr; im[i + k] += xi;
      }
    }
  }
}

// the magnitudes of a stretch's spectrum: a Hann window (periodic) over the
// stretch, zeros after it to `size`, bins 0 to size/2
function spectrum(xs, size) {
  const re = new Float64Array(size), im = new Float64Array(size);
  const L = Math.min(xs.length, size);
  for (let i = 0; i < L; i++) re[i] = xs[i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / L));
  fft(re, im);
  const mags = [];
  for (let k = 0; k <= size / 2; k++) mags.push(Math.hypot(re[k], im[k]));
  return mags;
}

// the strongest bin within `share` of a frequency, its frequency refined by
// a parabola through the decibels of it and its neighbours, and its level
function peakNear(mags, rate, size, hz, share) {
  const lo = Math.max(1, Math.floor(hz * (1 - share) * size / rate));
  const hi = Math.min(mags.length - 2, Math.ceil(hz * (1 + share) * size / rate));
  let k = lo;
  for (let i = lo; i <= hi; i++) if (mags[i] > mags[k]) k = i;
  const db = (m) => 20 * Math.log10(Math.max(m, 1e-12));
  const a = db(mags[k - 1]), b = db(mags[k]), c = db(mags[k + 1]);
  const d = a - 2 * b + c;
  const p = d === 0 ? 0 : 0.5 * (a - c) / d;
  return { hz: (k + p) * rate / size, db: b - 0.25 * (a - c) * p };
}

// the spectrum's centroid: each bin's frequency weighted by its magnitude
function centroid(mags, rate, size) {
  let s = 0, w = 0;
  for (let k = 0; k < mags.length; k++) { s += k * rate / size * mags[k]; w += mags[k]; }
  return w > 0 ? s / w : 0;
}

// what a rendered sound is held by: its RMS every 10 ms, and over a stretch
// (from `from` to `to` seconds) its level, its fundamental near `hz`, the
// first eight harmonics' levels against the fundamental's, its centroid
function measure(xs, opts) {
  const w = Math.round(0.01 * RATE);
  const res = { rms: windows(xs, w) };
  if (opts && opts.from !== undefined) {
    const a = Math.round(opts.from * RATE), b = Math.round(opts.to * RATE);
    const part = xs.slice(a, b);
    const size = 8192;
    const mags = spectrum(part, size);
    let s = 0;
    for (const v of part) s += v * v;
    res.level = 20 * Math.log10(Math.sqrt(s / part.length) + 1e-12);
    res.centroid = centroid(mags, RATE, size);
    if (opts.hz) {
      const f = peakNear(mags, RATE, size, opts.hz, 0.06);
      res.fundamental = f.hz;
      res.harmonics = [];
      for (let k = 1; k <= 8; k++) {
        if (k * opts.hz > RATE / 2 * 0.95) break;
        res.harmonics.push(peakNear(mags, RATE, size, k * f.hz, 0.03).db - f.db);
      }
    }
  }
  return res;
}

// ---- notation ----

async function notation() {
  const words = ['4n', '8n', '16n', '32n', '2n', '1n', '4n.', '8n.', '2n.', '8t', '4t', '16t', '2t', '1m', '2m',
    '3m', '1:0:0', '2:1:0', '0:2:2', '1:2:3', '0:0:1', '0:1.5:0', '2:1', '48i', '192i', '1i', '4hz', '0.5hz',
    '0.5', '1.25', '2s', '0.25s', '3', '64n', '1t', '+0.5', '+4n'];
  const seconds = [0, 0.5, 1.75, 2.1, 3.333, 7.9, 0.125, 11.0625];
  const near = [0.5, 0.25, 0.1667, 0.7, 1.9, 0.04, 3.0, 0.33, 0.09];
  const time = [], bars = [], notes = [], quantized = [];
  for (const [bpm, sig] of [[120, 4], [90, 3], [140.5, 4], [100, 3.5]]) {
    await Tone.Offline((ctx) => {
      ctx.transport.bpm.value = bpm;
      ctx.transport.timeSignature = sig;
      const now = ctx.now();
      for (const w of words) {
        const t = Tone.Time(w);
        time.push({ words: w, bpm, signature: sig, now, seconds: t.toSeconds(), ticks: t.toTicks(),
          ticks_seconds: w.startsWith('+') ? null : Tone.Ticks(w).toSeconds() });
      }
      for (const s of seconds) bars.push({ seconds: s, bpm, signature: sig, shown: Tone.Time(s).toBarsBeatsSixteenths() });
      for (const s of near) notes.push({ seconds: s, bpm, signature: sig, notation: Tone.Time(s).toNotation() });
      for (const [s, sub, pct] of [[1.3, '4n', 1], [1.3, '8n', 0.5], [0.61, '16n', 1], [2.2, '1m', 0.25]]) {
        quantized.push({ seconds: s, subdivision: sub, percent: pct, bpm, signature: sig, quantized: Tone.Time(s).quantize(sub, pct) });
      }
    }, 0.01, 1, RATE);
  }
  out.time = time;
  out.bars = bars;
  out.notation = notes;
  out.quantized = quantized;
}

function pitch() {
  const words = ['C4', 'A4', 'c4', 'C#4', 'Db4', 'D#3', 'Eb3', 'E4', 'Fb4', 'E#4', 'F4', 'F#2', 'Gb2', 'G4',
    'G##4', 'Gx4', 'Ab4', 'A#4', 'Bb4', 'B4', 'B#3', 'Cb4', 'C-1', 'A-1', 'B9', 'C8', 'Abb3', 'Bbb2', 'C###4',
    'Dbbb5', 'e#x3', '60midi', '69.5midi', '440', '440hz', '261.5hz', '4n', '8n', '1m'];
  const pitch = [];
  for (const w of words) {
    const f = Tone.Frequency(w);
    pitch.push({ words: w, hz: f.toFrequency(), midi: f.toMidi() });
  }
  const names = [];
  for (const hz of [440, 261.63, 445, 27.5, 4186, 123.4, 30, 16.35, 8000, 466.1]) {
    names.push({ hz, name: Tone.Frequency(hz).toNote(), midi: Tone.Frequency(hz).toMidi() });
  }
  const midis = [];
  for (const m of [60, 69, 21.5, 127, 0, 69.3]) midis.push({ midi: m, hz: Tone.Midi(m).toFrequency(), mtof: Tone.mtof(m) });
  const transposed = [];
  for (const [w, k] of [['C4', 7], ['A4', -12], ['E2', 3.5], ['G5', 24]]) {
    transposed.push({ words: w, semitones: k, hz: Tone.Frequency(w).transpose(k).toFrequency() });
  }
  const chord = Tone.Frequency('C4').harmonize([0, 4, 7, 11]).map((f) => f.toFrequency());
  out.pitch = { words: pitch, names, midis, transposed, chord,
    levels: [-6, 0, -20, 3.5].map((db) => ({ db, gain: Tone.dbToGain(db) })),
    gains: [0.5, 1, 0.01, 2].map((g) => ({ gain: g, db: Tone.gainToDb(g) })) };
}

// ---- envelopes and parameters: their values at times, Tone's own ----

const GRID = [];
for (let i = 0; i <= 120; i++) GRID.push(i / 100);
GRID.push(0.0137, 0.2345, 0.5051, 0.6789, 0.9876);

async function envelopes() {
  const curves = ['linear', 'exponential', 'sine', 'cosine', 'bounce', 'ripple', 'step'];
  const cases = [
    { name: 'defaults', options: {}, triggers: [['attack', 0.05, 1], ['release', 0.4]] },
    { name: 'decay linear', options: { attack: 0.1, decay: 0.2, sustain: 0.4, release: 0.3, decayCurve: 'linear' }, triggers: [['attack', 0.0, 1], ['release', 0.6]] },
    { name: 'velocity', options: { attack: 0.05, decay: 0.1, sustain: 0.5, release: 0.2 }, triggers: [['attack', 0.1, 0.6], ['release', 0.5]] },
    { name: 'pressed again', options: { attack: 0.1, decay: 0.05, sustain: 0.8, release: 0.5 }, triggers: [['attack', 0.0, 1], ['release', 0.15], ['attack', 0.3, 1], ['release', 0.6]] },
    { name: 'released in its attack', options: { attack: 0.3, decay: 0.1, sustain: 0.5, release: 0.25 }, triggers: [['attack', 0.05, 1], ['release', 0.15]] },
    { name: 'instant', options: { attack: 0, decay: 0, sustain: 1, release: 0 }, triggers: [['attack', 0.1, 1], ['release', 0.7]] },
    { name: 'no sustain', options: { attack: 0.02, decay: 0.3, sustain: 0, release: 0.4 }, triggers: [['attack', 0.0, 1], ['release', 0.9]] },
    { name: 'held whole', options: { attack: 0.2, decay: 0.3, sustain: 1, release: 0.4 }, triggers: [['attack', 0.0, 0.9], ['release', 0.5]] },
  ];
  for (const c of curves) {
    cases.push({ name: 'curve ' + c, options: { attack: 0.2, decay: 0.1, sustain: 0.6, release: 0.3, attackCurve: c, releaseCurve: c }, triggers: [['attack', 0.02, 1], ['release', 0.45]] });
  }
  cases.push({ name: 'ripple pressed again', options: { attack: 0.25, decay: 0.1, sustain: 0.7, release: 0.4, attackCurve: 'ripple', releaseCurve: 'bounce' }, triggers: [['attack', 0.0, 1], ['release', 0.1], ['attack', 0.3, 0.8], ['release', 0.8]] });
  cases.push({ name: 'sine decay ignored', options: { attack: 0.1, decay: 0.2, sustain: 0.3, release: 0.3, decayCurve: 'sine' }, triggers: [['attack', 0.0, 1], ['release', 0.7]] });
  const res = [];
  for (const c of cases) {
    let values = null;
    const buffer = await Tone.Offline(() => {
      const env = new Tone.Envelope(c.options).toDestination();
      for (const [what, t, v] of c.triggers) {
        if (what === 'attack') env.triggerAttack(t, v);
        else env.triggerRelease(t);
      }
      values = GRID.map((t) => env.getValueAtTime(t));
    }, 1.25, 1, RATE);
    const samples = buffer.getChannelData(0);
    res.push(Object.assign({}, c, { grid: GRID, values, rendered: GRID.map((t) => samples[Math.min(samples.length - 1, Math.round(t * RATE))]) }));
  }
  out.envelopes = res;
}

async function ramps() {
  const cases = [
    { name: 'linear', initial: 1, ops: [['linearRampTo', 0, 0.5, 0.25]] },
    { name: 'exponential', initial: 100, ops: [['exponentialRampTo', 400, 1, 0.1]] },
    { name: 'target', initial: 0, ops: [['targetRampTo', 1, 0.2, 0.05]] },
    { name: 'mixed', initial: 1, ops: [['setValueAtTime', 2, 0.1], ['linearRampToValueAtTime', 5, 0.3], ['exponentialRampToValueAtTime', 1, 0.6], ['setTargetAtTime', 3, 0.7, 0.1]] },
    { name: 'frequency ramp', initial: 440, units: 'frequency', ops: [['rampTo', 880, 0.5, 0.1]] },
    { name: 'plain ramp', initial: 0.2, ops: [['rampTo', 0.9, 0.3, 0.2]] },
    { name: 'curve', initial: 0, ops: [['setValueCurveAtTime', [0, 1, 0.5, 0.75], 0.1, 0.3, 2]] },
    { name: 'held', initial: 0, ops: [['linearRampTo', 10, 1, 0], ['cancelAndHoldAtTime', 0.4]] },
    { name: 'cancelled', initial: 0, ops: [['setValueAtTime', 1, 0.1], ['linearRampToValueAtTime', 2, 0.5], ['setValueAtTime', 3, 0.8], ['cancelScheduledValues', 0.5]] },
    { name: 'approach', initial: 0.5, ops: [['exponentialApproachValueAtTime', 0.1, 0.2, 0.4]] },
  ];
  const res = [];
  for (const c of cases) {
    let values = null;
    const buffer = await Tone.Offline(() => {
      const s = new Tone.Signal({ value: c.initial, units: c.units || 'number' }).toDestination();
      for (const [name, ...args] of c.ops) s[name](...args);
      values = GRID.map((t) => s.getValueAtTime(t));
    }, 1.25, 1, RATE);
    const samples = buffer.getChannelData(0);
    res.push(Object.assign({}, c, { grid: GRID, values, rendered: GRID.map((t) => samples[Math.min(samples.length - 1, Math.round(t * RATE))]) }));
  }
  out.ramps = res;
}

// ---- the transport: which events fall when ----

// a sequence's nested steps as Lory writes them in one text: a group in
// brackets, a rest a point
function stepsText(steps, top = true) {
  const words = steps.map((s) => (Array.isArray(s) ? stepsText(s, false) : s === null ? '.' : s));
  return top ? words.join(' ') : '[' + words.join(' ') + ']';
}

async function schedules() {
  const cases = [
    { name: 'a quarter repeated', duration: 2.1, events: [['repeat', '4n', 0]] },
    { name: 'eighths from a beat, for a bar', bpm: 100, duration: 4, events: [['repeat', '8n', '4n', '1m']] },
    { name: 'a loop of five', bpm: 100, duration: 3, events: [['loop', '8n', 0, 5]] },
    { name: 'a loop at twice the rate', duration: 1.6, events: [['loop', '4n', '8n', null, 2]] },
    { name: 'a sequence with a split step and a rest', duration: 2.2, events: [['sequence', ['C4', ['E4', 'G4'], null, 'B4'], '8n', 0]] },
    { name: 'a sequence of sixteenths in threes', duration: 1.1, events: [['sequence', ['C4', ['D4', 'E4', 'F4'], 'G4', ['A4', ['B4', 'C5']]], '16n', 0]] },
    { name: 'a part looped by the bar', duration: 4.5, events: [['part', [[0, 'C4'], ['0:1', 'E4'], ['0:2:2', 'G4'], ['0:3', 'B3']], 0, true, '1m']] },
    { name: 'a part once, started late', duration: 3, events: [['part', [[0, 'C4'], ['4n', 'D4'], ['2n.', 'E4']], '2n', false]] },
    { name: 'swung eighths', swing: 0.5, duration: 2.1, events: [['repeat', '8n', 0]] },
    { name: 'swung sixteenths', swing: 0.3, swingSubdivision: '16n', duration: 1.1, events: [['repeat', '16n', 0]] },
    { name: 'the transport looped', loop: true, loopStart: 0, loopEnd: '2n', duration: 3, events: [['once', '0:1'], ['once', '0:3'], ['repeat', '8n', '8n']] },
    { name: 'looped from a beat', loop: true, loopStart: '4n', loopEnd: '1m', duration: 5, events: [['once', 0], ['once', '0:2'], ['repeat', '4n', 0]] },
    { name: 'three to a bar at 90', bpm: 90, signature: 3, duration: 6.1, events: [['loop', '1m', 0], ['once', '1:1:2']] },
    { name: 'patterns', duration: 3.1, events: [['pattern', ['C4', 'E4', 'G4', 'B4'], 'upDown', '8n', 0], ['pattern', ['a', 'b', 'c', 'd', 'e'], 'alternateDown', '4n', 0]] },
    { name: 'more patterns', duration: 2.1, events: [['pattern', ['a', 'b', 'c'], 'down', '8n', 0], ['pattern', ['a', 'b', 'c', 'd'], 'downUp', '8n', 0], ['pattern', ['a', 'b', 'c', 'd'], 'alternateUp', '8n', 0], ['pattern', ['x', 'y'], 'up', '4n', '8n']] },
    { name: 'a sequence of two at a fast tempo', bpm: 170, duration: 2, events: [['sequence', [['C2', 'C2'], null, 'G2', ['C3', null, 'C3']], '4n', '4n']] },
  ];
  const res = [];
  for (const c of cases) {
    const fired = [];
    let started = null;
    await Tone.Offline(({ transport }) => {
      transport.bpm.value = c.bpm || 120;
      transport.timeSignature = c.signature || 4;
      if (c.swing) transport.swing = c.swing;
      if (c.swingSubdivision) transport.swingSubdivision = c.swingSubdivision;
      if (c.loop) { transport.loop = true; transport.loopStart = c.loopStart; transport.loopEnd = c.loopEnd; }
      c.events.forEach((ev, index) => {
        const note = (time, value) => fired.push([time, index, value === undefined ? null : value]);
        const [kind] = ev;
        if (kind === 'repeat') transport.scheduleRepeat((t) => note(t), ev[1], ev[2], ev[3] === undefined ? Infinity : ev[3]);
        if (kind === 'once') transport.schedule((t) => note(t), ev[1]);
        if (kind === 'loop') {
          const loop = new Tone.Loop((t) => note(t), ev[1]);
          if (ev[3]) loop.iterations = ev[3];
          if (ev[4]) loop.playbackRate = ev[4];
          loop.start(ev[2]);
        }
        if (kind === 'sequence') new Tone.Sequence((t, v) => note(t, v), ev[1], ev[2]).start(ev[3]);
        if (kind === 'part') {
          const part = new Tone.Part((t, v) => note(t, v), ev[1]);
          part.loop = ev[3];
          if (ev[4]) part.loopEnd = ev[4];
          part.start(ev[2]);
        }
        if (kind === 'pattern') {
          const pattern = new Tone.Pattern((t, v) => note(t, v), ev[1], ev[2]);
          pattern.interval = ev[3];
          pattern.start(ev[4]);
        }
      });
      transport.on('start', (time) => { started = time; });
      transport.start(0);
    }, c.duration, 1, RATE);
    const steps = c.events.map((ev) => (ev[0] === 'sequence' ? stepsText(ev[1]) : null));
    res.push(Object.assign({}, c, { steps, started, fired: fired.map(([t, i, v]) => [t - started, i, v]) }));
  }
  out.schedules = res;
}

// ---- rendered patches ----

// numbers kept to float32's own precision, so the file stays small
const kept = (xs) => Array.from(xs, (v) => +(+v).toPrecision(7));

// what Tone.Offline renders of a patch `build` makes (its channels' samples)
async function offline(seconds, build, channels = 2) {
  const buf = await Tone.Offline(async (ctx) => { await build(ctx); }, seconds, channels, RATE);
  const res = [];
  for (let ch = 0; ch < buf.numberOfChannels; ch++) res.push(buf.getChannelData(ch));
  return res;
}

// the input an effect hears: a 440 Hz sine of 0.5 for 0.15 s, faded in
// and out over 5 ms (the same numbers effect parity builds in Crow)
function effectInput() {
  const n = Math.round(0.15 * RATE), fade = Math.round(0.005 * RATE);
  const xs = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const g = Math.min(1, i / fade, (n - 1 - i) / fade);
    xs[i] = 0.5 * Math.sin(2 * Math.PI * 440 * i / RATE) * g;
  }
  return xs;
}

const T0 = 0.05;

async function oscillators() {
  const cases = [
    { name: 'sine', make: () => new Tone.Oscillator(440, 'sine') },
    { name: 'square', make: () => new Tone.Oscillator(440, 'square') },
    { name: 'sawtooth', make: () => new Tone.Oscillator(220, 'sawtooth') },
    { name: 'triangle', make: () => new Tone.Oscillator(330, 'triangle') },
    { name: 'square4', make: () => new Tone.Oscillator(440, 'square4') },
    { name: 'custom', make: () => new Tone.Oscillator({ frequency: 300, type: 'custom', partials: [1, 0.5, 0.25] }) },
    { name: 'sine phase 90', make: () => new Tone.Oscillator({ frequency: 440, type: 'sine', phase: 90 }) },
    { name: 'pulse', make: () => new Tone.PulseOscillator(220, 0.3) },
    { name: 'pwm', make: () => new Tone.PWMOscillator(220, 0.4) },
    { name: 'amsine', make: () => new Tone.OmniOscillator(220, 'amsine') },
    { name: 'fmsine', make: () => new Tone.OmniOscillator(220, 'fmsine') },
    { name: 'fatsawtooth', make: () => new Tone.OmniOscillator(220, 'fatsawtooth') },
  ];
  const hz = { sine: 440, square: 440, sawtooth: 220, triangle: 330, square4: 440, custom: 300, 'sine phase 90': 440, pulse: 220, pwm: 220, amsine: 220, fmsine: 220, fatsawtooth: 220 };
  const res = [];
  for (const c of cases) {
    const [l] = await offline(0.03, () => { c.make().toDestination().start(0); }, 1);
    res.push({ name: c.name, hz: hz[c.name], samples: kept(l.slice(0, 400)) });
  }
  // an LFO's values, between 100 and 300, at 2 Hz, 45 degrees on
  const [l] = await offline(0.5, () => { new Tone.LFO({ frequency: 2, min: 100, max: 300, phase: 45 }).toDestination().start(0); }, 1);
  const every = [];
  for (let i = 0; i < l.length; i += 200) every.push(l[i]);
  out.oscillators = res;
  out.lfo = { frequency: 2, min: 100, max: 300, phase: 45, every: 200, values: kept(every) };
}

async function noises() {
  const res = [];
  for (const kind of ['white', 'pink', 'brown']) {
    const [l] = await offline(1, () => { new Tone.Noise(kind).toDestination().start(0); }, 1);
    let s = 0;
    for (const v of l) s += v * v;
    const mags = spectrum(l.slice(0, 8192), 8192);
    // the level of two octaves' bands: 250-500 Hz and 2000-4000 Hz
    const band = (a, b) => { let t = 0; for (let k = Math.round(a * 8192 / RATE); k < Math.round(b * 8192 / RATE); k++) t += mags[k] * mags[k]; return 10 * Math.log10(t / ((b - a) * 8192 / RATE)); };
    res.push({ kind, rms: Math.sqrt(s / l.length), slope: (band(2000, 4000) - band(250, 500)) / 3 });
  }
  out.noises = res;
}

async function filters() {
  const freqs = [];
  for (let i = 0; i < 64; i++) freqs.push(Math.pow(i / 64, 2) * (20000 - 20) + 20);
  const cases = [
    { type: 'lowpass', frequency: 1000, Q: 1, rolloff: -12 },
    { type: 'lowpass', frequency: 2000, Q: 6, rolloff: -24 },
    { type: 'highpass', frequency: 500, Q: 1, rolloff: -12 },
    { type: 'highpass', frequency: 1500, Q: 3, rolloff: -48 },
    { type: 'bandpass', frequency: 1200, Q: 2, rolloff: -12 },
    { type: 'notch', frequency: 1000, Q: 4, rolloff: -12 },
    { type: 'allpass', frequency: 800, Q: 1, rolloff: -12 },
    { type: 'peaking', frequency: 1000, Q: 1.5, gain: 6, rolloff: -12 },
    { type: 'lowshelf', frequency: 300, Q: 1, gain: -9, rolloff: -12 },
    { type: 'highshelf', frequency: 3000, Q: 1, gain: 4, rolloff: -96 },
  ];
  const res = [];
  for (const c of cases) {
    let response = null;
    const [l] = await offline(0.02, () => {
      const f = new Tone.Filter(c).toDestination();
      response = f.getFrequencyResponse(64);
      const click = new Float32Array(8); click[0] = 1;
      new Tone.Player(Tone.ToneAudioBuffer.fromArray(click)).connect(f).start(0);
    }, 1);
    res.push(Object.assign({}, c, { response: Array.from(response, (v) => (isFinite(v) ? +v.toPrecision(7) : null)), impulse: kept(l.slice(0, 64)) }));
  }
  // the primitive filters' impulse responses
  const click = new Float32Array(8); click[0] = 1;
  const prim = async (make, seconds) => (await offline(seconds, () => {
    const f = make(); f.toDestination();
    new Tone.Player(Tone.ToneAudioBuffer.fromArray(click)).connect(f).start(0);
  }, 1))[0];
  const comb = await prim(() => new Tone.FeedbackCombFilter({ delayTime: 0.01, resonance: 0.5 }), 0.05);
  const lowComb = await prim(() => new Tone.LowpassCombFilter({ delayTime: 0.01, resonance: 0.5, dampening: 2000 }), 0.05);
  const low = await prim(() => new Tone.OnePoleFilter(500, 'lowpass'), 0.01);
  const high = await prim(() => new Tone.OnePoleFilter(500, 'highpass'), 0.01);
  const eq = await prim(() => new Tone.EQ3({ low: -6, mid: 3, high: 0 }), 0.02);
  const ir = new Float32Array(64); for (let i = 0; i < 64; i++) ir[i] = Math.pow(0.9, i) * (i % 2 ? -1 : 1);
  const conv = await prim(() => { const v = new Tone.Convolver(); v.buffer = Tone.ToneAudioBuffer.fromArray(ir); return v; }, 0.02);
  out.filters = { freqs: kept(freqs), cases: res, comb: kept(comb.slice(0, 800)), lowpass_comb: kept(lowComb.slice(0, 800)), one_pole_low: kept(low.slice(0, 32)), one_pole_high: kept(high.slice(0, 32)), eq3: kept(eq.slice(0, 128)), convolver_ir: kept(ir), convolver: kept(conv.slice(0, 96)) };
}

async function signals() {
  const ramp = new Float32Array(400);
  for (let i = 0; i < 400; i++) ramp[i] = -1 + 2 * i / 399;
  const at = [0, 50, 100, 150, 199, 200, 250, 300, 350, 399];
  const run = async (make) => {
    const [l] = await offline(0.03, () => {
      const node = make(); node.toDestination();
      new Tone.Player(Tone.ToneAudioBuffer.fromArray(ramp)).connect(node).start(0);
    }, 1);
    return at.map((i) => +l[i].toPrecision(7));
  };
  const res = {
    input: at.map((i) => +ramp[i].toPrecision(7)),
    scale: await run(() => new Tone.Scale(10, 30)),
    scale_exp: await run(() => new Tone.ScaleExp(10, 30, 2)),
    pow: await run(() => new Tone.Pow(3)),
    abs: await run(() => new Tone.Abs()),
    negate: await run(() => new Tone.Negate()),
    audio_to_gain: await run(() => new Tone.AudioToGain()),
    gain_to_audio: await run(() => new Tone.GainToAudio()),
    greater_than: await run(() => new Tone.GreaterThan(0.25)),
    greater_than_zero: await run(() => new Tone.GreaterThanZero()),
    shaper: await run(() => new Tone.WaveShaper((x) => x * x * x, 1024)),
  };
  out.signals = res;
}

async function players() {
  const data = new Float32Array(200);
  for (let i = 0; i < 200; i++) data[i] = Math.sin(i / 7) * (1 - i / 400);
  const run = async (options, offset, duration) => {
    const [l] = await offline(0.06, () => {
      const p = new Tone.Player(Object.assign({ url: Tone.ToneAudioBuffer.fromArray(data) }, options)).toDestination();
      p.start(0, offset, duration);
    }, 1);
    return kept(l.slice(0, 800));
  };
  out.players = {
    data: kept(data),
    cases: [
      { name: 'plain', options: {}, offset: 0, duration: 0.04, samples: await run({}, 0, 0.04) },
      { name: 'faster', options: { playbackRate: 1.5 }, offset: 0, duration: 0.04, samples: await run({ playbackRate: 1.5 }, 0, 0.04) },
      { name: 'reversed', options: { reverse: true }, offset: 0, duration: 0.04, samples: await run({ reverse: true }, 0, 0.04) },
      { name: 'looped', options: { loop: true, loopStart: 0.002, loopEnd: 0.008 }, offset: 0, duration: 0.04, samples: await run({ loop: true, loopStart: 0.002, loopEnd: 0.008 }, 0, 0.04) },
      { name: 'faded', options: { fadeIn: 0.003, fadeOut: 0.004 }, offset: 0.001, duration: 0.01, samples: await run({ fadeIn: 0.003, fadeOut: 0.004 }, 0.001, 0.01) },
    ],
  };
}

async function synths() {
  const cases = [
    { name: 'synth', make: () => new Tone.Synth(), note: 261.6255653005986, play: (s) => s.triggerAttackRelease(261.6255653005986, 0.15, T0) },
    { name: 'mono', make: () => new Tone.MonoSynth(), note: 261.6255653005986, play: (s) => s.triggerAttackRelease(261.6255653005986, 0.15, T0) },
    { name: 'fm', make: () => new Tone.FMSynth(), note: 261.6255653005986, play: (s) => s.triggerAttackRelease(261.6255653005986, 0.15, T0) },
    { name: 'am', make: () => new Tone.AMSynth(), note: 261.6255653005986, play: (s) => s.triggerAttackRelease(261.6255653005986, 0.15, T0) },
    { name: 'duo', make: () => new Tone.DuoSynth(), note: 261.6255653005986, play: (s) => s.triggerAttackRelease(261.6255653005986, 0.15, T0) },
    { name: 'membrane', make: () => new Tone.MembraneSynth(), note: 65.40639132514966, play: (s) => s.triggerAttackRelease(65.40639132514966, 0.15, T0) },
    { name: 'metal', make: () => new Tone.MetalSynth(), note: 200, play: (s) => s.triggerAttackRelease(200, 0.15, T0) },
    { name: 'noise', make: () => new Tone.NoiseSynth(), note: 0, play: (s) => s.triggerAttackRelease(0.15, T0) },
    { name: 'pluck', make: () => new Tone.PluckSynth(), note: 261.6255653005986, play: (s) => s.triggerAttackRelease(261.6255653005986, 0.15, T0) },
  ];
  const res = [];
  for (const c of cases) {
    const [l] = await offline(0.45, () => { const s = c.make().toDestination(); c.play(s); }, 1);
    const from = l.slice(Math.round(T0 * RATE));
    const m = measure(from, c.note ? { from: 0.03, to: 0.13, hz: c.note } : { from: 0.03, to: 0.13 });
    res.push(Object.assign({ name: c.name, note: c.note }, m, { rms: kept(m.rms) }));
  }
  // a sampler of one recording (a 220 Hz tone as A3) playing C4
  const rec = new Float32Array(Math.round(0.4 * RATE));
  for (let i = 0; i < rec.length; i++) rec[i] = 0.5 * Math.sin(2 * Math.PI * 220 * i / RATE) * Math.min(1, i / 80);
  const [l] = await offline(0.45, () => {
    const sp = new Tone.Sampler({ urls: { A3: Tone.ToneAudioBuffer.fromArray(rec) } }).toDestination();
    sp.triggerAttackRelease(261.6255653005986, 0.15, T0);
  }, 1);
  const m = measure(l.slice(Math.round(T0 * RATE)), { from: 0.03, to: 0.13, hz: 261.6255653005986 });
  res.push(Object.assign({ name: 'sampler', note: 261.6255653005986 }, m, { rms: kept(m.rms) }));
  out.synths = res;
}

async function effects() {
  const input = effectInput();
  const cases = [
    { name: 'auto_filter', make: () => new Tone.AutoFilter().start(0) },
    { name: 'auto_panner', make: () => new Tone.AutoPanner({ frequency: 4 }).start(0) },
    { name: 'auto_wah', make: () => new Tone.AutoWah() },
    { name: 'bit_crusher', make: () => new Tone.BitCrusher(4) },
    { name: 'chebyshev', make: () => new Tone.Chebyshev(3) },
    { name: 'chorus', make: () => new Tone.Chorus().start(0) },
    { name: 'distortion', make: () => new Tone.Distortion(0.8) },
    { name: 'feedback_delay', make: () => new Tone.FeedbackDelay({ delayTime: 0.0625, feedback: 0.5, wet: 0.5 }) },
    { name: 'ping_pong_delay', make: () => new Tone.PingPongDelay({ delayTime: 0.0625, feedback: 0.5 }) },
    { name: 'freeverb', make: () => new Tone.Freeverb() },
    { name: 'jc_reverb', make: () => new Tone.JCReverb() },
    { name: 'reverb', make: async () => { const r = new Tone.Reverb({ decay: 0.3, preDelay: 0.01 }); await r.ready; return r; } },
    { name: 'frequency_shifter', make: () => new Tone.FrequencyShifter(100) },
    { name: 'phaser', make: () => new Tone.Phaser() },
    { name: 'pitch_shift', make: () => new Tone.PitchShift(7) },
    { name: 'stereo_widener', make: () => new Tone.StereoWidener(0.8) },
    { name: 'tremolo', make: () => new Tone.Tremolo().start(0) },
    { name: 'vibrato', make: () => new Tone.Vibrato() },
  ];
  const res = [];
  for (const c of cases) {
    const [l, r] = await offline(0.4, async () => {
      const fx = await c.make();
      fx.toDestination();
      new Tone.Player(Tone.ToneAudioBuffer.fromArray(input)).connect(fx).start(T0);
    }, 2);
    const a = Math.round(T0 * RATE);
    const left = l.slice(a), right = r.slice(a);
    res.push({ name: c.name, left_rms: kept(windows(left, 160)), right_rms: kept(windows(right, 160)), left: kept(left.slice(0, 480)), right: kept(right.slice(0, 480)), left_measure: measure(left, { from: 0.02, to: 0.14, hz: c.name === 'frequency_shifter' ? 540 : 440 }) });
  }
  // the reverb's noise differs each render, so what is held of it is the
  // energy of its answer to a click (which the convolver's scaling sets)
  const [click] = await offline(0.4, async () => {
    const r = new Tone.Reverb({ decay: 0.3, preDelay: 0.01 }); await r.ready; r.toDestination();
    const arr = new Float32Array(16); arr[0] = 1;
    new Tone.Player(Tone.ToneAudioBuffer.fromArray(arr)).connect(r).start(0);
  }, 2);
  let energy = 0;
  for (const v of click) energy += v * v;
  out.effects = res;
  out.reverb_click_energy = energy;
}

async function dynamics() {
  const n = Math.round(0.5 * RATE);
  const loud = new Float32Array(n);
  for (let i = 0; i < n; i++) loud[i] = 0.9 * Math.sin(2 * Math.PI * 200 * i / RATE);
  const run = async (make) => {
    const [l] = await offline(0.5, () => {
      const node = make(); node.toDestination();
      new Tone.Player(Tone.ToneAudioBuffer.fromArray(loud)).connect(node).start(0);
    }, 1);
    let peak = 0;
    for (let i = Math.round(0.35 * RATE); i < Math.round(0.45 * RATE); i++) peak = Math.max(peak, Math.abs(l[i]));
    return { peak, rms: kept(windows(l, 160)) };
  };
  out.dynamics = {
    compressor: await run(() => new Tone.Compressor()),
    compressor_hard: await run(() => new Tone.Compressor({ threshold: -20, ratio: 4, knee: 0, attack: 0.01, release: 0.1 })),
    limiter: await run(() => new Tone.Limiter(-12)),
    gate: await run(() => new Tone.Gate(-10, 0.05)),
  };
}

async function analysis() {
  const reads = [];
  const n = Math.round(0.2 * RATE);
  const xs = new Float32Array(n);
  for (let i = 0; i < n; i++) xs[i] = 0.5 * Math.sin(2 * Math.PI * 1000 * i / RATE) + 0.25 * Math.sin(2 * Math.PI * 3000 * i / RATE);
  // (Tone's own analyser and meter in a context of the page's own, read
  // where its rendering is suspended: after 12 and 18 render quanta)
  const native = new OfflineAudioContext(1, n, RATE);
  const ctx = new Tone.OfflineContext(native);
  const was = Tone.getContext();
  Tone.setContext(ctx);
  const fft = new Tone.Analyser('fft', 256);
  const wave = new Tone.Analyser('waveform', 256);
  const meter = new Tone.Meter();
  const p = new Tone.Player(Tone.ToneAudioBuffer.fromArray(xs));
  p.fan(fft, wave, meter);
  p.toDestination();
  p.start(0);
  for (const frames of [1536, 2304]) {
    native.suspend(frames / RATE).then(() => {
      reads.push({ frame: Math.round(native.currentTime * RATE), fft: Array.from(fft.getValue(), (v) => (isFinite(v) ? +v.toPrecision(7) : -1000)), waveform: kept(wave.getValue()), meter: meter.getValue() });
      native.resume();
    });
  }
  await native.startRendering();
  Tone.setContext(was);
  out.analysis = { input: 'sines 1000 Hz 0.5 and 3000 Hz 0.25', size: 256, reads };
}

async function positions() {
  const cases = [
    { name: 'right', panner: { positionX: 1, positionY: 0, positionZ: 0 }, listener: {} },
    { name: 'left behind', panner: { positionX: -1, positionY: 0, positionZ: 2 }, listener: {} },
    { name: 'ahead far', panner: { positionX: 0, positionY: 0, positionZ: -4 }, listener: {} },
    { name: 'above', panner: { positionX: 0.5, positionY: 2, positionZ: -1 }, listener: {} },
    { name: 'linear', panner: { positionX: 3, positionY: 0, positionZ: -3, distanceModel: 'linear', maxDistance: 10, rolloffFactor: 1 }, listener: {} },
    { name: 'exponential', panner: { positionX: -2, positionY: 1, positionZ: -2, distanceModel: 'exponential', rolloffFactor: 1.5 }, listener: {} },
    { name: 'cone', panner: { positionX: 0, positionY: 0, positionZ: -2, orientationX: 1, orientationY: 0, orientationZ: 1, coneInnerAngle: 60, coneOuterAngle: 180, coneOuterGain: 0.2 }, listener: {} },
    { name: 'turned listener', panner: { positionX: 1, positionY: 0, positionZ: -1 }, listener: { positionX: 0, positionY: 1, positionZ: 0, forwardX: 1, forwardY: 0, forwardZ: 0 } },
    { name: 'nodded listener', panner: { positionX: 0, positionY: 2, positionZ: -2 }, listener: { positionX: 0, positionY: 1, positionZ: 0, forwardX: 0, forwardY: -0.5, forwardZ: -1, upX: 0, upY: 1, upZ: -0.5 } },
  ];
  const res = [];
  for (const c of cases) {
    const [l, r] = await offline(0.02, (ctx) => {
      for (const [k, v] of Object.entries(c.listener)) ctx.listener[k].value = v;
      const pan = new Tone.Panner3D(Object.assign({ panningModel: 'equalpower' }, c.panner)).toDestination();
      new Tone.Signal(1).connect(pan);
    }, 2);
    res.push(Object.assign({}, c, { left: +l[l.length - 1].toPrecision(7), right: +r[r.length - 1].toPrecision(7) }));
  }
  const pans = [];
  for (const pan of [-1, -0.5, 0, 0.3, 1]) {
    const [l, r] = await offline(0.02, () => {
      const p = new Tone.Panner(pan).toDestination();
      new Tone.Signal(1).connect(p);
    }, 2);
    pans.push({ pan, left: +l[l.length - 1].toPrecision(7), right: +r[r.length - 1].toPrecision(7) });
  }
  out.positions = res;
  out.pans = pans;
}

async function renders() {
  await oscillators();
  await noises();
  await filters();
  await signals();
  await players();
  await synths();
  await effects();
  await dynamics();
  await analysis();
  await positions();
}

async function main() {
  try {
    await notation();
    pitch();
    await envelopes();
    await ramps();
    await schedules();
    await renders();
    out.ok = true;
  } catch (e) {
    out.ok = false;
    out.error = String(e && e.stack || e);
  }
  await fetch('/done', { method: 'POST', body: JSON.stringify(out) });
}

main();
