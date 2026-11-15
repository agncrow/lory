# Lory — design

**Status: decided 2026-11-07, being built** (docs/progress.md says how
far). Written from a conversation with Vijay. What he decided is marked
*(Vijay)*. He approved the Crow changes below, the two reversed rulings
and the web build target, and asked that every open question be decided
by recommendation. Those decisions are under "Decisions" at the end.
Lory is a package of its own repository (agncrow/lory), licensed MIT or
Apache-2.0 as Crow is (Vijay, 2026-11-14; it had been under the Business
Source License 1.1, as Magpie and Myna are).

## The goal

One engine, written in Crow, that draws charts and graphs for data
science, financial charts (candles, volume, indicators), 3D views and
games, and the controls around them, in a web browser on a desktop, on a
phone, and in a VR headset (Meta Quest), from one program.

Decided in the conversation:

1. **The browser is the platform** on all three (Vijay). The Quest's
   browser runs WebXR, so one program reaches the headset with no store,
   no Android build and no second codebase. A native headset app through
   OpenXR is not planned.
2. **WebGL2 draws** (Vijay). VR rules out Canvas 2D and SVG, since WebXR
   draws only through WebGL or WebGPU, and a million-point chart rules
   them out as well. WebGPU is the later backend: its support inside
   headsets is still arriving.
3. **Crow compiles to WebAssembly, not to JavaScript** (Vijay). Crow
   already compiles to Rust and Rust to `wasm32`, so no new code
   generator is needed. A JavaScript backend would be a third backend
   held to parity, and Crow's ints, which grow past 64 bits, would be
   BigInts in JavaScript (slow) or wrong. A small JavaScript file
   written by hand, with no npm, forwards calls to WebGL and WebXR and
   does no work of its own.
4. **All controls and graphics are in the WebGL environment** (Vijay):
   no switching between an HTML page and a graphics view. Buttons,
   menus, forms, tables and text are drawn by the engine beside the
   charts, the same way on every device, so the headset is not a
   different place from the desktop.
5. **Myna moves onto the engine after the engine is built** (Vijay), not
   during it. Myna is the first real application, not the test bed.

## Rulings this reverses

Both rulings were right for what they were deciding. The VR goal changes
the question, and the costs they named have to be paid on purpose.

- **docs/roadmap.md, "Client-side WASM — rejected."** That ruling refused
  a client framework: a reactive runtime in the browser, React rebuilt.
  This design runs WebAssembly in the browser for *drawing* (the layout
  engine, the renderer, local interaction) and keeps the application's
  state on the server as today (below, "Where code runs"). Games are the
  exception: their logic must run in the browser, since a round trip per
  frame is impossible. That part is a client runtime, and it is decided
  only when the game layer is (phase 6).
- **docs/ui-engine-design.md, "Canvas rendering (Flutter-Web model) …
  Rejected"**, for discarding the DOM: selection, accessibility,
  find-in-page and native inputs. Decision 4 accepts that trade for
  pages drawn by the engine. Each loss gets an answer, below ("What a
  drawn page loses"), and the HTML renderer stays for the pages that
  want the DOM.
- The same document recorded "the same engine compiled to WebAssembly"
  as the fallback for local layout and rejected it as an unwanted second
  build. Here it is the main path.

## The central idea: one view vocabulary, a second renderer

Crow already has a closed UI vocabulary (elements, the containers
`stack`, `row`, `grid`, `overlay`, `scroll`, the layout attributes,
tokens instead of CSS) and a layout engine **written in Crow**
(`src/modules/layout.co`) that turns a view into boxes (x, y, width,
height, resolved colours) for a viewport, held to browsers by
`tests/layout/conformance.co`. docs/ui-engine-design.md planned a
"desktop shell" that paints those boxes itself (its phase 4, never
built).

**The WebGL renderer is that shell.** A program does not learn a second
widget toolkit. The view it writes today is laid out by the same engine
and painted by the GPU instead of turned into HTML (design rule 1: one
way to do things). Charts follow the chart module's doctrine (docs/
chart-module-design.md: a chart is a view over a frame, declarative, no
draw calls), and 3D follows it too: **a scene is a view over state**,
re-derived when the state changes and diffed so the GPU gets only what
changed.

