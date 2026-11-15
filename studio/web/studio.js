// Lory Studio's page: another page of this site held in a made-up headset.
//
// The page being tried runs in the frame as it is, its own program and
// Crow's own loader; headset.js is put in it and gives it a headset to
// find (WebXR's own calls, answered by a simulator), and this page is that
// headset's holder: it moves the head and the hands from the pointer and
// the keys, pumps the frames, shows an eye's picture of each, measures
// (what a frame costs, how many degrees a thing takes, where the centre of
// the view is), runs walks, and plays recordings — its own, or a real
// headset's taken over the cable through the helper (`studio.py device
// serve`). Open it as /studio/index.html?at=<a page of the site>.
'use strict';

const $ = (id) => document.getElementById(id);
const page = $('page'), hold = $('hold'), view = $('view'), seen = $('seen'), marks = $('marks'), pad = $('pad');
const query = new URLSearchParams(location.search);
const HELPER = (query.get('helper') || 'http://127.0.0.1:3990').replace(/\/$/, '');
const RAD = Math.PI / 180;
const W = window.LoryWalk;
const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

const at = {
  sim: null, win: null, eye: 'left', paused: false,
  last: null,          // where the pointer is in an eye's picture, and whose hand it aims
  turning: null, ruling: false, rule: null, pressing: '', pressed: 0, letting: '',
  keys: new Set(), wheel: null, gripping: '', ticked: 0, then: 0, told: 0,
  recording: null, keeping: false, things: [], walking: false,
  helper: null, following: null, mirroring: null, mirroring_now: false,
};
const inside = () => !!(at.sim && at.sim.inside);
const status = (words) => { $('status').textContent = words; };
const fixed = (n, d = 2) => (Math.abs(n) < 0.5 * Math.pow(10, -d) ? 0 : n).toFixed(d);

// ---- a page opened, and a headset given it ----

function put_in(w, file) {
  return new Promise((ok, no) => {
    if (w.LoryHeadset) return ok();
    const s = w.document.createElement('script');
    s.src = new URL(file, location.href).href;
    s.onload = () => ok();
    s.onerror = () => no(new Error(file + ' did not load in the page'));
    w.document.head.appendChild(s);
  });
}

async function open(where) {
  if (inside()) await leave();
  at.sim = null;
  at.win = null;
  at.last = null;
  at.rule = null;
  at.things = [];
  enable();
  status('opening ' + where + ' …');
  const loaded = new Promise((ok) => page.addEventListener('load', ok, { once: true }));
  if (page.getAttribute('src') === where) page.contentWindow.location.reload();
  else page.setAttribute('src', where);
  await loaded;
  let w = null;
  try { w = page.contentWindow; void w.document.body; } catch (e) { w = null; }
  if (!w) return status('that page is not of this site: the Studio holds pages of the site it is served from');
  try { await put_in(w, 'headset.js'); } catch (e) { return status(String(e.message || e)); }
  const till = Date.now() + 30000;
  while (!(w.crow && w.crow.gl) && Date.now() < till) await sleep(100);
  if (!(w.crow && w.crow.gl)) return status('the page started no Crow program (it keeps none as `window.crow`)');
  at.win = w;
  at.sim = w.LoryHeadset.now || w.LoryHeadset.simulate({ canvas: w.crow.gl.canvas });
  try { await w.crow.vr_supported(); } catch (e) { /* the page says so itself */ }
  status('open, not in the headset yet: ' + where);
  enable();
}

async function enter(kind = 'vr') {
  if (!at.sim || inside()) return;
  try { await at.sim.enter(at.win.crow, kind); } catch (e) { return status('the page did not enter its headset: ' + (e.message || e)); }
  view.classList.add('inside');
  view.classList.toggle('ar', at.sim.state.mode === 'immersive-ar');
  at.then = 0;
  fit();
  view.focus();
  status('in the headset (' + at.sim.state.mode + ')');
  enable();
}

async function leave() {
  if (!inside()) return;
  await at.sim.exit();
  view.classList.remove('inside');
  fit();
  status('out of the headset');
  enable();
}

