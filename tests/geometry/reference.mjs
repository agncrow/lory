// The numbers Lory's geometry (packages/lory/geometry.co) is held to:
// three.js r187 (npm `three@0.187.0`, MIT), run in node on the fixed cases
// below. For each case it writes the geometry's vertex count, its index
// count, its positions, normals and uvs (their float32 bits, as base64), its
// indices and its groups, to reference.json beside this script;
// tests/geometry/reference.co builds each case in Lory and holds it to them.
//
//     npm install --prefix <scratch>/ref three@0.187.0
//     node tests/geometry/reference.mjs <scratch>/ref/node_modules/three
//
// Run from the repository's root. Only three's own classes are run here:
// the cases (their sizes, points and outlines) are this script's own.
import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

const root = process.argv[2];
if (!root) {
    console.error('usage: node tests/geometry/reference.mjs <path to node_modules/three>');
    process.exit(1);
}
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
if (version !== '0.187.0') {
    console.error(`three ${version} found; the reference is three 0.187.0`);
    process.exit(1);
}
const T = await import(pathToFileURL(join(root, 'build/three.core.js')).href);

const TAU = Math.PI * 2;

// ---- the inputs, as Lory's test reads them back ----

// a path's steps: what each draws, from where the last one ended
const move = (x, y) => ({ form: 'move', numbers: [x, y] });
const line = (x, y) => ({ form: 'line', numbers: [x, y] });
const quadratic = (cx, cy, x, y) => ({ form: 'quadratic', numbers: [cx, cy, x, y] });
const cubic = (ax, ay, bx, by, x, y) => ({ form: 'cubic', numbers: [ax, ay, bx, by, x, y] });
const spline = (...xy) => ({ form: 'spline', numbers: xy });
const arc = (x, y, r, a0, a1, cw) => ({ form: 'arc', numbers: [x, y, r, a0, a1, cw ? 1 : 0] });
const absarc = (x, y, r, a0, a1, cw) => ({ form: 'absarc', numbers: [x, y, r, a0, a1, cw ? 1 : 0] });
const ellipse = (x, y, rx, ry, a0, a1, cw, turn) => ({ form: 'ellipse', numbers: [x, y, rx, ry, a0, a1, cw ? 1 : 0, turn] });
const absellipse = (x, y, rx, ry, a0, a1, cw, turn) => ({ form: 'absellipse', numbers: [x, y, rx, ry, a0, a1, cw ? 1 : 0, turn] });

// a path through points: a move to the first, lines to the rest
function through(...xy) {
    const steps = [move(xy[0], xy[1])];
    for (let i = 2; i < xy.length; i += 2) steps.push(line(xy[i], xy[i + 1]));
    return steps;
}

const outline = (path, holes = []) => ({ path, holes });