A page is drawn when its program is built for the web
(`crow build --target web`) and paints through Lory. Everything on it is
drawn. A page served as HTML stays HTML (Decisions, 3 and 4).

## Layers

| Layer | Holds | Written in |
|---|---|---|
| Host | WebGL2 and WebXR calls, typed-array uploads, `requestAnimationFrame`, input events, the glyph atlas, WebAudio, clipboard, requests to the server | Two rows (`sys.paint`, `sys.frames`) and `crow.js`, one hand-written file that runs a batch's calls and describes each frame (design rule 20: primitives native) |
| Renderer | Buffers, shaders (GLSL as Crow text), pipeline state, one command list per frame, batching, instancing | Crow |
| Math | vec3, mat4, quaternions, frustums, rays | Crow (bulk work as kernels where measurement says so) |
| Layout | Boxes from views, real font metrics | Crow (the existing engine) |
| Text | A signed-distance-field font atlas: sharp at any zoom and in VR | The atlas made by the host from the browser's fonts (a distance transform in `crow.js`), its metrics handed to the program in the frame; layout and drawing in Crow |
| Controls | Every element of the UI vocabulary painted, focus, scrolling, hit-testing | Crow |
| Plotting | Scales, ticks, axes, legends, lines, scatter, candles, volume, heatmaps, surfaces, pan and zoom | Crow over the chart geometry kernel (`crow_runtime::chart`, design rule 12) |
| Scene | Node tree, transforms, cameras, materials, lights, glTF | Crow |
| XR | Stereo views, controllers and hands as pointer rays, panels placed in 3D, comfort rules | Crow |
| Game | Entities, a fixed-step loop, input, audio, simple physics | Crow (phase 6) |

## Where code runs

- **On the server, as today:** the application's state (facts,
  handlers, derivations, queries). Myna's data stays where it is.
- **In the browser (WebAssembly):** the layout engine, the renderer and
  everything local to the device: hover, scrolling, dragging a slider,
  moving the camera, pan and zoom, the VR pointer. These must be instant
  (docs/ui-engine-design.md constraint 2), so they never wait on the
  network.
- **Between them:** today the browser sends events over a WebSocket and
  the server answers with HTML patches. A drawn page needs the view
  *tree* as data rather than as HTML, and the browser diffs and paints
  it. The events stay the same.
- **Games** run their logic in the browser (phase 6), so their state is
  the device's. How a program says which state is the device's is the
  game layer's main design question.

## Performance rules

1. **Crow does work in proportion to what changed, never to the number
   of vertices.** Per-item Crow code pays the language's price per
   operation (CLAUDE.md: a CSV parser in Crow ran 20–45× slower than the
   kernel). The GPU does per-vertex work.
2. **Instancing for data.** A million candles are one quad drawn a
   million times, with open, high, low, close and time as per-instance
   attributes. The vertex shader builds each body and wick, so data is
   uploaded once and the camera moves.
3. **Draw what a pixel can show.** A long time series is drawn as min,
   max, first and last per pixel column (the M4 method): exact on
   screen, a few thousand points instead of millions.
4. **64-bit origins.** Shaders compute in 32-bit floats, and a timestamp
   (`1.7e9`) plus seconds loses the seconds, so candles jitter. Subtract
   the view's origin in 64 bits before upload.
5. **One crossing per frame.** WebAssembly to JavaScript calls cost a
   little each, so the engine hands the host one command batch per
   frame, not thousands of GL calls.
6. **The headset's budget.** Quest 3 runs at 72, 90 or 120 Hz: 13.9,
   11.1 or 8.3 ms per frame for both eyes. Both eyes are drawn in one
   pass (`OVR_multiview2`), and draw calls stay in the hundreds.
7. **One thread at first.** WebAssembly threads need SharedArrayBuffer,
   and that needs COOP/COEP headers. Threads come later.
8. **Download size.** The runtime crates are built for the web without
   what a browser cannot use, then `wasm-opt`. The spike measures the
   size and the start time.

## What a drawn page loses, and the answer to each

