# How Lory works

## A view is a tree, drawn every frame

A Lory program answers each frame. It builds a tree of controls from its
state, such as a column holding a heading, a field and a button. Lory lays
the tree out, draws it and tells the program what the reader did as events.
Then the program changes its state, and the next frame shows the change.

Lory keeps what the controls themselves hold between frames: the focus, a
field's caret and selection, how far a list is scrolled, which menus are
open. A program keeps only its own data.

```crow
use sys
use lory
use lory.gui
use memory

struct Counter [count]

fn draw[frame]
    c = lory.begin[frame]
    count = recall['counter', Counter[0]].count
    shown = gui.show[c, gui.panel[[gui.heading['Clicked `count` times'], gui.button['more', 'Click']]]]
    for e in shown.events
        if e.id eq 'more'
            count = count + 1
    remember['counter', Counter[count]]
    lory.end[shown.canvas]

sys.frames[draw]
```

## Everything is drawn

A program built with `crow build --target web` is WebAssembly. Each frame it
hands the page one batch of WebGL2 calls, and the page runs them. Every
control, chart, map and scene is drawn by Lory itself, so a page looks and
behaves the same in every browser and in a headset.

Text is drawn from a font atlas that stays sharp at any size and in a
headset.

## The layers

| Layer | What it holds |
|---|---|
| Renderer | Buffers, shaders, one batch of drawing a frame |
| Controls (`lory.gui`) | Every control, layout, focus, scrolling and hit testing |
| Components | Forms, menus, tables, pickers, carousels and the rest, built from the controls |
| Charts (`kite`) | Scales, axes, legends and marks of every kind |
| 3D (`lory.space`) | Shapes, cameras, materials, lights and shadows |
| Headset (`lory.xr`) | Both eyes, controllers as pointer rays, panels placed in the room |

## Fast by design

- **Work in proportion to what changed.** The GPU does the work for each
  vertex. Crow code runs once for each change.
- **One batch a frame.** The program hands the page one batch of drawing a
  frame, not thousands of calls.
- **Draw what a pixel can show.** A long series is reduced to what each
  column of pixels can show before it is drawn.
- **The headset's budget.** A headset runs at 72 to 120 frames a second, so
  both eyes are drawn in one pass.

## Both of Crow's modes

Crow runs a program interpreted (`crow run -i`) or compiled
(`crow run`, `crow build`). Lory's tests run in both, and their answers are
the same.
