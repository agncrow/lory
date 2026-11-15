# Lit's examples in Lory

examples/lit rebuilds Lit's examples as one Lory program. The examples are
the 40 in lit.dev's playground, and five more for behaviour that
lit.dev/docs shows but the playground does not. A menu down the side holds
them in the playground's groups, and the chosen example is drawn beside it.
Each example is held to the real Lit example as it runs in Chrome, step by
step and at fixed times (tests/lit/reference.co). The page then maps
everything else in Lit's cheat sheet and documentation to Lory's way of
doing it, or says why there is nothing to build.

None of Lit's source, prose or data is copied. Behaviour was read from the
examples and written again in Crow. For the reference, the examples were
written again in plain JavaScript. The hero's springy curve is Lory's own,
not the playground's table of numbers.

```
cd examples/lit
crow build --target web main.co   # main_web/, served by any static server
crow test main.co                 # the program, the menu, headset tests
crow test tests/lit/reference.co  # (from the repository's root) held to Lit
bash tests/modes.sh crow tests/modes/lit.co   # the same in both of Crow's modes
node tests/lit/reference.mjs <dir>/node_modules   # write reference.json again
```

## How the program is made

An example is a function of its state that answers a gui tree, and a
function that answers its state after each event. What Lit keeps in a
component's reactive properties is the example's state here (`shared.Ex`:
numbers, words and lists by name, the chances it draws, today's date, and
for motion its animations, boxes and timers). Some things a browser keeps
in its DOM by itself: what a reader typed into an input that no property is
bound to, or a checkbox no one binds. Those are kept in the state too, since
a Lory tree holds nothing between frames.

| part | what it holds |
|---|---|
| basics.co | Hello World, Full Component, Basic Properties, Change Detection, Custom Attribute Converter |
| templates.co | Expression Types, Conditional Templates, Repeating and Conditional, Slotting Children, Element Composition, Template Composition |
| directives.co | asyncAppend, asyncReplace, cache, classMap, guard, ifDefined, live, ref, repeat, styleMap, templateContent, unsafeHTML, unsafeSVG, until |
| managing.co | Async Tasks, Context Basics, Context Consume and Provide, Signals |
| wrappers.co | @lit/react: Basics, React Events, Slots, Refs |
| transitions.co | @lit-labs/motion: Sliding Circle, Lit Logo, List Items, Grid Layout, Carousel, List/Detail Hero, Todos |
| guides.co | the documentation's own: events up and properties down, a clock controller, batched updates, a slot's fallback, a locale switched at run time |
| gallery.co | the catalog, and one entry for each verb: `opened`, `tree_of`, `answered`, `ticked`, `facts`, plus the request an example makes (`request_of`, `asked`, `heard`) |
| shared.co | the state, `inked` (words in a look of their own), and `facts_of` (what a tree shows, as the tests read it) |
| main.co | the program: the menu, the example's clock, its requests, the focus and scroll that ref asks for |

Each example's time starts at 0 when it opens, as a page's does when it
loads. Timers, async iterators and promises are the state at that time. The
async task's request goes out through `lory.request`, a second after the
task runs, as the example's own delay has it. Its answer comes back in a
frame's `said`. Motion uses lory.motion's CSS easings (`ease-in-out`). The
todos' remove button draws lory.icons' `minus-circled`. Its words are still
`remove_circle_outline`, the name Material's icon font draws that icon by,
which is what Lit's page holds in its button.

In a headset the page is a panel. main.co tests two things there: a ray
press on Full Component's planet changes its property and the example is
drawn again, and a thumbstick pushed while the ray rests on the menu
scrolls it.

## The cheat sheet, section by section

