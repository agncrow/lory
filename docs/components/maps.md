# map: the earth in a box of a page

`map` (packages/map) draws a map of the earth in any box of a Lory canvas:
raster tiles from OpenStreetMap or any tile server, GeoJSON shapes in
styles, markers with popups and tooltips, circles in metres, clusters of
points and a heatmap of them, zoom buttons, a scale bar and the tiles'
credit. The reader drags it and throws it, zooms it with the wheel, a
double click, two fingers, the keys or a box drawn with Shift, and presses
its markers and shapes. The program flies it from place to place.

It is Leaflet's behaviour (1.9.4), written anew in Crow and held to the
numbers Leaflet itself answers. Mapbox GL JS's examples said which features
matter. Its numbers are not used, because Mapbox v2 and later is not open
source. Clustering and the heatmap are Map's own design (Leaflet has
neither built in). packages/map/NOTICE says how it was made.

A program writes `use map` and shows a map each frame:

    use sys
    use lory
    use map

    fn draw[frame]
        c = lory.begin[frame]
        m = map.of['world']
        if not m.made
            m = map.at[m, 20.0, 0.0, 2.0]
            m = map.tiles[m, map.openstreetmap[]]
            m = map.add_marker[m, 'paris', 48.8566, 2.3522, 'Paris']
        c = map.show[c, m, 0.0, 0.0, lory.width[c], lory.height[c]]
        lory.end[c]

    sys.frames[draw]

A map is a record kept between frames under its id, as Lory's controls keep
theirs (`use memory`). Its layers and its tiles are kept under names of
their own, so the record stays light. `show` reads the frame's input inside
the map's box, moves the view, draws it and keeps the map. A map moving by
itself (`moving[m]`) needs a frame drawn every frame. The box a program
hands a map is in the canvas's pixels. A map's insides are CSS pixels, as
Leaflet's are.

The package's files:

| File | What it holds |
|---|---|
| main.co (`use map`) | The map: its view, input, layers, popups, controls and drawing |
| geo.co (`use map.geo`) | Web Mercator's arithmetic: projection, distances, fitting a box, the scale bar, middles, simplifying |
| camera.co (`use map.camera`) | Moves: a flight, a zoom about a point, the wheel, a pinch, a throw, a view held in a box, easings |
| grid.co (`use map.grid`) | Tiles: which a view needs, their addresses, the images held and drawn |
| features.co (`use map.features`) | GeoJSON read into features, styles, triangles, hit tests, markers |
| points.co (`use map.points`) | Clusters and the heatmap |

## What is built

### A map and its view

