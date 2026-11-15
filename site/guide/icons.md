# Icons

`lory.icons` draws icons by name, at any size and in one colour, from
Lory's own lines, discs, rings and boxes. There are about four hundred
names: every glyph a control needs (check, chevrons, arrows, search, menu,
settings, a loader), a broad general set (alignment, borders, text styles,
layout, files, people, media, devices) and the icons other parts of Lory
ask for (a table's sorts, a map's pins, a player's keys, an editor's lists,
a hotkey's keys). A name is written with hyphens or underscores, so
`eye-off` and `eye_off` are the same icon, and a few common words are
other names' drawings (`close` is `x`). A name the set does not draw is
drawn as a small outlined square.

Each icon is designed on a grid of 15 units and scaled to the square it is
drawn in. Its strokes are one unit wide with round ends and corners, so an
icon drawn 15 pixels wide from a whole pixel has crisp one-pixel lines.
Solid shapes (play, a filled star) are filled and edged with the same
stroke.

## Components

| Component | What it does |
|---|---|
| Icon | `icons.draw` draws a named icon in a square at a size and colour |
| Turned icon | `icons.turned` turns it about its middle, such as a section's chevron as it opens |
| Spinning icon | `icons.spinning` turns a loading icon once every two seconds by the frame's time |
| Flipped icon | `icons.flipped` mirrors it horizontally or vertically |
| Names | `icons.names` lists every name drawn; `icons.known` says whether a name is |

## Using it

```crow
use sys
use lory
use lory.icons

fn draw[frame]
    c = lory.begin[frame]
    c = lory.clear[c, lory.white[]]
    ink = lory.black[]
    c = icons.draw[c, 'check', 24.0, 24.0, 24.0, ink]
    c = icons.draw[c, 'magnifying-glass', 64.0, 24.0, 24.0, ink]
    c = icons.turned[c, 'chevron-right', 104.0, 24.0, 24.0, ink, 90.0]
    c = icons.flipped[c, 'arrow-right', 144.0, 24.0, 24.0, ink, 'horizontally']
    c = icons.spinning[c, 'loader', 184.0, 24.0, 24.0, ink, lory.time[c]]
    lory.end[c]

sys.frames[draw]
```

Strokes overlap where an icon's parts meet, so draw an icon in an opaque
colour (mix it with what is behind it with `lory.mix`) rather than a
translucent one.

## In a headset

An icon is drawn on a panel in the room just as on a page, in both eyes.

## Try it

[Open the icons example](../../examples/icons/)

## Not included yet

- Brand logos
