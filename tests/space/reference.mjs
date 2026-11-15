// The numbers Lory's space (packages/lory/space.co) is held to: three.js
// r187 (npm `three@0.187.0`, MIT), run in node on the fixed cases below.
// For each case it writes what three answers — cameras' projections, a
// camera's look, matrices composed, decomposed, multiplied and inverted,
// quaternions and Euler angles, rays from a camera, a ray's meeting with a
// box, a sphere, a triangle and a segment, a raycaster's hits on meshes,
// lines and points, bounds, a frustum's planes and what it holds, and a
// line's measures — to reference.json beside this script;
// tests/space/reference.co holds Lory to them.
//
//     npm install --prefix <scratch>/ref three@0.187.0
//     node tests/space/reference.mjs <scratch>/ref/node_modules/three
//
// Run from the repository's root. Only three's own classes are run here:
// the cases (the cameras, the turns, the rays and the shapes) are this
// script's own.
import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

const root = process.argv[2];
if (!root) {
    console.error('usage: node tests/space/reference.mjs <path to node_modules/three>');
    process.exit(1);
}
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
if (version !== '0.187.0') {
    console.error(`three ${version} found; the reference is three 0.187.0`);
    process.exit(1);
}
const T = await import(pathToFileURL(join(root, 'build/three.core.js')).href);

const v3 = (v) => [v.x, v.y, v.z];
const q4 = (q) => [q.x, q.y, q.z, q.w];
const m16 = (m) => Array.from(m.elements);
const V = (a) => new T.Vector3(a[0], a[1], a[2]);
const ORDERS = ['XYZ', 'YXZ', 'ZXY', 'ZYX', 'YZX', 'XZY'];
const out = { version };

// ---- cameras' projections ----
out.perspective = [];
for (const [fov, aspect, near, far, zoom] of [
    [50, 1, 0.1, 2000, 1], [75, 16 / 9, 0.1, 1000, 1], [45, 900 / 613, 0.5, 100, 1],
    [60, 0.75, 1, 50, 2], [30, 2.5, 0.01, 10, 0.5], [90, 1.3333333333333333, 0.25, 400, 1],
    [10, 1, 5, 5000, 1], [120, 0.5, 0.1, 30, 1.5]]) {
    const cam = new T.PerspectiveCamera(fov, aspect, near, far);
    cam.zoom = zoom;
    cam.updateProjectionMatrix();
    out.perspective.push({ fov, aspect, near, far, zoom, m: m16(cam.projectionMatrix), inverse: m16(cam.projectionMatrixInverse) });
}
out.orthographic = [];
for (const [left, right, top, bottom, near, far, zoom] of [
    [-1, 1, 1, -1, 0.1, 2000, 1], [-4, 4, 3, -3, 1, 100, 1], [-2.5, 1.5, 2, -0.5, 0.5, 20, 2],
    [-10, 10, 5.625, -5.625, -50, 50, 0.75], [0, 900, 0, -613, 1, 1000, 1]]) {
    const cam = new T.OrthographicCamera(left, right, top, bottom, near, far);
    cam.zoom = zoom;
    cam.updateProjectionMatrix();
    out.orthographic.push({ left, right, top, bottom, near, far, zoom, m: m16(cam.projectionMatrix), inverse: m16(cam.projectionMatrixInverse) });
}

// ---- a camera looking at a point ----
out.look = [];
for (const [position, target, up] of [
    [[0, 0, 5], [0, 0, 0], [0, 1, 0]], [[3, 2, 4], [0, 0.5, 0], [0, 1, 0]],
    [[-6, 3, -2], [1, 1, 1], [0, 1, 0]], [[0, 10, 0], [0, 0, 0], [0, 1, 0]],
    [[0, -4, 0], [0, 0, 0], [0, 1, 0]], [[2, 2, 2], [2, 2, 2], [0, 1, 0]],
    [[1, 2, 3], [4, -5, 6], [0, 0, 1]], [[0, 0, 8], [0, 0, 0], [0, 0, 1]],
    [[5, 1, -3], [-2, 0, 0], [0.6, 0.8, 0]]]) {
    const rotation = new T.Matrix4().lookAt(V(position), V(target), V(up));
    const cam = new T.PerspectiveCamera(50, 1, 0.1, 100);
    cam.up.set(up[0], up[1], up[2]);
    cam.position.set(position[0], position[1], position[2]);
    cam.lookAt(V(target));
    cam.updateMatrixWorld();
    out.look.push({ position, target, up, rotation: m16(rotation), quaternion: q4(cam.quaternion), world: m16(cam.matrixWorld), view: m16(cam.matrixWorldInverse) });
}

