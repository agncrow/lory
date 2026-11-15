// The suite's scenes as three.js 0.187.0 draws them: each one the scene
// examples/threejs states in Lory's words (manual.co, webgl.co), with the
// same shapes, camera, lights, materials and clock, so pictures.py can
// keep three's picture of it and picture.py can hold Lory's to it.
// Each scene is a function of THREE and the time in milliseconds that
// answers { scene, camera, shadows?, clipping?, views? } for a canvas of
// the proportions and size given (views: each a box, a camera and what to
// set before it is rendered); `kind` says how its picture is compared (picture.py).

// a colour of a hue, a saturation and a lightness, as seen (sRGB), as
// examples/threejs/kit.co's `hsl`
function hsl(THREE, h, s, l) {
  return new THREE.Color().setHSL(h, s, l, THREE.SRGBColorSpace);
}

// numbers from 0 to 1 drawn from a seed, as kit.co's `randoms`
function randoms(seed, n) {
  const out = [];
  let state = seed >>> 0;
  for (let i = 0; i < n; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    out.push(state / 4294967296);
  }
  return out;
}

// a picture of pixels (four bytes each), as kit.co's `checker`/`swatches`
function picture(THREE, bytes, w, h, tiled) {
  const t = new THREE.DataTexture(new Uint8Array(bytes), w, h);
  t.colorSpace = THREE.SRGBColorSpace;
  if (tiled) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}
const bytesOf = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255, 255];
function checker(n, a, b) {
  const out = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) out.push(...bytesOf((x + y) % 2 === 1 ? b : a));
  return out;
}

// a thing placed as kit.co's `placed`: a position, turns about x, y, z
function place(o, position, angles, scale) {
  o.position.set(position[0], position[1], position[2]);
  o.rotation.set(angles[0], angles[1], angles[2]);
  if (scale) o.scale.set(scale[0], scale[1], scale[2]);
  return o;
}

function camera(THREE, aspect, fov, near, far, from, to, up) {
  const c = new THREE.PerspectiveCamera(fov, aspect, near, far);
  c.position.set(from[0], from[1], from[2]);
  if (up) c.up.set(up[0], up[1], up[2]);
  c.lookAt(to[0], to[1], to[2]);
  return c;
}

const SCENES = {};

// ---- the manual ----

SCENES.primitives = { kind: 'lit', draw(THREE, t, aspect) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xaaaaaa);
  const cam = camera(THREE, aspect, 40, 0.1, 1000, [0, 0, 120], [0, 0, 0]);
  for (const p of [[-1, 2, 4], [1, -2, -4]]) {
    const l = new THREE.DirectionalLight(0xffffff, 3);
    l.position.set(p[0], p[1], p[2]);
    scene.add(l);
  }
  const lathe = [];
  for (let i = 0; i < 10; i++) lathe.push(new THREE.Vector2(Math.sin(i * 0.2) * 3 + 3, (i - 5) * 0.8));
  const shapes = [
    new THREE.BoxGeometry(8, 8, 8), new THREE.CircleGeometry(7, 24), new THREE.ConeGeometry(6, 8, 16),
    new THREE.CylinderGeometry(4, 4, 8, 12), new THREE.DodecahedronGeometry(7), new THREE.IcosahedronGeometry(7),
    new THREE.OctahedronGeometry(7), new THREE.PlaneGeometry(9, 9, 2, 2), new THREE.RingGeometry(2, 7, 18),
    new THREE.SphereGeometry(7, 12, 8), new THREE.TetrahedronGeometry(7), new THREE.TorusGeometry(5, 2, 8, 24),
    new THREE.TorusKnotGeometry(3.5, 1.5, 64, 8, 2, 3), new THREE.CapsuleGeometry(3, 5, 4, 8), new THREE.LatheGeometry(lathe)];
  const seconds = t / 1000;
  shapes.forEach((g, i) => {
    const m = new THREE.MeshPhongMaterial({ color: hsl(THREE, i / shapes.length, 1, 0.5), side: THREE.DoubleSide });
    const speed = 0.1 + 0.05 * i;
    scene.add(place(new THREE.Mesh(g, m), [(i % 5 - 2) * 22, (1 - Math.floor(i / 5)) * 22, 0], [seconds * speed, seconds * speed, 0]));
  });
  return { scene, camera: cam };
} };

