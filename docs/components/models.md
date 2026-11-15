# lory.models: model files read and written as three.js reads and writes them

`lory.models` (packages/lory/models.co) reads 3D model files into
`lory.geometry`'s geometries, as three.js's loaders read them, and writes
models out as three's exporters write them. It reads OBJ (with its MTL's
materials), STL (text and binary), PLY (text and binary), XYZ, PCD (text,
binary and compressed), VTK's legacy text form, and OFF. It writes OBJ, STL
(text and binary), PLY (text and binary) and glTF 2.0. A program draws what
it read through `lory.space`.

```
use lory.models

m = models.model_of['house.ply', data]          (or models.read_obj[obj, mtl])
if not models.readable[m]
    log[m.failure]
pieces = models.pieces_of[m]
c = models.meshed[c, 'house', pieces]           (once, when it is read)
c = space.scene[c, camera, space.daylight[]]
c = models.drawn[c, 'house', pieces, models.strands_of[m], lory.identity[]]
written = models.gltf_text[m]
```

It is a reimplementation, and no three.js source is included. What three
0.187.0's OBJLoader, MTLLoader, STLLoader, PLYLoader, XYZLoader, PCDLoader
and VTKLoader, and its OBJ, STL, PLY and glTF exporters, do was read and
written anew. The header of models.co carries the notice. The test files are
Lory's own, written for these tests.

## What is built

### A model

