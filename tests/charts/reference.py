"""Kite's charts held to Chart.js's own answers.

Runs Chart.js 4.5.1 (and, for its time scales, chartjs-adapter-date-fns
3.0.0 over date-fns 4.1.0) in headless Chrome on fixed data and options,
and reads back what Chart.js laid out: each chart's area; each scale's
box, ticks, labels and the pixel of each tick; each element's geometry
(a bar's x, y, base, width and height, a point's x and y and its curve's
control points, an arc's centre, angles and radii); the boxes of the
legend, title and subtitle; which elements each interaction mode picks
at fixed pointer positions; the tooltip it places there; what a click on
the legend hides; elements part way through animations; the easings;
colours part way between two; and long lines decimated. It writes them
beside this script as reference.json, with the width the browser measured
for every text it laid, which reference.co holds Kite to, number for
number.

    python3 -I tests/charts/reference.py <node_modules>

The argument is a node_modules folder holding the three packages at those
versions, installed with

    npm install --prefix <scratch>/ref chart.js@4.5.1 chartjs-adapter-date-fns@3.0.0 date-fns@4.1.0

Nothing is downloaded. Times are UTC: Chrome runs with TZ=UTC.
"""
import calendar
import json
import math
import os
import re
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
VERSIONS = {'chart.js': '4.5.1', 'chartjs-adapter-date-fns': '3.0.0', 'date-fns': '4.1.0'}

MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']


def utc(y, m, d, h=0, mi=0):
    """A time in milliseconds since 1970, UTC."""
    return calendar.timegm((y, m, d, h, mi, 0, 0, 0, 0)) * 1000


def walk(n, seed, scale=10.0, base=50.0):
    """A made-up series: the same every run."""
    out = []
    for i in range(n):
        x = float(i)
        out.append(round(base + math.sin(x * 0.7 + seed) * scale + math.sin(x * 2.3 + seed * 3) * scale * 0.4, 1))
    return out


def case(name, config, width=640, height=400, click=None, tips=True):
    return {'name': name, 'width': width, 'height': height, 'config': config, 'click': click, 'tips': tips}