SCENES.textures = { kind: 'exact', draw(THREE, t, aspect) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x223344);
  const cam = camera(THREE, aspect, 50, 0.1, 100, [0, 0, 7], [0, 0, 0]);
  const k = [0xe8590c, 0xfab005, 0x40c057, 0x228be6];
  const maps = [picture(THREE, checker(8, 0xf1f3f5, 0x495057), 8, 8), picture(THREE, k.flatMap(bytesOf), 4, 1),
    picture(THREE, [k[3], k[2], k[1], k[0]].flatMap(bytesOf), 2, 2)];
  const box = new THREE.BoxGeometry(1.6, 1.6, 1.6);
  const seconds = t / 1000;
  maps.forEach((map, i) => scene.add(place(new THREE.Mesh(box, new THREE.MeshBasicMaterial({ map })), [(i - 1) * 2.5, 0, 0], [0.5 + seconds * 0.3, 0.7 + seconds * 0.2, 0])));
  return { scene, camera: cam };
} };

function lightRoom(THREE, aspect, lamp) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const cam = camera(THREE, aspect, 45, 0.1, 100, [0, 10, 20], [0, 5, 0]);
  const map = picture(THREE, checker(2, 0xb0b0b0, 0x606060), 2, 2, true);
  map.repeat.set(20, 20);
  scene.add(place(new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshPhongMaterial({ map, side: THREE.DoubleSide })), [0, 0, 0], [-Math.PI / 2, 0, 0]));
  scene.add(place(new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), new THREE.MeshPhongMaterial({ color: 0x88aacc })), [5, 2.5, 0], [0, 0, 0]));
  scene.add(place(new THREE.Mesh(new THREE.SphereGeometry(3, 32, 16), new THREE.MeshPhongMaterial({ color: 0xccaa88 })), [-4, 5, 0], [0, 0, 0]));
  scene.add(lamp);
  if (lamp.target) {
    scene.add(lamp.target);
  }
  return { scene, camera: cam };
}

SCENES.lights_ambient = { kind: 'lit', draw: (THREE, t, aspect) => lightRoom(THREE, aspect, new THREE.AmbientLight(0xffffff, 1)) };
SCENES.lights_hemisphere = { kind: 'lit', draw: (THREE, t, aspect) => lightRoom(THREE, aspect, new THREE.HemisphereLight(0xb1e1ff, 0xb97a20, 1)) };
SCENES.lights_directional = { kind: 'lit', draw(THREE, t, aspect) {
  const l = new THREE.DirectionalLight(0xffffff, 1);
  l.position.set(0, 10, 0);
  l.target.position.set(-5, 0, 0);
  return lightRoom(THREE, aspect, l);
} };
SCENES.lights_point = { kind: 'lit', draw(THREE, t, aspect) {
  const l = new THREE.PointLight(0xffffff, 150);
  l.position.set(0, 10, 0);
  return lightRoom(THREE, aspect, l);
} };
SCENES.lights_spot = { kind: 'lit', draw(THREE, t, aspect) {
  const l = new THREE.SpotLight(0xffffff, 150);
  l.position.set(0, 10, 0);
  l.target.position.set(-5, 0, 0);
  l.angle = Math.PI / 6;
  return lightRoom(THREE, aspect, l);
} };


// ---- the manual, continued ----

SCENES.scenegraph = { kind: 'lit', draw(THREE, t, aspect) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const cam = camera(THREE, aspect, 40, 0.1, 1000, [0, 50, 0], [0, 0, 0], [0, 0, 1]);
  scene.add(new THREE.PointLight(0xffffff, 500));
  const ball = new THREE.SphereGeometry(1, 6, 6);
  const s = t / 1000;
  const turning = (o) => { o.rotation.y = s; return o; };
  const system = turning(new THREE.Object3D());
  scene.add(system);
  const sun = turning(new THREE.Mesh(ball, new THREE.MeshPhongMaterial({ emissive: 0xffff00 })));
  sun.scale.set(5, 5, 5);
  system.add(sun);
  const earthOrbit = turning(new THREE.Object3D());
  earthOrbit.position.x = 10;
  system.add(earthOrbit);
  earthOrbit.add(turning(new THREE.Mesh(ball, new THREE.MeshPhongMaterial({ color: 0x2233ff, emissive: 0x112244 }))));
  const moonOrbit = turning(new THREE.Object3D());
  moonOrbit.position.x = 2;
  earthOrbit.add(moonOrbit);
  const moon = turning(new THREE.Mesh(ball, new THREE.MeshPhongMaterial({ color: 0x888888, emissive: 0x222222 })));
  moon.scale.set(0.5, 0.5, 0.5);
  moonOrbit.add(moon);
  return { scene, camera: cam };
} };

