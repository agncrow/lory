# lory.datagrid: cells chosen, merged, edited, fed and worked out

`lory.datagrid` (packages/lory/datagrid.co, `use lory.datagrid as dg`) is
the grid of cells that stands on `lory.datatable`'s rows. It holds:

- which cells are chosen, as rectangles, and which cells merge;
- a focused cell moved by TOAST UI Grid's keymap, with copy, paste and
  clear;
- edits checked against each column's rules, made at once or kept as
  drafts until saved, and relations between columns;
- a feed's changes and how each changed cell flashes;
- a spreadsheet's cells, their formulas worked out, with undo and redo.

It draws the grid as one control of gui's, with an edit bar above it.

Sorting, filtering, grouping, trees, pages and column sizes are
datatable's. The grid reads its row models (`dt.models`) and calls its
functions (`dt.sort_toggled`, `dt.row_expansion_toggled`,
`dt.aggregated`). None of them is written again here.

What it answers is held to three references, on 47,578 values with none
differing (tests/datagrid/reference.co):

| Reference | Values |
|---|---|
| TanStack Table's table-core 9.3.1: cell selection and cell spanning | 44,152 |
| TOAST UI Grid 4.21.22 in headless Chrome: its keymap, copying and pasting | 1,333 |
| The 7GUIs Cells task: formulas worked out as JavaScript works them | 2,093 |

tests/datagrid/reference.mjs makes reference.json from the pinned
libraries: `node tests/datagrid/reference.mjs <node_modules>`. None of
their source is included. Their behaviour was read from their documents
and from running them, and written anew.

```
use lory.datatable as dt
use lory.datagrid as dg

g = dg.grid['people', table]                       --- a grid of a datatable table
g = dg.specs_set[g, [dg.spec['hours', number = true, least = 0.0, most = 60.0, summary = 'sum']]]
g.drafts = true                                    --- edits wait for Save
...
shown = gui.show[c, gui.column[[dg.grid_view[g, 860.0, 420.0]]]]
g = dg.handled[g, shown]                           --- presses, drags, keys, edits applied
if g.copied ne ''
    shown.canvas = lory.copy[shown.canvas, g.copied]
```

## Cells chosen and merged (table-core)

- `selecting[on, unselectable, ranges, drag, multi]` says how cells may be
  chosen.
- `spanning[on, rows, columns, wide, off]` says how cells merge.
- `laid[t, sel, spans_by]` works the table's rows out once:
  - the rows in table-core's order;
  - the columns;
  - the span index (`span_index`, `row_span`, `column_span`, `covered`);
  - the merges (`merge_bounds`).
- A selection is a list of `Range`s. Each has an anchor and a focus by row
  and column id, and takes cells away where `exclude` is set.
- `pressed`, `reached` (a drag), `moved` and `extended` (arrow keys),
  `range_selected` and `all_selected` change a selection.
- `selection_bounds` answers the disjoint rectangles, in the order drawn.
- `cell_selected`, `cell_edges`, `selected_ids`, `selected_count`,
  `selection_rows`, `selection_columns` and `selected_values` read them.
- Ranges hold ids, so they follow their cells through sorting and
  filtering. A range whose corner is hidden adds nothing until the corner
  shows again.
- Runs down a column hold while the value is the same (`Object.is`; nullish
  values never merge). They break where a pinned part begins, where depth
  or parent changes, and at a group's row. Spans across are clamped to the
  pinned region.

## The keymap (TOAST UI Grid)

`keyed[g, k, key, shift, ctrl]` takes a browser key name and answers the
grid after it:

- The arrows move the focus. Home and End go to the row's ends; with Ctrl,
  to the corners.
- PageUp and PageDown go to the first and last row.
- Tab and Shift+Tab wrap along the rows.
- Shift with a move extends the selection. Ctrl+A chooses every cell, and
  the next Shift move goes on from the focus's row, as TOAST's does.
- Enter starts and stops an edit; Escape stops it. Delete and Backspace
  clear the chosen cells.
