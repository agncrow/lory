# Vue's examples in Lory

examples/vue holds the twenty examples on vuejs.org/examples, rebuilt as
one Lory program. A menu down the side lists them in Vue's three groups:
Basic, Practical and the 7 GUIs. The example chosen stands beside the menu.
Each one is held to what the real Vue example shows in Chrome, step by step
(tests/vue/parity.co).

None of Vue's source, prose or styles is copied, and neither is marked's or
lodash's. Behaviour was read from the examples and written again in Crow.
That includes the Markdown reader, the Cells formula evaluator and lodash's
shuffle and debounce. Where an example's starting data is the point of its
checks, Lory uses the same data as a shared input: the grocery list, the
heroes and their power, the tree's folders, the six stats A to F, and the
CRUD names. Short labels and messages that the checks read are kept word for
word ("Can't delete more!", "No matches found.", the booking alerts). Longer
words are Lory's own. The commits Fetching Data shows are invented, canned
answers. They are not GitHub's.

```
cd examples/vue
crow build --target web main.co     # main_web/, served by any static server
crow test main.co                   # the menu and a press through it
crow test tests/vue/parity.co       # (from the repository's root) held to Vue
crow test tests/vue/headset.co      # (from the root) ray, drawn keyboard, thumbstick
bash tests/modes.sh crow tests/modes/vue.co   # the same in both of Crow's modes
```

## How the program is made

Each example is a part of the folder, such as counter.co or cells.co. A
part imports Lory, Crow's own modules and common.co, never another example.
Every part has the same five functions:

| function | what it does |
|---|---|
| `fresh[]` | the example's state as it starts (Flight Booker: `fresh_on[day]`; Fetching Data: `fresh_at[mount]`, so that a request's name tells which start sent it) |
| `ticked[s, c]` | the state moved on by the frame's time and by what the page answered, before it is drawn |
| `controls[s, c, room]` | what is drawn: a gui tree, in a room of `room.wide` by `room.tall` CSS pixels |
| `handled[s, shown, c]` | the state after what the reader did (`shown.events`, the frame's own input) |
| `seen[s, tree]` | what the example shows, read from its tree, in the reference's own record shape |

gallery.co holds the menu and the page, and it sends each call to the
chosen example's part, one chain of `if slug eq …` for each of the five. It
was first written by a script kept outside the repository, but it is plain
Crow: an example added is a line in `order[]`, `title_of`, `group_of` and
`note_of`, and in each chain. It keeps each
example's state under `vue.<slug>` (`use memory`). Choosing an example
starts it again, as a page opened anew would. `framed[frame]` is the whole
of a frame. main.co hands it each frame and ends it.

common.co holds what several parts share:

- numbers written as JavaScript writes them (`js_number`, `js_round`, `fixed`, `js_remainder`)
- strings read as JavaScript reads them (`js_parse`, `html_number`)
- Park-Miller's random numbers, and lodash's shuffle over them
- styled words (bold, italic, underlined, struck) drawn by a painter, and links
- the browser's `alert` as a modal layer
- the readers the tests use (`node_by`, `words_under`, `tip_by`, `off_by`)

**A Crow bug, worked around.** Every part that hands gui a painter (a
`gui.drawn` control) also has `_painters_typed[frame]`, a function nothing
calls. It shows a tree once so that Crow types the module's painters. Without
it, a painter handed from a module imported by the one that shows the page
is "handed as a value, and nothing types its parameters". A painter's
answer must also never be able to fail. A test block in an imported module
that shows a tree built from a parsed JSON frame once made every `Drawn`
field fallible, so common.co keeps no such test. Painters read their
example's state through `recall`: Lory hands a painter only its `Drawn`.

## The examples, and what is held

| example | part | what it shows | held as Vue's example does it |
|---|---|---|---|
| Hello World | hello.co | a heading bound to the message | the message |
| Handling User Input | handling.co | Reverse Message, Append "!", a link held back | the message after each press; the link kept from leaving and the alert it raises |
| Attribute Bindings | bindings.co | a span's title, a class and a style toggled by presses | the tip's words, the red class and the green/blue colour after each press |
| Conditionals and Loops | conditionals.co | Toggle, Push, Pop, Reverse over a list | the list, the "hidden" words and the "empty" words, through every case |
| Form Bindings | inputs.co | a field, a checkbox, three checkboxes, radios, a select (its placeholder disabled), a multiple select | every control's value and its echo, the ticked names in tick order, Ctrl-picked choices in the order the select keeps |
| Simple Component | grocery.co | a list drawn by an entry part each | the three entries |
| Markdown Editor | editor.co | Markdown typed on the left, drawn on the right | the field at once and the page 100 ms after the last key (lodash's trailing debounce: at 99 ms nothing, at 100 ms the page); marked's page for 24 sources besides |
| Fetching Data | commits.co | main or minor, and the last three commits of vuejs/core there | every URL asked, in order; each row's words and both links; the commits of whichever answer came last |
| Grid with Sort and Filter | datagrid.co | heroes and power, a search, heads that sort | the rows, each head's arrow and active mark, "No matches found."; `String(value)` filtering, so "INF" finds Infinity; a stable sort turned by each column's own order |
| Tree View | treeview.co | folders opened by a press, an entry made a folder by a double press, `+` to add | every visible row, its depth, `[+]`/`[-]` and bold; folders closed and opened again keep their own open state, as `v-show` does |
| SVG Graph | radar.co | a polygon of the stats over a circle, a slider and X each, add a stat | the polygon's points and each label's x and y (held within 1e-9, as two machines' sines differ in the last place); the values; the JSON written out, with a slid value kept as words (`"50"`) as `v-model` on a range leaves it; "Can't delete more!" |
| Modal with Transitions | dialog.co | a dialog over the dimmed page, faded and scaled in and out | header, body and footer; opacity and scale every 75 ms of the 300 ms `ease` (held within 6e-6, as Chrome writes six digits) |
| List with Transitions | transitions.co | rows inserted, removed, reset and shuffled, gliding | the rows; the first row entering, leaving and moving, with opacity, `scaleY` and slide every 125 ms of 500 ms of `cubic-bezier(0.55, 0, 0.1, 1)` (within 6e-6); Park-Miller seeded with 42 for the inserts and the shuffle, as the reference seeds `Math.random` |
| Counter | counter.co | a number and Count | the count |
| Temperature Converter | temperature.co | Celsius and Fahrenheit, each from the other | both fields after each entry; entered on Enter or the focus leaving, as the `change` event is; `+value` of an empty field is 0 |
| Flight Booker | flights.co | one-way or return, two dates, Book | the select, both dates, which are disabled, the message and the alert |
| Timer | timer.co | the time gone, a bar, a duration slider, Reset | the bar, the seconds in tenths and the duration at each frame time, moved on only when the frame's time does |
| CRUD | crud.co | a prefix filter, a list, two fields, Create, Update, Delete | the names, the one chosen and the three fields after every step, including Vue's quirks (blank names refused, `splice(-1)` when the chosen name has gone) |
| Circle Drawer | circles.co | circles drawn by a press, a radius dialog from a right press, Undo and Redo | every circle's middle, radius and fill; Undo/Redo enabled; the dialog's words and slider; the history cut by a new step after an undo; the radius kept as words after the slider |
| Cells | cells.co, formulas.co | a 5 by 20 sheet of words, numbers and formulas | every cell's shown words and which is being written in, through 25 entries: references, Infinity, NaN, words added to, a reference to itself, a column past E, a formula left unfinished |

### Cells' formulas

formulas.co is Lory's own reader and worker of the JavaScript a cell holds.
Cell names (`A1`, a capital and one or two digits standing alone) become
`get(column, row)` as Vue's regular expression makes them. Anything thrown
is shown as `#ERROR` followed by the error, written as V8 writes it:

- SyntaxError (`Unexpected token '}'` for a formula left unfinished, since
  Vue's `new Function` wraps it in braces, `Unexpected number`,
  `Unexpected identifier 'x'`, `Invalid or unexpected token`)
- ReferenceError (`foo is not defined`)
- TypeError (a column past E, a row past 19, a call of what is not a
  function)
- RangeError (`Maximum call stack size exceeded`: a cell that reaches
  itself; the depth is capped at 120)

It reads numbers (decimal, `0x`, `0o`, `0b` and old octal), words in either
quote, `true`, `false`, `null`, `undefined`, `NaN` and `Infinity`. It reads
`+ - * / % **` with JavaScript's NaN rules, the comparisons, `== != ===
!==`, `&& || ??`, `! ~ typeof void`, the bitwise operators on 32 bits, `? :`
and the comma, members and calls. The names it knows are `get`, `Math` (all
its functions and constants), `Number`, `String`, `Boolean`, `isNaN` and
`isFinite`. Every other global JavaScript defines is "not defined" here.
Methods of words and numbers, object and array literals, assignment and
functions written in a formula are not read.

### Markdown

editor.co reads Markdown by rules of its own, after CommonMark's and
GitHub's:

- **Blocks:** ATX and setext headings, paragraphs, rules, block quotes
  (with lazy lines), bullet and numbered lists (tight or loose, nested, a
  first number kept as `start`), and code fenced by backticks or tildes (its
  first word its `language-` class) or indented four spaces.
- **Inline:** `*` and `_` emphasis by CommonMark's flanking rules and its
  rule of three, `~`/`~~` strikethrough, code spans, links with titles,
  images, `<…>` links, bare `http://`, `https://` and `www.` links,
  backslash escapes, and hard breaks.

Tables, raw HTML (shown as words), link references, footnotes and task lists
are not read. The page is drawn by a painter for each block: headings at
Chrome's sizes, words wrapped to the column, code in `#f66`, links in Vue's
green, quotes with a bar.

The tests read the page as a structure, such as `h1{hello}p{strong{a}}`,
which is what reference.py writes of marked's HTML in Chrome. Lory's page is
written the same way. All 24 reference sources match.

### Where Lory holds something else

- **Today** is the UTC day. Crow's `now[]` has no time zone, and Vue's
  Flight Booker takes the local date. Near midnight a reader away from
  Greenwich may start on yesterday or tomorrow. The tests set the day
  (`gallery.dated`).
- **Links** in Fetching Data copy their address (`lory.copy`) instead of
  opening a tab, which a headset's page cannot do. Each address is the link's
  tip.
- **Fetching Data's states.** Vue's example has no loading or error words.
  It shows nothing until an answer comes, and nothing when the answer is not
  a list. Lory's does the same. A real browser sends the request through
  `@request`; the tests answer it with the canned body, and nothing goes out
  to the network.
- **The modal's dimming** comes in at once. The dialog itself carries
  Vue's eased opacity and scale, but a gui layer's scrim fades only by its
  own straight-line `fade`, so the dimming does not follow the ease.
- **A change made while the list is moving** starts from where the rows
  stand and drops the motion in progress. Vue would start from each row's
  place in mid-flight. The script settles between changes, as Vue's own
  page lets it.
- **The Circle Drawer's right-click menu** is a gui layer
  (`circle-drawer:dialog`). In a headset the grip (`squeeze`) opens it.

### Lory's own modules used

- **lory.motion** gives the modal's `ease` and the list's cubic Bézier.
- **lory.icons** draws the grid's sort arrows (`triangle-up` and
  `triangle-down`).
- **lory.geometry** (three.js's shapes) has nothing for these flat pages.
- **The modules still to come.** lory.forms, menus, overlays and disclosure
  are not yet in Lory. The form controls, the select, the alert, the modal
  and the right-click dialog are built on gui's own fields, selects, radios,
  checkboxes and layers.

## How parity is checked

tests/vue/reference.py is a script run by hand. It is not part of the tests.
It serves the real examples (vuejs/docs at
40aa88af0094f7bab4aaf786e55c748a6a251d88) on the pinned vue 3.5.44, marked
18.1.2 and lodash-es 4.18.1. It drives them in headless Chrome through a
fixed script for each example: presses, typing, choices, slides, right
clicks, double presses, canned answers and frames at set times. Chrome's
clock is held, `Math.random` is Park-Miller seeded with 42, and the date is
2026-11-14. After each step it writes what the example shows to
reference.json.

tests/vue/driver.co replays each script through the gallery as a page would
hand it frames:

- a press is a pointer's press and release on the control
- typing is a press at the field's end, Ctrl+A and the text
- a choice opens the select and presses its choice

Every field at every step is held to Vue's. Words must match exactly. The
modal's and the list's motion numbers are held within 6e-6, and the SVG
graph's trigonometry within 1e-9.

- **tests/vue/parity.co**: 21 blocks, one for each example plus marked's 24
  pages. They cover 313 steps and 1151 fields, 881 of them numbers, and all
  are held. The worst gaps are 4.0e-6 (modal), 1.0e-6 (list) and 2.0e-16
  (SVG).
- **tests/vue/headset.co**: three blocks in a headset frame (a 1000 by 560
  page on a panel 2 m wide).
  - The Counter is pressed by the right hand's ray.
  - A CRUD entry ("jane", "doe") is typed on the keyboard Lory draws while a
    field has the focus, then created. A press on the page's empty top lets
    the focus go first, because the keyboard covers Create.
  - The thumbstick turns the Cells sheet's own scroll area, 240 px in two
    frames. It is tried there because the Grid example's four rows never
    overflow.
- **tests/modes/vue.co** writes every field of every step of all twenty
  scripts, the 24 Markdown pages and 16 formulas. Interpreted and compiled,
  the 1191 lines are the same.

## Status

| example | built | held to Vue | headset |
|---|---|---|---|
| Hello World | yes | 1 field | |
| Handling User Input | yes | 21 fields | |
| Attribute Bindings | yes | 18 fields | |
| Conditionals and Loops | yes | 30 fields | |
| Form Bindings | yes | 144 fields | |
| Simple Component | yes | 1 field | |
| Markdown Editor | yes | 28 fields, and 24 pages | |
| Fetching Data | yes | 30 fields | |
| Grid with Sort and Filter | yes | 39 fields | |
| Tree View | yes | 11 fields | |
| SVG Graph | yes | 90 fields | |
| Modal with Transitions | yes | 102 fields | |
| List with Transitions | yes | 108 fields | |
| Counter | yes | 4 fields | pressed by the ray |
| Temperature Converter | yes | 26 fields | |
| Flight Booker | yes | 91 fields | |
| Timer | yes | 42 fields | |
| CRUD | yes | 110 fields | typed on the drawn keyboard |
| Circle Drawer | yes | 105 fields | grip opens the dialog |
| Cells | yes | 150 fields | sheet turned by the thumbstick |

## The catalog's rows answered

| row | answered by |
|---|---|
| Circle drawer with undo and redo | Circle Drawer (circles.co): drawing, selection, the radius dialog as a gui layer (the grip in a headset), and a history that Undo and Redo walk and a new step cuts |
| Analog and digital clock (frame-driven time) | Timer (timer.co), the digital, frame-driven half: the time gone moved on by each frame's time, shown in tenths and as a bar |
| Hello world and counter apps | Hello World (hello.co) and Counter (counter.co) |
| CRUD list with filter and selection | CRUD (crud.co) |
| Fetching data with loading, error and result states | Fetching Data (commits.co): the result state, and Vue's example's empty page while loading and after an answer that is not a list (it has no words for either) |
| Markdown editor (live preview) | Markdown Editor (editor.co), with Lory's own Markdown reader |