function enable() {
  const open_now = !!at.sim, here = inside();
  $('enter').disabled = !open_now || here;
  $('enter_ar').disabled = !open_now || here;
  $('leave').disabled = !here;
  $('run').disabled = !open_now || at.walking;
  $('keep').disabled = !here;
  $('play').disabled = !open_now || !at.recording;
  $('save').disabled = !at.recording;
  const helped = !!at.helper && !!at.helper.device;
  $('d-open').disabled = !helped || !open_now;
  $('d-rec').disabled = !helped;
  $('d-take').disabled = !helped;
  $('d-follow').disabled = !helped || !open_now;
  $('d-mirror').disabled = !helped;
}

// ---- the view ----

// the view takes an eye's own shape (or both eyes') while in the headset, the whole stage outside it
function fit() {
  const b = hold.getBoundingClientRect();
  let w = b.width, h = b.height;
  if (inside()) {
    const p = at.sim.part('left'), a = (at.eye === 'both' ? 2 : 1) * p.width / p.height;
    if (w / h > a) w = h * a;
    else h = w / a;
  }
  w = Math.max(1, Math.floor(w));
  h = Math.max(1, Math.floor(h));
  if (view.style.width !== w + 'px') view.style.width = w + 'px';
  if (view.style.height !== h + 'px') view.style.height = h + 'px';
  const r = window.devicePixelRatio || 1;
  for (const c of [seen, marks]) {
    const cw = Math.round(w * r), ch = Math.round(h * r);
    if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
  }
}

// the frame just drawn, an eye of it (or both), put in the view: taken in
// the turn the frame was drawn in, while the program's canvas still holds it
function show() {
  const s = at.sim, c = at.win.crow.gl.canvas, g = seen.getContext('2d');
  g.clearRect(0, 0, seen.width, seen.height);
  if (at.eye === 'both') {
    const l = s.part('left'), r = s.part('right'), half = seen.width / 2;
    g.drawImage(c, l.x, l.y, l.width, l.height, 0, 0, half, seen.height);
    g.drawImage(c, r.x, r.y, r.width, r.height, half, 0, half, seen.height);
  } else {
    const p = s.part(at.eye);
    g.drawImage(c, p.x, p.y, p.width, p.height, 0, 0, seen.width, seen.height);
  }
}

// ---- the head and the hands, from the pointer and the keys ----

// where a pointer is: which eye's picture, and where in it
function where(e) {
  const b = pad.getBoundingClientRect();
  let u = (e.clientX - b.left) / b.width, eye = at.eye;
  const v = (e.clientY - b.top) / b.height;
  if (eye === 'both') { eye = u < 0.5 ? 'left' : 'right'; u = u < 0.5 ? u * 2 : u * 2 - 1; }
  return { eye, u, v };
}
// the playing or the following let go of: the head and the hands are the holder's
function mine() {
  if (at.following) follow(false);
  if (at.sim.state.playing) { at.sim.stop(); told_kept(); }
}

pad.addEventListener('contextmenu', (e) => e.preventDefault());
pad.addEventListener('pointerdown', (e) => {
  if (!inside()) return;
  view.focus();
  try { pad.setPointerCapture(e.pointerId); } catch (x) { /* a pointer made up by a test has none to hold */ }
  e.preventDefault();
  const p = where(e);
  if (e.button === 2 || (e.button === 0 && e.ctrlKey)) {
    mine();
    const h = at.sim.head({});
    at.turning = { x: e.clientX, y: e.clientY, turn: h.turn, nod: h.nod };
    return;
  }
  if (e.button !== 0) return;
  if (e.altKey) { at.ruling = true; at.rule = { a: p, b: p }; return; }
  mine();
  const hand = e.shiftKey ? 'left' : 'right';
  at.last = Object.assign(p, { hand });
  at.sim.aim_through(hand, p.eye, p.u, p.v);
  at.sim.press(hand, true);
  at.pressing = hand;
  at.pressed = at.sim.state.frames;
});
pad.addEventListener('pointermove', (e) => {
  if (!inside()) return;
  const p = where(e);
  if (at.turning) {
    // (the room is dragged as if held: a drag to the left turns the head to the right)
    const b = pad.getBoundingClientRect(), port = at.sim.views()[0].projectionMatrix;
    const across = 2 * Math.atan(1 / port[0]) / RAD * (at.eye === 'both' ? 2 : 1), up = 2 * Math.atan(1 / port[5]) / RAD;
    at.sim.head({ turn: at.turning.turn - (e.clientX - at.turning.x) / b.width * across, nod: Math.max(-89, Math.min(89, at.turning.nod + (e.clientY - at.turning.y) / b.height * up)) });
    return;
  }
  if (at.ruling) { if (p.eye === at.rule.a.eye) at.rule.b = p; return; }
  at.last = Object.assign(p, { hand: at.pressing || (e.shiftKey ? 'left' : 'right') });
});
// (a trigger let go within the frame it was pulled in is held two frames
// more: a program is told of a frame's presses, and a controller's own
// press is never that short)
const released = () => {
  at.turning = null;
  at.ruling = false;
  if (at.pressing && inside()) {
    if (at.sim.state.frames - at.pressed < 2) at.letting = at.pressing;
    else at.sim.press(at.pressing, false);
  }
  at.pressing = '';
};
pad.addEventListener('pointerup', released);
pad.addEventListener('pointercancel', released);
pad.addEventListener('wheel', (e) => {
  e.preventDefault();
  at.wheel = { until: performance.now() + 140, y: Math.sign(e.deltaY) };
}, { passive: false });

