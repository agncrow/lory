# lory.drag: lists reordered by dragging, and things dragged freely

`lory.drag` (packages/lory/drag.co, `use lory.drag`) does two kinds of
dragging. Lists are reordered, and their items carried between them, as
SortableJS 1.15.7 does it. The drags that are not a list's are done as Motion
14.7.1 does them: a control dragged and thrown, a stack of cards swiped
away, a row swiped to its actions, a picture pinched, and a honeycomb of
icons. tests/drag/reference.co holds both to their libraries' numbers.
SortableJS was driven in headless Chrome by tests/drag/reference.py, and
Motion was run in Node by tests/drag/motion.mjs. None of their source is
included: their behaviour was read from those versions and written anew.
The springs and the thrown drag's glide are `lory.motion`'s.

drag draws nothing of its own but a grip and a reveal. It hands gui a tree
with each list in the drag's order and each item where it slides, so
`drag.show` takes the place of `gui.show`:

```
use lory.drag

fn draw[frame]
    a = recall['app', fresh[]]
    c = lory.begin[frame]
    todo = drag.grouped[drag.list['todo', items_of[a.lists['todo']]], 'tasks']
    done = drag.grouped[drag.list['done', items_of[a.lists['done']]], 'tasks']
    shown = drag.show[c, gui.row[[gui.sized[todo, 300.0], gui.sized[done, 300.0]], gap = 20.0]]
    for t in shown.told
        if t.act eq 'end'
            a.lists = drag.after[a.lists, t]
    remember['app', a]
    lory.end[shown.canvas]
```

The lists' orders are the program's. While an item is dragged, the lists
show the drag's order. At `end` the program takes the change into its own
data (`drag.after` does it for lists of ids), and the next frame's tree
shows it. A program that leaves its data as it was sees the item go back.

## What is built

### Showing

| Function | What it does |
|---|---|
| `show[c, tree]` | The tree drawn across the canvas, as `gui.show` draws it, with its lists and drags run. It answers a `Dragged`. |
| `show_at[c, tree, x, y, w, look, scale = 1.0, radius = 1.0]` | The same, at a place, as `gui.show_at`. |
| `Dragged [canvas, events, boxes, told]` | gui's canvas, events and boxes, and what the drags told this frame. The events are gui's, followed by one `gui.Event[list, act, item, new_index]` for each told. A press that ended a drag is not told as a press. |
| `Told [act, list, item, from, to, old_index, new_index, pull, swap, items, olds, news, related, after]` | One thing a drag told. For a list's drag these are SortableJS's events, in its order, with its fields: `pull` is '' or `yes` or `clone`; `swap` is the item swapped with; `items`, `olds` and `news` are a multiple list's selection and its indices (-1 for none); `related` and `after` belong to a `move`. |
| `after[lists, t]` | Given a map of list id to ids, and the `end` told, the lists the drag changed, in their new orders. A copy left by a cloning list is named `<id>*<n>`. |
| `shown_order[id]` | A list's ids in the order it shows them now. During a drag the copy a cloning list shows is `<id>:copy`. |
| `busy[c]` | Whether a drag, slide or glide is under way. A page that draws only when something changes keeps drawing while it is. |
| `forget[]` | Every drag, slide, selection and place forgotten. |

### Lists (SortableJS)