function fogged(THREE, t, aspect, fog) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xadd8e6);
  scene.fog = fog;
  const cam = camera(THREE, aspect, 60, 0.1, 100, [0, 1.5, 5], [0, 0, -10]);
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(-1, 2, 4);
  scene.add(sun);
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const s = t / 1000;
  for (let i = 0; i < 8; i++) {
    scene.add(place(new THREE.Mesh(cube, new THREE.MeshLambertMaterial({ color: hsl(THREE, i / 8, 0.8, 0.5) })), [i % 2 ? 1.2 : -1.2, 0, -3 * i], [s * 0.5, s * 0.7 + i, 0]));
  }
  return { scene, camera: cam };
}
SCENES.fog_linear = { kind: 'lit', draw: (THREE, t, aspect) => fogged(THREE, t, aspect, new THREE.Fog(0xadd8e6, 1, 20)) };
SCENES.fog_exp2 = { kind: 'lit', draw: (THREE, t, aspect) => fogged(THREE, t, aspect, new THREE.FogExp2(0xadd8e6, 0.12)) };

SCENES.custom_geometry = { kind: 'exact', draw(THREE, t, aspect) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const cam = camera(THREE, aspect, 75, 0.1, 100, [0, 0, 5], [0, 0, 0]);
  const at = [-1, -1, 1, 1, -1, 1, -1, 1, 1, 1, 1, 1, -1, -1, -1, 1, -1, -1, -1, 1, -1, 1, 1, -1];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(at, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(at.map((x) => (x + 1) / 2), 3));
  g.setIndex([0, 1, 2, 2, 1, 3, 1, 5, 3, 3, 5, 7, 5, 4, 7, 7, 4, 6, 4, 0, 6, 6, 0, 2, 2, 3, 6, 6, 3, 7, 4, 5, 0, 0, 5, 1]);
  const m = new THREE.MeshBasicMaterial({ vertexColors: true });
  const s = t / 1000;
  for (let i = 0; i < 3; i++) {
    scene.add(place(new THREE.Mesh(g, m), [(i - 1) * 3, 0, 0], [s * (0.4 + 0.1 * i), s * (0.6 + 0.1 * i), 0], [0.8, 0.8, 0.8]));
  }
  return { scene, camera: cam };
} };

SCENES.transparency = { kind: 'lit', draw(THREE, t, aspect) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  const cam = camera(THREE, aspect, 75, 0.1, 25, [0, 0, 4], [0, 0, 0]);
  const sun = new THREE.DirectionalLight(0xffffff, 3);
  sun.position.set(-1, 2, 4);
  scene.add(sun);
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const s = t / 1000;
  for (let i = 0; i < 8; i++) {
    const m = new THREE.MeshLambertMaterial({ color: hsl(THREE, i / 8, 1, 0.5), opacity: 0.5, transparent: true });
    scene.add(place(new THREE.Mesh(cube, m), [-0.75 + 1.5 * (i % 2), -0.75 + 1.5 * (Math.floor(i / 2) % 2), -0.75 + 1.5 * Math.floor(i / 4)], [s * 0.2 + 0.1 * i, s * 0.3 + 0.2 * i, 0]));
  }
  return { scene, camera: cam };
} };

// ---- the examples ----

function things(THREE, scene, t) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(1, 2, 3);
  scene.add(sun);
  const s = t / 1000;
  const turned = [s * 0.3, s * 0.5, 0];
  const look = (color) => new THREE.MeshPhongMaterial({ color, specular: 0x222222, shininess: 60 });
  scene.add(place(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), look(0x4488cc)), [-3, 0, 0], turned));
  scene.add(place(new THREE.Mesh(new THREE.SphereGeometry(1.2, 32, 16), look(0xcc8844)), [0, 0, 0], turned));
  scene.add(place(new THREE.Mesh(new THREE.TorusKnotGeometry(0.8, 0.3, 100, 16), look(0x88cc44)), [3, 0, 0], turned));
}

