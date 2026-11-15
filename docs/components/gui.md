# lory.gui: the controls every other component is made of

`lory.gui` (packages/lory/gui.co) is Lory's immediate-mode controls. A view is
a tree rebuilt from the program's state each frame, in the vocabulary of
Crow's own `ui`. `gui.show` lays it out, draws it on the canvas and answers
it from the frame's input in one pass. What a control holds between frames
(the focus, a field's caret, a scroll, which layers are open) is Lory's, kept
in `use memory` under `lory.gui`. What it shows is the program's.

The component modules (`lory.forms`, `lory.menus`, `lory.overlays` and the
rest, listed in [README.md](README.md)) are compositions of these
primitives. They need no access to gui's insides: a menu is a `layer` of a
`roving` group of `item`s, a combobox is a `field` with a `layer` against it,
a toast stack is `toast`s at a corner.

## The vocabulary

### Containers

| Function | What it is |
|---|---|
| `column[kids, gap = 10, align = '', pad = 0]` | Controls one above another. `align` is `start`, `center`, `end` or `stretch`. |
| `row[kids, gap = 10, align = '', justify = '', pad = 0]` | Controls side by side. `justify` is `start`, `center`, `end`, `between` or `around` (a justified row is as wide as its column). |
| `panel[kids, gap = 10, pad = 16]` | A card: a column on a raised ground. |
| `grid[kids, columns = 2, gap = 10]` | Cells in equal columns, left to right, then top to bottom. |
| `overlay[base, top, anchor = 'top_right']` | `top` drawn over `base` at one of nine anchors (a badge). The pointer over `top` reaches it, not `base`. |
| `header[kids, justify = 'between']` | An app bar: a raised row with an edge under it. |
| `scroll[id, tall, kids]` | A column `tall` high whose controls scroll. |
| `space[tall]`, `sized[n, wide]`, `divider[]` | Room; a control at a width; a rule across a column or down a row. |

### Words and controls

| Function | What it is |
|---|---|
| `text[words, size = 15, tone = 'ink']` | Words at a size, in a tone: `ink`, `muted`, `accent`, `danger`, `success` or `warning`. |
| `heading`, `label`, `note` | The type scale's heading, label and smaller, quieter words. |
| `button[id, words]` | Pressed by the pointer, Enter or Space: `press`. |
| `item[id, kids, chosen = false, words = '']` | A row pressed as one: an entry of a list or a menu, or a card. |
| `field[id, value, kind = 'text', hint = '', lines = 1]` | Typed in at a caret with a selection. `kind` is `text`, `password` or `number`. `lines` above 1 makes a text area. Its events are `edit` and `submit`. |
| `slider[id, value, lo, hi, step = 0]` | Dragged, or keyed: arrows move one step, Shift+arrow or Page Up/Down ten, Home/End to the ends. |
| `toggle[id, words, on]`, `checkbox[id, words, on, mixed = false]` | A switch and a ticked box: `toggle`, `num` 1 or 0. |
| `radio[id, choices, chosen]`, `tabs[id, choices, chosen]`, `nav[id, places, active]`, `select[id, choices, chosen]` | One of several: `choose`, with the choice's words and place. |
| `details[id, words, kids, expanded = false, held = false]` | A disclosure. Its summary is pressed to show or hide its kids. `held` means Lory keeps whether it is open. |
| `progress[value, most = 1, wide = 0]` | A bar. A value below 0 means going on, its end not known. |
| `table[id, header, rows, tall]`, `chosen[n, i]` | Rows of text under a header, a row chosen by press. |
| `area[id, wide, tall]` | A box the program draws into after the tree. |
| `drawn[id, value, wide, tall, painter, lo, hi, words]`, `tell[d, act, words, num]` | A control the program draws in the tree's own pass (decision 7). |

### Layers: what is drawn over the rest

`layer[id, kids, at, side, align, gap, place, modal, scrim, dismiss, focused,
held, wide, pad, bare, fade]` is drawn after the tree, over everything, and
takes no room where it stands. It is placed in one of two ways:

- Against a control (`at` names it, or where the layer stands in the tree).
  It goes on a `side` (`top`, `bottom`, `left`, `right`), `align`ed along it
  (`start`, `center`, `end`), `gap` away. It flips to the other side where
  the page has no room and shifts along to stay on the page, as Floating UI
  places a Radix popover.
- At a `place` of the page: `center`, an edge, a corner, or `pointer` (where
  the last press was).

The pointer does not reach what is under a layer.

A `modal` layer works like a dialog:

- Nothing under it is reached.
- Tab keeps to its controls.
- Keys reach nothing else.
- A `scrim` dims the page.

A layer the reader may `dismiss` is closed by Escape (the top one) or by a
press outside it, its anchor and the layers over it. Its `dismiss` event says
how: `escape`, `outside` or `timeout`.

A `focused` layer (every modal one) takes the focus when it opens and gives
it back when it closes.

A layer is open while it is in the tree. With `held`, it is open while Lory
holds it: `opens[n, layer_id]` makes a control toggle it, and
`open_layer[id]`, `close_layer[id]` and `layer_open[id]` work from the
program.

Composites made of layers:

| Function | What it is |
|---|---|
| `dropdown[id, words, kids, side = 'bottom', align = 'start']` | A button that opens a held, focused panel. Pressed again, Escape or a press elsewhere closes it. |
| `modal[id, kids, wide = 440, dismiss = true, held = false]` | A dialog in the middle of the dimmed page, fading in over 150 ms. |
| `drawer[id, kids, side = 'right', wide = 320, …]` | A panel along a side of the page, modal. |
| `toast[id, kids, lasts = 5000, place = 'bottom_right']` | A notice that tells `dismiss` (`timeout`) once it has shown `lasts` ms. The pointer resting on it pauses the count. |
| `tip[n, words, delay = 700]` | Words over a control once the pointer has rested on it for `delay` ms. A press hides them until the pointer leaves. A tip never blocks the pointer. |

`anchored[ax, ay, aw, ah, fw, fh, side, align, gap, page_w, page_h, margin]`
is the placement itself, public so other modules can place things the way
layers are placed. It answers a `Placed[x, y, side, align]`.

### Focus, sets of controls, motion

| Function | What it is |
|---|---|
| `roving[id, kids, along = 'column', loop = true, hover = false, gap = 2]` | Controls that are one Tab stop. The arrows along it move the focus, Home/End go to the ends, and Tab comes back to the last one focused. Each move is a `rove` event. `hover` focuses the entry under the pointer, as menus do. |
| `disabled[n]` | Shown at 45% but passed over by Tab and the pointer, and telling nothing. |
| `moved[n, dx, dy]`, `faded[n, alpha]`, `scaled[n, k]` | The control drawn moved, fainter or scaled about its middle. The pointer finds it where it is drawn. These are what `lory.motion`'s tweens and springs drive. |
| `focus[id, words]`, `unfocus[]` | The focus given or taken from the program; `focus` puts the caret at the end of `words`. |
| `focus_only[id]` | The focus given without taking over a field's words: it types on from what the tree gives it. |
| `focused_id[]` | The id of the control holding the focus, `''` where none does (keys that should wait while a field is typed in). |

### The look and showing

`dark[]` and `light[]` answer a `Look`: page, panel, edge, ink, muted,
accent, on_accent, field, hover, press, focus, danger, success, warning,
scrim and shadow. `show[c, tree]` lays a tree out on the page in the dark
look. `show_at[c, tree, x, y, w, look]` places it and picks the look. Both
answer `Shown[canvas, events, boxes]`, each box in the page's own pixels.

A theme's sizes are two more arguments of `show_at`:

- `scale` (1 by default) sizes every control, its words and the gaps
  between them, as Radix Themes' scaling does (90% to 110%). It does not
  size the room it is given: the tree still stands at `x`, `y`, `w`.
- `radius` (1 by default) times every control's corners, as Radix Themes'
  radius does: 0 squares them, and a large number makes pills (a corner is
  never more than half its side).

`lory.colors`' themes answer the colours a `Look` is made from
([colors](colors.md)).

Words in the `accent`, `danger`, `success` and `warning` tones, a chosen tab
and a select's chosen choice are written in their colour moved toward black
or white until it reads at 4.5 to 1 on the panel (WCAG 2's least for words).
A theme's accent is a fill, and a yellow fill is unreadable as words on a
light panel. The looks' own accents read already, and are kept.

## Behaviours held

Each behaviour below is a test block in gui.co. A test block runs in the
interpreter, even under `crow test --compiled`. gui's code is compiled in
every example's web build and in each area's both-modes program, which
draw with it:

- **Layout:**
  - Columns space and place their controls; rows justify along their length.
  - Grids lay equal columns.
  - The top of an overlay is reached and its base is not.
  - Dividers rule columns and rows.
- **Items:** pressed as one by the pointer, Enter and Space.
- **Layers:**
  - A layer is placed against its control and flipped where the page ends.
  - It takes no room and is drawn over the rest.
  - The pointer under it does not reach, and a press outside closes it.
  - A modal keeps the focus and blocks what is under it.
  - A dropdown opens and closes its panel.
  - A layer stands at a place of the page.
  - A toast tells when its time is up.
- **Focus:**
  - Arrows move the focus in a roving group that is one stop of Tab.
  - A tip shows once the pointer has rested.
  - A disabled control is dimmed and not used.
  - A moved control is found where it is drawn.
- **Controls:**
  - A checkbox, a radio group and tabs answer presses and keys (Radix's
    automatic activation: arrows choose).
  - A disclosure and a bar of progress.
  - A slider steps by its keys and keeps to its steps (Radix's rounding from
    `lo`).
  - A field is typed in at its caret. Arrows and Home/End move the caret.
    Shift+arrows and select-all select. Delete and Backspace work, typing
    replaces a selection, and Enter submits.
  - A number field takes only a number's characters; a field of lines takes
    new lines.
- **Drawn controls:** laid out and drawn in the pass, pressed, dragged, keyed;
  the pointer's shape kept.
- **Themes:** a theme's scaling sizes the controls in their room, and its
  radius rounds their corners. Words in an accent too faint for their
  ground are made readable.
- **In a headset:** a scroll area is turned by the thumbstick of the hand
  whose ray rests on it ([in a headset](xr.md)).

## Parity

- **Placement, number for number.**
  - `tests/gui/placement.mjs` runs `@floating-ui/core` 1.7.5 with Radix
    Popper's middleware: `offset` (the gap), `shift` with `limitShift` (the
    margin as padding), then `flip`.
  - It runs 1,200 cases: 10 anchors × 5 sizes × 4 sides × 3 alignments × 2
    gap/margin settings, on a 900×700 page.
  - It writes `tests/gui/placement.json`.
  - `tests/gui/placement.co` holds `gui.anchored` to every case's x, y, side
    and alignment. All 1,200 pass, interpreted and compiled.
  - To regenerate:
    `npm install --prefix <scratch>/ref @floating-ui/core@1.7.5`, then
    `LORY_REF=<scratch>/ref node tests/gui/placement.mjs`.
- **Behaviour.** The test blocks above encode the keyboard maps and event
  order of WAI-ARIA's patterns as Radix Primitives and Headless UI implement
  them: Escape and outside presses dismissing, focus going in and coming back,
  Tab trapped in a modal, roving focus with Home/End and looping, a hover
  delay of 700 ms for tips (Radix Tooltip's default), 5 s toasts paused while
  hovered (Radix Toast's default).
- **The browser.** `examples/controls` builds for the web
  (`crow build --target web main.co`) in Lory's suite (`./test.sh`).
  `tests/gui/browser.py` drives that build in headless Chrome:
  - Pressing the select opens its list as a layer over the controls under it
    (90×177 px at 900 wide).
  - ArrowDown and Enter choose the next fruit and close the list.
  - Opened again, a press outside closes it.

  The page compares its own drawings at each stage, so the check needs
  nothing installed. Myna's drawn pages, which use gui, pass their tests
  and build against it.

## The survey's rows for gui

| Row | Status |
|---|---|
| Accessibility semantics (roles, focus rings, keyboard) | Built and tested: focus rings, Tab order, the keyboard patterns above. Roles for screen readers are not built: a canvas has no accessibility tree. The host would mirror one (see the catalog's needs from the host). |
| Accessible icon and visually hidden text | Not built, for the same reason: it needs the host's accessibility tree. |
| App loader (open native app links) | Not built: opening a native app is the browser's, not Lory's. |
| Application layout regions | Built and tested: `header`, `row`, `column`, `drawer`, and the look switches dark and light. |
| Button | Built and tested (press, Enter, Space, hover, focus ring). Icon buttons wait on `lory.icons`. A split button is a row of a button and a `dropdown`. |
| Button group / toggle group / segmented control | The parts are built and tested (`roving`, `item` chosen). The group itself is `lory.forms`'. |
| Component definition, props, slots and composition | Built: a component is a Crow function that answers a tree. Its kids are its slots. |
| Component state, lifecycle and events | Built: events by id and act. State is the program's, and what controls hold is Lory's, between frames. |
| Direction and locale providers | Not built: right-to-left layout (flipped rows and arrows) is planned. |
| Divider / separator | Built and tested. |
| Drawer / sidebar | Built and tested (`drawer`: modal, a scrim, any side, Escape and outside presses). A 56-px rail that widens on hover is not built. |
| Floating action button and speed dial | Not built yet: a button opening a held layer of buttons, for `lory.menus`. |
| Headless UI Vue component set | Same behaviours as the React rows. Covered there. |
| Host-framework wrappers and server rendering | Out of scope: Lory draws itself, and there is no DOM to wrap or render on a server. |
| Layout containers (box, row/column, grid, section, container, inset) | Built and tested: column, row, panel, grid, overlay, space, sized. Inset is `pad`. |
| Localization | Nothing for gui to build: the words are the program's each frame, so a switched locale shows in the next frame. |
| Page layout templates | For the examples step (`examples/<name>`). |
| Panel / sheet / segment | Built and tested (`panel`). A loading segment is an `overlay` of a `progress`. |
| Portal, slot, reset and composition (asChild) | Built and tested: a `layer` is the portal, drawn over all wherever it stands. `opens`, `tip` and `disabled` wrap any control, as `asChild` does. |
| Rail (side column) | Composed: a `sized` column in a `row`. |
| Reactive bindings | Built: immediate mode. A binding is an expression; conditionals and loops are Crow's `if` and `for`. |
| Shared state: context, signals and tasks | The program's: Crow's `use memory` and facts. |
| Tabs | Built and tested (press, arrows with automatic activation, Home/End). |
| Template directives | Nothing to build: immediate mode needs none. |
| Text and heading | Built and tested (`text` sizes and tones, `heading`, `label`, `note`). |
| Progress (bar and circular) | The bar, determinate and not, is built and tested. A circular one is for `lory.display`. |
| Checkbox | Built and tested (press, Enter, Space, `mixed`). |
| Label (form label) | Built (`label`). A press on a label does not yet focus its control. |
| Radio group | Built and tested (press, arrows choose). |
| Select | Built and tested: a `choices` layer that flips and stands over dialogs. Arrows choose and Escape closes. Typeahead is not built. |
| Text field and text area | Built and tested (caret, selection, keys, password, number, lines, hint). |
| Toggle button | The switch (`toggle`) is built and tested. A button with a pressed look is for `lory.forms`. |
| Basic table | Built and tested (header, rows, a fixed height, a chosen row, hover). Sorting and paging are `lory.datatable`'s. |
| Slider (value and range) | Value: built and tested (steps, keys, Radix's rounding). Range with two thumbs: for `lory.forms`. |