| Function | SortableJS's | What it does |
|---|---|---|
| `list[id, kids, along = 'column', gap = 10.0, pad = 0.0, columns = 2, tall = 0.0]` | `new Sortable(el)` | A list of controls, each with an id (one without is given `<list>:<i>`). It is laid out as a `column`, a `row` (each control at its own width) or a `grid` of `columns`. A column is at least `tall` high, so an empty one stays a place to drop into. |
| `grouped[n, name, pull = '', take = '']` | `group: {name, pull, put}` | Items go between lists that take them. `pull` is '' or `yes` (anywhere), `no`, `clone`, or group names separated by commas. `take` is '' (its own group), `yes`, `no`, or group names. |
| `unsorted[n]` | `sort: false` | Its items may go out and come back, but are not reordered. |
| `animated[n, ms]` | `animation` | Items slide to their places over `ms`, eased with CSS's `ease`. |
| `thresholds[n, swap = 1.0, invert = false, inverted = -1.0, empty = 5.0]` | `swapThreshold`, `invertSwap`, `invertedSwapThreshold`, `emptyInsertThreshold` | Where a neighbour is passed, and how near an empty list is met. |
| `swapping[n]` | Swap plugin | An item let go over another trades places with it. |
| `multiple[n, key = '']` | MultiDrag plugin, `multiDragKey` | A press selects an item and another lets it go. The selected items drag together, and Shift selects a range. With a `key` (`ctrl`, `meta`, `shift` or `alt`), a press without it selects only the one item. |
| `spilled[n, how]` | OnSpill plugin | An item let go outside every list goes back (`revert`) or is taken out (`remove`). |
| `scrolling[n, sensitivity = 30.0, speed = 10.0]` | AutoScroll plugin | Near the edge of the scroll area the list stands in, the area scrolls `speed` px every 24 ms. A sensitivity of 0 turns this off. It is on by default, as in SortableJS. |
| `delayed[n, ms, touch_only = false]` | `delay`, `delayOnTouchOnly` | A drag starts only once the item has been held `ms`. Moving it first lets it go. |
| `tolerance[n, px]` | `fallbackTolerance` | A drag starts only once the pointer has moved `px`. |
| `disabled[n]` | `disabled` | Nothing in the list is dragged. |
| `handled[n]`, `grip[]` | `handle` | An item is dragged only by its grip: six dots, 24 px square. |
| `filtered[n]` | `filter`, `onFilter` | The item is not dragged. A press on it tells `filter`. |

What is told, and when, is SortableJS's: `choose`, `unchoose`, `start`,
`clone`, `move`, `change`, `add`, `remove`, `update`, `sort`, `end`,
`filter`, `spill`, `select` and `deselect`. The dragover is run every 50 ms
at the pointer's last place, as SortableJS's fallback drag runs it. The
swap thresholds and the direction of travel decide the side; the first
swap's distance is remembered; the empty list is met outside its edge.
A slide that turns back takes the part of its time it had come (`calculateRealTime`),
and a slide under way at the drop goes on from where it shows. While an
item is dragged, its place in the list is kept faded and marked, and its
picture follows the pointer over everything at 0.8 opacity, without
hiding what is under it from the pointer. Selected items, and the item a
swap will trade with, are marked.

### Free drags (Motion)

| Function | Motion's | What it does |
|---|---|---|
| `free[id, kid, axis = 'both', left, right, top, bottom, elastic = 0.35, momentum = true, snap = false, lock = false]` | `drag`, `dragConstraints`, `dragElastic`, `dragMomentum`, `dragSnapToOrigin`, `dragDirectionLock` | A control dragged along `x`, `y` or `both`. It is kept within its bounds, in CSS px from home (±1e9: none), and pulled past them by `elastic`. When let go it is thrown on at its speed, or goes home with `snap`. With `lock` it moves only the way it was first moved more than 10 px. It tells `grab`, `lock` (`to` the axis), `drag`, `let_go` and `rest`. |
| `place_of[id]` | | Where a free control stands, `[x, y]` from home. |
| `released[value, velocity, low, high, elastic = true, snap = false, momentum = true]` | `startAnimation`'s inertia | What a drag is let go into on one axis: `lory.motion`'s inertia with the drag's settings. Those are a 750 ms time constant, rest at 1 px and 10 px/s, and a bounce spring of 200 stiff and 40 damped (1e6 and 1e7 when not elastic). Step it with `motion.glide` and `motion.glided`. |
| `pulled[p, low, high, elastic]` | `applyConstraints` | A place past a bound, pulled back toward it. |

The drag follows Motion's pan session. It starts once the pointer has gone
3 px, and the moves are taken once a frame. The release velocity is read
over the last 100 ms of the pointer's history, as `getVelocity` reads it.

### Cards, rows, reveals, pinches, honeycombs