| Function | What it does |
|---|---|
| `fresh[id]` | A map with Leaflet's defaults, not yet kept: the whole world at zoom 0, every hand moving it, its controls shown, no tiles and no layers |
| `of[id]` | The map kept under `id`, or `fresh[id]` (`made` false) where none is |
| `keep[m]` | Keeps the map until the next frame, and answers it |
| `forget_map[id]` | Lets go of a map, its layers and its tiles |
| `at[m, lat, lng, zoom]` | Shows a place at a zoom at once (Leaflet's setView with no animation) |
| `zooms[m, low, high]` | The zooms allowed (`high` -1: the tiles' highest) |
| `zoom_steps[m, snap, delta]` | The multiple zooms snap to (0: any zoom) and the step of a button, a key or a double click |
| `bounded[m, south, west, north, east, viscosity = 0.0]` | Holds the view inside a box of places (maxBounds). A drag is held at the edge as firmly as `viscosity`: 0 lets it past and brings it back, 1 never lets it past |
| `unbounded[m]` | Frees the view |
| `show[c, m, x, y, w, h]` | Reads, moves, draws and keeps the map in a box of the canvas, clipped to it |
| `painter[d]` | The map as a drawn control in a tree of Lory's (`gui.drawn['world', 0.0, 600.0, 400.0, map.painter]`) |
| `happened[id]` | What the reader did to the map in the frame it was last shown in |
| `moving[m]` | Whether it is moving by itself: flying, zooming or panning |
| `place_under[m, x, y]` | The place under a point of the canvas |
| `point_on[m, lat, lng]` | Where a place is on the canvas |
| `bounds_shown[m]` | The box of places shown |
| `scale_shown[m]` | The scale bar's numbers as the map stands |
| `seen_of[m]` | What the view shows, reckoned as it is drawn (`geo.Seen`) |
| `highest[m]` | The highest zoom allowed: the map's own, or else its tiles' |

### Moving it from the program

| Function | What it does |
|---|---|
| `fly_to[m, lat, lng, zoom, seconds = 0.0]` | Flies along Leaflet's flyTo path, zooming out and in again. With `seconds` 0 the flight takes as long as its path is, 0.8 s a unit of it |
| `fly_to_bounds[m, south, west, north, east, padding = 0.0]` | Flies to show a box of places (flyToBounds) |
| `ease_to[m, lat, lng, zoom, seconds = 0.25]` | Eases to a view: the picture scaled and slid from where it stands, slowing at the end (Mapbox's easeTo) |
| `fit_bounds[m, south, west, north, east, padding = 0.0]` | Shows a box of places at the highest snapped zoom that holds it, `padding` CSS pixels clear of the edge (fitBounds) |
| `zoom_in[m, steps = 1.0]`, `zoom_out[m, steps = 1.0]` | Zooms by the map's step about its middle |
| `pan_to[m, lat, lng]` | Pans to a place, sliding there in a quarter of a second where it is near (panTo) |
| `pan_by[m, dx, dy]` | Pans by CSS pixels, in whole pixels (panBy) |

### Tiles

| Function | What it does |
|---|---|
| `openstreetmap[]` | OpenStreetMap's tiles, zooms 0 to 19, credited "© OpenStreetMap contributors" |
| `tile_layer[template, credit]` | A layer of tiles at a template with `{z}`, `{x}`, `{y}`, `{s}` (a, b or c, chosen by the tile), `{-y}` (rows counted from the south, as TMS counts them) and `{r}` (always empty) |
| `tiles[m, t]`, `no_tiles[m]` | The map's tiles, drawn under its shapes, or none |

A map draws one layer of tiles. Each image is asked of the page once
(`lory.load_image`) and held in one of 160 page objects (40000 to 40159).
The least lately drawn image gives way when they are all taken. An image
fades in over 200 ms. Where a tile has not come yet, a coarser one already
held is drawn in its place (up to five zooms coarser), and so are the four
tiles of the next zoom in, kept from a zoom just left. While the view moves,
new tiles are asked for at most five times a second (Leaflet's
updateInterval). An image that has not come in 15 s is given up.

### Layers and features

| Function | What it does |
|---|---|
| `add_geojson[m, name, words, s]` | Adds GeoJSON text as a layer of that name, in a style: a FeatureCollection, a Feature or a bare geometry |
| `set_geojson[m, name, words, s]` | Replaces a layer's features with new GeoJSON, where the layer stood (Mapbox's setData: live data) |
| `add_marker[m, id, lat, lng, words = '', layer = 'markers']` | Adds a marker, with its popup's words ('' for none) |
| `add_point[m, layer, id, lat, lng, s]` | Adds a point in a style, a marker or a circle: one of many a layer may cluster |
| `add_circle[m, id, lat, lng, metres, s, layer = 'circles']` | Adds a circle of so many metres about a place |
| `remove_feature[m, id]` | Takes a marker or a shape off the map. Its popup closes |
| `clear_layer[m, name]` | Takes every feature off a layer, and keeps the layer in its place (clearLayers) |
| `hide_layer[m, name]`, `show_layer[m, name]` | Hides a layer (not drawn, not pressed, its open popup closed) and shows it again |
| `cluster[m, name, radius = 60.0]` | Draws a layer's points as clusters where they stand within `radius` CSS pixels of each other |
| `heat[m, name, radius = 25.0]` | Draws a layer's points as a heatmap, each spread `radius` CSS pixels |
| `shapes[m, name]` | Draws a layer's points each as itself again |
| `restyle[m, name, s]` | Draws a layer in another style |
| `fill_steps[m, name, property, base, stops, colors]` | Fills a layer's shapes by steps of a number among their properties (a choropleth). `base` is below the first stop |
| `fill_match[m, name, property, choices, colors, otherwise]` | Fills a layer's shapes by a word among their properties |
| `layers_of[id]` | A map's layers: their names, modes, radii and whether each is hidden, and every feature |

Layers are drawn in the order they were first added, the shapes of every
layer first and then the marks (markers, circles of points, clusters) over
all of them. What is pressed is found in the reverse order: the last drawn
first. GeoJSON's points, lines, polygons with their holes, their Multi forms
and GeometryCollections are all read. A feature's id is its GeoJSON id, or
else the layer's name and its place (`parks.2`). Its properties are kept as
words, and those that are numbers as numbers too.

### Styles

| Function | What it does |
|---|---|
| `style[]` | Leaflet's path style: a blue (#3388ff) stroke 3 pixels wide, fills of the same blue at a fifth of its opacity, points drawn as markers |
| `stroke[s, color, weight]`, `stroke_opacity[s, opacity]` | The stroke's colour, width and opacity |
| `dashes[s, on, off]` | A dashed stroke: so many pixels drawn, so many left |
| `filled[s, color, opacity]`, `unfilled[s]` | Polygons and circles filled, or not |
| `circles[s, radius]` | Points drawn as circles of a radius in pixels (CircleMarker) |
| `icon[s, n, w, h, x, y]` | Points drawn as a picture the page has loaded (object `n`), `w` by `h` CSS pixels, its point (x, y) on the place |
| `glyph[s, name, size, color]` | Points drawn as one of Lory's icons (`lory.icons`) by name, `size` CSS pixels square, in a colour: a pin (`map-pin`, `sewing-pin` or `drawing-pin`, or the filled form of each) with its point on the place, any other icon with its middle there |

A marker with neither a picture nor an icon is Lory's own pin, 25 by 41
CSS pixels with its point on the place, as Leaflet's marker stands. A
marker of an icon is pressed anywhere in its square, and its popup points
from the square's top. A circle of metres is drawn as the ellipse Web
Mercator makes of it. A polygon is cut into triangles once, by Lory's own
earcut (`lory.geometry`'s, which cuts a shape as three.js does and as
Mapbox cuts its fills): each hole bridged into the outer ring, then ears
cut off in turn.

### Popups and tooltips

| Function | What it does |
|---|---|
| `bind_popup[m, id, words]` | The words a feature's popup shows when it is pressed |
| `bind_tooltip[m, id, words]` | The words a feature's tooltip shows while the pointer rests on it |
| `open_popup[m, lat, lng, words]` | Opens a popup at a place. One is open at a time |
| `open_popup_of[m, id]` | Opens a feature's popup, at a marker's head or a shape's middle |
| `close_popup[m]` | Closes it |

A popup is Leaflet's: its words in 13 pixel type wrapped between 50 and 300
pixels, a close button at its top right, and a tip at its place. A marker's
popup points from its head (1 right, 34 up), and a shape's from where it was
pressed. Opening one pans the map until the popup stands 5 pixels inside its
edge (autoPan). A press anywhere else closes it first (closePopupOnClick).
The marker whose popup it is, pressed again, closes it. Escape closes it.

A tooltip is drawn in a small white box beside its feature with a little
arrow. It is on the right of a feature left of the map's middle and on the
left of one right of it (Leaflet's direction `auto`).

### Controls, hands and the device's place

| Function | What it does |
|---|---|
| `controls[m, zoom_buttons = true, scale_bar = true, credits = true]` | Which controls show |
| `scale_units[m, metric = true, imperial = true]` | The scale bar's measures |
| `credit_prefix[m, words]` | The words the credit starts with (`Lory`; '' for none) |
| `hands[m, dragging, wheel, double, keyboard, box, pinch, inertia]` | Which hands move the map (each `true` by default) |
| `located[m, lat, lng, accuracy]` | Shows the device's place: a blue dot in a circle of how sure it is (metres) |
| `locate[m, lat, lng, accuracy, zoom = 15.0]` | Shows the device's place and flies there |

The controls stand where Leaflet's do. The zoom buttons are at the top left:
two of 30 CSS pixels in a 2 pixel edge, 10 pixels in, greyed where the zoom
has come to its end and lit under the pointer. The scale bar is at the
bottom left: metres over feet or miles, at most 100 pixels wide. The credit
is at the bottom right: "Lory | © OpenStreetMap contributors" on a pale
strip. The pointer's shape says what a press would do: an open hand over
the map, a closed one while it drags, a finger over what may be pressed.

### What the reader did

`happened[id]` lists what the reader did in the frame the map was last
shown in, each as a `Told` (its act, what it was done to, a place and the
zoom):

| Act | When |
|---|---|
| `click` | A press let go without a drag: on a feature (`what` its id) or on the map (`what` '', the place pressed) |
| `hover` | The pointer came to rest on a feature |
| `popup`, `closed` | A popup opened or closed (`what` its feature) |
| `moved` | The view changed |
| `located` | The device's place came from the page |

In a tree of Lory's controls (`gui.drawn` with `map.painter`), the map is
kept by the program before the tree is shown (`map.keep[m]`). Its `click`,
`popup`, `closed` and `located` are among the tree's events, the feature's
id as the event's words and the zoom as its number. The map takes the
keyboard when the tree gives the drawn control the focus.

### The modules under it

These are the parts the map is made of, for a program that needs them
alone.

| Module | Functions |
|---|---|
| `map.geo` | `project`, `unproject`, `world`, `zoom_of`, `zoom_scale`, `scale_zoom`, `metres`, `from_metres`, `wrap`, `wrap_number`, `distance` (the haversine on 6,371 km), `around` (toBounds), `metres_per_pixel`, `seen`, `place_at`, `point_of`, `bounds_of`, `limit_zoom`, `bounds_zoom` (getBoundsZoom), `fit` (fitBounds, with a highest zoom), `round_number`, `scale_of` (the scale bar), `circle_radius`, `line_middle`, `polygon_middle`, `simplify` (LineUtil.simplify), `segment_distance_squared`, `js_round`, `js_floor`, `js_ceil`, `remainder` (JavaScript's own rounding and `%`) |
| `map.camera` | `flight` and `flight_at` (flyTo), `zoom_around` (setZoomAround), `wheel_step`, `pinch_zoom`, `throw_of` (inertia), `held_inside` (maxBounds), `ease_out` and `bezier` (`lory.motion`'s power eased out and CSS's cubic-bezier), `zoom_between` (a zoom animation's view) |
| `map.grid` | `layer`, `openstreetmap`, `tile_zoom`, `address`, `tiles_at`, `tiles_for`, and the images held: `held_none`, `heard`, `asked`, `asks_for`, `draw_tiles`, `drawn_at` |
| `map.features` | `read_geojson`, `pieces_of`, the style functions, `fill_steps`, `fill_match`, `triangulate` (by `lory.geometry`'s earcut), `hits`, `pin`, `draw_feature`, `shows`, `circle_of`, `marker_of`, `middle_of` (getCenter) |
| `map.points` | `points_at`, `tree`, `groups_at`, `cluster_radius`, `cluster_color`, `draw_clusters`, `cluster_under`, `heat_grid`, `heat_color`, `draw_heat` |

Clusters are made once for every whole zoom, from the highest down. At each
zoom, the groups of the zoom above that stand within the radius of a group
not yet taken join it, at the middle of their points. So a cluster comes
apart into the groups it was made of as the map zooms in, and the zoom it
comes apart at is known: pressing a cluster zooms the map there. A cluster
is a disc with its count, blue for a few points, amber for tens and red for
hundreds. A heatmap adds a bell of heat for each point to a grid over the
view, and colours it from clear through blue, teal and yellow to red.

## How a map behaves

These are Leaflet's numbers, read from its code and held by the tests:

- **Dragging.** A press moves the map once the pointer has gone 3 pixels
  (Leaflet's clickTolerance, measured as |dx| + |dy|). Under that it is a
  click. Let go while moving, the map is thrown on as fast as the pointer
  went in its last 50 ms, slowing by 3400 pixels a second each second,
  eased out with a power of 5 (inertiaDeceleration, easeLinearity 0.2).
- **The wheel.** Its pixels are gathered for 40 ms from the first
  (wheelDebounceTime), then zoom the map about the pointer by Leaflet's
  curve of them (wheelPxPerZoomLevel 60, never more than four levels at
  once), rounded up to the next whole zoom where zooms snap. As Leaflet
  does on a Mac, the wheel's pixels are first divided by three times the
  page's pixel ratio.
- **A double click** zooms in a step about where it was, and out with
  Shift.
- **The keys**, once the map has been pressed: the arrows pan 80 CSS pixels
  (keyboardPanDelta; Shift: 240), + and - zoom a step (Shift: three), and
  Escape closes the popup.
- **A box drawn with Shift** zooms the map to show it.
- **Two fingers** zoom about the point between them, as far as they are
  drawn apart, and pan with it. Let go, the zoom snaps.
- **Zooms** are held to the map's lowest and highest and snapped to its
  multiple (zoomSnap 1, zoomDelta 1 by default). A zoom is drawn as the
  picture scaled from one view to the other in a quarter of a second
  (CSS's cubic-bezier(0, 0, 0.25, 1), Leaflet's zoom animation). Zooms more
  than four apart jump, as Leaflet's do.
- **A bounded view** never shows what is outside its box, and a drag past
  the edge is held by the viscosity.
- **A pan** by the program slides in a quarter of a second, eased out with a
  power of 2, and jumps where it is farther than the view's size.

## Behaviours held

Each behaviour below is a test block. The package holds 60 blocks of 284
truths. They pass under `crow test` and `crow test --compiled` (which runs
plain blocks in the interpreter, so the modes program below holds the
compiled side).

**main.co (26 blocks, 149 truths):**

- A drag moves the map with the pointer and throws it on when let go.
- A press let go within three pixels is a click.
- The wheel zooms about the pointer 40 ms after it turns: the place under
  the pointer stays there.
- A double click zooms in about where it was, and with Shift out.
- The keys pan and zoom once the map has the keyboard.
- A box drawn with Shift zooms the map to it.
- Two fingers drawn apart zoom the map in about them.
- The zoom is held to the zooms the map allows.
- The view is held inside the box of places it is bounded by.
- The zoom buttons zoom a step and stop at the ends.
- A hand turned off leaves the view as it was: a drag, the wheel, a double
  click and the keys.
- The program's moves end where they were sent: a box fitted at the
  highest zoom that shows it whole, an ease, a pan by pixels, zooms out
  and in.
- A marker pressed opens its popup, pointing from its head, and a press on
  the map closes it.
- A marker pressed again closes its popup, and another's replaces it. The
  order of what is told is Leaflet's: click and popup; click and closed;
  closed, click and popup.
- A marker drawn as one of Lory's icons stands on its point: a pin's point
  is 27 pixels down its 30 pixel square, a press within the square is its
  own and one just below its point is the map's, and its popup points
  from the square's top.
- A popup opened at the edge pans the map to show it whole, 5 pixels in.
- A tooltip shows while the pointer rests on its feature, is told as
  `hover`, and goes when the pointer leaves the page.
- A layer is drawn anew from new data where it stood, and a feature taken
  away closes its popup. A layer emptied keeps its place.
- A hidden layer is neither drawn nor pressed, and is again once shown. A
  layer drawn over another is pressed first, though its features were
  added before the other's were drawn anew.
- A shape pressed is told by its id. A press beside it is the map's.
- A flight ends where it was sent.
- The tiles a view lacks are asked for once, and drawn once they come.
- The device's place the page says is shown on the map and told, and
  `locate` flies there.
- Points close together are one cluster, and pressing it zooms in to where
  it comes apart.
- The map in a tree tells its presses as the tree's events.
- In a headset, the thumbstick zooms the map about the ray's point and
  keeps the place under it, and the trigger presses it.

**geo.co (10 blocks, 42 truths):** the world is 256 pixels at zoom 0 and
doubles at each zoom; Greenwich on the equator is the middle of the world;
the corners of the square world; JavaScript rounds halves up; a longitude
wraps into the one world; a degree of the equator is 111 kilometres; a
pixel at zoom 0 spans 156 kilometres at the equator; the scale bar rounds
down to 1, 2, 3, 5 or 10; a view reckons places from its rounded corner; a
line keeps its ends and its corners when simplified.

**camera.co (8 blocks, 30 truths):** a flight ends exactly where it was
sent; a flight of a given length takes it; the wheel zooms a whole level
when zooms snap; zooming about the middle keeps the middle to its rounded
pixel; a drag that stopped throws nothing; a view is held inside its box;
easings start at 0 and end at 1 (and a power that is no short number is
handed to `lory.motion` whole); a zoom animation keeps the point it zooms
about.

**grid.co (5 blocks, 18 truths):** a tile address fills in its template;
the whole world is one tile at zoom 0; a view past the last zoom has no
tiles; the tiles wrap round the world; an image is asked for once and held
when it comes.

**features.co (7 blocks, 28 truths):** a square is cut into two triangles;
a square with a hole is cut round the hole; a concave polygon keeps its
notch unfilled; a ring of 240 corners, a star with deep notches, is cut
whole, its triangles covering its area; every geometry is read; a point inside a hole is not on
the polygon; a choropleth colours by steps of a number.

**points.co (4 blocks, 17 truths):** points close together are one cluster
until the map zooms in; a cluster stands at the middle of its points; a
cluster is found under the pointer; heat is greatest where the points are
thick.

**The example (examples/map/main.co, 3 blocks, 12 truths):** the world is
shown in OpenStreetMap's tiles, which it asks for at zoom 2; a button flies
the map to its city and it lands there; the cafés of Tokyo are clustered and
a marker opens its popup.

## Parity

### Numbers: reference.py and reference.co

`tests/map/reference.py` runs Leaflet 1.9.4 in headless Chrome on fixed
inputs. Leaflet is installed pinned in a scratch folder
(`npm install --prefix <scratch>/ref leaflet@1.9.4`) and read where it
lies. The script writes `tests/map/reference.json`. `tests/map/reference.co`
holds the package to it, number for number:

    python3 -I tests/map/reference.py <scratch>/ref/node_modules/leaflet
    crow test tests/map/reference.co        (from Lory's root)

| Part | What Leaflet answered | Held | The same float |
|---|---|---|---|
| Projections | latLngToPoint and pointToLatLng at whole and fractional zooms, getZoomScale, getScaleZoom, wrapLatLng | 299 | 298 |
| Distances | CRS.Earth.distance (the haversine), LatLng.toBounds | 120 | 119 |
| Fits | getBoundsZoom with padding, inside or not, at several snaps; the view fitBounds goes to | 816 | 791 |
| Scale bars | Control.Scale's labels and widths, metric and imperial, and the metres its widest bar spans | 900 | 885 |
| Flights | flyTo's duration, and its centre and zoom every 50 ms, Leaflet's clock stepped by hand | 826 | 656 |
| Zooms | the wheel's zoom about the pointer, the double click's, and a drag's throw | 215 | 208 |
| Tiles | the tiles a view asks for and their addresses, `{s}` chosen by the tile | 284 | 284 |
| Shapes | a circle's radius in pixels, the middles of lines and polygons, LineUtil.simplify | 174 | 172 |

That is 3,634 numbers and words held, 3,413 of them the same float. Every
count, label, tile key, address and snapped zoom is the same. The rest come
within 3.4e-14 of Leaflet's, as a part of the number. The test allows 1e-10
for numbers that passed through a sine, a logarithm, an exponential, an arc
tangent or a power. V8's Math functions and the platform's (those Crow
calls) round the last bit differently for some numbers: about 1 in 30 for a
sine and 1 in 6 for an arc cosine, measured on 2,000 numbers each. The
package does Leaflet's steps in Leaflet's order, so no other difference is
left.

### Both of Crow's modes

- `tests/modes/maps.co` writes out what the package computes on fixed
  inputs: places projected and back at four zooms, views and their bounds
  and scale bars, fitted boxes, flights sampled, wheels, pinches, throws,
  tiles and their addresses, GeoJSON of every kind read, cut and hit,
  choropleths, clusters at nine zooms, a heat grid, and a map driven
  through about 70 frames as a page hands them (tiles answered, dragged,
  thrown, wheeled, double clicked, keyed, boxed, pinched, a popup, a
  tooltip, a cluster pressed, a flight, a fit, an ease, a pan, a bounded
  drag, a located place, new data, a hidden layer), each frame's drawing
  summed. Nothing in it reads a clock, a random number or the network.
  `tests/modes.sh crow tests/modes/maps.co` runs it with `crow run -i` and
  compiled with `crow run`: 420 lines, the same in both modes. (It is
  named maps.co because a program named map.co that writes `use map`
  imports itself.)
- `packages/map/example.co`, which `crow test --packages` runs in both modes,
  tours the same parts in sentences: 43 lines, the same in both.

### The browser

`examples/map` builds for the web (`crow build --target web main.co`).
`python3 -I tests/map/browser.py`, run from Lory's root after that build,
serves it on a free port of 127.0.0.1 and opens it in headless Chrome (or
the Chrome `LORY_CHROME` names). Nothing reaches the network. Every tile
asked of tile.openstreetmap.org is answered with a picture made for it, a
pale square whose colour tells its zoom, and anything else asked of another
host is refused. Then, as a reader would, it checks 14 things, and all 14
hold:

- the world asks for its tiles at zoom 2, and they cover the map;
- the zoom-in button is white with a dark cross, the scale bar's grey edge
  is at the bottom left, the credit's pale strip at the bottom right, and
  the Paris marker stands at its place;
- a slow drag moves the tiles' edges exactly as far as the pointer went,
  100 pixels;
- the wheel brings zoom 3's tiles, asked for and drawn;
- the Tokyo button flies the map there, its tiles asked for at zoom 9, and
  its cafés are drawn in clusters;
- a press on Tokyo's marker opens its popup above it;
- nothing was thrown, and nothing else was asked of the network.

`--shots DIR` keeps a picture of each step. It needs Chrome and Python's own
library.

### In a headset

The map is drawn on a headset's panel as on a screen, and the ray, where it
meets the panel, is its pointer. A thumbstick pushed is a wheel where the
ray rests (Lory's rule), so it zooms the map about the ray's point: away to
zoom in, back to zoom out. The trigger presses a marker, a shape, a cluster
or a button. Held while the ray moves, it drags the map, as Lory's pointer
drags anything. A test block holds the zoom, the place kept under the ray,
and the press. The drag by a ray is Lory's, and is not tested here. In AR
the map stands in the room as a solid panel, because its box is drawn
opaque: a plain light grey (Leaflet's #ddd) under its tiles.

## What the host would need

- **Geolocation.** crow.js has no call for the browser's geolocation, and
  an unknown `@` call throws. Until it has one, the program hands the
  device's place to `located` or `locate`, and the map also takes a
  `position` the page says (`{"what": "position", "id": …, "lat": …,
  "lng": …, "accuracy": …}`). What the page would need: a call
  `@locate` (once, or watching) answered by that `position`, or by a
  `failed` one, in a later frame's `said`.
- **Fullscreen.** A fullscreen button needs a call `@fullscreen` that the
  page answers on the reader's press. It is not built.
- **Part of an image, and an image's opacity.** A coarser tile drawn under a
  finer one is drawn whole, at its scale, and clipped by the map's box,
  because Lory's `image` draws a whole picture. An `image_part` (a part of
  the picture by its corners) would draw only the quarter needed. A tile
  fades in by its vertices' opacity, which the map sets itself, relying on
  Lory's vertex layout. A Lory call for an image drawn at an opacity would
  be the right way.
- **A turned image.** Turning the map (Mapbox's bearing) would need tiles
  drawn turned. It is not built (see below).

## Where Map differs from Leaflet, and why

- **The credit** starts with Lory's name, where Leaflet's starts with its
  own.
- **The wheel** takes Leaflet's Mac rule everywhere (its pixels divided
  by three times the pixel ratio), because Lory's page does not say what
  platform it runs on. On Windows Leaflet divides them by twice the ratio,
  and in Chrome on Linux by the ratio alone.
- **Markers** are Lory's own drawing of a pin, of Leaflet's size and
  anchor, not Leaflet's picture, or one of Lory's icons.
- **Tiles held** are the 160 least lately drawn, rather than Leaflet's
  buffer of two tiles around the view (keepBuffer).
- **Numbers in Leaflet's documents that its code does not use.** Its
  documents give inertiaDeceleration as 3000, but its code uses 3400. They
  give a pan's easeLinearity as 0.25, but a pan given none eases with 0.5
  (a power of 2). Map does what Leaflet's code does.
- **Clusters and heat** are Map's own design. Leaflet leaves them to
  plugins, and Mapbox's are not open source.

## The example

`examples/map` is a world map in OpenStreetMap's tiles, credited "©
OpenStreetMap contributors". Over it are shapes drawn for it: a ring about
Paris with its middle cut out (a tooltip), a triangle of Paris, London and
Brussels (a popup), three zones east of Paris filled by their rank, a
dashed road from Paris to Marseille, and a circle of 25 km about London.
Five markers have popups, Lima's a pin of Lory's icons. Eighty cafés of a made-up survey of Tokyo are
clustered, and sixty points of a made-up count about Sydney are a heatmap.
A row of buttons above the map flies it to Paris, London, Tokyo, Sydney or
Lima, or back to the world, and says its zoom. It has zoom buttons and a
scale bar. Drag it and let it go, turn the wheel, double click, press + or
- or the arrows, draw a box with Shift, or pinch it on a phone. The
example's tests and its web build are above. Its tiles are fetched by the
reader's browser; its tests use no network.

## The survey's rows

The rows of survey/geo3daudio.md for Mapbox GL JS and Leaflet. "Built and
tested" means a test block or the reference holds it. "Built, untested"
means the parts are built and the program composes them, as said.

### Mapbox GL JS: maps and geolocation

| Rows | Status |
|---|---|
| simple-map, simple-interactions | Built and tested: a map at a centre and zoom, with the default gestures. |
| standard-interactions | Built and tested in Leaflet's form: a feature pressed is told by its id, and the one under the pointer is lit. The featuresets of Mapbox's Standard style are not built: Map has no vector style. |
| map-tiles | Built and tested: a template with `{z}`, `{x}`, `{y}` and `{s}`, 256 pixel tiles. |
| satellite-map | Built, untested: any raster tile server's template. Labels over imagery would be a second layer of tiles, and a map draws one. |
| wms | Not built: a WMS tile's address needs its box in Web Mercator's metres (`{bbox-epsg-3857}`). `geo.metres` reckons them; the template's word is not yet filled in. |
| vector-source, pmtiles-vector-source, custom-style-id | Not built: vector tiles are drawn by a style's layers, with labels placed along lines, and Map draws raster tiles. |
| setstyle, style-switch | Built, untested, for raster tiles: `tiles[m, other]` swaps the layer and keeps the view. |
| check-for-support | Nothing for the map to do: Lory's page needs WebGL2 and says so where there is none. |
| map-projection, projections | Not built: Map is Web Mercator only (Leaflet's EPSG3857). The web's raster tiles are cut in it. |
| globe-spin | Not built: no globe. A flat map turned slowly east is the program's `pan_by` each frame. |
| render-world-copies | Built and tested: the tiles go round the world, side by side. Shapes and markers are drawn once, where their longitudes put them, as Leaflet draws them. Turning the copies off (noWrap) is not built. |
| line-across-180th-meridian | Built, untested: a line whose longitudes run past 180 is drawn on across it, as GeoJSON gives it. |
| fitbounds, initialize-with-bounding-box, zoomto-linestring | Built and tested: `fit_bounds` is held to Leaflet's numbers. A map starts fitted when the program fits it before its first frame. A line's box is its feature's `south`, `west`, `north` and `east`. |
| restrict-bounds | Built and tested: `bounded`, with its viscosity. |
| center-on-feature | Built, untested: the click told with the feature's id, then `fly_to` its middle (`features.middle_of`). |
| locate-user | Built and tested in part: the device's place drawn as a dot in its accuracy circle, told as `located`, and `locate` flies there. The browser's own geolocation needs the host (above). Following the device as it moves is the program's `located` each time it hears. |
| mouse-position | Built, untested: `place_under` the pointer. |
| measure | Built, untested: the clicks are told with their places, and `geo.distance` sums a line's legs on the haversine. Turf measures on a radius 8.8 m larger. |
| playback-locations, scroll-fly-to | Built, untested: flights the program starts on a timer or as its page scrolls. |
| toggle-worldviews, language-switch, local-ideographs, mapbox-gl-rtl-text, variable-label-placement, switch-symbol-style-pitch | Not built: a map's labels are in its raster tiles. Map writes no words on the map but its popups, tooltips, cluster counts and controls. |
| forward-geocode-custom-data | Not built as a control: a gui field filtering the program's own places, then `fly_to`. |
| mapbox-gl-geocoder and its eight variants, point-from-geocoder-result, mapbox-gl-directions | Not built: they ask Mapbox's search and routing services, which need an account and a key. Showing a result (a marker, a flight) is built. |
| mapbox-gl-compare | Not built: two maps side by side work (two `show` calls, two ids), but keeping their cameras together and a sliding divider are not built. |
| third-party | Nothing to build. |
| transform-request | Not built: a tile's address is its template's, and the page fetches it without headers. |
| indoor-mapping, indoor-mapping-custom-data | Built, untested: a floor is a layer, hidden and shown (`hide_layer`, `show_layer`). |
| queryrenderedfeatures | Built and tested for a point: what is under a press is told. |
| queryrenderedfeatures-around-point, using-box-queryrenderedfeatures | Not built: a box drawn with Shift zooms; it does not select. |
| filter-features-within-map-view | Built, untested: `bounds_shown` against each feature's box. |
| query-similar-features, within-expressions, data-join | Not built as expressions: the program filters and joins its own data in Crow and adds what it keeps as a layer. |
| query-terrain-elevation, icons-above-3d-buildings, marker-horizon-aligned | Not built: no terrain, buildings or pitch. |
| fallback-image | Built in part: a tile that fails is given up, and the coarser tile held stays in its place. |

### Mapbox GL JS: controls, popups, markers

| Rows | Status |
|---|---|
| navigation | Built and tested: the zoom buttons. The compass that resets the bearing is not built, because Map does not turn. |
| navigation-scale | Built and tested: the scale bar, held to Leaflet's numbers. |
| fullscreen | Not built: it needs the host (above). |
| attribution-position | Built and tested at the bottom right only. The controls' corners are Leaflet's and fixed. |
| game-controls | Built and tested in Leaflet's form: the arrows pan and + and - zoom. Flying by W, A, S and D is the program's keys and `pan_by`. |
| popup, set-popup, popup-on-click, polygon-popup-on-click | Built and tested: a popup at a place, bound to a marker or a shape, opened by a press, toggled by its marker, closed by the map or its button. |
| popup-on-hover, hover-tooltip | Built and tested: a tooltip while the pointer rests on its feature. A popup on hover is the program's `open_popup_of` when `hover` is told. A tooltip that follows the pointer (sticky) is not built. |
| hover-styles | Built, untested: the feature under the pointer is drawn lit. |
| color-switcher | Built, untested: `restyle`. |
| toggle-layers | Built and tested: `hide_layer` and `show_layer`. |
| toggle-interaction-handlers, disable-scroll-zoom, interactive-false | Built and tested: `hands` turns each off, and a hand turned off leaves the view as it was. |
| disable-rotation | Nothing to turn off: Map does not turn. |
| cooperative-gestures | Not built. |
| filter-markers, filter-markers-by-input, toggle-marker-visibility | Built, tested in part: a layer for each kind hidden or shown, or a marker taken away (`remove_feature`) and added again. The input that filters is a gui field. |
| marker-event-listeners | Built and tested for a click. Markers are not dragged, so there are no drag events. |
| add-a-marker | Built and tested: a marker at a place, its point on it. A marker in a colour of the program's is one of Lory's icon pins (`glyph`). An offset is not built. |
| custom-marker-icons | Built and tested for Lory's icons (`glyph`); built, untested, for a picture the page has loaded (`icon`). A marker made of other elements is drawn by the program at `point_on`. |
| drag-a-marker | Not built: a marker pressed is a click, and no marker is dragged (Leaflet's `draggable`). |
| cluster-html | Not built: a cluster is a disc with its count, not a chart. |
| display-and-style-rich-text-labels, change-case-of-labels, set-scale-factor, filter-symbols-expression, replace-standard-style-label | Not built: Map draws no labels on the map. |

### Mapbox GL JS: data, images, layers

| Rows | Status |
|---|---|
| cluster | Built and tested: a radius, counts, a press zooms to where the cluster comes apart, and every point alone at the highest zoom. The steps of colour and size are Map's own. |
| heatmap-layer | Built and tested: a radius and the colour of density. A point's weight, an intensity by zoom and the fade into circles are not built. |
| data-driven-circle-colors, visualize-population-density | Built and tested for steps of a number (`fill_steps`) and words (`fill_match`), polygons and circles alike. Colours interpolated between stops, and extrusions, are not built. |
| updating-choropleth, live-geojson, live-update-feature | Built and tested: `set_geojson` draws a layer anew from new data, and `fill_steps` again recolours it. |
| geojson-markers, geojson-line, geojson-polygon, multiple-geometries | Built and tested: every GeoJSON geometry, points as markers. A line's caps and joins are Lory's own. |
| external-geojson | Built, untested: the program reads the text (its own file, or what its page fetched) and hands it to `add_geojson`. Map fetches nothing itself. |
| geojson-layer-in-slot | Built and tested: layers are drawn in the order first added, and marks over every shape. |
| geojson-layer-in-stack | Not built: a layer cannot be put before another that was added earlier. |
| add-image, add-image-generated | Built, untested, for markers: a page picture as a marker (`icon`). |
| add-image-missing-generated, add-image-stretchable, custom-colorized-vector-icons, fill-pattern, line-pattern, line-gradient | Not built: Lory fills with colours, and stretches no picture by its parts. |
| data-driven-lines | Not built: steps colour fills, not strokes. |
| image-on-a-map, georeference-imagery, video-on-a-map, canvas-source, animate-images, add-image-animated | Not built: no layer of pictures over a box of places. A picture over a box is `lory.image` at its corners' `point_on`, clipped by the program. |
| adjust-layer-opacity, fill-opacity-transition | Not built: a tile layer's opacity, and styles that change by themselves over time. |
| clip-layer, clip-layer-building | Not built: no 3D. |
| raster-particle-layer, rain, snow, hillshade | Not built: they need data rasters, an elevation model, or Mapbox's weather effects. |

### Mapbox GL JS: 3D, camera and motion

| Rows | Status |
|---|---|
| 3d-buildings, 3d-extrusion-floorplan, change-building-color-based-on-zoom-level, dancing-buildings, highlight-buildings-standard, add-terrain, add-fog, add-3d-model and its five variants, custom-style-layer, elevated-line, elevation-along-line, field-of-view, set-perspective, pitch-and-distance-from-center, offset-vanishing-point-with-padding, free-camera-point, free-camera-path | Not built: Map is Leaflet's flat map, with no pitch, terrain, extrusions or models. lory.space draws in 3D. A map's picture on a plane in a scene is not built. |
| flyto | Built and tested: Leaflet's flyTo path ends exactly at its target. |
| flyto-options | Built and tested: a flight's length in seconds. Leaflet's path has no speed or curve to set (ρ is 1.42). Fog and terrain are not built. |
| jump-to | Built and tested: `at`. |
| camera-animation | Built and tested: `ease_to` lands where it was sent. rotateTo is not built. |
| animate-camera-around-point | Not built: no bearing. |
| animate-a-line, animate-point-along-line, animate-point-along-route, animate-marker | Built, untested: the program draws a layer anew each frame (`set_geojson`), or takes a marker away and adds it again further on. A point a part of the way along a line is the program's reckoning. |
| animate-ant-path, animate-marker-on-appearance, drag-a-point, appearances | Not built: dashes that move, markers that drop in, points dragged, and appearance states. |
| timeline-animation | Built, untested: a gui slider picks the data shown (`set_geojson` or `fill_steps`). |
| set-config-property, initial-config-property (light presets) | Not built: they configure Mapbox's Standard style. |

### Leaflet

| Class | Status |
|---|---|
| Map | Built and tested in the main: centre, zoom, minZoom, maxZoom, maxBounds and its viscosity, zoomSnap, zoomDelta, inertia, closePopupOnClick, boxZoom, doubleClickZoom, dragging, keyboard and keyboardPanDelta, scrollWheelZoom with wheelDebounceTime and wheelPxPerZoomLevel, pinch zoom, zoomControl, attributionControl. Methods: setView (`at`), zoomIn, zoomOut, setZoomAround (`camera.zoom_around`), fitBounds, panTo, panBy, flyTo, flyToBounds, setMaxBounds (`bounded`), getCenter and getZoom (the map's own fields), getBounds (`bounds_shown`), getBoundsZoom, project, unproject, distance, wrapLatLng, openPopup, closePopup, locate. Events: click, popupopen, popupclose, locationfound and move, as `happened`. Not built: other CRSs, worldCopyJump, bounceAtZoomLimits, tapHold, panes, layer events, contextmenu, and the rest of the DOM's events. |
| Map handlers | Built and tested: each turned on and off by `hands`, and one turned off leaves the view as it was. |
| Map option types | Built and tested: a jump (`at`) moves at once, fitBounds' padding, and a highest zoom for a fit (`geo.fit`'s `most`). LocateOptions' watching is the program's. |
| Marker | Built and tested: a pin of Leaflet's size, its point on its place, its popup and tooltip, its click. Not built: keyboard, title, alt, zIndexOffset, opacity, rotation, riseOnHover, draggable. |
| Icon / DefaultIcon | Built, untested: a picture's size and anchor (`icon`). Built and tested: one of Lory's icons, its square's size and its point (`glyph`). A picture's shadow is not built; Lory's pin has its own. |
| DivIcon | Not built: a marker of HTML. The program draws any mark of Lory's at `point_on`. |
| DivOverlay, Popup | Built and tested: 50 to 300 pixel words, autoPan 5 pixels in, a close button, autoClose, closeOnEscapeKey, closePopupOnClick, a marker's toggle. Not built: keepInView, maxHeight, className. |
| Tooltip | Built and tested: shown while the pointer rests, direction `auto`. Not built: permanent, sticky, opacity. |
| GridLayer | Built and tested: 256 pixel tiles, the zooms a layer has (minNativeZoom and maxNativeZoom scale the nearest), wrapping, updateInterval, a 200 ms fade. Not built: opacity, zIndex, bounds, tile events. |
| TileLayer | Built and tested: `{s}`, `{z}`, `{x}`, `{y}`, `{r}`, the subdomain by (x + y) mod their count, tms (`{-y}`). Not built: zoomOffset, zoomReverse, detectRetina, errorTileUrl. |
| TileLayer.WMS | Not built (see wms above). |
| ImageOverlay, VideoOverlay, SVGOverlay | Not built (see image-on-a-map above). |
| Path | Built and tested: stroke, color, weight, opacity, fill, fillColor, fillOpacity, a dash of one length on and one off. Caps and joins are Lory's own. |
| Polyline | Built and tested: its middle (getCenter) and LineUtil's simplify, held to Leaflet's numbers. A line is drawn as given, not simplified. |
| Polygon | Built and tested: holes, even-odd filling, a hole not pressed, its middle. |
| Rectangle | Built, untested: a polygon of four corners. |
| Circle | Built and tested: a radius in metres, its pixels held to Leaflet's. |
| CircleMarker | Built and tested: a radius in pixels (`circles`; Leaflet's is 10). |
| Renderer / SVG / Canvas | Lory draws every shape itself, as Leaflet's Canvas does. A stroke is pressed within half its width. |
| LayerGroup, FeatureGroup | Built and tested: a layer by name, added to, emptied, a feature taken away, hidden and shown, restyled. A group's bounds are not built. |
| GeoJSON | Built and tested: every geometry type, Features and collections, a style for a layer, properties as words and numbers, points as markers or circles, longitude and latitude swapped. filter and onEachFeature are the program's loop. |
| Control | Built: the three controls at Leaflet's corners. Other corners are not built. |
| Control.Zoom | Built and tested: + and -, a step (Shift: three), greyed at the ends. Its words and titles are not built. |
| Control.Attribution | Built and tested: a prefix and the tiles' credit. Credits of other layers are not built. |
| Control.Layers | Not built as a control: `hide_layer`, `show_layer` and `tiles` are what it would call, and its list is a gui one. |
| Control.Scale | Built and tested: maxWidth 100, metric and imperial, held to Leaflet's numbers. |
| Control.Fullscreen | Not built: it needs the host (above). |
| LatLng | Built and tested: distanceTo, wrap, toBounds, equals (`geo.same_place`). |
| LatLngBounds | Built and tested in part: `geo.Bounds`, a view's bounds and fitting. extend, contains, intersects and pad are not built. |
| Point, Bounds | Records (`geo.Point`). Their arithmetic is Crow's own. |
| CRS | Built and tested: EPSG3857. EPSG4326, EPSG3395 and Simple are not built. |
| Projection | Built and tested: SphericalMercator (`geo.metres`, R = 6,378,137 m). LonLat and the ellipsoid's Mercator are not built. |
| Transformation | Built and tested inside `project` and `unproject`, not as a record of its own. |
| LineUtil | Built and tested: simplify, the distance to a segment, polylineCenter. clipSegment is not built, because the map's box clips. |
| PolyUtil | Built and tested: polygonCenter. clipPolygon is not built (the box clips). |
| DomEvent, DomUtil, Draggable | Draggable's clickTolerance is built and tested. Lory has no DOM for the helpers. |
| Util, Class, Evented, Layer, Handler | A template filled in is built and tested. Events are `happened`, and classes are Crow's records. |
| Locate | Built and tested in part (see locate-user above). |

## The catalog's rows

These are the rows of [README.md](README.md) whose home is `map`.

| Catalog row | Status |
|---|---|
| Map object, view and events | Built and tested |
| Map gestures and interaction handlers | Built and tested; cooperative gestures and rotation are not built |
| Map controls and interaction toggles | Zoom buttons, scale bar, credit and hands built and tested; fullscreen needs the host; a layers control is the program's |
| Map creation, styles and sources | Raster tiles built and tested; vector tiles and styles are not built |
| Raster tile layers and WMS | Built and tested; WMS is not built |
| Vector shapes and GeoJSON layers | Built and tested; patterns, gradients, opacity transitions and clipping are not built |
| Markers (custom, draggable, filterable, clustered) | Built and tested, Lory's icon pins among them; dragging markers is not built |
| Data visualisation layers (clusters, heatmap, choropleth, particles, weather) | Clusters, heatmap, choropleths and live data built and tested; particles and weather are not built |
| Camera movement, bounds and fly-to | Built and tested; orbiting a point needs a bearing (not built) |
| Coordinates and bounds | Built and tested in part |
| Projections, CRS and geometry utilities | Web Mercator built and tested; other projections are not built |
| Projections, globe and world copies | World copies of the tiles built and tested; the globe and other projections are not built |
| Geolocation (locate the user) | Built and tested from the program; the browser's place needs the host |
| Pointer position and distance measuring | Built, untested (`place_under`, `geo.distance`) |
| Feature queries and filters | A point's query built and tested; boxes and expressions are not built |
| Evented base class and DOM utilities | `happened`, and the click tolerance, built and tested; no DOM |
| Animated lines, points and images on the map | Built, untested, by a layer drawn anew each frame; images and moving dashes are not built |
| Image, video and canvas overlays | Not built; a marker's picture is built |
| Labels, language, right-to-left and text styling | Not built: labels are in the tiles |
| Geocoder search and directions | Not built: they need Mapbox's services |
| Compare slider and indoor maps | Indoor floors as layers built, untested; the compare slider is not built |
| Style configuration properties (light preset, perspective) | Not built: Mapbox's Standard style |
| Map (extra) (Vuetify) | Built, untested: pressed, wheel and pinch zoom, the keyboard once pressed, and the tooltip under the pointer (it goes when the pointer leaves). A region picked by Enter is not built |

Three rows homed elsewhere lean on the map:

| Row | Home | What the map does |
|---|---|---|
| Marker icons (image and HTML) | `lory.icons` | A marker drawn as one of its pins, or any of its icons, in any colour and size, its point on the place (`glyph`), is built and tested; a picture's size and anchor (`icon`) are built; a marker of HTML is not |
| Popups and tooltips on the map | `lory.overlays` | Built and tested here, as Leaflet's |
| 3D terrain, buildings, models and free camera | `lory.space` | Not built: Map is flat |
