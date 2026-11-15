# Data table

`lory.datatable` is the row model behind a table: plain functions over rows
of cells and column definitions, with nothing drawn. It sorts (by one column
or several, with six sort functions and a press that cycles ascending,
descending and off), filters (column filters, a global search, fuzzy ranks
and facets), groups rows and sums them up, expands sub-rows, pages, selects
and pins rows, and orders, hides, pins, sizes and resizes columns under
header groups. A simpler grid with a search field, a sort cycle and page
buttons with their words is there too.

A table is a record your program holds: its columns, its rows, its options
and its state. Each change answers the table changed (a new filter goes
back to the first page), and `models` works out the rows to draw once. Draw
them with gui's `table`, or with any controls you like; the
[data grid](datagrid.md) stands on the same tables. Presses, Shift-presses
(a sort of several columns), typing and the keys are the drawing's, so a
table works the same by mouse, touch and keyboard.

## Components

| Component | What it does |
|---|---|
| Sorting | One column or several, by text, numbers, dates or the fuzzy rank, missing values placed first or last |
| Filters and search | A filter per column (text, equals, ranges, lists, empty) and a global search, with fuzzy matching |
| Facets | The values a column holds under the other filters, with their counts, and its least and greatest numbers |
| Grouping | Rows grouped by one column or several, each group summed up (sum, mean, median, count, extent and more) |
| Expanding rows | Sub-rows and groups opened and closed, paged with the rest or inside their page |
| Pages | Pages of any size, with first, previous, next and last |
| Row selection | Rows, their sub-rows, a page or every filtered row, with a header checkbox's mixed state |
| Row pinning | Rows kept at the top or the bottom |
| Columns | Shown or hidden, reordered, pinned left or right, sized and resized, under header groups |
| Simple grid | A search field, a sort cycle and page buttons with their words, for rows of cells |

## Using it

```crow
use lory.datatable as dt

columns = [dt.column['name', 'Name'], dt.column['age', 'Age', aggregate_with = 'mean']]
people = [dt.row['p1', map[name = dt.words['Ada'], age = dt.number[36]]], dt.row['p2', map[name = dt.words['Alan'], age = dt.number[41]]], dt.row['p3', map[name = dt.words['Grace'], age = dt.number[29]]]]
t = dt.new[columns, people]
t = dt.sort_toggled[t, 'age', false]      --- a press on Age's sort
t = dt.search_set[t, dt.words['a']]       --- what the search field holds
t = dt.page_size_set[t, 25]
m = dt.models[t]                          --- every row model, worked out once
for r in m.page.rows                      --- the rows to draw, in order
    log['`r.id` `dt.shown[r.cells[\'name\']]` `dt.shown[r.cells[\'age\']]`']
log['`dt.page_count[t, m]` page']
```

A cell says what kind of value it holds: `dt.words`, `dt.number`,
`dt.truth`, `dt.date`, `dt.listed`, or `dt.missing[]` for none. A missing
value sorts after the others, and text that holds digits sorts as words and
numbers (`item 9` before `item 10`).

## In a headset

The table is drawn on a panel as on a screen: the controller's ray presses
its headers, rows and page buttons, and the thumbstick scrolls its rows as a
wheel does.

## Try it

[Open the data table example](../../examples/datatable/)

## Not included yet

- Dragging columns to reorder them
- Rows loaded a page at a time from a server (the manual flags let a program do it itself)