| Function | What it does |
|---|---|
| `cards[id, kids, distance = 100.0, speed = 500.0]` | A stack, the first card on top and those behind a little smaller. Dragged past `distance`, or let go faster than `speed` px/s, the front card tells `swipe` (`to` `left` or `right`). It flies off on a spring of 300 stiff and 30 damped, then tells `gone` (`to` the card's id). Otherwise it springs back. The program takes the card out at `gone`. |
| `swiped[id, kid, actions, wide = 160.0]` | A row that shows its actions (buttons, `wide` px together) in the room it leaves. Swiped past half of them it stays open (`open`); swiped most of the way across it acts (`act`, `to` the first action's id, then `gone`). A press anywhere else closes it (`close`). |
| `reveal[id, value, wide, tall, before = -1, after = -1, words = '']` | Two pictures (`lory.load_image` numbers, -1 for a plain ground), the first shown left of a line the reader drags. Arrow keys, Home and End move it. It tells `change` with the line's place, 0 to 1. `words` names the two sides, separated by a comma. |
| `pinch[id, kid, tall, least = 0.5, most = 4.0]` | A control zoomed, turned and moved by two fingers about their middle, or zoomed by Ctrl and the wheel (a trackpad's pinch) about the pointer. One finger moves it. When a finger is lifted, the turn comes to the nearest quarter turn. It tells `pinch`. |
| `view_of[id]` | A pinch's or honeycomb's `[scale, x, y, turn]`, the turn in degrees. |
| `honeycomb[id, icons, wide, tall, size = 64.0]` | Icons `size` px square on a hexagonal grid. The grid is dragged and thrown about within its bounds, and zoomed by two fingers or Ctrl and the wheel. Each icon is smaller the further it stands from the middle. A press on an icon is told as gui tells it, unless the press dragged the comb. |

### In a headset

A ray drags as a mouse does. Its press chooses, and where it points on the
panel while it is held is the pointer's move. A page tells no moves for a
ray, so drag makes them itself from `lory.pointer_x` and `lory.pointer_y`.
drag.co's tests carry an item by the ray into another place in its list
and then into the other list, and swipe a card away by the ray.

### The example

examples/drag (`crow build --target web main.co`) has five tabs. Lists has
three shared task lists (the last removes what is dropped outside), a
palette cloned onto a canvas dragged by grips, a grid, and a list for
selecting several items. The other tabs show a deck of cards beside mail
rows, three free controls, the compare slider beside a pinch, and the
honeycomb.

## Parity

tests/drag/reference.co (run from the repository's root) holds lory.drag
to reference.json:

- **SortableJS 1.15.7, 28 scenarios.** They cover reordering down and up;
  animation and a slide turned back; two lists; an empty list; items of
  two sizes; cloning; `sort: false`; `put: false`; named groups; a handle;
  a filter; the swap threshold, `invertSwap` and `invertedSwapThreshold`;
  the list's ends with padding; a row; a grid; swap within and between
  lists; multi-drag with selection and deselection; revert and remove on
  spill; a delay; a tolerance; a disabled list; and autoscroll. Each
  scenario's lists are built the same in Lory and take the same steps
  (one frame every 50 ms). The test holds every number SortableJS
  answered:
  - all 354 events, with their fields, in order;
  - after every step, each list's order (1769 ids);
  - every box (2400 numbers: items, lists and the dragged picture, to
    0.001 px);
  - the scroll (10 positions).
- **Motion 14.7.1, 36 curves and 50 elastic pulls.** The curves are:
  - drags let go, at 16 ms and 1/60 s frames: thrown, slow, still, bounced
    off either bound, stiff (not elastic), let go past a bound still and
    moving, snapped home elastic and stiff, without momentum, one-sided;
  - inertia at its defaults;
  - seven springs.

  Each curve's samples (2817 values, each with its rest) match to a
  billionth. The elastic pulls are at five elasticities.

tests/modes/drag.co writes what lory.drag computes, and tests/modes.sh holds
the interpreter's output equal to the compiled program's. It writes each
scenario's told events and orders, each curve, the elastic pulls, a throw, a
swipe and a pinch.

### Held by the docs, not the numbers

- **AutoScroll after the pointer leaves the edge.** SortableJS keeps
  scrolling from a timer it did not clear, a step or more after the pointer
  leaves the zone. Lory stops when the pointer leaves. The autoscroll
  scenario is held up to 450 ms, which covers its whole scroll of 10, 30,
  60, 80 and 100 px at 250 to 450 ms.
- **Cards, swipe rows, the reveal, pinch and honeycomb** follow Motion's
  examples, which publish no numbers of their own. Their springs and
  throws are the Motion curves held above (`spring_card` is the card's
  spring). Their thresholds are the examples': 100 px or 500 px/s for a
  card, and half the actions for a row.

## Not built, and why

- **`onMove` returning false (vetoing a move), `revertClone`,
  `store` and the instance API** (`option`, `toArray`, `sort`, `destroy`).
  The program owns the order, so `toArray` is its own data and `sort` is
  its next tree. A veto needs a callback that drag cannot type: a
  function handed to a module is refused (Crow's bug, below).
- **MultiDrag's folding** (the selected items gathered under the pointer
  during the drag). The others leave their lists at the start and come
  back after the dragged item at the drop, in their order. The indices
  told match SortableJS's (the multi scenario).
- **Nested lists.** A list inside a list's item is sensed, and the
  innermost list under the pointer is asked first, as SortableJS asks.
  This is not held to a scenario.
- **Rotation drawn.** gui draws no control turned. A pinch's turn is
  told (`view_of`) for the program to show where it draws (a drawn
  control, a scene), and a card flies off without turning.
- **Double-tap zoom and the pinch's spring back inside its frame.**
- **Scrolling the window, and every scroll area around the list**
  (`bubbleScroll`). Only the scroll area the list stands in is turned.
- **Native HTML5 drag and drop.** Lory draws on a canvas, so its drag is
  SortableJS's fallback drag: `forceFallback`, the picture drawn by Lory.

## Changes wanted in others' files

- **gui.co**
  - A placed layer the pointer passes through, for a drag's picture.
    drag lays it over a 0 by 0 space in a nested `overlay` to keep it from
    covering what is under it.
  - gui's measure and stretch rule made public. drag predicts each
    item's place after a reorder within the frame, and copies gui's rule
    of which controls stretch.
  - A grid that honours `wide`, `pad` and a least height. drag's grid list
    is as wide as the column it stands in.
  - A node turned (for pinch and cards).
- **main.co:** move events for a ray while it is held. drag makes them
  from the pointer.
- **Crow:**
  - A painter handed to `gui.drawn` from inside another module is refused
    unless called once by name (`_painters_typed` does it).
  - A node looked up from a list (fallible) and written back into a
    node's kids turns `gui.Node.kids` into a list of results in a compiled
    program, and the build then fails. drag builds kids lists from
    `slice[n.kids, 0, 0]`, and a program building lists for drag must use
    plain nodes too.

## Status

| Row | Status |
|---|---|
| Autoscroll while dragging | built; held to SortableJS (to 450 ms; the stale continuation docs-encoded) |
| Card stack (swipe away) | built; spring held to Motion; a ray swipe tested |
| Drag between lists and clone-on-drag | built; held to SortableJS (between, empty, clone, groups); a ray drag tested |
| Drag engine options, API, events and drag image | built (options, events, picture); the instance API and `onMove` veto not built |
| Drag handles, filters, thresholds and disabled sorting | built; held to SortableJS |
| Drop outside: revert or remove | built; held to SortableJS |
| Free dragging (constraints, elastic, momentum, snap) | built; held to Motion |
| Honeycomb home screen (drag and zoom) | built; docs-encoded |
| Image reveal (compare) slider | built; docs-encoded |
| Multi-item drag selection | built; held to SortableJS (no folding) |
| Pinch to zoom and rotate | built; the turn is told, not drawn |
| Sortable list (reorder by drag) | built; held to SortableJS (column, row, grid, sizes, animation) |
| Swap instead of insert | built; held to SortableJS |
| Swipe actions on list rows | built; docs-encoded |