def cartesian():
    """Bars, lines, scatter, bubbles and their scales."""
    t0 = utc(2026, 1, 5)
    day = 86400000
    out = [
        case('bar', {'type': 'bar', 'data': {'labels': MONTHS, 'datasets': [
            {'label': 'Sales', 'data': [65, 59, 80, 81, 56, 55, 40]},
            {'label': 'Costs', 'data': [28, 48, 40, 19, 86, 27, 90]}]}}, click=0),
        case('bar_negative', {'type': 'bar', 'data': {'labels': MONTHS, 'datasets': [
            {'label': 'Change', 'data': [12, -19, 3, 5, -2, 3, 9]}]},
            'options': {'plugins': {'title': {'display': True, 'text': 'Bars below zero'},
                                    'legend': {'position': 'bottom'}}}}, 480, 320),
        case('bar_horizontal', {'type': 'bar', 'data': {'labels': MONTHS[:5], 'datasets': [
            {'label': 'East', 'data': [65, 59, 80, 81, 56], 'borderWidth': 2},
            {'label': 'West', 'data': [-28, 48, 40, -19, 86], 'borderWidth': 2}]},
            'options': {'indexAxis': 'y', 'plugins': {'legend': {'position': 'right'}}}}, 600, 360, click=1),
        case('bar_stacked', {'type': 'bar', 'data': {'labels': MONTHS[:5], 'datasets': [
            {'label': 'A', 'data': [10, -20, 30, 40, -10]},
            {'label': 'B', 'data': [20, 25, -15, 10, 30]},
            {'label': 'C', 'data': [5, 5, 5, -30, 10]}]},
            'options': {'scales': {'x': {'stacked': True}, 'y': {'stacked': True}},
                        'plugins': {'title': {'display': True, 'text': 'Stacked'}}}}, 560, 380, click=1),
        case('bar_groups', {'type': 'bar', 'data': {'labels': MONTHS[:4], 'datasets': [
            {'label': 'A', 'data': [10, 20, 30, 40], 'stack': 'one', 'borderWidth': 2, 'borderRadius': 6},
            {'label': 'B', 'data': [15, -10, 25, 5], 'stack': 'one', 'borderWidth': 2, 'borderRadius': 6, 'borderSkipped': 'middle'},
            {'label': 'C', 'data': [30, 10, -20, 15], 'stack': 'two', 'borderRadius': 4, 'borderSkipped': False}]},
            'options': {'scales': {'x': {'stacked': True}, 'y': {'stacked': True}}}}, 560, 380),
        case('bar_floating', {'type': 'bar', 'data': {'labels': MONTHS[:5], 'datasets': [
            {'label': 'Range', 'data': [[-10, 20], [5, 30], [-20, -5], [15, 40], [0, 10]]},
            {'label': 'Other', 'data': [[10, 25], [-5, 15], [0, 20], [-30, -10], [5, 35]]}]}}, 520, 360),
        case('bar_thickness', {'type': 'bar', 'data': {'labels': MONTHS[:5], 'datasets': [
            {'label': 'Thin', 'data': [12, 19, 3, 5, 2], 'barThickness': 16},
            {'label': 'Capped', 'data': [8, 11, 7, 0, 9], 'maxBarThickness': 24, 'minBarLength': 6},
            {'label': 'Gaps', 'data': [5, None, 9, 14, None], 'skipNull': True, 'barPercentage': 0.6,
             'categoryPercentage': 1.0}]}}, 560, 360),
        case('bar_ungrouped', {'type': 'bar', 'data': {'labels': MONTHS[:5], 'datasets': [
            {'label': 'Back', 'data': [12, 19, 3, 5, 2], 'grouped': False, 'barPercentage': 1.0},
            {'label': 'Front', 'data': [8, 11, 7, 4, 9], 'grouped': False, 'barPercentage': 0.5}]}}, 520, 340),
        case('line', {'type': 'line', 'data': {'labels': MONTHS, 'datasets': [
            {'label': 'Curve', 'data': [65, 59, 80, 81, 56, 55, 40], 'tension': 0.4, 'pointStyle': 'rectRot',
             'pointRadius': 5, 'fill': 'origin'},
            {'label': 'Steps', 'data': [28, 48, 40, 19, 86, 27, 90], 'stepped': 'before'},
            {'label': 'Flat', 'data': [10, 15, 12, 18, 14, 20, 16], 'fill': 'end', 'pointRadius': 0}]}}, click=1),
        case('line_gaps', {'type': 'line', 'data': {'labels': MONTHS, 'datasets': [
            {'label': 'Broken', 'data': [10, 20, None, 40, 35, None, 50]},
            {'label': 'Spanned', 'data': [15, None, 25, 30, None, 45, 40], 'spanGaps': True, 'tension': 0.3},
            {'label': 'Monotone', 'data': [5, 25, 15, 60, 20, 70, 30], 'cubicInterpolationMode': 'monotone'}]},
            'options': {'interaction': {'mode': 'index', 'intersect': False}}}),
        case('line_stacked', {'type': 'line', 'data': {'labels': MONTHS, 'datasets': [
            {'label': 'Low', 'data': [10, 12, 8, 14, 11, 9, 13], 'fill': 'origin'},
            {'label': 'Mid', 'data': [5, 8, 6, 9, 7, 8, 6], 'fill': '-1'},
            {'label': 'High', 'data': [3, 4, 2, 5, 3, 4, 2], 'fill': '-1'}]},
            'options': {'scales': {'y': {'stacked': True}}}}, 600, 360, click=0),
        case('scatter', {'type': 'scatter', 'data': {'datasets': [
            {'label': 'Points', 'data': [{'x': -10, 'y': 0}, {'x': 0, 'y': 10}, {'x': 10, 'y': 5}, {'x': 0.5, 'y': 5.5},
                                         {'x': 7, 'y': -3}, {'x': -4, 'y': 8}]},
            {'label': 'Joined', 'data': [{'x': -8, 'y': -5}, {'x': -2, 'y': 2}, {'x': 3, 'y': -1}, {'x': 9, 'y': 9}],
             'showLine': True, 'pointStyle': 'triangle'}]},
            'options': {'plugins': {'tooltip': {'position': 'nearest'}}}}, 520, 420),
        case('bubble', {'type': 'bubble', 'data': {'datasets': [
            {'label': 'Big', 'data': [{'x': 20, 'y': 30, 'r': 15}, {'x': 40, 'y': 10, 'r': 10}, {'x': 25, 'y': 22, 'r': 5}]},
            {'label': 'Small', 'data': [{'x': 10, 'y': 15, 'r': 4}, {'x': 32, 'y': 26, 'r': 8}]}]}}, 520, 400),
        case('mixed', {'type': 'bar', 'data': {'labels': MONTHS[:6], 'datasets': [
            {'label': 'Bars', 'data': [10, 20, 30, 40, 35, 25], 'order': 2},
            {'label': 'Line', 'data': [15, 25, 20, 45, 30, 35], 'type': 'line', 'order': 1}]}}, 560, 360, click=1),
        case('lin_min_max', {'type': 'line', 'data': {'labels': MONTHS, 'datasets': [{'label': 'A', 'data': walk(7, 1)}]},
                             'options': {'scales': {'y': {'min': -50, 'max': 150}}}}, 420, 300),
        case('lin_suggested', {'type': 'line', 'data': {'labels': MONTHS, 'datasets': [{'label': 'A', 'data': walk(7, 2)}]},
                               'options': {'scales': {'y': {'suggestedMin': 0, 'suggestedMax': 120}}}}, 420, 300),
        case('lin_grace', {'type': 'bar', 'data': {'labels': MONTHS, 'datasets': [{'label': 'A', 'data': walk(7, 3)}]},
                           'options': {'scales': {'y': {'grace': '10%', 'beginAtZero': False}}}}, 420, 300),
        case('lin_step', {'type': 'line', 'data': {'labels': MONTHS, 'datasets': [{'label': 'A', 'data': walk(7, 4)}]},
                          'options': {'scales': {'y': {'ticks': {'stepSize': 7}}}}}, 420, 300),
        case('lin_limit', {'type': 'line', 'data': {'labels': MONTHS, 'datasets': [{'label': 'A', 'data': walk(7, 5, 400, 1000)}]},
                           'options': {'scales': {'y': {'ticks': {'maxTicksLimit': 4}}}}}, 420, 300),
        case('lin_precision', {'type': 'line', 'data': {'labels': MONTHS[:4], 'datasets': [{'label': 'A', 'data': [1, 2, 3, 2]}]},
                               'options': {'scales': {'y': {'ticks': {'precision': 0}}}}}, 420, 400),
        case('lin_count', {'type': 'line', 'data': {'labels': MONTHS, 'datasets': [{'label': 'A', 'data': walk(7, 6, 0.05, 0.2)}]},
                           'options': {'scales': {'y': {'ticks': {'count': 6}}}}}, 420, 300),
        case('lin_reverse', {'type': 'bar', 'data': {'labels': MONTHS, 'datasets': [{'label': 'A', 'data': walk(7, 7)}]},
                             'options': {'scales': {'y': {'reverse': True}, 'x': {'reverse': True}}}}, 420, 300),
        case('lin_bounds', {'type': 'line', 'data': {'labels': MONTHS, 'datasets': [{'label': 'A', 'data': walk(7, 8, 3, 1234.5)}]},
                            'options': {'scales': {'y': {'bounds': 'data'}}}}, 420, 300),
        case('lin_flat', {'type': 'line', 'data': {'labels': MONTHS[:3], 'datasets': [{'label': 'A', 'data': [5, 5, 5]}]}}, 360, 260),
        case('log', {'type': 'line', 'data': {'labels': MONTHS, 'datasets': [
            {'label': 'Growth', 'data': [1, 10, 100, 1000, 10000, 100000, 3]}]},
            'options': {'scales': {'y': {'type': 'logarithmic'}}}}, 480, 420),
        case('log_small', {'type': 'bar', 'data': {'labels': MONTHS[:5], 'datasets': [
            {'label': 'Small', 'data': [0.02, 0.5, 3, 7.5, 40]}]},
            'options': {'scales': {'y': {'type': 'logarithmic'}}}}, 420, 360),
        case('category_range', {'type': 'line', 'data': {'labels': MONTHS, 'datasets': [{'label': 'A', 'data': walk(7, 9)}]},
                                'options': {'scales': {'x': {'min': 'Feb', 'max': 'Jun', 'offset': True}}}}, 480, 300),
        case('multi_axes', {'type': 'line', 'data': {'labels': MONTHS, 'datasets': [
            {'label': 'Left', 'data': walk(7, 10), 'yAxisID': 'y'},
            {'label': 'Right', 'data': walk(7, 11, 400, 900), 'yAxisID': 'y1'}]},
            'options': {'scales': {'y': {'type': 'linear', 'position': 'left'},
                                   'y1': {'type': 'linear', 'position': 'right', 'grid': {'drawOnChartArea': False}}}}}, 640, 360, click=1),
        case('stacked_scales', {'type': 'line', 'data': {'labels': MONTHS, 'datasets': [
            {'label': 'Level', 'data': walk(7, 12)},
            {'label': 'Switch', 'data': ['ON', 'ON', 'OFF', 'ON', 'OFF', 'OFF', 'ON'], 'yAxisID': 'y2', 'stepped': True}]},
            'options': {'scales': {
                'y': {'type': 'linear', 'position': 'left', 'stack': 'demo', 'stackWeight': 2, 'offset': True},
                'y2': {'type': 'category', 'labels': ['ON', 'OFF'], 'offset': True, 'position': 'left', 'stack': 'demo',
                       'stackWeight': 1}}}}, 600, 420),
        case('axis_titles', {'type': 'bar', 'data': {'labels': ['January 2026', 'February 2026', 'March 2026', 'April 2026',
                                                                'May 2026', 'June 2026', 'July 2026', 'August 2026',
                                                                'September 2026', 'October 2026', 'November 2026',
                                                                'December 2026'],
                                                     'datasets': [{'label': 'Sales', 'data': walk(12, 13, 20, 60)}]},
                             'options': {'scales': {'x': {'title': {'display': True, 'text': 'Month'}},
                                                    'y': {'title': {'display': True, 'text': 'Sales'}}}}}, 360, 320),
        case('ticks_skip', {'type': 'line', 'data': {'labels': ['P%d' % i for i in range(100)],
                                                     'datasets': [{'label': 'Long', 'data': walk(100, 14), 'pointRadius': 0}]}},
             500, 300),
        case('legend_left', {'type': 'bar', 'data': {'labels': MONTHS[:3], 'datasets': [
            {'label': 'Dataset number %d' % i, 'data': walk(3, 15 + i)} for i in range(9)]},
            'options': {'layout': {'padding': {'left': 20, 'right': 10, 'top': 5, 'bottom': 15}},
                        'plugins': {'legend': {'position': 'left', 'align': 'start'},
                                    'title': {'display': True, 'text': 'Many datasets'},
                                    'subtitle': {'display': True, 'text': 'and a subtitle under the title'}}}}, 640, 300,
             click=4),
        case('legend_points', {'type': 'line', 'data': {'labels': MONTHS, 'datasets': [
            {'label': 'One', 'data': walk(7, 20), 'pointStyle': 'star'},
            {'label': 'Two', 'data': walk(7, 21), 'pointStyle': 'triangle'},
            {'label': 'Three', 'data': walk(7, 22)}]},
            'options': {'plugins': {'legend': {'position': 'bottom', 'align': 'end',
                                               'labels': {'usePointStyle': True, 'padding': 20, 'font': {'size': 14}}},
                                    'subtitle': {'display': True, 'text': 'Subtitle', 'position': 'bottom'}}}}, 480, 320),
        case('time_days', {'type': 'line', 'data': {'datasets': [
            {'label': 'Daily', 'data': [{'x': t0 + i * day, 'y': v} for i, v in enumerate(walk(30, 23))]}]},
            'options': {'scales': {'x': {'type': 'time'}}}}, 640, 320),
        case('time_hours', {'type': 'line', 'data': {'datasets': [
            {'label': 'Hourly', 'data': [{'x': t0 + i * 3600000, 'y': v} for i, v in enumerate(walk(36, 24))]}]},
            'options': {'scales': {'x': {'type': 'time'}}}}, 640, 320),
        case('time_months', {'type': 'line', 'data': {'datasets': [
            {'label': 'Monthly', 'data': [{'x': t0 + i * 28 * day, 'y': v} for i, v in enumerate(walk(14, 25))]}]},
            'options': {'scales': {'x': {'type': 'time', 'time': {'unit': 'month'}, 'ticks': {'stepSize': 2}}}}}, 640, 320),
        case('time_round', {'type': 'line', 'data': {'datasets': [
            {'label': 'Rounded', 'data': [{'x': t0 + i * 36 * 3600000 + 5 * 3600000, 'y': v} for i, v in enumerate(walk(10, 26))]}]},
            'options': {'scales': {'x': {'type': 'time', 'time': {'unit': 'day', 'round': 'day',
                                                                   'displayFormats': {'day': 'yyyy-MM-dd'}},
                                         'ticks': {'source': 'data'}}}}}, 640, 320),
        case('time_weeks', {'type': 'line', 'data': {'datasets': [
            {'label': 'Weekly', 'data': [{'x': t0 + i * 3 * day, 'y': v} for i, v in enumerate(walk(30, 27))]}]},
            'options': {'scales': {'x': {'type': 'time', 'time': {'unit': 'week'}}}}}, 640, 320),
        case('time_years', {'type': 'line', 'data': {'datasets': [
            {'label': 'Yearly', 'data': [{'x': t0 + i * 61 * day, 'y': v} for i, v in enumerate(walk(36, 28))]}]},
            'options': {'scales': {'x': {'type': 'time'}}}}, 640, 320),
        case('time_bars', {'type': 'bar', 'data': {'datasets': [
            {'label': 'Days', 'data': [{'x': t0 + i * day, 'y': v} for i, v in enumerate(walk(7, 29))]}]},
            'options': {'scales': {'x': {'type': 'time', 'time': {'unit': 'day'}}}}}, 560, 320),
        case('timeseries', {'type': 'line', 'data': {'datasets': [
            {'label': 'Irregular', 'data': [{'x': t0 + d * day, 'y': v} for d, v in
                                            zip([0, 1, 2, 5, 6, 7, 8, 9, 12, 13, 14, 20], walk(12, 30))]}]},
            'options': {'scales': {'x': {'type': 'timeseries'}}}}, 640, 320),
    ]
    return out