- Ctrl+C leaves the text in `g.copied`, joined by tabs and newlines without
  quoting. Ctrl+V pastes the grid's own clipboard.
- `pasted[g, k, text]` pastes any text. Quoted cells holding newlines are
  unquoted. The data is repeated to fill a selection that holds it whole
  more than once.

The functions below it are public too: `toast_command`, `toast_next`,
`toast_selection`, `copied_text`, `pasted_cells` and `cleared`.

## Edits, rules, relations

- `spec[column, editor, choices, required, number, least, most, listed,
  unique, summary, align]` describes a column:
  - its editor: `text`, `select` or `none`;
  - the rules an edit keeps;
  - the footer's summary (any of `dt.aggregated`'s names);
  - where its words are placed.
- `cell_set` writes a value. `editable`, `typed_value`, `broken_rule`,
  `cell_error`, `cell_dirty`, `dirty_rows`, `can_save`, `saved` (all, or
  one row), `discarded` and `row_added` follow the edits.
- With `g.drafts` false, an edit is written into its row at once. With it
  true, the edit is kept as a draft until saved, as TanStack's
  with-tanstack-form example keeps it.
- `relation[source, target, off, choices]` ties one column to another. The
  source's value can keep the target from being edited (`off`) or name its
  choices (`a|b|c`). A target value no longer offered is cleared.

## A feed (realtime)

- `ticked[g, changes]` writes a feed's `change[row, column, value]`s into
  the rows by id, in one pass. They are not edits: nothing is marked
  dirty.
- The page, the sorting, the focus and the selection are kept. They hold
  ids, so a row that sorts elsewhere takes them with it.
- `time_set[g, ms]` and `flash_of[g, row, column]` give each changed cell's
  flash. It is 1 the moment the cell changed and fades to 0 over
  `flash_lasts[]` (800 ms). It is signed by the way a number went: up
  positive, down negative.
- `flashes_pruned` lets go of the flashes that have ended.

## A sheet (7GUIs Cells, with TanStack Sheet's tally)

- `sheet[columns, rows]` makes a sheet. `sheet_set`, `raw_of` and
  `cell_name` write and read its cells.
- A cell starting `=` is a formula, worked out as JavaScript works it: `+`
  joins words when either side is words; other operators read numbers, and
  `''` reads as 0. References are `[A-Z]` and one or two digits, and they
  chain. Anything else, and any cycle, shows `#ERROR`.
- `cell_result` and `cell_shown` give what a cell shows.
- `undone`, `redone`, `can_undo` and `can_redo` work on steps. A step
  opened by `step_begun` and closed by `step_ended` (a paste) is undone as
  one.
- `sheet_tally[s, top, bottom, left, right]` answers a range's count, how
  many of its cells hold numbers, their sum and their mean.
- `sheet_grid[id, s]` is a grid of the sheet: a column of row numbers, then
  A to E. Edits go into the sheet as raw text, and the edit bar shows a
  focused cell's formula. `sheet_undone` and `sheet_redone` undo and redo;
  in the grid, Ctrl+Z and Ctrl+Y do too.

## The drawing

`grid_view[g, wide, tall]` draws the grid in two parts:

- **The edit bar:** the focused cell's name and a gui field holding its
  text. Edits are typed there, as in a spreadsheet's formula bar. In a
  headset, gui's keyboard types into it.
- **The body:** one `gui.drawn` control, `tall` high, drawn under that edit
  bar row.
  - Column widths are scaled to fill `wide`.
  - The header is 34 px, with sort marks. Rows are 30 px.
  - Only the rows its scroll shows are drawn.
  - Each cell is drawn once, at the size of its merge.
  - It shows the selection's fill and outer edge, the focus ring, error
    and changed tones, flashes, a tree's indent and toggles, and the
    summary footer.
  - `g.look` sets one of three looks: `default`, `striped` or `clean`.

`painting[g, wide, tall]` answers the boxes the body draws, so a program or
a test can read them.

`handled[g, shown]` applies what the reader did:

- A press chooses and focuses a cell. Shift and Ctrl press as table-core
  has it, and a drag reaches.