SCENES.views = { kind: 'lit', draw(THREE, t, aspect, W, H) {
  const scene = new THREE.Scene();
  things(THREE, scene, t);
  const half = Math.floor(W / 2);
  const left = camera(THREE, half / H, 45, 0.1, 100, [0, 4, 16], [0, 0, 0]);
  const a = (W - half) / H, h = 4.5;
  const right = new THREE.OrthographicCamera(-h * a, h * a, h, -h, 0.1, 100);
  right.position.set(0, 4, 16);
  right.lookAt(0, 0, 0);
  return { scene, camera: left, views: [
    { box: [0, 0, half, H], camera: left, before: () => { scene.background = new THREE.Color(0x202830); } },
    { box: [half, 0, W - half, H], camera: right, before: () => { scene.background = new THREE.Color(0x302820); } }] };
} };

SCENES.helpers = { kind: 'exact', draw(THREE, t, aspect) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a);
  const cam = camera(THREE, aspect, 45, 0.1, 100, [6, 5, 8], [0, 0.5, 0]);
  scene.add(new THREE.GridHelper(10, 10));
  scene.add(new THREE.AxesHelper(3));
  scene.add(place(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshBasicMaterial({ color: 0x3366cc })), [0, 1, 0], [0, 0, 0]));
  scene.add(new THREE.Box3Helper(new THREE.Box3(new THREE.Vector3(-1, 0, -1), new THREE.Vector3(1, 2, 1)), 0xffff00));
  const s = t / 1000;
  scene.add(new THREE.ArrowHelper(new THREE.Vector3(Math.sin(s) * 0.6, 0.8, Math.cos(s) * 0.6), new THREE.Vector3(2, 0, 2), 2, 0xff00ff, 0.4, 0.08));
  return { scene, camera: cam };
} };

SCENES.lines = { kind: 'exact', draw(THREE, t, aspect) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const cam = camera(THREE, aspect, 50, 0.1, 100, [0, 2, 9], [0, 0, 0]);
  const at = [], colors = [];
  for (let i = 0; i < 300; i++) {
    const a = 0.1 * i, r = 0.5 + 0.01 * i;
    at.push(r * Math.cos(a), 0.01 * (i - 150), r * Math.sin(a));
    const k = hsl(THREE, i / 300, 1, 0.5);
    colors.push(k.r, k.g, k.b);
  }
  const spiral = new THREE.BufferGeometry();
  spiral.setAttribute('position', new THREE.Float32BufferAttribute(at, 3));
  spiral.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const s = t / 1000;
  scene.add(place(new THREE.Line(spiral, new THREE.LineBasicMaterial({ vertexColors: true })), [0, 0.5, 0], [0, s * 0.5, 0]));
  const wave = [];
  for (let i = 0; i < 100; i++) {
    const x = -4 + 0.08 * i;
    wave.push(x, -2.5 + 0.5 * Math.sin(x * 2), 0);
  }
  const w = new THREE.BufferGeometry();
  w.setAttribute('position', new THREE.Float32BufferAttribute(wave, 3));
  const dashed = new THREE.Line(w, new THREE.LineDashedMaterial({ color: 0xffaa00, dashSize: 0.3, gapSize: 0.15, scale: 1 }));
  dashed.computeLineDistances();
  scene.add(dashed);
  return { scene, camera: cam };
} };

SCENES.points = { kind: 'exact', draw(THREE, t, aspect) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const cam = camera(THREE, aspect, 60, 0.1, 100, [0, 0, 15], [0, 0, 0]);
  const r = randoms(7, 9000);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(r.map((x) => x * 10 - 5), 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(r, 3));
  const s = t / 1000;
  scene.add(place(new THREE.Points(g, new THREE.PointsMaterial({ size: 0.1, vertexColors: true })), [0, 0, 0], [s * 0.1, s * 0.2, 0]));
  return { scene, camera: cam };
} };

function disc(n) {
  const out = [];
  const byte = (x) => Math.floor(Math.max(0, Math.min(1, x)) * 255 + 0.5);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (x + 0.5) / n * 2 - 1, dy = (y + 0.5) / n * 2 - 1;
    out.push(255, 255, 255, byte(Math.max(0, Math.min(1, (1 - Math.sqrt(dx * dx + dy * dy)) * 4))));
  }
  return out;
}