def radial():
    """Pies, doughnuts, polar areas and radars."""
    colours = ['rgb(255, 99, 132)', 'rgb(54, 162, 235)', 'rgb(255, 205, 86)', 'rgb(75, 192, 192)']
    return [
        case('pie', {'type': 'pie', 'data': {'labels': ['Red', 'Blue', 'Yellow', 'Green'], 'datasets': [
            {'label': 'Votes', 'data': [300, 50, 100, 40], 'backgroundColor': colours}]}}, 480, 400, click=1),
        case('doughnut', {'type': 'doughnut', 'data': {'labels': ['Red', 'Blue', 'Yellow', 'Green'], 'datasets': [
            {'label': 'Outer', 'data': [300, 50, 100, 40], 'offset': [0, 10, 0, 0], 'backgroundColor': colours},
            {'label': 'Inner', 'data': [20, 30, 40, 10], 'weight': 2, 'backgroundColor': colours}]}}, 480, 400),
        case('doughnut_half', {'type': 'doughnut', 'data': {'labels': ['A', 'B', 'C'], 'datasets': [
            {'label': 'Half', 'data': [5, 3, 2]}]},
            'options': {'rotation': -90, 'circumference': 180, 'cutout': '70%',
                        'plugins': {'legend': {'position': 'right'}}}}, 520, 360, click=0),
        case('polar', {'type': 'polarArea', 'data': {'labels': ['Red', 'Green', 'Yellow', 'Grey', 'Blue'], 'datasets': [
            {'label': 'Polar', 'data': [11, 16, 7, 3, 14]}]}}, 480, 420, click=3),
        case('radar', {'type': 'radar', 'data': {'labels': ['Eating', 'Drinking', 'Sleeping', 'Designing', 'Coding',
                                                            'Cycling', 'Running'], 'datasets': [
            {'label': 'First', 'data': [65, 59, 90, 81, 56, 55, 40], 'fill': True},
            {'label': 'Second', 'data': [28, 48, 40, 19, 96, 27, 100]}]}}, 520, 460, click=0),
    ]


