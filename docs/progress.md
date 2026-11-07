# Lory — progress log

Vijay (2026-11-07): build all phases 0–8 of docs/lory-design.md, fix every
Crow bug found on the way (each with its test), decide open questions by
recommendation, then compare against Babylon.js samples and fix the
differences. Also fix the interpreter's slow start (Myna: 138 s).

## Crow side (repository agncrow/crow, branch toward-1.0)

Phase 0 — `crow build --target web` — is built and documented (spec
section 18, book chapter 12.9, `crow setup` fetches wasm's std, the
bundle and CI build for it, tests/web_target.rs draws a triangle in
headless Chrome). The page's calls (crow.js): WebGL2 by name, and the
host's `@atlas`, `@image`, `@buffer`, `@request`, `@tone`, `@keyboard`,
`@cursor`, `@copy`, `@title`; `manual` and `page.step(t)` for a test to
drive frames (headless Chrome's virtual time starves rAF).

Crow bugs found building Lory (each with its test):
- a frame's function answering anything but nothing did not build
  (`Done` over `CrowDisplay::failure`; tests/web_target.rs)
- a parsed value as a key in a write (parity 471)
- a record's whole-number field written a float (parity 472)
- a record's field given only `[]`, its items pushed onto a list of lists
  (parity 473)
- a list built by push written to a field a literal made a tensor
  (parity 474)
- a literal's rank read off its first item alone (tests/uncalled_literal_rank.rs)
- a package's declaration refused at another line, or line 0 and a panic
  (tests/part_refusal_place.rs)
- `pi[]` passing the lowering (errors k36)
- a package's local named like its file's function refused under the
  inlined name (`pk_row`; tests/part_refusal_place.rs)
- a field given `[]` and pushed a known item, not built (parity 475)
- a list a function answers refused as never given an item in a test
  that reaches it by no call (tests/uncalled_literal_rank.rs)
- a test's `page.give` queued a pointer's event but moved no pointer, so
  a frame's `pointers` stayed empty (tests/web_target.rs)

## Lory

- main.co — the renderer: one shader, sixteen floats a vertex (solid,
  rounded box, line, distance-field text, outline, image), clipping,
  images, sounds, requests, input (events, pointers, keys held, the time
  since the last frame, sticks), a headset's panel and rays, and the 3D
  layer (`deep`, drawn per view before the flat drawing).
- gui.co — controls drawn in WebGL (column, row, panel, scroll, heading,
  label, note, button, field, slider, toggle, select, table, area), focus
  and Tab, a phone's keyboard, and a keyboard drawn in a headset.
- plot.co — charts: line and candle pyramids (M4 bins), area, scatter,
  columns, volume, heatmap, nice ticks, time axes, grid, crosshair,
  legend, pan and zoom.
- space.co — 3D: meshes (box, sphere, ground, cylinder), a lit shader
  (sky, ground, sun, highlight), the orbit camera, glTF models (geometry
  fetched by the page into its buffers), and in a headset moving and
  snap turns, and rays that pick.
- game.co — a fixed-rate clock, collisions, sparks, sounds.
- examples: shapes, controls, chart, scene, drift (Lantern Drift, an
  original game), babylon. Every example's tests pass interpreted, and
  chart, scene and drift were drawn in headless Chrome and looked at.

## Held to Babylon.js (2026-11-07)

examples/babylon draws two of Babylon.js's scenes in Lory (main.co: the
Playground's first scene, a white sphere over a ground under a
hemispheric light; sun.co: its StandardMaterial in colour under a sky and
a directional light) beside Babylon 7.54.3's own pages (reference/), and
compare.py measures the two pictures at 1280×720 in headless Chrome
(SwiftShader, 4× MSAA):

| scene | pixels differing by more than 2 of 255 | where |
|---|---|---|
| first scene | 0.019% (171) | the sphere's outline only |
| in colour | 0.031% (283) | every one on an edge |

Inside every surface the two agree to the last digit. The edges differ by
a sample of the four: Crow computes the matrices in 64-bit floats,
Babylon in 32. What the comparison found and fixed in Lory: the light's
colours had been read on the 0–255 scale (the scene drew black); the
highlight was the sun's alone, a third as bright, and gated by the
light's side — it is now the light's own colour (`shining`), Babylon's
Blinn term; the light's sum is held to 1 per channel after the surface's
colour takes it, as Babylon's `clamp(diffuseBase * diffuseColor)` is
(the ground had been 5% darker); `orbit_from` starts an orbit with its
eye at a point. And the test pages' canvases are a fixed 1280×720:
headless Chrome lays a page out 633 high and then shoots it 720 high
without another frame, which had made the sphere look taller than wide.

To run it: build both programs for the web in examples/babylon, serve
`examples/` over HTTP, shoot `babylon/main_web/shot.html` and
`babylon/reference/index.html` (and the `sun` pair) with headless
Chrome, then `python3 compare.py lory.png babylon.png diff.png`.

Next: phase 7 (Myna on Lory); phase 8 (PBR, shadows, post-processing) —
and with PBR, the comparison of a Khronos glTF sample against Babylon's
PBR material.