SCENES.sprites = { kind: 'exact', draw(THREE, t, aspect) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const cam = camera(THREE, aspect, 60, 0.1, 100, [0, 0, 9], [0, 0, 0]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(randoms(11, 1200).map((x) => x * 8 - 4), 3));
  const m = new THREE.PointsMaterial({ size: 0.5, map: picture(THREE, disc(16), 16, 16), alphaTest: 0.5, color: hsl(THREE, 0.6, 0.8, 0.6) });
  const s = t / 1000;
  scene.add(place(new THREE.Points(g, m), [0, 0, 0], [0, s * 0.2, 0]));
  return { scene, camera: cam };
} };

SCENES.instancing = { kind: 'lit', draw(THREE, t, aspect) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x222222);
  const cam = camera(THREE, aspect, 60, 0.1, 100, [6, 4, 8], [0, 0, 0]);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(3, 5, 2);
  scene.add(sun);
  const r = randoms(5, 500);
  const copies = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshLambertMaterial(), 125);
  const one = new THREE.Object3D();
  for (let i = 0; i < 125; i++) {
    place(one, [(i % 5) - 2, (Math.floor(i / 5) % 5) - 2, Math.floor(i / 25) - 2], [r[i * 4] * 3, r[i * 4 + 1] * 3, r[i * 4 + 2] * 3]);
    one.updateMatrix();
    copies.setMatrixAt(i, one.matrix);
    copies.setColorAt(i, hsl(THREE, r[i * 4 + 3], 0.7, 0.5));
  }
  const s = t / 1000;
  scene.add(place(copies, [0, 0, 0], [0, s * 0.2, 0]));
  return { scene, camera: cam };
} };

SCENES.clipping = { kind: 'lit', draw(THREE, t, aspect) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x303030);
  const cam = camera(THREE, aspect, 45, 0.1, 100, [0, 1, 6], [0, 0, 0]);
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(1, 2, 3);
  scene.add(sun);
  const planes = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.5), new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.3)];
  const m = new THREE.MeshPhongMaterial({ color: hsl(THREE, 0.1, 0.8, 0.5), specular: 0x222222, shininess: 60, side: THREE.DoubleSide, clippingPlanes: planes });
  const s = t / 1000;
  scene.add(place(new THREE.Mesh(new THREE.TorusKnotGeometry(1, 0.3, 128, 16), m), [0, 0, 0], [s * 0.3, s * 0.4, 0]));
  return { scene, camera: cam, clipping: true };
} };

SCENES.lod = { kind: 'lit', draw(THREE, t, aspect) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x202020);
  const cam = camera(THREE, aspect, 50, 0.1, 100, [0, 1, 6], [0, 0, -6]);
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(1, 2, 3);
  scene.add(sun);
  const m = new THREE.MeshLambertMaterial({ color: 0x66aaff, flatShading: true });
  const shapes = [new THREE.IcosahedronGeometry(1, 3), new THREE.IcosahedronGeometry(1, 1), new THREE.IcosahedronGeometry(1, 0)];
  const s = t / 1000;
  for (let i = 0; i < 4; i++) {
    const lod = new THREE.LOD();
    shapes.forEach((g, k) => lod.addLevel(new THREE.Mesh(g, m), [0, 8, 16][k]));
    scene.add(place(lod, [i * 1.5 - 2.25, 0, -6 * i], [0, s * 0.3, 0]));
  }
  return { scene, camera: cam };
} };

SCENES.materials = { kind: 'physical', draw(THREE, t, aspect) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x303030);
  const cam = camera(THREE, aspect, 45, 0.1, 100, [0, 0, 8], [0, 0, 0]);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(2, 3, 4);
  scene.add(sun);
  const color = 0xff8844;
  const looks = [new THREE.MeshBasicMaterial({ color }), new THREE.MeshLambertMaterial({ color }),
    new THREE.MeshPhongMaterial({ color, specular: 0x444444, shininess: 100 }),
    new THREE.MeshStandardMaterial({ color, metalness: 0, roughness: 0.5 }),
    new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: 0.3 }), new THREE.MeshNormalMaterial()];
  const ball = new THREE.SphereGeometry(0.8, 32, 16);
  const s = t / 1000;
  looks.forEach((m, i) => scene.add(place(new THREE.Mesh(ball, m), [((i % 3) - 1) * 2.2, 1.1 - 2.2 * Math.floor(i / 3), 0], [0, s * 0.3, 0])));
  return { scene, camera: cam };
} };

