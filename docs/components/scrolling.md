# lory.scrolling: sections, scroll areas, lists, reveals and effects

`lory.scrolling` (packages/lory/scrolling.co, `use lory.scrolling`) holds
everything that scrolls. That covers:

- full-page sections that snap one at a time, as fullPage.js's do;
- a scroll area with its own bar, as Radix's;
- virtual lists and grids, as TanStack Virtual's and Vuetify's;
- endless feeds and pull to refresh, as Vuetify's;
- reveals on scroll, as AOS's;
- scroll-linked progress, as Motion's;
- smooth scrolling, as Lenis's;
- sticky blocks and visibility events, as Semantic UI's;
- parallax, a scroll spy, progress and a way back to the top.

What it computes on fixed inputs is what AOS 2.3.4 and 3.0.0-beta.6,
Motion 14.7.1, Lenis 1.3.27 and fullPage.js 4.0.41 compute.
tests/scrolling/reference.co holds it to their numbers. The other
libraries' behaviours were read from their sources and docs at pinned
versions and are held by test blocks:

- Radix Scroll Area (@radix-ui/react-scroll-area 1.4.0)
- TanStack Virtual 3.19.11
- Vuetify 4.3.1 (v-infinite-scroll, v-pull-to-refresh, v-parallax, v-lazy)
- Semantic UI 2.4.1 (sticky, visibility)

None of their source is included. fullPage.js is GPLv3 or commercial: it
was only run locally, to learn its numbers. Its behaviour is written anew
here, and none of its code, prose or styles is copied.

Its state is the program's own records (`Pages`, `Area`, `Virtual`, `Grid`,
`Feed`, `Pull`, `Stuck`, `Seen`), handed in and out each frame. The only
thing it keeps in memory is where a scroll bar's thumb was grabbed, under
`lory.scrolling.grab:<id>`.

```
p = scrolling.pages[sections, 800.0, 500.0, scrolling.page_options[nav = true]]
p = scrolling.paged[c, p]                          --- keys, wheel (a stick's too)
shown = gui.show[c, scrolling.pages_view[p, faces]]
p = scrolling.pages_heard[p, shown]                --- dots, arrows, slide dots

a = scrolling.area_scrolled[c, a]
shown = gui.show[c, scrolling.area_view[a, 'list', 300.0, rows]]
a = scrolling.area_heard[a, shown, 'list']
```

## Which module owns what: lory.motion and lory.scrolling

lory.motion owns the numbers that do not scroll:

- easings and their names (AOS's, CSS's, anime.js's, Motion's)
- AOS 2's trigger line and its rule (`reveal_line`, `revealed`)
- Motion's scroll offsets and progress (`scroll_progress`)
- anime.js's scroll window (`scroll_window`)
- tweens, springs and clocks

lory.scrolling uses those and does not write them again:

- `aos_curve` reads its four numbers from `motion.ease`
- AOS 2's reveals are `motion.reveal_line` and `motion.revealed`
- `linked_progress` and `page_progress` are `motion.scroll_progress`

lory.scrolling owns:

- AOS 3's trigger rule and AOS's stylesheet (each preset's start look,
  duration, delay and easing as the attributes give them)
- the transition the browser runs: Chrome's solving of a bézier (`bezier`,
  `css_eased`) and a transition turned back halfway
- Motion's `vh` and `vw` offsets, which `scroll_progress` does not take
  (`linked_progress` resolves them against the page first)
- Lenis's frames
- everything that scrolls: sections, areas, lists, feeds, sticky,
  visibility and parallax

## What is built

### Full-page sections (fullPage.js)

`section[name, tall, slides, slide_names, hidden, noscroll, content,
tooltip, color, autoplay]` describes a section:

- `tall`: 0 fills the view; more makes it auto-height.
- `content`: a height taller than the view, which then scrolls inside the
  section.

`page_options[…]` holds fullPage's options, with its defaults:

- `speed` 700 and `easing` 'ease' (the CSS easing, or `by_script` for its
  own easeInOutCubic)
