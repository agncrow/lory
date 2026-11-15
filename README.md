# Lory

Lory is a UI and graphics library for [Crow](https://github.com/agncrow/crow).
A Crow program built for the web (`crow build --target web main.co`) is
WebAssembly that draws everything itself through WebGL2. That covers controls,
charts, maps, 3D scenes and games, and the same program runs in a page, on a
phone and in a VR headset.

**The site:** [agncrow.github.io/lory](https://agncrow.github.io/lory/) has
every example running live and a page for each area of components.

## Packages

| Package | `use` | What it draws |
|---|---|---|
| `packages/lory` | `lory`, `lory.gui`, `lory.plot`, `lory.space`, `lory.xr`, … | The renderer, the controls and the component modules, plotting, 3D, and the headset |
| `packages/kite` | `kite`, `kite.charts`, … | Financial charts (candles, indicators, a scanner) and Chart.js-style charts |
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

## Components

[docs/components](docs/components/README.md) is the catalog Lory is built
to: 379 components and features, gathered from Vue's, Solid's and Lit's
examples, Radix, Headless UI, Semantic UI, Vuetify, Motion, anime.js, AOS,
fullPage.js, three.js, Chart.js, SortableJS, TanStack Table, Grid.js,
react-datepicker, TOAST UI, react-slick, Mapbox GL JS, Leaflet and Tone.js.
Each row names the module that holds it and its status.

Every component is held to its reference three ways:

- its behaviour as test blocks: keys, states, events and their order;
- its numbers against the reference library itself, run at a pinned version
  by a script, wherever the reference computes them (placements, easings,
  ticks, dates, sorting);
- both of Crow's modes, interpreted and compiled, and the browser.

None of the references' code is copied: each component is Lory's own,
written from what the reference documents and does.

## Examples

[examples/](examples/README.md) holds programs that each build for the web,
and the site runs them live.

## Testing

`./test.sh` runs the whole suite:

- every package's tests in both modes;
- the parity checks against the reference libraries;
- every example built for the web;
- a walk of the scene example in a made-up headset, when Chrome is installed.

## Design

[docs/lory-design.md](docs/lory-design.md) holds the decisions and why they
were made, and [docs/progress.md](docs/progress.md) holds what was built and
when.

## License

Lory is licensed under either of the MIT license ([LICENSE-MIT](LICENSE-MIT))
or the Apache license, version 2.0 ([LICENSE-APACHE](LICENSE-APACHE)), at
your option, as Crow is.
