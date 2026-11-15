# lory.carousel: carousels, windows, slide groups and tickers

`lory.carousel` (packages/lory/carousel.co, `use lory.carousel`) moves
slides. A carousel is react-slick's: arrows, dots, the arrow keys, swipes
and autoplay; one slide at a time or several; wrapping or not; centred,
of their own widths, faded, upright, right to left, loaded as they come,
in rows, set by the page's width, and two carousels moving each other.
Beside it are Vuetify's window (`panes`: one pane at a time, the next
sliding in the way its index goes), Vuetify's slide group (`slide_group`:
a strip of controls scrolled a page at a time and chosen) and Motion's
Ticker (`ticker`: a line that never ends).

The carousel re-implements react-slick 0.31.0. tests/carousel/reference.co
holds it to react-slick's own numbers after every act: the slide shown and
aimed at, the track's offset, every slide's state, the dots, the arrows
and each hook with its time. The panes and the slide group follow Vuetify
4.3.3 and the ticker motion-plus-react 1.5.4; the same test holds their
arithmetic to the libraries' own functions. None of their source is
included: what they do was read from those versions and written anew, in
the same order, so the numbers come out the same. Moves are eased by
`lory.motion`.

```
s = carousel.settings[show = 3, scroll = 3, dots = true, autoplay = true]
tree = carousel.carousel[c, 'hero', slides, s]
window = carousel.panes[c, 'steps', panes, index]
chips = carousel.slide_group[c, 'chips', items, multiple = true]
line = carousel.ticker[c, 'news', items, velocity = 60.0, hover_factor = 0.0]
shown = gui.show[c, gui.column[[tree, window, chips, line]]]
index = carousel.pane_after[shown, 'steps', index]
```

