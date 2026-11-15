# Small apps

A gallery of twenty small programs, each a complete app in a few dozen
lines of Crow, built from Lory's controls: a menu of them down the side and
the one chosen beside it. They are a good place to start reading Lory code,
from a heading bound to a value up to a spreadsheet with formulas.

Each app is a module of its own with the same five functions: `fresh` (its
state as it starts), `ticked` (the state moved on by the frame's time),
`controls` (the tree it draws, from `lory.gui`), `handled` (the state after
what the reader did) and `seen` (what it shows, for its tests). The gallery
keeps each app's state between frames with `use memory`, and choosing an app
starts it afresh. Everything answers the mouse, the keyboard (Tab, Enter,
Escape, the arrows) and touch.

## Basics

| App | What it shows |
|---|---|
| Hello World | A heading bound to the message the app holds |
| Handling User Input | Buttons that change the message, and a link whose press is held back and says so in an alert |
| Attribute Bindings | A tip, a colour and a style, each bound to a value a press changes |
| Conditionals and Loops | A list drawn while it is shown and holds numbers, and words in its place when it does not |
| Form Bindings | A field, a checkbox, checkboxes, radio buttons, a select and a list of many choices, each bound to a value shown under it |
| Simple Component | A list whose entries are each drawn by a component of their own |

## Everyday apps

| App | What it shows |
|---|---|
| Markdown Editor | Markdown typed on the left and drawn on the right a tenth of a second after the typing stops: headings, lists, quotes, code, emphasis, links |
| Recent Commits | The latest commits on the branch chosen, loaded from sample data after a short wait, with a branch that fails to load |
| Grid with Sort and Filter | A table sorted by the column pressed and filtered by the words searched |
| Tree View | Folders opened by a press; a double press makes an entry a folder |
| Stats Graph | A polygon drawn from the stats, each moved by its slider; stats added and taken away |
| Modal with Transitions | A dialog that fades and shrinks in over the dimmed page, and out again |
| List with Transitions | Entries that slide in, fade out and move to their new places |

## Classic tasks

| App | What it shows |
|---|---|
| Counter | A number and a button that counts it up |
| Temperature Converter | Celsius and Fahrenheit, each worked out from the other as it is entered |
| Flight Booker | A one-way or a return flight, booked only when its dates make sense |
| Timer | Time going by until the duration, which a slider sets |
| CRUD | Names created, updated and deleted, filtered by the start of the surname |
| Circle Drawer | Circles drawn by a press, their radius set from a right press, undone and redone |
| Spreadsheet | A sheet whose cells hold numbers, words or formulas over other cells, worked out again as any cell changes |

## Using it

An app of the gallery, the counter, made whole:

```crow
use sys
use memory
use lory
use lory.gui

struct Counter [count]

fn controls[s]
    gui.row[[gui.text['`s.count`', 18.0], gui.button['count', 'Count']], gap = 12.0]

fn handled[s, shown]
    for ev in shown.events
        if ev.id eq 'count' and ev.act eq 'press'
            s.count = s.count + 1
    s

fn draw[frame]
    s = recall['counter', Counter[0]]
    c = lory.begin[frame]
    c = lory.clear[c, gui.light[].page]
    shown = gui.show[c, controls[s]]
    remember['counter', handled[s, shown]]
    lory.end[shown.canvas]

sys.frames[draw]
```

## In a headset

The gallery is a panel in the room: its controls are pressed by the
controller's ray, a field is typed into on the keyboard Lory draws under it
while it has the focus, and the thumbstick scrolls the spreadsheet and the
menu.

## Try it

[Open the small apps](../../examples/apps/)
