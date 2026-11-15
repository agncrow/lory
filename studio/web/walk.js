// Lory Studio's walks: steps taken in a simulated headset, one after
// another, each a pose, a press, a check, a measure or a picture. A walk is
// JSON, so the same one is run by the Studio's page (beside the page it
// tries) and by `studio.py walk` in a headless browser (inside it), and
// what it draws once it draws again: the simulator's clock is the walk's.
//
//   {"name": "…", "at": "/a/page/of/the/site", "steps": [
//     {"do": "enter"},                               into the headset
//     {"do": "enter", "ar": true},                   … with the room seen through the drawing
//     {"do": "until", "js": "…", "most": 8000},      frames until the page says so
//     {"do": "wait", "frames": 30},                  (or "ms": 400)
//     {"do": "head", "turn": 20, "nod": -5},         x y z turn nod, any of them
//     {"do": "aim", "through": [0.5, 0.4]},          a hand's ray through a point of an eye's picture
//     {"do": "aim", "at": [0, 1.2, -1.75]},          … or at a point of the room, in metres
//     {"do": "press", "through": [0.5, 0.4]},        aim, trigger down, a few frames, up
//     {"do": "press", "on": "Catalog"},              … on a thing the page names (its `lory_targets()`):
//                                                    the one of that name nearest where the head faces
//     {"do": "look", "on": "Catalog"},               the head turned to face it (or "at": a point)
//     {"do": "drag", "through": [0.3, 0.5], "to": {"through": [0.6, 0.5]}, "frames": 24},
//     {"do": "squeeze"}, {"do": "stick", "y": 1, "frames": 12}, {"do": "button", "which": "a"},
//     {"do": "check", "js": "…", "says": "what should be so"},
//     {"do": "shot", "name": "first"},               an eye's picture, held to the one kept
//     {"do": "cost", "frames": 120, "under": 13.8},  what a frame costs, in milliseconds
//     {"do": "count"},                               a frame's WebGL calls
//     {"do": "targets"},                             what the page names, measured (degrees, and dp)
//     {"do": "replay", "recording": "name"},         a recording played through
//     {"do": "leave"}]}
//
// A step's "hand" is "right" unless it says "left"; its "eye" the left one.
// In `js`, `sim` is the headset, `crow` the page's program, `page` its window.
(() => {
  'use strict';
  if (window.LoryWalk) return;

  const RAD = Math.PI / 180;
  const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
  // what a guideline asks, as angles. Android XR counts 0.868 dp to a dmm,
  // and a dmm is a millimetre seen from a metre: a target 48 dp across (56
  // easy), letters 14 dp tall (18 to read at ease)
  const DMM = Math.atan(0.001) / RAD;
  const DP = DMM / 0.868;
  const ASKED = { target: 48 * DP, easy: 56 * DP, text: 14 * DP, read: 18 * DP, target_dp: 48, easy_dp: 56, text_dp: 14, read_dp: 18, centre: 41, low: 5, away: 1.75 };

  const angle = (a, b) => {
    const n = Math.hypot(a[0], a[1], a[2]) * Math.hypot(b[0], b[1], b[2]) || 1;
    return Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / n))) / RAD;
  };
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const off = (eye, p) => [p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]];

  // How big each thing a page names is from where the head is. A thing is
  // {name, kind, quad}: its four corners in the room (top left, top right,
  // bottom right, bottom left), `kind` "target" (something pressed) or
  // "text" (its quad as tall as its letters). Two measures are given:
  // the angle it takes of its reader's view (`wide`, `tall`, in degrees),
  // and its size in dp on the panel it lies on (`dp_w`, `dp_h`) — what a
  // headset's guidelines count in: a dp is 1.152 mm a metre of the reader's
  // distance from the panel's own plane, so a thing at the edge of a flat
  // window measures what it does at its middle. It is judged in dp, and
  // counted small too where its panel is seen too far from square on
  // (`askew`: its reader more than 53 degrees off its face).
  function sized(things, head) {
    return (things || []).map((t) => {
      const [a, b, c, d] = t.quad;
      const centre = mid(mid(a, b), mid(c, d)), way = off(head, centre), far = Math.hypot(way[0], way[1], way[2]);
      const left = mid(a, d), right = mid(b, c), top = mid(a, b), foot = mid(d, c);
      const wide = angle(off(head, left), off(head, right)), tall = angle(off(head, top), off(head, foot));
      const u = off(a, b), v = off(a, d);
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const nl = Math.hypot(n[0], n[1], n[2]) || 1;
      const from = Math.abs(way[0] * n[0] + way[1] * n[1] + way[2] * n[2]) / nl;
      const askew = far > 0 && from / far < 0.6;
      const unit = 0.001152 * Math.max(from, 0.0001);
      const across = off(left, right), up = off(top, foot);
      const dp_w = Math.hypot(across[0], across[1], across[2]) / unit, dp_h = Math.hypot(up[0], up[1], up[2]) / unit;
      const kind = t.kind === 'text' ? 'text' : 'target';
      const least = kind === 'text' ? dp_h : Math.min(dp_w, dp_h);
      const asked = kind === 'text' ? ASKED.text_dp : ASKED.target_dp, easy = kind === 'text' ? ASKED.read_dp : ASKED.easy_dp;
      return { name: t.name || '', kind, wide, tall, dp_w, dp_h, far, from, askew, turn: Math.atan2(way[0], -way[2]) / RAD, nod: Math.asin(way[1] / (far || 1)) / RAD, quad: t.quad, least, small: askew || least < asked - 0.05, easy: !askew && least >= easy };
    });
  }
  const brief = (t) => ({ name: t.name, kind: t.kind, wide: +t.wide.toFixed(2), tall: +t.tall.toFixed(2), dp_w: +t.dp_w.toFixed(1), dp_h: +t.dp_h.toFixed(1), askew: t.askew, far: +t.far.toFixed(2), turn: +t.turn.toFixed(1), nod: +t.nod.toFixed(1) });

  // two pictures held together: the part of their dots that differ, and a
  // picture of where (red on the new one, greyed)
  async function compared(kept, canvas, dots) {
    const img = new Image();
    img.src = kept;
    await img.decode();
    const w = canvas.width, h = canvas.height;
    if (img.width !== w || img.height !== h) return { part: 1, why: 'the picture kept is ' + img.width + ' by ' + img.height + ', this one ' + w + ' by ' + h };
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const a = g.getImageData(0, 0, w, h).data, b = canvas.getContext('2d').getImageData(0, 0, w, h).data;
    const o = g.createImageData(w, h);
    let n = 0;
    for (let i = 0; i < a.length; i += 4) {
      const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
      if (d > dots) { n++; o.data[i] = 255; o.data[i + 1] = 48; o.data[i + 2] = 48; }
      else { const grey = (b[i] + b[i + 1] + b[i + 2]) / 6; o.data[i] = grey; o.data[i + 1] = grey; o.data[i + 2] = grey; }
      o.data[i + 3] = 255;
    }
    g.putImageData(o, 0, 0);
    return { part: n / (w * h), diff: n ? c.toDataURL('image/png') : null };
  }

  const fixed = (n) => (Math.round(n * 100) / 100).toString();
  const pick = (from, names) => {
    const o = {};
    for (const n of names) if (from[n] !== undefined) o[n] = from[n];
    return o;
  };
  const short = (v) => {
    let s;
    try { s = typeof v === 'string' ? v : JSON.stringify(v); } catch (e) { s = String(v); }
    return s === undefined ? '' : s.length > 600 ? s.slice(0, 600) + '…' : s;
  };

  // A walk run. `options`: `win` the tried page's window (this one unless
  // said), `sim` its headset (made if there is none), `references` the
  // pictures kept by name (data URLs), `recordings` by name, `on(step
  // result, all so far)`, `seen()` after every frame drawn.
  async function run(walk, options = {}) {
    const win = options.win || window;
    const H = win.LoryHeadset;
    if (!H) throw new Error('the page has no LoryHeadset (headset.js is not loaded in it)');
    const till = Date.now() + (walk.start_ms || 30000);
    while (!(win.crow && win.crow.gl) && Date.now() < till) await sleep(50);
    if (!(win.crow && win.crow.gl)) throw new Error('the page started no Crow program (it keeps none as `window.crow`)');
    const sim = options.sim || H.now || H.simulate();
    const hz = sim.device.hz;
    const out = { name: walk.name || '', ok: true, steps: [], shots: {}, diffs: {} };
    const seen = options.seen || (() => {});
    const pump = async (frames, pause) => {
      for (let i = 0; i < frames; i++) {
        sim.pump();
        seen();
        if (pause) await sleep(pause);
      }
    };
    const frames_of = (s, otherwise) => (s.frames !== undefined ? s.frames : s.ms !== undefined ? Math.max(1, Math.round(s.ms * hz / 1000)) : otherwise);
    const value = (code) => new win.Function('sim', 'crow', 'page', 'return (' + code + '\n);')(sim, win.crow, win);
    const head_at = () => { const m = sim.pose().head; return [m[12], m[13], m[14]]; };
    // the middle of a thing the page names: of those so named, the one nearest where the head faces
    const named = (s) => {
      if (typeof win.lory_targets !== 'function') throw new Error('the page names nothing to find by name (it has no `lory_targets()`)');
      const m = sim.pose().head, head = [m[12], m[13], m[14]], ahead = [-m[8], -m[9], -m[10]];
      const middle = (q) => mid(mid(q[0], q[1]), mid(q[2], q[3]));
      const all = (win.lory_targets() || []).filter((t) => (t.kind === 'text' ? 'text' : 'target') === (s.kind || 'target') && (t.name === s.on || (s.loose && String(t.name).indexOf(s.on) >= 0)));
      if (!all.length) throw new Error('nothing named `' + s.on + '` is on show');
      all.sort((a, b) => angle(off(head, middle(a.quad)), ahead) - angle(off(head, middle(b.quad)), ahead));
      return middle(all[Math.min(s.nth || 0, all.length - 1)].quad);
    };
    const aimed = (s) => {
      const hand = s.hand || 'right';
      if (s.on) sim.aim_at(hand, named(s));
      else if (s.through) sim.aim_through(hand, s.eye || 'left', s.through[0], s.through[1]);
      else if (s.at) sim.aim_at(hand, s.at);
      else if (s.turn !== undefined || s.nod !== undefined) sim.hand(hand, pick(s, ['turn', 'nod']));
      return hand;
    };

    const steps = {
      async enter(s) {
        await sim.enter(win.crow, s.ar ? 'ar' : 'vr');
        await pump(3, 2);
        if (!sim.inside) throw new Error('the page did not enter its headset');
      },
      async leave() { await sim.exit(); await sleep(60); },
      async wait(s) { await pump(frames_of(s, 1), s.pause === undefined ? 2 : s.pause); },
      async until(s, r) {
        const end = Date.now() + (s.most || 10000);
        for (let n = 0; ; n++) {
          let yes = false;
          try { yes = await value(s.js); } catch (e) { yes = false; }
          if (yes) { r.said = (s.says ? s.says + ', ' : '') + 'after ' + n + ' frames'; return; }
          if (Date.now() > end) throw new Error('it never came: ' + (s.says || s.js));
          await pump(1, 20);
        }
      },
      async head(s) { sim.head(pick(s, ['x', 'y', 'z', 'turn', 'nod'])); await pump(frames_of(s, 1), 0); },
      async look(s) {
        const to = s.on ? named(s) : s.at, from = head_at();
        if (!to) throw new Error('`look` takes a thing\'s name ("on") or a point ("at")');
        const d = off(from, to), far = Math.hypot(d[0], d[1], d[2]) || 1;
        sim.head({ turn: Math.atan2(d[0], -d[2]) / RAD, nod: Math.asin(d[1] / far) / RAD });
        await pump(frames_of(s, 2), 0);
      },
      async hand(s) { sim.hand(s.hand || 'right', pick(s, ['x', 'y', 'z', 'turn', 'nod', 'shown'])); await pump(frames_of(s, 1), 0); },
      async aim(s) { aimed(s); await pump(frames_of(s, 2), 0); },
      async press(s) {
        const hand = aimed(s);
        await pump(2, 0);
        sim.press(hand, true);
        await pump(frames_of(s, 3), 0);
        sim.press(hand, false);
        await pump(2, 2);
      },
      async down(s) { const hand = aimed(s); await pump(1, 0); sim.press(hand, true); await pump(frames_of(s, 1), 0); },
      async up(s) { const hand = aimed(s); await pump(1, 0); sim.press(hand, false); await pump(frames_of(s, 2), 2); },
      async drag(s) {
        const hand = aimed(s), n = Math.max(2, frames_of(s, 24)), to = s.to || {};
        await pump(2, 0);
        sim.press(hand, true);
        await pump(2, 0);
        for (let i = 1; i <= n; i++) {
          const k = i / n;
          if (s.through && to.through) sim.aim_through(hand, s.eye || 'left', s.through[0] + (to.through[0] - s.through[0]) * k, s.through[1] + (to.through[1] - s.through[1]) * k);
          else if (s.at && to.at) sim.aim_at(hand, [0, 1, 2].map((j) => s.at[j] + (to.at[j] - s.at[j]) * k));
          await pump(1, 0);
        }
        sim.press(hand, false);
        await pump(2, 2);
      },
      async squeeze(s) {
        const hand = aimed(s);
        await pump(1, 0);
        sim.squeeze(hand, true);
        await pump(frames_of(s, 3), 0);
        sim.squeeze(hand, false);
        await pump(2, 0);
      },
      async stick(s) {
        const hand = s.hand || 'right';
        sim.stick(hand, s.x || 0, s.y || 0);
        await pump(frames_of(s, 12), 0);
        sim.stick(hand, 0, 0);
        await pump(2, 0);
      },
      async button(s) {
        const h = sim.state.hands[s.hand || 'right'], which = s.which === 'b' ? 'b' : 'a';
        h[which] = 1;
        await pump(frames_of(s, 3), 0);
        h[which] = 0;
        await pump(2, 0);
      },
      async js(s, r) { const got = await value(s.js); if (got !== undefined) r.said = short(got); },
      async check(s, r) {
        const got = await value(s.js);
        r.said = s.says || s.js;
        if (!got) throw new Error('not so: ' + (s.says || s.js));
      },
      async say(s, r) { r.said = s.words || ''; },
      async shot(s, r) {
        const name = s.name || 'shot-' + (out.steps.length + 1);
        const c = sim.shoot(s.eye || 'left', s.wide || walk.wide || 840);
        if (!c) throw new Error('no frame was drawn (the page is not in its headset)');
        seen();
        out.shots[name] = c.toDataURL('image/png');
        r.shot = name;
        const kept = options.references && options.references[name];
        if (!kept) { r.fresh = true; r.said = 'a new picture'; return; }
        const d = await compared(kept, c, s.dots === undefined ? 24 : s.dots);
        const most = s.tolerance !== undefined ? s.tolerance : walk.tolerance !== undefined ? walk.tolerance : 0.005;
        r.differ = d.part;
        if (d.why) throw new Error(d.why);
        if (d.part > most) {
          out.diffs[name] = d.diff;
          throw new Error('the picture differs from the one kept in ' + (d.part * 100).toFixed(2) + '% of its dots (' + most * 100 + '% is let by)');
        }
        r.said = d.part ? 'as kept, but for ' + (d.part * 100).toFixed(3) + '% of its dots' : 'as kept';
      },
      async cost(s, r) {
        sim.state.cost.length = 0;
        await pump(frames_of(s, 120), 0);
        const c = sim.cost();
        r.cost = c;
        r.said = 'a frame costs ' + c.median + ' ms here (95 in 100 under ' + c.p95 + ', the worst ' + c.worst + ')';
        if (s.under !== undefined && c.median > s.under) throw new Error('a frame costs ' + c.median + ' ms here, more than ' + s.under);
      },
      async count(s, r) {
        sim.count(true);
        await pump(2, 0);
        const c = Object.assign({}, sim.state.counts);
        sim.count(false);
        const draws = c.drawArrays + c.drawElements;
        r.counts = c;
        r.said = draws + ' draws, ' + (c.bufferData + c.bufferSubData) + ' buffers filled (' + Math.round(c.bytes / 1024) + ' KB), ' + (c.texImage2D + c.texSubImage2D) + ' pictures sent';
        if (s.draws !== undefined && draws > s.draws) throw new Error(draws + ' draws a frame, more than ' + s.draws);
      },
      async targets(s, r) {
        if (typeof win.lory_targets !== 'function') throw new Error('the page names nothing to measure (it has no `lory_targets()`)');
        const all = sized(win.lory_targets(), head_at()).filter((t) => (s.kind ? t.kind === s.kind : true));
        const text_dp = s.text === undefined ? ASKED.text_dp : s.text, target_dp = s.least === undefined ? ASKED.target_dp : s.least;
        const small = all.filter((t) => t.askew || (t.kind === 'text' ? t.dp_h < text_dp - 0.05 : t.least < target_dp - 0.05)).sort((a, b) => a.least - b.least);
        const beyond = all.filter((t) => Math.abs(t.turn - sim.state.head.turn) > (s.within === undefined ? 180 : s.within));
        r.targets = { all: all.length, small: small.map(brief), beyond: beyond.map(brief) };
        const asked = s.kind === 'text' ? text_dp + ' dp of letters' : s.kind === 'target' ? target_dp + ' dp of a thing pressed' : 'a guideline';
        r.said = all.length + ' measured, ' + small.length + ' under what ' + (s.kind ? 'is asked (' + asked + ')' : 'a guideline asks') + (s.within === undefined ? '' : ', ' + beyond.length + ' more than ' + s.within + '° to a side');
        if ((small.length || beyond.length) && !s.note) throw new Error(r.said);
      },
      async replay(s, r) {
        const got = typeof s.recording === 'string' ? (options.recordings || {})[s.recording] : s.recording;
        if (!got) throw new Error('there is no recording `' + s.recording + '`');
        const rec = got.recording || got, most = s.most || hz * 900, pace = s.pace === 'fast' ? 0 : 1000 / hz;
        sim.replay(rec);
        let n = 0;
        const began = performance.now();
        while (!sim.played && n < most) {
          sim.pump();
          seen();
          n++;
          // (the page's own doings, a fetch or a picture of itself, take the time they took)
          const ahead = pace ? began + n * pace - performance.now() : 0;
          if (ahead > 1 || n % 8 === 0) await sleep(Math.max(0, ahead));
        }
        sim.stop();
        r.said = n + ' frames played';
      },
    };

    const list = walk.steps || [];
    for (let i = 0; i < list.length; i++) {
      const s = list[i], r = { n: i + 1, do: s.do, ok: true, said: '' };
      try {
        if (!steps[s.do]) throw new Error('there is no step `' + s.do + '`');
        await steps[s.do](s, r);
      } catch (e) {
        r.ok = false;
        r.said = String((e && e.message) || e);
      }
      out.steps.push(r);
      if (options.on) options.on(r, out);
      if (!r.ok) {
        out.ok = false;
        // (a picture or a measure that fails is told and the walk goes on; a step that could not be taken ends it)
        if (!['shot', 'cost', 'count', 'targets', 'check'].includes(s.do) && !walk.carry_on) break;
      }
    }
    return out;
  }

  window.LoryWalk = { run, sized, compared, angle, ASKED, DP, DMM };
})();