const HELD = ['w', 'a', 's', 'd', 'q', 'e', 'g', '1', '2', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
const typing = (t) => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
function key(e, down) {
  if (!inside() || typing(e.target) || e.metaKey || e.ctrlKey) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (down && k === 'r') { mine(); at.sim.reset(); return e.preventDefault(); }
  if (down && k === ' ') { paused(!at.paused); return e.preventDefault(); }
  if (down && k === 'Escape') { at.rule = null; $('ruler').textContent = 'Alt-drag across the picture to measure an angle.'; return; }
  if (!HELD.includes(k)) return;
  e.preventDefault();
  if (down === at.keys.has(k)) return;
  if (down) at.keys.add(k); else at.keys.delete(k);
  const hand = e.shiftKey ? 'left' : 'right';
  if (k === 'g') {
    at.sim.squeeze(down ? hand : at.gripping || hand, down);
    at.gripping = down ? hand : '';
  }
  if (k === '1') at.sim.state.hands.right.a = down ? 1 : 0;
  if (k === '2') at.sim.state.hands.right.b = down ? 1 : 0;
  if (down) mine();
}
window.addEventListener('keydown', (e) => key(e, true));
window.addEventListener('keyup', (e) => key(e, false));
window.addEventListener('blur', () => { at.keys.clear(); released(); });

// a tick's worth of walking and of thumbstick, and the hand kept under the pointer
function moved(dt) {
  const s = at.sim, k = at.keys;
  if (at.walking || at.following || (s.state.playing && !s.played)) return;
  const f = (k.has('w') ? 1 : 0) - (k.has('s') ? 1 : 0), r = (k.has('d') ? 1 : 0) - (k.has('a') ? 1 : 0), u = (k.has('e') ? 1 : 0) - (k.has('q') ? 1 : 0);
  if (f || r || u) {
    const h = s.head({}), t = h.turn * RAD, v = 1.2 * dt;
    s.head({ x: h.x + (Math.sin(t) * f + Math.cos(t) * r) * v, y: h.y + u * v, z: h.z + (-Math.cos(t) * f + Math.sin(t) * r) * v });
  }
  const sx = (k.has('ArrowRight') ? 1 : 0) - (k.has('ArrowLeft') ? 1 : 0);
  let sy = (k.has('ArrowDown') ? 1 : 0) - (k.has('ArrowUp') ? 1 : 0);
  if (at.wheel && performance.now() < at.wheel.until) sy = at.wheel.y;
  else at.wheel = null;
  s.stick('right', sx, sy);
  if (at.last && !s.state.playing) s.aim_through(at.last.hand, at.last.eye, at.last.u, at.last.v);
}

function paused(yes) {
  at.paused = yes;
  $('pause').textContent = yes ? 'Run' : 'Pause';
}

// ---- what is drawn over the picture ----

const turned = (m, d) => [m[0] * d[0] + m[4] * d[1] + m[8] * d[2], m[1] * d[0] + m[5] * d[1] + m[9] * d[2], m[2] * d[0] + m[6] * d[1] + m[10] * d[2]];
// a line through points of the room, drawn where they fall in an eye's picture
function line(g, eye, put, points, closed) {
  let pen = false, first = null;
  g.beginPath();
  for (const p of points) {
    const s = at.sim.spot(eye, p);
    if (!s || s[0] < -1 || s[0] > 2 || s[1] < -1 || s[1] > 2) { pen = false; continue; }
    const q = put(s);
    if (pen) g.lineTo(q[0], q[1]);
    else g.moveTo(q[0], q[1]);
    if (!first) first = q;
    pen = true;
  }
  if (closed && pen && first) g.closePath();
  g.stroke();
}
const way = (turn, nod) => [Math.sin(turn * RAD) * Math.cos(nod * RAD), Math.sin(nod * RAD), -Math.cos(turn * RAD) * Math.cos(nod * RAD)];

// the centre of the view (the 41° a guideline keeps content in), about
// where the head faces, and the height a panel's centre belongs at (5°
// under eye level)
function rings(g, eye, put, r) {
  const pose = at.sim.pose(), m = pose.head, from = [m[12], m[13], m[14]];
  const half = W.ASKED.centre / 2, points = [];
  for (let a = 0; a <= 360; a += 6) {
    const d = turned(m, [Math.tan(half * RAD) * Math.cos(a * RAD), Math.tan(half * RAD) * Math.sin(a * RAD), -1]);
    points.push([from[0] + d[0], from[1] + d[1], from[2] + d[2]]);
  }
  g.lineWidth = 1.5 * r;
  g.strokeStyle = 'rgba(246, 195, 67, 0.75)';
  g.setLineDash([8 * r, 6 * r]);
  line(g, eye, put, points, true);
  g.setLineDash([]);
  const f = turned(m, [0, 0, -1]), turn = Math.atan2(f[0], -f[2]) / RAD, low = [];
  for (let t = -half; t <= half; t += 2) { const d = way(turn + t, -W.ASKED.low); low.push([from[0] + d[0], from[1] + d[1], from[2] + d[2]]); }
  g.strokeStyle = 'rgba(246, 195, 67, 0.45)';
  line(g, eye, put, low, false);
  const s = at.sim.spot(eye, low[low.length - 1]);
  if (s) { const q = put(s); g.fillStyle = 'rgba(246, 195, 67, 0.8)'; g.font = 11 * r + 'px system-ui, sans-serif'; g.fillText('5° under eye level', q[0] + 4 * r, q[1] + 4 * r); }
}

// the room's own directions, a line every ten degrees of turn and of nod
function grid(g, eye, put, r) {
  const m = at.sim.pose().head, from = [m[12], m[13], m[14]];
  const to = (t, n) => { const d = way(t, n); return [from[0] + d[0], from[1] + d[1], from[2] + d[2]]; };
  g.lineWidth = r;
  for (let t = -180; t < 180; t += 10) {
    const points = [];
    for (let n = -80; n <= 80; n += 4) points.push(to(t, n));
    g.strokeStyle = t === 0 ? 'rgba(110, 200, 255, 0.6)' : 'rgba(110, 200, 255, 0.22)';
    line(g, eye, put, points, false);
  }
  for (let n = -80; n <= 80; n += 10) {
    const points = [];
    for (let t = -180; t <= 180; t += 4) points.push(to(t, n));
    g.strokeStyle = n === 0 ? 'rgba(110, 200, 255, 0.6)' : 'rgba(110, 200, 255, 0.22)';
    line(g, eye, put, points, false);
  }
  g.fillStyle = 'rgba(150, 215, 255, 0.9)';
  g.font = 11 * r + 'px system-ui, sans-serif';
  for (let t = -180; t < 180; t += 30) {
    const s = at.sim.spot(eye, to(t, 0));
    if (s && s[0] > 0 && s[0] < 1 && s[1] > 0 && s[1] < 1) { const q = put(s); g.fillText(t + '°', q[0] + 3 * r, q[1] - 3 * r); }
  }
}

// what the page names (its `lory_targets()`), each outlined: red under what
// a guideline asks, amber at it, green where it is easy
function things(g, eye, put, r) {
  for (const t of at.things) {
    if (t.kind === 'text') {
      // (words: only the ones too small are marked, a line under them)
      if (!t.small) continue;
      g.lineWidth = r;
      g.strokeStyle = 'rgba(235, 87, 87, 0.7)';
      line(g, eye, put, [t.quad[3], t.quad[2]], false);
      continue;
    }
    g.lineWidth = 1.5 * r;
    g.strokeStyle = t.small ? 'rgba(235, 87, 87, 0.95)' : t.easy ? 'rgba(61, 189, 133, 0.8)' : 'rgba(246, 195, 67, 0.9)';
    line(g, eye, put, t.quad, true);
  }
}

function ruled(g, put, r) {
  const a = put([at.rule.a.u, at.rule.a.v]), b = put([at.rule.b.u, at.rule.b.v]);
  g.strokeStyle = '#fff';
  g.lineWidth = 1.5 * r;
  g.beginPath();
  g.moveTo(a[0], a[1]);
  g.lineTo(b[0], b[1]);
  g.stroke();
  for (const p of [a, b]) { g.beginPath(); g.arc(p[0], p[1], 3 * r, 0, 7); g.fillStyle = '#fff'; g.fill(); }
}

function marked() {
  const g = marks.getContext('2d'), w = marks.width, h = marks.height, r = window.devicePixelRatio || 1;
  g.clearRect(0, 0, w, h);
  const eyes = at.eye === 'both' ? ['left', 'right'] : [at.eye];
  eyes.forEach((eye, i) => {
    const box = { x: i * w / eyes.length, w: w / eyes.length };
    const put = (p) => [box.x + p[0] * box.w, p[1] * h];
    g.save();
    g.beginPath();
    g.rect(box.x, 0, box.w, h);
    g.clip();
    if ($('grid').checked) grid(g, eye, put, r);
    if ($('cone').checked) rings(g, eye, put, r);
    if ($('sizes').checked) things(g, eye, put, r);
    if (at.rule && at.rule.a.eye === eye) ruled(g, put, r);
    g.restore();
  });
}

// ---- what is told beside the picture ----

function told_ruler() {
  if (!at.rule) return;
  const a = at.sim.through(at.rule.a.eye, at.rule.a.u, at.rule.a.v), b = at.sim.through(at.rule.b.eye, at.rule.b.u, at.rule.b.v);
  const deg = W.angle(a.way, b.way);
  $('ruler').textContent = 'measured  ' + fixed(deg) + '°  =  ' + fixed(deg / W.DMM, 0) + ' dmm  =  ' + fixed(deg / W.DP, 0) + ' dp\n' +
    'a guideline asks  ' + fixed(W.ASKED.target) + '° of a target (48 dp), ' + fixed(W.ASKED.easy) + '° to be easy · ' + fixed(W.ASKED.text) + '° of letters (14 dp)';
}

function tell() {
  const s = at.sim, st = s.state;
  if (!inside()) {
    $('pose').textContent = 'not in the headset';
    $('cost').textContent = '';
    return;
  }
  const m = s.pose();
  const facing = (x) => { const f = turned(x, [0, 0, -1]); return 'turn ' + fixed(Math.atan2(f[0], -f[2]) / RAD, 0) + '°  nod ' + fixed(Math.asin(Math.max(-1, Math.min(1, f[1]))) / RAD, 0) + '°'; };
  const hand = (name) => { const k = st.hands[name], x = m[name]; return (name + ' ').slice(0, 6) + (k.shown ? 'at ' + fixed(x[12]) + ' ' + fixed(x[13]) + ' ' + fixed(x[14]) + '  ' + facing(x) + (k.trigger ? '  trigger' : '') + (k.grip ? '  grip' : '') + (k.stick[0] || k.stick[1] ? '  stick ' + fixed(k.stick[0], 1) + ' ' + fixed(k.stick[1], 1) : '') + (k.a ? '  A' : '') + (k.b ? '  B' : '') : 'not seen'); };
  $('pose').textContent = 'head  at ' + fixed(m.head[12]) + ' ' + fixed(m.head[13]) + ' ' + fixed(m.head[14]) + '  ' + facing(m.head) + '\n' + hand('right') + '\n' + hand('left') + '\n' +
    st.device.name + ' · ' + st.device.width + ' by ' + st.device.height + ' · ' + st.mode + ' · frame ' + st.frames + (st.pulses.length ? ' · ' + st.pulses.length + ' pulses felt' : '') +
    (st.playing && !s.played ? '\nplaying a recording: ' + (st.playing.at + 1) + ' of ' + st.playing.rec.samples.length : '') + (at.following ? '\nfollowing the real headset' : '') + (at.paused ? '\nthe frames are stopped' : '');
  const c = s.cost(), budget = 1000 / st.device.hz;
  let words = c.frames ? 'a frame costs  ' + c.median + ' ms  (95 in 100 under ' + c.p95 + ', the worst ' + c.worst + ')\non this desk: the ' + st.device.name + ' has ' + fixed(budget, 1) + ' ms a frame at ' + st.device.hz + ' Hz,\nand is several times slower — time it there (The real headset)' : '';
  if (st.counts) { const n = st.counts; words += '\na frame: ' + (n.drawArrays + n.drawElements) + ' draws · ' + (n.bufferData + n.bufferSubData) + ' buffers filled (' + Math.round(n.bytes / 1024) + ' KB) · ' + (n.texImage2D + n.texSubImage2D) + ' pictures sent · ' + n.useProgram + ' programs'; }
  $('cost').textContent = words;
  told_ruler();
  // (what the page names, measured from where the head is now)
  if ($('sizes').checked && typeof at.win.lory_targets === 'function') {
    let named = [];
    try { named = at.win.lory_targets() || []; } catch (e) { named = []; }
    at.things = W.sized(named, [m.head[12], m.head[13], m.head[14]]);
    const pressed = at.things.filter((t) => t.kind === 'target'), words = at.things.filter((t) => t.kind === 'text');
    const small = pressed.filter((t) => t.small).sort((a, b) => a.least - b.least), faint = words.filter((t) => t.small).sort((a, b) => a.least - b.least);
    const spread = at.things.map((t) => t.turn), few = (list) => { const seen = new Set(); return list.filter((t) => !seen.has(t.name) && seen.add(t.name)).slice(0, 4).map((t) => '\n  ' + (t.name || t.kind).slice(0, 22) + '  ' + fixed(t.dp_w, 0) + ' by ' + fixed(t.dp_h, 0) + ' dp' + (t.askew ? ', askew' : '')).join(''); };
    $('things').textContent = pressed.length + ' things to press · ' + small.length + ' under ' + W.ASKED.target_dp + ' dp (red)' + few(small) +
      '\n' + words.length + ' runs of words · ' + faint.length + ' with letters under ' + W.ASKED.text_dp + ' dp (underlined)' + few(faint) +
      (spread.length ? '\nthey lie from ' + fixed(Math.min(...spread), 0) + '° to ' + fixed(Math.max(...spread), 0) + '° about the reader' : '');
  } else {
    at.things = [];
    $('things').textContent = $('sizes').checked ? 'the page names nothing to size (it has no lory_targets())' : '';
  }
}

// ---- the frames ----

function tick(now) {
  at.ticked = performance.now();
  if (!at.sim) return;
  fit();
  if (inside()) {
    const gap = at.then ? Math.max(4, Math.min(50, now - at.then)) : 1000 / at.sim.device.hz;
    moved(gap / 1000);
    if (at.sim.state.playing && at.sim.played) { at.sim.stop(); told_kept(); }
    if (at.letting && at.sim.state.frames - at.pressed >= 2) { at.sim.press(at.letting, false); at.letting = ''; }
    if (!at.paused && !at.walking && at.sim.pump(gap)) show();
    marked();
  } else if (view.classList.contains('inside')) {
    // (the page left its headset by itself)
    view.classList.remove('inside');
    enable();
  }
  at.then = now;
  if (now - at.told > 200) { at.told = now; tell(); }
}
function frames(now) {
  tick(now);
  requestAnimationFrame(frames);
}
requestAnimationFrame(frames);
// (a window its browser gives no frames to, one not shown, is kept going by a timer)
setInterval(() => { if (performance.now() - at.ticked > 40) tick(performance.now()); }, 16);

// ---- the buttons ----

$('go').addEventListener('submit', (e) => {
  e.preventDefault();
  const where = $('at').value.trim();
  if (!where) return;
  const u = new URL(location.href);
  u.searchParams.set('at', where);
  history.replaceState(null, '', u);
  open(where);
});
$('enter').onclick = () => enter('vr');
$('enter_ar').onclick = () => enter('ar');
$('leave').onclick = leave;
$('pause').onclick = () => paused(!at.paused);
$('reset').onclick = () => { if (at.sim) { mine(); at.sim.reset(); at.last = null; } };
$('eye').onchange = () => { at.eye = $('eye').value; at.last = null; at.rule = null; fit(); };
$('calls').onchange = () => { if (at.sim) at.sim.count($('calls').checked); };

// ---- a walk ----

function listed(r, out) {
  const row = document.createElement('div');
  row.className = 'step';
  row.innerHTML = '<span class="' + (r.ok ? 'ok">✓' : 'no">✗') + '</span><span></span><span class="said"></span>';
  row.children[1].textContent = r.n + ' ' + r.do;
  row.children[2].textContent = r.said;
  $('results').appendChild(row);
  if (r.shot && out.shots[r.shot]) {
    const img = document.createElement('img');
    img.src = out.shots[r.shot];
    img.title = r.shot;
    $('results').appendChild(img);
  }
}
$('run').onclick = async () => {
  let walk;
  try { walk = JSON.parse($('walk').value); } catch (e) { $('walked').textContent = 'the walk is not JSON: ' + e.message; return; }
  $('results').textContent = '';
  $('walked').textContent = 'walking …';
  at.walking = true;
  mine();
  enable();
  try {
    const recordings = at.recording ? { held: at.recording } : {};
    const out = await W.run(walk, { win: at.win, sim: at.sim, recordings, seen: () => { fit(); show(); marked(); }, on: listed });
    $('walked').textContent = out.ok ? 'walked: every step held' : 'walked: a step did not hold';
  } catch (e) {
    $('walked').textContent = String(e.message || e);
  }
  at.walking = false;
  view.classList.toggle('inside', inside());
  enable();
};

// ---- a recording ----

function told_kept() {
  const rec = at.recording;
  if (!rec) { $('kept').textContent = at.keeping ? 'keeping …' : 'no recording is held'; return; }
  const t = at.win && at.win.LoryHeadset ? at.win.LoryHeadset.told(rec) : window.LoryHeadset.told(rec);
  $('kept').textContent = (rec.device || 'a headset').slice(0, 60) + '\n' + t.frames + ' frames over ' + t.seconds + ' s · ' + t.events + ' presses' +
    (t.frames_a_second ? '\n' + t.frames_a_second + ' frames a second · a frame cost ' + t.cost_median_ms + ' ms there (95 in 100 under ' + t.cost_p95_ms + ')' + '\nthe longest waits between frames: ' + t.frame_gap_p95_ms + ' ms (95 in 100 under it)' : '');
}
$('keep').onclick = () => {
  if (!inside()) return;
  if (!at.keeping) { at.sim.keep(true); at.keeping = true; $('keep').textContent = 'Stop keeping'; told_kept(); return; }
  at.recording = at.sim.keep(false);
  at.keeping = false;
  $('keep').textContent = 'Keep what I do';
  told_kept();
  enable();
};
$('play').onclick = async () => {
  if (!at.recording || !at.sim) return;
  if (!inside()) await enter();
  if (!inside()) return;
  if (at.following) follow(false);
  paused(false);
  at.sim.replay(at.recording);
  fit();
};
$('save').onclick = () => {
  if (!at.recording) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(at.recording)], { type: 'application/json' }));
  a.download = 'recording.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
};
$('load').onchange = async () => {
  const f = $('load').files[0];
  if (!f) return;
  try {
    const j = JSON.parse(await f.text());
    at.recording = j.recording || j;
    if (!Array.isArray(at.recording.samples)) throw new Error('it holds no frames');
    told_kept();
  } catch (e) {
    at.recording = null;
    $('kept').textContent = 'that file is no recording: ' + (e.message || e);
  }
  enable();
};