- `loop_top`, `loop_bottom`, `continuous`, `loop_slides`
- `keyboard`, `lock_anchors`, `record_history`, `animate_anchor`
- `auto` (auto-scrolling), `fit` and `fit_delay` 600
- `responsive_w` and `responsive_h`
- `lazy_ahead`
- `scroll_bar`
- `nav`, `nav_side`, `show_tooltip`, `tooltips`
- `slides_nav`, `arrows`, `arrow_color` '#ffffff'
- `overflow_reset`

`pages[sections, view_w, view_h, o, t, address]` builds the sections. It
opens at the section and slide that `address` names, and tells
`after_render` and `after_load`.

What the reader does:

- `page_key` takes the arrows, Page Up and Page Down, Home, End, Space and
  Shift-Space. Keys are refused while a move is under way.
- `page_wheel` uses fullPage's rule. The sizes of the last turns are kept
  and cleared after 200 ms. A move starts when the mean of the last 10 is at
  least the mean of the last 70.
- `page_scrolled` is the native scroll when `scroll_bar` is on, or in free
  mode. The section under the page's middle becomes active at once, and the
  fit starts `fit_delay` later.
- `page_inner` scrolls inside a tall section. Reaching its end moves the
  page on.
- `page_dot`, `page_slide_dot`, `page_arrow` and `page_menu` are the
  controls.

What the program does:

- `page_down`, `page_up`, `page_move_to`, `page_silent_to`, `page_named`
- `page_slide_right`, `page_slide_left`, `page_slide_to`
- `page_hash` and `page_back`, for the address and its history
- `pages_refuse`: `before_leave` answering false
- `page_speed`, `page_lock_anchors`, `page_record_history`
- `page_responsive` and `page_resized`

A move from the program or the address replaces one under way.

Callbacks arrive in `p.told` (`Told[name, t, section, to, slide, to_slide,
direction, trigger, num]`) with fullPage's names and order:

- `before_leave`, `on_leave`, `after_load`
- `on_slide_leave`, `after_slide_load`
- `after_render`, `after_responsive`, `on_scroll_overflow`

Each carries fullPage's trigger: 'wheel', 'keydown', 'verticalNav',
'horizontalNav', 'slideArrow' or 'menu'. `after_load` comes `speed` ms
after the move starts with CSS easing, `speed` + 20 by script, and
`speed` + 50 with the scroll bar.

What can be read back:

- `page_y_at` and `page_x_at` give the page's and the slides' offsets at
  any time.
- `page_index`, `page_slide`, `page_viewing` (fullPage's `fp-viewing-…`
  word) and `page_menu_active`.
- `page_nav_box`, `page_dot_box`, `page_dot_item`, `page_arrow_box` and
  `page_slide_dot_box` give the geometry of fullPage's own stylesheet.
- `page_tooltip` and `page_arrow_shown`.
- `page_section_top` and `page_section_tall`.

Other behaviours:

- Continuous scrolling lays the first section after the last while it
  moves.
- Hidden sections are skipped, and indices count shown sections only.
- Lazy loading loads the active slide's media and the neighbours within
  `lazy_ahead`. Its list is `p.loaded`.
- `page_media` gives what each section's media does on a move: pause the
  one left, play the one reached if it autoplays.

Drawing:

- `pages_view[p, faces, id, fading]` draws the sections with gui. Sections
  far from the view are only room. Over them it draws the navigation dots
  (`id:dots`, with tooltips), the slides' arrows (`id:prev`, `id:next`) and
  the slide dots (`id:slide_dots`).
- `fading` cross-fades the section reached over the one left, as fullPage's
  Fading Effect does for sections (`page_fading`).
- `paged` takes the frame's keys and wheel. In a headset the thumbstick is
  a wheel there.
- `pages_heard` takes the controls.
- `page_parallax` moves a section's background by `percentage` (62) of its
  distance from the view, in 'reveal' or 'cover' mode.
- `offset_tall` and `offset_scroll` give an Offset Sections section's
  height and where it centres.