// ---- quaternions and Euler angles ----
const ANGLES = [[0.3, -0.7, 1.1], [1.2, 0.4, -2.0], [-0.25, 1.5, 0.75], [3.0, -1.4, 0.2],
    [0, 0, 0], [Math.PI / 2, 0, 0], [0, Math.PI / 2, 0.5], [0.1, -Math.PI / 2, 0.3]];
out.euler = [];
for (const angles of ANGLES) {
    for (const order of ORDERS) {
        const q = new T.Quaternion().setFromEuler(new T.Euler(angles[0], angles[1], angles[2], order));
        const back = new T.Euler().setFromQuaternion(q, order);
        const m = new T.Matrix4().makeRotationFromQuaternion(q);
        const fromMatrix = new T.Euler().setFromRotationMatrix(m, order);
        out.euler.push({ angles, order, quaternion: q4(q), back: [back.x, back.y, back.z], matrix: m16(m), from_matrix: [fromMatrix.x, fromMatrix.y, fromMatrix.z] });
    }
}
out.axis = [];
for (const [axis, angle] of [[[0, 1, 0], 0.5], [[1, 0, 0], -1.25], [[0.6, 0.8, 0], 2.5],
    [[0.2672612419124244, 0.5345224838248488, 0.8017837257372732], 1.0], [[0, 0, 1], Math.PI]]) {
    out.axis.push({ axis, angle, quaternion: q4(new T.Quaternion().setFromAxisAngle(V(axis), angle)) });
}
// (rotations whose trace is not positive take setFromRotationMatrix's
// other three ways: half turns about each axis, and near them)
out.rotation = [];
for (const [axis, angle] of [[[1, 0, 0], Math.PI], [[0, 1, 0], Math.PI], [[0, 0, 1], Math.PI],
    [[0.6, 0.8, 0], 3.0], [[0, 0.6, 0.8], 2.9], [[0.8, 0, 0.6], 3.1], [[0.48, 0.6, 0.64], 0.7]]) {
    const q = new T.Quaternion().setFromAxisAngle(V(axis), angle);
    const m = new T.Matrix4().makeRotationFromQuaternion(q);
    const back = new T.Quaternion().setFromRotationMatrix(m);
    out.rotation.push({ m: m16(m), quaternion: q4(back) });
}
out.quaternion_times = [];
out.slerp = [];
const QS = [[0.1, 0.2, 0.3, 0.9273618495495703], [-0.5, 0.5, 0.5, 0.5], [0, 0, 0.7071067811865476, 0.7071067811865476],
    [0.3, -0.4, 0.1, -0.8602325267042626], [0, 0, 0, 1]];
for (let i = 0; i < QS.length; i++) {
    for (let j = 0; j < QS.length; j++) {
        const a = new T.Quaternion(...QS[i]);
        const b = new T.Quaternion(...QS[j]);
        out.quaternion_times.push({ a: QS[i], b: QS[j], q: q4(new T.Quaternion().multiplyQuaternions(a, b)) });
        for (const t of [0, 0.25, 0.5, 0.9]) {
            out.slerp.push({ a: QS[i], b: QS[j], t, q: q4(a.clone().slerp(b, t)) });
        }
    }
}

