# Examples

Each example is a Crow program that runs in your browser. Open one to try it:
drag, press, type and scroll as you would in any app. In a headset's browser,
the examples offer to enter VR or AR.

## Controls and style

| Example | What it shows |
|---|---|
| [Shapes and text](shapes/) | A rounded panel, a turning ring, lines and text at three sizes. |
| [Controls](controls/) | A form and a table, every control drawn by Lory and answered from input. |
| [Colours and themes](colors/) | Every colour scale in light and dark with its text contrast, and a theme made from a picked accent and gray. |
| [Icons](icons/) | Every icon by name at two sizes, on the light and the dark look. |
| [Motion](motion/) | A gallery of easings, a spring tuned with sliders, a staggered grid and a timeline played, paused, sought and reversed. |

## Components

| Example | What it shows |
|---|---|
| [Forms and editors](forms/) | A sign-up form checked by its rules, with a password reveal, a country combobox, a six-box code, a range slider, a rating and a Markdown editor with live preview. |
| [Menus, dialogs and notifications](menus/) | A notes editor's menubar, context menu, command palette, dialogs, sheet, toasts, hover card, tooltip, an accordion and a tree of files with checkboxes. |
| [Navigation and display](display/) | An app bar, breadcrumbs, a stepper, pagination over cards, filter chips, avatars, a timeline, skeletons and spinners, and a gallery that opens in a lightbox. |
| [Date and time pickers](pickers/) | A date field, a range over two months, an inline calendar with week numbers, month and year fields, a time list and a week's scheduler. |
| [Carousels and sliders](carousel/) | Carousels of every kind (arrows, dots, autoplay, rows, centred, fade, lazy, upright, linked), a window of panes, a slide group of chips and an endless ticker. |
| [Scrolling and parallax](scrolling/) | Full-page sections with dots and slides, a scroll area with its own bar, a 50,000-row virtual list, an endless feed with pull to refresh, and a page of scroll effects. |
| [Drag and drop](drag/) | Lists reordered and shared, a control thrown, cards swiped, rows swiped to their actions, two pictures compared, a picture pinched and a honeycomb zoomed. |

## Data

| Example | What it shows |
|---|---|
| [Data table](datatable/) | Three hundred made-up people searched, sorted, paged and grouped, with a group's count, mean age and total score. |
| [Data grid and spreadsheet](datagrid/) | A grid of people edited and checked as drafts, cells chosen and merged, a live feed flashing its changes, and a spreadsheet with formulas, undo and redo. |
| [Charts gallery](charts/) | Every kind of chart Kite draws, with legends that hide datasets, tooltips and animated data changes. |
| [A year of minute bars](chart/) | Half a million one-minute candles with volume and a moving average, panned and zoomed. |
| [Candlestick chart](kite/) | Minute bars with a moving average, volume and MACD, drawing tools, drag, zoom and axis stretch. |
| [Scanner card](scanner/) | A dark scanner card with VWAP lines, a percentage ladder from the previous close and zoom buttons. |
| [Map](map/) | A world map with shapes, markers, popups, tooltips, a circle in metres, clustered cafés and a heatmap, dragged, zoomed and flown to cities. |

## 3D and sound

| Example | What it shows |
|---|---|
| [3D shapes](geometry/) | Pick a shape, set its numbers by sliders, turn it by drag and wheel, and show it solid, with its edges, or as a wireframe. |
| [A first 3D scene](sphere/) | A sphere over a ground, lit from the sky, seen from five up and ten back. |
| [A 3D scene](scene/) | A sphere, a box and a column over a ground, lit by the sky and the sun, seen by a camera that orbits; in a headset it stands on your floor. |
| [Materials and shadows](materials/) | Metal and non-metal balls of rising roughness, a box, the sun's shadows, and a ball drawn at the detail its distance asks for. |
| [3D scenes](scenes/) | A gallery of 35 scenes: shapes, lights, materials, fog, lines and points, copies, clipping, levels of detail, shadows, picking, fly, trackball and drag controls, marching cubes, and in a headset dragging, a ball shooter, paint and teleport. |
| [3D model files](models/) | Six model files (OBJ with MTL, PLY, STL, XYZ, VTK, OFF) read, drawn and turned by a drag, each written back as OBJ, STL, PLY or glTF. |
| [Sound](sound/) | A keyboard, a choice of synth and effect, a volume knob, a step sequencer, a level meter and a spectrum, all making sound in the program. |

## Galleries

| Example | What it shows |
|---|---|
| [Small apps](apps/) | Twenty small programs in three groups (Basics, Everyday apps, Classic tasks), from Hello World to a Markdown editor, a sortable grid, a stats graph, a circle drawer and a spreadsheet. |
| [Reactive state](reactive/) | State that changes and what follows from it: a timed counter, todos, a validated form, animations, a clock, a sketch pad, a scoreboard, async data with loading and errors, tabs that wait, and routing. |
| [Component patterns](patterns/) | How components are put together: templates, conditionals, lists, slots and composition, directives, context, signals, async tasks, events, refs and motion. |

## Games

| Example | What it shows |
|---|---|
| [Lantern Drift](drift/) | A small game: catch the falling motes, dodge the embers, by keys, drag or a headset. |
| [Gloam Run](runner/) | A small game: run from a beast of shadow through a wood at dusk, jumping rocks and logs and sliding under branches. |

## Building one yourself

Each example is a folder with a `main.co`. Build it for the web with
`crow build --target web main.co` in its folder, then serve `main_web/` over
HTTP.
