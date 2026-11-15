# kite.charts: Chart.js's charts, drawn with Lory

`kite.charts` (packages/kite/charts.co) is Kite's module of data charts. A
program writes `use kite.charts` and calls its functions as
`charts.chart_of[…]`. It re-implements the behaviour of Chart.js 4.5.1: its
kinds of chart, its scales, its layout, legend, titles and tooltip, its
interaction modes, its animations and its decimation. Its numbers are held
to Chart.js's own, read from Chart.js running in headless Chrome.

A chart is a view over data. A program makes one each frame, from a kind,
labels, datasets and options (or from a Chart.js configuration read with
`charts.of`), and hands it to be drawn into a box of the canvas:

- **In gui's tree.** `charts.drawn[ch, wide, tall]` is a control; its
  painter (`charts.painter`) draws the chart kept under its id with `use
  memory`, as Myna's history chart does.
- **Straight onto the canvas.** `charts.shown_at[c, ch, x, y, w, h]`.

Between frames Kite keeps, under the chart's id, what Chart.js keeps in its
chart object: the datasets and values the legend has hidden, the marks on
their way where the data changed, what the pointer was over, and the place
the arrow keys reached. The chart tells the program what the reader did as
gui's events of the chart's id.

The module is made of these files, each under about 1,500 lines:

| File | What it holds |
|---|---|
| charts.co | The face: making a chart, laying it out, asking it, drawing it, events, what is kept |
| charts_model.co | The records (`Chart`, `Set`, `Axis`, `Legend`, `Heading`, `Tip`) and the rules every part shares: number writing, CSS colours, text widths |
| charts_json.co | A Chart.js configuration read into a chart |
| charts_scales.co | The axes: datasets read against them, stacks, ranges, ticks, labels, pixels |
| charts_time.co | Time: units, rounding, formats and steps, in UTC |
| charts_fit.co | An axis laid in its room (labels turned, thinned, padded); a radial axis laid in the area |
| charts_layout.co | The boxes round the chart's area: legend, titles, axes |
| charts_marks.co | Where each bar, point and arc stands |
| charts_hits.co | What the pointer finds, the tooltip, the legend's clicks |
| charts_motion.co | Animations and Chart.js's easings |
| charts_decimation.co | Long lines thinned (LTTB and min-max) |
| charts_paint.co | The drawing |

## The vocabulary

### Making a chart

| Function | What it answers |
|---|---|
| `chart_of[id, kind, labels]` | A chart of a kind (`bar`, `line`, `scatter`, `bubble`, `pie`, `doughnut`, `polarArea`, `radar`) named `id`, over labels, with no datasets yet. Its axes, legend, tooltip, interaction and animation are Chart.js's defaults for that kind. |
| `dataset[kind, label, ys]` | A dataset of values (`nan` where there is none), placed by the chart's labels. `kind` `''` is the chart's own; another kind makes a mixed chart. |
| `points[kind, label, xs, ys]` | A dataset of points at `xs` along an axis of numbers or times. |
| `bubbles[label, xs, ys, rs]` | A bubble chart's dataset: bubbles at (x, y), each `rs` pixels in radius. |
| `floating[label, starts_at, ends_at]` | A floating bar chart's dataset: each bar from its start to its end. |
| `with_set[ch, s]` | The chart with a dataset added after its others. |
| `axis[id, kind, way, position]` | An axis (`linear`, `logarithmic`, `category`, `time`, `timeseries`, `radialLinear`) running `x`, `y` or `r`, on its side. |
| `with_axis[ch, a]` | The chart with the axis of that id set (added where it has none). |
| `titled[ch, lines]`, `subtitled[ch, lines]` | The chart with a title, or a subtitle, of those lines. |
| `of[id, config]` | The chart read from a Chart.js configuration, JSON's text: its `type`, `data` and `options`. Text that is not JSON gives a bar chart of nothing. |
| `sparkline[id, ys, kind, smooth, filled, color]` | Vuetify's sparkline: a bare small chart (`trend` or `bar`), smoothed (monotone) and filled where asked. |