| section | Lit | Lory |
|---|---|---|
| Component definition | a class extending `LitElement`, registered under a tag with a dash, whose `render()` returns a template | a function of the example's state that returns a gui tree. There is no registry: a component is called by name, and two of the same name are refused by Crow when it checks the program. |
| Templating | expressions by position (child, attribute, `?bool`, `.prop`, `@event`), conditionals, lists, `unsafeHTML`, static tags | each binding is an argument of the control it belongs to: words, `gui.disabled`, a field's value, the example's answer to the control's event. Conditionals are `if`, and lists are loops. Expression Types, Conditional Templates, Repeating and the directive examples show each. |
| Styles, theming, parts | scoped styles, custom properties crossing the shadow root, `::part`, `exportparts` | a look handed to what wears it (`shared.inked`, gui's themes). Nothing leaks because nothing is global, and a "custom property" is an argument (Full Component's planet colour: blue, or red where the page sets it). Parts have no counterpart: a caller styles a part by handing it a look. |
| Shadow DOM and slots | slots, named slots, `::slotted`, fallback content, `delegatesFocus` | a component's `kids` are its slots: Slotting Children, React Slots, and the documentation's fallback example (children removed, the fallback shows). Focus goes where a program sends it (`gui.focus`, as ref does). |
| Properties and state | reactive properties, internal state, converters, `hasChanged`, `reflect` | the example's state. Change Detection holds `hasChanged` (a date of the same day neither renders nor flashes), and Custom Attribute Converter holds a converter. There are no attributes to reflect. |
| Lifecycle | constructor, connected, willUpdate, update, render, firstUpdated, updated, disconnected; updates batched; `updateComplete` | a frame: the state is updated by events and then drawn once. The documentation's batching example holds two sets giving one update, and `shouldUpdate` (Freeze) skipping updates. ref's first-update focus is main.co's first frame. |
| Events | host and window listeners, `CustomEvent`s that bubble and cross shadow roots | a control's events (`gui.show`'s `events`), answered by the example. The documentation's events example sends a child's event up to its parent, which hands the count down to a sibling. |
| Data flow and context | properties down, events up, `@lit/context` | arguments down and events up. Context is a value the provider's function hands to the functions below it (Context Basics; Context Consume and Provide's headings, each level one deeper and coloured by it). |
| DOM access | `query`, `queryAsync`, `ref`, `queryAssignedElements` | gui's boxes (`shown.boxes`, by id), read after a frame is laid out. ref's input takes the focus as it opens, and its paragraph is scrolled into view a frame later. |
| Signals | `SignalWatcher`, `watch()`, `computed`, `effect`, shared global signals | one value of the state that every instance reads (Signals: two counters, one count). There is nothing to subscribe to: each frame reads the value again. |

## The examples, and what is held

Every step names the actions Lit's page took and the time they took it at.
After each step the words shown, the fields, the boxes ticked, the controls
shown but off, and the looks the reference names are held to Lit's.

