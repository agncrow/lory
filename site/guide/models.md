# 3D model files

`lory.models` reads 3D model files into Lory's geometries and writes models
back out. It reads OBJ (with its MTL's materials), STL (text and binary),
PLY (text and binary, either byte order), XYZ and PCD point clouds (PCD in
text, binary or compressed binary), VTK's legacy text form and OFF. It
writes OBJ, STL (text and binary), PLY (text and binary) and glTF 2.0. A
program writes `use lory.models`, reads a file's bytes into a model, and
draws it in a `lory.space` scene with the pointer turning the camera.

A model is its parts in the file's order, each a mesh of triangles, lines
or points, with its colours in linear light and its materials. A reader
never stops the program: a file it cannot read gives a model of no parts
whose `failure` says why.

## Components

| Component | What it does |
|---|---|
| Model reader | Reads any supported file by its extension, or one format by name (`read_obj`, `read_stl`, `read_ply`, `read_xyz`, `read_pcd`, `read_vtk`, `read_off`) |
| Material library | An MTL's colours, highlight, glow, opacity and picture names, given to the OBJ's parts |
| Model writer | A model as OBJ text, STL text or bytes, PLY text or bytes, or glTF 2.0 JSON with its buffer inside |
| Model drawing | A model's meshes and points gathered into pieces by colour, held on the page once, then drawn lit wherever a matrix puts it, its lines over them |
| Model measures | The box around a model, how far across it is and its middle, for placing a camera |
| Model of a shape | A model made from one of Lory's geometries, to write it out as a file |

## Using it

```crow
use sys
use lory
use lory.space
use lory.models

--- a PLY file of one triangle
fn triangle_file[]
    sys.bytes['ply\nformat ascii 1.0\nelement vertex 3\nproperty float x\nproperty float y\nproperty float z\nelement face 1\nproperty list uchar int vertex_indices\nend_header\n0 0 0\n1 0 0\n0 1 0\n3 0 1 2\n']

fn picture[c]
    m = models.model_of['triangle.ply', triangle_file[]]
    if not models.readable[m]
        log[m.failure]
        return c
    pieces = models.pieces_of[m]
    if not space.made['triangle 0']
        c = models.meshed[c, 'triangle', pieces]
    camera = space.orbit[c, 'eye', models.middle_of[m], 2.0 * models.size_of[m]]
    c = space.scene[c, camera, space.daylight[]]
    models.drawn[c, 'triangle', pieces, models.strands_of[m], lory.identity[]]

fn draw[frame]
    lory.end[picture[lory.begin[frame]]]

sys.frames[draw]
```

`models.gltf_text[m]`, `models.obj_text[m]`, `models.stl_bytes[m]` and
`models.ply_text[m]` give the same model back as a file.

## In a headset

A model is drawn in the room like any other part of a `lory.space` scene,
so it can stand beside a page at whatever size the program gives it, and the controller's ray
presses the buttons of the panel that goes with it.

## Try it

[Open the 3D model files example](../../examples/models/)

## Not included yet

- Reading glTF, FBX, COLLADA, 3MF and other scene formats
- VTK's binary and XML forms
- Pictures written into glTF materials
- Skinned and animated models
