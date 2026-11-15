# Maps

The `map` package draws a map of the earth in any box of a Lory canvas:
raster tiles from OpenStreetMap or any tile server, GeoJSON shapes in
styles, markers with popups and tooltips, circles measured in metres,
clusters of points and heatmaps, zoom buttons, a scale bar and the tiles'
credit. A program writes `use map`, sets a map up once, and shows it each
frame. The map is kept between frames under its id, and `happened[id]`
says what the reader did to it.

The reader drags the map and throws it, zooms it with the wheel about the
pointer, with a double click (Shift zooms out), with two fingers or with a
box drawn while holding Shift, and once the map has the keyboard, pans it
with the arrow keys, zooms it with + and -, and closes a popup with Escape.
A press opens a marker's or a shape's popup, and a pointer resting on a
feature shows its tooltip. The program can fly the map from place to place
along a smooth path that zooms out and in again, fit it to a box of places,
or hold the view inside one.

## Components

| Component | What it does |
|---|---|
| Map | The earth in a box: dragged, thrown, zoomed and flown, its zooms held to a range and snapped |
| Tile layer | Raster tiles from a template with `{z}`, `{x}`, `{y}` and subdomains, faded in as they come, a coarser tile drawn until a finer one arrives |
| GeoJSON layer | Points, lines and polygons with holes, their Multi forms and collections, each in a style |
| Styles | A stroke's colour, width, opacity and dashes, a fill's colour and opacity, and fills chosen by steps of a number or by a word (a choropleth) |
| Marker | A pin, a picture or one of Lory's icons standing on a place |
| Circle | A circle of so many metres about a place |
| Popup | Words in a box that points at a feature, opened by a press, the map panned to show it whole |
| Tooltip | Words beside a feature while the pointer rests on it |
| Clusters | Points close together drawn as one disc with its count; pressing it zooms in to where it comes apart |
| Heatmap | Points spread into heat, coloured from clear through blue, teal and yellow to red |
| Zoom buttons, scale bar and credit | The map's controls, each shown or hidden |
| Device's place | A blue dot in a circle of how sure it is, and a flight there |

## Using it

```crow
use sys
use lory
use map

fn made[m]
    m = map.at[m, 48.8566, 2.3522, 5.0]
    m = map.tiles[m, map.openstreetmap[]]
    m = map.add_marker[m, 'paris', 48.8566, 2.3522, 'Paris']
    m = map.add_circle[m, 'near', 48.8566, 2.3522, 50000.0, map.filled[map.style[], '#3388ff', 0.2]]
    m = map.bind_tooltip[m, 'near', '50 km about Paris']
    map.add_geojson[m, 'road', '{"type": "LineString", "coordinates": [[2.35, 48.86], [4.84, 45.76]]}', map.stroke[map.style[], '#c0392b', 3.0]]

fn draw[frame]
    c = lory.begin[frame]
    m = map.of['world']
    if not m.made
        m = made[m]
    c = map.show[c, m, 0.0, 0.0, lory.width[c], lory.height[c]]
    for told in map.happened['world']
        if told.act eq 'click' and told.what eq 'paris'
            m = map.fly_to[map.of['world'], 48.8566, 2.3522, 12.0]
            map.keep[m]
    lory.end[c]

sys.frames[draw]
```

In a tree of Lory's controls the map is a drawn control,
`gui.drawn['world', 0.0, 600.0, 400.0, map.painter]`, kept by the program
with `map.keep[m]` before the tree is shown; its clicks and popups are
among the tree's events. The parts it is made of (`map.geo` for the
projection and its arithmetic, `map.camera` for moves, `map.grid` for
tiles, `map.features` for shapes and `map.points` for clusters and heat)
can be used alone.

## In a headset

The map is drawn on a panel, and the ray, where it meets the panel, is its
pointer: the thumbstick zooms about the ray's point, and the trigger
presses a marker, a shape, a cluster or a button, or drags the map while
held. In AR the map stands in the room as a solid panel.

## Try it

[Open the map example](../../examples/map/)

## Not included yet

- Vector tiles
- Rotating the map
- Projections other than Web Mercator, and a globe
- WMS tile servers
- The browser's own geolocation (the program hands the device's place to the map)