### Scroll area (Radix)

`area_of[bar, delay, glide]` makes a scroll area. `bar` is Radix's `type`:
'hover' (the default), 'scroll', 'auto' or 'always'. `delay` is the hide
delay, 600 ms. `glide` smooths the scroll with Lenis's model.

- `area_view[a, id, tall, kids]` draws the content clipped and moved by the
  scroll. The bar is overlaid at the right, 10 px wide, and takes no layout
  space.
- The thumb's share of the track is the view's share of the content, never
  under 18 px (`area_thumb`).
- A press on the thumb grabs it where pressed. A press on the track centres
  the thumb there (`area_from_thumb`).
- Keys reach the bar while it has the focus: the arrows move 40 px, Page Up
  and Page Down move seven eighths of the view, and Home, End and Space work
  too (`area_key`).
- `area_scrolled` takes the pointer over the area, the wheel and the stick.
- `area_heard` measures the content with two marks (`id:top`, `id:end`) and
  takes the bar's changes.

### Virtual lists and grids (TanStack Virtual, Vuetify, Lit's virtualizer)

`virtual_of[count, estimate, overscan, gap, pad_start, pad_end, bar]` makes
a list. Its defaults are TanStack's.

- A row stands where the rows before it end. It uses its measured size, or
  the estimate until it is measured (`virtual_start`, `virtual_size`,
  `virtual_total`).
- The rows in view are found with TanStack's binary search
  (`virtual_in_view`). `overscan` more rows are drawn each way
  (`virtual_range`, `virtual_rows`).
- `virtual_measured` records a row's size. A row measured above the scroll
  moves the scroll by its change.
- `virtual_scroll_for` and `virtual_scroll_to` take 'start', 'center',
  'end' or 'auto'.
- `virtual_near_end` is where an endless list asks for more (within 500
  px).
- `virtual_view` draws only the rows in range, with room before and after,
  and marks that measure them.
- `virtual_heard` measures the rows and keeps the scroll steady.
- `grid_of[rows, cols, row_size, col_size, 5, 3]` adds columns, with their
  own range (`grid_cols`) and scroll across (`grid_left`). The wheel moves
  it across with `dx` or Shift.
- `grid_view` draws the visible cells with spacers.

### Endless feeds (Vuetify's v-infinite-scroll)

`feed_of[side, mode, margin]` makes a feed. `side` is 'start', 'end' or
'both'. `mode` is 'intersect' or 'manual'.

- `feed_wants` gives the sides that ask for more now.
- `feed_load` sets a side to loading. `feed_done` takes 'ok', 'empty' or
  'error'. `feed_reset` sets a side back to ok.
- A side that is loading or empty asks no more.
- Content added at the start keeps the view in place.
- `feed_view` shows Vuetify's footings. In manual mode that is "Load more".
  Loading shows a note, empty shows "No more", and an error shows the
  program's words and a Retry button.

### Pull to refresh (Vuetify's v-pull-to-refresh)

`pull_of[threshold]` makes a pull, with a threshold of 64 px.

- `pull_down`, `pull_move` and `pull_up` take the pointer. A pull counts
  only while the scroll is at the top.
- The content follows the pointer up to the threshold.
- Let go past the threshold, it refreshes until `pull_done`.
- `pull_heard` takes the frame's pointer events, and `pull_view` draws it.

### Reveals on scroll (AOS 2 and 3)

`reveals[…]` holds AOS.init's settings, and `reveal[…]` holds one
element's attributes. They give:

- the trigger lines (`reveal_in`, `reveal_out`), using AOS 2's from
  lory.motion and AOS 3's own;
- `once` and `mirror`;
- the duration, delay and easing from AOS's stylesheet;
- `reveal_step`, which runs the transition as the browser does, turned
  back halfway where it is;
- `reveal_look` and `posed`, the presets' looks: fade, slide, zoom and flip.

### Scroll-linked progress (Motion) and smooth scrolling (Lenis)