Every option is a field of the records in charts_model.co (`Chart`, `Set`,
`Axis`, `Legend`, `Heading`, `Tip`), which a program may set directly. A
configuration read by `of` sets the same fields from Chart.js's option names.

### Laying it out and asking it

| Function | What it answers |
|---|---|
| `laid[ch, width, height]` | The chart laid in a box (CSS pixels): its area, the boxes of its legend, titles and axes, its axes' ranges, ticks and labels. Long lines are thinned first where it decimates. Words are measured as Lory measures them before its atlas is made. |
| `laid_with[ch, width, height, pen]` | The same, words measured with a pen (`charts_model.pen_of[c, …]` measures with the canvas's font). |
| `marks_of[ch, at]` | Each dataset's marks (bars, points, arcs) where the laid chart puts them. |
| `found[ch, at, layers, x, y]` | The marks the chart's own interaction finds at (x, y). |
| `picked[ch, at, layers, x, y, mode, intersect, way]` | The marks a mode finds at (x, y): `index`, `dataset`, `point`, `nearest`, `x` or `y`; only those under it where `intersect`; distance along `way` (`x`, `y`, `xy`, `r`; `''` for the mode's own). |
| `tooltip[ch, at, layers, x, y]` | The tooltip with the pointer at (x, y): whether it shows, its title and lines, its box and its caret. |
| `legend_pressed[ch, at, x, y]` | The chart as a press on its legend leaves it: the item's dataset (or value) hidden, or shown again. |
| `hits_of[words]`, `hits_words[hits]` | Marks named in an event's words (`dataset:place`, apart by spaces), and back. |

### Drawing it

| Function | What it answers |
|---|---|
| `drawn[ch, wide, tall]` | The chart as a control of gui's tree, `wide` by `tall` CSS pixels (`wide` 0: as wide as its column). The chart is kept under its id for the painter. |
| `painter[d]` | The painter of such a control: it draws the chart kept under the control's id and tells what the reader did. |
| `shown_at[c, ch, x, y, w, h]` | The chart drawn straight onto the canvas in the box at (x, y), `w` by `h` canvas pixels. It answers a `Painted [canvas, events]`. |
| `kept_of[id]`, `forget[id]` | What Kite keeps of a chart between frames (a `Kept`), and that forgotten. |
| `held_of[ch]` | The chart as the reader has left it: the datasets and values the legend has turned hidden or shown. |

### What the reader did

The chart tells these as gui's events (`gui.Event[id, act, words, num]`) of
its id:

| Act | When | Words | Number |
|---|---|---|---|
| `hover` | The marks under the pointer changed | the marks, `dataset:place` each | the first one's place (-1: none) |
| `press` | A press was let go on the chart's area | the marks under it | the first one's place |
| `legend` | A legend item was pressed, and its dataset (in a pie, a doughnut or a polar area, its value) hidden or shown again | the item's text | the dataset's (or value's) place |
| `current` | The arrow keys (Home, End; Escape lets go) moved to another place, as Vuetify's sparkline tells its current index | | the place |

The keys reach a chart in gui's tree when it has the focus.

## Behaviours held

These are Chart.js 4.5.1's rules, read from its documentation and from
running it, and written anew:

- **Kinds.** Bar (vertical and horizontal; grouped, stacked, stacked in
  groups, floating; bar and category shares, a fixed or capped thickness,
  `flex`, a least length, `grouped: false`, `skipNull`; corner radii, one
  for all or per corner, none beside a skipped edge; the border's skipped
  edges); line (tension, monotone curves through the points, steps before,
  after and in the middle, gaps broken or spanned up to a span, points
  shown or not, `showLine`); scatter; bubble; pie and doughnut (cutout,
  rotation, circumference, offsets, spacing, several rings); polar area;
  radar; and any mix of them, drawn by `order`.
- **Fills.** `origin`, `start`, `end`, `stack`, a fixed value, another
  dataset by place (`'-1'`, `'+1'`, `2`), on lines and radars.
- **Scales.** Linear (nice steps, `beginAtZero`, `min`/`max`, suggested
  bounds, `grace`, `stepSize`, `maxTicksLimit`, `precision`, `count`,
  `includeBounds`, `bounds`, `reverse`), logarithmic (its major and minor
  ticks and their labels), category (`min`/`max` by label, `offset`), time
  (units chosen or given, `minUnit`, rounding, the adapter's formats, major
  ticks, `source`), time series (evenly spread), and radial linear (angle
  lines, point labels kept inside, centred point labels, backdrops); stacked
  axes and stacks sharing an axis's room (`stack`, `stackWeight`); several
  axes on a side; grid lines (`drawOnChartArea`, `drawTicks`, offset grid),
  borders, titles; labels turned up to `maxRotation` where they would meet,
  then thinned by `autoSkip` (major ticks kept first), mirrored labels, and
  the room their ends need beyond the axis.
- **Layout.** Chart.js's box layout: the legend and titles first, then the
  axes fitted and fitted again until they agree, padding and `autoPadding`
  for points past the area's edge; a chart laid anew at each box it is
  given (Chart.js's responsive resize, with no animation).
- **Legend.** Positions (top, bottom, left, right, chartArea), alignment,
  reverse, box sizes, point styles, its title, columns where it runs down a
  side; a click hides or shows a dataset, or a pie's value, the hidden
  item's text struck through.
- **Title and subtitle.** Lines, position, alignment, size, weight, padding.
- **Tooltip.** Shown for what the interaction finds; positioned `average` or
  `nearest`, its box placed and aligned as Chart.js places it (`xAlign`,
  `yAlign` chosen to stay inside the chart), its caret, its title and lines
  as Chart.js writes them (values written as Chart.js's number formatter
  writes them), its colour boxes.
- **Interaction.** The modes `index`, `dataset`, `point`, `nearest`, `x` and
  `y`, with `intersect` and `axis`; a mark under the pointer drawn in its
  hover colours and sizes.
- **Animation.** Chart.js's default animations: numbers and colours moved
  from where they stand to where the data puts them, over the duration and
  easing asked (Chart.js's 31 easings, its colour mixing in whole bytes);
  bars grown from their base, points from the axis, arcs turned out and
  grown (`animateRotate`, `animateScale`) when a chart is first drawn; a
  chart updated mid-way picking up from where its marks stand.
- **Decimation.** LTTB and min-max, with Chart.js's threshold and samples,
  for lines over a linear or time x axis.
- **Colours and fonts.** CSS colours read (hex, `rgb()`, `rgba()`, named),
  one for a dataset or one per value; Kite's own palette where a dataset
  names none; sizes and bold text.
- **Pixels.** A chart is laid in CSS pixels and drawn at the canvas's
  pixels per CSS pixel.

Kite's own easings (`lory.motion`) are the arithmetic of anime.js, Motion,
CSS and AOS (an overshoot of 1.7, an elastic amplitude and period). Chart.js
uses Robert Penner's constants (1.70158 and its own elastic), so
charts_motion keeps Chart.js's 31 easings, held to Chart.js's numbers.

### Where Kite draws as Chart.js does, but not to the pixel

- Lory draws no turned text: a turned tick label is written letter by
  letter along its turn, and a vertical axis title letter under letter.
  Their boxes, which the layout uses, are Chart.js's.
- Bold text is drawn twice, a little apart.
- A fill between two datasets is drawn point to point between their points;
  where their lines curve, the fill's edge follows the points, not the
  curve.
- Hover and tooltip changes show at once; Chart.js moves them over 400 ms.
  A dataset hidden or shown appears or goes at once; Chart.js fades it.
- An arc that turns through nothing is not drawn; Chart.js draws a sliver
  too thin to see.

## Parity

### Numbers from Chart.js

`tests/charts/reference.py` runs Chart.js 4.5.1 (with
chartjs-adapter-date-fns 3.0.0 over date-fns 4.1.0 for the time scales) in
headless Chrome, in UTC, on 46 charts of fixed data and options. It writes
`tests/charts/reference.json`, with the width Chrome measured for every text
it laid. `tests/charts/reference.co` holds Kite to it, measuring text with
those widths so that the layout, not the font, is what is held. Every number
is held to a millionth of a pixel, of a degree or of a unit of value.

| Block | What is held | Numbers |
|---|---|---|
| `every_chart_is_laid_as_chart_js_lays_it` | Each chart's area; each axis's box, range, turn and padding; each tick's value, label and pixel; a radial axis's centre, radius and point labels; the legend's, title's and subtitle's boxes | 4,050 |
| `every_mark_stands_where_chart_js_puts_it` | Each bar's x, y, base, width and height; each point's x and y and its curve's control points; each arc's centre, angles and radii | 6,416 |
| `every_mode_picks_what_chart_js_picks` | Which elements each interaction mode picks, with and without `intersect` and along each axis, at fixed pointer positions | 11,800 |
| `every_tooltip_says_and_stands_as_chart_js_s` | The tooltip there: its title and lines, box, caret and alignment | 2,756 |
| `a_click_on_the_legend_hides_what_chart_js_hides` | What a click on each legend item hides, and the chart laid again after it | 2,268 |
| `every_easing_paces_as_chart_js_s` | Chart.js's 31 easings at 21 times | 651 |
| `colours_part_way_are_chart_js_s` | Colours part way between two, as Chart.js mixes them | 120 |
| `marks_move_as_chart_js_moves_them` | Marks part way through Chart.js's animations | 1,840 |
| `long_lines_are_thinned_as_chart_js_thins_them` | Lines decimated by LTTB and min-max | 17,680 |

In all, **47,581 numbers** are held.

To make reference.json again, install the pinned packages in a folder
outside Lory, then run the script from Lory's root:

    npm install --prefix <ref> chart.js@4.5.1 chartjs-adapter-date-fns@3.0.0 date-fns@4.1.0
    python3 -I tests/charts/reference.py <ref>/node_modules

The script refuses a package whose installed version is not the pinned one.

### Both of Crow's modes

| File | Blocks | Truths |
|---|---|---|
| packages/kite/charts.co | 9 | 61 |
| packages/kite/charts_model.co | 3 | 37 |
| packages/kite/charts_json.co | 2 | 16 |
| packages/kite/charts_scales.co | 3 | 14 |
| packages/kite/charts_time.co | 3 | 26 |
| packages/kite/charts_fit.co | 2 | 12 |
| packages/kite/charts_layout.co | 1 | 4 |
| packages/kite/charts_marks.co | 2 | 11 |
| packages/kite/charts_hits.co | 2 | 13 |
| packages/kite/charts_motion.co | 2 | 12 |
| packages/kite/charts_decimation.co | 1 | 5 |
| packages/kite/charts_paint.co | 5 | 25 |
| tests/charts/reference.co | 9 | 9 truths over 47,581 numbers |
| examples/charts/main.co | 3 | 24 |

- **The test blocks.** Every block passes under `crow test` and under
  `crow test --compiled`.
- **Compiled against interpreted.** `crow test --compiled` runs plain test
  blocks in the interpreter, so `tests/modes/charts.co` is also run both
  ways (`tests/modes.sh crow tests/modes/charts.co`). It writes out, for 18
  of the reference's charts: the area, each axis's range, box, tick labels
  and tick pixels, the legend's items, every mark's geometry, what each
  interaction mode finds and what the tooltip shows at the middle of the
  area; Chart.js's easings; a long line thinned both ways; and every chart
  drawn as it sets out, on its way and arrived (the canvas's vertices
  counted and summed), on the canvas and in gui's tree. Its 255 lines are
  the same under `crow run -i` and compiled `crow run`.

### The browser

- **The web build.** `examples/charts` builds for the web
  (`crow build --target web main.co`).
- **The browser check.** `python3 -I tests/charts/browser.py`, run from
  Lory's root, does this:
  1. It builds the example, unless `--built` is given.
  2. It serves the build on a free port of 127.0.0.1 and opens it in
     headless Chrome, 1600 by 1100, and waits for the charts to settle.
  3. It checks that each of the sixteen cards has its chart's marks drawn:
     pixels of Kite's palette, and of its colours at half strength over the
     card, below the legend's band.
  4. It checks that the sparkline beside the select is drawn.
  5. It clicks the bar chart's first legend item and checks that its bars
     leave the plot; a second click brings them back.
  6. It moves the pointer over a bar and checks that a tooltip shows.
  7. It clicks the select and presses the down arrow, and checks that the
     bar chart's bars change for the next data.
  8. It checks that the page threw nothing and reported no error.
- **What it needs.** Chrome and Python's own library. Nothing is installed.

## The example

`examples/charts` is a gallery of sixteen cards, one for each kind of chart
and each kind of axis: bars, bars across, stacked bars, floating bars,
lines (a curve filled to the origin, and steps), gaps (broken and spanned),
scatter, bubbles, pie, doughnut (two rings), polar area, radar, bars and a
line, a logarithmic axis, a time axis, and two axes. Each card's chart is
read from a Chart.js configuration (`charts.of`) and drawn straight onto the
canvas (`charts.shown_at`), with an icon from `lory.icons` by its title.

Above them, in gui's tree:

- **A select** picks the data every chart shows: sales, weather or visits.
  The marks move to their new places as Chart.js animates an update.
- **A sparkline** of the data, drawn by `charts.drawn` (the painter path).
- **A line** saying what the charts last told: a legend item turned, or a
  press on a mark.

A press on a legend item hides its dataset (in the pie, the doughnut and the
polar area, its value); a second press shows it again. The pointer over a
mark shows its tooltip.

## Not built

| What | Why |
|---|---|
| Scriptable options (functions of the context) | Crow's options are values; a program computes per-value colours itself and hands them as lists (indexable options are built). |
| Plugins and extension points; derived chart and axis types | A program draws before and after the chart with Lory, using the laid chart's boxes (`laid`) and marks (`marks_of`). |
| HTML legends and external tooltips | There is no page to write into; `laid[…].legend` and `tooltip[…]` give a program what it needs to draw its own. |
| Tooltip callbacks (title, label and footer templates), `usePointStyle` in the tooltip | Not built; the tooltip writes Chart.js's default lines. |
| Line segments styled apart, `borderDash` | Not built. |
| The `shape` fill and a fill's `drawTime` | Not built; `lory.geometry`'s earcut could fill a closed line's shape. |
| Gradients and patterns | Lory fills with flat colours. |
| Per-element delays, looping, progressive and drop animations | Only Chart.js's default animations are built. |
| Exporting an image | The page's canvas is Lory's to read. |
| A doughnut's empty state; centring an axis in the area (`position: 'center'`) | Not built. |
| Accessibility beyond the keys | A canvas has no accessibility tree; the arrow keys move through the places and tell them. |
| Locales other than en-US | Numbers are written as Chart.js writes them in en-US. |
| Box plot, bullet, treemap, heatmap, radial bar and gauge charts | They are not Chart.js's (they are TOAST UI's and Vuetify's); not built here. A gauge without a needle is a half doughnut (`rotation`, `circumference`). |

Where Kite's model is narrower than Chart.js's:

- A stacked bar's least length is not added to the stack.
- After a chart is first laid, a point that moves out of range is not
  marked as skipped.
- The control points of hidden datasets are not compared.
- A time axis's unit for formatting, and a missing time, are not modelled as
  Chart.js's `determineUnitForFormatting` and `Date.now` fallback.
- A radius in pixels for a radial axis is not built.
- Marks with nowhere to come from (a dataset added) appear at once.
- Decimation runs without `parsing: false`.
- A tooltip's numbers approximate ICU's rounding; numbers below 1e-6 are not
  written in exponents.
- A hover keeps nothing once the pointer leaves the area; Chart.js keeps the
  last active marks until the pointer leaves the canvas.

## The survey's rows

### Chart.js (survey/data.md)

| Row | Status |
|---|---|
| Bar chart | Built and tested |
| Stacked bar | Built and tested |
| Floating bars | Built and tested |
| Line chart | Built and tested |
| Stacked area / line | Built and tested |
| Area / fill modes | Built and tested, but `shape` is not built |
| Scatter chart | Built and tested |
| Bubble chart | Built and tested |
| Pie and doughnut | Built and tested |
| Polar area | Built and tested |
| Radar | Built and tested |
| Mixed chart | Built and tested |
| Linear axis | Built and tested |
| Logarithmic axis | Built and tested |
| Category axis | Built and tested |
| Time axis | Built and tested (UTC, the date-fns adapter's formats) |
| Time series axis | Built and tested |
| Radial linear axis | Built and tested |
| Cartesian axes common options | Built and tested, but `position: 'center'` and an axis at a value are not built |
| Tick options | Built and tested |
| Axis styling and titles | Built and tested, but dashed borders and grids are not built |
| Legend | Built and tested; `filter`, `sort` and `onHover` are not built (a click is told as an event) |
| Title | Built and tested |
| Subtitle | Built and tested |
| Tooltip | Built and tested; callbacks and the external tooltip are not built |
| Interaction modes | Built and tested |
| Animations | Chart.js's defaults built and tested; per-property animations and transitions are not built |
| Progressive line animation, with easing; Delay; Drop; Loop | Not built (per-element delays and loops) |
| Bar sample: vertical, horizontal, stacked, stacked groups, floating, border radius | Built and tested |
| Line sample: line, multi-axis, interpolation, point styling, stepped | Built and tested |
| Line sample: segments | Not built (scriptable segments) |
| Line sample: styling | Built, but `borderDash` is not |
| Area sample: line boundaries, datasets, stacked, radar | Built and tested |
| Area sample: draw time | Not built (`drawTime`) |
| Other sample: bubble, combo bar/line, doughnut, multi-series pie, pie, polar area, polar area centre labels, radar, radar skip points, scatter, scatter multi-axis, stacked bar/line | Built and tested |
| Scale sample: suggested min/max, min/max, step size, log, stacked axes, time combo, time line, time max span | Built and tested |
| Scale options: grid, ticks, titles | Built and tested |
| Scale options: centre axes | Not built |
| Legend sample: events | Built: the `legend` event; hover and leave are not told |
| Legend sample: HTML legend | Not built: no page to write into; `laid[…].legend` has the items |
| Legend sample: point style, position, title | Built and tested |
| Title sample: alignment; Subtitle sample | Built and tested |
| Tooltip sample: content | Not built (callbacks) |
| Tooltip sample: HTML (external) | Not built: `charts.tooltip` gives a program the tooltip to draw |
| Tooltip sample: interactions, position | Built and tested |
| Tooltip sample: point style | Not built |
| Scriptable samples: bar, bubble, line, pie, polar, radar | Not built (no functions in options); per-value colours are lists |
| Advanced sample: decimation; Decimation plugin; Decimation / performance guidance | Built and tested (LTTB, min-max, threshold, samples) |
| Advanced sample: derived axis type, derived chart type | Not built |
| Advanced sample: linear gradient, radial gradient | Not built: Lory fills with flat colours |
| Advanced sample: progress bar | Not built (animation callbacks) |
| Advanced sample: programmatic events | Built in effect: `picked`, `tooltip` and `legend_pressed` answer for any place |
| Plugin sample: chart-area border, quadrants | Not built as options: a program draws them with Lory over `laid[…].area` |
| Plugin sample: doughnut empty state | Not built |
| Data structures | Built and tested: numbers, `{x, y, r}` points, `[start, end]` bars, labels; custom parsing keys are not built |
| Responsive and size | Built and tested: laid anew in whatever box it is given |
| Layout | Built and tested (padding, `autoPadding`) |
| Elements | Built and tested (point, line, bar and arc options per dataset) |
| Canvas background | Not an option: the program draws under the chart |
| Device pixel ratio and locale | Pixels per CSS pixel built; numbers in en-US only |
| Colors, fonts, padding, options resolution | Built: CSS colours, sizes and weight, per dataset or per value; one font |
| Chart instance API | Built in Crow's way: the chart is handed each frame; `kept_of`, `forget`, `held_of`, `found`, `picked`, `tooltip`, `legend_pressed` |
| Plugins and extension points; Custom axis / chart type | Not built |
| Updating charts | Built and tested: new data moves the marks from where they stand |
| Accessibility | The arrow keys move through the places and tell them; a canvas has no accessibility tree |

### Vuetify (survey/kits.md)

| Row | Status |
|---|---|
| Sparkline | Built and tested: `trend` and `bar`, filled, smoothed (monotone), interactive (hover and the arrow keys tell the current index). Its gradient, labels and draw-in animation are not built (it animates as Chart.js does). |
| Heatmap (extra) | Not built |
| Pie chart (extra) | Built and tested as Chart.js's pie: the hovered slice moves out (`hoverOffset`), the tooltip and legend are Chart.js's |

### TOAST UI Chart (survey/pickers.md)

| Row | Status |
|---|---|
| Chart: Line | Built as Chart.js's line; zoom is not built |
| Chart: Area | Built (fills, stacked); a percent stack is not built |
| Chart: LineArea | Built: a line and a filled line |
| Chart: Bar | Built: horizontal, stacked, and diverging by negative values |
| Chart: Column | Built |
| Chart: ColumnLine | Built, with a second y axis |
| Chart: Bullet | Not built |
| Chart: BoxPlot | Not built |
| Chart: Treemap | Not built |
| Chart: Heatmap | Not built |
| Chart: Scatter | Built |
| Chart: LineScatter | Built (`showLine`) |
| Chart: Bubble | Built, its radius in pixels as Chart.js's (not the square root of a value) |
| Chart: Pie | Built (inner and outer radius, rotation and circumference) |
| Chart: NestedPie | Built: a doughnut's rings |
| Chart: Radar | Built |
| Chart: RadialBar | Not built |
| Chart: Gauge | Not built (a half doughnut without a needle is) |
| Chart: custom theme / tooltip / live update / export / responsive | Theme colours, live update and responsive built; tooltip templates and export are not |

### The catalog's rows for kite.charts

These are the rows of [README.md](README.md) whose home is `kite.charts`.

| Catalog row | Status |
|---|---|
| Area chart (fill modes, stacked) | Built and tested (not `shape`) |
| Axis ticks, grid lines and titles | Built and tested |
| Bar and column chart (grouped, stacked, floating, horizontal) | Built and tested |
| Box plot | Not built |
| Bubble chart | Built and tested |
| Bullet chart | Not built |
| Chart accessibility | Keys built and tested; no accessibility tree |
| Chart animations (progressive, delay, drop, loop) | Default animations built and tested; progressive, delay, drop and loop are not built |
| Chart instance API and updates | Built and tested in Crow's way |
| Chart layout, responsiveness, elements and canvas | Built and tested |
| Chart legend | Built and tested |
| Chart option resolution, colours and fonts | Built and tested (no scriptable options) |
| Chart plugins and extension points | Not built |
| Chart theme, tooltip, live update, export and responsive | Built and tested, but tooltip templates and export are not |
| Chart title and subtitle | Built and tested |
| Chart tooltip | Built and tested |
| Data decimation and large data | Built and tested |
| Data structures and parsing | Built and tested (no custom parsing keys) |
| Gauge | Not built |
| Gradient and pattern fills | Not built |
| Heatmap | Not built |
| Interaction modes and hit testing | Built and tested |
| Line chart (interpolation, steps, segments, point styles) | Built and tested, but segments are not |
| Linear and category axes (min/max, step, stacked axes) | Built and tested |
| Logarithmic axis | Built and tested |
| Mixed and combo chart | Built and tested |
| Pie, doughnut and nested pie chart | Built and tested |
| Polar area chart | Built and tested |
| Radar chart | Built and tested |
| Radial axis | Built and tested |
| Radial bar chart | Not built |
| Scatter chart | Built and tested |
| Scriptable and indexable options | Indexable built and tested; scriptable not built |
| Sparkline | Built and tested |
| Time and time-series axes | Built and tested |
| Treemap | Not built |

## Licence

Kite reimplements, in Crow, the behaviour of Chart.js (Copyright the Chart.js
contributors, MIT licence, https://www.chartjs.org). No Chart.js source,
prose or data is included: its rules were read from version 4.5.1's
documentation and behaviour and written anew, and its numbers come from
running it (tests/charts/reference.py). Its time scales were run with
chartjs-adapter-date-fns 3.0.0 and date-fns 4.1.0 (MIT), which are not
included either.