PAGE = '''<!doctype html><html><body>
<pre id="out">pending</pre>
<script src="file://%(chart)s"></script>
<script src="file://%(adapter)s"></script>
<script>
const cases = %(cases)s;
const widths = {};
const measured = CanvasRenderingContext2D.prototype.measureText;
CanvasRenderingContext2D.prototype.measureText = function (t) {
  const m = measured.call(this, t);
  widths[this.font + '|' + t] = m.width;
  return m;
};
const num = (v) => (typeof v === 'number' && isFinite(v)) ? v : null;
const TitleBlock = Chart.Title._element;

function scaleOf(s) {
  const o = {id: s.id, type: s.type, axis: s.axis, position: s.position,
    box: [s.left, s.top, s.right, s.bottom, s.width, s.height],
    rotation: num(s.labelRotation), min: num(s.min), max: num(s.max),
    padding: [s.paddingLeft || 0, s.paddingTop || 0, s.paddingRight || 0, s.paddingBottom || 0],
    ticks: s.ticks.map((t, i) => [t.value, t.label === undefined ? null : t.label, num(s.getPixelForTick(i))])};
  if (s.type === 'radialLinear') {
    o.center = [s.xCenter, s.yCenter, s.drawingArea];
    o.point_labels = s._pointLabels;
    o.label_items = (s._pointLabelItems || []).map((p) => [p.x, p.y, p.left, p.top, p.right, p.bottom, p.textAlign, p.visible]);
    o.ticks = s.ticks.map((t) => [t.value, t.label, num(s.getDistanceFromCenterForValue(t.value))]);
  }
  if (s.type === 'time' || s.type === 'timeseries') {
    o.unit = s._unit;
    o.major_unit = s._majorUnit || '';
    o.offsets = [s._offsets.start, s._offsets.end];
    o.majors = s.ticks.map((t) => !!t.major);
  }
  return o;
}

function elementOf(el) {
  const id = el.constructor.id;
  if (id === 'bar') {
    const k = el.borderSkipped || {};
    const skipped = ['top', 'right', 'bottom', 'left'].filter((e) => k[e]).map((e) => e[0]).join('');
    return ['bar', el.x, el.y, el.base, el.width, el.height, !!el.horizontal, !!el.enableBorderRadius, skipped];
  }
  if (id === 'point') {
    return ['point', num(el.x), num(el.y), !!el.skip, num(el.cp1x), num(el.cp1y), num(el.cp2x), num(el.cp2y),
            el.options ? num(el.options.radius) : null, !!el.stop];
  }
  if (id === 'arc') {
    return ['arc', el.x, el.y, el.startAngle, el.endAngle, el.innerRadius, el.outerRadius, el.circumference];
  }
  return [id];
}

function boxOf(b) {
  return b ? [b.left, b.top, b.width, b.height] : null;
}

function snap(ch) {
  const a = ch.chartArea;
  const titles = ch.boxes.filter((b) => b instanceof TitleBlock);
  const sub = titles.filter((b) => b !== ch.titleBlock)[0];
  const lg = ch.legend;
  return {
    area: [a.left, a.top, a.right, a.bottom],
    boxes: ch.boxes.map((b) => b === lg ? 'legend' : b === ch.titleBlock ? 'title' : b === sub ? 'subtitle' : b.id),
    scales: Object.values(ch.scales).map(scaleOf),
    legend: lg ? {box: boxOf(lg), hits: lg.legendHitBoxes.map((h) => [h.left, h.top, h.width, h.height]),
                  items: lg.legendItems.map((it) => [it.text, !!it.hidden, num(it.datasetIndex), num(it.index)])} : null,
    title: ch.titleBlock && ch.titleBlock.options.display ? boxOf(ch.titleBlock) : null,
    subtitle: sub && sub.options.display ? boxOf(sub) : null,
    sets: ch.data.datasets.map((d, i) => {
      const m = ch.getDatasetMeta(i);
      return {visible: m.visible, type: m.type, elements: m.data.map(elementOf)};
    }),
  };
}

function probesOf(ch) {
  const pts = [];
  const a = ch.chartArea;
  const metas = ch.getSortedVisibleDatasetMetas();
  if (metas.length) {
    const els = metas[0].data;
    for (const k of [0, 1, 2]) {
      if (els[k] && !els[k].skip) {
        const c = els[k].getCenterPoint();
        pts.push([c.x, c.y]);
        pts.push([c.x + 3, c.y - 7]);
      }
    }
  }
  pts.push([(a.left + a.right) / 2, (a.top + a.bottom) / 2]);
  pts.push([a.left + 5, a.bottom - 5]);
  pts.push([a.right - 2, a.top + 2]);
  pts.push([a.right + 3, a.top - 3]);
  return pts.map((p) => [Math.round(p[0] * 4) / 4, Math.round(p[1] * 4) / 4]);
}

function picksAt(ch, x, y, radial) {
  const e = {type: 'mousemove', native: {type: 'mousemove'}, x, y};
  const out = [];
  const axes = radial ? ['x', 'y', 'xy', 'r'] : ['x', 'y', 'xy'];
  for (const mode of ['index', 'dataset', 'nearest', 'point', 'x', 'y']) {
    const ways = mode === 'point' ? [true] : [true, false];
    const theirs = mode === 'x' ? ['x'] : mode === 'y' ? ['y'] : axes;
    for (const intersect of ways) {
      for (const axis of theirs) {
        const got = ch.getElementsAtEventForMode(e, mode, {intersect, axis}, false);
        out.push([mode, intersect, axis, got.map((g) => [g.datasetIndex, g.index])]);
      }
    }
  }
  return out;
}

function tipAt(ch, x, y) {
  ch._eventHandler({type: 'mousemove', native: {type: 'mousemove'}, x, y});
  const t = ch.tooltip;
  const out = {at: [x, y], shown: !!(t.opacity > 0 && t._active.length),
               active: ch.getActiveElements().map((e) => [e.datasetIndex, e.index])};
  if (out.shown) {
    Object.assign(out, {box: [t.x, t.y, t.width, t.height], caret: [t.caretX, t.caretY], align: [t.xAlign, t.yAlign],
                        title: t.title, body: t.body.map((b) => b.lines),
                        points: t.dataPoints.map((p) => [p.datasetIndex, p.dataIndex])});
  }
  ch._eventHandler({type: 'mouseout', native: {type: 'mouseout'}, x: -100, y: -100});
  return out;
}

function staticCase(c) {
  const canvas = document.createElement('canvas');
  canvas.width = c.width;
  canvas.height = c.height;
  document.body.appendChild(canvas);
  const cfg = JSON.parse(JSON.stringify(c.config));
  cfg.options = Object.assign({responsive: false, animation: false, devicePixelRatio: 1}, cfg.options || {});
  const ch = new Chart(canvas, cfg);
  const radial = ['pie', 'doughnut', 'polarArea', 'radar'].includes(cfg.type);
  const out = {name: c.name, width: c.width, height: c.height, config: c.config, laid: snap(ch)};
  out.probes = probesOf(ch).map(([x, y]) => ({at: [x, y], picks: picksAt(ch, x, y, radial)}));
  out.tips = c.tips ? out.probes.slice(0, 8).map((p) => tipAt(ch, p.at[0], p.at[1])) : [];
  if (c.click !== null && ch.legend && ch.legend.legendHitBoxes[c.click]) {
    const h = ch.legend.legendHitBoxes[c.click];
    const x = Math.round((h.left + h.width / 2) * 4) / 4;
    const y = Math.round((h.top + h.height / 2) * 4) / 4;
    ch._eventHandler({type: 'click', native: {type: 'click'}, x, y});
    out.clicked = {at: [x, y], item: c.click, laid: snap(ch)};
  }
  ch.destroy();
  canvas.remove();
  return out;
}

const EASINGS = Object.keys(Chart.helpers.easingEffects);
function easings() {
  const out = {};
  for (const name of EASINGS) {
    const f = Chart.helpers.easingEffects[name];
    out[name] = [];
    for (let i = 0; i <= 20; i++) out[name].push(f(i / 20));
  }
  return out;
}

function colours() {
  const pairs = [['#ff0000', '#0000ff'], ['rgba(54, 162, 235, 0.5)', 'rgb(255, 99, 132)'],
                 ['rgba(0, 0, 0, 0)', '#36a2eb'], ['#123456', '#abcdef'], ['rgba(255, 0, 0, 0.5)', 'rgba(0, 0, 255, 0.25)']];
  const out = [];
  for (const [from, to] of pairs) {
    for (const f of [0, 0.1, 0.25, 0.5, 0.75, 0.9]) {
      const target = {c: from};
      const an = new Chart.Animation({duration: 1000, easing: 'linear', type: 'color'}, target, 'c', to);
      an.tick(an._start + f * 1000);
      out.push([from, to, f, target.c]);
    }
  }
  return out;
}

let clock = 1000000;
const ANIM_T = [0, 50, 200, 400, 600, 999, 1000, 1500];
function animated() {
  const realNow = Date.now;
  Date.now = () => clock;
  const out = [];
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 320;
  document.body.appendChild(canvas);
  const bars = (ch) => ch.getDatasetMeta(0).data.map((b) => [b.x, b.y, b.base, b.width, b.height, b.options.backgroundColor]);
  const run = (ch, at, read) => ANIM_T.map((t) => {
    clock = at + t;
    Chart.animator._update(clock);
    return [t, read(ch)];
  });
  // bars grow from their base on load, then move on an update, then are
  // sent somewhere else part way through it
  clock = 1000000;
  let cfg = {type: 'bar', data: {labels: MONTHS, datasets: [{label: 'A', data: [65, 59, 80, 81, 56, 55, 40],
             backgroundColor: 'rgba(54, 162, 235, 0.5)'}]}, options: {responsive: false, devicePixelRatio: 1}};
  let ch = new Chart(canvas, cfg);
  out.push({name: 'bar_load', config: cfg, start: 1000000, samples: run(ch, 1000000, bars)});
  clock = 1010000;
  Chart.animator._update(clock);
  ch.data.datasets[0].data = [20, 70, 50, 30, 90, 10, 60];
  ch.data.datasets[0].backgroundColor = 'rgba(255, 99, 132, 1)';
  ch.update();
  out.push({name: 'bar_update', data: [20, 70, 50, 30, 90, 10, 60], color: 'rgba(255, 99, 132, 1)', start: 1010000,
            samples: run(ch, 1010000, bars)});
  clock = 1020000;
  Chart.animator._update(clock);
  ch.data.datasets[0].data = [65, 59, 80, 81, 56, 55, 40];
  ch.update();
  clock = 1020300;
  Chart.animator._update(clock);
  ch.data.datasets[0].data = [10, 10, 10, 10, 10, 10, 10];
  ch.update();
  out.push({name: 'bar_retarget', data: [[65, 59, 80, 81, 56, 55, 40], [10, 10, 10, 10, 10, 10, 10]], start: 1020000,
            at: 1020300, samples: run(ch, 1020300, bars)});
  ch.destroy();
  // a doughnut's arcs turn out from its start angle
  clock = 2000000;
  cfg = {type: 'doughnut', data: {labels: ['A', 'B', 'C'], datasets: [{label: 'D', data: [5, 3, 2]}]},
         options: {responsive: false, devicePixelRatio: 1}};
  ch = new Chart(canvas, cfg);
  out.push({name: 'doughnut_load', config: cfg, start: 2000000, samples: run(ch, 2000000,
    (c) => c.getDatasetMeta(0).data.map((a) => [a.startAngle, a.endAngle, a.circumference, a.innerRadius, a.outerRadius]))});
  ch.destroy();
  // a polar area's arcs turn out and grow
  clock = 3000000;
  cfg = {type: 'polarArea', data: {labels: ['A', 'B', 'C'], datasets: [{label: 'P', data: [5, 3, 2]}]},
         options: {responsive: false, devicePixelRatio: 1}};
  ch = new Chart(canvas, cfg);
  out.push({name: 'polar_load', config: cfg, start: 3000000, samples: run(ch, 3000000,
    (c) => c.getDatasetMeta(0).data.map((a) => [a.startAngle, a.endAngle, a.innerRadius, a.outerRadius]))});
  ch.destroy();
  // a line's points rise from the base
  clock = 4000000;
  cfg = {type: 'line', data: {labels: MONTHS, datasets: [{label: 'L', data: [65, 59, 80, 81, 56, 55, 40]}]},
         options: {responsive: false, devicePixelRatio: 1}};
  ch = new Chart(canvas, cfg);
  out.push({name: 'line_load', config: cfg, start: 4000000, samples: run(ch, 4000000,
    (c) => c.getDatasetMeta(0).data.map((p) => [p.x, p.y]))});
  ch.destroy();
  canvas.remove();
  Date.now = realNow;
  return out;
}

function decimated() {
  const pts = [];
  for (let i = 0; i < 2000; i++) {
    pts.push({x: i, y: Math.round(Math.sin(i * 0.05) * 1000 + Math.sin(i * 1.7) * 300) / 10});
  }
  const out = [];
  for (const [algorithm, samples] of [['lttb', 100], ['min-max', null]]) {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 240;
    document.body.appendChild(canvas);
    const options = {enabled: true, algorithm};
    if (samples) options.samples = samples;
    const cfg = {type: 'line', data: {datasets: [{label: 'Long', data: pts, borderWidth: 1, pointRadius: 0}]},
                 options: {parsing: false, responsive: false, animation: false, devicePixelRatio: 1,
                           scales: {x: {type: 'linear'}}, plugins: {decimation: options}}};
    const ch = new Chart(canvas, cfg);
    const kept = ch.data.datasets[0].data.map((p) => [p.x, p.y]);
    out.push({name: algorithm, width: 400, samples, kept, laid: snap(ch)});
    ch.destroy();
    canvas.remove();
  }
  return {points: pts.map((p) => [p.x, p.y]), runs: out};
}

const MONTHS = %(months)s;
const result = {versions: %(versions)s, defaults: {font: Chart.defaults.font, color: Chart.defaults.color},
  cases: cases.map(staticCase), easings: easings(), colours: colours(), animations: animated(),
  decimation: decimated()};
result.widths = widths;
document.getElementById('out').textContent = JSON.stringify(result);
</script></body></html>'''


