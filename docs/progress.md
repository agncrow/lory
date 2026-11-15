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
  since the last frame), a headset's panel and rays, and the 3D layer
  (`deep`, drawn per view before the flat drawing).
- gui.co — controls drawn in WebGL (column, row, panel, scroll, heading,
  label, note, button, field, slider, toggle, select, table, area, and
  since 2026-11-14 a control the program draws, `drawn`), focus
  and Tab, a phone's keyboard, and a keyboard drawn in a headset.
- plot.co — charts: line and candle pyramids (M4 bins), area, scatter,
  columns, volume, heatmap, nice ticks, time axes, grid, crosshair,
  legend, pan and zoom.
- space.co — 3D: meshes (box, sphere, ground, cylinder), a lit shader
  (sky, ground, sun, highlight), the orbit camera, glTF models (geometry
  fetched by the page into its buffers), and in a headset moving and
  snap turns, and rays that pick.
- game.co — a fixed-rate clock, collisions, sparks, sounds (2026-11-13:
  a package of its own, packages/game, `use game`).
- xr.co (2026-11-13, gathered from main.co) — a headset's part: a room
  of panels about the reader, folded or each stood freely, a place on a
  panel and its edges, the reader's head and hands, a controller's stick.
- solid.co (2026-11-13, from Myna) — the solid shapes of a chart that
  stands out of a wall, and a scale's marks.
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

## Phase 7 — Myna on Lory (2026-11-07)

Myna's workbench drawn in WebGL (Myna's `drawn/main.co`, built for the
web and served by Myna at `/drawn`; its data from `myna/drawn.co`'s JSON
routes beside MLflow's API): Experiments (runs table, a run's metric as a
chart), Runs in 3D (each run a ball, placed by two parameters and a
metric, picked by the pointer or a controller's ray), Models, Catalog
(tables and their newest rows), Notebooks (cells), Jobs (runs and what
each wrote). What it asked of Lory: `gui.chosen` (a table's chosen row),
an `area` of no width taking its column's, and a scene framed in a box
(`space.within`: its viewport, scissor, proportions, ray and orbit are
the box's, so a press on a control turns nothing; in a headset the box
is ignored and the scene is the world).

## Phase 8 — materials, shadows, levels of detail (2026-11-07)

- `space.plain[color]` is the standard material (unchanged: the Babylon
  comparison stands); `space.surface[color, metallic, roughness]` is
  glTF's metallic-roughness material — GGX distribution, Smith's
  height-correlated visibility, Schlick's Fresnel, the sky's light from
  an analytic split-sum, in linear light, ACES tone mapping, then gamma.
  `space.glowing` adds emitted light. A glTF model's parts are drawn in
  their own material (base colour, metallic and roughness factors,
  emissive factor).
- `space.shadows[c, light, center, reach]`: the sun's shadow map (2048²,
  24-bit depth, drawn first into a framebuffer through `c.early`, then
  sampled with 3×3 percentage-closer filtering and a slope bias).
- `space.level[c, names, reach, matrix]` picks a model's level of detail
  by the eye's distance (the orbit's on a screen, the head's in a
  headset).
- examples/materials draws them: metal and non-metal balls by roughness,
  their shadows, and a ball drawn at the level its distance asks for.

Not started, and why: bloom and other post-processing (a second pass
over an image of the frame costs every phone's fill rate, and no Myna or
game view needs it yet); WebGPU (WebXR on the Quest's browser is WebGL's;
Lory's batch is WebGL2's calls by name, so WebGPU would be a second
renderer, worth it only when compute shaders are needed); shadows from
lights other than the sun; image-based lighting from an environment map.

## The page in a headset, held to a real frame (2026-11-11)

Found by running Myna's drawn workbench in a headset emulated in a
desktop browser (a WebXR device made up in the page, a Quest 3's frame:
both eyes side by side, 3360 by 1760), and fixed:

- `begin` took the frame's size for the page's. A headset's frame is its
  framebuffer's, so a page was laid out 3360 wide on a panel 1.6 m wide
  and a control was three pixels tall in an eye. In a headset the page
  is now a page of its own size, 1000 by 560, on a panel 2 m wide (2 mm
  a pixel; 14-pixel text 19 mm tall at a metre). The headset tests here
  had used a made-up 900 by 700 frame, which hid it.
- gui's drawn keyboard showed, and took the presses on its keys, while
  nothing had the focus: `held.focus in held.texts` is true of '' (the
  map holds '' for its type's sake). The four places that ask now ask
  for a focus that is not ''; the fourth had opened a phone's keyboard
  on a press on nothing.

Myna's `drawn/main.co` holds both in its tests. Not run in a real
headset yet.

## Kite — candlestick charts on Lory (2026-11-07)

packages/kite is klinecharts' behaviour written in Crow, drawn by Lory,
with finch's VWAP-scanner card as a part of it (scanner.co):

- Six kinds of candle and klinecharts' twenty-seven indicators, computed
  to its last digit. tests/kite/reference.co holds them to
  reference.json, which reference.py writes from klinecharts' own code.
- Panes below the candles, axes that fit their labels (normal,
  percentage, logarithmic), a crosshair and tooltips, high and low marks
  and the last price.
- The drawing tools (overlays.co) and every style klinecharts names.
- Navigation as TradingView's chart moves:
  - a drag moves the bars, and the prices once it has gone four pixels
    up or down;
  - a fast drag glides on;
  - a trackpad's swipe moves the view along its axis;
  - the wheel or a pinch zooms about the pointer;
  - an axis dragged or swiped stretches;
  - double clicks fit the prices and reset the time axis;
  - the arrows move a bar or zoom;
  - the A and » buttons fit the prices and go back to the newest bar.
- examples/kite and examples/scanner are the pages.
- packages/kite/example.co drives a chart through all of it outside a
  page, the same in both modes.

Not done yet: finch's other indicators (density candles, flow volume,
RSI/CVD, regime, the amber zone, flags and pennants, candle patterns, the
order-book ladder, sizing zones), and live data. A browser program cannot
make a request of its own, so live data needs a decision first.