// the outlines the shape and extrude cases use
const triangle = outline(through(0, 0.5, -0.5, -0.5, 0.5, -0.5));
const square = outline(through(-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5));
const framed = outline(through(0, 0, 4, 0, 4, 4, 0, 4), [through(1, 1, 1, 3, 3, 3, 3, 1)]);
const heart = outline([move(0, 0.5), cubic(0.6, 1.2, 1.4, 0.2, 0, -1.0), cubic(-1.4, 0.2, -0.6, 1.2, 0, 0.5)]);
const disc = outline([absarc(0, 0, 2, 0, TAU, false)], [[absarc(-0.8, 0, 0.4, 0, TAU, true)], [absarc(0.8, 0.3, 0.5, 0, TAU, true)]]);
const wheel = outline([absarc(0, 0, 1, 0, TAU, false)], [[absellipse(0, 0, 0.5, 0.3, 0, TAU, true, 0.4)]]);
const mixed = outline([move(0, 0), quadratic(1, 2, 2, 0), spline(2.5, -0.5, 2, -1, 1, -1.2), ellipse(-0.5, 0, 0.5, 0.25, 0, Math.PI, false, 0.3), line(0, 0)]);
const star = outline(through(...starPoints(5, 1.0, 0.4)));
const comb = outline(through(0, 0, 5, 0, 5, 3, 4, 3, 4, 1, 3, 1, 3, 3, 2, 3, 2, 1, 1, 1, 1, 3, 0, 3));
const ruled = outline(through(0, 0, 1, 0, 2, 0, 2, 1, 1, 1, 0, 1));
const bowtie = outline(through(0, 0, 2, 2, 2, 0, 0, 2));
const pointed = outline(through(0, 0, 2, 0, 2, 2, 0, 2), [[move(1, 1), line(1, 1)]]);
const closedByHand = outline(through(0, 0, 3, 0, 3, 2, 0, 2, 0, 0));
const clockwise = outline(through(0, 0, 0, 3, 3, 3, 3, 0), [through(1, 1, 1, 2, 2, 2, 2, 1)]);
const arcs = outline([move(0, 0), line(2, 0), arc(0, 1, 1, -Math.PI / 2, Math.PI / 2, false), line(0, 2)]);
const touching = outline(through(0, 0, 6, 0, 6, 4, 0, 4), [through(1, 1, 1, 3, 3, 3, 3, 1), through(3, 1, 3, 3, 5, 3, 5, 1)]);

function starPoints(arms, outer, inner) {
    const xy = [];
    for (let i = 0; i < arms * 2; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = Math.PI / 2 + i * Math.PI / arms;
        xy.push(r * Math.cos(a), r * Math.sin(a));
    }
    return xy;
}

// the curves the tube and extrude cases go along. The closed loop is not
// symmetric: about a symmetric one, the closing twist's sign comes out of
// rounding alone (three's own test of it lands about 1e-17 from 0), and
// the last bits of a sine would decide it.
const curves = {
    line: { form: 'line', points: [0, 0, 0, 1, 2, 3] },
    quadratic: { form: 'quadratic', points: [-1, 0, 0, 0, 2, 0.5, 1, 0, 1] },
    cubic: { form: 'cubic', points: [-2, 0, 0, -1, 2, 1, 1, -2, -1, 2, 0, 0] },
    open: { form: 'spline', points: [-2, 0, 0, -1, 1, 0.5, 0, 0, 1, 1, -1, 0.5, 2, 0, 0], closed: 0, spline: 'centripetal', tension: 0.5 },
    loop: { form: 'spline', points: [1, 0, 0, 0, 0.6, 1, -1.2, 0.1, 0, 0, -0.5, -0.9], closed: 1, spline: 'centripetal', tension: 0.5 },
    chordal: { form: 'spline', points: [-2, 0, 0, -1, 1, 0.5, 0, 0, 1, 1, -1, 0.5, 2, 0, 0], closed: 0, spline: 'chordal', tension: 0.5 },
    taut: { form: 'spline', points: [1, 0, 0, 0, 0.6, 1, -1.2, 0.1, 0, 0, -0.5, -0.9], closed: 1, spline: 'catmullrom', tension: 0.3 },
    pair: { form: 'spline', points: [0, 0, 0, 1, 1, 1], closed: 0, spline: 'centripetal', tension: 0.5 },
    helix: { form: 'helix', numbers: [1, 3, 2] },
    spring: { form: 'helix', numbers: [0.6, 2, 3.5] },
    rise: { form: 'spline', points: [0, 0, 0, 0, 1, 1, 0, 2, 0, 0, 3, -1, 0, 4, 0], closed: 0, spline: 'centripetal', tension: 0.5 },
};

// a helix about the y axis: `turns` times round, `height` tall, from y = -height/2
class Helix extends T.Curve {
    constructor(radius, height, turns) {
        super();
        this.radius = radius;
        this.height = height;
        this.turns = turns;
    }
    getPoint(t, target = new T.Vector3()) {
        const a = 2 * Math.PI * this.turns * t;
        return target.set(this.radius * Math.cos(a), this.height * t - this.height / 2, this.radius * Math.sin(a));
    }
}

