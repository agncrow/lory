# lory.menus, lory.overlays, lory.disclosure

Three modules hold what opens over a page or under a trigger:

- `lory.menus` (packages/lory/menus.co): dropdown, context and menubar
  menus, the navigation menu, the command palette, and the floating action
  button with its speed dial.
- `lory.overlays` (packages/lory/overlays.co): dialogs and alert dialogs,
  popovers, hover cards, tooltips, toasts and snackbars, sheets, banners,
  and dimmers.
- `lory.disclosure` (packages/lory/disclosure.co): the accordion, the
  collapsible and the tree view.

Each re-implements the behaviour of the library it follows: Radix's
primitives, cmdk, Vuetify, Semantic UI, Vue's tree example and the WAI-ARIA
patterns. None of their source, prose, SVG paths or data tables is
included. Their numbers were read from the pinned versions, and the ones
they compute are held to them by tests/menus/reference.co.

The program keeps what it opens (a dialog's `open`, the folds open, the
notices shown) and changes it on the events a frame tells. Lory keeps what a
library keeps inside its component: a menu's highlighted row, a tooltip's
timers, a tree's open folders and ticks. It keeps them in `use memory`
under `lory.menus…`, `lory.overlays…` and `lory.disclosure…`. Everything
draws with gui's look, takes its icons from `lory.icons` and moves with
`lory.motion`.

```
bar = menus.menubar[c, 'bar', [menus.bar_menu['file', 'File', entries]]]
area = menus.context[c, 'notes', kids, entries]
if menus.palette_key[c]
    open = true
pal = menus.palette[c, 'pal', commands, query]
box = overlays.dialog[c, 'rename', 'Rename', kids, open]
shelf = overlays.toasts[c, 'shelf', notices]
acc = disclosure.accordion[c, 'faq', folds, open, collapsible = true]
tree = disclosure.tree[c, 'files', twigs, checks = true]
```

examples/menus is a page that uses all three: a menubar, a context menu, a
palette on Control-K, dialogs, a sheet, toasts, a hover card, a tooltip, an
accordion and a tree with checkboxes.

## lory.menus