SCENES.shadows = { kind: 'shadows', draw(THREE, t, aspect) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa0c8e0);
  const cam = camera(THREE, aspect, 45, 0.1, 100, [0, 8, 12], [0, 0, 0]);
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.position.set(5, 10, 5);
  sun.castShadow = true;
  const sc = sun.shadow.camera;
  sc.left = -8; sc.right = 8; sc.top = 8; sc.bottom = -8; sc.near = 0.5; sc.far = 30;
  sc.updateProjectionMatrix();
  sun.shadow.bias = -0.001;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);
  const s = t / 1000;
  const lit = (o) => { o.castShadow = true; o.receiveShadow = true; scene.add(o); };
  const matte = (color) => new THREE.MeshLambertMaterial({ color });
  lit(place(new THREE.Mesh(new THREE.PlaneGeometry(20, 20), matte(0x888888)), [0, 0, 0], [-Math.PI / 2, 0, 0]));
  lit(place(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), matte(0x4488cc)), [-2, 1, 0], [0, s * 0.4, 0]));
  lit(place(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), matte(0xcc8844)), [2, 1, 0], [0, 0, 0]));
  lit(place(new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.3, 16, 48), matte(0x88cc44)), [0, 1.5, 2], [s * 0.5, s * 0.3, 0]));
  return { scene, camera: cam, shadows: true };
} };

// a pointer at a point of the canvas (pixels) as three's normalized
// device coordinates
const ndc = (THREE, p, W, H) => new THREE.Vector2(p[0] / W * 2 - 1, 1 - p[1] / H * 2);

SCENES.picking = { kind: 'lit', pointer: [262, 148], draw(THREE, t, aspect, W, H) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);
  const cam = camera(THREE, aspect, 70, 0.1, 100, [0, 0, 10], [0, 0, 0]);
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(1, 1, 1);
  scene.add(sun);
  const r = randoms(3, 280), tint = randoms(4, 40);
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const cubes = [];
  for (let i = 0; i < 40; i++) {
    const k = i * 7, size = r[k + 6] * 0.8 + 0.6;
    const m = place(new THREE.Mesh(cube, new THREE.MeshLambertMaterial({ color: hsl(THREE, tint[i], 0.6, 0.5) })),
      [r[k] * 16 - 8, r[k + 1] * 12 - 6, r[k + 2] * 8 - 6], [r[k + 3] * 2 * Math.PI, r[k + 4] * 2 * Math.PI, r[k + 5] * 2 * Math.PI], [size, size, size]);
    scene.add(m);
    cubes.push(m);
  }
  scene.updateMatrixWorld();
  const caster = new THREE.Raycaster();
  caster.setFromCamera(ndc(THREE, SCENES.picking.pointer, W, H), cam);
  const met = caster.intersectObjects(cubes, false);
  if (met.length) met[0].object.material.emissive.set(0xff0000);
  return { scene, camera: cam, picked: met.length ? cubes.indexOf(met[0].object) : -1 };
} };

SCENES.picking_points = { kind: 'exact', pointer: null, draw(THREE, t, aspect, W, H) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const cam = camera(THREE, aspect, 60, 0.1, 100, [0, 0, 8], [0, 0, 0]);
  const spots = randoms(9, 1500).map((x) => x * 8 - 4);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(spots, 3));
  const cloud = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x3399ff, size: 0.08 }));
  scene.add(cloud);
  scene.updateMatrixWorld();
  // the pointer where the hundredth point is seen, to the nearest pixel
  const seen = new THREE.Vector3(spots[300], spots[301], spots[302]).project(cam);
  SCENES.picking_points.pointer = [Math.round((seen.x + 1) / 2 * W), Math.round((1 - seen.y) / 2 * H)];
  const caster = new THREE.Raycaster();
  caster.params.Points.threshold = 0.1;
  caster.setFromCamera(ndc(THREE, SCENES.picking_points.pointer, W, H), cam);
  const met = caster.intersectObject(cloud, false);
  if (met.length) {
    const k = met[0].index;
    scene.add(place(new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })), [spots[k * 3], spots[k * 3 + 1], spots[k * 3 + 2]], [0, 0, 0]));
  }
  return { scene, camera: cam, picked: met.length ? met[0].index : -1 };
} };

if (typeof window !== 'undefined') window.SCENES = SCENES;
export { SCENES };