function curveOf(spec) {
    const p = spec.points || [];
    const at = (i) => new T.Vector3(p[3 * i], p[3 * i + 1], p[3 * i + 2]);
    switch (spec.form) {
        case 'line': return new T.LineCurve3(at(0), at(1));
        case 'quadratic': return new T.QuadraticBezierCurve3(at(0), at(1), at(2));
        case 'cubic': return new T.CubicBezierCurve3(at(0), at(1), at(2), at(3));
        case 'spline': {
            const points = [];
            for (let i = 0; i < p.length / 3; i++) points.push(at(i));
            return new T.CatmullRomCurve3(points, spec.closed === 1, spec.spline, spec.tension);
        }
        case 'helix': return new Helix(...spec.numbers);
    }
    throw new Error(`no curve ${spec.form}`);
}

function pathOf(steps, into) {
    for (const s of steps) {
        const n = s.numbers;
        switch (s.form) {
            case 'move': into.moveTo(n[0], n[1]); break;
            case 'line': into.lineTo(n[0], n[1]); break;
            case 'quadratic': into.quadraticCurveTo(n[0], n[1], n[2], n[3]); break;
            case 'cubic': into.bezierCurveTo(n[0], n[1], n[2], n[3], n[4], n[5]); break;
            case 'spline': {
                const pts = [];
                for (let i = 0; i < n.length; i += 2) pts.push(new T.Vector2(n[i], n[i + 1]));
                into.splineThru(pts);
                break;
            }
            case 'arc': into.arc(n[0], n[1], n[2], n[3], n[4], n[5] === 1); break;
            case 'absarc': into.absarc(n[0], n[1], n[2], n[3], n[4], n[5] === 1); break;
            case 'ellipse': into.ellipse(n[0], n[1], n[2], n[3], n[4], n[5], n[6] === 1, n[7]); break;
            case 'absellipse': into.absellipse(n[0], n[1], n[2], n[3], n[4], n[5], n[6] === 1, n[7]); break;
            default: throw new Error(`no step ${s.form}`);
        }
    }
    return into;
}

function shapeOf(o) {
    const s = pathOf(o.path, new T.Shape());
    for (const h of o.holes) s.holes.push(pathOf(h, new T.Path()));
    return s;
}

// the corners and faces of a polyhedron of Lory's own: a cube, cut into
// triangles from its lowest corner
const cubeCorners = [-1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1, -1, -1, 1, 1, -1, 1, 1, 1, 1, -1, 1, 1];
const cubeFaces = [0, 3, 2, 0, 2, 1, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 3, 7, 6, 3, 6, 2, 0, 4, 7, 0, 7, 3, 1, 2, 6, 1, 6, 5];
// a bipyramid: a triangle's three corners about the waist, a peak above and below
const bipyramidCorners = [1, 0, 0, -0.5, 0, 0.8660254037844386, -0.5, 0, -0.8660254037844386, 0, 1.5, 0, 0, -1.5, 0];
const bipyramidFaces = [3, 0, 2, 3, 2, 1, 3, 1, 0, 4, 2, 0, 4, 1, 2, 4, 0, 1];

// ---- building a case in three ----