| example | what it shows | held after |
|---|---|---|
| hello-world | a greeting in blue | open |
| full-component | two greetings, a press turns World and Mars, one planet red by a custom property | three presses |
| properties-basic | names from markup and from code | open |
| properties-has-changed | Choose Today, a date picked: the date flashes blue over a second, but not for the same day | presses, picks, the flash's ground at 0, 250, 1000, 1300 and 1800 ms |
| properties-custom-converter | no date, then a date read from an attribute | open |
| expressions | each kind of expression; Click turns the text field off and on | two presses |
| templates-conditional | a branch toggled | two presses |
| repeating-and-conditional | a list with indexes | open |
| slotting-children | children projected, each with a blue edge and padding | open |
| element-composition | header, article, footer | open, with the title's centring and the article's padding |
| template-composition | templates made of templates | open |
| directive-async-append | ten coins tossed a second apart (Lit's draws) | 1, 2, 4, 9 and 11 s |
| directive-async-replace | a countdown from 10 | 1, 2, 5, 9 and 11 s |
| directive-cache | an input re-created on toggle, and one kept by `cache` | typing and three toggles |
| directive-class-map / style-map | a ground and an opacity from two checkboxes | four ticks |
| directive-guard | a SHA-256 worked out (a second) only when its value changes | presses, typing, the hash at 1 s and 2.1 s |
| directive-if-defined | an address with and without `ifDefined` | three names typed |
| directive-live | Commit sets the value again over typed text only with `live` | seven steps |
| directive-ref | the focus given as it opens; a paragraph scrolled into view | typing (focus and scroll are held by main.co's test) |
| directive-repeat | checkboxes that move with their items only when keyed | ticks and three sorts |
| directive-template-content, unsafe-html, unsafe-svg | stamped content, markup and a red circle read from text | open (the circle's fill and box) |
| directive-until | Loading... then the words, after 2 s | 1, 2 and 3 s |
| async-task | npm's facts for `lit`, an error for a name npm lacks, the initial view for none, a run superseded by a newer one | sixteen steps over 7 s |
| context-basics, context-consume-provide | values handed down; headings one level deeper per section | open, with each heading's tag, colour and centring |
| signals | two counters sharing one count | three presses |
| react-basics, react-slots | a greeting with its edge and padding; children in named slots | open |
| react-events | Click Roulette: the button fires on the loaded click (Lit's draw), then is off; Reset | nine presses |
| react-refs | a player played and paused from outside, and by its canvas | four presses |
| motion-circle | a circle sliding (FLIP, 333 ms) | eight steps; samples; where it rests |
| motion-logo | letters fading in and flying below, a press pausing them | eight steps; samples |
| motion-list | a list turned and shuffled (Lit's shuffles), emptied every fifth turn | nine steps; samples |
| motion-grid | a grid's areas moved on a press | ten steps; samples; where the cells rest |
| motion-carousel | cards moving to show the next or the one before | ten steps; samples; where the cards rest |
| motion-hero | a card growing into its detail on a springy curve, back again, a press pausing | twelve steps; samples |
| motion-todos | todos ticked between lists, removed (fading), added (flying in) | thirteen steps; samples |
| docs-events | a child's event counted by its parent and shown by a sibling | three presses |
| docs-clock | a clock controller ticking each second, stopped while hidden | eight steps |
| docs-batching | two sets giving one update; Freeze skipping updates | seven presses |
| docs-slots | a slot's fallback when its child is removed | three presses |
| docs-localize | Spanish loading for a tenth of a second, then ready; English at once | seven steps |

For motion, more is held at every step. The first is each animation Lit's
page started: the element, its role (`flip`, `in` or `out`), its start,
delay, duration, easing and fill. The second is what each moving element
showed: its opacity, and how much of the move it started from was left.
For the circle, the grid and the carousel, the boxes the elements came to
rest in are held too.

### Where Lory holds something else

- The hero's detail text is one sentence of Lory's own. Its springy curve is
  Lory's (`1 − e^(−6x)·cos 8x`, 27 steps), and the reference runs the same
  curve in the playground's `onFrames`.
- The todos are drawn with gui's checkbox and button, not Material's
  components. The reference uses native ones with the same labels.
- A motion example is drawn on one stage, so its words are held as a whole,
  in any order, and its elements are named in the samples.
- react-refs' triangles are a picture of Lory's own. What is held is the
  player's state, which its buttons and canvas change.
- ref's `scrollIntoView` has no gui call. main.co turns the wheel over the
  scroll area as far as brings the paragraph to its top (see below).

## How parity is checked

tests/lit/reference.mjs runs every example in headless Chrome against the
real libraries: lit 3.3.3 (lit-html 3.3.3, lit-element 4.2.2,
@lit/reactive-element 2.1.2), @lit/context 1.1.6, @lit/task 1.0.3,
@lit/localize 0.12.2, @lit-labs/motion 1.1.0, @lit-labs/signals 0.3.0
(signal-polyfill 0.2.2), @lit/react 1.0.8, react 18.3.1 and react-dom
18.3.1. They are installed into a folder outside the repository. The page
reaches nothing outside the machine: every host name resolves to nothing,
and `fetch` answers from a table in the script.

- A fake clock steps every example's time: timers, animation frames,
  `Date` (2026-11-14 12:00 UTC when the example opens) and
  `performance.now`.
- Each Web Animation is held still, moved on with the clock, and finished at
  its end, as the browser's own would be.
- `Math.random` is seeded. The draws an example took (coins, the roulette)
  and the orders motion-list shuffled into are written down for Lory's
  example to take.
- Each element a test names carries a `data-lory` id, matching Lory's
  control ids.
- What the page shows is read across shadow roots and slots, in the order it
  is drawn. Its words are split as `shared.tokens` splits Lory's.

tests/lit/reference.co opens each example in Lory with the same draws and
takes the same steps at the same times:

| reference step | Lory event |
|---|---|
| a press | `press`, or a press on a motion example's stage naming the element |
| words typed | `edit` |
| a change | `submit` |
| a date picked | `edit` |
| a box ticked | `toggle` |
| a wait | the clock moved on |

A press on a control that is off is not made. The async task's request is
answered from the same table, when Lory asks for it.

Each block holds every value to Lit's and to the number of values it held
when it was written, 3317 in all:

| block | values |
|---|---|
| basics and templates | 179 |
| directives | 559 |
| managing data and react | 255 |
| motion | 2209 |
| documentation | 115 |

tests/modes/lit.co takes the same steps and writes what Lory shows. It
holds the interpreter and the compiled program to the same 1993 lines.

## Survey rows

| row | status |
|---|---|
| Cheat sheet: component definition | mapped (above); no registry to build |
| Cheat sheet: templating | built: Expression Types, Conditional, Repeating, directives |
| Cheat sheet: styles, theming, parts | built as looks (Full Component, classMap, styleMap); `::part` and constructable sheets not applicable |
| Cheat sheet: shadow DOM and slots | built: Slotting Children, React Slots, docs-slots; shadow roots not applicable |
| Cheat sheet: properties and state | built: Basic Properties, Change Detection, Custom Converter |
| Cheat sheet: lifecycle | built: docs-batching (one update, shouldUpdate), ref's first-update focus; the order of hooks is a frame's |
| Cheat sheet: events and data flow (Events and Data Flow, two sections of the sheet in one row) | built: docs-events, Context Basics, Context Consume and Provide |
| Cheat sheet: DOM access | built: ref (focus, scroll); boxes by id |
| Cheat sheet: signals | built: Signals |
| Components overview, defining, rendering | mapped: a pure function of state; rendering again only what changed is Lory's whole frame |
| Reactive properties | built in part: properties, hasChanged and converters held. Attributes and `reflect` are not applicable: Lory has no attributes. |
| Styles | built as looks; `:host` and inherited styles are the caller's look |
| Lifecycle | built: docs-batching, ref |
| Shadow DOM | built: slots and fallback (docs-slots); `delegatesFocus` is `gui.focus` |
| Events | built: docs-events; retargeting and `composedPath` not applicable (no DOM tree) |
| Decorators | not applicable: syntax only |
| Templates: overview, expressions | built: Expression Types, ifDefined |
| Conditionals | built: Conditional Templates, cache |
| Lists | built: Repeating and Conditional, repeat |
| Built-in directives | built: the 14 playground directives. `when`, `choose`, `map`, `join`, `range` and `keyed` are an `if` or a loop in Crow. |
| Custom directives | not applicable: a directive is a function, and per-expression state is the example's state |
| Composition overview, component composition | built: Element Composition, Template Composition, docs-events |
| Mixins | not applicable: shared behaviour is a function a component calls |
| Reactive controllers | built: docs-clock (a timer controller, stopped while its host is hidden) |
| Context | built: Context Basics, Context Consume and Provide |
| Async tasks | built: Async Tasks (pending, complete, error, initial, a superseded run ignored) |
| Signals | built: Signals |
| Localization | built: docs-localize (runtime mode: loading, then ready; the source locale at once). Extraction and transform mode are tooling. |
| React wrappers | built: the four @lit/react examples; there is no second framework to wrap for |
| Standalone lit-html | not applicable: Lory draws any tree anywhere with `gui.show` |
| Static HTML, misc API | not applicable: a tag chosen at run time is a function chosen (Context Consume and Provide's headings) |
| Lit Labs: virtualizer, router, observers, motion | motion built (seven examples); the others are named on the page without behaviour to hold |
| Server rendering, tooling, upgrade | not applicable: build-time concerns |
| Playground: Hello World, Full component | built, held |
| Playground: Basic properties, Change detection, Custom attribute converter | built, held |
| Playground: Expression types … Template composition | built, held |
| Playground directives (14) | built, held |
| Playground managing data (4) | built, held |
| Playground @lit/react (4) | built, held |
| Playground @lit-labs/motion (7) | built, held (animations, samples, rest boxes) |
| Carousel Transitions (motion) | built, held |
| List/Detail Hero Transition (motion) | built, held |

The survey has 42 Lit rows. Lit's cheat sheet has ten sections, and the
survey's "events and data flow" row covers two of them.

## What is not built

- Attributes, `reflect`, `::part` and `exportparts`: Lory has no DOM.
- Decorators, mixins, custom directive classes, static HTML, standalone
  lit-html, SSR and tooling: these are mechanics with nothing to draw.
- The virtualizer, router and observers from Labs: the page names them but
  shows no behaviour to hold.
- Inline runs and links inside a paragraph: gui's text is one run, so the
  playground's few links are plain words.
