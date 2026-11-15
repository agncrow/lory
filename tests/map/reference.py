"""Lory's maps held to Leaflet's own answers.

Runs Leaflet 1.9.4 (the copy a project has installed: its path is the
first argument, the `leaflet` folder under node_modules, put there by
`npm install --prefix <scratch>/ref leaflet@1.9.4`) in headless Chrome on
fixed inputs, and writes what it answers beside this script as
reference.json, which reference.co holds the map package to, number for
number:

- Web Mercator's projection and its inverse at zooms whole and fractional
  (`CRS.EPSG3857.latLngToPoint`, `pointToLatLng`), the zoom of a scale and
  the scale of a zoom (`getScaleZoom`, `getZoomScale`) and a longitude
  wrapped (`wrapLatLng`);
- distances on the earth (`CRS.Earth.distance`, the haversine) and a
  place's square of a size in metres (`LatLng.toBounds`);
- the zoom that fits a box in a view (`getBoundsZoom`, with padding,
  inside or not, at several zoom snaps) and the view `fitBounds` goes to
  (`_getBoundsCenterZoom`: its centre and zoom, padding on each corner);
- the scale bar's numbers (`Control.Scale`: its metric and imperial
  labels and widths, and the metres its widest bar spans);
- the path `flyTo` draws (its duration, and the centre and zoom every
  50 ms of it, Leaflet's clock and frames stepped by hand);
- a wheel's zoom about the pointer (`ScrollWheelZoom._performZoom`), a
  double click's (`DoubleClickZoom`), and the throw a drag lets go with
  (`Drag._onDragEnd`: the inertia's offset and how long it eases);
- the tiles a view asks for and their addresses (`TileLayer`, `{s}`
  chosen by the tile), a circle's radius in pixels for a radius in metres
  (`Circle._project`), the centres of a line and of a polygon
  (`getCenter`), and a line simplified (`LineUtil.simplify`).

    python3 -I tests/map/reference.py <scratch>/ref/node_modules/leaflet

Nothing is downloaded: the library is read where it is installed, and the
tile layer here names its tiles without fetching them.
"""
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
CHROME = os.environ.get('LORY_CHROME', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
VERSION = '1.9.4'

PLACES = [[0.0, 0.0], [51.5074, -0.1278], [-33.8688, 151.2093], [85.0511287798, 180.0],
          [-85.0511287798, -180.0], [89.9, 10.0], [-90.0, -170.0], [40.7128, -74.006],
          [35.6762, 139.6503], [1e-9, 1e-9], [-12.5, 200.0], [64.1466, -400.0],
          [19.4326, -99.1332], [-54.8019, -68.303], [0.0001, 0.0001]]
ZOOMS = [0, 1, 2.5, 7, 13.25, 18, 22]
POINTS = [[0, 0, 0], [128, 128, 0], [256, 256, 0], [100.5, 200.25, 0], [-50, 300, 0],
          [131072, 87381.33, 10], [123456.789, 98765.4321, 10], [1, 255, 0], [0.5, 0.5, 1],
          [33554432, 33554432, 17], [67108863.5, 1.5, 18], [2048, 1024, 3.7]]
PAIRS = [[[0, 0], [0, 1]], [[0, 0], [1, 0]], [[51.5074, -0.1278], [48.8566, 2.3522]],
         [[40.7128, -74.006], [35.6762, 139.6503]], [[-33.8688, 151.2093], [51.5074, -0.1278]],
         [[0, 0], [0, 180]], [[90, 0], [-90, 0]], [[10, 10], [10, 10]], [[60, 25], [60.0001, 25.0001]],
         [[0, 179.5], [0, -179.5]], [[-45, 170], [45, -10]], [[1e-7, 0], [0, 0]]]
BOXES = [[[51.28, -0.51], [51.69, 0.33]], [[-10, -10], [10, 10]], [[40.4774, -74.2591], [40.9176, -73.7004]],
         [[-85, -180], [85, 180]], [[35.0, 139.0], [36.0, 140.5]], [[0, 0], [0.001, 0.002]],
         [[60.1, 24.8], [60.3, 25.2]], [[-34.1, 150.5], [-33.5, 151.4]]]


def cases():
    out = {}
    out['project'] = [{'lat': p[0], 'lng': p[1], 'zoom': z} for p in PLACES for z in ZOOMS]
    out['unproject'] = [{'x': p[0], 'y': p[1], 'zoom': p[2]} for p in POINTS]
    out['distance'] = [{'a': a, 'b': b} for a, b in PAIRS]
    out['wrap'] = [{'lat': p[0], 'lng': p[1]} for p in PLACES] + [{'lat': 5, 'lng': 540}, {'lat': 5, 'lng': -540}, {'lat': 5, 'lng': 180}, {'lat': 5, 'lng': -180}]
    out['zoom_scale'] = [{'to': t, 'from': f} for t in [0, 1.5, 3, 12.75] for f in [0, 2, 7.25]]
    out['scale_zoom'] = [{'scale': s, 'from': f} for s in [0.5, 1, 2, 3.3, 1000] for f in [0, 4, 9.5]]
    out['to_bounds'] = [{'lat': p[0], 'lng': p[1], 'size': s} for p in PLACES[:9] for s in [10, 2500, 1000000]]
    bz = []
    for size in [[800, 600], [400, 300], [1000, 500]]:
        for box in BOXES:
            for snap in [1, 0.5, 0.25, 0]:
                for inside in [False, True]:
                    for padding in [[0, 0], [40, 40], [100, 20]]:
                        bz.append({'size': size, 'box': box, 'snap': snap, 'inside': inside,
                                   'padding': padding, 'zoom': 3, 'min': 0, 'max': 18})
    out['bounds_zoom'] = bz
    fit = []
    for size in [[800, 600], [500, 700]]:
        for box in BOXES:
            for pad in [{}, {'padding': [30, 30]}, {'paddingTopLeft': [100, 10], 'paddingBottomRight': [0, 50]},
                        {'padding': [20, 20], 'maxZoom': 9}]:
                fit.append({'size': size, 'box': box, 'options': pad, 'zoom': 2, 'snap': 1})
            fit.append({'size': size, 'box': box, 'options': {'padding': [10, 10]}, 'zoom': 2, 'snap': 0})
    out['fit'] = fit
    scale = []
    for size in [[800, 600], [401, 301]]:
        for lat, lng in [[0, 0], [45, 7.5], [60.17, 24.94], [-33.87, 151.21], [78.2, 15.6]]:
            for zoom in [0, 1, 3, 5, 8, 11, 13, 16, 19]:
                for width in [100, 150]:
                    scale.append({'size': size, 'center': [lat, lng], 'zoom': zoom, 'width': width})
    out['scale'] = scale
    out['fly'] = [
        {'size': [800, 600], 'from': [51.5, -0.1], 'from_zoom': 10, 'to': [48.85, 2.35], 'to_zoom': 12},
        {'size': [800, 600], 'from': [0, 0], 'from_zoom': 2, 'to': [40.7, -74.0], 'to_zoom': 10},
        {'size': [1024, 768], 'from': [35.68, 139.69], 'from_zoom': 5, 'to': [-33.87, 151.21], 'to_zoom': 5},
        {'size': [400, 300], 'from': [10, 10], 'from_zoom': 3, 'to': [10, 10], 'to_zoom': 8},
        {'size': [800, 600], 'from': [60, 25], 'from_zoom': 7, 'to': [60.17, 24.94], 'to_zoom': 7},
        {'size': [640, 480], 'from': [0, 0], 'from_zoom': 1, 'to': [20, 20], 'to_zoom': 4, 'duration': 2},
        {'size': [900, 500], 'from': [37.77, -122.42], 'from_zoom': 13.5, 'to': [37.8, -122.27], 'to_zoom': 11.25},
    ]
    wheel = []
    for snap in [1, 0]:
        for delta in [-300, -60, -10, 4, 50, 100, 120, 600, 2000]:
            for at in [[400, 300], [100, 50], [750, 580]]:
                wheel.append({'size': [800, 600], 'center': [51.5, -0.12], 'zoom': 9, 'snap': snap,
                              'delta': delta, 'at': at, 'min': 0, 'max': 18})
    wheel.append({'size': [800, 600], 'center': [51.5, -0.12], 'zoom': 17.5, 'snap': 0, 'delta': 600, 'at': [10, 10], 'min': 0, 'max': 18})
    wheel.append({'size': [800, 600], 'center': [51.5, -0.12], 'zoom': 0.5, 'snap': 0, 'delta': -600, 'at': [10, 10], 'min': 0, 'max': 18})
    out['wheel'] = wheel
    double = []
    for shift in [False, True]:
        for at in [[400, 300], [10, 590], [633, 77]]:
            for zoom in [3, 12]:
                double.append({'size': [800, 600], 'center': [40.7, -74.0], 'zoom': zoom, 'shift': shift, 'at': at})
    out['double'] = double
    # a drag's last moves: the pointer's places and times, and when it was let go
    out['inertia'] = [
        {'positions': [[0, 0], [10, 0], [20, 0], [30, 0], [40, 0]], 'times': [1000, 1016, 1032, 1048, 1064], 'end': 1070},
        {'positions': [[0, 0], [3, 4], [9, 12], [15, 20]], 'times': [1000, 1010, 1020, 1030], 'end': 1034},
        {'positions': [[0, 0], [-50, 10], [-120, 20], [-200, 30], [-290, 40], [-380, 50]], 'times': [1000, 1020, 1040, 1060, 1080, 1100], 'end': 1101},
        {'positions': [[0, 0], [1, 0], [2, 0]], 'times': [1000, 1016, 1032], 'end': 1040},
        {'positions': [[0, 0], [100, 0], [100, 0], [100, 0], [100, 0]], 'times': [1000, 1030, 1060, 1090, 1120], 'end': 1130},
    ]
    tiles = []
    for size in [[800, 600], [256, 256], [1000, 300]]:
        for center, zoom in [[[0, 0], 0], [[0, 0], 1], [[51.5, -0.12], 10], [[0, 179.9], 3], [[84, -170], 4],
                             [[-33.87, 151.21], 7.4], [[40.7, -74.0], 12.6], [[0, 0], 19], [[10, 10], 20]]:
            tiles.append({'size': size, 'center': center, 'zoom': zoom, 'max': 19})
    tiles.append({'size': [800, 600], 'center': [51.5, -0.12], 'zoom': 17.3, 'max': 19, 'max_native': 16})
    tiles.append({'size': [800, 600], 'center': [51.5, -0.12], 'zoom': 3, 'max': 19, 'subdomains': 'xyzw'})
    out['tiles'] = tiles
    out['circle'] = [{'lat': lat, 'lng': 10, 'radius': r, 'zoom': z}
                     for lat in [0, 45, 60, 80, -30] for r in [10, 1000, 500000] for z in [3, 10, 16]]
    out['centers'] = [
        {'kind': 'polygon', 'ring': [[0, 0], [0, 10], [10, 10], [10, 0]]},
        {'kind': 'polygon', 'ring': [[51.49, -0.15], [51.52, -0.1], [51.5, -0.05], [51.47, -0.09]]},
        {'kind': 'polygon', 'ring': [[60.17, 24.94], [60.1701, 24.9402], [60.1703, 24.9399]]},
        {'kind': 'polygon', 'ring': [[-20, 130], [-12, 136], [-25, 150], [-38, 145], [-32, 116]]},
        {'kind': 'line', 'ring': [[0, 0], [0, 10], [10, 10]]},
        {'kind': 'line', 'ring': [[40.7, -74.0], [41.0, -73.5], [42.36, -71.06]]},
        {'kind': 'line', 'ring': [[60.17, 24.94], [60.1701, 24.9402]]},
    ]
    out['simplify'] = [
        {'points': [[0, 0], [1, 0.1], [2, -0.1], [3, 5], [4, 6], [5, 7], [6, 8.1], [7, 9], [8, 9], [9, 9]], 'tolerance': 1},
        {'points': [[0, 0], [10, 0], [20, 0], [30, 0.4], [40, 0]], 'tolerance': 0.5},
        {'points': [[0, 0], [0.5, 0.5], [1, 1], [50, 50], [50.2, 50], [100, 0]], 'tolerance': 2},
        {'points': [[i * 3.0, ((i * 37) % 11) * 1.5] for i in range(40)], 'tolerance': 3},
    ]
    return out


PAGE = r'''<!doctype html><html><body>
<pre id="out">pending</pre>
<script>
// Leaflet's clock and frames, stepped by hand: set before Leaflet is read,
// which keeps the page's requestAnimationFrame as it starts
var clock = 1000000;
var frames = [];
var RealDate = Date;
window.Date = function (a, b, c, d, e, f, g) {
  if (arguments.length === 0) return new RealDate(clock);
  return new (Function.prototype.bind.apply(RealDate, [null].concat(Array.prototype.slice.call(arguments))))();
};
window.Date.now = function () { return clock; };
window.Date.prototype = RealDate.prototype;
window.requestAnimationFrame = function (f) { frames.push(f); return frames.length; };
window.cancelAnimationFrame = function (id) { if (id) frames[id - 1] = null; };
function flush() { var due = frames.splice(0); due.forEach(function (f) { if (f) f(); }); }
</script>
<script src="file://%(leaflet)s"></script>
<script>
var cases = %(cases)s;
var made = 0;
function mapOf(size, options) {
  var div = document.createElement('div');
  div.style.width = size[0] + 'px';
  div.style.height = size[1] + 'px';
  div.style.position = 'absolute';
  div.style.left = '0px';
  div.style.top = '0px';
  document.body.appendChild(div);
  made += 1;
  var o = {zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false};
  for (var k in options) o[k] = options[k];
  return L.map(div, o);
}
function drop(map) { var div = map.getContainer(); map.remove(); div.parentNode.removeChild(div); }
var crs = L.CRS.EPSG3857;
var out = {version: L.version};
out.project = cases.project.map(function (c) { var p = crs.latLngToPoint(L.latLng(c.lat, c.lng), c.zoom); return [p.x, p.y]; });
out.unproject = cases.unproject.map(function (c) { var q = crs.pointToLatLng(L.point(c.x, c.y), c.zoom); return [q.lat, q.lng]; });
out.distance = cases.distance.map(function (c) { return L.CRS.Earth.distance(L.latLng(c.a[0], c.a[1]), L.latLng(c.b[0], c.b[1])); });
out.wrap = cases.wrap.map(function (c) { var w = crs.wrapLatLng(L.latLng(c.lat, c.lng)); return [w.lat, w.lng]; });
var probe = mapOf([100, 100], {});
probe.setView([0, 0], 0);
out.zoom_scale = cases.zoom_scale.map(function (c) { return probe.getZoomScale(c.to, c.from); });
out.scale_zoom = cases.scale_zoom.map(function (c) { return probe.getScaleZoom(c.scale, c.from); });
drop(probe);
out.to_bounds = cases.to_bounds.map(function (c) { var b = L.latLng(c.lat, c.lng).toBounds(c.size); return [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()]; });
out.bounds_zoom = cases.bounds_zoom.map(function (c) {
  var m = mapOf(c.size, {zoomSnap: c.snap, minZoom: c.min, maxZoom: c.max});
  m.setView([0, 0], c.zoom);
  var z = m.getBoundsZoom(L.latLngBounds(c.box), c.inside, L.point(c.padding[0], c.padding[1]));
  drop(m);
  return z;
});
out.fit = cases.fit.map(function (c) {
  var m = mapOf(c.size, {zoomSnap: c.snap, minZoom: 0, maxZoom: 18});
  m.setView([0, 0], c.zoom);
  var t = m._getBoundsCenterZoom(L.latLngBounds(c.box), c.options);
  drop(m);
  return [t.center.lat, t.center.lng, t.zoom];
});
out.scale = cases.scale.map(function (c) {
  var m = mapOf(c.size, {});
  m.setView(c.center, c.zoom);
  var s = L.control.scale({maxWidth: c.width}).addTo(m);
  s._update();
  var y = m.getSize().y / 2;
  var most = m.distance(m.containerPointToLatLng([0, y]), m.containerPointToLatLng([c.width, y]));
  var row = [most, s._mScale.innerHTML, parseFloat(s._mScale.style.width), s._iScale.innerHTML, parseFloat(s._iScale.style.width)];
  drop(m);
  return row;
});
out.fly = cases.fly.map(function (c) {
  var m = mapOf(c.size, {zoomSnap: 0});
  m.setView(c.from, c.from_zoom);
  var start = clock;
  var options = {};
  if (c.duration) options.duration = c.duration;
  m.flyTo(c.to, c.to_zoom, options);
  var samples = [];
  var t = 0;
  var ended = false;
  m.once('moveend', function () { ended = true; });
  samples.push([0, m.getCenter().lat, m.getCenter().lng, m.getZoom()]);
  while (!ended && t < 60000) {
    t += 50;
    clock = start + t;
    flush();
    var q = m.getCenter();
    samples.push([t, q.lat, q.lng, m.getZoom()]);
  }
  clock = start;
  drop(m);
  return samples;
});
out.wheel = cases.wheel.map(function (c) {
  var m = mapOf(c.size, {zoomSnap: c.snap, minZoom: c.min, maxZoom: c.max});
  m.setView(c.center, c.zoom);
  m.scrollWheelZoom._delta = c.delta;
  m.scrollWheelZoom._lastMousePos = L.point(c.at[0], c.at[1]);
  m.scrollWheelZoom._performZoom();
  var q = m.getCenter();
  var row = [q.lat, q.lng, m.getZoom()];
  drop(m);
  return row;
});
out.double = cases.double.map(function (c) {
  var m = mapOf(c.size, {});
  m.setView(c.center, c.zoom);
  m.doubleClickZoom._onDoubleClick({originalEvent: {shiftKey: c.shift}, containerPoint: L.point(c.at[0], c.at[1])});
  var q = m.getCenter();
  var row = [q.lat, q.lng, m.getZoom()];
  drop(m);
  return row;
});
out.inertia = cases.inertia.map(function (c) {
  var m = mapOf([800, 600], {});
  m.setView([0, 0], 5);
  var d = m.dragging;
  d._positions = c.positions.map(function (p) { return L.point(p[0], p[1]); });
  d._times = c.times.slice();
  d._lastPos = d._positions[d._positions.length - 1];
  d._lastTime = c.times[c.times.length - 1];
  var thrown = null;
  m.panBy = function (offset, options) { thrown = [offset.x, offset.y, options.duration, options.easeLinearity]; return m; };
  clock = c.end;
  d._onDragEnd({});
  flush();
  clock = 1000000;
  drop(m);
  return thrown;
});
var Named = L.TileLayer.extend({
  createTile: function (coords, done) {
    var el = document.createElement('div');
    el.setAttribute('data-url', this.getTileUrl(coords));
    setTimeout(function () { done(null, el); }, 0);
    return el;
  }
});
out.tiles = cases.tiles.map(function (c) {
  var m = mapOf(c.size, {zoomSnap: 0});
  var options = {maxZoom: c.max};
  if (c.max_native !== undefined) options.maxNativeZoom = c.max_native;
  if (c.subdomains !== undefined) options.subdomains = c.subdomains;
  var layer = new Named('https://{s}.tiles.test/{z}/{x}/{y}.png', options);
  m.setView(c.center, c.zoom);
  layer.addTo(m);
  var got = Object.keys(layer._tiles).map(function (k) { return [k, layer._tiles[k].el.getAttribute('data-url')]; });
  got.sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
  drop(m);
  return got;
});
out.circle = cases.circle.map(function (c) {
  var m = mapOf([800, 600], {});
  m.setView([c.lat, c.lng], c.zoom);
  var k = L.circle([c.lat, c.lng], {radius: c.radius}).addTo(m);
  var row = [k._radius, k._radiusY];
  drop(m);
  return row;
});
out.centers = cases.centers.map(function (c) {
  var m = mapOf([800, 600], {});
  m.setView([0, 0], 2);
  var shape = c.kind === 'polygon' ? L.polygon(c.ring) : L.polyline(c.ring);
  shape.addTo(m);
  var q = shape.getCenter();
  drop(m);
  return [q.lat, q.lng];
});
out.simplify = cases.simplify.map(function (c) {
  var pts = c.points.map(function (p) { return L.point(p[0], p[1]); });
  return L.LineUtil.simplify(pts, c.tolerance).map(function (p) { return [p.x, p.y]; });
});
out.maps = made;
document.getElementById('out').textContent = JSON.stringify(out);
</script></body></html>'''


def main():
    lib = os.path.expanduser(sys.argv[1])
    with open(os.path.join(lib, 'package.json')) as f:
        installed = json.load(f)['version']
    if installed != VERSION:
        sys.exit('leaflet %s is installed there; this script holds Lory to %s' % (installed, VERSION))
    script = os.path.join(lib, 'dist', 'leaflet-src.js')
    inputs = cases()
    page = PAGE % {'leaflet': script, 'cases': json.dumps(inputs)}
    with tempfile.TemporaryDirectory() as tmp:
        html = os.path.join(tmp, 'ref.html')
        with open(html, 'w') as f:
            f.write(page)
        dom = subprocess.run([CHROME, '--headless=new', '--allow-file-access-from-files',
                              '--user-data-dir=' + os.path.join(tmp, 'profile'), '--window-size=1200,900',
                              '--virtual-time-budget=10000', '--dump-dom', 'file://' + html],
                             capture_output=True, text=True, timeout=300).stdout
    start = dom.index('<pre id="out">') + len('<pre id="out">')
    text = dom[start:dom.index('</pre>', start)]
    text = text.replace('&quot;', '"').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    if text == 'pending':
        sys.exit('the page did not finish: Leaflet stopped on the way (run it in a browser to see why)')
    answers = json.loads(text)
    with open(os.path.join(HERE, 'reference.json'), 'w') as f:
        json.dump({'leaflet': answers['version'], 'cases': inputs, 'answers': answers}, f)
    counted = sum(len(v) for k, v in answers.items() if isinstance(v, list))
    print('wrote %d answers of Leaflet %s on %d maps' % (counted, answers['version'], answers['maps']))


main()
