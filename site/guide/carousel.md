# Carousels and sliders

`lory.carousel` moves slides, and the slides are any of Lory's controls. A
carousel is moved by its arrows and dots, by the arrow keys while it has
the focus, by a swipe (touch, the mouse where it is draggable, a headset's
ray) and by autoplay, which pauses while the pointer rests on it. It shows
one slide or several, wraps round or stops at its ends, and its settings can
change with the page's width. Beside it are a window of panes, a slide
group of chips and an endless ticker.

What a carousel holds between frames (the slide shown, a move under way, a
swipe, autoplay's clock) is Lory's, kept under its id; the slides and the
settings are your program's, handed to it each frame. What the reader does
comes back as events under the carousel's id: `change` as a move begins and
`settle` as it ends, with `swipe`, `edge` and `load`.

## Components

| Component | What it does |
|---|---|
| Carousel | Slides moved by arrows, dots, keys, swipes and autoplay, one at a time or several, wrapping or not |
| Centred carousel | The slide shown in the middle, its neighbours peeking |
| Variable width and adaptive height | Each slide as wide as it is; the carousel as tall as the slide shown |
| Fade | Slides fading over one another instead of sliding |
| Vertical and right to left | Slides one above another, swiped up and down; or the order and arrows reversed |
| Rows | Slides grouped into a grid of rows, the group moved as one |
| Lazy loading | Slides drawn only as they come near |
| Breakpoints | Other settings below a page width, or the slides simply stacked |
| Linked carousels | Two carousels that move each other, such as a picture and its thumbnails |
| Window | One pane at a time, the next sliding in the way its index goes |
| Slide group | A row of chips wider than its room, scrolled a page at a time, a chosen chip scrolled into view |
| Ticker | An endless line of items, slowed while hovered, dragged and thrown |

## Using it

```crow
use sys
use lory
use lory.gui
use lory.carousel

fn slide[n]
    gui.panel[[gui.heading['Slide `n`'], gui.space[120.0]]]

fn draw[frame]
    c = lory.begin[frame]
    slides = [slide[1], slide[2], slide[3], slide[4], slide[5], slide[6]]
    s = carousel.settings[show = 3, scroll = 3, dots = true, autoplay = true]
    shown = gui.show[c, gui.column[[carousel.carousel[c, 'hero', slides, s]]]]
    for ev in shown.events
        if ev.id eq 'hero' and ev.act eq 'settle'
            log['showing slide `ev.num`']
    lory.end[shown.canvas]

sys.frames[draw]
```

A program moves a carousel itself with `carousel.next_slide`,
`carousel.previous_slide`, `carousel.go_to`, `carousel.play` and
`carousel.pause`, and gives it settings for page widths with
`carousel.breakpoint` and `carousel.responsive`.

## In a headset

The ray presses the arrows and dots, and holding the trigger while the ray
moves swipes a carousel, a window or a slide group.

## Try it

[Open the carousels example](../../examples/carousel/)

## Not included yet

- Scrolling a carousel or ticker by the wheel
- Progress bars and masked edges