// ---- matrices: composed, decomposed, multiplied, inverted ----
out.compose = [];
for (const [position, angles, order, scale] of [
    [[1, 2, 3], [0.3, -0.7, 1.1], 'XYZ', [1, 1, 1]], [[-4, 0.5, 2], [1.2, 0.4, -2.0], 'YXZ', [2, 0.5, 3]],
    [[0, 0, 0], [-0.25, 1.5, 0.75], 'ZXY', [1.5, 1.5, 1.5]], [[10, -3, 0.25], [3.0, -1.4, 0.2], 'ZYX', [-1, 2, 1]],
    [[0.1, 0.2, 0.3], [0, 0, 0], 'XYZ', [0.25, 4, 1]], [[2, 2, -2], [0.1, -Math.PI / 2, 0.3], 'YZX', [1, 1, 1]],
    [[-1, -1, -1], [Math.PI / 2, 0, 0], 'XZY', [3, 2, 1]]]) {
    const q = new T.Quaternion().setFromEuler(new T.Euler(angles[0], angles[1], angles[2], order));
    const m = new T.Matrix4().compose(V(position), q, V(scale));
    const p = new T.Vector3(), r = new T.Quaternion(), s = new T.Vector3();
    m.decompose(p, r, s);
    out.compose.push({ position, quaternion: q4(q), scale, m: m16(m), back_position: v3(p), back_quaternion: q4(r), back_scale: v3(s), determinant: m.determinant(), inverse: m16(m.clone().invert()), max_scale: m.getMaxScaleOnAxis() });
}
out.times = [];
for (let i = 0; i < out.compose.length; i++) {
    const a = new T.Matrix4().fromArray(out.compose[i].m);
    const b = new T.Matrix4().fromArray(out.compose[(i + 3) % out.compose.length].m);
    out.times.push({ a: m16(a), b: m16(b), m: m16(new T.Matrix4().multiplyMatrices(a, b)) });
}
// (a general matrix, a projection's, and one that cannot be inverted)
out.inverse = [];
for (const e of [[2, 0.5, -1, 0, 0.25, 3, 0.75, 0.1, -0.5, 1, 4, -0.2, 1, -2, 0.5, 1],
    out.perspective[1].m, [1, 2, 3, 4, 2, 4, 6, 8, 0, 1, 0, 1, 5, 5, 5, 5]]) {
    const m = new T.Matrix4().fromArray(e);
    out.inverse.push({ m: e, inverse: m16(m.clone().invert()), determinant: m.determinant() });
}
out.apply = [];
for (let i = 0; i < out.compose.length; i++) {
    for (const p of [[0.5, -1, 2], [3, 0.25, -0.75]]) {
        const m = new T.Matrix4().fromArray(out.compose[i].m);
        out.apply.push({ m: m16(m), p, point: v3(V(p).applyMatrix4(m)), direction: v3(V(p).transformDirection(m)) });
    }
}
for (const p of [[0.5, -1, -2], [3, 0.25, -10.75]]) {
    const m = new T.Matrix4().fromArray(out.perspective[2].m);
    out.apply.push({ m: m16(m), p, point: v3(V(p).applyMatrix4(m)), direction: v3(V(p).transformDirection(m)) });
}

// ---- rays from a camera ----
out.camera_rays = [];
const cameras = [];
{
    const a = new T.PerspectiveCamera(50, 900 / 613, 0.1, 100);
    a.position.set(3, 2, 6); a.lookAt(0, 0.5, 0); a.updateMatrixWorld();
    const b = new T.PerspectiveCamera(75, 1.5, 0.5, 50);
    b.position.set(-2, 5, -4); b.lookAt(1, 0, 1); b.updateMatrixWorld();
    const c = new T.OrthographicCamera(-4, 4, 3, -3, 0.1, 100);
    c.position.set(0, 6, 6); c.lookAt(0, 0, 0); c.updateMatrixWorld();
    const d = new T.OrthographicCamera(-2.5, 1.5, 2, -0.5, 0.5, 20);
    d.zoom = 2; d.updateProjectionMatrix();
    d.position.set(1, 1, 9); d.lookAt(1, 1, 0); d.updateMatrixWorld();
    cameras.push(a, b, c, d);
}
for (const cam of cameras) {
    for (const [x, y] of [[0, 0], [0.5, -0.25], [-0.9, 0.8], [1, 1]]) {
        const r = new T.Raycaster();
        r.setFromCamera(new T.Vector2(x, y), cam);
        out.camera_rays.push({ straight: !!cam.isOrthographicCamera, projection: m16(cam.projectionMatrix), world: m16(cam.matrixWorld), x, y, origin: v3(r.ray.origin), direction: v3(r.ray.direction) });
    }
}

// ---- a ray meeting a box, a sphere, a triangle, a segment ----
const RAYS = [[[0, 0, 5], [0, 0, -1]], [[3, 2, 4], [-0.5570860145311556, -0.3713906763541037, -0.7427813527082074]],
    [[-2, 0.3, 0.2], [1, 0, 0]], [[0.4, 3, -0.1], [0, -1, 0]], [[0, 0, 0], [0.5773502691896258, 0.5773502691896258, 0.5773502691896258]],
    [[2, 2, 2], [0.6, 0.8, 0]], [[0.2, -0.1, 0.05], [0, 0, 1]]];