- `linked_progress[scroll, container, target, inset, offsets]` takes
  Motion's offset words, including `vh` and `vw`. `page_progress` covers a
  whole page.
- `smooth[limit, lerp, multiplier, duration, curve]` is Lenis's model:
  `smooth_wheel`, `smooth_to`, `smooth_frame`, `smooth_stop`,
  `smooth_start` and `smooth_limit`.

### Sticky, visibility, parallax, spy (Semantic UI, Vuetify, Motion)

- `sticky_at[s, scroll, view_tall, top, tall, from, to, offset,
  bottom_offset, pushing]` follows Semantic's states. A block is free,
  fixed to the top, bound to its context's bottom, or (pushing) fixed to
  the bottom. A block taller than the view scrolls within itself. It tells
  `stick`, `unstick` and `bottom`. `sticky_y` gives where to draw it.
- `seen_at[s, scroll, view_tall, top, tall, offset, once, continuous]`
  tells Semantic's events in its order: the reverses first, then
  `on_screen`, `off_screen`, `passing`, `top_visible`, `bottom_visible`,
  `top_passed` and `bottom_passed`. It also gives pixels and the share
  passed. As in Semantic, being on screen reads the last check's
  `passing`.
- `lazy_shown` is Vuetify's v-lazy: shown once, for good, at a threshold.
- `vuetify_parallax` is Vuetify's translate and scale. `parallax_y` is
  Motion's scroll × factor.
- `spy_at`, `scrolled_share` and `back_to_top_shown` give a scroll spy,
  progress, and when a way back to the top shows.

## Tests

```
crow test packages/lory/scrolling.co               --- 27 blocks, 115 truths
crow test tests/scrolling/reference.co             --- the libraries' numbers
sh tests/modes.sh crow tests/modes/scrolling.co    --- 113 lines, both modes
cd examples/scrolling && crow test main.co && crow build --target web main.co
```

Test blocks run in the interpreter, even under `crow test --compiled`.
What the module computes is held to both modes by tests/modes/scrolling.co,
which writes 113 lines that are equal in `crow run -i` and `crow run`. The
headset tests are in the blocks:

- a thumbstick pushed moves the sections;
- a thumbstick scrolls a scroll area and a virtual list;
- the ray pressed on a navigation dot moves there.

### Numbers held (tests/scrolling/reference.co)

reference.py runs each library at its pinned version in headless Chrome on
the pages in tests/scrolling/pages. It writes reference.json, and
reference.co holds every number.

