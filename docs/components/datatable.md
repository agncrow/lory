# lory.datatable: sorting, filtering, grouping and paging rows

`lory.datatable` (packages/lory/datatable.co, `use lory.datatable as dt`) is
the row model a data grid stands on. It holds rows of cells and column
definitions, and it sorts, filters (with fuzzy ranks and facets), groups and
sums up, expands, pages, selects and pins rows. It orders, hides, pins,
sizes and resizes columns, and lays out their header groups. It also has
Grid.js's search, sort and pages, with their words.

What it answers is what TanStack Table's table-core 9.3.1 answers, with
match-sorter-utils 9.2.6 for the fuzzy ranks, and Grid.js 6.2.0 for the
grid. tests/datatable/reference.co holds it to them on 121,906 values. None
of their source is included. The behaviour was read from their documents and
from running them, and written anew.

datatable draws nothing. A program draws the rows it answers with gui's
`table` (as the example does), or with any control it likes. The lead's
drawn grid stands on it too.

```
use lory.datatable as dt

columns = [dt.column['name', 'Name'], dt.column['age', 'Age', aggregate_with = 'mean']]
rows = [dt.row['p1', map[name = dt.words['Ada'], age = dt.number[36]]]]
t = dt.new[columns, rows]
t = dt.sort_toggled[t, 'age', false]      --- a press on Age's sort
t = dt.search_set[t, dt.words['ad']]      --- the search box
t = dt.page_size_set[t, 25]
m = dt.models[t]                          --- every row model, once
for r in m.page.rows                      --- the rows to draw, in order
    ...
dt.page_count[t, m]
```

A table is a record: its columns, its rows, its options and its state. A
function that changes the state answers the table changed, and applies
TanStack's automatic resets there and then (a new filter goes back to the
first page). `models[t]` works out the rows the state makes, once. The
functions that answer about rows take them (`dt.page_count[t, m]`).

A cell is a `Value` that says which JavaScript value TanStack would hold
there: undefined, null, a number, text, a truth, a date or a list. The
libraries' answers turn on it. A missing age sorts after the others, a null
one counts as 0 in a range, and text holding digits sorts as words and
numbers.

## What is built

### Cells and values

| Function | What it answers |
|---|---|
| `missing[]`, `nothing[]` | A cell holding JavaScript's undefined, or null. |
| `number[n]`, `words[t]`, `truth[b]` | A cell holding a number, text or a truth. |
| `date[ms]`, `listed[vs]` | A cell holding a date (milliseconds since 1970, UTC), or a list of values. |
| `shown[v]` | The text JavaScript's String() gives a value (a date in UTC). |
| `number_text[x]` | A number as JavaScript writes it: `0.30000000000000004`, `1e+21`, `1.5e-7`, `NaN`. |
| `text_number[t]`, `js_number[v]`, `parsed_float[v]` | JavaScript's Number() of text and of a value, and parseFloat(). |
| `strictly_same`, `same_value`, `loosely_same` `[a, b]` | JavaScript's `===`, SameValueZero (a Map's and includes()'), and `==`. |
| `js_less[a, b]` | JavaScript's `<`. |
| `plain_letters[t]` | Text with its letters' accents taken off, as match-sorter takes them off. |

### Rows and columns

| Function | What it answers |
|---|---|
| `row[id, cells]`, `tree_row[id, cells, subs]` | A row of data by id, its cells by key; one with rows under it. |
| `value_of[r, c]`, `is_group[r]` | What a row holds in a column; whether a row stands for a group. |
| `column[key, header, …]` | A column that reads the cell under `key`, with TanStack's column options (below). |
| `display_column[id, header, …]` | A column that reads no cell, for a checkbox or a button. It cannot sort, filter, search or group. |
| `column_group[id, header, columns, …]` | A header over columns. |
| `rows_set[t, rows]`, `columns_set[t, columns]` | The table with new rows (and their resets), or new columns. |
| `leaf_columns`, `flat_columns` `[t]` | The leaf columns in their order; every column as defined. |
| `column_of`, `has_column`, `column_depth`, `column_parent` `[t, id]` | A column by id, and where it stands among the groups. |

A column's options are TanStack's under plain names:

| Option | TanStack | Meaning |
|---|---|---|
| `sort_with` | sortingFn | `'auto'`, a sort function's name, or `'rank'` (the fuzzy rank, then alphanumeric) |
| `first` | sortDescFirst | `'auto'` (ascending for text, descending otherwise), `'asc'`, `'desc'` |
| `absent` | sortUndefined | `'greater'` (the default), `'smaller'`, `'first'`, `'last'`, `'compared'` |
| `invert` | invertSorting | Directions turned round (a ranking, where 1 is best) |
| `multi` | enableMultiSort | `'auto'`, `'yes'`, `'no'` |
| `filter_with` | filterFn | `'auto'`, one of the 22 filter functions, or `'fuzzy'` |
| `searchable` | enableGlobalFilter | `'auto'` (when the first value is text or a number), `'yes'`, `'no'` |
| `aggregate_with` | aggregationFn | `'auto'`, `'none'`, or one of the 12 aggregation functions |
| `size`, `smallest`, `largest` | size, minSize, maxSize | 150, 20 and 2^53 - 1 pixels |
| `sortable`, `filterable`, `groupable`, `hideable`, `pinnable`, `resizable` | enableSorting and the rest | Whether the column may |

### The table, its options and its row models

| Function | What it answers |
|---|---|
| `new[columns, rows]` | A table with the default options and an empty state. |
| `made[columns, rows, o, s]` | A table with these options and this state to begin with. |
| `options[…]` | The table's options, TanStack's under plain names, each with its default. |
| `empty_state[]` | Nothing sorted, filtered, grouped, expanded, selected, hidden or pinned, on the first page of ten. |
| `models[t]` | Every row model, each made from the one before: `core`, `filtered`, `grouped`, `sorted`, `expanded` and `page`. Each is a `Model[rows, flat]`. |
| `core_model`, `filtered_model`, `grouped_model`, `sorted_model`, `expanded_model`, `page_model` | One row model, from the one before it. |
| `row_of[m, id]`, `data_row_of[m, id]` | A row by id: as grouped (a group's too), or the data's own. |

The table's options are TanStack's: `sortable`, `multi`, `removable`
(enableSortingRemoval), `multi_removable`, `most_sorted`
(maxMultiSortColCount), `first`, `reset_sorting`, `filtering`,
`column_filtering`, `searching`, `search_filter` (globalFilterFn),
`from_leaves` (filterFromLeafRows), `filter_depth`, `groupable`,
`grouped_columns` (`'reorder'`, `'remove'`, `'keep'`), `expandable`,
`page_expanded` (paginateExpandedRows), `reset_expanded`, `known_pages`
(pageCount: -2 counts the rows, -1 is unknown), `known_rows` (rowCount),
`reset_pages`, `selectable`, `multi_select`, `select_subs`, `row_pinnable`,
`keep_pinned`, `hideable`, `column_pinnable`, `resizable`, `resize_mode`
(`'end'`, `'change'`) and `resize_direction` (`'ltr'`, `'rtl'`). The five
manual flags (`manual_sorting`, `manual_filtering`, `manual_grouping`,
`manual_expanding`, `manual_pages`) leave a step to the program. Three lists
name rows where TanStack takes a function of the row: `unselectable`,
`closed` (rows whose sub-rows are not selected with them) and `unpinnable`.

### Sorting

| Function | What it answers |
|---|---|
| `sort_toggled[t, id, multi]` | The table after a press on a column's sort (`multi` for a shift-press). |
| `sorted_by[t, sorting]` | The table sorted by these columns in turn (`[dt.Sort['age', true]]`). |
| `sort_of`, `sort_index` `[t, id]` | How a column sorts (`'asc'`, `'desc'`, `''`), and where it stands in the sorting. |
| `can_sort`, `can_multi_sort` `[t, id]` | Whether a column may sort, alone or with others. |
| `next_sort[t, m, id, multi]` | The direction a press would sort a column in next (a button's title). |
| `first_sort`, `auto_sort` `[t, m, id]` | The direction a column sorts in first, and the one its values ask for. |
| `sort_function[t, m, id]`, `sort_name[c, filtered]` | The sort function a column sorts with. |
| `sort_compare[name, a, b]`, `alphanumeric_compare[a, b]` | The six sort functions: `alphanumeric`, `alphanumericCaseSensitive`, `text`, `textCaseSensitive`, `datetime`, `basic`. |

### Filtering, the search and fuzzy ranks

| Function | What it answers |
|---|---|
| `filter_set[t, id, value]`, `filters_set[t, filters]` | The table with a column's filter set (or taken away), or all of them replaced. |
| `search_set[t, value]` | The table searched: the global filter's value. |
| `filter_value`, `is_filtered`, `can_filter` `[t, id]` | A column's filter, and whether it may have one. |
| `can_search`, `filter_function` `[t, m, id]`; `search_columns[t, core]` | Which columns the search reads, and a column's filter function. |
| `filter_passes[name, data, filter]` | One of the 22 filter functions: the string ones, `equals`, `weakEquals`, `empty`, `notEmpty`, the comparisons, `between`, `betweenInclusive`, `inNumberRange`, `inDateRange` and the four list ones. |
| `resolved_filter[name, value]`, `filter_removes[name, value]` | A filter's value as the function reads it, and whether a value takes the filter away. |
| `fates_of[t, core]` | Each row's verdict from each filter, and its fuzzy ranks. |
| `match_rank[item, query]`, `rank_of[v, query, threshold]`, `rank_compare[a, b]` | match-sorter's ranks, 0 to 7, and their order. |

### Facets

| Function | What it answers |
|---|---|
| `faceted_rows[t, core, id]` | The rows that pass every filter but the column's own (`'__global__'` for the search's). |
| `faceted_values[t, core, id]` | Each value the column holds there, in the order met, with how many rows hold it. |
| `faceted_range[t, core, id]` | The least and greatest numbers the column holds there. |

### Grouping and aggregation

| Function | What it answers |
|---|---|
| `grouping_set[t, ids]`, `grouping_toggled[t, id]` | The table grouped by these columns in turn; a column added or taken out. |
| `is_grouped`, `grouped_index`, `can_group` `[t, id]` | Whether and where a column groups. |
| `cell_grouped`, `cell_placeholder` `[t, r, id]`; `cell_aggregated[t, m, r, id]` | What a group row's cell holds: its group's value, nothing of its own, or an aggregate. |
| `aggregated[name, vs]` | An aggregation function: `sum`, `min`, `max`, `extent`, `mean`, `median`, `unique`, `uniqueCount`, `count`, `first`, `last`. |
| `aggregate_name[c, core]` | The function a column sums a group up with (`'auto'`: a sum of numbers, the extent of dates). |
| `footer_value[t, m, id]` | A column's footer: its aggregate over the filtered rows. |

### Expanding

| Function | What it answers |
|---|---|
| `row_expansion_set`, `row_expansion_toggled` `[t, id, …]` | The table with a row expanded or collapsed. |
| `all_expansion_set`, `all_expansion_toggled`, `expansion_set` | Every row expanded or none; the state set whole. |
| `can_expand[t, r]`, `is_expanded[t, id]`, `parents_expanded[t, m, id]` | A row's flags. |
| `all_expanded`, `can_some_expand`, `expanded_depth` `[t, m]`; `some_expanded[t]` | The table's flags, and how deep the expanded rows reach. |

### Pages

| Function | What it answers |
|---|---|
| `page_set`, `page_size_set` | The table on a page, or with pages of a new size (on the page that holds the old page's first row). |
| `next_page`, `previous_page`, `first_page`, `last_page` | The table on another page. |
| `row_count`, `page_count`, `page_numbers` `[t, m]` | How many rows and pages; the pages' indexes. |
| `can_previous[t]`, `can_next[t, m]`, `can_last[t, m]` | Whether there is a page to go to. |

### Row selection

| Function | What it answers |
|---|---|
| `row_selection_set`, `row_selection_toggled`, `selection_set` | The table with a row selected (with its sub-rows) or let go; the selection set whole. |
| `all_selection_set`, `all_selection_toggled`, `page_selection_set`, `page_selection_toggled` | Every filtered row, or the page's rows, selected or let go. |
| `is_selected[t, id]`, `subs_selected[t, r]` | A row's flag, and its sub-rows' (`'all'`, `'some'`, `''`). |
| `all_selected`, `all_page_selected`, `some_page_selected` `[t, m]`; `some_selected[t]` | The header checkbox's states (some is its mixed state). |
| `can_select[t, id]`, `can_multi_select[t]`, `can_select_subs[t, id]` | What selection may do. |
| `selected_rows`, `filtered_selected_rows`, `grouped_selected_rows` `[t, m]`; `selected_of[t, model]` | The selected rows of a row model. |

### Row pinning

| Function | What it answers |
|---|---|
| `row_pinned[t, id, side, leaves, parents]` | The table with a row pinned to `'top'` or `'bottom'` (or freed), with the rows under it and over it if asked. |
| `top_rows`, `center_rows`, `bottom_rows` `[t, m]` | The rows each part shows. |
| `row_pin_of`, `can_pin_row` `[t, id]`; `pinned_row_index[t, m, id]`; `some_rows_pinned[t, side]` | A row's side and place. |

### Columns: visibility, order and pinning

| Function | What it answers |
|---|---|
| `visibility_set`, `visibility_toggled` `[t, id, …]`; `all_visibility_set`, `all_visibility_toggled` | The table with columns shown or hidden. |
| `is_visible`, `can_hide` `[t, id]`; `all_visible`, `some_visible` `[t]` | Visibility's flags. |
| `visible_columns`, `visible_flat_columns` `[t]` | The columns that show. |
| `order_set[t, ids]` | The table with its columns in this order. |
| `column_pinned[t, id, side]` | The table with a column pinned to `'start'` or `'end'`, or freed. |
| `column_pin_of`, `can_pin_column`, `pinned_column_index` `[t, id]`; `some_columns_pinned[t, side]` | Pinning's flags. |
| `side_columns[t, side]`, `drawn_columns[t]` | The columns each part shows, and all of them in the order drawn. |

### Sizes, resizing and header groups

| Function | What it answers |
|---|---|
| `column_size[t, id]`, `total_size[t]`, `side_size[t, side]` | Widths in pixels, kept within each column's bounds. |
| `column_start`, `column_after`, `column_index`, `is_first_column`, `is_last_column` `[t, id, side]` | Where a column stands in a part: a sticky column's offsets and its edges. |
| `column_size_set`, `column_size_reset` `[t, id, …]` | The table with a width set, or back to the column's own (a double press on the handle). |
| `can_resize`, `is_resizing` `[t, id]` | Resizing's flags. |
| `resize_started[t, header_id, x]`, `resize_moved[t, x]`, `resize_ended[t, x]` | A drag on a header's handle, from press to release. |
| `header_groups[t, side]`, `flat_headers[t]` | The rows of headers over a part, each with its span, its width and where it starts. |

### Grid.js: search, sort and pages

| Function | What it answers |
|---|---|
| `grid[rows, limit, count]` | A grid of rows (lists of cells) on its first page. |
| `grid_searched[g, keyword]`, `grid_matches[cells, keyword]` | The grid searched; whether a row holds a keyword. |
| `grid_sort_pressed[g, index, multi]` | The grid after a press on a column's sort button. |
| `grid_sort_state[g, index]`, `grid_sort_title[g, lang, index]` | A sort button's state and title. |
| `grid_page_pressed[g, page]`, `grid_next`, `grid_previous` | The grid on another page. |
| `grid_order`, `grid_total`, `grid_pages`, `grid_shown` `[g]` | The rows kept and sorted, how many, the pages, and the page's rows. |
| `grid_buttons[g, lang]` | The page buttons: Previous, a run of page buttons with gaps, Next. |
| `grid_summary`, `grid_summary_title` `[g, lang]`; `grid_cell_text[v]` | "Showing 1 to 10 of 57 results", "Page 1 of 6", and a cell's text. |
| `grid_language[]` | Grid.js's own words (en_US) as a `Language`, whose every word a program may replace. |

## Behaviours held

- **The sort cycle.** A press on an unsorted column sorts it in its first
  direction. The next press turns it round, and the third stops it. The first
  direction is ascending for text and descending for anything else, judged
  from the first of the first ten filtered rows that holds a value. Turning
  off sorting removal makes the third press turn it round again.
- **Several columns.** A plain press replaces the sorting, or turns the
  column round when it is the only one. A shift-press adds the column at the
  end. Past `most_sorted`, the oldest column is dropped. Missing values go
  where `absent` says. The default counts them greater than any value, so
  they come last ascending and first descending, as TanStack's do.
- **Sort functions.** `alphanumeric` reads runs of digits as numbers
  (`a2` before `a10`). `text` ignores case. `datetime` compares instants.
  `'auto'` chooses one from the first ten filtered rows.
- **Filters.** Column filters all hold together. The search keeps a row when
  any searchable column passes. A null, undefined or empty value takes a
  filter away, and a range's ends are swapped when given the wrong way round.
  Sub-rows are filtered from the root down, or from the leaves up
  (`from_leaves`), to `filter_depth`.
- **Fuzzy ranks.** match-sorter's: 7 for the same text, down to letters in
  order (between 1 and 2) and 0 for no match, with accents taken off. A
  `'rank'` sort orders rows by the ranks their filter gave them, then
  alphanumerically.
- **Facets.** A column's facets count the rows every other filter keeps.
  Values are the same as a JavaScript Map finds them. The range reads values
  as Number() does and passes NaN over.
- **Groups.** One group row for each value, in the order first met, with the
  ids TanStack gives (`status:single`, `status:single>active:true`). A group
  row holds its first row's value in the grouped column and the aggregates
  elsewhere. Grouped columns move first, are removed, or stay
  (`grouped_columns`).
- **Automatic resets.** A change of filter, search, sorting or grouping goes
  back to the first page. New rows, filters and grouping set the expanded
  rows back to how the table began. A manual flag leaves its step and its
  resets to the program, and `reset_pages` and `reset_expanded` turn the
  resets off.
- **Pages.** The page count is the rows over the page size, or `known_pages`
  (-1 for unknown, when Next is always allowed). The index never goes below
  0, and it is held to the last page only when the count is given. A new
  page size keeps the old page's first row in view. With `page_expanded` off, a parent's expanded
  rows stay on its page.
- **Selection.** Selecting a row selects the rows under it, unless
  `select_subs` is off or the row is `closed`. Select-all reaches every
  filtered row that may be selected. In single mode, selecting one lets the
  others go. The header's all and some states follow the rows.
- **Row pinning.** Pinned rows stand at the top or the bottom in the order
  they were pinned. With `keep_pinned`, they show wherever they are filtered
  or paged to, while their parents are expanded.
- **Columns.** Pinned columns are split off to their sides first, then the
  column order applies to the center, then grouped columns move first.
  Sizes keep within each column's bounds. A resize of a group's header
  shares the change among its columns in proportion to their widths. It
  shows as the pointer moves (`'change'`) or on release (`'end'`), in either
  direction.
- **Header groups.** Every row of headers reaches down to the deepest group.
  A column with no group above it gets placeholder headers, and the topmost
  of them spans the rows down to its own header.
- **Grid.js.** The search trims the keyword, ignores case and looks in every
  cell's text. A sort button goes ascending, then turns round each press. A
  shift-press adds a column, which a third press removes. Ties keep their
  order. A search or a sort goes back to the first page. The page buttons
  show a run around the page shown, with the first and last pages and gaps
  outside it.

## Parity

### Numbers: reference.mjs and reference.co

`tests/datatable/reference.mjs` runs the libraries on data it generates
from a seed (names made from syllables). It runs table-core 9.3.1 and
match-sorter-utils 9.2.6 in node, and Grid.js 6.2.0 in headless Chrome:

```
npm install --prefix <dir> @tanstack/table-core@9.3.1 \
    @tanstack/match-sorter-utils@9.2.6 gridjs@6.2.0
node tests/datatable/reference.mjs <dir>/node_modules
```

It writes `reference.json`, which holds 134,086 values, inputs and answers
together:

- 166 row cases: one state each, with every row model read.
- 64 sequences: steps through the library's own functions (sort presses,
  page steps and their resets, expanding, selection, row pins, column
  changes, resizes), with the models read after every step.
- 4 facet cases.
- Two Grid.js grids, searched, sorted and paged, read 48 times.

It runs in UTC wherever it runs.

`tests/datatable/reference.co` builds the same tables, takes the same steps
through lory.datatable and holds every answer to the library's. That means
the same row ids in the same order at the same depths, the same pages,
groups, aggregates and flags, the same header groups and sizes, the same
ranks, and the same buttons and words. Its 13 blocks hold 121,906 values
and none differ, interpreted and compiled:

| Block | Values held |
|---|---|
| Row cases | 30,884 |
| Sort functions on pairs | 8,972 |
| Filter functions on pairs | 2,627 |
| Fuzzy ranks and accents | 1,468 |
| Sort presses | 3,515 |
| Page steps | 9,111 |
| Expanding steps | 8,382 |
| Selection steps | 12,245 |
| Row pins | 3,247 |
| Columns: order, visibility, pinning, sizes, headers | 34,587 |
| Resizes | 292 |
| Facets | 2,933 |
| Grid.js | 3,643 |

Each block also holds its count to the one it had when it was written, so a
reading that came to compare less would fail.

The harness copies two of the library's ways that belong to it and not to
the table. TanStack's grouping writes a row's grouped depth and parent into
row objects it shares with the data, so after a grouped draw those rows
report the grouped depth wherever they appear. A row the filters made anew
also keeps its own parent while its grouped copy names its group. The
harness reads depths and parents as the library's shared rows show them.

### Both modes: tests/modes/datatable.co

`tests/modes/datatable.co` writes out what the module makes of fixed rows,
in 169 lines. That covers each column sorted both ways, sort presses,
filters, the search, fuzzy ranks, groups with their aggregates and footers,
page steps, a tree expanded, selected and pinned, header groups per side,
sizes and a resize, facets, and a Grid.js grid searched, sorted and paged.
`tests/modes.sh crow tests/modes/datatable.co` finds the interpreter's
lines and the compiled program's the same.

### The module's own tests

`packages/lory/datatable.co` ends with 28 test blocks (113 truths) that say
the behaviours above in small cases. They pass interpreted and compiled.

### The browser

`examples/datatable` builds for the web. A script (kept outside the
repository) served the build to headless Chrome and pressed it there:

1. The first picture draws (307 colours).
2. A click on Next turns the page (21,845 pixels changed).
3. A click on Sort by age sorts (26,378 pixels).
4. Typing `oslo` into the search finds 46 people (22,567 pixels).

Nothing threw, and nothing was logged as an error.

### In a headset

The example is made of gui's controls, so in a headset its page is the
1000 by 560 panel. Its table is drawn 300 pixels high there, so the whole
page fits. Three of its blocks drive it with headset frames:

- **The ray:** with the trigger on Next, the page turns.
- **The thumbstick:** pulled toward the reader, it scrolls the table to the
  page's tenth row, and the trigger then selects that row.
- **AR:** in a headset that shows the room through the drawing, the frame
  is cleared to nothing, so only the panel stands in the room.

## Where Lory differs, and why

- **Functions are named.** TanStack takes a function wherever it takes a
  sort, filter or aggregation function. Lory takes the built-in functions'
  names, plus `'fuzzy'` and `'rank'`. A program with its own comparison or
  test sorts or filters its rows itself and sets the manual flag.
- **Lists instead of functions of the row.** TanStack asks a function of
  each row whether it may be selected (enableRowSelection), whether its
  sub-rows go with it (enableSubRowSelection) and whether it may be pinned
  (enableRowPinning). Lory reads lists of ids: `unselectable`, `closed` and
  `unpinnable`. The reference builds the library's functions from the same
  lists.
- **Dates.** JavaScript compares two Date objects by identity, and Lory
  compares them by their instant. JavaScript writes a date's text in the
  machine's local time, and Lory writes it in UTC (the reference runs in UTC).
- **Resets happen at once.** TanStack queues its automatic resets until the
  row models are next read. Lory applies them in the function that changes
  the state. A page that draws after each change sees the same thing.
- **No features to register.** TanStack registers its features and keeps
  its state in a store, with `on…Change` callbacks. In Lory every feature is
  always there, and the table is a value the program keeps.
- **Not built:** getRowCanExpand, where a row with no sub-rows may expand
  for a detail panel. A program draws a detail row under the rows it holds
  open itself.

## The example

`examples/datatable/main.co` is three hundred made-up people, their names
made from syllables. It has a search field, a page size select (10, 25 or
50) with Previous and Next, a grouping select (by team or by city) and a
row of sort buttons. A press sorts by the column, the next turns it round,
and the third stops.

A group's row shows how many it holds, their mean age and their total
score, and pressing it opens the group. Pressing a person's row selects
them. Every answer is lory.datatable's, and the drawing is gui's `table`,
`field`, `select` and `button`.

Its 10 blocks (41 truths) pass interpreted and compiled:

- The first page.
- A search, which goes back to page 1.
- A sort press, then a second press that turns it round.
- Grouping, and opening a group.
- Selecting a person.
- Clicks on Next, one of them under a table held short.
- The three headset blocks.

gui's table takes a release just under its bottom edge for a row scrolled
out of view there. When the table is held short, a click on Next would also
choose a hidden row, so the example takes a row's choice only from a
release inside the table.

## The survey's rows

The TanStack Table and Grid.js rows of survey/data.md, the table rows of
survey/kits.md (Vuetify and Semantic UI), and TOAST UI Grid in
survey/pickers.md. "The drawing" is gui's table today and the lead's drawn
grid next. datatable gives it every number it draws from.

### TanStack Table

| Row | Status |
|---|---|
| Sorting (guide) | Built and tested: the state, the cycle, the first direction, removal, several columns and their limit, missing values, inverted columns, the six sort functions, manual sorting. A function of the program's is not built (see above). |
| Column filtering (guide) | Built and tested: the 22 filter functions, how each resolves its value and what takes it away, and AND across columns. Functions of the program's are not built. |
| Global filtering (guide) | Built and tested: any searchable column, the default `includesString`, columns opting out, AND with the column filters. |
| Fuzzy filtering (guide) | Built and tested: match-sorter's ranks and threshold, the ranks kept on the row, and the rank sort that falls back to alphanumeric. |
| Column faceting (guide) | Built and tested: faceted rows, unique values with counts, the least and greatest. |
| Grouping (guide) | Built and tested: groups in order, their ids, `reorder`, `remove` and keeping in place, the grouped, placeholder and aggregated flags, manual grouping. |
| Aggregation (guide) | Built and tested: the 12 named functions and `auto`, and footers. An inline function or a list of them is not built. |
| Expanding (guide) | Built and tested: all or by id, sub-rows, pages with and without expanded rows, the reset, manual expanding. getRowCanExpand is not built. |
| Pagination (guide) | Built and tested: index and size, page and row counts, unknown counts, the resets, manual pages, first, previous, next and last. |
| Row selection (guide) | Built and tested: by id, sub-rows with their parent, single mode, rows that may not be selected, select-all, the page's, and the all and some flags. A shift-click range is the program's: `selection_set` of the ids between. |
| Row pinning (guide) | Built and tested: top and bottom, with the rows under and over a row, keeping pinned rows, rows that may not pin. |
| Column ordering (guide) | Built and tested: the order, after pinning and before grouping. |
| Column pinning (guide) | Built and tested: start and end, sticky offsets, first and last edges, each side's columns and headers. |
| Column sizing (guide) | Built and tested: the defaults, bounds, start, after and total sizes. |
| Column resizing (guide) | Built and tested: the resize state, `end` and `change`, ltr and rtl, a group's share, a reset. The handles are the drawing's. |
| Column visibility (guide) | Built and tested: hidden by id, columns that may not hide, all and some, groups following their leaves. |
| Table state (guide) | Built: the state is one record, given at the start (`made`) and changed by functions. Atoms and `on…Change` are bindings, with nothing to build. |
| Virtualization (guide), virtualized-rows, -rows-experimental, -columns, -columns-experimental, -infinite-scrolling | Not built here: windowing a long list is lory.scrolling's. Its rows are the page model's. |
| Cell selection (guide), Cell spanning (guide), cell-selection, cell-spanning, spreadsheet, realtime-trading | Not built here: they are lory.datagrid's (the catalog's home). |
| Basic table, basic-use-app-table, basic-use-legacy-table, basic-dynamic-columns, basic-external-atoms, basic-external-state, basic-subscribe | The engine under them (sorting, filters, pages, select-all) is built and tested, and the example draws such a table. createTableHook and atoms are React's, with nothing to build. |
| column-ordering, column-pinning, column-pinning-split, column-pinning-sticky, column-sizing, column-resizing, column-resizing-performant, column-visibility, header-groups | Built and tested here as orders, sides, offsets, sizes and spans. Drawing them is the drawing's. |
| expanding, sub-components | Expanding is built and tested. A detail row for a row with no sub-rows is not built (getRowCanExpand). |
| filters, filters-faceted, filters-fuzzy | Built and tested. |
| filters-faceted-bucketed | Built, untested as buckets: the faceted values, counted into the program's own buckets. |
| grouping, grouped-aggregation, aggregation | Built and tested. The aggregation example's choice of rows is `aggregated` over any rows the program picks. |
| pagination, row-selection, row-pinning, sorting | Built and tested. A custom sort function of the program's is not built. |
| custom-plugin, composable-tables | Not built: features are fixed, and a program composes its own functions around the table. |
| column-dnd, row-dnd | Not built here: dragging is lory.drag's. A drop's new order is `order_set`, or the program's rows. |
| with-tanstack-form | Not built here: editing cells is lory.forms' and lory.datagrid's. |
| with-tanstack-query | Built and tested: the manual flags with a known page or row count. Fetching is the program's. |
| with-tanstack-router | Not built: keeping the state in a URL is the program's. The state is a record it can write there. |
| web-worker-row-models | Nothing to build: `models[t]` is a function a program may run on another thread. |
| lib-mantine, lib-material-ui, lib-chakra-ui and the other kits, mantine-react-table, material-react-table | Their engines are this one (built and tested). Their looks are the drawing's. |
| Examples by UI library (themes) | Not built here: themes are gui's and lory.colors'. |

