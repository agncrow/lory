# Components in a headset: VR and AR

Every component in Lory's catalog is drawn by Lory itself, in WebGL, so the
same component runs on a screen, in a VR headset and in an AR one. Nothing is
rebuilt for a headset: a component is made of `lory.gui`'s controls, and gui
reads a headset's input as it reads a mouse's. This page says what changes in
a headset, what a program does about AR, and how both are checked.

## Entering a headset

A page built by `crow build --target web` enters a headset in one of two ways:

- **The page's own buttons.** Enter VR shows where a headset can be entered.
  Enter AR shows where one can be entered with the room seen through the
  drawing (WebXR's `immersive-ar`, on a Quest 3 for one).
- **A button the program draws.** It is pressed in a frame, and the program
  then paints `[["@vr"]]` or `[["@ar"]]`. A browser enters only on the
  reader's press. Where none can be entered, the failure comes back in a
  later frame's `said` (`what` `vr` or `ar`, with `failed`), never silently.

Each frame tells the program where it is:

| Field | What it says |
|---|---|
| `xr` | A headset shows the frame |
| `vr` | One can be entered |
| `ar` | One can be entered with the room seen through it |
| `blend` | What is seen behind the drawing. `opaque` on a screen and in VR. `alpha-blend` or `additive` in AR |

The AR fields came to Crow's page on 2026-11-14 (crow.js and the page's
Enter AR button). A page built by an older crow enters VR only.

## What a component does in a headset

- **Where it is drawn.** The page is drawn on a panel 2 m wide, 1.5 m ahead
  of the reader, with its top 1.8 m up. The page is 1000 by 560 pixels there,
  so a page pixel is 2 mm: 14-pixel words stand 19 mm tall at a metre, near
  the 20 mm a headset's words are asked to be. A program can stand panels
  about the reader instead (`lory.xr`'s room, and the `window` package's
  host for many programs), and every component works on any of them.
- **The pointer.** A controller's ray, where it meets the panel, is the
  pointer. The right hand's ray wins, or else the first that meets the panel.
  Its trigger presses, and the trigger held while the ray moves drags
  (sliders, drag and drop, swiped carousels and cards). The ray resting on a
  control is hover, so hover states light and tips show. Lory draws a dot
  where the ray meets the panel.
- **Scrolling.** A thumbstick pushed turns what the ray rests on, as a wheel
  turns it on a screen: scroll areas, lists, tables, a sideways carousel.
  Pushed away it goes up the page. A stick within its rest (0.15) turns
  nothing. A room's own program scrolls its page itself (`xr.stick`).
- **Typing.** A headset's browser shows no keyboard over an immersive page.
  So a field with the focus gets a keyboard drawn under it (`gui.keys_of`),
  its keys pressed by the ray.
- **Layers.** Menus, popovers, dialogs, drawers, toasts and tips are drawn
  on the panel over the page, placed as on a screen. A modal's scrim darkens
  the panel only.

## AR: the room seen through the drawing

In AR, `lory.seen_through[c]` is true, and Lory clears the frame to nothing
(alpha 0) whatever colour the program asked for. The room is seen wherever
the frame draws nothing. Panels, cards and controls keep their own fills, so
they stand in the room as solid things.

A program should draw no backdrop that would hide the room. A scene in
three dimensions (`lory.space`) should leave out its ground where
`seen_through` is true, so its things stand on the reader's own floor. Its
sky is the room's already, because the frame is cleared to nothing. The
scene example does this (`examples/scene/main.co`, tested).

## How it is checked

| Check | What it holds | Where |
|---|---|---|
| gui's tests | A scroll area turned by a headset's thumbstick | `packages/lory/gui.co` |
| The renderer's tests | A thumbstick is a wheel where the ray rests, by the frame's time step, with nothing within its rest. A headset that shows the room is cleared to nothing; VR and a screen are cleared to the colour asked | `packages/lory/main.co` |
| The controls example | A field in a headset typed into by its drawn keyboard | `examples/controls/main.co` |
| The scene example | In AR its ground is not drawn: the reader's floor is the ground | `examples/scene/main.co` |
| Each area's tests | The area's components pressed, dragged and scrolled in headset frames | `tests/<area>/`, and each area's own page |
| Studio's walks | The scene example entered as a headset enters it, pointed at, looked about and walked through (VR). The controls example entered in AR, the room seen around its panels and not through them. Each picture is held to the one kept | `studio/walks/scene.json`, `studio/walks/controls_ar.json` |
| Crow's page | A frame's `vr` and `ar`, and entering none said, never silent | Crow's `tests/web_target.rs` |
| A real headset | Lory's room and its controls, worn in a Quest 3 (2026-11-12, VR) | `docs/progress.md` |

Studio's walks run in a made-up headset in headless Chrome
(`python3 -I studio/studio.py walk WALK.json`). In AR, Studio paints a made-up
room behind what the frame leaves transparent.

## Areas in a headset

Each area's own page has its headset tests. This table says where each area
stands.

| Area | Headset |
|---|---|
| Controls (`lory.gui`) | Pressed, typed and scrolled in headset frames; walked in AR |
| Motion (`lory.motion`) | The example's curves pressed by the ray, its page scrolled by the thumbstick, cleared to nothing in AR |
| Icons (`lory.icons`) | Drawn for both eyes; the sheet scrolled by the thumbstick |
| Data table (`lory.datatable`) | The example's Next pressed by the ray, its table scrolled by the thumbstick to a row then chosen, cleared to nothing in AR |
| Data grid (`lory.datagrid`) | A cell chosen by the ray's trigger, the rows scrolled by the thumbstick, no backdrop in AR |
| Forms (`lory.forms`, `lory.editors`) | A star rated by the ray, a code digit and Markdown typed on the drawn keyboard, a pen mark dragged by the ray |
| Navigation and display (`lory.navigation`, `lory.display`) | A ray's press in headset frames in each module |
| Menus, overlays, disclosure | A ray's press in headset frames in each module |
| Maps (`map`) | The trigger presses and drags the map, the thumbstick zooms it |
| Dates and times (`lory.pickers`) | A picker driven in headset frames; a day pressed by the ray |
| Carousels (`lory.carousel`) | Swiped by the ray held on a list; arrows, dots, panes and the slide group pressed by the ray |
| Charts (`kite.charts`) | A legend item pressed by the ray, a mark's tooltip under the ray |
| Scrolling (`lory.scrolling`) | The thumbstick scrolls what the ray rests on; the ray presses the section dots |
| Drag and drop (`lory.drag`) | An item carried by the ray within its list and into another; a card swiped away by the ray |
| Sound (`sound`) | A key pressed by the ray plays; a sound placed in the room is heard from where it stands, by the headset's place |
| 3D scenes (`lory.space`, `lory.controls`) | Every scene drawn for both eyes; the ray picks, the trigger pulls, the sticks walk and turn; dragging, a ball shooter, paint and teleport; in AR the floor and walls are left out |
| Model files (`lory.models`) | The model stands beside the page; the ray presses its buttons |
| Vue's, Solid's and Lit's examples | The page is a panel: a ray's press changes an example (Vue's CRUD typed on the drawn keyboard), the thumbstick scrolls the menu or a sheet |
