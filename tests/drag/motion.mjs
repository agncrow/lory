// Motion's numbers for lory.drag's free dragging, run on fixed inputs: the
// inertia a drag is released into (with the drag's own settings, as
// VisualElementDragControls.startAnimation sets them up), the springs it
// bounces and snaps back on, and the elastic pull past a constraint.
//
// The reference: motion 14.7.1 (its motion-dom 14.7.1), installed in a
// scratch folder (never Lory's own):
//   npm install --prefix <scratch>/ref motion@14.7.1
//   LORY_REF=<scratch>/ref node tests/drag/motion.mjs
// It writes its numbers as JSON on its output; tests/drag/reference.py
// keeps them in reference.json beside it.
const ref = process.env.LORY_REF;
if (!ref) throw new Error('LORY_REF: the folder motion 14.7.1 is installed in');
const dom = `${ref}/node_modules/motion-dom/dist/es`;
const { inertia } = await import(`${dom}/animation/generators/inertia.mjs`);
const { spring } = await import(`${dom}/animation/generators/spring.mjs`);
const { applyConstraints, resolveDragElastic } = await import(`${dom}/gestures/drag/utils/constraints.mjs`);

// a generator sampled at a frame's times (every `step` ms) until it is done
function sampled(generator, step, most) {
    const out = [];
    for (let t = 0; t <= most; t += step) {
        const s = generator.next(t);
        out.push([t, s.value, s.done]);
        if (s.done) break;
    }
    return out;
}

// what a drag's release starts on one axis (VisualElementDragControls'
// startAnimation): inertia at the release's velocity, its boundary spring
// stiff where the drag is not elastic, snapped to its origin if asked
function released({ value, velocity, min, max, elastic = true, snap = false, momentum = true }) {
    let bounds = {};
    if (min !== undefined) bounds.min = min;
    if (max !== undefined) bounds.max = max;
    if (snap) bounds = { min: 0, max: 0 };
    return inertia({
        keyframes: [value],
        velocity: momentum ? velocity : 0,
        bounceStiffness: elastic ? 200 : 1000000,
        bounceDamping: elastic ? 40 : 10000000,
        timeConstant: 750,
        restDelta: 1,
        restSpeed: 10,
        ...bounds,
    });
}

const curves = [];
const drags = [
    { name: 'glide', value: 0, velocity: 1000 },
    { name: 'glide_back', value: 40, velocity: -800 },
    { name: 'slow', value: 0, velocity: 60 },
    { name: 'still', value: 12, velocity: 0 },
    { name: 'bounce', value: 20, velocity: 2000, min: -100, max: 100 },
    { name: 'bounce_low', value: -20, velocity: -1500, min: -100, max: 100 },
    { name: 'stiff', value: 20, velocity: 2000, min: -100, max: 100, elastic: false },
    { name: 'pulled_past', value: 140, velocity: 0, min: -100, max: 100 },
    { name: 'pulled_past_moving', value: 130, velocity: 400, min: -100, max: 100 },
    { name: 'snap', value: 150, velocity: 300, snap: true },
    { name: 'snap_stiff', value: -90, velocity: -200, snap: true, elastic: false },
    { name: 'no_momentum', value: 130, velocity: 900, min: 0, max: 100, momentum: false },
    { name: 'one_side', value: 0, velocity: -1200, min: -50 },
];
for (const d of drags) {
    for (const step of [16, 1000 / 60]) {
        curves.push({ name: d.name, kind: 'released', step, given: d, samples: sampled(released(d), step, 4000) });
    }
}
// inertia at its own defaults (power 0.8, time constant 325, restDelta 0.5,
// a bounce of 500 stiff and 10 damped), as a program gives it
for (const d of [
    { name: 'default_glide', value: 0, velocity: 1000 },
    { name: 'default_bounce', value: 0, velocity: 1000, max: 200 },
    { name: 'default_power', value: 0, velocity: 1000, power: 0.4, timeConstant: 200 },
]) {
    const g = inertia({ keyframes: [d.value], velocity: d.velocity, max: d.max, power: d.power, timeConstant: d.timeConstant });
    curves.push({ name: d.name, kind: 'inertia', step: 16, given: d, samples: sampled(g, 16, 4000) });
}
// springs: under-, critically and over-damped, with a velocity carried in
for (const d of [
    { name: 'spring_default', from: 0, to: 100, velocity: 0 },
    { name: 'spring_bouncy', from: 0, to: 300, velocity: 500, stiffness: 300, damping: 12, mass: 1 },
    { name: 'spring_critical', from: 50, to: 0, velocity: -200, stiffness: 100, damping: 20, mass: 1 },
    { name: 'spring_over', from: 0, to: 80, velocity: 0, stiffness: 200, damping: 40, mass: 1 },
    { name: 'spring_heavy', from: 10, to: 0, velocity: 1000, stiffness: 500, damping: 25, mass: 3 },
    { name: 'spring_small', from: 0, to: 1, velocity: 0, stiffness: 120, damping: 14, mass: 1 },
    { name: 'spring_card', from: 0, to: 420, velocity: 1200, stiffness: 300, damping: 30, mass: 1 },
]) {
    const g = spring({ keyframes: [d.from, d.to], velocity: d.velocity, stiffness: d.stiffness, damping: d.damping, mass: d.mass });
    curves.push({ name: d.name, kind: 'spring', step: 16, given: d, samples: sampled(g, 16, 6000) });
}
// the elastic pull past a constraint while dragging
const elastic = [];
for (const e of [0, 0.2, 0.35, 0.5, 1]) {
    const k = resolveDragElastic(e).x;
    for (const p of [-260, -130, -100, -40, 0, 75, 100, 101, 180, 400]) {
        elastic.push([e, p, applyConstraints(p, { min: -100, max: 100 }, k)]);
    }
}
process.stdout.write(JSON.stringify({ version: '14.7.1', curves, elastic }));