| Lost | Answer |
|---|---|
| Native text input: keyboards, the phone's soft keyboard, input methods for other scripts, autofill | A hidden HTML input holds the focus and the keyboard; the engine draws what it holds. In VR, the engine draws its own keyboard |
| Accessibility (screen readers) | A hidden tree of the page's roles and labels, kept beside the drawing, which is how Flutter's web build answers it |
| Selecting and copying text | Selection drawn by the engine, copying through the browser's clipboard API |
| Find in page | The engine's own find, over the view tree it holds |
| Browser zoom and font size | The engine's own scale, read from the device's pixel ratio |
| Links, back and forward | The page's address stays the browser's: navigation updates the URL as today |

## Testing

Both modes hold to one behaviour (design rule 11) although only the
compiled engine runs in a browser:

- **Command-list parity.** Every frame is an ordinary Crow value: draw
  calls, buffers and uniforms. Parity programs compare it between
  `crow run -i` and `crow run`, as the parity corpus compares outputs.
- **Images.** A page is drawn in headless Chrome (SwiftShader's WebGL2,
  on the CPU) and its pixels read back and compared with what the test
  states (tests/web_target.rs in Crow; tests/pixels in Lory).
- **Layout.** Drawn views are laid out by the engine
  `tests/layout/conformance.co` already holds to browsers, so a drawn
  page's boxes are the HTML page's boxes.
- **Harness.** `app[]`, `click[]` and the other truths work on drawn
  pages as they do on HTML pages, and VR input is a pointer ray the
  tests can aim.
- **The browser is the last mile.** A short script on the real devices
  (desktop Chrome and Safari, a phone, the Quest) confirms what headless
  rendering cannot. It is outside `crow test`, as the book's browser
  check is.

## Compiler and language changes (design rule 24: approved by Vijay)

1. **A web build target** (`crow build --target web`), built 2026-11-07:
   the emitter's output built as a `cdylib` for `wasm32-unknown-unknown`,
   the runtime crates built for it (no TLS, no rayon threads, no
   mimalloc; the clock, the console and random numbers from the page),
   and the page (`index.html`, `crow.js`). A program reaching what a
   browser cannot run (a file, a socket, a process, a database, mail, a
   wait, a server) is refused before anything is built.
2. **Two rows** in `sys`: `paint[batch]` hands the page a batch of WebGL2
   calls, `frames[f]` asks it to call `f[frame]` before each frame; the
   effect kind `drawing`. Outside a browser there is no page and no frame,
   in both modes, so a program's drawing is tested as the batches it
   builds.
3. **No frame handler syntax** and **no view tree over the wire** in the
   compiler: a frame is `sys.frames[f]`, state between frames is process
   memory (`use memory`), and a drawn page talks to its server through the
   host (a request call in a batch, its answer in a later frame).

## The plan

Each phase ends with something working on the devices and its tests in
the gate. No phase starts before the one before it passes.

0. **Spike: prove the chain** (days). A Crow program built for
   WebAssembly clears a canvas to a colour, draws a triangle, then draws
   it in stereo in a WebXR session on the Quest over HTTPS. Measure the
   download size and the start time. Settle whether `wgpu` can draw into
   WebXR's layer or whether the engine needs a thin GL layer of its own.
   *Exit:* the triangle in the headset, and the measured numbers in this
   document.
1. **The renderer and text.** Buffers, shaders, the command list,
   batching, signed-distance-field text, the parity and image harness.
   *Exit:* text and shapes drawn identically in both modes and in
   Chrome, Safari and the Quest.
2. **Drawn views.** The UI vocabulary painted from the layout engine's
   boxes, with real font metrics (the engine's text widths are still a
   placeholder average), mouse and touch input, focus, scrolling, the
   hidden text input, events to the server, the view tree on the wire.
   *Exit:* a page with a form and a table looks and behaves the same
   drawn and as HTML, box for box.
3. **Plotting.** Lines, scatter, candles, volume, indicators, heatmaps,
   axes and legends, pan and zoom, the M4 reduction, 64-bit origins.
   *Exit:* a year of one-minute candles panned and zoomed at 60 frames
   a second on a phone.
4. **3D.** Math, the scene graph, cameras, glTF, basic lighting, 3D
   scatter and surface plots. *Exit:* a 3D plot orbited by mouse and
   touch.
