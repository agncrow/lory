# In a headset: VR and AR

Everything Lory draws runs in a headset as it runs on a screen. Nothing is
rebuilt for VR or AR: Lory reads a headset's controllers as it reads a mouse,
so every control, chart, map and scene works there.

## Entering a headset

A page built with `crow build --target web` enters a headset in one of two
ways:

- **The page's own buttons.** Enter VR shows where a headset can be entered,
  and Enter AR where one can show the room through the drawing.
- **A button the program draws.** When it is pressed, the program paints
  `[["@vr"]]` or `[["@ar"]]`. A browser enters only on the reader's press.
  If none can be entered, a later frame says so.

Each frame tells the program where it is:

| Field | What it says |
|---|---|
| `xr` | A headset shows this frame |
| `vr` | A headset can be entered |
| `ar` | A headset can be entered with the room seen through the drawing |
| `blend` | What is behind the drawing: `opaque` on a screen and in VR, `alpha-blend` or `additive` in AR |

## How things behave

- **Where the page is.** The page is drawn on a panel 2 m wide, 1.5 m ahead
  of the reader, with its top 1.8 m up. A program can instead stand several
  panels around the reader (`lory.xr`'s room, and the `window` package).
- **Pointing and pressing.** A controller's ray is the pointer where it
  meets the panel, and its trigger presses. The trigger held while the ray
  moves drags: sliders, sortable lists, carousels, maps and cards. The ray
  resting on a control is a hover, so hover states light up and tips show.
  A dot marks where the ray meets the panel.
- **Scrolling.** The thumbstick scrolls what the ray rests on, as a wheel
  does on a screen: lists, tables, scroll areas and sideways carousels.
- **Typing.** A headset's browser shows no keyboard over an immersive page,
  so Lory draws one under the field that has the focus, its keys pressed by
  the ray.
- **Menus and dialogs** are drawn on the panel over the page, placed as on a
  screen.
- **3D scenes** stand around the reader. The ray picks things, and the
  sticks walk and turn.

## AR: the room seen through

In AR, `lory.seen_through[c]` is true, and Lory clears each frame to
transparent, whatever colour the program asked for. The room shows wherever
nothing is drawn. Panels, cards and controls keep their own fills, so they
stand in the room as solid things.

A program in AR should draw no backdrop that would hide the room. A 3D scene
should leave out its ground, so its things stand on the reader's own floor.

## Trying it without a headset

Lory Studio (`studio/`) is a made-up headset in a desktop browser. It walks a
program as a headset would (entering, pointing, looking about, walking) and
compares each picture with the one kept for it.