- A press on the focused cell, a double press, Enter, or typing a character
  on a cell begins an edit in the edit bar.
- Enter there makes the edit, Escape lets it go, and Tab makes it and moves
  on.
- Keys act as the keymap above. Tab keeps the focus in the grid, as
  TOAST's does.
- A header's press sorts. A toggle opens a tree's row.
- The wheel, or a headset's thumbstick, scrolls. The focus is scrolled into
  view.

In a headset the ray presses cells as a mouse does.

`examples/datagrid` shows all of this on four tabs:

- People: an editable grid with drafts, rules, a relation, a summed footer,
  grouping as a tree, and the three looks.
- Cells: selection and merges.
- Live: a feed twice a second.
- Sheet: the spreadsheet.

The example logs its controls' boxes when the page tells it `boxes`, and
what it holds when told `state`. tests/datagrid/browser.py drives its web
build in headless Chrome. tests/modes/datagrid.co holds the interpreter and
the compiled program to the same answers (`tests/modes.sh crow
tests/modes/datagrid.co`).

## Not built

- **An editor drawn inside its cell:** edits go through the edit bar
  instead. gui's overlay keeps the pointer from the box under it, so a
  field laid over a cell would take the grid's presses.
- **Select, checkbox, radio and date pickers inside cells:** a `select`
  column is typed in the edit bar and held to its choices.
- **Pasting from the system clipboard:** the page gives no paste event. A
  program passes text to `pasted`.
- **TOAST appending rows when a paste runs past the last one.**
- **Scrolling sideways, frozen columns while scrolling, and dragging
  columns to resize or reorder them:** columns are scaled to fit.
  datatable holds pinning, sizes and order as state.
- **A custom span predicate (spanRows as a function), and functions as
  editors:** both are the program's code.
- **TanStack Sheet's ribbon, several sheets, zoom, merge and centre, and
  frozen rows.**
- **The realtime-trading benchmark's speed:** the feed is built and
  tested; its frame times are not measured against TanStack's.

## Survey rows

| Row | Status |
|---|---|
| TanStack with-tanstack-form (editable data) | Built and tested: text, number and select cells; one form for the table or one per row (`saved[g, row]`); save all or one row; rules for each cell, errors per cell; cells changed tracked; rows added. Zod itself is not built; the rules stand for it. |
| TanStack cell selection (guide and example) | Built and tested to table-core 9.3.1 on 16 cases: press, drag, Shift, Ctrl and Cmd adding or taking away, arrows, Mod+A, ranges through sorting and filtering, hidden corners, values as grids. |
| TanStack cell spanning (guide and example) | Built and tested to table-core 9.3.1: spanRows by equal values, spanColumns clamped to the pinned region, covered cells of span 0, runs within a page. A custom predicate is not built. |
| TOAST UI Grid: keymap, editing, merged cells, validation | Built and tested to TOAST UI Grid 4.21.22 on 14 cases. Validation is built as rules. |
| TOAST UI Grid: custom editor, relations, themes, summary, tree | Relations, the three looks, the summary footer and tree rows are built (trees are datatable's grouping and expanding). Custom and date editors are not built. |
| TanStack realtime-trading | Built and tested: a feed's changes by row id, kept focus and selection, flashes up and down. |
| 7GUIs Cells | Built and tested on 7 sheets: formulas, chained references, `#ERROR`, numbers from text. |
| TanStack spreadsheet (TanStack Sheet) | Built and tested: the formula bar, range selection with count, number count, sum and mean, copy, paste and clear, undo and redo. The ribbon, several sheets, merge, frozen rows and zoom are not built. |

## The catalog's rows for lory.datagrid

These are the rows of [README.md](README.md) whose home is `lory.datagrid`.

| Row | Status |
|---|---|
| Editable cells | Built and tested |
| Cell selection and cell spanning | Built and tested |
| Data grid (editing, keymap, relations, tree, themes) | Built and tested; custom and date editors not built |
| Realtime updating grid | Built and tested |
| Spreadsheet (formulas, cell editing, recalculation) | Built and tested; the ribbon and several sheets not built |
