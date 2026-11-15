# Solid's examples in Lory

examples/solid is Solid's official example set rebuilt as one Lory
program: a menu of the examples down the side and the one chosen beside it.
The examples are the ones solid-site lists, plus the four extras in its
folder. Each example is held to what the real Solid example shows in Chrome,
step by step and frame by frame (tests/solid/parity.co). None of Solid's
source, prose or data is copied. Behaviour was read from the examples and
written again in Crow, and the long words of a page (Suspense's paragraphs,
Routing's sections) are Lory's own.

```
cd examples/solid
crow build --target web main.co     # main_web/, served by any static server
crow test main.co                   # the program, the menu, headset tests
crow test tests/solid/parity.co     # (from the repository's root) held to Solid
bash tests/modes.sh crow tests/modes/solid.co   # the same in both of Crow's modes
```

## How the program is made

Each example is a part of the folder (counter.co, todos.co, ...). A part
imports only Lory and Crow's own modules, never another part. Every part has
the same five functions:

| function | what it does |
|---|---|
| `fresh[at]` | the example's state as it opens at frame time `at` |
| `before[s, at]` | the state moved on to a frame's time (timers, waits, transitions) |
| `tree[s, at, dark]` | what is drawn: a gui tree |
| `after[s, shown, at]` | the state moved by what the reader did (`shown.events`, the pointer) |
| `seen[s, at]` | what the example shows, as JSON words, in the reference's own record shape |

Some parts have extra functions: `seeded[s, seed]` (animations, sketch,
suspense: the random source the reference seeds), `based[s, base]` (clock:
the time since midnight), `themed[s, dark]` (sketch), `cleared[]` (todos:
the kept list emptied), `spot[s, cell]` (sketch: a cell's middle) and
`heard[s, said]` (resource: the page's answers). `seen` is there only so the
example can be held to Solid. The program never reads it.

main.co keeps one record of every example's state in process memory
(`use memory`). Choosing an example from the menu starts it again
(`fresh`), as a page opened anew would. The switch under the menu makes the
page light or dark, and the sketch's outline follows it. Async Resource's
askings go out by `lory.request` and its answers come back in `lory.said`.
The form's "Done" is logged with `log`. In a headset the page is a panel.
The ray presses its controls, the sketch is painted by the ray moving over
it, and a field is typed into on the keyboard gui draws under the panel.
main.co tests all three in a headset.

## The examples, and what is held

| example | part | what it shows | held as Solid's example does it |
|---|---|---|---|
| Counter | counter.co | "Count value is N", moved on every 1000 ms | the count at each second; Solid's interval is the frame time read against the moment the example opened |
| Simple Todos (JSX, template literals, hyperscript) | todos.co | add with "+", tick done, edit a title, "x" to remove | one program held to all three sources (see below); JSX's `required` refusal of an empty title and its Enter-submits |
| Form Validation | forms.co | email, password and confirm, checked on leaving and on submit | Chrome's own validity words; the taken address answered after 200 ms; submit checks in turn, waits for the email's answer, focuses the first failure, else logs "Done" |
| CSS Animations | animations.co | slide-fade, bounce, a faded block, an out-in switch, a numbered group added to, removed from and shuffled | every transform, opacity and presence at every frame; the end state put on two frames after the change; parallel and out-in modes; moves glide from where Chrome lays each number (FLIP); Chrome's own sort for the shuffle |
| Context | context.co | a heading in the theme's colour, a picker that changes it | the title and colour; the picker is a `#rrggbb` field and swatches (Lory has no colour picker) |
| Clock | clock.co | an analogue clock redrawn every frame | each hand's `rotate()` to a tenth of a degree, rounded as JavaScript's `toFixed` rounds the float's exact value; the dial's marks |
| Etch A Sketch | sketch.co | a grid painted where the pointer goes, each cell cleared 500 ms later | the example's random colour (unpadded hex, so some colours paint nothing); one clearing timer per entry; `Index` keeping the cells; the side clamped 0 to 100 as the field shows it; Chrome's 1/64 px cell width; the outline under a dark page |
| Scoreboard | scoreboard.co | players sorted by score, the rows gliding; scores typed over, players removed and added | the order (ties by `localeCompare`); each row's jump measured from where it was last seen to where it last moved, as the example's stale positions give it; the 250 ms glide starting at the next frame |
| Async Resource | resource.co | a number field asks swapi.dev for a person; "Loading..." while out; the answer as JSON | every url asked, in order; only the latest asking's answer shown; the last answer kept while loading; `JSON.stringify(v, null, 2)` written exactly |
| Suspense Transitions | suspense.co | three tabs whose pages wait 160 to 580 ms | the old page kept and fading (300 ms ease-in after 100 ms) while the new one waits; the tabs changing over (500 ms ease) when it comes; the newest choice replacing the one waiting; "Loading..." only at first |
| Simple Routing (extra) | routing.co | three links and the section the hash names | `home` where there is no hash; nothing for an unknown one; a change told only when the hash is another |
| Counter store with context (extra) | store.co | a count of 7 provided from above, "+" and "-" two components down | the count after each press (see below) |
| styled-jsx (extra) | styled.co | two buttons, Log In on green and Log Out on blue | each button's words and colour from its own state |

### Where Lory holds something else

- **Todos' storage.** Solid's todos keep their list in `localStorage`, so it
  outlives a reload. Lory has no storage of its own, so the list is kept in
  Crow's process memory, written at every change and read as the example
  opens. It outlives the example being closed and opened again. It does not
  outlive a reload of the page.
- **The hyperscript todos.** The published hyperscript example stops
  following its store at its first change: Solid 1.9's `h` reads its value
  and its list once. Lory's todos are held to it only while its page
  follows its store. Each step is held until the first whose page parts
  from its store, and that step by its store alone (3 steps). The JSX and
  template-literal versions are held at every step. The template literals
  keep no record of the new title in the store (`stored_new`), so that key
  is left out of their comparison.
- **The counter store.** The extra counterstore example, as published,
  imports its provider as a type (`type CounterProvider`). TypeScript's
  transform then removes the import, and the page stops at once. The
  reference drops the word `type`, its one repair to a published example,
  and Lory is held to the repaired example.
- **styled-jsx's second file.** Its form helper is written for an older
  Solid (`createState`) and is imported by nothing, so it is not built. The
  behaviour it would give is Form Validation's.
- **The clock's midnight.** Solid's clock reads the page's own time zone.
  Lory's page tells the program no time zone, so the program keeps UTC's
  midnight. The reference's clock is held from the same base (54030000 ms
  after midnight), so the hands agree.
- **Routing's address.** Lory's page has no address to read or write, so
  the example keeps one: a link sets it, and the address field (Enter)
  goes where it says, as the address bar does.
- **Context's picker.** Lory has no colour picker, so the theme is a
  `#rrggbb` field taken as it is typed once whole, with a swatch and a few
  colours to press.
- **Coloured words.** gui's words come only in the look's tones, so words
  of an exact colour (Context's heading, Suspense's tabs and their fading
  page) are drawn by the program with `gui.drawn`. Suspense's long
  paragraph switches to the muted tone at half its fade.
- **Chrome's words and Chrome's sort.** The form shows the browser's own
  validity messages, so they are written as Chrome 157 words them. The
  shuffle sorts as Chrome sorts a list this short, by binary insertion.

## How parity is checked

tests/solid/reference.mjs builds each example from solid-site's own files
(commit e7b40ef1) with solid-js 1.9.17, babel-preset-solid 1.9.16,
solid-transition-group 0.3.0, @solid-primitives/transition-group 1.1.2,
solid-styled-jsx 0.27.1 / styled-jsx 3.4.7 and esbuild 0.28.2. It runs them
in headless Chrome 157.0.8103.51 with a fake clock, a seeded
`Math.random` (Park–Miller: `x = x * 48271 mod 2^31 - 1`) and a fake
`fetch` with canned answers after 300 ms. Nothing goes to the network. It
then drives each example through its steps: waits on a 16 ms frame grid,
jumps, presses, typing, setting and clearing fields, blurs, hovers over grid
cells, the dark switch and reloads. After each step it records what the
page shows in reference.json.

tests/solid/parity.co drives each Lory part through the same steps. It
hands the part frames at the same times with the same input: a press is a
mouse down and up at the control's middle, typing is a press at the field's
end and then the text, setting is the same with Ctrl+A first, a blur is a
press where nothing is, and a hover is a move to the cell's middle and then
away. Before an aiming step it draws a frame at the same time to see where
the controls stand. Async Resource's answers are the reference's canned ones,
handed in a frame's `said` 300 ms after the asking. Every snapshot is then
held to Solid's: texts and truths equal, numbers within 0.001, and a
colour's channel within 1 (Chrome rounds an eased colour). A snapshot that
parts from Solid's is told, and a test checks that.

Values held (the frame times included): **8120** in 294 snapshots. That is
4256 numbers, 2290 texts, 969 truths and 605 nulls.

| example | snapshots | values held |
|---|---|---|
| Counter | 5 | 10 |
| Counter store | 6 | 12 |
| styled-jsx | 5 | 45 |
| Simple Routing | 8 | 24 |
| Context | 3 | 12 |
| Form Validation | 35 | 289 |
| CSS Animations | 72 | 4320 |
| Clock | 12 | 1260 |
| Etch A Sketch | 28 | 238 |
| Scoreboard | 29 | 702 |
| Async Resource | 17 | 103 |
| Suspense Transitions | 30 | 810 |
| Simple Todos, JSX | 18 + 5 edges | 142 + 23 |
| Simple Todos, template literals | 18 | 124 |
| Simple Todos, hyperscript (while its page follows its store) | 3 | 6 |

tests/modes/solid.co replays the same steps and writes every snapshot as a
line (273 lines). tests/modes.sh holds the interpreter's lines equal to the
compiled program's.

## Survey rows

| survey row (apps.md, Solid) | status |
|---|---|
| Counter | built and tested (parity, 5 snapshots) |
| Simple Todos | built and tested (JSX, parity; headset: typed on the drawn keyboard); localStorage held as process memory, see above |
| Form Validation | built and tested (parity, 35 snapshots) |
| CSS Animations | built and tested (parity, 72 snapshots, every frame of every transition) |
| Context | built and tested (parity); a field and swatches for the picker |
| Clock | built and tested (parity, 12 snapshots across a day); UTC midnight |
| Etch A Sketch | built and tested (parity; headset: drawn on by the ray) |
| Scoreboard | built and tested (parity, 29 snapshots) |
| Async Resource | built and tested (parity with canned answers; main.co: asked by `lory.request`, answered from `lory.said`) |
| Suspense Transitions | built and tested (parity, 30 snapshots) |
| Simple Todos (Template Literals) | built and tested (parity, `stored_new` left out) |
| Simple Todos (Hyperscript) | built and tested while its page follows its store (3 snapshots), see above |
| extras: Simple Routing, Counter store with context, styled-jsx | built and tested (parity); styled-jsx's unused form helper not built |

## Catalog rows answered (docs/components/README.md)

| section | row | answered by |
|---|---|---|
| 5 | Enter, exit and move transitions for lists (Solid's CSS Animations) | animations.co: enter, exit and moves (FLIP from Chrome's layout), held at every frame |
| 8 | Form and validation (Solid's Form Validation, styled-jsx) | forms.co, styled.co |
| 9 | Sorting (Solid's Scoreboard) | scoreboard.co |
| 17 | Analog and digital clock (Solid's Clock) | clock.co |
| 17 | Hello world and counter apps (Solid's Counter, Counter store) | counter.co, store.co |
| 17 | Shared state through context | context.co |
| 17 | Etch A Sketch drawing | sketch.co |
| 17 | Fetching data with loading, error and result states (Async Resource, Suspense Transitions) | resource.co, suspense.co |
| 17 | Hash routing | routing.co |
| 17 | Todo list (all three) | todos.co |

The catalog's rows name `examples/clock`, `examples/todos` and so on. The
Solid examples stand together in `examples/solid`. Updating the catalog is
left to whoever owns it.

## What is not built

- Persistence across a page reload (Lory has no storage).
- The page's own time zone for the clock (the page tells the program none).
- A browser address or hash (routing keeps its own).
- A native colour picker (context uses a field and swatches).
- styled-jsx's unused `createState` form helper.
- Solid's older demos listed elsewhere (TodoMVC, RealWorld, HN, the
  benchmarks): they are not in solid-site's examples.