Each is a gui control: the program builds it in its tree every frame and
hands it the same id. What each holds between frames is Lory's, in `use
memory` under `lory.carousel/…` and its id. The slides, settings and the
window's index are the program's. Sizes (the list's width, each slide's
height, each chip's width) are measured as a frame is drawn and used from
the next frame on, so a carousel's first frame stands at a guessed width.

## What is built

### A carousel's settings

`settings[...]` takes react-slick's settings, spelt Lory's way, with
react-slick's defaults. A carousel is handed its settings each frame; a
change of settings re-slides it as react-slick's does.

| Setting | react-slick | What it does |
|---|---|---|
| `show`, `scroll` | slidesToShow, slidesToScroll | Slides shown at once, and moved by a press (1, 1). |
| `infinite` | infinite | Whether it wraps round, with clones either side (true). |
| `center`, `padding` | centerMode, centerPadding | The slide shown centred, its neighbours peeking `padding` each side: `'50px'` or `'10%'`. |
| `variable` | variableWidth | Each slide as wide as its control (`gui.sized`). |
| `fade` | fade | Slides stacked, the next faded in instead of slid. |
| `speed`, `ease` | speed, cssEase | A move's time (500 ms) and its CSS timing function (`'ease'`). |
| `autoplay`, `autoplay_speed` | autoplay, autoplaySpeed | Moved on by itself every `autoplay_speed` ms (3000). |
| `pause_on_hover`, `pause_on_dots_hover`, `pause_on_focus` | the same | Autoplay held while the pointer rests on it (true), on its dots, or while it has the focus. |
| `dots`, `arrows`, `arrows_on_hover` | dots, arrows | Its dots (false) and arrows (true). Arrows stand outside the list, as react-slick's do; `arrows_on_hover` shows them over it only while the pointer rests on it. |
| `initial` | initialSlide | The slide it starts on (0). |
| `rtl`, `vertical`, `vertical_swiping` | the same | Right to left; slides above one another; swiped up and down. |
| `adaptive_height` | adaptiveHeight | As tall as the slide shown. |
| `lazy` | lazyLoad | `'ondemand'`: a slide drawn once it is near; `'progressive'`: one more each second too. |
| `swipe`, `draggable`, `touch_move`, `touch_threshold` | the same | Swiped by touch and by a headset's ray, and by a mouse where `draggable`; a swipe past a `touch_threshold`th of the width (5) moves it. |
| `swipe_to_slide`, `edge_friction` | the same | A swipe lands on the slide it reached; past an end that does not wrap the track follows the pointer at 0.35. |
| `focus_on_select` | focusOnSelect | A slide pressed becomes the one shown. |
| `wait_for_animate` | waitForAnimate | A press during a move is not heard (true). |
| `accessibility` | accessibility | The arrow keys move it while it has the focus (true). |
| `unslick` | unslick | Its slides stand side by side and never move. |
| `rows`, `per_row` | rows, slidesPerRow | Slides grouped into a grid, the group moved as one slide. |
| `nav_for` | asNavFor | The id of a carousel that moves with this one. |
| `wide`, `tall` | (CSS) | Its width (0: its column's) and its slides' height (0: their own, measured). |

| Function | What it answers |
|---|---|
| `settings[...]` | The settings, by name, with react-slick's defaults. |
| `breakpoint[width, s]` | Settings for a page at most `width` CSS pixels wide. |
| `unslicked[width]` | A breakpoint whose carousel only stands its slides side by side. |
| `at_width[base, points, width]` | The settings a page that wide gets: the narrowest breakpoint it is within, or `base`. |
| `responsive[c, base, points]` | The same, for the frame's page width. |
| `grouped[s, count]` | How many slides (groups, where in rows) `count` controls make. |

### A carousel on the page

| Function | What it does |
|---|---|
| `carousel[c, id, slides, s]` | The carousel: its list, arrows and dots, as a gui control. What the reader does is told in `Shown.events` under its id: `change` as a move begins (`num` the slide it goes to, `words` the one it leaves), `settle` as it ends, `swipe` and `edge` (`words` the way), `load` (slides drawn for the first time: `words` their indices). |
| `next_slide[id]`, `previous_slide[id]` | Moved on a move's worth, or back (slickNext, slickPrev). |
| `go_to[id, index, at_once = false]` | Moved to a slide, at once where asked (slickGoTo). |
| `play[id]`, `pause[id]` | Autoplay begun again or held (slickPlay, slickPause). |
| `slide_of[id]`, `state_of[id]` | The slide shown; the whole state (`Slick`). |

### The engine

The carousel's state is a `Slick` record, moved by plain functions with the
time given. A program can drive one without gui, as the tests do.

| Function | What it does |
|---|---|
| `mount_at[s, count, wide, heights, widths, at]` | A carousel of `count` slides in a list `wide` pixels wide, mounted at `at` ms. |
| `advanced[k, to]` | Its timers fired up to `to` ms: moves ended, autoplay's ticks, slides loaded. |
| `acted[k, what, index, at]` | An act: `next`, `previous`, `dot`, `slide`, `key` (37 or 39), `go`, `go_now`, `step_next`, `step_previous`, `play`, `pause`, `hover`, `unhover`, `dots_hover`, `dots_unhover`, `focus`, `blur`, `click`. |
| `pointed[k, what, device, x, y, at]` | A press, move, release or leave by a `'mouse'` or a `'touch'`. |
| `resized[k, wide, heights, widths, at]`, `reslid[k, s, count, heights, widths, at]` | Its width changed; its settings or slides changed. |
| `links_of`, `unlinked`, `linked_to[k, index, at]` | What it sends the carousel it navigates, and a link received. |
| `told_of`, `untold` | The hooks told since, and forgetting them. |
| `slots_of[k]` | The slides the track stands (`Slot`: index, active, centred, a clone, current, loaded, opacity). |
| `dots_of[k]`, `arrows_shown`, `previous_off`, `next_off` | The dots (`count`, `active`) and the arrows. |
| `track_left[k]`, `track_drawn[k, at]`, `track_moving[k]` | The track's offset, where it is drawn at `at` (eased between), and whether it moves. |
| `adapted_height[k]` | The height adapted to the slide shown (-1 for none). |

### Panes: Vuetify's window

| Function | What it does |
|---|---|
| `panes[c, id, slides, index, backward = false, vertical = false, continuous = false, arrows = 'always', rtl = false, duration = 300.0]` | One pane at a time, `index` choosing it. When the index changes the new pane slides in over `duration` ms on Vuetify's `cubic-bezier(0.25, 0.8, 0.5, 1)`: from the right (below, where `vertical`) as the index goes up, from the left as it goes down, the old pane out the other way, and the height moves from the old pane's to the new one's. `backward` turns that round, as right to left does across. Arrows (`'always'`, `'hover'`, `'never'`) stand only where there is a pane that way (`continuous`: round the ends). Arrows, the arrow keys while it has the focus, and a touch's or a ray's swipe tell `change`, `num` the pane asked for. |
| `pane_after[shown, id, index]` | The index after a frame: its `change`, or `index`. |
| `step_to[index, count, way, continuous]` | The pane a step away. |
| `swipe_way[x0, y0, x1, y1]` | The way Vuetify's touch hears a swipe: `'left'`, `'right'`, `'up'`, `'down'` or `''`. |
| `kept_hovered[id]` | Whether the pointer rests on the control `id`. |

### A slide group: Vuetify's v-slide-group

| Function | What it does |
|---|---|
| `slide_group[c, id, items, mandatory = false, multiple = false, most = 0, center = false, arrows = 'auto', snap = '', distance = 0.0]` | A row of controls scrolled along. Pressing one chooses it (`multiple`: up to `most`; `mandatory`: one stays chosen) and tells `change`, `words` the chosen indices. The choice scrolls into view as Vuetify scrolls it: 0.4 of its width past the edge, or into the middle (`center`). Arrows (`'auto'` while it overflows or is scrolled, `'always'`, `'never'`), 52 pixels either side and faint at an end, scroll a room's width (`distance` where over 0) over 200 ms on easeOutQuart, at whole pixels. `snap` (`'start'`, `'center'`, `'end'`) stops each scroll on a control. A touch or a ray drags it. |
| `chosen_of[id]` | The indices chosen. |
| `group_offset[id, at]` | Where it is scrolled to. |
| `group_target[room, here, start, size, center]` | Vuetify's scroll target for a choice. |
| `group_eased[from, to, turn]` | A scroll's position `turn` of the way through. |

### A ticker: Motion's Ticker

| Function | What it does |
|---|---|
| `ticker[c, id, items, velocity = 50.0, hover_factor = 1.0, gap = 10.0, vertical = false, rtl = false, draggable = false]` | The controls in an endless line moving `velocity` pixels a second, leftward (upward where `vertical`; `rtl` or a negative velocity the other way), `gap` apart, with copies following so the room never shows an end. While the pointer rests on it its speed eases to `hover_factor` of itself over 300 ms (Motion's default tween, `cubic-bezier(0.25, 0.1, 0.35, 1)`). Where `draggable`, a press drags it and a release throws it on (`lory.motion`'s inertia) before it ticks on. |
| `ticker_offset[id]` | How far its line has moved. |
| `ticker_copies[room, total, largest, gap]` | How many copies follow the line, as Motion counts them. |
| `ticker_wrapped[low, high, v]` | Motion's wrap. |

## Behaviours held

Each is a test block in carousel.co, run on frames given as the page
gives them. There are 11 blocks and 11 truths, and they pass interpreted
and with `crow test --compiled`. tests/modes/carousel.co holds the
compiled program to the interpreter (below).

- **The arrow keys** move it a slide each way once a click gave it the
  focus; a key during a move is not heard; the left arrow from the first
  slide goes round to the last.
- **A dot** pressed moves it to its slides and is marked; the program hears
  `change` as the move begins and `settle` as it ends.
- **Autoplay** moves on by the frames' clock, 1050 ms apart (react-slick's
  interval, 50 ms over `autoplay_speed`), and holds still while the
  pointer rests on the list; it moves again once the pointer leaves.
- **A swipe** by a mouse and by a touch moves it the way it went, the
  track following on the way; a short one goes back; where `draggable` is
  off a mouse does not drag it, and a touch still does.
- **In a headset** the trigger held while the ray moves across the list
  swipes it, and its arrows pressed with the ray move it.
- **A fade** stands as tall as its tallest slide, and the next fades in
  over `speed`.
- **Panes** slide in from the way they come (right going on, left going
  back), the old one out the other way; an arrow stands only where there
  is a pane; `continuous` goes round the ends; a touch's swipe and the
  arrow keys ask for panes.
- **A slide group** wider than its room shows its arrows; the one back
  does nothing at the start; the one on scrolls a room's width on
  easeOutQuart at whole pixels; a press chooses a chip, tells it and
  scrolls it into view.
- **A group's choices** follow Vuetify's group: one at a time, let go when
  pressed again unless `mandatory`, `multiple` up to `most`.
- **A ticker** moves at its velocity by the clock, slows to its hover
  factor while the pointer rests on it, follows a drag pixel for pixel,
  and is thrown on 0.8 of its speed when let go.

## Parity

### Numbers: reference.mjs and reference.co

`tests/carousel/reference.mjs` runs the libraries in Node and writes
`tests/carousel/reference.json`:

- **react-slick 0.31.0** (with React 19.3.1): its own Slider, rendered and
  driven through 81 cases, with a clock of the script's own firing its
  timers, and two linked sliders. The track's layout is given as a
  browser lays out react-slick's track.
- **Chrome** (157.0.8103.51, headless): the Web Animations API's progress
  for each CSS timing function the carousels use, at 27 fractions.
- **Vuetify 4.3.3, motion-plus-react 1.5.4, motion-utils 12.39.0**: the
  slide group's helpers on given offsets, Vuetify's easeOutQuart as its
  goTo floors it, its touch directive handed touch events, and the
  Ticker's clone count and wrap.

```
npm install --prefix <scratch>/ref react-slick@0.31.0
npm install --prefix <scratch>/vref vuetify@4.3.3 motion-plus@1.5.1
LORY_REF=<scratch>/ref LORY_VREF=<scratch>/vref node tests/carousel/reference.mjs
crow test tests/carousel/reference.co
crow test --compiled tests/carousel/reference.co
```

| What | Numbers held | Exactly |
|---|---|---|
| 81 react-slick cases: every act's slide shown and aimed at, moving, the track's offset, autoplay, the drag, slide and list sizes, adapted height, slides loaded, every slot, dots, arrows, and every hook with its time | 90,774 | 90,774 |
| Two linked carousels (asNavFor), both sides after each act | 2,331 | 2,331 |
| CSS timing functions against Chrome (`ease`, `linear`, `ease-in`, `ease-out`, `ease-in-out`, two béziers, Vuetify's window curve, Motion's default tween), within a millionth | 243 | 43 (the farthest 0.125 millionths off) |
| Vuetify's slide group targets and eased scrolls, its touch's swipe ways, the Ticker's copies and wrap | 136 | 136 |

The cases cover arrows, dots, keys, slides pressed, mouse and touch
swipes past and short of the threshold, swipes at a finite end (edge
friction), the program's calls, hovering the list and the dots, focus,
autoplay, widths changed, slides added and taken away, and every setting
in the table above, alone and together (centre with infinite and not,
variable widths, fades, rows, vertical swiping, right to left, lazy
loading of both kinds, breakpoints and unslick).

The slide group's snap stops and its selection rules are written from
Vuetify's source but not held to it by number: they live in closures
inside its component. The window's own timing is Vuetify's CSS (300 ms,
its bézier, which Chrome is held to).

### Both modes: tests/modes/carousel.co

`bash tests/modes.sh crow tests/modes/carousel.co` runs the program with
`crow run -i` and `crow run` and compares the output line for line: 15
carousels of different settings driven by the same 18 acts (every slot,
offset, dot, arrow and hook after each), the breakpoints at five widths,
the panes' steps, Vuetify's swipe ways, the ticker's copies, and 120
frames of a page holding a carousel swiped by touch, panes stepped by an
arrow, a slide group paged and chosen, and a ticker ticking. All 1,051
lines are the same in both modes.

### The browser

examples/carousel builds with `crow build --target web main.co` and draws
every kind: the page was opened in headless Chrome and its picture
checked. Its test presses the window's arrow and finds the next pane
shown.

### In a headset

The ray is a pointer on the page's panel. A press with the trigger on a
list starts a swipe; the ray's place each frame is its move, as the page
sends a ray no moves; the release ends it. Arrows and dots are pressed
with the ray as buttons are. The panes and the slide group hear the ray as
a touch, as their libraries hear a finger.

## Where Lory differs, and why

- **Sizes come a frame late.** The DOM measures before it paints; Lory
  measures what it drew. A carousel's first frame stands at a guessed
  width, and a slide group or a ticker shows its controls unmoved until
  they are measured.
- **Resizing.** react-slick listens to the window and, in a browser, a
  ResizeObserver; Lory re-measures when the list's width changes (or a
  vertical carousel's first slide's height), at once and without
  react-slick's debounce. In a browser react-slick's observer can also
  cancel an adaptive carousel's `afterChange`; Lory tells it.
- **A change of settings** re-slides the carousel whatever changed.
  react-slick ignores changes to settings that are text.
- **The dots' hover** is react-slick's, quirk and all: pausing on the
  dots resumes as the pointer enters them.
- **onSwipe and onLazyLoad** are told (`swipe`, `load`); react-slick
  0.31.0's Slider no longer passes them on, so the reference harness hands
  them to its InnerSlider directly.
- **Arrows** are round buttons with a chevron drawn by Lory, standing
  outside the list in 44 pixels either side.
- **The window's height** moves between the panes' heights on the same
  curve; a pane never shown yet stands at the other's height until it is
  measured, and one coming in from the left is measured once it is in.
- **The window hears swipes** from a touch and the ray, not a mouse, as
  Vuetify's touch directive hears only touches. Its wheel is not built.
- **The slide group's arrows** stand over the ends of a full-width row,
  the strip narrowed between them; mobile and desktop arrow modes are one
  (`'auto'`).
- **The ticker's hover** eases its speed over Motion's default tween,
  restarting from where it stands. Its scroll-driven velocity, per-item
  offsets (`useTickerItem`) and overflow mode are not built; `rtl` only
  reverses the direction.
- **Vuetify's infinite carousel** (a speed in pixels a second, pause on
  hover, drag) is the ticker; its wheel scrub, arrows with shift distance
  and masked edges are not built.

## The catalog's rows

The rows of the catalog (README.md, "Carousels and sliders") homed in
`lory.carousel`.

| Row | Status |
|---|---|
| Autoplay and pause on hover | Built and tested: autoplay, its interval, pause on hover, dots hover and focus, `play` and `pause`, held to react-slick. |
| Carousel (Lit transitions) | Built: a move's transition is react-slick's slide or fade, eased by any `lory.motion` easing. Lit's own playground animation is not reproduced. |
| Carousel (slides, arrows, dots, autoplay, loop) | Built and tested against react-slick (SimpleSlider and the rest). Vuetify's carousel (delimiters, progress bar, crossfade) is covered by the carousel's dots, autoplay and fade; Motion's carousel extras (coverflow, parallax, scaling dots, progress scrubber) are not built. TOAST UI Rolling's horizontal/vertical, circular and autoroll are the carousel's `vertical`, `infinite` and `autoplay`. |
| Carousel settings reference | Built and tested: every setting in react-slick's reference but those of its DOM and CSS (className, dotsClass, slide, useCSS, useTransform, easing, appendDots and customPaging as render functions). Its hooks beforeChange, afterChange, onSwipe, onEdge and onLazyLoad are told as events; onInit and onReInit are not. |
| Centered, variable-width and adaptive-height slides | Built and tested (CenterMode, VariableWidth, AdaptiveHeight, UnevenSetsFinite). |
| Custom dots, arrows and slide content | Slides are any gui controls (built). Custom dots and arrows: the program draws its own from `dots_of`, `arrows_shown` and the calls `go_to`, `next_slide`, `previous_slide` (built, untested as a custom set); the carousel's own are Lory's. |
| Fade transition between slides | Built and tested, held to react-slick's opacities. |
| Infinite (looping) carousel | Built and tested: react-slick's clones (UnevenSetsInfinite). Vuetify's infinite carousel is the ticker (speed, hover, drag); wheel scrub, shift distance and masks are not built. |
| Lazy loading slides | Built and tested: `'ondemand'` and `'progressive'`, told as `load`. |
| Linked sliders, programmatic control and slide hooks | Built and tested: `nav_for`, swipe to slide, focus on select, `go_to`, slides added and removed, `change` and `settle`, vertical swipe to slide, `next_slide` and `previous_slide`. |
| Multiple items and multiple rows per view | Built and tested (`show`, `scroll`, `rows`, `per_row`). |
| Responsive breakpoints | Built and tested: `breakpoint`, `at_width`, `responsive`, unslick; the list re-measured when its width changes. |
| Slide group (scrollable item strip) | Built and tested: mandatory, multiple, most, center active, paging arrows; its targets and scroll held to Vuetify. Scroll snap is built, untested by number. |
| Ticker (continuous marquee) | Built and tested: constant speed, seamless wrap, hover factor, draggable with a throw, vertical; its copies and wrap held to Motion. RTL reverses the direction. Scroll-driven velocity and per-item offsets are not built. |
| Vertical and right-to-left carousels | Built and tested (VerticalMode, Rtl). |
| Window (swappable content panes) | Built and tested: the slide transition in the way of the index change, arrows always or on hover, `backward`, `vertical`, `continuous`, keys and swipes. |
