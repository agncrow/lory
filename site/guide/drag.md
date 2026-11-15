# Drag and drop

`lory.drag` reorders lists by dragging and carries items between them, and
has the drags that are not a list's: a control dragged freely and thrown,
a stack of cards swiped away, a row swiped open to show its actions, a
slider that compares two pictures, two fingers that zoom, turn and pan, and
a honeycomb of icons dragged and zoomed.

Draw your tree with `drag.show` in place of `gui.show`. What the reader does
comes back as events (`start`, `move`, `change`, `add`, `remove`, `sort`,
`end` and the rest), and your program takes each `end` into its own lists
(`drag.after` does it for lists of ids). Items are dragged by mouse, touch
or pen, by a grip where the list asks for one; a list in a group takes items
from the others, and can clone, swap, take several at once, scroll its area
near an edge, and wait for a delay before a touch drag starts.

## Components

| Component | What it does |
|---|---|
| Sortable list | A column, row or grid of items reordered by dragging, its items sliding into place |
| Shared lists | Lists in a group carrying items between them, or cloning them from a palette |
| Swap | An item let go over another trading places with it |
| Several at once | Items selected by pressing (with Shift, Ctrl or Cmd) and dragged together |
| Grip and filter | Items dragged only by their grip, or some items not dragged at all |
| Free drag | A control dragged within bounds, pulled past them elastically, thrown on at its speed, snapped home or locked to an axis |
| Swipe cards | A stack of cards swiped left or right and away |
| Swipe actions | A row swiped open to show its actions |
| Compare slider | A divider dragged across one picture laid over another |
| Pinch | Two fingers (or Ctrl and the wheel) zooming, turning and panning a picture |
| Honeycomb | A field of icons dragged about and zoomed |

## Using it

```crow
use sys
use memory
use lory
use lory.gui
use lory.drag

struct App [lists]

fn items_of[ids]
    out = slice[[gui.space[0.0]], 0, 0]
    for id in ids
        out = push[out, gui.item[id, [gui.text[id]]]]
    out

fn draw[frame]
    a = recall['app', App[map['todo' = ['Write', 'Test', 'Ship'], 'done' = ['Plan']]]]
    c = lory.begin[frame]
    todo = drag.grouped[drag.list['todo', items_of[a.lists['todo']]], 'tasks']
    done = drag.grouped[drag.list['done', items_of[a.lists['done']]], 'tasks']
    shown = drag.show[c, gui.row[[gui.sized[todo, 300.0], gui.sized[done, 300.0]], gap = 20.0]]
    for t in shown.told
        if t.act eq 'end'
            a.lists = drag.after[a.lists, t]
    remember['app', a]
    lory.end[shown.canvas]

sys.frames[draw]
```

## In a headset

The controller's ray presses an item and its trigger carries it, the same
as a mouse; a free control or a card is thrown by moving the ray and letting
go.

## Try it

[Open the drag and drop example](../../examples/drag/)