// ---- the real headset, through the helper ----

async function helper(path, body) {
  const r = await fetch(HELPER + path, { method: body === undefined ? 'GET' : 'POST', headers: { 'X-Lory-Studio': '1', 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!r.ok) throw new Error((await r.text()) || String(r.status));
  return r;
}
async function device() {
  try {
    at.helper = await (await helper('/device/state')).json();
    const h = at.helper;
    $('d-state').textContent = !h.device ? 'the helper runs, and finds no headset on the cable\n' + (h.why || '') :
      h.device + (h.worn === undefined ? '' : h.worn ? ' · awake' : ' · asleep') + '\n' + (h.reverses.length ? 'reaches this Mac\'s ports ' + h.reverses.join(', ') : 'reaches none of this Mac\'s ports yet') +
      (h.tabs.length ? '\nits browser shows: ' + h.tabs.slice(0, 3).map((t) => t.url).join('\n  ') : '\nits browser shows no page') +
      (h.recording ? '\nrecording: ' + h.recording.frames + ' frames, ' + h.recording.seconds + ' s' + (h.recording.frames_a_second ? ', ' + h.recording.frames_a_second + ' a second, ' + h.recording.cost_median_ms + ' ms a frame' : '') : '');
  } catch (e) {
    at.helper = null;
    $('d-state').textContent = 'the helper is not running (python3 studio.py serve)';
    if (at.following) follow(false);
    if (at.mirroring) mirror(false);
  }
  enable();
}
setInterval(() => { if ($('device').open && !at.mirroring_now) device(); }, 3000);
$('device').addEventListener('toggle', () => { if ($('device').open) device(); });

const said = (words) => { $('d-state').textContent = words; };
$('d-open').onclick = async () => {
  try { const r = await (await helper('/device/open', { url: at.win.location.href })).json(); said('opened there: ' + r.url); } catch (e) { said('not opened: ' + e.message); }
};
$('d-rec').onclick = async () => {
  try { const r = await (await helper('/device/record', {})).json(); said('recording in ' + r.url + '\n(put the headset on, enter VR there, do what should be seen; then Take the recording)'); } catch (e) { said('not recording: ' + e.message); }
};
$('d-take').onclick = async () => {
  try {
    const r = await (await helper('/device/take', {})).json();
    if (!r || !r.recording || !r.recording.samples.length) return said('the headset has recorded no frame yet (is the page in VR there, and Record pressed?)');
    at.recording = r.recording;
    told_kept();
    enable();
    said('taken: ' + r.told.frames + ' frames, ' + r.told.seconds + ' s — Play it under Recording');
  } catch (e) { said('not taken: ' + e.message); }
};

// this headset moved as the real one moves, a few times a second
function follow(on) {
  if (!on) {
    if (at.following) clearInterval(at.following.timer);
    at.following = null;
    $('d-follow').textContent = 'Follow';
    if (at.sim) at.sim.stop();
    return;
  }
  const f = { since: 0, busy: false, timer: 0 };
  f.timer = setInterval(async () => {
    if (f.busy || !inside()) return;
    f.busy = true;
    try {
      const r = await (await helper('/device/latest?since=' + f.since)).json();
      if (r && r.sample && at.following === f) {
        if (r.frame && (at.sim.device.width !== r.frame.width || at.sim.device.height !== r.frame.height)) { at.sim.device.width = r.frame.width; at.sim.device.height = r.frame.height; }
        at.sim.follow(r.sample, r.events, r.views);
        f.since = r.sample.t;
      }
    } catch (e) { /* the next one may come */ }
    f.busy = false;
  }, 80);
  at.following = f;
  $('d-follow').textContent = 'Stop following';
}
$('d-follow').onclick = async () => {
  if (at.following) return follow(false);
  if (!inside()) await enter();
  try { await helper('/device/record', { keep: true }); } catch (e) { return said('not following: ' + e.message); }
  follow(true);
};

// pictures of the headset's own display, one after another (its left eye)
function mirror(on) {
  const c = $('d-shot');
  if (!on) {
    if (at.mirroring) at.mirroring.on = false;
    at.mirroring = null;
    $('d-mirror').textContent = 'Mirror';
    c.style.display = 'none';
    return;
  }
  const m = { on: true };
  at.mirroring = m;
  $('d-mirror').textContent = 'Stop mirroring';
  (async () => {
    while (m.on) {
      try {
        at.mirroring_now = true;
        const blob = await (await helper('/device/shot.png')).blob();
        const img = await createImageBitmap(blob);
        const half = img.width / 2;
        c.width = Math.round(half / 2);
        c.height = Math.round(img.height / 2);
        c.getContext('2d').drawImage(img, 0, 0, half, img.height, 0, 0, c.width, c.height);
        c.style.display = 'block';
      } catch (e) {
        said('no picture of the display: ' + e.message);
        await sleep(1500);
      }
      at.mirroring_now = false;
      await sleep(150);
    }
  })();
}
$('d-mirror').onclick = () => mirror(!at.mirroring);

// ---- as the page opens ----

window.addEventListener('resize', fit);
window.studio = { at, open, enter, leave, tick, show, fit };
if (query.get('at')) {
  $('at').value = query.get('at');
  open(query.get('at')).then(() => { if (query.get('enter') !== null && at.sim) enter(query.get('enter') === 'ar' ? 'ar' : 'vr'); });
}
