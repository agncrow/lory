# lory.navigation and lory.display: bars, trails, pages, steps, and what a page shows

`lory.navigation` (packages/lory/navigation.co) is what moves a reader
around a program: app bars, system bars and footers, bottom navigation,
breadcrumbs, menu bars, navigation buttons, pagination (Vuetify's and
TOAST UI's), steppers and toolbars. `lory.display` (packages/lory/display.co)
is what a page shows: avatars, badges, cards, chips, comments, data lists,
empty states, feeds, galleries and a lightbox, images, inline text styles,
key caps and shortcuts, lists, skeletons and placeholders, spinners and
other indicators, highlighted words, timelines, statistics, alerts and
callouts, circular progress, aspect boxes and advertisement slots.

Both build controls of gui's tree. A program holds what is chosen and reads
what each control told:

    pages = navigation.pagination['pages', 12, page]
    shown = gui.show[c, gui.column[[cards, pages]]]
    for e in shown.events
        if e.id eq 'pages' and e.act eq 'page'
            page = int[e.num]

Lory holds the rest under the control's id in process memory: the crumbs
opened, a gallery's focus and arrangement, an alert's time shown, the
images loaded and the letters' widths learned.

Each control follows a library's behaviour (named per row below), written
in Crow. Nothing of any library is copied: no source, prose, SVG path or
data table. The icons are `lory.icons`' and the easings `lory.motion`'s.

## The vocabulary of lory.navigation

### App bars, system bars and footers

| Function | What it does |
|---|---|
| `unscrolled[]` | How an app bar stands before the page scrolls (a `Scrolled` record). |
| `bar_scrolled[was, top, view_h, page_h, behaviour, threshold, tall, extension]` | How the bar stands with the page scrolled `top` down, from how it stood: Vuetify's `scroll-behavior` (`hide`, `fully-hide`, `inverted`, `collapse`, `elevate`, `fade-image`, apart by spaces) and `scroll-threshold`. Its fields: `shown`, `room` (the height it takes), `lifted` (how far it has gone up), `collapsed`, `flat`, `opacity` (of its image), and the scroll's `up`, `bottom` and `reached`. |
| `bar_tall[density, prominent]` | A toolbar's height: 64, `comfortable` 56, `compact` 48, `prominent` 128. |
| `app_bar[id, title, kids, scrolled, lead, tall, image, extension]` | The bar: an icon before the title (`lead`, telling `press` with words `lead`), its title, its controls at the end, an image behind (faded by `scrolled.opacity`), an extension under it; collapsed, flat or lifted as `scrolled` says. |
| `system_bar[kids, tall, window]` | A thin bar of status (24 high; `window` 32). |
| `footer[kids, key]` | A footer: its controls on a ground with an edge along its top. |

### Bottom navigation, breadcrumbs, menus, buttons

| Function | What it does |
|---|---|
| `place_index[places, chosen]`, `place_wide[words, grow, wide, count]` | The chosen place's index; a place's width (80 to 168, Vuetify's; `grow` shares the width out, 168 at most). |
| `bottom_nav[id, places, glyphs, chosen, mode, grow, shown, wide, tall]` | Places along the page's foot, each an icon over its words; a press (or Enter or space) tells `choose` with its words and index; `mode` `shift` shows only the chosen place's words; `shown` false leaves its room empty. |
| `crumbs_shown[count, most, before, after, expanded]` | Which crumbs show (MUI's): all where `count` is at most `most`, or `before` and `after` round an ellipsis (-1). |
| `crumbs_open[id]`, `crumbs_collapse[id]` | Whether a trail's ellipsis has been opened; closing it again. |
| `breadcrumbs[id, crumbs, divider, most, before, after, glyph]` | The trail: links telling `press` with their words and index, the last (the page) strong; its ellipsis tells `expand`, opens the trail and moves the focus to the first crumb it showed. |
| `menu_bar[id, kids, vertical, loop, stackable, wide]` | A menu's entries in a row (or `vertical`), one stop of Tab that the arrows move round (`loop`); `stackable` stacks them on a page under 768 wide (Semantic UI's). |
| `menu_entry[id, words, active, glyph]` | An entry: tells `press`; `active` sets it apart. |
| `menu_drop[id, words, entries]` | An entry opening a list of entries under it (gui's dropdown). |
| `nav_button[id, words, glyph, active, badge, layout]` | A navigation button: an icon over its words (`stacked`, 80 by 64) or beside them (`inline`), a dot (`badge` `dot`) or a count over its corner. |

### Pagination

| Function | What it does |
|---|---|
| `pages_shown[length, page, visible]` | The pages Vuetify's pagination shows with a `total-visible` (0: all), an ellipsis as 0. |
| `pages_fitted[length, page, wide, first_last]` | The pages it shows fitted to a width (Vuetify's measure: as many 58-wide buttons as fit beside the arrows). |
| `page_current[items, page]`, `arrows_off[length, page, disabled]` | Where the page stands among them; whether the arrows before and after are off. |
| `pagination[id, length, page, visible, wide, first_last, disabled, size]` | Vuetify's pagination: each button tells `page` with its page (`num`); the arrows, and Left and Right while one has the focus, step one page. |
| `last_page[total, per]`, `page_buttons[total, per, page, visible, centered]`, `page_more[total, per, page, side, visible, centered]` | TOAST UI's: the last page, the buttons it shows (`first`, `prev`, `more_prev`, the pages, `more_next`, `next`, `last`), where a "more" button moves to. |
| `toast_pages[id, total, per, page, visible, centered]` | TOAST UI's pagination: each button tells `move` with its page. |

### Steppers and toolbars

| Function | What it does |
|---|---|
| `step_state[i, active, completed, errors, disabled]` | A step's state: `error`, `complete`, `active`, `disabled` or `idle`. |
| `step_pressable[i, active, completed, editable, linear, disabled]` | Whether it may be pressed (Vuetify's: editable, never disabled, with `linear` only up to the first step not complete). |
| `stepper[id, titles, active, completed, subtitles, errors, disabled, editable, linear, mobile, vertical]` | Steps along a line (Semantic UI's states, Vuetify's stepper): a disc numbered, ticked, edited or marked; a step that may be pressed tells `step` with its title and index; `mobile` drops the titles. |
| `step_actions[id, active, count, back, on]` | Back and Continue, each telling `step` of the stepper's id with the step before or after (off at the ends). |
| `stepper_vertical[id, titles, active, bodies, completed, errors, editable, linear]` | Steps one under another, the active one's controls under its title. |
| `toolbar[id, items, title, density, prominent, collapsed, flat, loop, vertical, extension]` | A toolbar (Radix's roving focus, Vuetify's heights): one stop of Tab, the arrows moving along it (`loop` round). |
| `tool_button`, `tool_toggle`, `tool_toggles`, `tool_separator`, `tool_link` | Its parts: a button (`press`), a toggle (`toggle`, 1 or 0), a group of toggles (`choose`, one or `multiple`, by `display.chips_chosen`), a separator, a link. |

## The vocabulary of lory.display

### Tones, words, icons and grounds (shared with lory.navigation)

| Function | What it does |
|---|---|
| `toned[look, tone]`, `readable[color, behind]` | A tone's colour of the look (`accent`, `info`, `success`, `warning`, `danger`, `muted`, `ink`), and a colour made readable on a ground. |
| `words_wide[words, size]`, `learned[c]` | How wide words stand, by the atlas's letters once one has drawn (0.55 of the size before); the letters learned from a canvas. |
| `icon[name, size, tone]`, `draw_icon[c, name, x, y, size, color]` | `lory.icons`' icon as a control, or drawn by a painter (with display's names: `first`, `last`, `broken_image`). |
| `grounded[key, n, ground, cover]`, `grounded_image[key, n, url, alpha]`, `ground_box[key]` | A node on a ground of its own box (`panel`, `field`, `bar`, `raised`, `foot`, a tone, `quote`, `none`), or on a picture; where that ground stood the frame before. |
| `hold_still[on]` | Every indicator held still at its start, for a reader who asks for less motion. |
| `nothing[]` | A list of no controls. |

### People, marks and cards

| Function | What it does |
|---|---|
| `avatar[key, url, initials, size, delay, square, tone]`, `avatar_status[url]`, `fallback_shown[state, first, t, delay]` | Radix's avatar: the picture once loaded, the initials until then, after `delay` (its `delayMs`). |
| `avatar_group[key, urls, initials, most, size, delay]` | Vuetify's group: overlapping, at most `most`, the rest counted. |
| `badge[words, tone, variant]` | Radix's badge (`soft`, `solid`, `outline`). |
| `badged[n, words, dotted, tone, inline]`, `badge_place[words, dotted]` | Vuetify's badge over a control's corner (a count's pill or a dot), taking no room, or `inline`; where it stands. |
| `card[kids, id, title, subtitle, words, loading, disabled, wide]` | A card: given an id, pressed as one (`press`); a moving bar while `loading`; set aside when `disabled`. |
| `chip[...]`, `chip_sizes[size]`, `chip_wide[...]` | Vuetify's chip: chosen, a filter's tick, an icon before, a × telling `close` (Delete and Backspace too, as MUI's). |
| `chips_chosen[chosen, picked, multiple, mandatory, most]`, `chip_group[id, choices, chosen, ...]` | A chip group's selection rules (Vuetify's), and the group: one stop of Tab, Left and Right, Home and End, `choose` with the selection a line each. |
| `comment[id, author, when, words, replies, initials, actions, collapsed]` | Semantic UI's comment: actions as links, replies nested, hidden when `collapsed`. |
| `feed[key, initials, summaries, times, words]` | Semantic UI's feed. |
| `statistic[value, label, size, tone, horizontal]`, `big_words[words, size, tone]` | Semantic UI's statistic. |

### Lists, data and time

| Function | What it does |
|---|---|
| `list_item[id, title, subtitle, lead, trail, most, chosen, wide]` | An entry: icons before and after, a subtitle wrapped and cut to `most` lines; with an id, pressed as one. |
| `list_of[id, kids]`, `subheader[words]`, `list_group[id, title, kids, expanded]` | A list (one stop of Tab, Up and Down, Home and End), its heading, a group opening and shutting (`toggle`). |
| `numbered[entries, from]`, `bulleted[entries]` | Ordered and bulleted lists. |
| `data_list[labels, entries, label_wide, vertical]` | Radix's data list. |
| `timeline[id, titles, words, times, tones, side, horizontal, truncate, wide]` | Vuetify's timeline: alternating or to one side, along or down, its line cut at either end. |

### Loading and progress

| Function | What it does |
|---|---|
| `skeleton[key, n, loading]`, `skeleton_pulse[t]` | Radix's skeleton: the node kept in size, hidden and set aside, pulsing. |
| `skeleton_of[kind, wide]`, `bones_tall[kind]`, `placeholder_bones[kind, wide]`, `shimmer_at[t]` | Vuetify's skeleton loader's kinds (`text`, `heading`, `paragraph`, `avatar`, `button`, `chip`, `image`, `list_item`, `card`, `article`), shimmering. |
| `placeholder[count, picture, header, wide]`, `placeholder_widths[count]` | Semantic UI's placeholder. |
| `spinner[size, tone]`, `spinner_leaves[t]`, `spinner_turns[]`, `spinner_opacity[]`, `spinning[n, loading, size]` | Radix's spinner, and a node spinning while it loads. |
| `loader[active, words, size]`, `dimmer[key, n, active, words]` | Semantic UI's loader and dimmer. |
| `dots[kind, count, size, stagger, period, tone]`, `dot_lift`, `dot_pulse`, `ripple[...]`, `ripple_ring` | Motion's jumping and pulsing dots, and a ripple. |
| `circular[value, size, width, rotate, rounded, tone, words]`, `circle_geometry[...]`, `spin_parts[t]`, `circle_spin[t]` | Vuetify's circular progress; below 0, going on (its indeterminate spin). |

### Text, keys and highlights

| Function | What it does |
|---|---|
| `strong`, `em`, `quote`, `inline_code`, `blockquote`, `link` | Radix's typography: heavier, slanted, quoted, code (`soft`, `solid`, `outline`, `ghost`), a block quote, a link underlined `auto`, `hover`, `always` or `none` (telling `press`). |
| `kbd[words, size]` | A key cap. |
| `hotkey_parts[shortcut, platform, mode]`, `hotkey_label[shortcut, platform, mode]`, `hotkey[shortcut, platform, mode, size]` | Vuetify's hotkey: `+` together, `/` either, `-` one after another, a space between combinations; Mac symbols or PC words; its screen reader's label. |
| `term_ranges[...]`, `ranges_merged[spans]`, `highlight_ranges[...]`, `highlighted[words, spans, size, tone, wide]` | Vuetify's highlight: a term's places (case, every one, accents folded), spans merged, words drawn with them marked. |

### Pictures and boxes

| Function | What it does |
|---|---|
| `image[key, url, wide, tall, ratio, fit, lazy, preview, alt, radius]`, `image_state`, `image_size`, `image_number`, `heard[c]` | An image (Vuetify's, Semantic UI's): asked for once it shows (`lazy`), a preview or a pulse while it loads, a broken picture and its `alt` where it fails; `cover`, `contain`, `fill`. |
| `aspect[key, ratio, kids, wide]`, `aspect_tall[key, ratio, wide]` | Radix's aspect ratio. |
| `gallery[id, urls, arrangement, columns, wide, tall, gap, offset]`, `gallery_place`, `gallery_tall`, `gallery_moved`, `box_between`, `gallery_focus` | Motion's gallery: `grid`, `strip`, `ring` or `stack`, moving eased to a new arrangement; one stop of Tab, the arrows; a picture pressed tells `choose`. |
| `lightbox[id, urls, at, captions, wide, tall]`, `lightbox_step[at, count, key]` | A picture large in a modal layer: the arrows or a press on a side tell `choose`, Escape or the dimming `dismiss`. |
| `empty_state[title, words, glyph, headline, action, action_id]` | Vuetify's empty state. |
| `alert[...]`, `callout[id, words, tone]`, `alert_shown[id]`, `alert_reset[id]` | Vuetify's alert (Radix's callout, Semantic UI's message): a × telling `dismiss`, a timeout telling `dismiss` (`timeout`) once, its time held while the pointer rests on it or its × has the focus. |
| `advert[unit, kids, test_words, page_wide]`, `advert_size[unit]`, `advert_shown[unit, page_wide]` | Semantic UI's advertisement slot at an IAB unit's size; mobile units only on a page 767 or narrower. |

## Behaviours held

The test blocks in each module hold the keyboard maps and states:

- **Roving controls**: a toolbar, a menu bar, a chip group, a list, a
  gallery and bottom navigation are each one stop of Tab; the arrows move
  along them (round where `loop`), Home and End go to the ends, Enter and
  space press. A vertical toolbar or menu takes Up and Down.
- **Pagination**: each button tells its page; Left and Right step from the
  current page; the arrows are off at the ends and everything is off when
  `disabled`.
- **Breadcrumbs**: the ellipsis opens the trail, and the focus moves to the
  first crumb it showed (MUI's).
- **Stepper**: steps past the first one not complete cannot be pressed when
  `linear`; disabled steps never can; Back and Continue are off at the ends.
- **App bar**: each scroll behaviour through a scroll down past the
  threshold, to the page's foot, and back up.
- **Chips**: one or many chosen, a mandatory last one kept, `most` honoured;
  a closable chip tells `close` by its × and by Delete.
- **Avatar**: its initials only after their delay, its picture only once
  loaded.
- **Alert**: its timeout told once, its time held while the pointer rests
  on it and while its × has the focus.
- **Gallery and lightbox**: a press and Enter choose; the arrows wrap round;
  Escape dismisses.
- **Image**: asked for only once it shows; drawn once loaded.
- **In a headset**: one test in each module draws a headset's frame (its
  left eye) and presses a toolbar button, and a chip, by the right hand's
  ray and trigger.

## Parity

### Numbers from the libraries

tests/display/reference.mjs ran the libraries at pinned versions in Node
(Vuetify 4.3.1 with Vue 3.5.44, TOAST UI Pagination 3.4.1, MUI 9.5.0 with
React 19.2.9, @vuetify/v0 1.3.2, Radix Themes 3.3.0, jsdom 26.1.0; the CSS
animations in headless Chrome 157) and wrote tests/display/reference.json.
tests/display/reference.co holds Lory to it:

| What | Cases | Numbers held | Held to |
|---|---|---|---|
| Vuetify's pages with a total-visible | 946 | 3,784 | exactly |
| Vuetify's pages fitted to a width | 400 | 1,600 | exactly |
| TOAST UI's buttons and "more" moves | 1,430 | 4,290 | exactly |
| MUI's crumbs shown and separators | 1,232 | 2,464 | exactly |
| Vuetify's highlight spans and merges | 662 | 662 | exactly |
| Vuetify's hotkey keys, words and labels | 84 | 1,144 | exactly |
| Vuetify's circle geometry | 180 | 900 | 2^-40 of its size (all exact) |
| Animations: Vuetify's spin, Radix's spinner leaves and pulse, Vuetify's shimmer | 68 | 391 | an angle to 0.001°, a length to 0.0005, an opacity to 1e-6, a colour to 1/255 |

15,235 numbers in all. Chrome sums an animation's time and its delay in
seconds, so a spinner's leaf at the very end of its fade reads as the
start or the end of it by the rounding of that sum; `spinner_leaves` sums
them as Chrome does and holds every leaf.

Run from the repository's root:

    crow test tests/display/reference.co
    crow test --compiled tests/display/reference.co

### Both of Crow's modes

`crow test --compiled` runs the test blocks in the interpreter (it compiles
only the apps a block opens), so tests/modes/display.co writes out what the
two modules compute (pages, crumbs, steps, a bar through a scroll, chips,
the animations, shortcuts, highlights, a gallery's places) and a page of
them laid out, pressed and keyed (its boxes and what it told), and
tests/modes.sh holds the interpreter's run and the compiled program's
equal, line for line (409 lines):

    tests/modes.sh crow tests/modes/display.co

### The browser

examples/display builds for the web (`crow build --target web main.co`) and
was opened in headless Chrome by script: it draws, Continue steps the
stepper, a chip is chosen, the wheel scrolls the page, a page button turns
the cards, a picture pressed opens the lightbox, the right arrow moves it
and Escape closes it, the focus back on the gallery. Its test blocks hold
the same presses.

## Where Lory differs, and why

- **The app bar's scroll** is the program's to give (`bar_scrolled` takes
  the page's scroll): gui does not say how far a page has scrolled.
- **Embedded video** is not built: a video plays in the host (an iframe or
  a video element over the canvas, or frames decoded into a texture), which
  Lory's page cannot do yet. What a host would need: a layer placed over a
  box the program names, the address and its parameters (autoplay, start),
  a placeholder picture until pressed, and play, pause and ended told back
  as events.
- **Avatar groups** overlap by their edges; a circle's picture is cut in
  strips (no circular clip yet).
- **Breadcrumbs, cards and chips** measure their words from the atlas once
  it has drawn: before that, from 0.55 of the size.

## What waits on gui, Lory's drawing and the page

- PageUp and PageDown in a roving group.
- Moving the focus without marking a field.
- A container drawn on a ground of the program's (grounds are drawn by a
  marker control from last frame's boxes).
- Runs of words in several styles, or measuring words while the tree is
  built.
- A drawn control that is told events but is no stop of Tab.
- A drawn control that opens a layer.
- The page's scroll, readable by the program.
- Grid cells stretched to their row's height; rows honouring their `tall`,
  and placing children down a column's height.
- An image drawn from part of a picture, or cut to a circle.
- `gui.stretches[n]` and `gui.readable` public.
- The page's `prefers-reduced-motion` in the frame (`hold_still` waits on
  it).
- The theme's radius in a drawn control's record.

## The example

examples/display: an app bar over a scrolling page; breadcrumbs that open
their ellipsis; a stepper with Back and Continue; filter chips; avatars in
a group and one with a badge; a timeline; a spinner, a circle, dots and a
paragraph's skeleton; six cards a page (one loading) turned by pagination;
a gallery of six pictures drawn as SVG by data address, opening in a
lightbox.

## The survey's rows for navigation and display

| Row | Status |
|---|---|
| App bar, system bar and footer | built and tested: Vuetify's scroll behaviours (hide, fully-hide, inverted, collapse, elevate, fade-image) and threshold, densities and prominent, an image, an extension, a system bar and a footer; built, untested in a browser: the scroll itself, which the program gives |
| Bottom navigation | built and tested: places pressed and keyed, `shift` mode, grow, hidden; not built: hiding on scroll (the page's scroll) |
| Breadcrumbs | built and tested: MUI's collapsing (2,464 numbers), the ellipsis opening the trail and moving the focus, the last crumb the page; built, untested: an icon before |
| Menu bar and vertical menu (navigation menu) | built and tested: roving, vertical, stackable under 768, a dropdown of entries; not built: Semantic UI's pointing and tabular looks |
| Navigation button | built and tested: stacked and inline, a dot or a count |
| Pagination control | built and tested: Vuetify's windows (3,784 numbers) and fitted widths (1,600), first and last, disabled, keys; TOAST UI's buttons and "more" moves (4,290) |
| Stepper | built and tested: Semantic UI's states, Vuetify's linear, editable and mobile, Back and Continue, a vertical stepper with its controls |
| Toolbar | built and tested: Radix's roving (loop, vertical), Vuetify's heights, toggles one or many; built, untested: collapsed, flat, an extension |
| Advertisement slot | built and tested: IAB units' sizes, mobile units shown only on a phone's page, test mode |
| Aspect ratio box | built and tested |
| Avatar | built and tested: Radix's statuses, delayed initials; Vuetify's group with a count |
| Badge | built and tested: Radix's badge, Vuetify's corner marker, dot and inline |
| Card | built and tested: pressed as one, loading bar, disabled; not built: Semantic UI's reveal and dimmer on hover |
| Chip / label / tag | built and tested: sizes, filter, closable (× and Delete), chip groups' rules and keys; not built: dragging |
| Comment | built and tested: actions, nested replies, collapsed |
| Data list (label / value pairs) | built, untested |
| Embedded video | not built: it plays in the host (see above) |
| Empty state | built, untested |
| Feed | built, untested |
| Gallery (image grids and lightboxes) | built and tested: grid, strip, ring and stack, moving eased between them, keys, a lightbox with arrows and Escape |
| Image (lazy load, placeholder, error) | built and tested: lazy, loaded, failed; built, untested: a preview image, `contain` and `fill` |
| Inline text styles (strong, em, quote, code, kbd, blockquote, link) | built and tested: link underline modes and press; built, untested: the rest (slanted and heavier words are drawn by Lory's one face) |
| Kbd / hotkey display | built and tested: Vuetify's keys, words and labels (1,144 numbers) |
| List and list item | built and tested: roving, groups opening; built, untested: numbered and bulleted |
| Skeleton / placeholder | built and tested: Radix's pulse (to 1/255), Vuetify's shimmer, kinds and sizes, Semantic UI's placeholder |
| Spinner and loading indicators | built and tested: Radix's spinner (to Chrome's numbers), Motion's dots and ripple, Semantic UI's loader and dimmer, held still on request |
| Text highlight | built and tested: Vuetify's highlight (662 spans and merges) |
| Timeline | built and tested: dots along its line, sides, horizontal, truncated |
| Statistic | built; drawn in the modes file and the example, no test of its own |
| Alert / callout / message | built and tested: close, timeout held while rested on or focused |