| Function | What it is |
|---|---|
| `item[id, words, shortcut, off]` | A row that is chosen (`choose`, its id). |
| `check[id, words, on, mixed, shortcut, off]` | A checkbox row (`check`, 1 when it becomes ticked). |
| `option[name, value, words, chosen, …]` | A radio row of group `name` (`option`, `name:value`). |
| `label[words]`, `separator[]` | A group's label and a rule. |
| `submenu[id, words, kids, off]` | A row that opens a menu of `kids` beside it. |
| `dropdown[c, id, words, entries, side, align, gap, modal, loop]` | A button that opens a menu under it (Radix's DropdownMenu). |
| `context[c, id, kids, entries, loop]` | `kids` that open a menu at the pointer on a right press, Control-press, or a touch held 700 ms (Radix's ContextMenu). |
| `menubar[c, id, pulls, loop, gap]`, `bar_menu[id, words, entries]` | A bar of menu titles (Radix's Menubar). |
| `navigation[c, id, items, gap]`, `nav_item`, `nav_link` | A site's navigation, whose items open panels of links (Radix's NavigationMenu). |
| `command[id, words, keywords, family, shortcut, off]` | One of a palette's commands. `family` is its group. |
| `palette[c, id, commands, query, wide, rows, hint, empty, loop]` | A command palette (cmdk in a dialog). |
| `palette_key[c]`, `typed_query[shown, id, query]` | Control-K or Command-K typed this frame, and the palette's query after this frame. |
| `command_score[words, query, keywords]`, `ranked[commands, query]` | cmdk's score (0 hides a command), and the commands found in cmdk's order. |
| `next_match[names, search, current]` | Radix's typeahead: the row that typing reaches. |
| `inside_polygon[x, y, corners]`, `grace_area[x, y, box, right]` | The submenu's grace area and the test for a point inside it. |
| `fab[c, id, icon, words, place]` | A floating action button. |
| `speed_dial[c, id, actions, icon, place]`, `dial_action[id, words, icon]` | A floating button that opens its actions over it (Vuetify's VSpeedDial). |
| `opened[id]`, `close_menus[]` | Whether a menu is open, and every menu closed. |
| `submenu_delay[]` 100, `grace_time[]` 300, `grace_bleed[]` 5, `typeahead_time[]` 1000, `long_press[]` 700, `context_gap[]` 2, `nav_delay[]` 200, `nav_skip_delay[]` 300, `nav_close_delay[]` 150, `fab_time[]` 300, `dial_stagger[]` 50, `dial_gap[]` 8, `fab_size[]` 56 | The numbers the menus keep. |

Behaviours held, each by a test block in menus.co:

- **Opening:** a press or Enter opens a dropdown below its button, 5 px away and centred,
  shifted to stay 8 px from the page's edge. Enter, space and the down arrow
  open it on its first row. Its opening is told the frame it is first drawn.
- **Moving and choosing:** the arrows pass over rules, labels and rows set aside, and stop at the
  ends (`loop` off, as in Radix). Home and End go to the ends.
- **Closing:** choosing tells `choose` and then `dismiss chosen`, and the focus goes back to the
  button. Escape and a press outside tell `dismiss`.
- **Checkbox and radio rows:** each tells what it becomes.
- **Typeahead:** letters typed within 1000 ms make one search, and a repeated letter cycles.
- **Submenus:** a submenu opens after the pointer rests 100 ms, or on the right arrow, Enter or
  space. The left arrow closes it. The pointer on its way to an open submenu
  keeps it open for 300 ms inside Radix's grace area.
- **Context menu:** it opens 2 px right of the point and flips at the page's edge. A
  touch held 700 ms opens it; a touch that moves does not.
- **Menubar:** one press opens a menu. The pointer moving onto another title
  opens that one. The arrows along the bar move between titles and loop.
  Right and left in an open menu move to the next and the previous menu.
- **Navigation menu:** an item opens after 200 ms, and at once while another is open or within
  300 ms of one closing. Its panel closes 150 ms after the pointer leaves.
- **Command palette:** it finds and orders what is typed as cmdk does (720 scores held).
  The arrows, Control-N/J/P/K, Home and End move the pick, and Enter chooses.
- **Speed dial:** its actions open above the button, and the dial closes as one is chosen.
- **In a headset:** a dropdown opens and chooses as it does on a page.

## lory.overlays

| Function | What it is |
|---|---|
| `dialog[c, id, title, kids, open, words, wide, dismiss]` | A modal dialog in the middle of the page (Radix's Dialog). It opens over 150 ms. |
| `alert_dialog[c, id, title, words, act, open, cancel, danger, wide]` | A dialog that asks: its focus goes to Cancel, and a press outside does nothing (Radix's AlertDialog). |
| `popover[id, words, kids, side, align, gap, wide]` | A button that opens a panel Lory holds, with a close button (Radix's Popover). |
| `hover_card[c, id, words, kids, side, align, gap, open_delay, close_delay, wide]`, `card_open[id]` | A link whose card opens after 700 ms on it and closes 300 ms after the pointer leaves (Radix's HoverCard). |
| `tooltip[c, n, words, side, gap, delay, hoverable]`, `tip_open[]` | A tip on control `n` (Radix's Tooltip). |
| `exit_side`, `padded_exit`, `grace_hull`, `hull` | The tooltip's way from its trigger to its tip: the side left by, the two padded points, and their convex hull with the tip. |
| `notice[id, title, words, act, tone, lasts]` | One toast or snackbar. |
| `toasts[c, id, notices, place, most, swipe, threshold, wide]` | Toasts stacked in a corner (Radix's Toast). |
| `snackbars[c, id, notices, most, wide]` | Snackbars at the foot of the page, one at a time (Vuetify's VSnackbarQueue). |
| `time_left[id, notice_id]`, `swiped_past[dx, dy, way, threshold]`, `swipe_start[device]` | A notice's time left, Radix's swipe test, and the move a swipe starts after (10 for a touch, 2 otherwise). |
| `sheet[c, id, kids, open, side, size, title, dismiss]` | A panel that slides in from a side over 200 ms (Vuetify's VBottomSheet and VNavigationDrawer). |
| `banner[c, id, words, acts, icon, tone]`, `banner_act[id, words]` | A band across the page with its acts at the end (Vuetify's VBanner). |
| `dimmer[c, id, kids, active, words, inverted, closable]`, `page_dimmer[…]` | Semantic UI's dimmer, over a box or over the page: black or white at .85, fading over 500 ms. |
| `dialog_time[]` 150, `card_open_delay[]` 700, `card_close_delay[]` 300, `tip_delay[]` 700, `tip_skip_delay[]` 300, `tip_padding[]` 5, `toast_time[]` 5000, `swipe_threshold[]` 50, `toast_hotkey[]` F8, `snack_gap[]` 8, `sheet_time[]` 200, `dim_time[]` 500, `dim_depth[]` .85 | The numbers the overlays keep. |

Behaviours held, each by a test block in overlays.co:

- **Dialog:**
  - It takes the focus, and Tab goes round its controls.
  - Escape, a press on the scrim and its close button tell why it closed.
  - It leaves over 150 ms, retracing from where it was, and gives the focus back.
- **Alert dialog:** its focus starts on Cancel, a press outside does nothing, and its act
  tells `choose`.
- **Popover:** it opens 5 px under its button. Escape, a press outside and its close
  button close it.
- **Hover card:** it opens after 700 ms. The pointer may cross to it, and it closes 300 ms
  after the pointer leaves both. A touch does not open it.
- **Tooltip:**
  - It waits 700 ms, then opens at once for 300 ms after one closes.
  - A press closes it.
  - It stays open while the pointer is inside the hull on the way to it.
- **Toasts:**
  - Three show at once.
  - The pointer on them pauses every one, keeping each one's time left.
  - A swipe of 51 px closes a toast; one of 49 springs back.
  - F8 takes the focus to the newest.
  - A blurred window pauses them.
- **Snackbars:** one shows at a time. The pointer holds it, and its time starts again
  once the pointer leaves.
- **Sheet, dimmer and banner:** the sheet slides in on the standard curve. The dimmer fades, and its
  press closes it where `closable`. The banner's acts stand at its end.
- **In a headset:** a dialog opens and its close button tells as it does on a page.

## lory.disclosure

| Function | What it is |
|---|---|
| `fold[id, words, kids, off]` | One of an accordion's folds. |
| `accordion[c, id, folds, open, multiple, collapsible]` | Folds under one another (Radix's Accordion). `change` tells the folds open, separated by spaces. |
| `folds_open[shown, id, open]`, `folds_after[open, which, multiple, collapsible]` | The folds open after a frame, and after a press. |
| `collapsible[c, id, words, kids, open]`, `toggled[shown, id, open]` | A trigger and what it shows (Radix's Collapsible): `toggle`, 1 to open. |
| `leaf[id, words, off]`, `branch[id, words, kids, off]` | A tree's twigs. A branch may be empty. |
| `tree[c, id, twigs, checks]` | A tree view. Its events are `toggle`, `choose`, `check` and `fold`. |
| `flat[twigs]` | The twigs laid flat: each line has its depth, its parent's place, and how many lines are under it. |
| `ticked_after[lines, ticks, r, on]` | Vuetify's classic choosing: the ticks after line `r` is ticked or unticked. |
| `tree_open[id]`, `tree_ticked[id]`, `tick_of[id, twig]`, `open_twigs[id, ids]` | A tree's open folders, its ticked leaves and one twig's tick. `open_twigs` opens folders from the program. |
| `fold_time[]` 300, `tree_row[]` 28, `tree_indent[]` 20 | The numbers it keeps. |

Behaviours held, each by a test block in disclosure.co:

- **Accordion:**
  - One fold opens at a time. The open fold closes only where `collapsible`.
    With `multiple`, each fold opens and closes alone. A fold set aside tells nothing.
  - Enter and space open and close a fold. The arrows move between triggers and loop past the ends,
    passing those set aside. Home and End go to the ends, and Tab leaves.
- **Fold motion:** a fold's room grows and shrinks over 300 ms on the curve of Radix's demos,
  cubic-bezier(0.87, 0, 0.13, 1). A fold open when it is first laid stands
  open at once.
- **Collapsible:** a press, Enter or space tells `toggle`.
- **Tree:** it is laid flat with the depths, parents and counts the keys need.
- **Pressing in the tree:** this follows Vue's tree example. A press opens or closes a folder and chooses a
  leaf. A double press on a leaf tells `fold`, and Lory opens it.
- **WAI-ARIA tree keys:**
  - Down and up move along the rows shown, passing those set aside.
  - Right opens a closed folder, then goes to its first twig. Left closes an open folder, then goes to the twig's folder.
  - Home and End go to the ends. Enter opens a folder or chooses a leaf.
  - `*` opens every folder beside the twig.
  - Typing goes to the next twig shown whose words start that way, with letters in one second making one search.
- **Checkboxes:** these follow Vuetify's classic choosing, whose answers are held to Vuetify's own.
- **In a headset:** a tree opens its folders as it does on a page.

## How parity is held

1. **Keys, event order and timings.** These are written as test blocks after the code in each module.
   Every number comes from the pinned version, and the test's comment names
   its source. Each test gives frames as a page hands them (times in ms,
   presses, moves and keys), and reads the events, boxes and focus that come
   back.
2. **What a library computes.** tests/menus/reference.mjs runs the real
   libraries in Node on fixed inputs and writes tests/menus/reference.json.
   tests/menus/reference.co holds Lory to every answer in it. Radix's
   private functions (getNextMatch, isPointInPolygon, getExitSideFromRect,
   getPaddedExitPoints, getHull, isDeltaInDirection) are found in the
   installed dist files and evaluated as the script runs, so none of their
   code is kept. Constants are found in the libraries' files by pattern and
   written with their file and line. The pinned versions are in the script's
   header:
   - cmdk 1.1.1.
   - @radix-ui/react-menu 2.2.1, react-context-menu 2.4.1, react-tooltip
     1.4.1, react-hover-card 1.2.1, react-toast 1.3.1, react-navigation-menu
     1.4.1 and react-accordion 1.3.1.
   - vuetify 4.3.1, with vue 3.5.45.
   - semantic-ui-css 2.4.1.

   Every answer is held:

   | What | Answers | Bit for bit |
   |---|---|---|
   | Constants | 23 | 23 |
   | cmdk scores (24 commands × 30 queries) | 720 | 719 (one within 2^-50) |
   | Radix typeahead matches | 440 | 440 |
   | Submenu grace areas and points | 1264 | 1264 |
   | Tooltip exit sides, padded points and hulls | 44 | 44 |
   | Toast swipe tests | 96 | 96 |
   | Vuetify classic ticks, after each of 19 presses on a 13-twig tree with twigs set aside | 266 | 266 |

3. **Both of Crow's modes.** tests/modes/menus.co writes what the three
   modules compute, together with two pages answering about sixty frames.
   `tests/modes.sh crow tests/modes/menus.co` holds the interpreter's
   output to the compiled program's, line for line (204 lines).
4. **The headset.** Each module has a test block with `"xr": true` frames.

```
node tests/menus/reference.mjs <scratch>/ref/node_modules
crow test tests/menus/reference.co
crow test --compiled tests/menus/reference.co
tests/modes.sh crow tests/modes/menus.co
```

## Where Lory differs

These differences come from what gui offers today:

- **Escape with a toast stack.** gui's Escape goes to the last layer laid
  that keeps the pointer, so toasts or snackbars laid after an open dialog
  take Escape. Lay them before dialogs, as examples/menus does.
- **Tab in a menu.** A menu closes on Tab. gui cannot keep Tab inside a layer
  that is not modal.
- **Popover focus.** A popover gives the focus back to its button after a
  press outside, where Radix leaves it on what was pressed.
- **Toasts leaving.** A toast leaves the moment the program takes its notice
  away, with no exit animation. Pausing and resuming come one frame late.
- **Snackbar bands.** A snackbar's band keeps the pointer from the whole
  width of the page's foot.
- **Fold motion.** gui's only clipping column is a scroll, with a bar and a
  wheel, so a fold's room grows empty and what it holds shows once the fold
  is whole. Radix clips its content as it grows. A fold never laid whole
  opens at once.
- **Window focus.** The window's blur pauses toasts, but Lory's loader tells
  no focus event, so a toast resumes on the next pointer move instead.
- **Navigation menu keys.** The down arrow into a navigation menu's content
  is not built.

## Survey rows

| Row | Status |
|---|---|
| Dropdown menu | Built and tested |
| Context menu | Built and tested, including the touch long-press |
| Menubar | Built and tested |
| Navigation (mega) menu | Built and tested; the down arrow into its content is not built |
| Command palette | Built and tested; cmdk's scores are held |
| FAB and speed dial | Built and tested |
| Dialog and alert dialog | Built and tested |
| Popover | Built and tested |
| Hover card | Built and tested |
| Tooltip | Built and tested; Radix's hull is held |
| Toast and snackbar | Built and tested; Radix's swipe is held |
| Sheet | Built and tested (side, top and bottom) |
| Banner | Built and tested |
| Scrim and dimmer | Built and tested |
| Portal | Not built: gui's layers are laid after the tree, so every overlay is already drawn over the page, out of its parent's clip |
| Map popups | Not built here: they belong to the `map` builder's module |
| Accordion (single, multiple, collapsible; keys) | Built and tested |
| Collapsible | Built and tested |
| Tree view (Vue's example; Vuetify and TOAST UI checkbox trees; WAI-ARIA keys) | Built and tested. Vuetify's classic choosing is held. TOAST UI's checkbox tree chooses the same way, so it is not separate |

## Changes wanted in files these modules do not own

- **gui.co:**
  - A public `focused[]`. The tests read `gui._fresh` through gui's memory.
  - A way to give the focus without marking a field's text.
  - A Tab trap for a layer that is not modal, so a menu can keep Tab as Radix's does.
  - Escape that goes to the top layer that may be dismissed, passing those that only keep the pointer (toasts).
  - A clipping column without a scroll's bar and wheel, for folds.
- **main.co:**
  - `lory.events` and `lory.time` answering plain values in a painter, without the `.ok` check.
  - A window `focus` event from the loader.
- **test.sh:** lines for `crow test tests/menus/reference.co`, both modes,
  and for `tests/modes.sh crow tests/modes/menus.co`.
- **examples/README.md:** a row for `menus`.
