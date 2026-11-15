# lory.icons: every glyph a control needs

`lory.icons` (packages/lory/icons.co) draws icons by name, from Lory's own
lines, discs, rings and boxes, in one colour and at any size. A program
writes `use lory.icons` and draws one where it wants it:

    c = icons.draw[c, 'check', x, y, 24.0, look.ink]

There are 404 names and 371 drawings:

- **Crow ui's closed set:** all 52 names, by Crow's names.
- **Radix Icons:** the 318 names the survey lists, by Radix's names. The
  14 brand logos are left out (see the rows below).
- **What the other surveys' components ask for:** 49 more, such as a
  table's sorts, a map's pin, a player's controls and a hotkey's keys.

A name is spelled with hyphens, as Radix spells it, or with underscores, as
Crow does: `eye_off` is `eye-off`. Thirty-three names are another name's
drawing (`close` is `cross-2`). Every other name has a drawing of its own,
and no two of those are alike. Every drawing is Lory's own design, made
from the name alone: no set's paths are copied.

## The vocabulary

| Function | What it does |
|---|---|
| `draw[c, name, x, y, size, color]` | Answers the canvas with the icon drawn in the square from (x, y), `size` wide and tall, in the drawing's pixels. A name the set does not draw is a small outlined square. |
| `turned[c, name, x, y, size, color, degrees]` | The same, turned clockwise about the square's middle: a section's chevron as it opens. Semantic UI's rotated icons are 90 (clockwise) and -90 (counterclockwise). |
| `spinning[c, name, x, y, size, color, t]` | The same, turned as far as a loading icon has turned at the frame's time `t` (milliseconds, `lory.time[c]`): once round every two seconds, at an even pace, as Semantic UI's loading icons turn. Drawn each frame, it spins. |
| `flipped[c, name, x, y, size, color, way]` | The same, mirrored about the square's middle. `way` is `horizontally` (left and right swap) or `vertically` (top and bottom swap), as Semantic UI flips its icons. |
| `names[]` | Every name drawn, spelled with hyphens, in order. |
| `known[name]` | Whether the set draws the name. (It is not `has`: Crow keeps that name for its own builtin.) |

## How an icon is drawn

- **The grid.** Each icon is designed on Radix's grid of 15 units, scaled
  to the square it is drawn in.
- **Strokes.** A stroke is one unit wide, with round ends and round sharp
  corners. A gentle bend is closed by the lines on either side reaching
  past it, so a curve drawn as short lines shows no notches.
- **Solids.** A solid shape (play, a filled star) is filled and edged with
  the same stroke, so its corners are round too.
- **Crisp at 15 pixels.** Drawn 15 pixels wide from a whole pixel, an
  icon's strokes are one pixel and fall on whole pixels. Lory does not
  move an icon onto whole pixels itself; the program places it (the
  example does).
- **Colour.** An icon is drawn in the colour it is given. Strokes overlap
  where an icon's parts meet, so a colour that is not opaque shows its
  joins darker. Draw it opaque (mix the colour with what it is drawn on,
  `lory.mix`), and fade the whole instead.
- **Turning and flipping.** Every shape Lory draws is placed by its
  corners and shaded from its own corner's numbers, the same on either
  side of its middle. So `turned` and `flipped` move the corners alone,
  and a rounded box stays rounded and a line keeps its width.
- **Cost.** An icon is a few dozen vertices: 66 is the median and 312 the
  most (`command` and `database`), so a toolbar of fifty icons is a few
  thousand.
- **In a headset.** An icon is drawn on the page there (1000 by 560
  pixels on its 2 m panel) as on a screen, and both eyes draw it.

## The set

**Crow ui's 52:** check, x, plus, minus, chevron_down, chevron_up,
chevron_left, chevron_right, arrow_up, arrow_down, arrow_left, arrow_right,
search, menu, more, settings, user, home, calendar, clock, refresh, play,
pause, stop, upload, download, trash, edit, copy, link, external, info,
warning, error, success, star, filter, sort, chart, table, bell, mail, lock,
eye, eye_off, dollar, bookmark, flag, tag, circle, dot and loader.

**Radix Icons' 318:** every name of the catalog's eight Radix rows (below)
but the brand logos.

**The 49 the other surveys ask for:**