| Library | Version | Numbers held | Bit for bit | Farthest off |
|---|---|---|---|---|
| AOS | 2.3.4 and 3.0.0-beta.6 | 12,006 | 11,750 | 373,475,386 × 2^-52 of the case (Chrome's bézier solved to its own epsilon) |
| Motion | 14.7.1 | 924 | 924 | 0 |
| Lenis | 1.3.27 | 6,630 | 6,630 | 0 |
| fullPage.js | 4.0.41 | 3,203 | 3,024 | the rest within the 10 ms a browser's frame and timers allow |

For fullPage.js, the cases held are:

- the defaults
- the keys, and keys refused while moving
- the wheel's rule
- the navigation dots' geometry and tooltips
- anchors and the history
- `loopTop`, `loopBottom` and `continuousVertical`
- slides, their arrows and dots
- `fitToSection`, and its absence
- the scroll bar, and easing by script
- `setScrollingSpeed`
- the responsive fallback
- lazy loading
- hidden sections
- inner scroll
- auto-height
- `beforeLeave` refusing a move

## Where Lory differs, and why

- The address's hash and history are a list the program keeps. The host
  page owns the real URL (see below).
- fullPage's body classes are `page_viewing`'s word. In continuous mode,
  fullPage leaves a stale class while the first section is laid last; that
  is not held.
- The scroll area has only a vertical bar. A horizontal scroll is the grid's
  `left`, so Radix's corner has nothing to fill.
- AOS's flip presets turn about X or Y. gui draws them as a scale on one
  axis, until gui has a transform per axis (see below).

## The survey's rows

| Row (docs/components/README.md) | Status |
|---|---|
| Fading Effect ext (34) | Built and tested for sections (`pages_view` with `fading`, `page_fading`). Slides still slide. |
| Full-page sections snap / Continuous / Loop | Built and held to fullPage 4.0.41: 700 ms, ease, `loopTop`, `loopBottom`, `continuousVertical`. |
| Horizontal slides | Built and held: arrows, slide dots, `loopHorizontal`, slide moves at the same speed. |
| Infinite scroll (Vuetify) | Built and tested: side, mode, done ok/empty/error, reset, the view held at the start. |
| Keyboard, Methods, Callbacks, Autoplay | Built and held: keys, the API's moves and settings, callbacks in order with triggers. Destroy and reBuild are not needed: a program drops or rebuilds its record. |
| Lazy Load, Autoplay Media | Built and held (lazy list), and tested (`page_media`). Playing media is the program's. |
| Offset Sections | Built and tested (`offset_tall`, `offset_scroll`). |
| Other effects (cinematic, drop, water, cards) | Not built: paid extensions with nothing observable to hold to. |
| Parallax | Built and tested: Vuetify's formula, Motion's y = scroll × factor, fullPage's reveal at 62%. |
| Pull to refresh | Built and tested: only at the top, threshold 64, refresh until done. |
| Responsive, Hide Sections | Built and held. |
| Reveal-on-scroll presets (AOS) | Built and held (AOS 2.3.4 and 3.0.0-beta.6). |
| Scroll area (Radix) | Built and tested: overlay bar, thumb drag, track press, type hover by default, hide delay 600 ms. The corner is not built (no horizontal bar). |
| Scroll Bar, Normal Scroll, Scrollable Elements | Built and held (`scroll_bar`, free mode, `page_inner`). |
| Scroll Inside Sections, Inner Scroll Reset, Auto Height, Padding | Built and held. |
| Scroll trigger anchors, offsets, options (AOS) | Built and held. |
| Scroll-linked animation (Motion, anime.js) | Built and held (`linked_progress`, using motion's `scroll_progress`). anime.js's window is motion's `scroll_window`. |
| Sticky (Semantic UI) | Built and tested: offset, bottomOffset, pushing, context, stick, unstick and bottom. `onTop` is called only by Semantic's `bindTop`, which its scroll never calls. |
| URL Anchors, History, Skip Sections | Built and held, on a list the program keeps. The real URL is the host's. |
| Virtual list (Vuetify) | Built and tested (`virtual_*`). |
| Virtual list rows and columns (TanStack) | Built and tested: overscan 5 rows and 3 columns, estimate then measure, spacers, 50,000 rows, near the end within 500 px. |
| Visibility events (Semantic UI, v-lazy) | Built and tested (`seen_at`, `lazy_shown`). |
| Section navigation dots and menu | Built and held (geometry, tooltips, active dot), drawn by `pages_view`, pressed by pointer or ray. |
| Lit Labs virtualizer, router, observers | The virtualizer's behaviour is the virtual list's (`virtual_scroll_to` is its `scrollToIndex`). The router and observers are not scrolling's. |
| Section backgrounds | Colour built (`section[color]`). Images and gradients are the program's faces. A fixed header is an overlay the program draws. |
| Scroll animation speed and easing | Built and held (`speed`, `easing`, `by_script`, `page_speed`). |
| Smooth scrolling (Lenis) | Built and held to Lenis 1.3.27, also used by the scroll area's `glide`. |

## What other modules would need

- gui: a transform per axis (or in 3D), for AOS's flips.
- gui: a press that starts outside a scroll's clip should not count for a
  control drawn under the clip (`_pressed_in`).
- gui: a way to read which control has the focus, so that a section's keys
  can wait while a field has the focus.
- The host page: the URL's hash and history, for fullPage's anchors.
- lory.motion: `scroll_progress` does not take `vh` and `vw`. Here they are
  resolved first.