function made(c) {
    const n = c.numbers;
    switch (c.make) {
        case 'box': return new T.BoxGeometry(...n);
        case 'plane': return new T.PlaneGeometry(...n);
        case 'circle': return new T.CircleGeometry(...n);
        case 'ring': return new T.RingGeometry(...n);
        case 'sphere': return new T.SphereGeometry(...n);
        case 'cylinder': return new T.CylinderGeometry(n[0], n[1], n[2], n[3], n[4], n[5] === 1, n[6], n[7]);
        case 'cone': return new T.ConeGeometry(n[0], n[1], n[2], n[3], n[4] === 1, n[5], n[6]);
        case 'torus': return new T.TorusGeometry(...n);
        case 'torus_knot': return new T.TorusKnotGeometry(...n);
        case 'capsule': return new T.CapsuleGeometry(...n);
        case 'lathe': {
            const pts = [];
            for (let i = 0; i < c.points.length; i += 2) pts.push(new T.Vector2(c.points[i], c.points[i + 1]));
            return new T.LatheGeometry(pts, n[0], n[1], n[2]);
        }
        case 'tube': return new T.TubeGeometry(curveOf(c.curve), n[0], n[1], n[2], n[3] === 1);
        case 'shape': {
            const shapes = c.outlines.map(shapeOf);
            return new T.ShapeGeometry(c.list === 1 ? shapes : shapes[0], n[0]);
        }
        case 'extrude': {
            const shapes = c.outlines.map(shapeOf);
            const options = { curveSegments: n[0], steps: n[1], depth: n[2], bevelEnabled: n[3] === 1, bevelThickness: n[4], bevelSize: n[5], bevelOffset: n[6], bevelSegments: n[7] };
            if (c.curve) options.extrudePath = curveOf(c.curve);
            return new T.ExtrudeGeometry(c.list === 1 ? shapes : shapes[0], options);
        }
        case 'tetrahedron': return new T.TetrahedronGeometry(...n);
        case 'octahedron': return new T.OctahedronGeometry(...n);
        case 'icosahedron': return new T.IcosahedronGeometry(...n);
        case 'dodecahedron': return new T.DodecahedronGeometry(...n);
        case 'polyhedron': return new T.PolyhedronGeometry(c.points, c.faces, n[0], n[1]);
        case 'edges': return new T.EdgesGeometry(made(c.of), n[0]);
        case 'wireframe': return new T.WireframeGeometry(made(c.of));
    }
    throw new Error(`no geometry ${c.make}`);
}

function bits(attribute) {
    if (!attribute) return '';
    const a = attribute.array;
    return Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
}

function answered(c) {
    const g = made(c);
    const position = g.getAttribute('position');
    const out = {
        count: position.count,
        index_count: g.index ? g.index.count : 0,
        positions: bits(position),
        normals: bits(g.getAttribute('normal')),
        uvs: bits(g.getAttribute('uv')),
        indices: g.index ? Array.from(g.index.array) : [],
        groups: g.groups.flatMap((r) => [r.start, r.count, r.materialIndex]),
    };
    return { ...c, ...out };
}

// ---- the cases ----

const cases = [];
const add = (name, make, numbers, more = {}) => cases.push({ name, make, numbers, ...more });

add('box, its defaults', 'box', [1, 1, 1, 1, 1, 1]);
add('box 2 by 3 by 4, cut 2, 3 and 4 times', 'box', [2, 3, 4, 2, 3, 4]);
add('box flat and wide, cut unevenly', 'box', [1.5, 0.5, 2.5, 3, 1, 2]);

add('plane, its defaults', 'plane', [1, 1, 1, 1]);
add('plane 2 by 3, cut 4 by 5', 'plane', [2, 3, 4, 5]);
add('plane 10 by 10, cut 7 by 3', 'plane', [10, 10, 7, 3]);

add('circle, its defaults', 'circle', [1, 32, 0, TAU]);
add('circle, half of one in 5 segments', 'circle', [2, 5, 0.5, Math.PI]);
add('circle of 2 segments, made 3', 'circle', [1.5, 2, 0, TAU]);
add('circle arc of 8 segments', 'circle', [1, 8, 1, 4.5]);

add('ring, its defaults', 'ring', [0.5, 1, 32, 1, 0, TAU]);
add('ring of 12 by 4 over an arc', 'ring', [1, 3, 12, 4, 0.3, 4]);
add('ring of 3 by 2', 'ring', [0.2, 2, 3, 2, 0, TAU]);

