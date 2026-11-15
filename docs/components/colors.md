# lory.colors: colours, contrast, scales and a theme's tokens

`lory.colors` (packages/lory/colors.co) is Lory's colour module. A program
writes `use lory.colors` and calls its functions as `colors.scale[…]`. A
colour is a `lory.Color[r, g, b, a]`: its sRGB channels and its opacity, each
from 0 to 1.

It does four things:

- **Conversions.** It reads and writes colours, moves them between colour
  spaces, mixes them, and lays translucent colours over others.
- **Contrast.** It measures text on a background by WCAG 2 and by APCA.
- **Scales.** It makes twelve-step scales of its own for every scale Radix
  Colors names.
- **Palettes and themes.** From those scales it makes Semantic UI's named
  colours, Vuetify's palette, and a theme's tokens.

It draws nothing and does not use gui. A program turns a theme's tokens into
the look it draws with: `examples/colors` makes a `gui.Look` from one.

## The vocabulary

### Reading and writing colours

| Function | What it answers |
|---|---|
| `parse[code]` | The colour of a CSS hex code: `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa`, the `#` optional. Any other text is black. |
| `is_hex[code]` | Whether a text is a hex code that `parse` reads. |
| `hex_of[c]`, `hex_alpha_of[c]` | The colour as `#rrggbb`, or as `#rrggbbaa` with its opacity (culori's formatHex and formatHex8). |

### Colour spaces

| Function | What it answers |
|---|---|
| `linear_channel[x]`, `srgb_channel[x]` | One channel in linear light, and back, by the sRGB curve (mirrored below 0). |
| `to_linear[c]`, `from_linear[c]` | The colour in linear light, and back. |
| `to_oklab[c]`, `from_oklab[x]` | The colour in OKLab (a `Lab[l, a, b, alpha]`), and back. A gray has no a or b. |
| `to_oklch[c]`, `from_oklch[x]` | The colour in OKLCH (an `Lch[l, c, h, alpha]`), and back. A gray's hue is missing (`nan`). |
| `oklch[l, c, h]` | The colour of an OKLCH lightness, chroma and hue, fitted inside sRGB. |
| `to_hsl[c]`, `from_hsl[x]`, `to_hsv[c]`, `from_hsv[x]` | The colour in HSL and in HSV (`Hsl`, `Hsv`), and back. A missing hue is read as 0. |
| `in_gamut[c]`, `fitted[c]` | Whether a colour lies inside sRGB. `fitted` brings it inside by lowering its OKLCH chroma alone (culori's clampChroma). |

### Mixing, moving and laying over

| Function | What it answers |
|---|---|
| `mix[a, b, t, space = 'oklab']` | The colour `t` of the way from `a` to `b`, mixed in `srgb`, `linear`, `oklab`, `oklch`, `hsl` or `hsv`. A hue goes the shorter way round, and a gray's missing hue takes the other colour's. |
| `lighter[c, amount]`, `darker[c, amount]` | The colour with `amount` more or less OKLCH lightness, its chroma and hue kept as far as sRGB holds them. |
| `saturated[c, amount]` | The colour with `amount` more OKLCH chroma (less where it is negative). |
| `over[top, bottom]` | A translucent colour laid over another (source over). |
| `translucent[solid, background]` | The least opaque colour (in whole 255ths) that, laid over `background`, gives `solid`. |

### Contrast

| Function | What it answers |
|---|---|
| `luminance[c]` | WCAG 2's relative luminance. |
| `contrast_ratio[a, b]` | WCAG 2's contrast ratio, from 1 to 21. It has no sign: the order of the two does not matter. |
| `apca_luminance[c]`, `apca_contrast[text_y, background_y]` | APCA's screen luminance, and its lightness contrast (Lc) of two luminances, by the W3 formula of APCA 0.0.98G-4g (apca-w3's sRGBtoY and APCAcontrast). |
| `apca[text, background]` | APCA's Lc of text on a background. It is positive for dark text on light (about 106 for black on white) and negative for light text on dark (about -108 for white on black). |
| `on_color[c]` | The text colour Vuetify writes on a colour, white or black (Vuetify's getForeground). |

### Scales

| Function | What it answers |
|---|---|
| `gray_names[]`, `accent_names[]`, `scale_names[]`, `is_scale[name]` | Radix's 6 grays, its 25 accents, all 31 scales, and whether a name is one of them. |
| `scale[name, appearance]` | A scale's twelve solid steps in `light` or `dark`, step 1 first. A name that is not a scale gives the neutral gray. |
| `step[name, appearance, k]` | One step, from 1 to 12. |
| `alpha_scale[name, appearance]` | The scale's twelve translucent steps. Each, laid over the appearance's page, is that step's solid. |
| `page_of[appearance]` | The page the translucent steps are laid over: white in light, the gray's step 1 in dark. |
| `black_overlay[]`, `white_overlay[]` | Twelve steps of black and of white at rising opacity, the same in both appearances (Radix's blackA and whiteA). |
| `scale_from[c, appearance]` | A scale of Lory's own with `c` as its step 9: a custom palette made from a brand colour. |
| `gray_for[accent]` | The gray Radix Themes pairs with an accent. |
| `is_bright[name]`, `on_solid[name]` | Whether a scale's solid steps take dark text (sky, mint, lime, yellow and amber), and the text that goes on them. |

### Named colours and palettes

| Function | What it answers |
|---|---|
| `semantic_names[]`, `named[name]` | Semantic UI's thirteen named colours, and the colour of one, made from Lory's scales. |
| `states_of[c, neutral]` | A colour's hover, focus, pressed (`down`) and active shades, as Semantic UI derives them with LESS (a `States`). |
| `named_states[name]` | A Semantic UI name with all it carries (a `Named`). That is its colour, its states, its light version for dark backgrounds, a soft background, the text on that background, and the text on the colour. |
| `palette_names[]`, `is_palette[name]`, `shade_names[name]` | Vuetify's 22 palette names, whether a name is one, and the shades a name has. |
| `palette[name, shade = 'base']` | A colour of Vuetify's palette: `base`, `lighten-1` to `lighten-5`, `darken-1` to `darken-4`, `accent-1` to `accent-4`. |

### Themes

| Function | What it answers |
|---|---|
| `theme[accent, gray, appearance]` | A theme's tokens (a `Theme`) for an accent, a gray (`auto` for the paired one) and an appearance. Danger is red, success green, warning amber and info blue. |
| `theme_with[accent, gray, appearance, danger, success, warning, info]` | The same, with the four status scales named. |

A `Theme` holds these tokens:

- `page` and `panel`.
- `surface`, a field's translucent fill, and `field`, that fill laid over a
  panel.
- `edge` (a subtle border) and `edge_strong` (a control's border).
- `ink` (text) and `muted` (quieter text).
- `accent`, `accent_hover`, `accent_soft`, `accent_text`, and `on_accent`
  (the text written on the accent).
- `hover` and `press` (a control's ground), and `focus` (the focus ring).
- `overlay` (behind a dialog) and `shadow` (under a raised layer).
- For each of `danger`, `success`, `warning` and `info`: the solid colour,
  `_soft`, `_text` and `on_`.

They resolve as Radix Themes 3.2.1 resolves its tokens:

| Token | Light | Dark |
|---|---|---|
| page | white | the gray's step 1 |
| panel | white | the gray's step 2 |
| surface | white at 0.85 | black at 0.25 |
| overlay | black overlay 6 | black overlay 8 |
| shadow | black overlay 3 | black overlay 5 |

The shadow is the widest layer of Radix's `--shadow-5`, the shadow under a
popover. Every other token is a step, in both appearances:

| Tokens | Steps |
|---|---|
| edge, edge_strong | the gray's 6 and 7 |
| ink, muted | the gray's 12 and 11 |
| hover, press | the gray's 4 and 5 |
| accent, accent_hover, accent_soft, accent_text | the accent's 9, 10, 3 and 11 |
| focus | the accent's 8 |
| each status, its `_soft` and `_text` | its scale's 9, 3 and 11 |

`on_accent` and each `on_` are `on_solid` of their scale.

## How the scales are made

Every step comes from curves of OKLCH lightness and chroma written in
colors.co. Each scale starts from a seed: the lightness, chroma and hue of its
step 9, chosen so that a name means the colour it means in Radix. A seed also
holds a few shape numbers: how its tints lean in hue, how early they take
chroma, and how pale the bright scales stay. No step is taken from Radix's
tables. Radix's published scales are only measured against, as shown below.

- **An accent in light.**
  - Steps 1 to 8 fall from white in lightness, a little more at each step.
    Their chroma rises towards step 9's, and their hue turns towards it.
  - Step 9 is the seed, and step 10 is 0.028 darker.
  - Steps 11 and 12 are found by halving. Each is the lightness at which
    the scale's text reaches Lc 70 and 93.5 on step 2, a margin above
    Radix's 60 and 90.
- **An accent in dark.**
  - Steps 1 to 8 rise from near black. Their chroma is low for the two
    backgrounds and rises from step 3.
  - Step 9 is the same solid as in light. Step 10 is 0.04 lighter (0.045
    for a bright seed).
  - Steps 11 and 12 reach Lc -62 and -91 on step 2.
- **A gray.** Steps 1 to 10 follow the gray's own curves, at the little
  chroma its seed has. Steps 11 and 12 reach Lc 75 and 99 on step 2 in
  light, and -61 and -95 in dark.
- **Fitting.** Each step is fitted into sRGB and rounded to whole 255ths, so
  a step's hex code is the step itself.
- **Alpha steps.** Each is `translucent[solid, page_of[appearance]]`.
- **Overlays.** Overlay step k has opacity (k / 12.5)^1.25, from about 0.04
  to 0.95.

## Behaviours held

Every behaviour below is a test block, in colors.co or
tests/colors/reference.co, and each block passes interpreted and compiled.

- **The order of the steps.** For every scale:
  - Steps 1 to 8 darken one after another in light and lighten in dark.
  - Step 12 is darker than step 11 in light and lighter in dark.
  - Step 12 has more contrast on step 2 than step 11 has.
  - An accent's step 9 is the same colour in both appearances.
- **Radix's contrast promise.** Step 11 meets APCA Lc 60 and step 12 meets
  Lc 90 as text on steps 1 and 2, for all 31 scales in both appearances.
  - That is 248 cases, held with the sign APCA gives each appearance.
  - Radix's own published scales miss 19 of these 248, mostly step 12 in
    dark (counted by the reference script).
- **Alpha steps.** Every alpha step of every scale, laid over its
  appearance's page, is its solid, to within 1e-12.
- **Overlays.** They rise in opacity, from above 0.03 to below 0.96. The
  white overlay has the black overlay's opacities.
- **Text on solid steps.**
  - The five bright scales take dark text on step 9; the rest take white.
  - On the bright scales, the text is the paired gray's step 12 in light,
    as Radix Themes writes `--accent-contrast`.
- **A custom scale** keeps its given colour as step 9, and its text steps
  keep the contrast promise on its step 2.
- **Semantic UI.** Its named colours' states are the same hex codes LESS
  writes, with Semantic UI's own hover, focus, down and active rules.
- **Vuetify.** The palette has Vuetify's names and each name's shades.
  From lighten-5 through the base to darken-4, each shade is darker than
  the one before, as Vuetify's are. Accent-1 to accent-4 darken where
  Vuetify's do.
- **Themes.**
  - Each token resolves to the step Radix Themes names for it.
  - A field's fill laid over a panel is the `field` token.
  - The dark overlay and shadow are stronger than the light ones.

## Parity

### Numbers from the libraries

`tests/colors/reference.mjs` runs each pinned library on fixed inputs and
writes `tests/colors/reference.json`. `tests/colors/reference.co` holds
lory.colors to it, number for number. Each answer is held to a stated
tolerance (exact for hex codes and for every text answer).

- **culori 4.0.2:**
  - 79 colours (26 fixed, 40 random, alpha codes and short codes), each
    with its sRGB, hex, linear light, OKLab, OKLCH, HSL and HSV, and its
    WCAG luminance.
  - 75 colours given in OKLCH, OKLab, HSL and HSV (gray, negative and
    wrapped hues among them), brought back to sRGB.
  - 360 mixes: 12 pairs, 6 spaces and 5 shares each.
  - 8 colours laid over others, and 29 colours fitted into sRGB.
  - 8 colours, each by 4 amounts, made lighter, darker, more saturated and
    less saturated.
- **apca-w3 0.1.9:** APCA's luminance of all 79 colours, and the Lc of 38
  pairs of text and background, beside culori's WCAG ratio.

In all, 4,135 numbers and 158 hex codes come from culori and apca-w3. The
tolerances:

| What is held | Tolerance |
|---|---|
| hex codes, parsed channels | exact |
| linear light, luminance, APCA luminance, colours laid over | 1e-15 |
| OKLab, OKLCH, HSL, HSV (hues to 1e-10°), colours given in a space | 1e-14 |
| mixes, the WCAG ratio | 1e-13 |
| fitting, lighter, darker and saturated, APCA's Lc | 1e-12 |

- **vuetify 3.7.6, with vue 3.5.13:**
  - The text getForeground puts on 276 colours (a 6×6×6 grid and 60 random
    ones). Every one is the same.
  - The 22 palette names and their 257 shade names.
- **semantic-ui-less 2.4.1, with less 4.2.0:**
  - The 13 names, and the four state rules as site.variables writes them.
  - The 264 shades LESS computes from those rules: 33 colours, each by the
    colour rules and by the neutral ones. Every hex code is the same.
- **@radix-ui/themes 3.2.1:**
  - The gray it pairs with each of its 26 accents.
  - The text it writes on each accent's step 9.
  - The page, panel, surface and overlay tokens in light and in dark, and a
    popover's shadow.
  - Held for indigo, amber, crimson and grass, in both appearances, with
    paired and named grays.

To make reference.json again, install the pinned libraries in a folder
outside Lory, then run the script from Lory's root:

    npm install --prefix <ref> --ignore-scripts culori@4.0.2 apca-w3@0.1.9 vuetify@3.7.6 vue@3.5.13 semantic-ui-less@2.4.1 less@4.2.0 @radix-ui/themes@3.2.1 @radix-ui/colors@3.0.0
    node tests/colors/reference.mjs <ref> tests/colors/reference.json

The script refuses a library whose installed version is not the pinned one.

### Nearness to Radix's scales

`@radix-ui/colors` 3.0.0 is installed only to measure Lory's scales against
it. Its values are not in Lory. The reference script writes the OKLCH
lightness and chroma of each of Radix's 744 steps (31 scales, 12 steps, light
and dark), rounded to 4 places. The test holds each of Lory's steps within a
tolerance of its own, and the means of both within 0.01.

Measured over all 744 steps, the mean difference is 0.0086 in lightness and
0.0073 in chroma.

| Step | Largest \|ΔL\| (where) | L tolerance | Largest \|ΔC\| (where) | C tolerance |
|---|---|---|---|---|
| 1 | 0.008 (brown, dark) | 0.01 | 0.012 (sky, dark) | 0.015 |
| 2 | 0.017 (red, dark) | 0.02 | 0.014 (sky, dark) | 0.015 |
| 3 | 0.014 (blue, dark) | 0.02 | 0.038 (yellow, light) | 0.04 |
| 4 | 0.017 (bronze, dark) | 0.02 | 0.033 (yellow, light) | 0.035 |
| 5 | 0.030 (brown, dark) | 0.035 | 0.043 (yellow, light) | 0.045 |
| 6 | 0.038 (brown, dark) | 0.04 | 0.033 (lime, dark) | 0.035 |
| 7 | 0.041 (brown, dark) | 0.045 | 0.036 (lime, dark) | 0.04 |
| 8 | 0.034 (bronze, dark) | 0.04 | 0.037 (lime, dark) | 0.04 |
| 9 | 0.008 (sage, dark) | 0.01 | 0.007 (sage, dark) | 0.01 |
| 10 | 0.013 (bronze, light) | 0.015 | 0.100 (yellow, dark) | 0.105 |
| 11 | 0.050 (violet, light) | 0.055 | 0.056 (yellow, dark) | 0.06 |
| 12 | 0.033 (tomato, dark) | 0.035 | 0.041 (amber, dark) | 0.045 |

Where Lory differs most, it differs on purpose:

- **Steps 11 and 12** are as light as the contrast promise allows, which is
  sometimes not where Radix put them.
- **Yellow's step 10 in dark** stays inside sRGB at Lory's lightness, so it
  has less chroma than Radix's.

### Both of Crow's modes

| File | Blocks | Truths |
|---|---|---|
| packages/lory/colors.co | 19 | 134 |
| tests/colors/reference.co | 17 | 12 truths and 17 assertions over the whole reference |
| examples/colors/main.co | 9 | 50 |

- **The test blocks.** Every block passes under `crow test` and under
  `crow test --compiled`.
- **Compiled against interpreted.** `crow test --compiled` runs plain test
  blocks in the interpreter, so a program was also run both ways. It wrote
  out every scale and alpha scale in both appearances, themes, the palette,
  the named colours, 17-digit conversions, mixes, moves and a custom scale.
  Its output under `crow run -i` and under compiled `crow run` was the same,
  line for line.

### The browser

- **The web build.** `examples/colors` builds for the web
  (`crow build --target web main.co`).
- **The browser check.** `python3 -I tests/colors/browser.py`, run from
  Lory's root, does this:
  1. It builds the example, unless `--built` is given.
  2. It asks lory.colors for every swatch's colour
     (`crow run -i tests/colors/swatches.co`).
  3. It serves the build on a free port of 127.0.0.1 and opens it in
     headless Chrome, 1400 by 900.
  4. It checks that every swatch is drawn in its colour where main.co puts
     it. That is 744 solid steps and the 24 overlay steps laid over their
     checkers.
  5. It checks that the pointer over a swatch outlines it.
  6. It checks that a click on a scale's name repaints the theme's controls
     in that scale's step 9.
  7. It checks that the page threw nothing and reported no error.
- **What it needs.** Chrome and Python's own library. Nothing is installed.

## The example

`examples/colors` draws two cards, light and dark:

- Each card has a row for every scale: its name, its twelve steps, and the
  Lc of its steps 11 and 12 on its step 2. A number below Radix's promise
  would be written in red.
- The last row holds the black overlay (light card) and the white overlay
  (dark card), over checkers.

Beside the cards is a theme, drawn by gui in a look made from the theme's
tokens:

- **Pickers.** A family and an accent, a gray (`auto` or one of six) and an
  appearance, each chosen by a select or tabs.
- **Controls.** A field, a slider, a toggle, a checkbox (alpha steps over
  checkers), and a button.
- **Statuses.** Chips for danger, success, warning and info, solid and soft.
- **Reading.** Lines saying what the pointer is over: a swatch's role, its
  hex, its alpha hex, and its Lc and WCAG ratio as text on its step 2.

A press on a scale's name makes that scale the theme's accent (or, for a
gray, its gray).

The look maps the tokens onto gui's `Look` this way:

| `gui.Look` field | Token |
|---|---|
| page, panel, ink, muted | page, panel, ink, muted |
| edge | edge_strong (gui draws controls' borders with it) |
| accent, on_accent | accent, on_accent |
| field, hover, press, focus | field, hover, press, focus |
| danger, success, warning | danger_text, success_text, warning_text (gui writes words in them) |
| scrim, shadow | overlay, shadow |

## The survey's rows

| Row (survey) | Status |
|---|---|
| Scales (31) (Radix Colors) | Built and tested. All 31 scales, 12 steps each, light and dark, alpha versions, and blackA and whiteA. The wide-gamut P3 versions are not built: Lory draws into an sRGB canvas. |
| Step meanings (Radix Colors) | Built and tested. The roles are held and steps 11 and 12 keep Lc 60 and 90 on steps 1 and 2 in every case. Step 9 takes white text except on the five bright scales, held to Radix Themes. |
| Palette composition (Radix Colors) | Built and tested. A brand scale and a gray (`gray_for`, held to Radix Themes for 26 accents), and status scales by name (`theme_with`). |
| Aliasing (Radix Colors) | Built and tested. A `Theme` is the aliases: tokens named by use, resolving to scale steps per appearance. |
| Usage/installation (Radix Colors) | Nothing to install: `use lory.colors`. The appearance is an argument, not a class on the page. |
| Custom palettes tool (Radix Colors) | Built, untested against Radix's tool. `scale_from` makes a scale from a colour, and its guarantees are tested. Radix's algorithm is not documented, so no step is compared. Its `surface`, `indicator` and `track` extras and wide-gamut input are not built. |
| Theme (Radix Themes) | Built and tested: `accentColor`, `grayColor` (auto or named) and `appearance`, with solid and translucent panels as tokens. Not built here: `radius`, `scaling`, `hasBackground`, and nesting a theme inside another (that is gui showing a subtree in another look). |
| ThemePanel (Radix Themes) | Not built as a component. The example's theme picker does what it does: accent, gray and appearance changed live. |
| Theme tokens: Color (Radix Themes) | Built and tested: accent and gray steps, page, panel, surface, overlay, focus and the text on the accent. Not built: `--accent-surface`, `--accent-indicator`, `--accent-track` and `highContrast`, which belong to components. |
| Theme tokens: Shadows (Radix Themes) | The shadow's colour is built and tested. Its layers, offsets and blurs are gui's to draw. |
| Theme tokens: Radius, Spacing/Scaling, Typography, Breakpoints, Cursors (Radix Themes) | Not built here: they are not colours. gui's layout scale holds spacing and type. |
| Dark mode (Radix Themes) | Built and tested: every scale and token takes the appearance, and a frame drawn in the other one swaps them all at once. Following the system's preference is not built: it needs the host to say it. |
| Styling approach (Radix Themes) | Nothing to build: Lory has no CSS. |
| Theming (Semantic UI) | Built and tested: hover, focus, down and active shades derived from any colour, as LESS derives them. Changing a colour changes all its shades. Its three levels of theme files are a build-time scheme with nothing to match. |
| Site (Semantic UI) | The 13 named colours are built and tested, made from Lory's scales rather than Semantic UI's hex codes. Its fonts, header sizes, spacing and radius are not colours. |
| Reset, Glossary (Semantic UI) | Nothing to build: no CSS to reset, and pages of history. |
| Theme provider (Vuetify) | Tokens built and tested. A subtree in another theme is gui showing it in another look. `with-background` is the `page` token. |
| App theme prop (Vuetify) | Built: light or dark is the appearance argument. |
| Colors palette (Vuetify; the brief's row) | Built and tested: 22 names, base, lighten, darken and accent shades, and the text on a colour (getForeground). |
| Defaults provider, Locale provider (Vuetify) | Not colours. |
| Color picker, Color input (Vuetify) | Not built: they are controls, for `lory.pickers`. The hex, RGBA, HSLA and HSVA conversions they need are built and tested here. |

### The catalog's rows for lory.colors

These are the rows of [README.md](README.md) whose home is `lory.colors`.

| Catalog row | Status |
|---|---|
| Colour tokens and accent/gray pairing | Built and tested |
| Dark mode and colour-scheme switching | Built and tested (the system's preference needs the host) |
| Theme provider and theme panel | Tokens built and tested; the panel is the example's |
| Global reset, site variables and defaults | The site's named colours built and tested; reset and defaults are not colours |
| Aliasing, Palette composition, Scales (31), Step meanings | Built and tested |
| Custom palettes tool | Built, untested against Radix's tool |
| Usage/installation | Nothing to install |
| Shadow, breakpoint and cursor tokens | The shadow's colour built and tested; the rest are not colours |
| Radius, spacing and scaling tokens; Typography tokens | Not built: not colours (for gui's layout) |
| Component styling, theming and parts; Picker styling hooks; Table skins; Table styling and localisation | Not built here: styling components is gui's and the components' own |