def font_key(font):
    """'bold 12px "Helvetica Neue", …' as Kite names it: 'b12', or '12'."""
    size = re.search(r'(\d+(?:\.\d+)?)px', font).group(1)
    bold = 'b' if re.search(r'\bbold\b|\b[6-9]00\b', font) else ''
    return bold + size


def rgba_of(text):
    """A CSS colour as its four numbers: red, green, blue (0 to 255) and
    alpha (0 to 1)."""
    text = text.strip()
    if text == 'transparent':
        return [0, 0, 0, 0]
    if text.startswith('#'):
        h = text[1:]
        if len(h) in (3, 4):
            h = ''.join(c * 2 for c in h)
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        a = int(h[6:8], 16) / 255.0 if len(h) == 8 else 1.0
        return [r, g, b, a]
    parts = [float(p) for p in re.findall(r'[-\d.]+', text)]
    return [parts[0], parts[1], parts[2], parts[3] if len(parts) > 3 else 1.0]


def main():
    lib = os.path.expanduser(sys.argv[1])
    chart = os.path.join(lib, 'chart.js', 'dist', 'chart.umd.js')
    adapter = os.path.join(lib, 'chartjs-adapter-date-fns', 'dist', 'chartjs-adapter-date-fns.bundle.js')
    for name, version in VERSIONS.items():
        with open(os.path.join(lib, name, 'package.json')) as f:
            found = json.load(f)['version']
        if found != version:
            sys.exit('%s is %s here; this reference is of %s' % (name, found, version))
    cases = cartesian() + radial()
    page = PAGE % {'chart': chart, 'adapter': adapter, 'cases': json.dumps(cases), 'months': json.dumps(MONTHS),
                   'versions': json.dumps(VERSIONS)}
    with tempfile.TemporaryDirectory() as tmp:
        html = os.path.join(tmp, 'ref.html')
        with open(html, 'w') as f:
            f.write(page)
        env = dict(os.environ, TZ='UTC')
        dom = subprocess.run([CHROME, '--headless=new', '--allow-file-access-from-files', '--no-first-run',
                              '--no-default-browser-check', '--disable-extensions',
                              '--user-data-dir=' + os.path.join(tmp, 'profile'),
                              '--virtual-time-budget=20000', '--dump-dom', 'file://' + html],
                             capture_output=True, text=True, timeout=600, env=env).stdout
    start = dom.index('<pre id="out">') + len('<pre id="out">')
    text = dom[start:dom.index('</pre>', start)]
    text = text.replace('&quot;', '"').replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&')
    if text.startswith('pending'):
        sys.exit('the page did not finish: ' + text[:200])
    result = json.loads(text)
    widths = {}
    for key, w in result.pop('widths').items():
        font, _, words = key.partition('|')
        widths[font_key(font) + '|' + words] = w
    result['widths'] = widths
    for c in result['colours']:
        c.append(rgba_of(c[3]))
    for run in result['animations']:
        for t, rows in run['samples']:
            for row in rows:
                if len(row) == 6 and isinstance(row[5], str):
                    row[5] = rgba_of(row[5])
    with open(os.path.join(HERE, 'reference.json'), 'w') as f:
        json.dump(result, f, separators=(',', ':'))
    print('wrote %d charts, %d easings, %d colours, %d animations, %d decimations and %d text widths' % (
        len(result['cases']), len(result['easings']), len(result['colours']), len(result['animations']),
        len(result['decimation']['runs']), len(widths)))


main()