add('sphere, its defaults', 'sphere', [1, 32, 16, 0, TAU, 0, Math.PI]);
add('sphere cut in phi and theta', 'sphere', [2, 12, 8, 0.5, 4, 0.3, 2]);
add('sphere, its upper half', 'sphere', [1, 6, 4, 0, TAU, 0, Math.PI / 2]);
add('sphere, its fewest segments', 'sphere', [1.5, 3, 2, 0, TAU, 0, Math.PI]);
add('sphere, a band about the middle', 'sphere', [1, 10, 5, 0, TAU, 1, 1.2]);

add('cylinder, its defaults', 'cylinder', [1, 1, 1, 32, 1, 0, 0, TAU]);
add('cylinder narrowing upward, 3 rows', 'cylinder', [0.5, 1.5, 2, 12, 3, 0, 0, TAU]);
add('cylinder open ended over an arc', 'cylinder', [1, 1, 2, 8, 2, 1, 0.5, 3]);
add('cylinder with no top', 'cylinder', [0, 1, 1, 10, 2, 0, 0, TAU]);
add('cylinder with no bottom', 'cylinder', [1, 0, 1, 6, 1, 0, 0, TAU]);

add('cone, its defaults', 'cone', [1, 1, 32, 1, 0, 0, TAU]);
add('cone over an arc in 4 rows', 'cone', [2, 3, 7, 4, 0, 1, 4]);
add('cone open ended', 'cone', [1, 2, 5, 1, 1, 0, TAU]);

add('torus, its defaults', 'torus', [1, 0.4, 12, 48, TAU, 0, TAU]);
add('torus over an arc', 'torus', [2, 0.5, 8, 24, 4, 0, TAU]);
add('torus over part of its tube', 'torus', [1.5, 0.3, 6, 10, TAU, 0.5, 3]);

add('torus knot, its defaults', 'torus_knot', [1, 0.4, 64, 8, 2, 3]);
add('torus knot 3 by 5', 'torus_knot', [2, 0.6, 30, 6, 3, 5]);
add('torus knot 1 by 4, thin', 'torus_knot', [1, 0.2, 20, 4, 1, 4]);

add('capsule, its defaults', 'capsule', [1, 1, 4, 8, 1]);
add('capsule tall and cut', 'capsule', [0.5, 2, 3, 12, 3]);
add('capsule of no height', 'capsule', [1, 0, 2, 5, 1]);
add('capsule of one cap segment', 'capsule', [0.7, 1.5, 1, 4, 2]);

add('lathe, its defaults', 'lathe', [12, 0, TAU], { points: [0, -0.5, 0.5, 0, 0, 0.5] });
add('lathe of a vase', 'lathe', [16, 0, TAU], { points: vase() });
add('lathe of two points over half a turn', 'lathe', [5, 0.5, Math.PI], { points: [1, -1, 1, 1] });
add('lathe turned past a whole turn', 'lathe', [6, 0, 7], { points: [0.2, -1, 0.8, -0.5, 0.6, 0.4, 0.1, 1] });

function vase() {
    const xy = [];
    for (let i = 0; i < 10; i++) xy.push(Math.sin(i * 0.2) * 0.5 + 0.3, (i - 5) * 0.2);
    return xy;
}

add('tube along a line', 'tube', [4, 0.2, 6, 0], { curve: curves.line });
add('tube along a quadratic curve, its defaults', 'tube', [64, 1, 8, 0], { curve: curves.quadratic });
add('tube along a cubic curve', 'tube', [20, 0.3, 5, 0], { curve: curves.cubic });
add('tube along a centripetal spline', 'tube', [30, 0.25, 6, 0], { curve: curves.open });
add('tube closed along a closed spline', 'tube', [40, 0.2, 8, 1], { curve: curves.loop });
add('tube along a chordal spline', 'tube', [24, 0.2, 5, 0], { curve: curves.chordal });
add('tube closed along a taut closed spline', 'tube', [32, 0.15, 6, 1], { curve: curves.taut });
add('tube along a spline of two points', 'tube', [8, 0.1, 4, 0], { curve: curves.pair });
add('tube along a helix', 'tube', [60, 0.15, 6, 0], { curve: curves.helix });
add('tube along a spline that rises', 'tube', [16, 0.2, 5, 0], { curve: curves.rise });