`./test.sh [crow]` runs the whole suite: every package's test blocks and
example in both modes, Kite's reference, and every example built for the
browser.

## A room: the page folded around the reader (2026-11-12)

For Myna's room (any page of Myna or of an app shown around its reader:
`myna/drawn/room.co`), added beside what was there, nothing of it changed:

- **`lory.begin_room[frame, room]`** (main.co): the page folded into
  flat panels standing around the reader — `lory.room[cols, wide, tall]`,
  eight panels at most, a pixel 1.8 mm, the panels 1.75 m off, `front`
  the panel ahead, `turn` the whole turned. The page's shader folds a
  vertex onto its panel by its x (`fold`, `folded`); a controller's ray
  meets the nearest panel it strikes (`_room_hit`); the page is drawn
  against the scene's depth, writing none, so what stands out of a panel
  hides the page behind it. **On a screen the same room is seen through
  one eye** (`_through_an_eye`): the frame is made a headset's of one
  view, each pointer a controller whose ray leaves the eye, its press the
  ray's — so a program draws one room and reads one pointer wherever it
  is shown, and a room is tried on a desktop.
- **`lory.spot[c, x, y]`**: the matrix that stands a thing at a point of
  the page — a unit a pixel, x along the panel, y up, z out of it.
- **`lory.keys_at[c, left, foot, wide]`**: where a headset's drawn
  keyboard stands (a room's page is many panels wide; `gui.keys_of`
  reads it). **`gui.focus[id, words]`** and **`gui.unfocus[]`**: a
  control given the focus by the program.
- **A `told` event** (`_event`): what the page that hosts the canvas
  tells the program, its words in `text` — not `text`, which a field with
  the focus takes for typing.
- **space.co**: `shown[color]` (a colour as it is, lit by nothing),
  `pictured[unit]` (the picture a texture unit of the page holds: the
  host page puts it there — unit 8 and on — and nothing here binds it;
  the shader's `unlit`), `sheet[w, h]` (a flat sheet facing forward),
  and `mesh` of a name already held takes that name's buffer (a chart
  whose bars change is handed over again, and nothing is left behind).

Held by two test blocks at the end of main.co (the panels' places, a
ray's meetings, the one-eye frame, `spot`, and a page that is no room
unchanged), by `crow test --packages` as before, and by Myna's room.

