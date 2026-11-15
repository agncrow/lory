# Menus, dialogs and notifications

Three modules hold what opens over a page or under a trigger. `lory.menus`
gives dropdown and context menus, a menubar, a navigation menu, a command
palette and a floating action button with its speed dial. `lory.overlays`
gives dialogs, popovers, hover cards, tooltips, toasts and snackbars,
sheets, banners and dimmers. `lory.disclosure` gives the accordion, the
collapsible and the tree view.

Everything answers the keyboard, the pointer and touch. Menus move with the
arrows, Home and End, type ahead by first letters, and close on Escape or a
press outside; a submenu opens after a short rest and stays open while the
pointer heads for it. A context menu opens on a right press or a touch held
700 ms. Dialogs keep the focus and give it back when they close. Toasts
pause while the pointer is on them, close on a swipe, and F8 takes the focus
to the newest. Your program keeps what is open (a dialog's `open`, the folds
open, the notices shown) and changes it on the events each frame tells;
Lory keeps the small things inside, such as a menu's highlighted row, a
tooltip's timers and a tree's open folders.

## Components

| Component | What it does |
|---|---|
| Dropdown menu | A button that opens a menu of items, checkboxes, radio items, labels, separators and submenus |
| Context menu | A menu that opens at the pointer on a right press, or a touch held still |
| Menubar | A bar of menu titles; the arrows move between menus once one is open |
| Navigation menu | A site's bar whose items open panels of links and controls, or act as links |
| Command palette | A searchable list of commands in a dialog, ranked as you type, opened with Ctrl-K or Command-K |
| Floating action button | A round button at a corner of the page |
| Speed dial | A floating button that opens a column of actions above it |
| Dialog | A modal panel in the middle of the page, with a close button |
| Alert dialog | A dialog that asks before an act; its focus starts on Cancel |
| Popover | A button that opens a panel of controls beside it |
| Hover card | A link whose card opens after the pointer rests on it |
| Tooltip | A short tip on a control, opened by resting on it or focusing it |
| Toasts | Notices stacked in a corner, each with its own time, an act and a close |
| Snackbars | Notices at the foot of the page, one at a time |
| Sheet | A panel that slides in from a side of the page |
| Banner | A strip across the page with an icon, words and acts |
| Dimmer | A dimming over a box or the whole page, with content in its middle |
| Accordion | Folds under one another, one or many open at a time |
| Collapsible | A trigger that shows and hides what follows it |
| Tree view | Folders and leaves with the arrow keys, typing ahead and optional checkboxes |

## Using it

```crow
use sys
use memory
use lory
use lory.gui
use lory.menus
use lory.overlays
use lory.disclosure

struct App [renaming, folds, notices]

fn page[c, a]
    notes = [menus.item['new', 'New note', shortcut = 'Ctrl+N'], menus.item['rename', 'Rename…'], menus.separator[], menus.submenu['share', 'Share', [menus.item['mail', 'Mail']]]]
    bar = menus.menubar[c, 'bar', [menus.bar_menu['file', 'File', notes]]]
    faq = disclosure.accordion[c, 'faq', [disclosure.fold['what', 'What is this?', [gui.text['A notes editor.']]]], a.folds, collapsible = true]
    tree = disclosure.tree[c, 'files', [disclosure.branch['notes', 'notes', [disclosure.leaf['ideas', 'ideas.md']]]], checks = true]
    rename = overlays.dialog[c, 'rename', 'Rename note', [gui.field['title', 'Ideas']], a.renaming]
    gui.column[[bar, faq, tree, overlays.toasts[c, 'shelf', a.notices], rename], pad = 16.0]

fn draw[frame]
    a = recall['notes', App[false, ['what'], [overlays.notice['hello', 'Welcome']]]]
    c = lory.begin[frame]
    shown = gui.show[c, page[c, a]]
    a.folds = disclosure.folds_open[shown, 'faq', a.folds]
    for e in shown.events
        if e.act eq 'choose' and e.words eq 'rename'
            a.renaming = true
        if e.act eq 'dismiss' and e.id eq 'rename'
            a.renaming = false
    remember['notes', a]
    lory.end[shown.canvas]

sys.frames[draw]
```

Choosing an item tells a `choose` event naming the menu and the item; the
dialog's close button, Escape and a press on the dimming tell `dismiss`, and
the program closes it.

## In a headset

The page stands on a panel in the room and the controller's ray presses as
the pointer does: menus open and choose, dialogs close from their button,
and a tree opens its folders just as on a page.

## Try it

[Open the menus example](../../examples/menus/)

## Not included yet

- Moving into a navigation menu's panel with the down arrow
- An exit animation for toasts