5. **VR.** The WebXR session, stereo in one pass, controllers and hands
   as pointer rays, drawn views placed on panels in space, the VR
   keyboard, comfort rules (no camera motion the user did not cause).
   *Exit:* a page with controls and a chart used entirely inside the
   headset at its frame rate.
6. **Games.** Client-side state (its design decided here), the frame
   handler, entities, input, audio, simple physics. *Exit:* a small
   game playable on all three devices.
7. **Myna on the engine** (Vijay: after the engine). Myna's pages drawn,
   its charts on the plotting layer, its experiments browsable in VR.
8. **Depth.** Physically based materials, shadows, post-processing,
   level of detail, and the WebGPU backend.

## Decisions (by recommendation, 2026-11-07)

1. **Where it lives:** a package, `packages/lory` of agncrow/lory, BSL 1.1
   *(Vijay)*. Since 2026-11-14 it is MIT or Apache-2.0, as Crow is, and the
   repository is public *(Vijay)*.
2. **Its name:** Lory, after the lorikeet: the `(o.o)` face in VR goggles,
   in a lorikeet's colours *(Vijay)*.
3. **How a page says it is drawn:** by being built for the web. One way: a
   drawn program is a Crow program that paints through Lory and is built
   with `crow build --target web`. There is no page option and no `scene`
   container in `ui`.
4. **Drawn and HTML pages both remain.** A document, a form a screen
   reader must read, or a page that needs find-in-page stays HTML; a
   workbench, a chart, a game or anything for the headset is drawn.
5. **HTTPS for the headset:** none needed while developing: `adb reverse
   tcp:<port> tcp:<port>` makes the Quest's `localhost` the computer's,
   and `localhost` is a secure context. Deployed, the page is static
   files any HTTPS host serves.
6. **wgpu or a GL layer of our own:** our own, through the batch. wgpu's
   web backend needs wasm-bindgen and its own JavaScript, would be a second
   path to the context WebXR's layer gives, and draws nothing a GL batch
   cannot.
7. **The controls' layout.** Crow's layout engine (`layout.co`) lays out
   nodes parsed from markup a server rendered. A drawn page has no server
   render, so Lory lays out its own tree of the same vocabulary: `stack`,
   `row`, `grid`, `text`, `button`, `input`, `slider`, `toggle`, `select`,
   `table`, `chart`, `panel`. Its spacing scale, font sizes and line
   heights are layout.co's, and a test holds Lory's boxes to layout.co's
   for the same tree. A control the program draws stands in the tree as
   these do (`gui.drawn`, Vijay, 2026-11-14). Its node holds the
   program's function, which Lory calls in the same pass, where the
   control stands. It is handed the control's box and what the reader is
   doing to it (hover, press, focus, the pointer, keys), and Lory takes
   back its drawing and its events.
8. **State between frames** is process memory (`use memory`: `remember`,
   `recall`, `revise`), Crow's existing way to keep a value across calls.
   A frame's function reads the state, applies the frame's input, draws,
   and writes the state back.
9. **Input** arrives in the frame: `frame.input` lists what happened
   since the last frame (pointer down, move and up, the wheel, keys, text
   typed, the headset's controllers and hands as rays and buttons), and
   `frame.pointer` says where each pointer is.
10. **What is drawn over the rest** (2026-11-14, by recommendation): a
    `gui.layer` is met in the tree's pass but drawn after it, over
    everything, taking no room where it stands. It is placed as Floating
    UI places a Radix popover (offset, then shift with limitShift, then
    flip), and a test holds it to that library's answers.
    - The pointer cannot reach what is under a layer. It uses the boxes
      layers had last frame, among the layers still in the tree, so a
      press is never sent to a control a layer covers.
    - A modal layer blocks everything, keeps Tab and keys to itself, and
      dims the page.
    - Escape and a press outside dismiss a layer, and the program hears
      it as an event. A layer is open while the program puts it in the
      tree, or while Lory holds it, opened by the control `opens` names.
    - Focus moves in as a layer opens and back as it closes.
    - The components (menus, dialogs, popovers, toasts, pickers) are
      compositions of these layers in modules of their own (`lory.menus`,
      `lory.overlays`, and the rest, docs/components/README.md). None of
      them reaches into gui.co.

