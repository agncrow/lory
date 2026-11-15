# Navigation and display

Two modules hold what takes a reader around a program and what a page
shows. `lory.navigation` gives app bars, system bars and footers, bottom
navigation, breadcrumbs, menu bars, navigation buttons, pagination,
steppers and toolbars. `lory.display` gives avatars, badges, cards, chips,
lists, data lists, timelines, feeds and comments, skeletons, spinners and
circular progress, key caps and shortcuts, inline text styles, empty
states, statistics, alerts and callouts, images, galleries with a lightbox,
highlighted words and advertisement slots.

A toolbar, a menu bar, a chip group, a list, a gallery and bottom
navigation are each one stop of Tab: the arrows move along them (round,
where they loop), Home and End go to the ends, and Enter or space presses.
Every part answers a press of the mouse or a touch. None changes what it
shows by itself: your program keeps the page, the step and the chips
chosen, and draws the component again from the events it told. Lory keeps
the small things, such as the crumbs opened, an avatar's first frame, an
alert's time shown and the images loaded.

## Components

| Component | What it does |
|---|---|
| App bar | A bar over the page with an icon, a title and controls; hides, collapses, flattens or fades its image as the page scrolls |
| System bar and footer | A thin status bar along the top; a bar of controls along the foot |
| Bottom navigation | Places along the foot of the page, each an icon over its words |
| Breadcrumbs | The trail to the page; a long trail collapses into an ellipsis that opens it |
| Menu bar | Entries along a bar, or one under another, with a dropdown entry |
| Navigation button | A destination of a rail, a drawer or a bottom bar, with a badge |
| Pagination | Arrows and a run of pages about the one shown, fitted to a width |
| Windowed pagination | First, previous, "more", page, next and last buttons over windows of pages |
| Stepper | Numbered steps, linear or editable, with Back and Continue; a vertical stepper too |
| Toolbar | Buttons, toggles, a group of toggles, separators and links along a bar |
| Avatar and avatar group | A picture in a circle, its initials until it loads; several overlapping |
| Badge | A small label, or a count or dot over a control's corner |
| Card | A title, subtitle and words on a raised ground, pressed as one |
| Chip and chip group | Tags and filters, closable, one or many chosen |
| List | Entries with icons, titles and subtitles; groups that open; numbered entries |
| Data list | Labels beside what they hold |
| Timeline | Events in order on a line, alternating sides or along it |
| Feed and comment | Events and comments with initials, times and replies |
| Skeleton and placeholder | Shapes that pulse or shimmer while content loads |
| Spinner, dots and loader | Indicators that something is going on; a dimmer over a busy part |
| Circular progress | A value round a circle, or an arc turning while the end is not known |
| Key cap and shortcut | Keys drawn as caps; a shortcut's keys on a Mac or elsewhere, with words for a screen reader |
| Inline text | Strong, emphasis, quotes, inline code, block quotes and links |
| Empty state | An icon, a headline, words and an action where there is nothing to show |
| Statistic | A value large over its label |
| Alert and callout | A message in a tone, closable, with a timeout |
| Aspect box | A box kept at a ratio of width to height |
| Image | A picture that loads lazily, with a preview, a fit and words where it fails |
| Gallery and lightbox | Pictures in a grid or a row, one opened large, the arrows moving through them |
| Highlight | Words with the terms found in them marked |
| Advertisement slot | A box of a standard unit's size for the program's own content |

## Using it

```crow
use sys
use memory
use lory
use lory.gui
use lory.display
use lory.navigation

struct App [page, tags]

fn page_of[page, tags]
    trail = navigation.breadcrumbs['trail', ['Home', 'Library', 'Pictures', 'Summer'], '/', 4]
    chips = display.chip_group['tags', ['All', 'Sea', 'Hills'], tags, true, true, true]
    cards = gui.row[[display.card[[display.statistic['42', 'views']], 'card:1', 'Card 1', 'Page `page`'], display.alert['note', 'Saved', 'Your album is saved.', 'success', closable = true]], gap = 12.0]
    pages = navigation.pagination['pages', 4, page, 0, 0.0, true]
    gui.column[[trail, chips, cards, pages], gap = 18.0, pad = 24.0]

fn draw[frame]
    a = recall['app', App[1, ['All']]]
    c = lory.begin[frame]
    c = lory.clear[c, gui.dark[].page]
    shown = gui.show[c, page_of[a.page, a.tags]]
    for e in shown.events
        if e.id eq 'pages' and e.act eq 'page'
            a.page = int[e.num]
        if e.id eq 'tags' and e.act eq 'choose'
            a.tags = split[e.words, '\n']
    remember['app', a]
    lory.end[shown.canvas]

sys.frames[draw]
```

## In a headset

The page stands on a panel in the room, and the controller's ray and
trigger press a toolbar button, a chip or a page just as the pointer does.

## Try it

[Open the navigation and display example](../../examples/display/)

## Not included yet

- Embedded video
- Hiding bottom navigation on scroll
- Dragging chips
- PageUp and PageDown in a roving group
