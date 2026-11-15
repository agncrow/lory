# Data grid and spreadsheet

`lory.datagrid` puts cells to work on top of a [data table](tables.md):
cells chosen, merged, edited, checked, pasted and worked out. A grid is drawn
as one control, its header, rows and summary row painted together, with an
edit bar over the cell being edited.

Press a cell to focus it, drag or Shift-press to choose a rectangle, and
Ctrl-press (Cmd on a Mac) to add or take away cells. The keys are a
spreadsheet's: the arrows, Home and End, Page Up and Page Down, Ctrl+Home and
Ctrl+End, Shift with each to extend the choice, Ctrl+A for every cell, Tab
to move on, Enter or Space to edit, Escape to let an edit go, Delete and
Backspace to clear, and Ctrl+C and Ctrl+V to copy and paste text a
spreadsheet reads.

## Components

| Component | What it does |
|---|---|
| Data grid | A table's rows as cells, focused, chosen and moved through by the keys |
| Cell selection | Rectangles of cells chosen by press, drag, Shift and Ctrl, counted, listed and copied |
| Merged cells | Neighbours holding the same value merged down a column, or across a row |
| Cell editors | Text, numbers, a list of choices and a box to tick, edited in the edit bar |
| Rules | Required, a number, at least and at most, one of the choices, unique, checked on every edit |
| Relations | One column turning another off, or choosing its choices |
| Drafts | Edits kept as drafts, the changed cells and rows known, saved together or one row at a time, or let go |
| Summary row | A column's sum, mean or other total in the footer |
| Tree rows | Groups that open and close, drawn as a tree |
| Live grid | Cells changed by a feed many times a second, the page, sort and choice kept, each change flashing up or down |
| Spreadsheet | Cells holding words or `=` formulas that read other cells (`=A0 + B1`), worked out again as they change, with count, sum and mean of a range, cut, copy, paste, undo and redo |
| Looks | Three looks, among them striped rows and a clean one without lines |

## Using it

```crow
use sys
use memory
use lory
use lory.gui
use lory.datatable as dt
use lory.datagrid as dg

fn fresh[]
    columns = [dt.column['name', 'Name'], dt.column['hours', 'Hours']]
    people = [dt.row['p1', map[name = dt.words['Ada'], hours = dt.number[36]]], dt.row['p2', map[name = dt.words['Alan'], hours = dt.number[41]]]]
    g = dg.grid['people', dt.new[columns, people]]
    dg.specs_set[g, [dg.spec['hours', number = true, least = 0.0, most = 60.0, summary = 'sum']]]

fn draw[frame]
    g = recall['grid', fresh[]]
    c = lory.begin[frame]
    shown = gui.show[c, gui.column[[dg.grid_view[g, 600.0, 300.0]]]]
    g = dg.handled[g, shown]                  --- presses, drags, keys and edits
    if g.copied ne ''
        shown.canvas = lory.copy[shown.canvas, g.copied]
    remember['grid', g]
    lory.end[shown.canvas]

sys.frames[draw]
```

Set `g.drafts = true` to keep edits until `dg.saved[g]`. Copying leaves the
text in `g.copied`, which `lory.copy` puts on the page's clipboard.

## In a headset

The ray presses and drags across cells and the thumbstick scrolls the rows.
An edit is typed on Lory's drawn keyboard into the edit bar.

## Try it

[Open the data grid example](../../examples/datagrid/)

## Not included yet

- Editors drawn inside the cell (edits use the edit bar)
- Date pickers and custom editors inside cells
- Pasting from the system clipboard by its own paste event
- Scrolling sideways with frozen columns, and dragging columns to resize them
- Several sheets in one spreadsheet