add('shape, a triangle', 'shape', [12], { outlines: [triangle] });
add('shape, a square with a square hole', 'shape', [12], { outlines: [framed] });
add('shape, a heart of cubic curves', 'shape', [12], { outlines: [heart] });
add('shape, a disc with two holes', 'shape', [12], { outlines: [disc] });
add('shape, a disc of 96 points', 'shape', [48], { outlines: [outline([absarc(0, 0, 1, 0, TAU, false)])] });
add('shape, a wheel with a turned elliptic hole', 'shape', [20], { outlines: [wheel] });
add('shape, curves of every kind', 'shape', [6], { outlines: [mixed] });
add('shape, a star', 'shape', [12], { outlines: [star] });
add('shape, a comb', 'shape', [12], { outlines: [comb] });
add('shape, an edge of three points in a row', 'shape', [12], { outlines: [ruled] });
add('shape, a bow tie that crosses itself', 'shape', [12], { outlines: [bowtie] });
add('shape, a square with a hole of one point', 'shape', [12], { outlines: [pointed] });
add('shape, arcs from the current point', 'shape', [8], { outlines: [arcs] });
add('shape, two holes that touch', 'shape', [12], { outlines: [touching] });
add('shapes, a list of two', 'shape', [12], { outlines: [triangle, framed], list: 1 });

add('extrude a unit square, no bevel', 'extrude', [12, 1, 1, 0, 0.2, 0.1, 0, 3], { outlines: [outline(through(0, 0, 1, 0, 1, 1, 0, 1))] });
add('extrude, its defaults', 'extrude', [12, 1, 1, 1, 0.2, 0.1, 0, 3], { outlines: [square] });
add('extrude a heart with a bevel, two steps', 'extrude', [12, 2, 0.5, 1, 0.1, 0.05, 0.02, 2], { outlines: [heart] });
add('extrude a framed square, bevelled', 'extrude', [12, 1, 1, 1, 0.3, 0.2, 0, 4], { outlines: [framed] });
add('extrude a disc with holes, three steps', 'extrude', [10, 3, 2, 0, 0.2, 0.1, 0, 3], { outlines: [disc] });
add('extrude along an open spline', 'extrude', [12, 20, 1, 1, 0.2, 0.1, 0, 3], { outlines: [outline(through(0, -0.2, 0.2, 0.2, -0.2, 0.2))], curve: curves.rise });
add('extrude along a closed spline', 'extrude', [12, 30, 1, 0, 0.2, 0.1, 0, 3], { outlines: [square], curve: curves.loop });
add('extrude along a helix', 'extrude', [12, 40, 1, 0, 0.2, 0.1, 0, 3], { outlines: [outline(through(-0.1, -0.1, 0.1, -0.1, 0.1, 0.1, -0.1, 0.1))], curve: curves.helix });
add('extrude a list of two, bevelled', 'extrude', [12, 1, 0.6, 1, 0.1, 0.1, 0, 2], { outlines: [triangle, framed], list: 1 });
add('extrude an outline closed by hand', 'extrude', [12, 1, 1, 1, 0.2, 0.1, 0, 1], { outlines: [closedByHand] });
add('extrude a clockwise outline with a clockwise hole', 'extrude', [12, 2, 1, 0, 0.2, 0.1, 0, 3], { outlines: [clockwise] });
add('extrude a star with a bevel offset', 'extrude', [12, 1, 0.4, 1, 0.15, 0.05, -0.02, 3], { outlines: [star] });

