// What Lory's model files (packages/lory/models.co) are held to: three.js
// r187 (npm `three@0.187.0`, MIT), its loaders and exporters run in node on
// the files in tests/models/files/ (written for these tests) and on fixed
// geometries. For each file read it writes what three answers — each
// object's name and kind, its positions, normals, colours and uvs (their
// float32 bits, as base64), its indices and groups, and its materials'
// numbers (their float64 bits) — and for each geometry written, the text or
// the bytes (as base64) three's exporter writes, to reference.json beside
// this script; tests/models/reference.co reads the same files and writes
// the same models in Lory and holds it to them.
//
//     npm install --prefix <scratch>/ref three@0.187.0
//     node tests/models/reference.mjs <scratch>/ref/node_modules/three
//
// Run from the repository's root. Only three's own classes are run here,
// with two stand-ins node lacks: a loader for pictures that makes a texture
// named by its file and loads nothing (MTL maps), and a FileReader for the
// glTF exporter's data URI.
import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

const root = process.argv[2];
if (!root) {
    console.error('usage: node tests/models/reference.mjs <path to node_modules/three>');
    process.exit(1);
}
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
if (version !== '0.187.0') {
    console.error(`three ${version} found; the reference is three 0.187.0`);
    process.exit(1);
}
const at = (path) => pathToFileURL(join(root, path)).href;
const T = await import(at('build/three.module.js'));
const { OBJLoader } = await import(at('examples/jsm/loaders/OBJLoader.js'));
const { MTLLoader } = await import(at('examples/jsm/loaders/MTLLoader.js'));
const { STLLoader } = await import(at('examples/jsm/loaders/STLLoader.js'));
const { PLYLoader } = await import(at('examples/jsm/loaders/PLYLoader.js'));
const { XYZLoader } = await import(at('examples/jsm/loaders/XYZLoader.js'));
const { PCDLoader } = await import(at('examples/jsm/loaders/PCDLoader.js'));
const { VTKLoader } = await import(at('examples/jsm/loaders/VTKLoader.js'));
const { OBJExporter } = await import(at('examples/jsm/exporters/OBJExporter.js'));
const { STLExporter } = await import(at('examples/jsm/exporters/STLExporter.js'));
const { PLYExporter } = await import(at('examples/jsm/exporters/PLYExporter.js'));
const { GLTFExporter } = await import(at('examples/jsm/exporters/GLTFExporter.js'));

const here = dirname(new URL(import.meta.url).pathname);
const files = join(here, 'files');

