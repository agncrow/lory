# examples/threejs: three.js's manual and examples in Lory

One program, a chooser of scenes: each a page of three.js's manual or one of
its examples, stated in Lory's words (`lory.space`'s looks of three's,
`lory.geometry`'s shapes, `lory.controls`). The panel lists them; the scene
is drawn right of it, or around the reader in a headset.

```
cd examples/threejs
crow run main.co                      # a window
crow build --target web main.co       # main_web/, for a browser or a headset
crow test main.co                     # its tests
python3 -I ../../tests/threejs/picture.py   # held to three's pictures (from the root: tests/threejs/picture.py)
```

| File | What it holds |
|---|---|
| main.co | The chooser: the list of scenes, the panel, the `told` words a hosting page may send (`scene <name>`, `at <ms>` to hold the clock, `whole` to draw over the whole canvas, `point <x> <y>` to hold a pointer), and the tests. |
| manual.co | The manual's pages: primitives, textures, the five lights, the scene graph, fog (linear and exponential), custom geometry, transparency. |
| webgl.co | The examples: two views (perspective and orthographic), helpers, coloured and dashed lines, points, sprites, instancing, clipping, levels of detail, materials, shadows, picking (cubes, points), controls (fly, trackball, drag), marching cubes, SVG. |
| headset.co | The headset's: dragging, the ball shooter, paint, teleport, look to select, point to select. Each works on a screen too, the pointer standing for the controller. |
| kit.co | What they share: three's colours from hue, saturation and lightness, numbers from a seed (the same in three's pages), things placed as three places them, cameras, pictures, test frames on a screen and in a headset. |

## Held to three.js 0.187.0

tests/threejs/scenes.js states 24 of the scenes in three, the same shapes,
cameras, lights, materials, seeds and clock. tests/threejs/picture.py draws
each in three (with `--three <three's package folder>`: its pictures are
kept in tests/threejs/pictures/) and in Lory's web build, both in this
machine's headless Chrome at 480 × 360 on a free port of 127.0.0.1, and holds
the two pixel for pixel:

| Scene | Kind | Held |
|---|---|---|
| textures, custom_geometry, helpers, lines, points, sprites, picking_points | exact | the same, every pixel |
| primitives, lights_ambient, _hemisphere, _directional, _point, _spot, scenegraph, fog_linear, fog_exp2, transparency, views, instancing, clipping, lod, picking | lit (within 2 of 255) | the same, every pixel |
| materials | physical (within 12 of 255) | 4.4% of pixels differ, by at most 26 of 255, 0.13% past 12: the standard material's DFG table (three's) against an analytic fit (Lory's) |
| shadows | shadows | 0.001% of pixels differ (a shadow map's texel meeting a surface) |

The other eleven (the controls, marching cubes, SVG and the headset's) are
drawn by the same build and held to drawing something without stopping.
picking and picking_points also pin three's Raycaster's choice (cube 16, point
100) in main.co's tests.

## Rows of three's catalogue

| Row | Scene(s) |
|---|---|
| fundamentals: primitives, scenegraph, materials, textures, lights, cameras, shadows, fog, custom geometry | primitives, scenegraph, materials, textures, lights_*, views, shadows, fog_*, custom_geometry |
| render targets | not built (Lory has no target a scene draws into and reads back) |
| responsive | every scene's lens takes the scene's proportions (`space.proportion`) |
| drawing lines | lines |
| animation | every scene is a function of its clock (`at` holds it); lory.motion eases what a program animates (the Shape) |
| matrix transformations | scenegraph (a thing's place is its parent's times its own), kit's `placed` |
| picking | picking, picking_points |
| multiple scenes | views (a box each, `space.view_box`) |
| transparency | transparency |
| billboards | sprites (points each drawn as a picture) |
| voxel geometry | not built as a scene |
| lots of objects | instancing |
| rendering on demand | Lory asks for every frame; a program that draws nothing new keeps the last picture |
| transparent canvas | `lory.clear` to a colour of alpha 0 (the page's context has an alpha) |
| WebXR basics, look to select, point to select | every scene in a headset; look_to_select, point_to_select |
| webxr: dragging, ball shooter, paint, teleport | dragging, ball_shooter, paint, teleport |
| webgl: cameras, lights, interactive, instancing, lines, helpers, clipping, shadows, materials, points and sprites, LOD, controls, marching cubes, svg | the scenes of the same names |

## In a headset

Every scene draws for both eyes (main.co's tests count the views). The
right controller picks and pulls, the left stick walks, the right turns,
and the teleport scene moves the reader (`space.stand_at`). Where the room
is seen through (AR) the page clears to nothing and the headset scenes leave
their floor and walls out (tested).