add('tetrahedron, its defaults', 'tetrahedron', [1, 0]);
add('tetrahedron of radius 2, detail 1', 'tetrahedron', [2, 1]);
add('tetrahedron, detail 2', 'tetrahedron', [1, 2]);
add('octahedron, its defaults', 'octahedron', [1, 0]);
add('octahedron of radius 1.5, detail 1', 'octahedron', [1.5, 1]);
add('octahedron, detail 3', 'octahedron', [1, 3]);
add('icosahedron, its defaults', 'icosahedron', [1, 0]);
add('icosahedron, detail 1', 'icosahedron', [1, 1]);
add('icosahedron of radius 2, detail 2', 'icosahedron', [2, 2]);
add('dodecahedron, its defaults', 'dodecahedron', [1, 0]);
add('dodecahedron, detail 1', 'dodecahedron', [1, 1]);
add('polyhedron, a cube', 'polyhedron', [1, 0], { points: cubeCorners, faces: cubeFaces });
add('polyhedron, a cube of detail 2', 'polyhedron', [1.2, 2], { points: cubeCorners, faces: cubeFaces });
add('polyhedron, a bipyramid of detail 1', 'polyhedron', [1, 1], { points: bipyramidCorners, faces: bipyramidFaces });

const of = (make, numbers, more = {}) => ({ name: make, make, numbers, ...more });

add('edges of a box', 'edges', [1], { of: of('box', [1, 1, 1, 1, 1, 1]) });
add('edges of a cut box', 'edges', [1], { of: of('box', [2, 1, 1, 2, 2, 1]) });
add('edges of a sphere', 'edges', [1], { of: of('sphere', [1, 8, 6, 0, TAU, 0, Math.PI]) });
add('edges of a sphere above 30 degrees', 'edges', [30], { of: of('sphere', [1, 8, 6, 0, TAU, 0, Math.PI]) });
add('edges of a cylinder', 'edges', [1], { of: of('cylinder', [1, 1, 1, 8, 1, 0, 0, TAU]) });
add('edges of a dodecahedron', 'edges', [1], { of: of('dodecahedron', [1, 0]) });
add('edges of a plane, its rim', 'edges', [1], { of: of('plane', [1, 1, 2, 2]) });
add('edges of a torus above 20 degrees', 'edges', [20], { of: of('torus', [1, 0.4, 6, 8, TAU, 0, TAU]) });
add('edges of a bevelled heart above 15 degrees', 'edges', [15], { of: of('extrude', [12, 1, 0.5, 1, 0.1, 0.05, 0, 2], { outlines: [heart] }) });
add('edges of an open cylinder', 'edges', [1], { of: of('cylinder', [1, 0.5, 1, 6, 1, 1, 0, TAU]) });

add('wireframe of a cut box', 'wireframe', [], { of: of('box', [1, 1, 1, 2, 2, 2]) });
add('wireframe of a plane', 'wireframe', [], { of: of('plane', [1, 1, 3, 2]) });
add('wireframe of a sphere', 'wireframe', [], { of: of('sphere', [1, 6, 4, 0, TAU, 0, Math.PI]) });
add('wireframe of an icosahedron', 'wireframe', [], { of: of('icosahedron', [1, 1]) });
add('wireframe of a list of shapes', 'wireframe', [], { of: of('shape', [12], { outlines: [triangle, framed], list: 1 }) });
add('wireframe of an extruded square', 'wireframe', [], { of: of('extrude', [12, 1, 1, 0, 0.2, 0.1, 0, 3], { outlines: [square] }) });
add('wireframe of a cylinder', 'wireframe', [], { of: of('cylinder', [1, 1, 1, 5, 2, 0, 0, TAU]) });

const out = { three: version, cases: cases.map(answered) };
const where = join(dirname(new URL(import.meta.url).pathname), 'reference.json');
writeFileSync(where, JSON.stringify(out));
let numbers = 0;
for (const c of out.cases) numbers += c.count * 3 + (c.normals ? c.count * 3 : 0) + (c.uvs ? c.count * 2 : 0) + c.indices.length + c.groups.length;
console.log(`${out.cases.length} cases, ${numbers} numbers, written to ${where}`);
