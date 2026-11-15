// Lory Studio's headset: a script for the page a Crow web build runs in.
// It does one of two things there.
//
//   LoryHeadset.simulate()   makes up a headset in a desktop browser: two
//     eyes of a Quest 3's frame, a head and two controllers that are moved
//     by whoever holds the result (Lory Studio's page, a walk, a console),
//     triggers, grips, thumbsticks and buttons. The page's own program
//     finds WebXR there and enters it as it would a real one: nothing of
//     the program or of Crow's loader is changed. Time is the simulator's
//     own, a frame a pump, so what a walk draws it draws again.
//
//   LoryHeadset.record()     in a real headset's browser, keeps what the
//     headset did while a page was in VR: where the head and each
//     controller were every frame, what was pressed, what each frame
//     cost. LoryHeadset.take() gives the recording, and a simulated
//     headset plays it back (`replay`), or follows it as it is made
//     (`follow`): what was done in the headset is seen, and seen again,
//     on a desk. A simulated headset keeps a recording of itself the same
//     way (`keep`).
//
// Lengths are metres, angles degrees: `turn` to the right as it grows,
// `nod` up. Matrices are WebGL's, sixteen numbers a column after a column.
// The room's axes are WebXR's: x to the right, y up, the reader facing -z.
(() => {
  'use strict';
  if (window.LoryHeadset) return;

  const QUEST3 = { name: 'Quest 3', width: 3360, height: 1760, fov: 96, ipd: 0.064, hz: 72 };
  const RAD = Math.PI / 180;
  const PRESSES = ['selectstart', 'selectend', 'squeezestart', 'squeezeend'];

  // ---- matrices ----

  const mul = (a, b) => {
    const o = new Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    return o;
  };
  // where something is and faces: its place, turned to the right and nodded up
  const placed = (p) => {
    const yaw = -(p.turn || 0) * RAD, pitch = (p.nod || 0) * RAD;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    return [cy, 0, -sy, 0, sy * sp, cp, cy * sp, 0, sy * cp, -sp, cy * cp, 0, p.x, p.y, p.z, 1];
  };
  // a place, a turn and a nod read back out of a matrix (a lean to a side is lost)
  const settled = (o) => {
    const m = o.matrix;
    if (!m) return o;
    o.x = m[12]; o.y = m[13]; o.z = m[14];
    o.nod = Math.asin(Math.max(-1, Math.min(1, -m[9]))) / RAD;
    o.turn = Math.atan2(-m[8], m[10]) / RAD;
    o.matrix = null;
    return o;
  };
  const inverse = (m) => {
    const r = [m[0], m[4], m[8], 0, m[1], m[5], m[9], 0, m[2], m[6], m[10], 0, 0, 0, 0, 1];
    r[12] = -(m[0] * m[12] + m[1] * m[13] + m[2] * m[14]);
    r[13] = -(m[4] * m[12] + m[5] * m[13] + m[6] * m[14]);
    r[14] = -(m[8] * m[12] + m[9] * m[13] + m[10] * m[14]);
    return r;
  };
  // a place and a facing as seven numbers (x, y, z and a quaternion), and back
  const seven = (m) => {
    const t = m[0] + m[5] + m[10];
    let x, y, z, w;
    if (t > 0) { const s = Math.sqrt(t + 1) * 2; w = s / 4; x = (m[6] - m[9]) / s; y = (m[8] - m[2]) / s; z = (m[1] - m[4]) / s; }
    else if (m[0] > m[5] && m[0] > m[10]) { const s = Math.sqrt(1 + m[0] - m[5] - m[10]) * 2; w = (m[6] - m[9]) / s; x = s / 4; y = (m[4] + m[1]) / s; z = (m[8] + m[2]) / s; }
    else if (m[5] > m[10]) { const s = Math.sqrt(1 + m[5] - m[0] - m[10]) * 2; w = (m[8] - m[2]) / s; x = (m[4] + m[1]) / s; y = s / 4; z = (m[9] + m[6]) / s; }
    else { const s = Math.sqrt(1 + m[10] - m[0] - m[5]) * 2; w = (m[1] - m[4]) / s; x = (m[8] + m[2]) / s; y = (m[9] + m[6]) / s; z = s / 4; }
    return [m[12], m[13], m[14], x, y, z, w].map((n) => Math.round(n * 100000) / 100000);
  };
  const of_seven = (p) => {
    const [px, py, pz, x, y, z, w] = p;
    return [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0, 2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0, 2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0, px, py, pz, 1];
  };
  const perspective = (fov, aspect, near, far) => {
    const t = 1 / Math.tan(fov * RAD / 2);
    return [t / aspect, 0, 0, 0, 0, t, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, 2 * far * near / (near - far), 0];
  };
  const pose_of = (m) => {
    const p = seven(m);
    return { matrix: new Float32Array(m), inverse: { matrix: new Float32Array(inverse(m)) }, position: { x: m[12], y: m[13], z: m[14], w: 1 }, orientation: { x: p[3], y: p[4], z: p[5], w: p[6] } };
  };

  // ---- a headset made up ----

  function simulate(options = {}) {
    const device = Object.assign({}, QUEST3, options.device || {});
    const hand = (side) => ({ x: side * 0.2, y: 0.95, z: -0.3, turn: 0, nod: 0, shown: true, trigger: 0, grip: 0, stick: [0, 0], a: 0, b: 0, matrix: null });
    const st = {
      kind: 'simulated', device, canvas: options.canvas || null,
      head: { x: 0, y: options.height === undefined ? 1.25 : options.height, z: 0, turn: 0, nod: 0, matrix: null },
      hands: { left: hand(-1), right: hand(1) },
      session: null, mode: '', listeners: {}, next: null, clock: 0, frames: 0, cost: [], pulses: [], counts: null, counting: null, playing: null, views: null, keeping: null,
    };
    // the canvas the page's program draws on (looked for when first needed:
    // a headset made up as the page starts has none yet)
    const found = () => st.canvas || (st.canvas = (window.crow && window.crow.gl && window.crow.gl.canvas) || document.querySelector('canvas'));
    const button = (v) => ({ pressed: v > 0.5, touched: v > 0, value: v });
    const source = (name) => {
      const h = st.hands[name];
      return {
        handedness: name, targetRayMode: 'tracked-pointer', profiles: ['meta-quest-touch-plus', 'generic-trigger-squeeze-thumbstick'],
        targetRaySpace: { hand: name, kind: 'ray' }, gripSpace: { hand: name, kind: 'grip' },
        gamepad: {
          mapping: 'xr-standard',
          get buttons() { return [button(h.trigger), button(h.grip), button(0), button(0), button(h.a), button(h.b)]; },
          get axes() { return [0, 0, h.stick[0], h.stick[1]]; },
          hapticActuators: [{ pulse: (value, ms) => { st.pulses.push({ hand: name, value, ms, at: st.clock }); return Promise.resolve(true); } }],
        },
      };
    };
    const sources = { left: source('left'), right: source('right') };
    const head_now = () => st.head.matrix || placed(st.head);
    const hand_now = (name) => st.hands[name].matrix || placed(st.hands[name]);
    // each eye's view: where it is, and how it sees
    const views = () => {
      const m = head_now();
      if (st.views) return st.views.map((v) => ({ eye: v.eye, projectionMatrix: new Float32Array(v.projection), transform: pose_of(mul(m, v.offset)), port: v.viewport }));
      const w = device.width / 2, proj = perspective(device.fov, w / device.height, 0.05, 100);
      return ['left', 'right'].map((eye, i) => {
        const dx = (i ? 1 : -1) * device.ipd / 2;
        const e = m.slice();
        e[12] = m[12] + m[0] * dx; e[13] = m[13] + m[1] * dx; e[14] = m[14] + m[2] * dx;
        return { eye, projectionMatrix: new Float32Array(proj), transform: pose_of(e), port: { x: i * w, y: 0, width: w, height: device.height } };
      });
    };
    const frame = {
      get session() { return st.session; },
      getViewerPose: () => Object.assign({ views: views(), emulatedPosition: false }, { transform: pose_of(head_now()) }),
      getPose: (space) => (space && space.hand && st.hands[space.hand].shown ? { transform: pose_of(hand_now(space.hand)), emulatedPosition: false } : null),
    };
    const fire = (type, name) => {
      if (st.keeping && PRESSES.includes(type)) st.keeping.events.push({ t: st.keeping.now + 0.01, type, hand: name });
      for (const f of st.listeners[type] || []) f({ type, inputSource: sources[name], frame });
    };
    const session = {
      get inputSources() { return ['left', 'right'].filter((n) => st.hands[n].shown).map((n) => sources[n]); },
      get environmentBlendMode() { return st.mode === 'immersive-ar' ? 'alpha-blend' : 'opaque'; },
      renderState: { baseLayer: null },
      visibilityState: 'visible',
      updateRenderState(s) { if (s.baseLayer) session.renderState.baseLayer = s.baseLayer; },
      requestReferenceSpace: async (type) => ({ type }),
      requestAnimationFrame(f) { st.next = f; return 1; },
      cancelAnimationFrame() { st.next = null; },
      addEventListener(type, f) { (st.listeners[type] = st.listeners[type] || []).push(f); },
      removeEventListener(type, f) { st.listeners[type] = (st.listeners[type] || []).filter((g) => g !== f); },
      end: async () => { const was = st.listeners.end || []; st.session = null; st.next = null; st.listeners = {}; for (const f of was) f({ type: 'end' }); },
    };
    Object.defineProperty(navigator, 'xr', {
      configurable: true,
      value: {
        isSessionSupported: async (mode) => mode === 'immersive-vr' || mode === 'immersive-ar',
        requestSession: async (mode) => { st.mode = mode; st.session = session; return session; },
        addEventListener() {},
        removeEventListener() {},
      },
    });
    window.XRWebGLLayer = function () {
      this.framebuffer = null;
      Object.defineProperty(this, 'framebufferWidth', { get: () => device.width });
      Object.defineProperty(this, 'framebufferHeight', { get: () => device.height });
      this.getViewport = (v) => v.port || (v.eye === 'left' ? { x: 0, y: 0, width: device.width / 2, height: device.height } : { x: device.width / 2, y: 0, width: device.width / 2, height: device.height });
    };
    if (window.WebGL2RenderingContext) WebGL2RenderingContext.prototype.makeXRCompatible = async function () {};

    // ---- what a recording says of a moment, made the headset's own ----
    const put = (s) => {
      st.head.matrix = of_seven(s.h);
      for (const name of ['left', 'right']) {
        const k = s.k[name], h = st.hands[name];
        h.shown = !!k;
        if (!k) continue;
        h.matrix = of_seven(k.r);
        h.trigger = k.b[0] || 0; h.grip = k.b[1] || 0; h.a = k.b[4] || 0; h.b = k.b[5] || 0;
        h.stick = k.a.length >= 4 ? [k.a[2], k.a[3]] : [k.a[0] || 0, k.a[1] || 0];
      }
    };
    // the frame being drawn takes the recording's moment of its time (the
    // first frame its first), and the presses made before that moment
    const play_at = () => {
      const p = st.playing, rec = p.rec;
      if (p.from === null) p.from = st.clock;
      const t = rec.samples[0].t + (st.clock - p.from) + 0.06;
      while (p.at + 1 < rec.samples.length && rec.samples[p.at + 1].t <= t) p.at++;
      put(rec.samples[p.at]);
      while (p.event < rec.events.length && rec.events[p.event].t <= rec.samples[p.at].t) { const e = rec.events[p.event++]; fire(e.type, e.hand); }
      if (p.at + 1 >= rec.samples.length) p.done = true;
    };
    // the head and the hands as a recording keeps a moment
    const sampled = (cost) => {
      const s = { t: Math.round(st.clock * 10) / 10, c: Math.round(cost * 100) / 100, h: seven(head_now()), k: {} };
      for (const name of ['left', 'right']) {
        const h = st.hands[name];
        if (h.shown) s.k[name] = { r: seven(hand_now(name)), b: [h.trigger, h.grip, 0, 0, h.a, h.b], a: [0, 0, h.stick[0], h.stick[1]], bare: false };
      }
      return s;
    };

    // ---- what its holder does with it ----
    const api = {
      state: st,
      device,
      get inside() { return !!st.session; },
      // into the headset, as the page's own Enter VR button goes (the page's
      // `crow`), or with the room seen through the drawing, as Enter AR goes
      async enter(page, kind = 'vr') {
        const crow = page || window.crow;
        const go = crow && (kind === 'ar' ? crow.enter_ar : crow.enter_vr);
        if (!crow) throw new Error('the page has no `window.crow` to enter ' + kind.toUpperCase() + ' with');
        if (!go) throw new Error('the page cannot enter ' + kind.toUpperCase() + ': its crow.js is from before it could (rebuild it with a newer crow)');
        await go();
        return api.inside;
      },
      async exit() { if (st.session) await session.end(); },
      // one frame: the simulator's clock moves on a frame of the device's (or `ms`)
      pump(ms) {
        const f = st.next;
        if (!f) return false;
        st.next = null;
        st.clock += ms === undefined ? 1000 / device.hz : ms;
        if (st.playing && !st.playing.done) play_at();
        const canvas = found();
        if (canvas && (canvas.width !== device.width || canvas.height !== device.height)) { canvas.width = device.width; canvas.height = device.height; }
        if (st.counting) for (const k in st.counting) st.counting[k] = 0;
        const a = performance.now();
        f(st.clock, frame);
        const cost = performance.now() - a;
        st.cost.push(cost);
        if (st.cost.length > 240) st.cost.shift();
        if (st.counting) st.counts = Object.assign({}, st.counting);
        if (st.keeping) { const s = sampled(cost); st.keeping.now = s.t; st.keeping.samples.push(s); }
        st.frames++;
        return true;
      },
      // the eyes as they are now: each one's projection, its place (`transform`) and its part of the frame (`port`)
      views: () => views(),
      // the head's and each hand's matrix
      pose: () => ({ head: head_now(), left: hand_now('left'), right: hand_now('right') }),
      // one eye's part of the frame as a canvas's own rectangle (a frame's rows count from its foot)
      part(eye = 'left') {
        const p = views()[eye === 'right' ? 1 : 0].port;
        return { x: p.x, y: device.height - p.y - p.height, width: p.width, height: p.height };
      },
      // a frame pumped and one eye's picture of it, `wide` pixels across (a canvas)
      shoot(eye = 'left', wide = 840) {
        if (!api.pump()) return null;
        return api.picture(eye, wide);
      },
      // one eye's picture of the frame last drawn (taken in the turn it was drawn in)
      picture(eye = 'left', wide = 840) {
        const p = api.part(eye), out = document.createElement('canvas');
        out.width = wide;
        out.height = Math.round(wide * p.height / p.width);
        const g = out.getContext('2d');
        g.fillStyle = '#000';
        // (where the room is seen through the drawing, what the frame leaves
        // transparent is the room: a made-up one, as the Studio's view paints it)
        if (st.session && st.mode === 'immersive-ar') {
          const room = g.createLinearGradient(0, 0, 0, out.height);
          room.addColorStop(0, '#6a747e');
          room.addColorStop(0.55, '#2c3238');
          room.addColorStop(1, '#3a3530');
          g.fillStyle = room;
        }
        g.fillRect(0, 0, out.width, out.height);
        g.drawImage(found(), p.x, p.y, p.width, p.height, 0, 0, out.width, out.height);
        return out;
      },
      head(p) { settled(st.head); Object.assign(st.head, p); return st.head; },
      hand(name, p) { settled(st.hands[name]); Object.assign(st.hands[name], p); return st.hands[name]; },
      // the head and the hands put back where a headset starts
      reset() {
        Object.assign(st.head, { x: 0, y: options.height === undefined ? 1.25 : options.height, z: 0, turn: 0, nod: 0, matrix: null });
        for (const [name, side] of [['left', -1], ['right', 1]]) Object.assign(st.hands[name], hand(side));
      },
      // the ray that leaves an eye through a point of its picture (u across, v down, each 0 to 1)
      through(eye, u, v) {
        const view = views()[eye === 'right' ? 1 : 0], m = view.transform.matrix, p = view.projectionMatrix;
        const x = (2 * u - 1 + p[8]) / p[0], y = (1 - 2 * v + p[9]) / p[5];
        const n = Math.hypot(x, y, 1);
        const d = [(m[0] * x + m[4] * y - m[8]) / n, (m[1] * x + m[5] * y - m[9]) / n, (m[2] * x + m[6] * y - m[10]) / n];
        return { from: [m[12], m[13], m[14]], way: d };
      },
      // where a point of the room falls in an eye's picture (u across, v down), or null behind the eye
      spot(eye, point) {
        const view = views()[eye === 'right' ? 1 : 0], c = view.transform.inverse.matrix, p = view.projectionMatrix;
        const x = c[0] * point[0] + c[4] * point[1] + c[8] * point[2] + c[12];
        const y = c[1] * point[0] + c[5] * point[1] + c[9] * point[2] + c[13];
        const z = c[2] * point[0] + c[6] * point[1] + c[10] * point[2] + c[14];
        if (z > -0.01) return null;
        return [0.5 + (p[0] * x + p[8] * z) / -z / 2, 0.5 - (p[5] * y + p[9] * z) / -z / 2];
      },
      // a hand's ray turned to pass through a point of the room
      aim_at(name, point) {
        const h = settled(st.hands[name]);
        const dx = point[0] - h.x, dy = point[1] - h.y, dz = point[2] - h.z, n = Math.hypot(dx, dy, dz) || 1;
        h.nod = Math.asin(dy / n) / RAD;
        h.turn = Math.atan2(dx, -dz) / RAD;
        return h;
      },
      // a hand put on the eye's own ray through a point of its picture: what
      // the pointer of a desk points at is what the hand's ray meets, at any depth
      aim_through(name, eye, u, v) {
        const r = api.through(eye, u, v), h = settled(st.hands[name]);
        h.x = r.from[0] + r.way[0] * 0.3; h.y = r.from[1] + r.way[1] * 0.3; h.z = r.from[2] + r.way[2] * 0.3;
        return api.aim_at(name, [h.x + r.way[0], h.y + r.way[1], h.z + r.way[2]]);
      },
      press(name, down) { st.hands[name].trigger = down ? 1 : 0; fire(down ? 'selectstart' : 'selectend', name); if (!down) fire('select', name); },
      squeeze(name, down) { st.hands[name].grip = down ? 1 : 0; fire(down ? 'squeezestart' : 'squeezeend', name); if (!down) fire('squeeze', name); },
      stick(name, x, y) { st.hands[name].stick = [x, y]; },
      // the mean and the worst of the last frames' cost, in milliseconds
      cost() {
        const c = st.cost.slice().sort((a, b) => a - b);
        if (!c.length) return { frames: 0 };
        return { frames: st.frames, mean: +(c.reduce((a, b) => a + b, 0) / c.length).toFixed(2), median: +c[Math.floor(c.length / 2)].toFixed(2), p95: +c[Math.floor(c.length * 0.95)].toFixed(2), worst: +c[c.length - 1].toFixed(2) };
      },
      // the WebGL calls of a frame counted, by name (`on` false to stop)
      count(on = true) {
        const gl = found().getContext('webgl2');
        const names = ['drawArrays', 'drawElements', 'bufferData', 'bufferSubData', 'texImage2D', 'texSubImage2D', 'uniformMatrix4fv', 'uniform1f', 'uniform3fv', 'uniform4fv', 'bindVertexArray', 'useProgram'];
        if (!on) { for (const n of names) delete gl[n]; st.counting = null; st.counts = null; return null; }
        if (st.counting) return st.counting;
        st.counting = { bytes: 0 };
        for (const n of names) {
          const real = gl[n].bind(gl);
          st.counting[n] = 0;
          gl[n] = function (...args) { st.counting[n]++; if (n === 'bufferData' && args[1] && args[1].byteLength) st.counting.bytes += args[1].byteLength; return real(...args); };
        }
        return st.counting;
      },
      // a recording played back from here on: the head, the hands and the presses are its own
      replay(rec) {
        if (rec.frame) { device.width = rec.frame.width; device.height = rec.frame.height; }
        st.views = rec.views || null;
        st.playing = { rec, at: 0, event: 0, from: null, done: !rec.samples.length };
        return rec.samples.length;
      },
      get played() { return !st.playing || st.playing.done; },
      // the playing stopped where it is, the head and hands the holder's again
      stop() { st.playing = null; settled(st.head); settled(st.hands.left); settled(st.hands.right); },
      // one moment of a recording still being made (a real headset, followed live), and its presses since the last
      follow(sample, events, views) {
        if (views) st.views = views;
        put(sample);
        for (const e of events || []) fire(e.type, e.hand);
      },
      // a recording of this headset itself: `keep()` starts one, `keep(false)` ends it and gives it
      keep(on = true) {
        if (on) { st.keeping = { kind: 'recording', device: 'simulated ' + device.name, space: 'local-floor', frame: { width: device.width, height: device.height }, views: st.views, samples: [], events: [], now: st.clock }; return null; }
        const rec = st.keeping;
        st.keeping = null;
        return rec;
      },
    };
    window.LoryHeadset.now = api;
    return api;
  }

  // ---- a real headset's doings kept ----

  function record(options = {}) {
    if (!window.XRSession) throw new Error('this browser has no WebXR to record');
    if (window.LoryHeadset.kept && window.LoryHeadset.kept.live) { const was = window.LoryHeadset.kept; was.samples = []; was.events = []; return was; }
    const rec = { kind: 'recording', live: true, device: navigator.userAgent, space: '', frame: null, views: null, samples: [], events: [], most: options.most || 72 * 180, now: 0, error: '' };
    const P = XRSession.prototype;
    const frames = P.requestAnimationFrame, spaces = P.requestReferenceSpace;
    let space = null, asking = false;
    const watched = new WeakSet();
    P.requestReferenceSpace = function (type) {
      return spaces.call(this, type).then((s) => { if (type !== 'viewer') { space = s; rec.space = type; } return s; });
    };
    const sample = (session, t, frame, cost) => {
      if (!watched.has(session)) {
        watched.add(session);
        space = rec.space && !asking ? space : null;
        for (const type of PRESSES) session.addEventListener(type, (e) => rec.events.push({ t: rec.now + 0.01, type, hand: e.inputSource.handedness }));
        session.addEventListener('end', () => { space = null; rec.space = ''; });
      }
      // (a page already in its headset when the recording began: a space of the recording's own)
      if (!space) {
        if (!asking) {
          asking = true;
          spaces.call(session, 'local-floor').catch(() => spaces.call(session, 'local')).then((s) => { space = s; rec.space = 'local-floor'; asking = false; }, (e) => { rec.error = String(e); asking = false; });
        }
        return;
      }
      const pose = frame.getViewerPose(space);
      if (!pose) return;
      const head = Array.from(pose.transform.matrix);
      if (!rec.views) {
        const layer = session.renderState.baseLayer;
        rec.frame = { width: layer.framebufferWidth, height: layer.framebufferHeight };
        rec.views = pose.views.map((v) => { const p = layer.getViewport(v); return { eye: v.eye, projection: Array.from(v.projectionMatrix), viewport: { x: p.x, y: p.y, width: p.width, height: p.height }, offset: mul(inverse(head), Array.from(v.transform.matrix)) }; });
      }
      const s = { t: Math.round(t * 10) / 10, c: Math.round(cost * 100) / 100, h: seven(head), k: {} };
      for (const src of session.inputSources) {
        const p = src.targetRaySpace && frame.getPose(src.targetRaySpace, space);
        if (!p) continue;
        const pad = src.gamepad;
        s.k[src.handedness] = { r: seven(Array.from(p.transform.matrix)), b: pad ? pad.buttons.map((b) => Math.round(b.value * 100) / 100) : [], a: pad ? Array.from(pad.axes).map((x) => Math.round(x * 100) / 100) : [], bare: !!src.hand };
      }
      rec.now = s.t;
      rec.samples.push(s);
      if (rec.samples.length > rec.most) rec.samples.shift();
    };
    P.requestAnimationFrame = function (f) {
      const session = this;
      return frames.call(this, (t, frame) => {
        const a = performance.now();
        f(t, frame);
        try { sample(session, t, frame, performance.now() - a); } catch (e) { rec.error = String(e); }
      });
    };
    window.LoryHeadset.kept = rec;
    return rec;
  }

  // how a recording's frames went: how many a second, what each cost
  function told(rec) {
    const n = rec.samples.length;
    const out = { frames: n, events: rec.events.length, seconds: n > 1 ? +((rec.samples[n - 1].t - rec.samples[0].t) / 1000).toFixed(1) : 0 };
    if (n > 2) {
      const gaps = [], costs = [];
      for (let i = 1; i < n; i++) gaps.push(rec.samples[i].t - rec.samples[i - 1].t);
      for (const s of rec.samples) costs.push(s.c);
      gaps.sort((a, b) => a - b); costs.sort((a, b) => a - b);
      out.frames_a_second = +(1000 / gaps[Math.floor(gaps.length / 2)]).toFixed(1);
      out.frame_gap_p95_ms = +gaps[Math.floor(gaps.length * 0.95)].toFixed(1);
      out.cost_median_ms = +costs[Math.floor(n / 2)].toFixed(2);
      out.cost_p95_ms = +costs[Math.floor(n * 0.95)].toFixed(2);
    }
    return out;
  }

  // what was recorded, with how its frames went
  function take() {
    const rec = window.LoryHeadset.kept;
    if (!rec) return null;
    return { told: told(rec), recording: { kind: 'recording', device: rec.device, space: rec.space, frame: rec.frame, views: rec.views, samples: rec.samples, events: rec.events, error: rec.error } };
  }

  // the newest moment of a recording being made, and the presses after `since`
  function latest(since = 0) {
    const rec = window.LoryHeadset.kept;
    if (!rec || !rec.samples.length) return null;
    const s = rec.samples[rec.samples.length - 1];
    return { sample: s, events: rec.events.filter((e) => e.t > since && e.t <= s.t + 0.01), views: since ? null : rec.views, frame: rec.frame };
  }

  window.LoryHeadset = { simulate, record, take, told, latest, now: null, kept: null, QUEST3, math: { mul, placed, settled, inverse, seven, of_seven } };
})();