| For | Names |
|---|---|
| Tables, lists and trees | sort-ascending, sort-descending, first-page, last-page, unfold-more, unfold-less, list-view, square-plus, square-minus, folder, folder-open |
| Forms and pickers | paperclip, cloud, cloud-upload, eyedropper, palette, star-half, spinner |
| Maps | map, map-pin, map-pin-filled, locate, compass, navigation |
| Players and sound | record, rewind, fast-forward, microphone, music |
| Editors | undo, redo, list-numbered, list-check, indent, outdent, code-block, flip-horizontal, flip-vertical, rotate-clockwise |
| Hotkeys | command, shift, option, control, return, backspace |
| Devices | wifi, battery, signal, phone |

**The 33 names that are another's drawing:** x and close are cross-2;
search is magnifying-glass; menu is hamburger-menu; more is
dots-horizontal; settings is gear; user is person; refresh is reload; edit
is pencil-1; link is link-2; external is external-link; info is
info-circled; warning is exclamation-triangle; error is cross-circled;
success is check-circled; chart is bar-chart; mail is envelope-closed; lock
is lock-closed; eye is eye-open; eye-off is eye-none; dot-filled is dot;
expand is chevron-down; collapse is chevron-up; drag-handle is
drag-handle-dots-2; grid-view is view-grid; checkbox-indeterminate is
square-minus; volume is speaker-loud; mute is speaker-off; fullscreen is
enter-full-screen; fullscreen-exit is exit-full-screen; bold is font-bold;
italic is font-italic; history is counter-clockwise-clock.

## Behaviours held

Each behaviour below is a test block in icons.co (12 blocks, 59 truths):

- **Every name is drawn.** Every name of the three sets is known and drawn,
  and none as the square a name the set does not draw gets. The sets hold
  52, 318 and 49 names; there are 371 drawings and 404 names.
- **The names.** They come in order, each once, spelled with hyphens.
- **An unknown name** is a small square's edge, and is not known.
- **Spellings and aliases.** Underscores draw the drawing the hyphened name
  does, and each alias draws exactly the drawing it names.
- **Within its square.** No vertex of any drawing reaches further out than
  half a stroke and the pixel an edge is smoothed over, at 15 pixels and at
  48.
- **No two alike.** Every drawing differs from every other, vertex for
  vertex, but its aliases.
- **The same at every size.** Every drawing at 30 pixels is its drawing at
  15 scaled: as many vertices, of the same kind and colour, twice as far
  from the corner but for the pixel of smoothing.
- **Colour, place and cost.** An icon is drawn in the colour given, where it
  is asked, and no drawing makes more than 312 vertices.
- **Turned.** A quarter turn of the arrow right is the arrow down, and the
  chevron down turned half round is the chevron up. Only the vertices'
  places move. Four quarter turns come back, a whole turn changes nothing,
  and a loader turned any way keeps to the circle about its square.
- **Spinning.** A loading icon is a quarter turn round at half a second,
  half round at one second and round again at two, and is drawn turned so.
- **Flipped.** The arrow right flipped horizontally is the arrow left, and
  the chevron down flipped vertically is the chevron up. Each vertex is
  mirrored across the middle, and only places move.
- **In a headset.** An icon on the headset's page is the same vertices as on
  a screen, both eyes draw all of them, and it turns there as on a screen.

The example's test blocks (examples/icons/main.co, 5 blocks, 24 truths):

- The cells fit their halves, and the longest name fits its cell. A phone's
  narrow page still lays one column a half.
- A page tall enough for the whole sheet draws every icon twice, at 24 and
  15 pixels, in each look.
- A short page draws only the rows it shows. Scrolled to its end, the last
  row is on the page.
- The wheel, the arrow keys, Page Down, Home, End and a drag scroll the
  sheet, and it stops at its ends.
- In a headset, the thumbstick pulled back scrolls the sheet down, and
  pushed away scrolls it back up.

## Parity

- **Semantic UI's icon states** (semantic-ui-less 2.4.1, its icon.less and
  icon.variables read, not run). A loading icon turns from 0 to 360 degrees
  in 2 s (`@loadingDuration`), at an even pace (`linear`). A rotated icon
  is a quarter turn, 90 clockwise and -90 counterclockwise. A flipped icon
  is mirrored: `scale(-1, 1)` horizontally, `scale(1, -1)` vertically. The
  blocks hold all of these.