| Name | What it is |
|---|---|
| `Model[parts, libraries, failure]` | A model's parts in the file's order. `libraries` are the material libraries the file names (an OBJ's `mtllib`s, for the program to fetch). `failure` says why the file could not be read, and is '' where it was read. |
| `Part[name, form, geometry, colors, materials]` | One part of a model. `form` is `mesh`, `lines` or `points`. `geometry` is a `lory.geometry` Geometry. `colors` holds three numbers a vertex, in linear light as three keeps them. `materials` holds one material for each group, or one for the whole part. |
| `Material[name, color, specular, emissive, shininess, opacity, transparent, smooth, texture]` | What a part is drawn in, as three's Phong material holds it. Its colours are in linear light. `texture` is the file of its picture. |
| `plain_material[name]`, `colored_material[name, rgb]` | A material as three makes one when nothing is said of it (white, a highlight of 0x111111, shininess 30), and one of a colour. |
| `mesh_model[g, name]`, `mesh_part[g, name]` | A model, or a part, of one geometry drawn as a mesh. |
| `readable[m]`, `vertex_total[m]` | Whether the model was read, and how many vertices its parts hold. |

### Readers

A reader never stops the program. A file it cannot read gives a model of no
parts, and its `failure` says why (a short header, a missing element, a
binary form that is not built).

| Function | What it reads |
|---|---|
| `model_of[name, data]` | Any of the files below, by the extension of `name`, from its bytes. |
| `read_obj[words, mtl]` | An OBJ and, optionally, the text of its MTL. Each `o` and `g` starts a part. Faces are fanned from their first corner, and their normals are worked out where the file gives none. Each `usemtl` within an object starts a group. `l` lines and `p` points become parts of their own. Vertex colours are taken into linear light. |
| `read_mtl[words]` | The materials of an MTL: `Kd`, `Ks`, `Ke`, `Ns`, `d`, `Tr`, `map_Kd` and `map_d`, as three's MTLLoader turns them into Phong materials. |
| `read_stl[data]` | A binary or text STL. Binary: each triangle's normal goes on its corners, and a `COLOR=` header's colours are read as three reads them. Text: each `solid` is a group. |
| `read_ply[data]` | A PLY: ascii, or binary in either byte order. Its vertices' places, normals, uvs and colours are read; faces of three and four corners become triangles, and edges are passed over as three passes over them. |
| `read_xyz[words]` | XYZ points, three numbers a line, or six with a colour from 0 to 255. |
| `read_pcd[data]` | PCD points: ascii, binary, or binary compressed with LZF. It reads `x y z`, the normals, and `rgb` packed in a float. |
| `read_vtk[data]` | VTK's legacy text form: a POLYDATA's points, polygons and triangle strips (its `LINES` passed over, as three passes over them), and its point or cell colours and normals. |
| `read_off[words]` | An OFF (or COFF) file: its vertices, its faces fanned into triangles, and their colours. Three has no OFF loader, so this reader is Lory's own. |

### Writers

| Function | What it writes |
|---|---|
| `obj_text[m]` | OBJ text, as three's OBJExporter writes it: `o`, `usemtl` for a single named material, `v` (with its colour in sRGB where the part has colours), `vt`, `vn` made unit, and `f` with running offsets. Lines are written as `l` pairs and points as one `p` line. |
| `stl_text[m]`, `stl_bytes[m]` | STL text and binary, as three's STLExporter writes them. Only meshes are written: a facet a triangle, its normal worked out from its corners. |
| `ply_text[m]`, `ply_bytes[m, little]` | PLY ascii and binary (big-endian unless `little`), as three's PLYExporter writes them. Meshes and points are written. It writes nothing where a mesh's corners are not whole triangles, where three writes nothing either. |
| `gltf_text[m, generator]` | glTF 2.0 JSON with its buffer as a data URI, as three's GLTFExporter writes it. Accessors carry their min and max, indices are 16 or 32 bits, and a part of several materials has a primitive a group. Materials are metal-rough, made from the Phong ones as three makes them. `generator` is 'Lory' unless another name is given. |

### Drawing

| Name | What it is |
|---|---|
| `pieces_of[m, size]` | A model's meshes and points as `Piece[shape, color]`s for `lory.space`: triangles gathered by colour (rounded to a sixteenth). Each point becomes a small diamond `size` across (a sixtieth of the model where it is 0). |
| `strands_of[m]` | Its lines, as `Strand[lines, color]`s for `geometry.lines_drawn`. |
| `meshed[c, name, pieces]` | The pieces held on the page, as `name 0`, `name 1` and so on. Call it once, when the model is read. |
| `drawn[c, name, pieces, strands, matrix, width]` | The model drawn where `matrix` puts it, after `space.scene`: its pieces lit in their colours, its lines `width` pixels wide over them. |
| `bounds_of[m]`, `size_of[m]`, `middle_of[m]` | The box around a model's places, how far across it is, and its middle (for a camera or a placing). |

### Numbers as JavaScript has them

Used by the readers and writers, and public because other parity work needs
them too: `number_text[x]` (JavaScript's `toString`), `js_float[words]`
(`parseFloat`), `js_int[words]` (`parseInt`), `js_fields[t]`
(`split(/\s+/)`), `single[x]` and `singles[xs]` (a Float32Array's rounding),
and `linear_color[r, g, b]` and `shown_color[rgb]` (three's sRGB and
linear-light conversions).

## Behaviours held

- The readers keep what three keeps: the same parts in the same order, the
  same names and forms, the same vertices (non-indexed where three's are,
  indexed where three's are), the same normals, uvs and colours, groups and
  materials. Colours are taken into linear light as three takes them, and
  that includes VTK's cell colours, which three converts twice.
- Text is read the way JavaScript reads it: `parseFloat` and `parseInt`
  prefixes, `split(/\s+/)` fields, a byte-order mark dropped, and `\r\n` and
  `\` continuation lines in OBJ.
- The writers write what three's exporters write, byte for byte. The numbers
  in text are JavaScript's (`0.1` stays `0.1`, a single-precision value is
  written out in full, -0 is written as 0 once the identity matrix is
  applied), normals are made unit, and the key order and padding of glTF
  match three's.
- A file a reader cannot read gives a model whose `failure` says why. Where
  three throws, Lory answers.

### Where Lory differs from three, on purpose

- **Single precision everywhere.** Three keeps a PLY's `double`, `char` and
  `uchar` types in typed arrays of those types. WebGL then refuses to draw a
  Float64Array, so three cannot draw a double-precision PLY. Lory reads every
  number as three would, and keeps the values. The parity test compares them
  as numbers, and Lory can draw the file.
- **Short files.** Three's STLLoader throws on a file under 84 bytes, and its
  VTKLoader on one under 250. Lory reads such a file as text.
- **glTF writes no pictures.** Materials are written with their colours and
  factors only. Lory has no image codec to embed a texture.
- **Attribute order.** A part's attributes are written to glTF in the order
  POSITION, NORMAL, COLOR_0, TEXCOORD_0, which is the order OBJ and the
  geometry builders give three. Three follows the order its loader added
  them, and only PLY's (uv before colour) differs. That one case
  (points.ply) is left out of the glTF comparison.
- **Materials deduplicated.** A material is written once for each value and
  whether its part has colours. Three dedupes by object identity, which for
  models read from one file comes to the same thing.
- **The generator.** `asset.generator` is 'Lory' unless another name is
  given. The parity test passes three's own name.

## How parity is checked

`tests/models/reference.mjs` runs three 0.187.0 (npm `three@0.187.0`,
installed in a scratch folder only) in node. It reads the 28 files in
`tests/models/files/` with three's loaders. These files are Lory's own: hand
written, plus the binary ones `make_files.py` writes, among them an LZF
compressor of Lory's own for the compressed PCD. It also writes 13 models
with three's exporters: files read back, a box and a sphere. The script
records what three answers and writes in `reference.json`. Positions,
normals, colours and uvs are kept as their float32 bits, other typed arrays
as their values, and written files as text or base64 bytes.

`tests/models/reference.co` reads the same files and writes the same models
in Lory, then holds Lory to `reference.json`. Over 41 cases it finds:

- 4484 numbers as three made them, to the last bit;
- 79 within one unit in the last place. These are sRGB conversions, where
  V8's `pow` differs from Rust's by an ulp;
- 88 texts and byte strings as three wrote them.

One case three cannot write at all: its STLExporter throws a RangeError on
binary STL for prism.stl. The failure cases (short.stl, short.ply,
short.pcd, misordered.ply) must fail in Lory too, with a reason.

`tests/modes/models.co` writes digests of every reader's and writer's
results. `bash tests/modes.sh crow tests/modes/models.co` checks that the
interpreted and compiled programs agree: 361 lines, the same in both modes.

`examples/models` is the example: six models written as file text, read when
chosen and drawn. A writer's button shows the file it writes. In a headset
the model stands beside the page and the controller's ray presses the
buttons. It is built for the web, and `python3 -I tests/models/browser.py`
drives that build in headless Chrome. The check confirms that the cottage is
drawn, a drag turns it, the cube is chosen by keys, and the OBJ button shows
its file.

## Survey rows

| Row | Status |
|---|---|
| webgl: loaders (obj) | Built and tested: OBJ and MTL, parity with OBJLoader and MTLLoader. MTL pictures are named, not loaded (Lory's space draws plain colours). |
| webgl: loaders (stl) | Built and tested: binary, text and `COLOR=` files, parity with STLLoader. |
| webgl: loaders (ply) | Built and tested: ascii and both binary orders, parity with PLYLoader. Values are kept in single precision (see above). |
| webgl: loaders (pcd) | Built and tested: ascii, binary and binary_compressed, parity with PCDLoader. `intensity` and `label` are not kept. |
| webgl: loaders (xyz) | Built and tested, parity with XYZLoader. |
| webgl: loaders (vtk; the survey's list omits it, three has it) | Legacy text form built and tested, parity with VTKLoader. Not built: VTK's binary and XML forms, which three also reads; such a file gives a model that says so. |
| OFF | Built and tested against Lory's own expectations. Three has no OFF loader, so there is nothing to compare against. |
| webgl: loaders (gltf and its extensions, draco, fbx, collada, 3dm, 3ds, 3mf, amf, bvh, gcode, ifc, kmz, ldraw, md2, mdd, nrrd, pdb, svg, ttf, usdz, vdb, vox, vrml, lottie; textures dds, exr, hdr, ktx, ktx2, pvrtc, tga, tiff, ultrahdr) | Not built. Each needs its own reader. glTF reading needs a JSON-to-scene path and its image decoders, draco and the texture formats need codecs, and many need skinning or animation that Lory's space does not draw. |
| misc: exporters (obj, stl, ply, gltf, gltf_normals) | Built and tested, byte for byte with three's OBJ, STL, PLY and GLTF exporters (glTF without textures; normals renormalized as three does). |
| misc: exporters (draco, gcode, usdz, exr, ktx2) | Not built. Draco needs a mesh compressor, usdz a zip writer and USD, and exr and ktx2 image encoders. gcode is a printer path, not a model format Lory has a use for yet. |