// a file's bytes, as a loader asked for an ArrayBuffer gets them
function bytesOf(name) {
    const b = readFileSync(join(files, name));
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

// a file's text, as a loader asked for text gets it (UTF-8, its
// byte-order mark dropped)
const textOf = (name) => new TextDecoder().decode(readFileSync(join(files, name)));

// numbers as the bits of their float32s, or their float64s, as base64
const b64 = (a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString('base64');
const f32 = (xs) => b64(xs instanceof Float32Array ? xs : new Float32Array(xs));
const f64 = (xs) => b64(new Float64Array(xs));

// a stand-in for the picture loader: a texture named by its file
const manager = new T.LoadingManager();
manager.addHandler(/./, {
    load(url) {
        const texture = new T.Texture();
        texture.name = url;
        return texture;
    },
    setCrossOrigin() {},
});

// ---- what three read ----

const kindOf = (o) => (o.isMesh ? 'mesh' : o.isLineSegments ? 'lines' : o.isPoints ? 'points' : o.type);

// a colour's numbers, or none
const rgb = (c) => (c ? [c.r, c.g, c.b] : []);

// a material's name and numbers (their float64 bits): its colour, and a
// Phong material's highlight, glow and shininess, its opacity
function material(m) {
    const phong = m.isMeshPhongMaterial === true;
    return {
        name: m.name,
        type: m.type,
        color: f64(rgb(m.color)),
        specular: phong ? f64(rgb(m.specular)) : '',
        emissive: phong ? f64(rgb(m.emissive)) : '',
        shininess: phong ? f64([m.shininess]) : '',
        opacity: f64([m.opacity]),
        transparent: m.transparent,
        flat: m.flatShading === true,
        texture: m.map ? m.map.name : '',
    };
}

// an attribute's numbers: how many, the bits of their float32s, and where
// three keeps them in another array (PLY's doubles and whole numbers), what
// three's own accessor reads from it (a normalized array's numbers over
// its type's largest) as float64 bits
function attribute(g, name) {
    const a = g.getAttribute(name);
    if (!a) return { count: 0, bits: '', values: '', type: '', normalized: false };
    const float = a.array instanceof Float32Array;
    const read = [];
    if (!float) {
        for (let i = 0; i < a.array.length; i++) read.push(a.getComponent(Math.floor(i / a.itemSize), i % a.itemSize));
    }
    return {
        count: a.array.length,
        bits: f32(float ? a.array : Float32Array.from(a.array)),
        values: float ? '' : f64(read),
        type: a.array.constructor.name,
        normalized: a.normalized,
    };
}

function part(o) {
    const g = o.geometry;
    const materials = Array.isArray(o.material) ? o.material : [o.material];
    return {
        name: o.name,
        form: kindOf(o),
        positions: attribute(g, 'position'),
        normals: attribute(g, 'normal'),
        colors: attribute(g, 'color'),
        uvs: attribute(g, 'uv'),
        indices: g.index ? Array.from(g.index.array) : [],
        groups: g.groups.flatMap((r) => [r.start, r.count, r.materialIndex ?? 0]),
        materials: materials.map(material),
    };
}

const reads = [];

function objRead(file, mtl) {
    const loader = new OBJLoader();
    if (mtl) {
        const creator = new MTLLoader(manager).parse(textOf(mtl), '');
        creator.preload();
        loader.setMaterials(creator);
    }
    const group = loader.parse(textOf(file));
    reads.push({
        name: mtl ? `${file} with ${mtl}` : file,
        reader: 'obj',
        file,
        mtl: mtl ?? '',
        libraries: group.materialLibraries,
        parts: group.children.map(part),
    });
}

objRead('house.obj', 'house.mtl');
objRead('house.obj');
objRead('quirks.obj');
objRead('quirks.obj', 'house.mtl');
objRead('cloud.obj');

// an MTL file's materials as three creates them, in the order it names them
function mtlRead(file) {
    const creator = new MTLLoader(manager).parse(textOf(file), '');
    reads.push({
        name: file,
        reader: 'mtl',
        file,
        materials: Object.keys(creator.materialsInfo).map((n) => material(creator.create(n))),
    });
}

mtlRead('house.mtl');

// a geometry one of three's loaders answered for a file (STL, PLY, XYZ and
// VTK answer no object, so no form or materials; PCD answers points), or
// what it threw
function geometryRead(file, reader, read) {
    let o;
    try {
        o = read();
    } catch (e) {
        reads.push({ name: file, reader, file, error: String((e && e.message) || e) });
        return;
    }
    const g = o.isBufferGeometry ? o : o.geometry;
    reads.push({
        name: file,
        reader,
        file,
        group_names: g.userData.groupNames ?? [],
        parts: [{
            name: '',
            form: o.isBufferGeometry ? '' : kindOf(o),
            positions: attribute(g, 'position'),
            normals: attribute(g, 'normal'),
            colors: attribute(g, 'color'),
            uvs: attribute(g, 'uv'),
            indices: g.index ? Array.from(g.index.array) : [],
            groups: g.groups.flatMap((r) => [r.start, r.count, r.materialIndex ?? 0]),
            materials: [],
        }],
    });
}

for (const file of ['prism.stl', 'wedge.stl', 'solid_binary.stl', 'painted.stl', 'short.stl']) {
    geometryRead(file, 'stl', () => new STLLoader().parse(bytesOf(file)));
}
for (const file of ['cube.ply', 'faces.ply', 'points.ply', 'cube_le.ply', 'cube_be.ply', 'bytes.ply', 'short.ply', 'misordered.ply']) {
    geometryRead(file, 'ply', () => new PLYLoader().parse(bytesOf(file)));
}
geometryRead('cloud.xyz', 'xyz', () => new XYZLoader().parse(textOf('cloud.xyz')));
for (const file of ['cloud_ascii.pcd', 'cloud_unsigned.pcd', 'cloud_binary.pcd', 'cloud_compressed.pcd', 'short.pcd']) {
    geometryRead(file, 'pcd', () => new PCDLoader().parse(bytesOf(file)));
}
for (const file of ['mesh.vtk', 'strips.vtk', 'quirks.vtk']) {
    geometryRead(file, 'vtk', () => new VTKLoader().parse(bytesOf(file), ''));
}

// ---- what three wrote ----

// the objects of a model Lory reads from a case's file, as three holds
// them: an OBJ's own objects; a geometry three's loader answered, a mesh
// (Phong materials, one a group, an STL's named by its solids) or points
// as Lory takes it; PCD's points as they are; a built geometry, a mesh
function objectsOf(c) {
    if (c.reader === 'obj') {
        const loader = new OBJLoader();
        if (c.mtl) {
            const creator = new MTLLoader(manager).parse(textOf(c.mtl), '');
            creator.preload();
            loader.setMaterials(creator);
        }
        return [...loader.parse(textOf(c.file)).children];
    }
    if (c.reader === 'pcd') return [new PCDLoader().parse(bytesOf(c.file))];
    let g;
    if (c.reader === 'stl') g = new STLLoader().parse(bytesOf(c.file));
    else if (c.reader === 'ply') g = new PLYLoader().parse(bytesOf(c.file));
    else if (c.reader === 'xyz') g = new XYZLoader().parse(textOf(c.file));
    else if (c.reader === 'vtk') g = new VTKLoader().parse(bytesOf(c.file), '');
    else if (c.reader === 'box') g = new T.BoxGeometry(...c.sizes);
    else if (c.reader === 'sphere') g = new T.SphereGeometry(...c.sizes);
    if (c.form === 'points') return [new T.Points(g, new T.PointsMaterial())];
    const names = g.userData.groupNames ?? [];
    const material = names.length > 1 ? names.map((n) => new T.MeshPhongMaterial({ name: n })) : new T.MeshPhongMaterial({ name: names[0] ?? '' });
    return [new T.Mesh(g, material)];
}

// an exporter's bytes as base64
const bytes64 = (b) => (b instanceof ArrayBuffer ? Buffer.from(b) : Buffer.from(b.buffer, b.byteOffset, b.byteLength)).toString('base64');

// what an exporter wrote, or what it threw (as `threw: …`)
function tried(write) {
    try {
        return write();
    } catch (e) {
        return `threw: ${(e && e.message) || e}`;
    }
}

// node has no FileReader, which the glTF exporter reads its buffer with:
// a stand-in that answers a blob's bytes as a browser's does
globalThis.FileReader ??= class {
    readAsDataURL(blob) {
        blob.arrayBuffer().then((b) => {
            this.result = `data:${blob.type};base64,${Buffer.from(b).toString('base64')}`;
            this.onloadend?.();
        });
    }
    readAsArrayBuffer(blob) {
        blob.arrayBuffer().then((b) => {
            this.result = b;
            this.onloadend?.();
        });
    }
};

// the glTF three's exporter writes of the objects (a scene of them), as
// JSON.stringify writes its answer; an STL's solids' names, which three
// keeps as its geometry's data, Lory keeps as its materials' names, so
// they are left out
async function gltfText(group) {
    const scene = new T.Scene();
    for (const o of [...group.children]) {
        delete o.geometry.userData.groupNames;
        scene.add(o);
    }
    return JSON.stringify(await new GLTFExporter().parseAsync(scene));
}

// a binary PLY three's exporter writes, as base64 ('' where it refuses:
// a mesh whose corners are not whole triangles)
function plyBytes(group, littleEndian) {
    const written = new PLYExporter().parse(group, undefined, { binary: true, littleEndian });
    return written === null ? '' : bytes64(written);
}

const writes = [];
for (const c of [
    { file: 'house.obj', reader: 'obj', mtl: 'house.mtl', gltf: false },
    { file: 'house.obj', reader: 'obj' },
    { file: 'quirks.obj', reader: 'obj' },
    { file: 'cloud.obj', reader: 'obj' },
    { file: 'prism.stl', reader: 'stl' },
    { file: 'painted.stl', reader: 'stl' },
    { file: 'points.ply', reader: 'ply', form: 'points', gltf: false },
    { file: 'cloud.xyz', reader: 'xyz', form: 'points' },
    { file: 'cloud_compressed.pcd', reader: 'pcd' },
    { file: 'mesh.vtk', reader: 'vtk' },
    { file: 'strips.vtk', reader: 'vtk' },
    { file: '', reader: 'box', sizes: [1, 2, 3, 2, 1, 1] },
    { file: '', reader: 'sphere', sizes: [1, 8, 6] },
]) {
    const group = new T.Group();
    for (const o of objectsOf(c)) group.add(o);
    writes.push({
        name: c.file ? (c.mtl ? `${c.file} with ${c.mtl}` : c.file) : `${c.reader} ${c.sizes.join(' ')}`,
        reader: c.reader,
        file: c.file,
        mtl: c.mtl ?? '',
        sizes: c.sizes ?? [],
        obj: tried(() => new OBJExporter().parse(group)),
        stl: tried(() => new STLExporter().parse(group)),
        stl_bytes: tried(() => bytes64(new STLExporter().parse(group, { binary: true }))),
        ply: tried(() => new PLYExporter().parse(group) ?? ''),
        ply_big: tried(() => plyBytes(group, false)),
        ply_little: tried(() => plyBytes(group, true)),
        gltf: c.gltf === false ? '' : await gltfText(group),
    });
}

const out = { three: version, reads, writes };
const where = join(here, 'reference.json');
writeFileSync(where, JSON.stringify(out));
console.log(`${reads.length} files read, ${writes.length} models written, to ${where}`);