- **Radix's set.** What is held is Radix's names, its grid of 15 units, one
  colour, and a size that scales.
  - The survey's own check, a raster of each name beside Radix's at
    15 pixels, is not run. Radix's drawings were not rendered beside
    Lory's.
  - Lory's drawings are its own designs, so they would differ from
    Radix's pixel for pixel by design, and copying Radix's paths is ruled
    out. No reference numbers exist for how a glyph looks.
  - Instead, every drawing was looked at, at 45 pixels and at 15 blown up
    six times while it was designed, and on the browser's picture below.
- **Both of Crow's modes.**
  - The blocks above pass under `crow test` and `crow test --compiled`.
    Plain blocks run in the interpreter even then, so a program was also
    run both ways.
  - That program is `tests/modes/icons.co`. It draws every name four ways:
    at 15 pixels from a whole pixel, at 24 from a fraction of one, turned,
    and flipped. Then it draws a loader spinning at five times.
  - It writes each drawing's vertices summed exactly: 410 lines.
    `tests/modes.sh crow tests/modes/icons.co` runs it with `crow run -i`
    and compiled with `crow run`, and every line is the same.
- **The browser.**
  - `examples/icons` builds for the web (`crow build --target web
    main.co`).
  - `python3 -I tests/icons/picture.py`, run from Lory's root after that
    build, draws it in headless Chrome, 1600 pixels wide: the whole sheet,
    about 6,250 pixels tall.
  - It steps the program by hand until the font atlas is answered, and
    keeps the page as `tests/icons/icons.png` to be looked at.
  - It checks that the program ran and that both halves drew about as much
    ink. They drew 77,391 pixels on the light half and 87,531 on the dark.
  - It needs Chrome and Python's own library. It serves the build on a free
    port of 127.0.0.1.

## The example

`examples/icons` draws every name in a grid: the icon at 24 pixels, the same
at 15 beside it, and its name under them. There are two halves side by
side, one in gui's light look and one in its dark.

- **Columns.** A half holds as many columns as fit, one on a phone. A cell
  is as wide as the longest name.
- **Scrolling.** The wheel, the arrow keys, Page Up and Page Down, Home and
  End, a drag, or a headset's thumbstick scroll the sheet.
- **Only what shows.** Only the rows on the page are drawn.
- **Turning.** Above the sheet, a chevron turned by eighths of a turn shows
  `turned`.

## The survey's rows for icons

These are the rows of [README.md](README.md) whose home is `lory.icons`.

| Row | Status |
|---|---|
| Alignment & layout (36) | Built and tested: all 40 names the row lists, panel-left, panel-right and panel-bottom and their minimized forms among them. |
| Arrows & carets (46) | Built and tested: all 47 names. |
| Borders, corners, box model (24) | Built and tested: all 24 names. |
| Brand logos (14) | Not built. The logos are their owners' trademarks, and drawing them from memory would copy their artwork. A program shows a brand's mark from the brand's own image (`lory.load_image` and `lory.image`). |
| Country flags | Not built. About 250 flags in their own colours, many with emblems, are pictures rather than one-colour glyphs. They are a set of images to load (`lory.image`), each with its source and licence kept. |
| Design & drawing (46) | Built and tested: all 47 names. |
| Icon sets and rendering | Built and tested: any size, any colour (Semantic UI's colored and inverted), rotated (`turned`), flipped (`flipped`), and a loading icon that spins (`spinning`: once round every 2 s, at an even pace, as semantic-ui-less 2.4.1 turns it). Composed by the caller, not tested here: disabled (a dimmer colour), a group with a corner icon (two draws), circular and bordered (a ring or a box drawn round it), a link icon (gui's button). Not built: MDI, Font Awesome and Material Icons, whose artwork is their own. A screen reader's name for an icon (aria-label, aria-hidden) needs the host's accessibility tree, as gui.md says for its own rows. |
| Interface components and controls (50) | Built and tested: all 51 names. |
| Marker icons (image and HTML) | For `map`. A marker's image, size, anchor and shadow are the map's to place. The pins a marker can draw are built and tested here: map-pin, sewing-pin and drawing-pin, and the filled form of each. |
| Objects, files, media and devices (80) | Built and tested: all 80 names. |
| Site categories (as the page names them) | Not built. The site groups its icons for its own page; Lory's names are one set, in order (`names[]`). Search and copy are the site page's own actions. |
| Typography (30) | Built and tested: all 29 names. |
