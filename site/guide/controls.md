# Controls

`lory.gui` is the set of controls every other part of Lory is built from.
A view is a tree your program rebuilds from its own state each frame:
columns and rows, words, buttons, fields, sliders, toggles, tabs, a table.
`gui.show` lays the tree out, draws it on the canvas and answers it from the
frame's input in one pass, handing back the events of that frame. What a
control holds between frames (the focus, a field's caret and selection, a
scroll, which layers are open) Lory keeps; what it shows is yours.

Every control answers the pointer, touch and the keyboard. Tab and
Shift-Tab move the focus, with a ring on the focused control; a button is
pressed by Enter or Space; arrows move within a group, a slider or a field;
Escape closes the top layer.

## Components

| Component | What it does |
|---|---|
| Column, row, grid, panel | Lay controls one above another, side by side, in equal columns, or on a raised card |
| Header | An app bar: a raised row with an edge under it |
| Scroll area | A column of a fixed height whose controls scroll by wheel, drag or thumbstick |
| Overlay | One control drawn over another at one of nine anchors, such as a badge |
| Text, heading, label, note | Words at the type scale's sizes, in a tone: ink, muted, accent, danger, success or warning |
| Button | Pressed by the pointer, Enter or Space |
| Item | A row pressed as one: an entry of a list, a menu or a card |
| Text field and text area | Typed in at a caret, with selection, copy and paste; text, password or number |
| Slider | Dragged, or stepped by the arrows, Page Up and Down, Home and End |
| Toggle and checkbox | A switch and a ticked box; a checkbox may be mixed |
| Radio group, tabs, select | One choice of several, chosen by press or arrows |
| Disclosure | A summary that shows and hides what follows it |
| Progress bar | Determinate, or going on with no known end |
| Table | Rows of text under a header, a row chosen by press |
| Drawn control | A box your program paints in the tree's own pass, pressed, dragged and keyed like any other |
| Layer | Anything drawn over the rest: placed against a control or at a place of the page |
| Dropdown | A button that opens a panel under it |
| Modal | A dialog in the middle of a dimmed page that keeps the focus |
| Drawer | A panel along a side of the page |
| Toast | A notice that closes itself after its time, paused while the pointer rests on it |
| Tip | Words over a control once the pointer has rested on it |
| Roving group | A set of controls that is one Tab stop, the arrows moving among them |

## Layers and focus

A layer is drawn after the tree, over everything, and takes no room where it
stands. Placed against a control, it goes on a side (top, bottom, left or
right), aligned along it, and flips to the other side or shifts along when
the page has no room. Placed at the page, it stands in the middle, at an
edge or a corner, or where the pointer last pressed. A modal layer blocks
what is under it, keeps Tab among its own controls and can dim the page. A
layer the reader may dismiss closes on Escape or a press outside it, and
tells how it was closed. A focused layer takes the focus as it opens and
gives it back as it closes.

Controls can be moved, faded or scaled as they are drawn (`gui.moved`,
`gui.faded`, `gui.scaled`); the pointer finds them where they are drawn,
which is what `lory.motion`'s tweens and springs drive. A disabled control
is dimmed and passed over by Tab and the pointer.

## Themes

`gui.dark[]` and `gui.light[]` give a look: page, panel, edge, ink, muted,
accent and the colours of states. `lory.colors` makes a look's colours from
any accent and gray. `gui.show_at` takes two more sizes for a theme: `scale`
sizes every control, its words and its gaps (0.9 to 1.1 suits most pages)
without changing the room it is given, and `radius` times every corner, 0
for square and large for pills. Words in an accent tone are moved toward
black or white until they read on their panel.

## Using it

```crow
use sys
use memory
use lory
use lory.gui

struct App [name, volume, loud, fruit, presses]

fn settings[a]
    form = gui.panel[[gui.heading['Settings'], gui.label['Your name'], gui.field['name', a.name], gui.label['Volume'], gui.slider['volume', a.volume, 0.0, 1.0], gui.toggle['loud', 'Loud', a.loud], gui.select['fruit', ['apple', 'pear', 'plum'], a.fruit], gui.button['press', 'Press me'], gui.note['Pressed `a.presses` times']]]
    gui.column[[form], pad = 24.0]

fn draw[frame]
    a = recall['app', App['Ada', 0.4, false, 'pear', 0]]
    c = lory.begin[frame]
    shown = gui.show[c, settings[a]]
    for e in shown.events
        if e.id eq 'name' and e.act eq 'edit'
            a.name = e.words
        if e.id eq 'volume'
            a.volume = e.num
        if e.id eq 'loud'
            a.loud = e.num gt 0.5
        if e.id eq 'fruit'
            a.fruit = e.words
        if e.id eq 'press' and e.act eq 'press'
            a.presses = a.presses + 1
    remember['app', a]
    lory.end[shown.canvas]

sys.frames[draw]
```

Each event names its control's id and what happened (`press`, `edit`,
`change`, `choose`, `toggle`, `dismiss`), with its words and number.

## In a headset

The page stands on a panel in the room. The controller's ray points and
presses as the pointer does, and the thumbstick of the hand whose ray rests
on a scroll area turns it.

## Try it

[Open the controls example](../../examples/controls/)

## Not included yet

- Roles for screen readers
- Right-to-left layout
- Typing ahead in a select