out.ray_box = [];
out.ray_sphere = [];
out.ray_triangle = [];
out.segment = [];
out.ray_point = [];
for (const [o, d] of RAYS) {
    const ray = new T.Ray(V(o), V(d));
    for (const [lo, hi] of [[[-0.5, -0.5, -0.5], [0.5, 0.5, 0.5]], [[1, 1, 1], [3, 2, 4]], [[-1, 0, -1], [1, 0.25, 1]]]) {
        const p = ray.intersectBox(new T.Box3(V(lo), V(hi)), new T.Vector3());
        out.ray_box.push({ origin: o, direction: d, lo, hi, point: p ? v3(p) : null });
    }
    for (const [center, radius] of [[[0, 0, 0], 1], [[1, 1, 1], 0.5], [[0, 0, -3], 2]]) {
        const p = ray.intersectSphere(new T.Sphere(V(center), radius), new T.Vector3());
        out.ray_sphere.push({ origin: o, direction: d, center, radius, point: p ? v3(p) : null });
    }
    for (const [a, b, c] of [[[-1, -1, 0], [1, -1, 0], [0, 1, 0]], [[0, 1, 0], [1, -1, 0], [-1, -1, 0]],
        [[0.5, 0.5, -1], [-0.5, 0.5, 0.5], [0.5, -0.5, 0.25]], [[2, 1, 1], [2, 3, 1], [2, 1, 3]]]) {
        for (const culled of [false, true]) {
            const p = ray.intersectTriangle(V(a), V(b), V(c), culled, new T.Vector3());
            out.ray_triangle.push({ origin: o, direction: d, a, b, c, culled, point: p ? v3(p) : null });
        }
    }
    for (const [v0, v1] of [[[-1, 0, 0], [1, 0, 0]], [[0.5, 1, -2], [0.5, -1, -2]], [[3, 3, 3], [4, 5, 6]], [[0, 0, -1], [0, 0, 1]]]) {
        const onRay = new T.Vector3(), onSegment = new T.Vector3();
        const sq = ray.distanceSqToSegment(V(v0), V(v1), onRay, onSegment);
        out.segment.push({ origin: o, direction: d, v0, v1, distance_sq: sq, on_ray: v3(onRay), on_segment: v3(onSegment) });
    }
    for (const p of [[0, 0, 0], [1, 2, -3], [-4, 0.5, 0.5]]) {
        out.ray_point.push({ origin: o, direction: d, p, distance_sq: ray.distanceSqToPoint(V(p)), closest: v3(ray.closestPointToPoint(V(p), new T.Vector3())) });
    }
}

// ---- a raycaster's hits on meshes ----
const SHAPES = {
    box: () => new T.BoxGeometry(1, 1, 1),
    sphere: () => new T.SphereGeometry(1, 8, 6),
    quad: () => {
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
        g.setIndex([0, 1, 2, 0, 2, 3]);
        return g;
    },
};
const SIDES = { front: T.FrontSide, back: T.BackSide, double: T.DoubleSide };
const PLACES = [[[0, 0, 0], [0, 0, 0], [1, 1, 1]], [[0.5, -0.25, -1], [0.3, 0.6, -0.2], [1, 2, 0.5]], [[1, 1, 1], [0, 1.2, 0], [1.5, 1.5, 1.5]]];
out.mesh_hits = [];
for (const shape of ['box', 'sphere', 'quad']) {
    for (const side of ['front', 'back', 'double']) {
        for (const [position, angles, scale] of PLACES) {
            const mesh = new T.Mesh(SHAPES[shape](), new T.MeshBasicMaterial({ side: SIDES[side] }));
            mesh.position.set(...position); mesh.rotation.set(...angles); mesh.scale.set(...scale);
            mesh.updateMatrixWorld();
            for (const [o, d] of RAYS) {
                for (const [near, far] of [[0, Infinity], [0.5, 6]]) {
                    const r = new T.Raycaster(V(o), V(d), near, far);
                    const hits = r.intersectObject(mesh).map((h) => ({ distance: h.distance, point: v3(h.point), face_index: h.faceIndex, face: [h.face.a, h.face.b, h.face.c], normal: v3(h.face.normal) }));
                    out.mesh_hits.push({ shape, side, matrix: m16(mesh.matrixWorld), origin: o, direction: d, near, far: far === Infinity ? -1 : far, hits });
                }
            }
        }
    }
}

