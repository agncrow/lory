# lory.space: three.js's scenes

`lory.space` (packages/lory/space.co) draws scenes: forms held on the page
(`mesh_form`, `mesh`, glTF `model`) drawn where a matrix puts them, in a
look, seen through a camera on a screen or through the reader's eyes in a
headset. Beside Lory's own looks (`plain`, `surface`, `shown`) it draws in
**three.js's looks**: the same materials, lights, fog, pictures, copies,
clipping and shadows, computed as three.js 0.187.0 computes them, so a
scene stated in Lory's words comes out as three draws it. Twenty-two of
the suite's twenty-four scenes held to three's pictures are the same pixel
for pixel (examples/threejs, tests/threejs/picture.py).

```
use lory.space
use lory.geometry

c = space.mesh_form[c, 'ball', geometry.space_form[geometry.sphere[1.0, 32, 16]]]
cam = space.camera_at[space.lens[45.0, space.proportion[c], 0.1, 100.0], [0.0, 2.0, 6.0], [0.0, 0.0, 0.0], [0.0, 1.0, 0.0]]
c = space.through[c, cam, space.daylight[]]
c = space.lamps[c, [space.ambient[lory.white[], 0.4], space.directional[lory.white[], 2.0, [1.0, 2.0, 3.0], [0.0, 0.0, 0.0]]]]
c = space.draw[c, 'ball', lory.identity[], space.glossy[lory.hex['#4488cc'], lory.hex['#222222'], 60.0]]
```