Found on the way, in Crow rather than here: a number that may have failed
(`float['…']`'s, returned from a function), handed into a call that ends
in `str[...]` inside these lists of calls, is refused as "the lowered
program disagrees with itself" at `_made` — the program must hand Lory
plain numbers (`0.0 + j.x` read where it stands).

## Lory Studio: a headset on the desk (2026-11-12)

`studio/` (its README says how it is used): a bench for what Lory draws in
a headset, beside the packages and no part of them.

- **A made-up headset** (`studio/web/headset.js`): WebXR's own calls
  answered in a desktop browser — two eyes of a Quest 3's frame, a head,
  two controllers with trigger, grip, thumbstick and buttons. The page's
  program and Crow's loader run unchanged and enter it as they enter a
  real one. Its clock is its holder's, a frame a pump, so what is drawn
  once is drawn again dot for dot.
- **The Studio's page** (`studio/web/`, served by Myna and its apps at
  `/studio/`, or by `studio.py serve` beside a build's folder): the
  pointer aims a hand's ray through the eye's picture, a click is its
  trigger, drags and keys move the head; beside the picture a frame's
  cost and its WebGL calls, the centre of the view (41°) and the height a
  panel belongs at (5° low), an angle measured by a drag, and every thing
  the page names outlined by how many degrees it takes against what a
  guideline asks (a target 3.17°, letters 0.92°: Android XR's dp, as
  angles).
- **Walks** (`studio/web/walk.js`, `studio.py walk`): steps as JSON —
  poses, presses (by a point, or by a thing's name), checks, measures,
  pictures held to the ones kept — run by the page and by a headless
  Chrome alike. `walks/scene.json` walks the scene example, and `test.sh`
  takes it.
- **Recordings**: what a headset did, frame by frame, kept of the made-up
  one or taken from a real one over its cable (`studio.py device record`,
  `take`), and played back frame for frame with that headset's own eyes;
  `Follow` moves the made-up one as the real one moves.
- **Where the time goes** (`studio.py profile`, `device profile`, `device
  cost`): the browser's own profile of the frames, by kind and by the
  source's own function names; frames a second and a frame's cost as the
  headset had them.

First findings, of Myna's room as built (the Reports page of an app on it):
all 112 things to press are under 3.17° (most under 2°), 201 of 209 runs of
words have letters under 0.92°, the page lies a whole circle about the
reader, no pulse answers a press; a frame fills one 198 KB buffer anew, and
a third of its time is memory taken and given back, an eighth the buffer
written as base64 for the loader. And of the scene example: its line of
words, laid for a screen, is too small to read on the headset's page.

## Windows: panels stood freely, shapes cut, the head and the hands (2026-11-12)

For Myna's room as windows (measured with the Studio above, the folded
wall was too small and too wide: `myna/drawn/room.co` says what it is
now), added beside what was there:

- **A room's panels stood freely** (main.co): `Room.placed` is a matrix a
  panel, as `lory.pane[at, turn, lean, mm, cx, cy]` makes one — a point
  of the page stood at a place in the room, the panel turned about the
  upright and leaned back, a pixel so many metres — and `Room.live` the
  part of each panel that is shown and met (left, top, right, foot, in
  the page's pixels). The page's shader discards what lies outside a
  panel's part (`pane`), and a ray meets a panel only within it, the
  nearest first: so a tall page is seen through a window and scrolled by
  standing its panel higher — nothing drawn on it moves in the page's own
  pixels, and vertices kept from an earlier frame stay good. The panels
  past those placed stand folded as before. `Room.dot` false leaves
  Lory's mark of the ray off, for a program that draws its own.
  `_room_hit` and `spot` are general (any matrix), and the folded room is
  what it was: its two test blocks pass unchanged, with a third for a
  window and a leaned panel.
- **A scene's shapes cut by planes** (space.co): `space.cut[c, planes]`
  (four planes, as `lory.edges[c, k]` gives a panel's shown part) and
  `space.uncut[c]`; the scene's fragment shader discards what is outside.
  A shape standing out of a scrolled page leaves with it at the window's
  edge.
- **The reader's head and hands** (main.co): `lory.head[c]` — its place,
  turn and nod, from a headset's eyes or a screen's one — and
  `lory.hand[c, name]`: a controller's ray, trigger, grip, two buttons
  and stick.
- **A button of a width** (gui.co): `gui.sized` holds for a button.
- **A mesh kept on its own** (space.co): every draw and every `made`
  took all that the scene holds — every mesh, copied — to find one. A
  mesh is kept under its own name too, and a draw takes that; the
  uniforms a draw names are told without a list built to find them. With
  Myna's own frame function no longer handing its canvas in and out of
  records, a frame of a session's charts went from 3.7 to 2.2 ms on a
  desk. The scene example, rebuilt, draws dot for dot what it drew
  (`studio/walks/scene.json`).

Lory Studio measures sizes in dp now, on the panel a thing lies on — the
unit the guidelines count in — beside the angle it takes of the view.

Found on the way, in Crow: a variable named `drop` is run by the
interpreter and refused by the build (the Rust it is lowered to has a
`drop` of its own); `view` and `keys` are no variable's name.

## Myna's room taken into Lory's packages (2026-11-13)

Vijay (2026-11-13): the room had been built as Myna's, and what it is made
of that is no app's belongs here — so another program, without Myna, can
have it.

- **The solid shapes of a chart** (packages/lory/solid.co, `use
  lory.solid`): blocks, ribbons, curtains and wedges gathered into one
  shape a colour for `space.mesh`, in the wall's pixels, and a scale's
  marks (round steps, a value worded shortly with its unit). From
  myna/drawn/solid.co, unchanged but its imports.
- **A chart's candles standing out of a wall** (packages/kite/candles.co,
  `use kite.candles`): a day's bars read as columns, folded into candles
  up to the second a chart has reached (each keeping its place among the
  day's as the window slides), and their bodies, wicks, volume and VWAP as
  solid shapes. From myna/drawn/candles.co, unchanged but its imports.
- **A headset's part of Lory in one module** (packages/lory/xr.co, `use
  lory.xr`): what a program asks of a room and of the reader —
  `begin_room`, `room`, `pane`, `edges`, `spot`, `keys_at`, `room_of`,
  `head`, `hand` (and `Hand`), `stick`, `in_headset` — had been main.co's
  among the renderer's own functions. main.co keeps what its drawing needs
  of a room (`Room`, its panels' matrices and shown parts for the shader,
  a ray met with them), and xr.co reaches those as the package's own. The
  room's three test blocks are xr.co's now; gui.co, space.co, the drift
  example and Myna's drawn programs call `xr.` where they called `lory.`.

Found on the way, in Crow: `crow install` refuses a project that names
Lory and Kite from their folders (myna/drawn's crowfile) — Kite's own
`lory = '../lory'` is joined to Kite's path, `…/packages/kite/../lory`,
and compared as text with the project's `../../lory/packages/lory`, so
one folder is two sources (packages.rs, `install`: a local source could
be compared by the folder it names). This repository's root crowfile is
not installed by it either (`packages/kite` reads as a git source). The
links are made by hand, as here.

## Lory's window, a package of its own (2026-11-13)

Vijay (2026-11-13): the room's window — its host page and the half of its
program no app owns — is Lory's, with Myna's charts its plug-in.

- **packages/window/** (`use window`; its crowfile names its Lory
  `../lory`, linked in its crow_modules/ by hand, as Kite's is): a site's
  pages before their reader in a headset. main.co is the program's half —
  the window on the page and its scrolling, the bar under it, the window
  stood and moved, what is raised before it (a site's menu, a list's
  choices) and the keyboard by the reader, the rays and the cursor, the
  pointer told to the host — from myna/drawn/room.co, with nothing of
  Myna's left in it. web/ is the host page (index.html, room.js), from
  myna/drawn/room_host/, made general: which parts of a page are its main
  and its side the program says (`@parts`); every widget on the page is
  told to the program by its place, its kind, its props and the few words
  its element offers (`el.__room`), whatever its kind; the program may
  answer the height a widget needs (`@sized n h`) and give it words
  (`@widget n words`, handed to `el.__room.told`).
- A program with no widgets of its own steps a frame whole
  (`window.step`); one with widgets stands them between the window's own
  steps (`begun`, `barred`, `bar_done`, `page_drawn`, then its widgets,
  `over_drawn`, `asked_done`, `rays`, `hold`, `end`), drawing with the
  page's place in the room (`at_page`), what of it is in view (`in_view`)
  and words laid once and kept (`keep_words`, Lory's own since: see
  below). The example does both: a
  page through the window, scrolled, pointed at, its side raised and a
  word typed; then a dial, a widget of an app's own, sized through the
  window's steps. Ten test blocks.
- Myna's room (myna/drawn/room.co) is now Lory's window with Myna's charts
  on it: a chart widget's words read in Myna's chart format, the height
  its grid needs answered, its charts stood out of the window, and a bar
  pressed told to the widget (`pick id i`, which finchdash's chart widget
  sends on as its page's own pick). Myna's /room/ serves the window's web/
  (myna/web/room links drawn/crow_modules/window/web).

## Lory's games, a package of their own (2026-11-13)

Vijay (2026-11-13): the game engine out of Lory's own package into one
beside it, as Kite is — Lory the renderer, its controls, charts and 3D;
a game's parts built on it, as Flame is on Flutter.

- **packages/game/** (`use game`; its crowfile names its Lory `../lory`,
  linked in its crow_modules/ by hand): packages/lory/game.co moved
  whole — the fixed-rate clock (`steps`, at most eight a frame), shapes
  that meet (`circles_meet`, `boxes_meet`, `circle_meets_box`), a value
  eased and held (`toward`, `clamp`), sparks (`burst`, `moved`, `drawn`)
  and sounds (`sound`). A clock is kept in memory under `game.clock.<id>`
  now (it was `lory.game.clock.<id>`). Five test blocks of its own, which
  it had none of: the clock's steps and its rest carried, each clock its
  own, shapes meeting where they touch, easing the same in one step or
  two, sparks spent, a sound asked of the page.
- Its example plays a ball dropped onto a floor on frames 16 ms apart and
  33 ms apart: it lands in 44 frames and in 21, after the same 83 steps
  of the game. Lory's own example keeps its frame ended and a sound asked
  of the page; the game's part of it is the game's example now.
- Lantern Drift (examples/drift) names the game package beside Lory
  (`use game`; its crowfile, and a link made by hand: `crow install`
  refuses the two, as it does Kite and Lory).

## A wall of charts, Kite's (2026-11-13)

Vijay (2026-11-13): the chart drawing Myna's room did belongs to Kite;
the column count fixed; the inner scrolling fixed.

- **packages/kite/wall.co** (`use kite.wall`): a grid of charts stood out
  of a wall in three dimensions, from myna/drawn/room.co, whose drawing it
  was. A caller gives it the grids as it reads them (`Grid`, `Cell`: a
  chart's kind, its numbers, its candles' day and window, its trades), and
  per frame where the wall stands in the room (`there`), what of it is
  seen (`shows`) and the planes it is cut by (`edges`, what `xr.edges`
  gives; none keeps everything). It answers the height a grid needs, asks
  the app for a day's bars (`?day=…&symbol=…`) and for a window of every
  symbol's candles (`?day=…&span=…&from=…&to=…`) at the routes the caller
  names, folds what is answered into candles (`kite.candles`), and draws
  bars, lines, candles and small charts of the shapes `lory.solid` makes,
  their titles and scales in words laid once. What the pointer is over is
  `wall.picked[]` (a grid, a chart, a bar or candle). Its memory is kept
  under `kite.wall.*`; its unit block is the mesh `wall:unit`.
- **The column count**: a grid of fewer charts than its width fits stood
  them in as many columns as fit, so two charts in a grid four wide took
  half of it. They stand in as many as fit and no more than there are
  charts (`max[1, min[fit, n]]`), as finchdash's own grid lays them on the
  page. Seven test blocks (55 truths), interpreted and compiled the same.
- **Words laid once, Lory's** (packages/lory/main.co: `lettering`,
  `kept_words`, `put_words`, `keep_words`): the window's way of keeping
  the vertices of words that do not change from frame to frame, by name
  and by what they were laid from, is Lory's now, since Kite's wall keeps
  its titles and scales the same way. A test block of its own in main.co.
- Myna's room (myna/drawn/room.co, 409 lines from 1371) reads a
  chart widget's words into Kite's `Grid` and `Cell` and hands them on;
  its picks come back from `wall.picked[]`.
- **The inner scrolling** (packages/window/web/room.js): the picture was
  of the page's markup copied, and a copy is not scrolled, so a box that
  scrolls within the page (a wide table's, a log's) was pictured at its
  start whatever the reader had scrolled it to. Each such box's copy is
  now moved as the box is scrolled (its children translated by the
  scroll, a run of words in it held in a span set back by it), in the
  page's picture and in a block's pictured alone. The page's scrolling
  is heard (`scroll`, caught) as a change to picture; a box scrolled
  with nothing to press in it moved is pictured alone, one whose links
  or buttons moved has the page pictured again and what can be pressed
  read again, each clipped to what its box shows (a link scrolled out of
  its box is pressed no more). A box that stood still as what is in it
  scrolled is no longer taken for one that grew (it had been pictured as
  what holds it from then on). Checked on finchdash's Jobs page: a box
  scrolled 120, 300 and 400 across and 60 down is pictured as the page
  shows it (the picture moved by the scroll matches it to the pixel),
  and the links it scrolled out of sight are no targets. Not yet: a part
  set sticky inside a scrolled box (a table's head) is pictured scrolled
  with the rest of it.
- **Crow's `crow install` and `crow check`, fixed in Crow** (Vijay: "do
  the crow install when appropriate. fix crow check"; the Crow
  repository, src/packages.rs, checker.rs, modules/mod.rs and main.rs,
  each with its test; uncommitted there, installed by its `install.sh
  --source`): a local source is compared by the folder it names, links
  followed, so a project naming `../../packages/lory` beside a package's
  own `../lory` is one source (two folders are still refused); `nan`,
  `pi`, `e` and `inf` are names `use math` makes, which `crow check` had
  reported as undefined (Kite's candles, Lory's `cylinder`, the game's
  sparks); a file a linked package reaches outside itself is named in the
  check's reach by its path from the program's root (it had been
  `crow_modules/window//Users/…`). Myna's drawn/ is installed by `crow
  install` now. This repository keeps its links relative, so a clone
  works as it is (`crow install` would link the same folders by their
  absolute paths); its root crowfile names its packages `./packages/…`,
  which `crow install` had read as a repository's without the `./`.
- **What `crow check` found here**: a name made and never read — a value
  kept by a call made for what it does (`space._meshed`, `space.model`,
  the game's example ending its frames), a count never used (`plot.bars`,
  Kite's `store.prepend`) and parameters a function's callers hand
  anyway (`window.rays`'s state, Kite's `store.real_of`, `figure_look`,
  `_figure_line`, the window example's frame). Each call is left alone on
  its line or the name begun with `_`. Three more of its findings were
  Crow's, and are fixed in Crow (Vijay: "Yes, fix them"; checker.rs,
  baseline.rs, lower_ir.rs and main.rs, each with its test, uncommitted
  there, installed):
  - generated whole numbers met float maths ("an int met a float … a bug
    in Crow": `nice`, `ticks`, `_mod`, `_unit`, `sphere`, Kite's
    `plot_of`). The check had lowered the declarations alone, so a
    function only a test or the top level calls had no types; it now
    calls the program as `crow run` lowers it, and hands a vector of
    floats as one.
  - a script's function was taken for "a handler nobody can reach"
    (`played`, `count_of`, `made`, `aimed`, `framed`). Only a program
    that holds state has handlers, and a call from the top level now
    reaches what it calls.
  - results were kept by a function's bare name, so two files' `_fresh`
    (and `_green`, `two`) were compared as one ("behavior changed").
    Each is kept under its file now, `.crow/snapshots/<file>/<fn>.snap`.

  A fourth, found on the way, never showed here, because none of Lory's
  programs holds state. It is fixed too (Vijay: "Yes, fix it";
  checker.rs, with its test). In a ui program, a helper that only the top
  level calls to set a fact was told its write was an unused variable
  (`say has unused variable 'status'`). A function's assignment to a fact
  is now the fact's write, whatever calls the function, as the lowering
  stores it.

  Checked on a copy of the four packages, each file from its own folder,
  twice: from 106 findings to 78, none of those three kinds, the second
  pass the same. What is left is inputs no caller makes: empty or short
  vectors, sizes of 2^63, the int of an infinite float, loops of 2^63
  steps timing out. A flat range, the one such input a chart could meet,
  `_fitted` widens before any step is taken. `crow check` writes
  `.crow/baseline/` and `.crow/snapshots/` into the folder it checks.

## A control the program draws, as the built-in ones are (2026-11-14)

Vijay (2026-11-14), on whether Crow is good enough to write UI code: a
control a program drew was second-class. `gui.area` only kept it a box;
the program drew into it after `gui.show`, found the box in
`Shown.boxes`, and wrote its own hover, press and pointer shape against
the frame's input, with no focus and no keys. A five-dot rating took 33
lines of code in four definitions and a second pass. Three shapes were
shown: the control's function held by its node, one painter for the tree
handed to `show`, and the two passes kept with Lory holding the state. He
chose the first ("Build shape 1").

- **`gui.drawn[id, value, wide, tall, painter, lo, hi, words]`**
  (gui.co): a node that holds a function of the program's, its painter,
  handed by name as `sys.frames[draw]` is. `_place` calls it in the
  tree's own pass, where the control stands, with a `gui.Drawn`: the
  canvas, the control's box in the drawing's pixels and `s`, the look,
  the value, range and words the tree gave it, and what the reader is
  doing to it — `hover`, `down` (held pressed: a drag, still true in the
  frame that lets go), `pressed` (let go on it, a button's press),
  `focused`, where the pointer is from the box's top left (`px`, `py`),
  and the keys typed while it has the focus, Tab aside. Lory takes back
  the drawing, the value (a change is a `change` event) and whatever
  `gui.tell[d, act, words, num]` told. A press gives it the focus, Tab
  reaches it, and its focus ring and pointer shape are Lory's, as a
  slider's are. Since it is drawn in the pass, a scroll clips it and an
  open select's list is drawn over it, as for any control. A control of
  no id only draws. `gui.area` is as it was: Myna's drawn app and the
  window draw into theirs after the pass.
- **The pointer's shape stands** (gui.co): `_hovered` had written
  `held.hover` into its own copy of the pass, so every frame asked
  `default` after the shape a hovered control asked, and the pointer
  over a button or a field never changed. `_cursor` asks the shape and
  marks it in the pass; a frame where no control asked one still asks
  the default.
- **Tests**: six blocks in gui.co (37 truths): a drawn control laid out
  and drawn in the pass, a press its painter answers, a drag until it is
  let go, keys while it has the focus with Tab moving past it, a control
  of no id, and the pointer's shape over a control. Two were checked by
  breaking what they hold: with `_cursor`'s mark taken out the pointer's
  shape block fails, and with a press giving no focus the keys block
  does. The example's form has a drawn rating, pressed
  and then moved by an arrow, the same in both modes. The rating
  rewritten is two definitions, 26 lines, 5 of them the arrow keys it
  had lacked.
- **Found on the way, in Crow**: a function written into a record in an
  imported module (`Node[…, _undrawn]` in gui.co) is refused, "handed as
  a value, and nothing types its parameters", though a call through the
  record's field types it, and the same code in one file runs. So
  `_drawn` calls Lory's own painter by name once. A field read is
  always a copy when compiled (only a local's last read moves), so
  `p.c = f[p.c, …]` copies the canvas, its vertices and its glyphs, at
  every draw call in gui.co (46 places), and a drawn control's canvas is
  copied into its `Drawn` and back out of it.

## Lory's components: the catalog and gui's core (2026-11-14)

Vijay (2026-11-14): go through the linked sites (Vue's, Solid's and Lit's
examples, Semantic UI, Headless UI, Radix Primitives, Themes, Icons and
Colors, Vuetify, Motion, anime.js, AOS, three.js, Chart.js, SortableJS,
TanStack Table, Grid.js, react-datepicker, TOAST UI, react-slick, Mapbox
GL JS, Leaflet, fullPage.js, Tone.js) and list their components by
category, then build them in Lory and Kite, check each for parity, bring
them to VR and AR, publish them on Lory's GitHub Pages and make Lory public
under Crow's license, deciding by recommendation where his input is needed.

- **The catalog** (docs/components/README.md): 379 rows over 17
  categories, merged from 1,235 survey rows, each naming the module that
  will hold it. A component is original code: behaviour is re-implemented
  from the references' documentation, and their source, prose, paths and
  data are not copied.
- **Parity means three checks**, all run: the reference's behaviour as
  test blocks (keyboard maps, states, events and their order), and its
  numbers from the reference itself run at a pinned version where it
  computes them (a script writes JSON that a Crow test holds Lory to, as
  tests/kite/reference.py does); both of Crow's modes; and the browser.
- **gui's core** (gui.co, docs/components/gui.md) grew what the
  components are made of:
  - Containers: a grid, an overlay, a header, a divider, and words at a
    size and tone. Rows justify and columns align.
  - Controls: an item pressed as one, a checkbox, a radio group, tabs, a
    nav, a disclosure and a bar of progress. A field now has a caret, a
    selection, a password or number kind, a hint, and lines. A slider has
    steps and Radix's keys.
  - Layers, drawn over the rest after the tree (decision 10): placed
    against a control as Floating UI places a Radix popover, or at a place
    of the page. Modal layers trap the focus and block the pointer, and a
    layer is dismissed by Escape and outside presses. Focus goes in when a
    layer opens and comes back when it closes. A layer is held open by the
    program or by Lory. On layers stand a dropdown, a modal dialog, a
    drawer, a toast that times out, and tips after a hover delay.
  - A select's list is now a layer, so it flips at the page's end and
    stands over a dialog.
  - Focus groups that are one Tab stop moved through by arrows (roving
    focus).
  - Controls set aside (`disabled`).
  - Moved, faded and scaled controls, which the pointer finds where they
    are drawn: what motion drives.
- **Tests:**
  - gui.co: 28 blocks, 180 truths (30 and 188 by the evening). A test
    block runs in the interpreter even under `crow test --compiled`,
    which compiles only the apps a block opens; what gui computes is
    compiled in the web builds and checked in the browser.
  - tests/gui/placement.co: holds `gui.anchored` to 1,200 placements that
    @floating-ui/core 1.7.5 computes with Radix Popper's middleware
    (tests/gui/placement.mjs writes them). All pass in both modes, and
    ./test.sh runs it.
  - The controls example presses its field at its end: a press now puts
    the caret where it lands, as a browser's field does.
- **Found on the way, in Crow:**
  - A bool function of gui's recursing on `k.kids[0]` lowered to
    "returns Result(Bool) from a body typed Bool", but only where another
    program imports gui (window/main.co). An overlay now keeps whether it
    stretches in its node.
  - A local or parameter named like a builtin (`now`, `later`, `pop`,
    `open`) is refused, and gui's own calls name its `text` `_worded`.
  - An empty typed list of float lists is a tensor that needs its row's
    length (`slice[[[0.0, 0.0, 0.0, 0.0]], 0, 0]`).

## The components, area by area (2026-11-14)

Each area is built by a builder of its own in a copy of Lory, delivered as
new files only, then checked again here and wired in: its tests and its
reference in `./test.sh`, its page in the catalog and on the site, its
example on the examples page.

- **Both modes, held by programs.** A test block runs in the interpreter
  even under `crow test --compiled`. So each area writes what it computes
  on fixed inputs in a program, `tests/modes/<area>.co`, and
  `tests/modes.sh` runs it in both modes and holds the two outputs equal,
  line for line, as Crow's own parity programs are held.
- **Colours and themes** (`lory.colors`, docs/components/colors.md):
  - 31 twelve-step scales in light and dark, with their translucent steps.
  - Conversions, mixing, WCAG 2 and APCA contrast.
  - Radix Themes' tokens as a `Theme`, Vuetify's palette and the text it
    puts on a colour, and Semantic UI's named colours and their shades.
  - Held to culori, apca-w3, Vuetify, Semantic UI's LESS and Radix Themes
    at pinned versions: 4,135 numbers and every hex equal.
  - The scales are Lory's own, measured against Radix's (a mean of 0.009
    in lightness), and keep Radix's contrast promise in all 248 cases,
    where Radix's published scales miss 19.
  - Its swatches are checked pixel by pixel in Chrome.
  - packages/lory/NOTICE credits what Lory measures itself against.
- **Words in an accent are made readable.** gui writes the `accent`,
  `danger`, `success` and `warning` tones, the chosen tab and a select's
  chosen choice in a colour moved toward black or white until it reads at
  4.5 to 1 on the panel (WCAG 2's least for words). A theme's accent is a
  fill, step 9, which on a light panel read at Lc 12.5 for yellow. The
  looks' own accents read already and are kept. The light look's green
  and amber words, at 3.3 and 3.2 to 1, are now darker.
- **AR.** Crow's page enters a headset with the room seen through the
  drawing: Enter AR, or `@ar`. A frame says `ar` and `blend`, and plays a
  sound the program made (`@sound`). This is in Crow's checkout, not yet
  installed.
  - Lory clears the frame to nothing where the room shows
    (`lory.seen_through`).
  - The scene example leaves out its ground there.
  - Studio enters AR and paints a made-up room behind the drawing. Its
    walk `studio/walks/controls_ar.json` holds the room seen around the
    panels and not through them.
  - docs/components/xr.md says how every component works in a headset.
- **A headset's thumbstick scrolls.** A stick pushed is a wheel turned
  where the ray rests, so every scroll area, list and table turns in VR.
  A room's program still scrolls its own page.
- **3D shapes** (`lory.geometry`, docs/components/3d.md): three.js's core
  geometries (boxes, spheres, tori, knots, lathes, tubes, polyhedra, shapes
  and their extrusions, curves and paths), their edges and wireframes, laid
  out as three 0.187.0 lays them out, bit for bit in 108 cases (162,004
  numbers). Its example chooses a shape, changes its numbers and turns it,
  checked in Chrome. Indexed meshes, line parts and vertex colours in
  `lory.space` come next, with three's examples.
- **Motion** (`lory.motion`, docs/components/motion.md): every easing of
  anime.js, Motion, CSS and AOS by name, springs (retargeted keeping their
  velocity), inertia, keyframes, timelines, staggers, timers held between
  frames, presence, scroll progress and AOS's reveals. Held to anime.js
  4.5.0, Motion 14.7.1 and AOS 2.3.4: 9,840 numbers, 96.8% bit for bit and
  the rest within 2 parts in 2^52 (the system's sin and exp against V8's).
  FLIP layout animation is not built: it needs gui's boxes held from frame
  to frame.
- **Tables** (`lory.datatable`, docs/components/datatable.md): TanStack
  Table's row models (filtered, grouped, sorted, expanded, paged), its
  column state (visibility, order, pinning, sizes, header groups), row
  selection and pinning, match-sorter's fuzzy ranks, and Grid.js's search,
  sort and pages: 121,906 values held to @tanstack/table-core 9.3.1 and
  Grid.js 6.2.0, none differing. Its example, three hundred people, runs in
  a headset too. It found a fault in gui's table, fixed here: a release
  just under a table held short chose the row hidden there.
- **Forms and editors** (`lory.forms`, `lory.editors`,
  docs/components/forms.md): toggles, a switch, stars, cards, a range
  slider, a stepper, a password, a one-time code, a combobox, masks,
  Semantic UI's 25 rules and its form's checking, linked fields, a colour
  picker, a file zone, a Markdown editor with its preview and an image
  editor's marks. Held to Vuetify 4.3.3 (591 cases), semantic-ui-form
  2.5.0 (146) and commonmark 0.31.2 (44 trees), none differing.
- **Menus, overlays and disclosure** (`lory.menus`, `lory.overlays`,
  `lory.disclosure`, docs/components/menus.md): dropdown and context menus
  (with a touch hold), a menubar, a navigation menu, a command palette with
  cmdk's scores, a speed dial; dialogs, popovers, hover cards, tooltips
  with Radix's grace hull, toasts with its swipe, snackbars, sheets,
  banners and dimmers; accordions, collapsibles and checkbox trees. 2,853
  answers held to cmdk, Radix Primitives and Vuetify.
- **Navigation and display** (`lory.navigation`, `lory.display`,
  docs/components/display.md): app bars that hide, collapse and fade on
  scroll, bottom navigation, breadcrumbs that collapse, menu bars,
  pagination (Vuetify's and TOAST UI's), steppers and toolbars; avatars,
  badges, cards, chips, lists, comments, feeds, statistics, timelines,
  skeletons, spinners, loaders, keys and shortcuts, highlights, images,
  galleries with a lightbox, alerts and callouts. 15,235 numbers held to
  Vuetify, TOAST UI, MUI and Radix Themes.
- **Maps** (packages/map, `use map`, docs/components/maps.md): a map of
  raster tiles kept by id: dragged with inertia, zoomed by the wheel,
  pinch and keys, flown and eased, bounded; GeoJSON layers styled and
  restyled, markers (any icon), circles in metres, clusters, a heat layer,
  popups and tooltips, controls and a scale. Held to Leaflet 1.9.4 on
  3,634 numbers (3,413 the same float, the rest within 3.4e-14), and
  checked in Chrome with its tiles faked: 14 of 14.
- **Dates and times** (`lory.calendar`, `lory.pickers`,
  docs/components/pickers.md): days, weeks, zones, five locales, date-fns'
  formats and parses (9,732 cases held to date-fns 4.1.0), day rules and
  holidays, a month view and a scheduler of month, week and day; twelve
  pickers (a day, a range, days, a week, month, quarter, year, time, and
  day and time) with react-datepicker's keys and bounds, held case by case.
- **Icons** (`lory.icons`, docs/components/icons.md): 404 names and 371
  drawings of Lory's own on a 15-unit grid: Crow ui's names, Radix Icons'
  318 and those other areas need. Any size and colour, turned, flipped and
  spinning as Semantic UI turns them; no two drawings alike, each inside
  its square, checked in Chrome. Brand marks and flags are images to load,
  not drawn.
- **Carousels** (`lory.carousel`, docs/components/carousel.md): every
  setting of react-slick's carousel but those of its DOM and CSS, held to
  react-slick; Vuetify's window and slide group; Motion's ticker.
- **Charts** (`kite.charts`, docs/components/charts.md): every kind of
  chart Chart.js 4.5.1 draws, its scales, legends, tooltips and
  animations, held to Chart.js's numbers and checked in Chrome.
- **Scrolling** (`lory.scrolling`, docs/components/scrolling.md):
  fullPage's sections and slides, Lenis's smoothing, AOS's reveals,
  Motion's scroll-linked progress, Radix's scroll area, Vuetify's and
  TanStack's virtual lists, infinite scroll, pull to refresh, sticky and
  parallax.
- **Drag and drop** (`lory.drag`, docs/components/drag.md): SortableJS's
  lists (354 events held in Chrome), Motion's free drags, cards, swipes, a
  reveal, a pinch and a honeycomb.
- **Model files** (`lory.models`, docs/components/models.md): OBJ, MTL,
  STL, PLY, PCD, XYZ, VTK and OFF read, and OBJ, STL, PLY and glTF
  written, as three.js 0.187.0 reads and writes them.
- **Vue's, Solid's and Lit's examples** (examples/vue, examples/solid,
  examples/lit; Vue's 313 steps and 1,151 fields held): each
  built in Lory and held to the original in headless Chrome.
- **Sound** (packages/sound, docs/components/sound.md): Tone.js 15.1.22's
  synths, effects, filters, dynamics, transport and analysers, rendered in
  Crow and held to Tone as Chrome renders it; played through the page's
  `@sound`.
- **3D scenes** (`lory.space`, `lory.controls`, `lory.flip`,
  docs/components/space.md): three.js's looks (materials, lights, fog,
  textures, copies, clipping, shadows, helpers, views), held to three
  0.187.0's pictures in headless Chrome (22 of 24 scenes the same in every
  pixel); fly, trackball and drag controls; Semantic UI's Shape; SVG paths
  and marching; examples/threejs, 35 scenes, every one in a headset.
- **Grids** (`lory.datagrid`, docs/components/datagrid.md): cell ranges
  and spans as TanStack's table-core 9.3.1 has them, editing with rules
  and drafts, TOAST UI Grid 4.21.22's keymap, copy and paste, a realtime
  feed that flashes, and 7GUIs Cells; 47,578 values held, built on
  lory.datatable's models.
