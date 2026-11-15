# Scrolling and parallax

`lory.scrolling` covers what a page does as it scrolls, and the scrolling
itself: full-page sections, a scroll area with its own bar, virtual lists
that draw only the rows in view, endless feeds, pull to refresh, reveals on
scroll, smooth scrolling, scroll-linked progress, sticky blocks, parallax,
visibility events and a scroll spy.

Each is arithmetic on numbers your program holds (scroll positions, box tops
and heights in CSS pixels, times in milliseconds), and the parts that draw
are built of Lory's controls. Full-page sections move by the arrow keys,
Page Up and Page Down, Home and End, Space, the wheel, a swipe and their
navigation dots; a scroll area scrolls by the wheel, the keys, dragging its
thumb or pressing its track.

## Components

| Component | What it does |
|---|---|
| Full-page sections | A page cut into sections moved one at a time, with dots, anchors in the address, loops, slides across with arrows, sections taller than the page and lazy media |
| Scroll area | A view with its own bar, shown on hover (or while scrolling, or always) and hidden 600 ms after |
| Virtual list and grid | Only the rows and columns near the view drawn, each measured as it is drawn, for lists of any length |
| Endless feed | More asked for as an edge comes near or a button is pressed, with loading, done and error states |
| Pull to refresh | Content pulled down from the top, refreshing once let go past its threshold |
| Reveal on scroll | Elements fading, sliding, zooming or flipping in as they come into view, once or each time |
| Smooth scrolling | A wheel's scroll eased frame by frame, and a scroll to a place over a time |
| Scroll-linked progress | A value moved by how far a target has passed through the view, or the page's own progress |
| Sticky | A block that stays in view while its part scrolls past, and lets go at its end |
| Parallax | A picture or a layer moving slower or faster than the page |
| Visibility | Told as a block comes into view, passes or leaves, and loaded once seen |
| Scroll spy | Which part of the page is in view, for a table of contents |

## Using it

```crow
use sys
use memory
use lory
use lory.gui
use lory.scrolling

fn sections[]
    [scrolling.section[name = 'one'], scrolling.section[name = 'two', slides = 2], scrolling.section[name = 'three']]

fn faces[]
    [gui.heading['One'], gui.heading['Two: the first slide'], gui.heading['Two: the second slide'], gui.heading['Three']]

fn draw[frame]
    c = lory.begin[frame]
    p = recall['pages', scrolling.pages[sections[], 800.0, 500.0, scrolling.page_options[nav = true]]]
    p = scrolling.paged[c, p]                 --- the keys, the wheel, the time
    shown = gui.show[c, scrolling.pages_view[p, faces[]]]
    p = scrolling.pages_heard[p, shown]       --- its dots and arrows pressed
    for e in p.told
        if e.name eq 'after_load'
            log['now on section `e.section`']
    remember['pages', p]
    lory.end[shown.canvas]

sys.frames[draw]
```

Faces are listed in section order, with one face for each slide of a
section that has slides. A scroll area goes the same way:
`scrolling.area_scrolled[c, a]`, then `scrolling.area_view[a, id, tall,
rows]` in the tree, then `scrolling.area_heard[a, shown, id]`.

## In a headset

The thumbstick scrolls whatever the ray rests on, and the ray presses the
dots, arrows and bars.

## Try it

[Open the scrolling example](../../examples/scrolling/)

## Not included yet

- A horizontal bar for scroll areas
- Section backgrounds beyond a colour (a program draws its own in its faces)