It is a reimplementation: no three.js source is included. Its shading was
read from three 0.187.0's shader chunks and written anew as one program of
Lory's (its lights' falloff, Phong's and the standard material's
highlights, its colour management and fog, in the same order). Where three
reads a table of numbers (the standard material's DFG lookup) Lory computes
a published analytic fit of the same integral instead, so that material
alone comes out a little apart (below).

## What is built

### Seeing the scene

| Function | What it is |
|---|---|
| `through[c, cam, l]` | The scene begun as a camera sees it (`camera_at`, `camera_placed`), lit by Lory's light `l` for its own looks; in a headset, through the reader's eyes. three's looks then take the camera's lens and view as three splits them (the projection, and the view times each model, in double precision). |
| `proportion[c]` | The scene's width over its height (its box's): a lens's aspect, as three's responsive pages set it. |
| `view_box[c, place, color]` | One of several views on a screen (three's viewport and scissor, a render each): what is drawn after it, until the next, is drawn inside `place` (left, top, width, height in pixels) over that box cleared to `color`. Begin each view's scene after it. In a headset it does nothing. |
| `in_view[c, which]` | Whether view `which` is to be drawn: every one on a screen, the first alone in a headset. |

### three's looks

A look of three's is a `Look` whose shading is three's: it is drawn by its
own program, lit by `lamps`, fogged by `fog` or `haze`. Each takes a colour
as seen (sRGB) and works in linear light as three does.

| Function | three's |
|---|---|
| `basic[color]` | MeshBasicMaterial (and LineBasicMaterial, PointsMaterial): lit by nothing. |
| `matte[color]` | MeshLambertMaterial. |
| `glossy[color, specular, shininess]` | MeshPhongMaterial (three's default specular is `#111111`, shininess 30). |
| `standard[color, metalness, roughness]` | MeshStandardMaterial under three's punctual and hemisphere lights (no environment map). |
| `facing_colors[]` | MeshNormalMaterial. |
| `two_sided[look]`, `back_sided[look]` | `side: DoubleSide`, `BackSide` (front alone otherwise). |
| `faceted[look]` | `flatShading`. |
| `glowing[look, color]` | `emissive`. |
| `with_texture[look, name]` | `map`: a picture held by `texture`; on points, each point's sprite. |
| `repeated[look, across, up]` | The picture's `repeat`. |
| `cut_out[look, alpha]` | `alphaTest`. |
| `blended[look]` | `transparent: true` (by the colour's alpha, depth still written as three writes it). Draw what is blended after the rest, farthest first (`farthest_first`). |
| `dotted[look, size]`, `shrinks[look]` | PointsMaterial's `size`, and `sizeAttenuation`. |
| `dashed[look, dash, gap, scale]` | LineDashedMaterial along what `measured` measured. |
| `pushed_back[look]` | `polygonOffset` 1, 1. |
| `linear_of[color]` | A colour as three holds it, in linear light: what a vertex's or a copy's colour is given as. |

Forms drawn in them are any `mesh_form`'s: triangles (indexed or not),
`segments`, `polyline`, `closed_line`, `dots`, with a colour a vertex
(`colored`, three's `vertexColors`, in linear light).

### Lamps and fog

| Function | three's |
|---|---|
| `ambient[color, intensity]` | AmbientLight. |
| `hemisphere[sky, under, intensity]` | HemisphereLight. |
| `directional[color, intensity, at, toward]` | DirectionalLight and its target. |
| `bulb[color, intensity, at, reach, decay]` | PointLight (`distance`, `decay`; three's are 0 and 2). |
| `spotlight[color, intensity, at, toward, angle, penumbra, reach, decay]` | SpotLight. |
| `casting[lamp, half, near, far, bias]` | `castShadow` with the shadow camera's half width (a directional light's box), near, far and bias; drawn as three's BasicShadowMap. A spot's camera is its cone. |
| `lamps[c, list]` | The scene's lights: up to four directional, four point and four spot lights, the ambient ones summed, one hemisphere. The first that casts has its shadows drawn, cast by everything drawn after. |
| `lamp_camera[lamp]`, `shadow_matrix[lamp]` | The lamp's shadow camera, and the matrix to its shadow map, as three makes them. |
| `fog[c, color, near, far]`, `haze[c, color, density]` | Fog and FogExp2. |

### Pictures and copies

| Function | three's |
|---|---|
| `texture[c, name, width, height, pixels, smooth, tiled]` | A DataTexture of RGBA bytes as seen (sRGB), nearest or smooth, clamped or repeated. |
| `mesh_copies[c, name, form, matrices, colors]` | InstancedMesh: a matrix a copy, a colour a copy (linear). |
| `move_copies[c, name, matrices, colors]` | `setMatrixAt`/`setColorAt` for all of them; the number of copies may change. |
| `level[c, names, reach, matrix]` | LOD: of a thing's levels, the one for its distance from the eye. |
| `cut[c, planes]`, `uncut[c]` | `clippingPlanes` (up to four, in the scene's coordinates). |

### Helpers

| Function | three's |
|---|---|
| `axes_form[size]` | AxesHelper. |
| `grid_form[size, divisions, middle, rest]` | GridHelper (its colours are `#444444` and `#888888`). |
| `box_lines_form[]`, `box_lines_at[lo, hi]` | Box3Helper: the edges, and where they stand for a box. |
| `geometry.arrow[c, from, way, length, color, head_length, head_width]` | ArrowHelper. |

### Picking and walking

| Function | What it is |
|---|---|
| `ray_from[cam, x, y]` | The ray through a point of the lens (−1 to 1 each way): three's `Raycaster.setFromCamera`. |
| `pointer_ray[c, cam]` | Through the pointer on a screen; the controller's in a headset. |
| `hits[r, form, matrix, side, threshold, near, far]` | What a ray meets of a form, nearest first: three's `intersectObject` on a mesh, lines or points. |
| `stand_at[c, id, x, z]`, `standing[id]` | Teleporting: the reader moved to stand on the floor at x, z (as `walk` keeps them); where they stand. |

### Controls (lory.controls)

`packages/lory/controls.co` moves a camera or things as three's addon
controls do, its state kept under an id.

| Function | three's |
|---|---|
| `controls.fly[c, id, lens, start, speed, turning]` | FlyControls with `dragToLook`: W, S, A, D, R, F move, Q, E roll, the arrows turn, the pointer held down steers. |
| `controls.trackball[c, id, lens, target, from]` | TrackballControls: dragging turns the scene every way about its point; the wheel brings it nearer. |
| `controls.drag[c, id, cam, form, places]` | DragControls: the thing pressed on moves over the plane through that point facing the camera. |
| `space.orbit[c, id, target, distance]` | OrbitControls (Lory's own). |

### The Shape (lory.flip)

`packages/lory/flip.co` is Semantic UI's Shape: sides (gui trees), one shown;
`flip.flip[id, way]` turns it `up`, `down`, `left`, `right` (as a cube) or
`over`, `back` (as a card) in 700 ms eased in and out (lory.motion's CSS
`ease-in-out`), seen in perspective; flips asked for during one wait their
turn; `set_next_side[id, k]` names the side it turns to (the next sibling
otherwise). `flip.shape[c, id, sides, x, y, w, h, look]` draws it and says
whether a flip began (`changing`, Semantic's beforeChange) or ended
(`changed`, onChange). A turning side is drawn by gui and its vertices put
through the cube's turn; it takes no input while it turns.

## In a headset

Every scene of the suite is drawn for both eyes (its tests count the two
views). There the camera is the reader's head: three's looks are lit in the
scene's coordinates with each eye's own projection. The right controller's
ray picks (`pointer_ray`, `ray`), its trigger pulls, the left stick walks and
the right turns (`walk`), and `stand_at` teleports. Where the room is seen
through the drawing (`lory.seen_through[c]`: AR), the page clears to nothing
and the suite's headset scenes leave their floor and walls out.

## How it is held to three.js

- **Pictures.** tests/threejs/picture.py draws each of 24 scenes in three
  0.187.0 (tests/threejs/scenes.js, `--three <package>` to draw them
  afresh) and in Lory's web build, both in headless Chrome at 480 × 360, and
  holds them pixel for pixel: exact where unlit (`textures`, `helpers`,
  `lines`, `points`, `sprites`, `custom_geometry`, `picking_points`), within
  2 of 255 on all but a thousandth of the pixels where lit (Lambert, Phong,
  every light, fog, instancing, clipping, transparency, levels of detail,
  two views, picking) — all of which come out exact — and within 12 of 255
  for the standard material (it differs on 4.4% of `materials`' pixels, by
  at most 26 of 255, on 0.13% past 12: three's DFG table against Lory's
  fit). The shadows' outlines hold, a few pixels apart where a shadow map's
  texel meets a surface (0.001%).
- **Picking.** three's Raycaster and Lory's `hits` pick the same cube and
  the same point (examples/threejs's tests hold both).
- **Numbers.** tests/space/reference.co holds 8885 of three's numbers
  (matrices, quaternions, angles, rays, bounds, frusta, line distances).
- **Both modes.** tests/modes/space.co writes what space, controls and flip
  compute and draw, 719 lines, the same interpreted and compiled.

## Not built

- **Environment maps, PMREM, physical extras.** The standard material is
  lit by punctual and hemisphere lights alone; reflections need an
  environment cube and its prefiltered mips (a render-to-cube target and
  a PMREM pass), clearcoat, sheen and transmission a second program.
- **PCF and VSM shadows, point lights' shadows.** Shadows are three's
  BasicShadowMap from one directional or spot lamp. PCF needs three's noise
  and Vogel disc, VSM a blur pass, a point light six faces.
- **Render targets, post-processing.** The page's calls can bind a
  framebuffer (shadows do), but Lory has no target a scene can draw into and
  then read as a picture; EffectComposer's passes need that first.
- **WebGPU and TSL.** The host page asks for WebGL 2 alone.
- **Sprites as quads, CSS2D/3D, the TransformControls gizmo, physics.**
  Points with a picture stand in for sprites (three's `points_sprites`);
  the rest is not built.
- **Headset features the host doesn't offer.** Hit tests, plane detection,
  hands, camera access and light estimation: crow.js asks only for
  `immersive-vr` or `immersive-ar` with `optionalFeatures: ['local-floor']`.
  It would need to ask for `hit-test`, `plane-detection`, `hand-tracking`,
  `camera-access` and `light-estimation` as optional features, request a hit
  test source and light probe after the session starts, and hand each frame's
  results (hits' poses, planes' polygons, joints' poses, the camera's image
  as a texture unit, the probe's spherical harmonics) to the program in its
  frame.