// ---- a raycaster's hits on lines and points ----
const LINE_POINTS = [-1, 0, 0, 0, 1, 0, 1, 0, 0.5, 0.5, -0.5, -1, -1, -1, 0.25, 0, 0, 2];
out.line_hits = [];
for (const kind of ['line', 'segments', 'loop', 'points']) {
    for (const indices of [[], [0, 2, 1, 3, 5, 4]]) {
        for (const [position, angles, scale] of PLACES) {
            for (const threshold of [0.1, 1]) {
                const g = new T.BufferGeometry();
                g.setAttribute('position', new T.Float32BufferAttribute(LINE_POINTS, 3));
                if (indices.length) g.setIndex(indices);
                const made = kind === 'line' ? new T.Line(g) : kind === 'segments' ? new T.LineSegments(g) : kind === 'loop' ? new T.LineLoop(g) : new T.Points(g);
                made.position.set(...position); made.rotation.set(...angles); made.scale.set(...scale);
                made.updateMatrixWorld();
                for (const [o, d] of RAYS) {
                    const r = new T.Raycaster(V(o), V(d));
                    r.params.Line.threshold = threshold;
                    r.params.Points.threshold = threshold;
                    const hits = r.intersectObject(made).map((h) => ({ distance: h.distance, point: v3(h.point), index: h.index, to_ray: h.distanceToRay === undefined ? -1 : h.distanceToRay }));
                    out.line_hits.push({ kind, indices, matrix: m16(made.matrixWorld), scale, threshold, origin: o, direction: d, hits });
                }
            }
        }
    }
}

// ---- bounds ----
out.bounds = [];
for (const shape of ['box', 'sphere', 'quad']) {
    const g = SHAPES[shape]();
    g.computeBoundingBox();
    g.computeBoundingSphere();
    for (const [position, angles, scale] of PLACES) {
        const m = new T.Matrix4().compose(V(position), new T.Quaternion().setFromEuler(new T.Euler(...angles)), V(scale));
        const box = g.boundingBox.clone().applyMatrix4(m);
        const sphere = g.boundingSphere.clone().applyMatrix4(m);
        out.bounds.push({ shape, lo: v3(g.boundingBox.min), hi: v3(g.boundingBox.max), center: v3(g.boundingSphere.center), radius: g.boundingSphere.radius, matrix: m16(m), placed_lo: v3(box.min), placed_hi: v3(box.max), placed_center: v3(sphere.center), placed_radius: sphere.radius });
    }
}

// ---- a frustum: its planes and what it holds ----
out.frustum = [];
for (const cam of cameras) {
    const seen = new T.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    const f = new T.Frustum().setFromProjectionMatrix(seen);
    const planes = [];
    for (const p of f.planes) planes.push(p.normal.x, p.normal.y, p.normal.z, p.constant);
    const spheres = [];
    for (const [center, radius] of [[[0, 0, 0], 1], [[20, 0, 0], 1], [[0, 0, -200], 5], [[2.5, 1, 0], 0.5], [[-6, 0, 0], 3]]) {
        spheres.push({ center, radius, held: f.intersectsSphere(new T.Sphere(V(center), radius)) });
    }
    const boxes = [];
    for (const [lo, hi] of [[[-0.5, -0.5, -0.5], [0.5, 0.5, 0.5]], [[30, 30, 30], [31, 31, 31]], [[-100, -1, -1], [100, 1, 1]], [[4, 0, 0], [5, 1, 1]]]) {
        boxes.push({ lo, hi, held: f.intersectsBox(new T.Box3(V(lo), V(hi))) });
    }
    out.frustum.push({ projection: m16(cam.projectionMatrix), view: m16(cam.matrixWorldInverse), seen: m16(seen), planes, spheres, boxes });
}

// ---- a line's measures ----
out.line_distances = [];
for (const kind of ['line', 'segments']) {
    for (const points of [LINE_POINTS, [0, 0, 0, 3, 4, 0, 3, 4, 12, 0, 0, 12]]) {
        const g = new T.BufferGeometry();
        g.setAttribute('position', new T.Float32BufferAttribute(points, 3));
        const made = kind === 'line' ? new T.Line(g) : new T.LineSegments(g);
        made.computeLineDistances();
        out.line_distances.push({ kind, points, distances: Array.from(g.getAttribute('lineDistance').array) });
    }
}

const where = join(dirname(new URL(import.meta.url).pathname), 'reference.json');
writeFileSync(where, JSON.stringify(out));
let count = 0;
const tally = (x) => { if (typeof x === 'number') count++; else if (Array.isArray(x)) x.forEach(tally); else if (x && typeof x === 'object') Object.values(x).forEach(tally); };
tally(out);
console.log(`three ${version}: ${count} numbers written to ${where}`);
