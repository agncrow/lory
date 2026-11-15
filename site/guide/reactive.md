# Reactive state

A gallery of small examples about state that changes and what follows from
it: a count moved by a timer, a list kept between visits, a form checked as
it is typed, a clock redrawn every frame, a lookup that loads and may fail,
pages chosen by an address. A menu of them runs down the side, the one
chosen beside it, and a switch under the menu turns the page light or dark.

Each example is a module that knows only Lory: its state made `fresh`,
moved on `before` a frame is drawn (timers, waits, animations, answers that
come due), drawn as a `tree` of `lory.gui` controls, and moved by what the
reader did `after`. Nothing runs between frames: a timer is the frame's
time read against when the example opened, so it goes with the state.
Everything answers the mouse, the keyboard and touch.

## Examples

| Example | What it shows |
|---|---|
| Counter | A count moved on by a timer every second |
| Todos | A list of todos added, done, retitled and taken away, kept while the program runs |
| Form Validation | A sign-up form checked as each field is left and when it is sent, one check waiting on a made-up server |
| Animations | Blocks that come and go three ways, a switch that waits for the old word to leave, and a list whose numbers come, go and glide to their places |
| Context | A theme provided from above, read below and changed from below |
| Clock | An analogue clock redrawn every frame |
| Sketch Pad | A grid painted where the pointer goes, each cell fading back; the grid's size typed in |
| Scoreboard | Players sorted by score, each row gliding to its new place |
| Async Data | A person looked up as the id is typed: loading, then the person, or an error for an id no one has; only the latest answer is shown |
| Tabs That Wait | Tabs whose pages wait for their content while the old page stays, faded |
| Routing | Pages chosen by the address after the `#`, from links or typed |
| Counter Store with Context | One count provided from above, read and moved by a component two levels down |
| Styled Buttons | Buttons styled by their own state, logged in and out |

## Using it

The counter, moved on by the frame's time:

```crow
use sys
use memory
use lory
use lory.gui

--- when the counter started (ms) and the count shown
struct Counter [opened, count]

fn before[s, at]
    s.count = int[floor[(at - s.opened) / 1000.0]]
    s

fn tree[s]
    gui.text['Count value is `s.count`']

fn draw[frame]
    c = lory.begin[frame]
    at = lory.time[c]
    s = before[recall['counter', Counter[at, 0]], at]
    c = lory.clear[c, gui.light[].page]
    shown = gui.show[c, tree[s]]
    remember['counter', s]
    lory.end[shown.canvas]

sys.frames[draw]
```

## In a headset

The page is a panel: its controls are pressed by the ray, the sketch pad is
painted by the ray moving over it with its trigger held, and a field is
typed into on the keyboard drawn under it.

## Try it

[Open the reactive-state examples](../../examples/reactive/)
