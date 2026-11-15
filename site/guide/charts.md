# Charts

Kite is Lory's charting package. `kite.charts` draws bar, line, scatter,
bubble, pie, doughnut, polar area and radar charts from labels and
datasets, with axes that fit their labels (linear, logarithmic, category,
time and radial), a legend, titles and a tooltip. A chart is a view over
your data, made each frame: put it in a gui tree with `charts.drawn`, or draw
it straight onto the canvas with `charts.shown_at`. It can also be read from
a JSON configuration of `type`, `data` and `options` with `charts.of`.

Between frames Kite keeps what the reader did: the datasets the legend has
hidden, the marks on their way to new values (they grow in as the chart
first shows and move on when the data changes), what the pointer is over,
and the place the arrow keys have reached. The pointer over a mark shows
its tooltip, a press on a legend item hides or shows its dataset, and the
chart tells your program as events of its id: `hover`, `press`, `legend`
and `current`. Long lines are thinned to what the chart's width can show.

Kite also draws financial charts: candles of six kinds, twenty-seven
built-in indicators (moving averages, volume, MACD, RSI, Bollinger bands
and more) in panes below or over the candles, axes that fit their labels
(normal, percentage or logarithmic), a crosshair and tooltips, the high,
low and last price marked, fifteen drawing tools, and a style for every
part in a light or a dark theme. A drag scrolls it and glides on when let
go, the wheel or a pinch zooms, a drag of an axis stretches it, a double
click fits it again, and the arrow keys step a bar at a time.

## Components

| Component | What it does |
|---|---|
| Bar chart | Bars by category, grouped or stacked, upright or across, with floating bars from a start to an end |
| Line chart | Lines through values, straight or curved, filled to their foot or to another line, with gaps |
| Scatter and bubble charts | Points placed by x and y, a bubble sized by its value |
| Pie and doughnut charts | Arcs of a whole, a doughnut with a hole of any size |
| Polar area and radar charts | Values round a centre on a radial axis |
| Sparkline | A small chart with no axes or legend, a line or bars, to sit beside words |
| Legend and tooltip | A legend whose items hide and show datasets; a tooltip at the marks under the pointer |
| Candlestick chart | Solid or hollow candles (or hollow only when rising or falling), OHLC bars or an area over time, kept between frames |
| Indicators | Twenty-seven built in, each in its own pane or over the candles |
| Drawing tools | Lines, rays, segments, price lines and channels, parallel lines, Fibonacci levels, annotations and tags, put down by clicks and dragged by their points |
| Scanner card | A dark card for a scanner: VWAP lines over the candles with a band above, the volume below, a percentage ladder from the previous close and zoom buttons |

## Using it

```crow
use sys
use memory
use lory
use lory.gui
use kite.charts

struct Page [said]

fn sales[]
    ch = charts.chart_of['sales', 'bar', ['Jan', 'Feb', 'Mar', 'Apr']]
    ch = charts.with_set[ch, charts.dataset['', 'This year', [65.0, 59.0, 80.0, 81.0]]]
    charts.with_set[ch, charts.dataset['line', 'Last year', [28.0, 48.0, 40.0, 19.0]]]

fn draw[frame]
    a = recall['page', Page['Press a bar.']]
    c = lory.begin[frame]
    tree = gui.panel[[gui.heading['Sales'], charts.drawn[sales[], 0.0, 280.0], gui.note[a.said]]]
    shown = gui.show_at[c, tree, 24.0, 24.0, 560.0, gui.light[]]
    for e in shown.events
        if e.id eq 'sales' and e.act eq 'press'
            a.said = 'Pressed `e.words`.'
    remember['page', a]
    lory.end[shown.canvas]

sys.frames[draw]
```

A candlestick chart is a record kept between frames:

```crow
use sys
use lory
use kite

fn bars[]
    t0 = 1793975400000.0
    kite.bars[[t0, t0 + 60000.0, t0 + 120000.0], [100.0, 101.0, 100.5], [101.5, 102.0, 101.0], [99.5, 100.5, 99.0], [101.0, 100.5, 100.0], [1200.0, 900.0, 1500.0]]

fn draw[frame]
    c = lory.begin[frame]
    c = lory.clear[c, lory.white[]]
    k = kite.chart['prices']
    if kite.count[k] eq 0
        k = kite.data[k, bars[]]
        k = kite.indicator[k, 'MA', [], 'candle_pane']
        k = kite.indicator[k, 'VOL', [], '']
    k = kite.update[c, k, 0.0, 0.0, lory.width[c], lory.height[c]]
    c = kite.draw[c, k]
    kite.keep[k]
    lory.end[c]

sys.frames[draw]
```

## In a headset

A chart drawn in a gui tree stands on the page's panel in the room, and the
controller's ray points at its marks and presses its legend as the pointer
does. A wall of charts can also be drawn in the room itself, each chart's
bars in depth.

## Try it

- [Open the charts gallery](../../examples/charts/)
- [Open the candlestick chart](../../examples/kite/)
- [Open the scanner card](../../examples/scanner/)
- [Open a year of minute bars](../../examples/chart/)