### Grid.js

| Row | Status |
|---|---|
| Search | Built and tested: the keyword trimmed, any case, any cell, back to the first page. The debounce is the program's (when it calls `grid_searched`). The selector, hidden columns and server search are not built. |
| Sorting | Built and tested: ascending first, turning round, shift adds and a third press removes, ties kept. A column's own compare function is not built. |
| Pagination | Built and tested: limit, the button count, the run of buttons with gaps, Previous and Next turned off at the ends, the summary and its title, and one row a page. |
| Config: language and locales | Built and tested for en_US: every word is a field of `Language`. Grid.js's 17 other locales are its data and are not copied. A program fills a `Language` for its own. |
| Empty / error states | The words are built and tested (`none_found`, `failed`, an empty summary). The drawing is the program's. |
| Hello, World!, Config: data, Data source (import JSON) | Rows as lists of cells are built and tested. A program maps objects to lists. `from` (an HTML table) and functions as data are not built: Lory has no DOM. |
| Hidden columns, Config: columns | Not built for the grid: a program leaves the column out. TanStack's visibility is built and tested. |
| Advanced: nested header | Built and tested as TanStack's header groups. Grid.js's own drawing is not built. |
| Resizable columns | Built and tested as TanStack's resizing. The handles are the drawing's. |
| Customizing: cell formatting | Not built: a formatter is the program's code. `grid_cell_text` gives the default text. |
| Loading state, Server-side | Not built: async data and fetching are the program's. The manual flags carry server pages. |
| Wide table, Fixed header, Config: width, height, autoWidth, fixedHeader | Not built: they are the drawing's. |
| Styling (CSS) | Not built: Lory has no CSS. Looks are gui's. |
| Plugins system | Not built: there are no plugin positions. A program composes functions. |
| Selection plugin | Built and tested as TanStack's row selection. The checkbox column is the drawing's. |
| Integrations | Nothing to build. |

