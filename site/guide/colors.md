# Colours and themes

`lory.colors` is Lory's colour module. A colour is a `lory.Color`: its sRGB
channels and its opacity, each from 0 to 1. The module reads and writes hex
codes, moves colours between linear light, OKLab, OKLCH, HSL and HSV, mixes
two colours in any of those spaces, makes a colour lighter, darker or more
saturated and fits it back inside sRGB, and lays a translucent colour over
another. It measures text on a background two ways: by contrast ratio (1 to
21) and by lightness contrast (Lc, signed: positive for dark text on light).

It also makes colour scales of its own: 31 named scales of twelve steps,
six grays and 25 accents, each in a light and a dark appearance, solid and
translucent. Each step has a role (1 the page, 2 a subtle background, 3 to 5
a control at rest, hovered and pressed, 6 to 8 borders and the focus ring, 9
and 10 solid fills, 11 and 12 text), and the two text steps keep at least
Lc 60 and Lc 90 on their scale's first two steps. From the scales come a
theme's tokens, which a program turns into the look it draws with. The
module draws nothing itself.

## Components

| Component | What it does |
|---|---|
| Hex codes | `parse` reads `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa`; `hex_of` and `hex_alpha_of` write them |
| Colour spaces | `to_oklab`, `to_oklch`, `to_hsl`, `to_hsv`, `to_linear` and back; `oklch` makes a colour fitted inside sRGB |
| Mixing | `mix` blends two colours in any space, hues the shorter way round |
| Moving a colour | `lighter`, `darker`, `saturated`, `fitted` |
| Laying over | `over` lays a translucent colour on another; `translucent` finds the least opaque colour that gives a solid one |
| Contrast | `luminance`, `contrast_ratio`, `contrast_lc`, and `on_color` for white or black text on a colour |
| Scales | `scale` and `step` give a scale's solid steps; `alpha_scale` its translucent ones; `black_overlay` and `white_overlay` twelve steps of each |
| Custom scale | `scale_from` makes a full scale with your brand colour as its step 9 |
| Pairing | `gray_for` gives the gray that goes with an accent; `on_solid` the text on a scale's solid steps |
| Named colours | Thirteen named colours with their hover, focus, pressed and active shades |
| Palette | 22 named colours, each with lighter, darker and accent shades |
| Theme | `theme` gives a page, panel, edges, ink, accent, a control's states, focus ring, overlay, shadow and four status colours for an accent, a gray and an appearance |

## Using it

```crow
use sys
use lory
use lory.gui
use lory.colors

fn look_of[t]
    look = gui.light[]
    look.page = t.page
    look.panel = t.panel
    look.edge = t.edge
    look.ink = t.ink
    look.muted = t.muted
    look.accent = t.accent
    look.on_accent = t.on_accent
    look.focus = t.focus
    look

fn draw[frame]
    t = colors.theme['indigo', 'auto', 'light']
    lc = colors.contrast_lc[t.ink, t.page]
    brand = colors.scale_from[colors.parse['#7c3aed'], 'light']
    c = lory.begin[frame]
    tree = gui.panel[[gui.heading['A theme'], gui.note['Ink on the page: Lc `fmt[lc, decimals = 1]`'], gui.button['go', 'Go']]]
    shown = gui.show_at[c, tree, 24.0, 24.0, 360.0, look_of[t]]
    c = lory.rect[shown.canvas, 24.0, 300.0, 48.0, 48.0, brand[8]]
    lory.end[c]

sys.frames[draw]
```

A scale is a list of twelve colours, step 1 first, so `brand[8]` is step 9.
`colors.theme` takes `auto` for the gray paired with the accent, or any gray
by name, and `dark` for the dark appearance.

## In a headset

Colours are the same on a panel in the room as on a page; a theme's look
draws the panels a headset shows.

## Try it

[Open the colours example](../../examples/colors/)
