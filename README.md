# Lory

Lory is a UI and graphics library for [Crow](https://github.com/agncrow/crow).
A Crow program built for the web is WebAssembly that draws everything itself
with WebGL2: controls, forms, tables, charts, maps, 3D scenes, sound and
games. The same program runs in a page, on a phone and in a VR or AR
headset.

**The site:** [agncrow.github.io/lory](https://agncrow.github.io/lory/) has a
guide to every part of Lory and every example running live.

## Packages

| Package | `use` | What it gives you |
|---|---|---|
| `packages/lory` | `lory`, `lory.gui`, `lory.forms`, `lory.datatable`, `lory.space`, … | The renderer, the controls and the components, 3D, and the headset |
| `packages/kite` | `kite`, `kite.charts` | Charts: lines, bars, pies, scatter and more, and financial charts |
| `packages/map` | `map` | Maps of tiles with markers, popups, shapes and clusters |
| `packages/sound` | `sound` | Synths, effects, a sequencer and analysers, rendered in Crow |
| `packages/window` | `window` | A window of panels standing around the reader in a headset |
| `packages/game` | `game` | A fixed-rate clock, collisions, sparks and sounds |

## A first program

```crow
use sys
use lory
use lory.gui

fn draw[frame]
    c = lory.begin[frame]
    c = lory.clear[c, gui.dark[].page]
    shown = gui.show[c, gui.panel[[gui.heading['Hello'], gui.button['wave', 'Wave']]]]
    for e in shown.events
        if e.id eq 'wave'
            log['waved']
    lory.end[shown.canvas]

sys.frames[draw]
```

1. Clone this repository beside your project.
2. Name its packages in your crowfile, for example
   `deps = map[lory = '../lory/packages/lory']`, then run `crow install`.
3. Run `crow build --target web main.co` and serve `main_web/` over HTTP.

A view is a tree rebuilt from the program's state every frame. Lory keeps
what the controls hold between frames, such as the focus, a field's caret and
which menus are open. The program reads what the reader did as events.

## What is in it

- **Controls:** buttons, fields, sliders, toggles, checkboxes, radios, tabs,
  selects, tables, layers, tips, roving focus and themes.
- **Colours, icons and motion:** colour scales and themes, an icon set, and
  easings, springs and timelines.
- **Forms:** validation, masks, comboboxes, ratings, code inputs, a
  Markdown editor and a drawing pad.
- **Menus and overlays:** menubars, context menus, a command palette,
  dialogs, drawers, popovers, tooltips, notifications, accordions and trees.
- **Navigation and display:** app bars, breadcrumbs, steppers, pagination,
  cards, chips, avatars, badges, timelines, skeletons and spinners.
- **Dates and times:** date, range, month, year and time pickers, and a
  calendar with month, week and day views.
- **Data:** a data table (search, sort, pages, groups) and a data grid
  (editing, ranges, a live feed, a spreadsheet).
- **Charts, carousels, scrolling, drag and drop, maps, 3D, model files and
  sound.**

Every part works in a headset: the controller's ray points and presses, the
trigger drags, the thumbstick scrolls, and a keyboard is drawn for typing.

## Examples

[examples/](examples/README.md) holds programs that each build for the web.
The site runs them live.

## Testing

`./test.sh` runs every package's tests, in both of Crow's modes
(interpreted and compiled), builds every example for the web, drives the
examples in headless Chrome, and walks the 3D and headset examples in a
made-up headset.

## License

Lory is licensed under either of the MIT license ([LICENSE-MIT](LICENSE-MIT))
or the Apache license, version 2.0 ([LICENSE-APACHE](LICENSE-APACHE)), at
your option, as Crow is.