### Vuetify and Semantic UI (survey/kits.md)

| Row | Status |
|---|---|
| Data table (Vuetify) | Built and tested: show-select with select-all, show-expand, group-by, multi-row headers, multi-sort and sort-by, search. Expand-strategy single is `expansion_set` of one row: built, untested as a strategy. Fixed header and footer, loading, slots and sort icons are the drawing's (not built). |
| Data table sorting, filter and pagination (Vuetify) | Built and tested: sort-by as a list, multi-sort with a modifier, per-column filters, page state held by the program. sortRaw and a custom filter (functions) are not built. |
| Server-side table (Vuetify) | Built and tested: manual flags with a known row count. A change answers the new table, which the program reads where Vuetify emits update:options. The loading bar is the drawing's. |
| Data iterator (Vuetify) | The engine is built and tested: sort, filter, pages, groups opened per model. Drawing rows as cards is the program's. |
| Virtual table (Vuetify) | Not built here: windowing is lory.scrolling's. |
| Simple table (Vuetify) | Not built here: a styled table is gui's `table`. |
| Table (Semantic UI) | The sort state behind a sortable header is built and tested (`sort_of`), and so are selectable rows. Its styles (definition, structured, cell states, striped, celled and the rest) are the drawing's, not built. |

### TOAST UI Grid (survey/pickers.md)

| Row | Status |
|---|---|
| Grid | Built and tested here: sort, filter, column resize, reorder and hide, frozen columns (pinning), complex columns (header groups), summary (aggregation), tree rows, pages, row selection. Not built here: virtual scroll (lory.scrolling), cell selection, the keymap, editing, merged cells and validation (lory.datagrid). |
| Custom editor, relations, themes, date picker, summary, data source, tree | Summary, remote pages (manual flags and counts) and tree rows are built and tested. Editors, relations and themes are lory.datagrid's and gui's. |

### The catalog's rows for lory.datatable

These are the rows of [README.md](README.md) whose home is `lory.datatable`.

| Catalog row | Status |
|---|---|
| Sorting | Built and tested |
| Filtering and search | Built and tested |
| Grouping and aggregation | Built and tested |
| Expanding rows and sub-rows | Built and tested (getRowCanExpand not built) |
| Table pagination (page index and size) | Built and tested |
| Row selection | Built and tested |
| Row pinning | Built and tested |
| Column visibility | Built and tested |
| Column ordering | Built and tested |
| Column pinning | Built and tested |
| Column sizing and resizing | Built and tested (the handles are the drawing's) |
| Header groups and nested headers | Built and tested |
| Data table (sorting, search, pagination, selection, expandable rows) | Built and tested; the example draws one with gui's table |
| Table state, composition and plugins | The state is built and tested. Plugins and bindings: not built (nothing to register) |
| Server-side data, loading and empty states | Manual flags and counts built and tested; Grid.js's empty and error words built and tested; loading is the drawing's |
| Data iterator (cards driven by table state) | The engine built and tested; the cards are the program's |
| Cell formatting and rendering | Not built: a formatter is the program's code, and drawing is the drawing's |
| Fixed header, wide tables and column widths | Widths built and tested; the fixed header and scrolling are the drawing's |
