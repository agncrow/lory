// Lory's colours held to the libraries they follow. This script runs each
// pinned library on fixed inputs and writes reference.json; the Crow test
// beside it (tests/colors/reference.co) holds lory.colors to those answers,
// number for number.
//
//   culori 4.0.2            hex, linear light, OKLab, OKLCH, HSL and HSV both
//                           ways; mixing in each space; laying one colour over
//                           another; fitting into sRGB (clampChroma); lighter,
//                           darker and more saturated in OKLCH; WCAG 2
//   apca-w3 0.1.9           APCA 0.0.98G-4g: sRGBtoY and APCAcontrast
//   vuetify 3.7.6           getForeground (the text on a colour) and the
//                           palette's names and shades (vue 3.5.13 beside it,
//                           which vuetify's utilities import)
//   semantic-ui-less 2.4.1  the named colours' hover, focus, down and active
//   less 4.2.0              shades, which LESS computes from site.variables
//   @radix-ui/themes 3.2.1  the gray Radix Themes pairs with each accent, the
//                           text on each accent's solid step, and what its
//                           colour tokens and a popover's shadow resolve to
//   @radix-ui/colors 3.0.0  measured only: each step's OKLCH lightness and
//                           chroma, to say how near Lory's own scales come
//
// Install them in a folder of their own, outside Lory, then run this from
// Lory's root with that folder and the file to write:
//   npm install --prefix <ref> culori@4.0.2 apca-w3@0.1.9 vuetify@3.7.6 \
//     vue@3.5.13 semantic-ui-less@2.4.1 less@4.2.0 @radix-ui/themes@3.2.1 \
//     @radix-ui/colors@3.0.0
//   node tests/colors/reference.mjs <ref> tests/colors/reference.json
//
// A missing hue (a gray's) is written -1000. Colours are [r, g, b, alpha] in
// sRGB from 0 to 1, unclamped where the library leaves them unclamped.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const ref = path.resolve(process.argv[2] || '');
const out = process.argv[3];
if (!process.argv[2] || !out) {
  console.error('usage: node tests/colors/reference.mjs <folder of the pinned libraries> <reference.json>');
  process.exit(2);
}
const modules = path.join(ref, 'node_modules');
const require = createRequire(path.join(ref, 'reference.js'));
const load = name => require(path.join(modules, name));
const importFrom = file => import(pathToFileURL(path.join(modules, file)).href);
const version = name => JSON.parse(fs.readFileSync(path.join(modules, name, 'package.json'), 'utf8')).version;

const pinned = {
  'culori': '4.0.2', 'apca-w3': '0.1.9', 'vuetify': '3.7.6', 'vue': '3.5.13',
  'semantic-ui-less': '2.4.1', 'less': '4.2.0', '@radix-ui/themes': '3.2.1', '@radix-ui/colors': '3.0.0',
};
for (const [name, want] of Object.entries(pinned)) {
  const got = version(name);
  if (got !== want) throw new Error(`${name} is ${got} in ${ref}, and this script is pinned to ${want}`);
}

const culori = load('culori/bundled/culori.cjs');
const apca = await importFrom('apca-w3/src/apca-w3.js');
const vuetify = await importFrom('vuetify/lib/util/colorUtils.mjs');
const vuetifyColors = (await importFrom('vuetify/lib/util/colors.mjs')).default;
const less = load('less');
const radix = load('@radix-ui/colors');
const matching = load('@radix-ui/themes/dist/cjs/helpers/get-matching-gray-color.js');

// ---- inputs ----

// a fixed run of pseudo-random numbers (a linear congruential generator), so
// the inputs are the same at every run
let seed = 20261114;
const random = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const byte = () => Math.floor(random() * 256);
const hex2 = n => n.toString(16).padStart(2, '0');

const fixed = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff',
  '#777777', '#808080', '#010101', '#0a0a0a', '#0b0b0b', '#fefefe', '#3a7bd5', '#e5484d', '#ffc53d',
  '#0090ff', '#30a46c', '#8e4ec6', '#f76b15', '#7c3aed', '#123456', '#fedcba', '#c0ffee', '#bada55'];
const codes = [...fixed];
for (let i = 0; i < 40; i++) codes.push('#' + hex2(byte()) + hex2(byte()) + hex2(byte()));
for (let i = 0; i < 8; i++) codes.push('#' + hex2(byte()) + hex2(byte()) + hex2(byte()) + hex2(byte()));
codes.push('#f80', '#ABC', '#1234', 'FFEEDD', '#fF00Aa80');

const rgbOf = c => {
  const x = culori.rgb(c);
  return [x.r, x.g, x.b, x.alpha === undefined ? 1 : x.alpha];
};
const hue = h => (h === undefined ? -1000 : h);
const alphaOf = c => (c.alpha === undefined ? 1 : c.alpha);

// ---- conversions ----

const colors = codes.map(code => {
  const c = culori.parse(code);
  const lrgb = culori.converter('lrgb')(c);
  const lab = culori.converter('oklab')(c);
  const lch = culori.converter('oklch')(c);
  const hsl = culori.converter('hsl')(c);
  const hsv = culori.converter('hsv')(c);
  return {
    code,
    rgb: rgbOf(c),
    hex: culori.formatHex(c),
    hex8: culori.formatHex8(c),
    linear: [lrgb.r, lrgb.g, lrgb.b],
    oklab: [lab.l, lab.a, lab.b],
    oklch: [lch.l, lch.c, hue(lch.h)],
    hsl: [hue(hsl.h), hsl.s, hsl.l],
    hsv: [hue(hsv.h), hsv.s, hsv.v],
    wcag: culori.wcagLuminance(c),
    apca_y: apca.sRGBtoY([Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)]),
  };
});

// colours given in a space, turned into sRGB (unclamped: some lie outside)
const backs = [];
for (let i = 0; i < 24; i++) {
  const l = random(), cc = random() * 0.4, h = random() * 360;
  backs.push({ space: 'oklch', given: [l, cc, h], rgb: rgbOf({ mode: 'oklch', l, c: cc, h }) });
}
backs.push({ space: 'oklch', given: [0.5, 0, -1000], rgb: rgbOf({ mode: 'oklch', l: 0.5, c: 0 }) });
for (let i = 0; i < 16; i++) {
  const l = random(), a = random() * 0.8 - 0.4, b = random() * 0.8 - 0.4;
  backs.push({ space: 'oklab', given: [l, a, b], rgb: rgbOf({ mode: 'oklab', l, a, b }) });
}
for (let i = 0; i < 16; i++) {
  const h = random() * 720 - 180, s = random(), l = random();
  backs.push({ space: 'hsl', given: [h, s, l], rgb: rgbOf({ mode: 'hsl', h, s, l }) });
}
for (let i = 0; i < 16; i++) {
  const h = random() * 720 - 180, s = random(), v = random();
  backs.push({ space: 'hsv', given: [h, s, v], rgb: rgbOf({ mode: 'hsv', h, s, v }) });
}
backs.push({ space: 'hsl', given: [-1000, 0, 0.4], rgb: rgbOf({ mode: 'hsl', s: 0, l: 0.4 }) });
backs.push({ space: 'hsv', given: [-1000, 0, 0.6], rgb: rgbOf({ mode: 'hsv', s: 0, v: 0.6 }) });

// ---- mixing ----

const spaces = { srgb: 'rgb', linear: 'lrgb', oklab: 'oklab', oklch: 'oklch', hsl: 'hsl', hsv: 'hsv' };
const pairs = [['#ff0000', '#0000ff'], ['#ffff00', '#0000ff'], ['#808080', '#ff0000'], ['#ff0000', '#808080'],
  ['#ffffff', '#000000'], ['#e5484d', '#30a46c'], ['#3a7bd5', '#ffc53d'], ['#ff00ff', '#00ff00'],
  ['#7c3aed', '#f76b15'], ['#00ffff', '#ff8000'], ['#ff000080', '#0000ffff'], ['#33333300', '#ccccccff']];
const mixes = [];
for (const [a, b] of pairs) {
  for (const [space, mode] of Object.entries(spaces)) {
    const f = culori.interpolate([a, b], mode);
    for (const t of [0, 0.25, 0.5, 0.75, 1]) mixes.push({ a, b, space, t, rgb: rgbOf(f(t)) });
  }
}

// ---- laying one colour over another ----

const overs = [];
for (const [top, bottom] of [['#ff000080', '#0000ff'], ['#00000040', '#ffffff'], ['#ffffffcc', '#111111'],
  ['#3a7bd5', '#ffffff'], ['#3a7bd500', '#ffffff'], ['#ff000080', '#0000ff80'], ['#12345678', '#abcdef33'],
  ['#ffffff00', '#00000000']]) {
  const x = culori.blend([bottom, top], 'normal');
  overs.push({ top, bottom, rgb: [x.r, x.g, x.b, alphaOf(x)] });
}

// ---- fitting into sRGB, and lighter, darker, more saturated ----

const fits = [];
for (let i = 0; i < 24; i++) {
  const l = random(), cc = random() * 0.4, h = random() * 360;
  fits.push({ given: [l, cc, h], rgb: rgbOf(culori.clampChroma({ mode: 'oklch', l, c: cc, h }, 'oklch')) });
}
for (const [l, cc, h] of [[1.05, 0.1, 30], [-0.05, 0.1, 30], [0.7, 0.35, 150], [0.99, 0.3, 100], [0.2, 0.3, 265]]) {
  fits.push({ given: [l, cc, h], rgb: rgbOf(culori.clampChroma({ mode: 'oklch', l, c: cc, h }, 'oklch')) });
}
const moves = [];
for (const code of ['#3a7bd5', '#e5484d', '#ffc53d', '#777777', '#30a46c', '#000000', '#ffffff', '#7c3aed']) {
  const x = culori.oklch(code);
  for (const amount of [0.05, 0.1, 0.2, 0.4]) {
    const shifted = (dl, dc) => {
      const y = { mode: 'oklch', l: x.l + dl, c: Math.max(0, x.c + dc) };
      if (x.h !== undefined) y.h = x.h;
      return rgbOf(culori.clampChroma(y, 'oklch'));
    };
    moves.push({ code, amount, lighter: shifted(amount, 0), darker: shifted(-amount, 0), saturated: shifted(0, amount), desaturated: shifted(0, -amount) });
  }
}

// ---- contrast ----

const contrastPairs = [];
for (let i = 0; i < 30; i++) {
  const a = '#' + hex2(byte()) + hex2(byte()) + hex2(byte());
  const b = '#' + hex2(byte()) + hex2(byte()) + hex2(byte());
  contrastPairs.push([a, b]);
}
contrastPairs.push(['#000000', '#ffffff'], ['#ffffff', '#000000'], ['#777777', '#777777'], ['#888888', '#ffffff'],
  ['#ffffff', '#888888'], ['#0a0a0a', '#101010'], ['#202020', '#f9f9f9'], ['#646464', '#f9f9f9']);
const y8 = code => {
  const c = culori.rgb(code);
  return apca.sRGBtoY([Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)]);
};
const contrasts = contrastPairs.map(([text, background]) => ({
  text, background,
  wcag: culori.wcagContrast(text, background),
  apca: apca.APCAcontrast(y8(text), y8(background)),
}));

// ---- Vuetify ----

// the text Vuetify puts on a colour, over a grid of colours and some near
// its threshold
const grounds = [];
const levels = [0, 51, 102, 153, 204, 255];
for (const r of levels) for (const g of levels) for (const b of levels) grounds.push('#' + hex2(r) + hex2(g) + hex2(b));
for (let i = 0; i < 60; i++) grounds.push('#' + hex2(byte()) + hex2(byte()) + hex2(byte()));
const foregrounds = grounds.map(code => ({ code, on: vuetify.getForeground(vuetify.parseColor(code)) === '#fff' ? 'white' : 'black' }));

const kebab = s => s.replace(/[A-Z]/g, m => '-' + m.toLowerCase()).replace(/([a-z])([0-9])/g, '$1-$2');
const lightness = code => culori.oklab(code).l;
const palette = [];
for (const [name, shades] of Object.entries(vuetifyColors)) {
  if (name === 'shades') continue;
  const keys = Object.keys(shades);
  const ladder = ['lighten5', 'lighten4', 'lighten3', 'lighten2', 'lighten1', 'base', 'darken1', 'darken2', 'darken3', 'darken4'];
  const falls = ladder.every((k, i) => i === 0 || lightness(shades[ladder[i - 1]]) > lightness(shades[k]));
  const accents = ['accent1', 'accent2', 'accent3', 'accent4'].filter(k => k in shades);
  const accentsFall = accents.every((k, i) => i === 0 || lightness(shades[accents[i - 1]]) > lightness(shades[k]));
  palette.push({ name: kebab(name), shades: keys.map(kebab), falls, accents_fall: accentsFall });
}
for (const name of Object.keys(vuetifyColors.shades)) palette.push({ name, shades: ['base'], falls: true, accents_fall: true });

// ---- Semantic UI: the shades LESS derives ----

const site = fs.readFileSync(path.join(modules, 'semantic-ui-less/themes/default/globals/site.variables'), 'utf8');
const semanticNames = ['red', 'orange', 'yellow', 'olive', 'green', 'teal', 'blue', 'violet', 'purple', 'pink', 'brown', 'grey', 'black'];
const semanticBase = {};
for (const name of semanticNames) {
  const m = site.match(new RegExp('^@' + name + '\\s*:\\s*(#[0-9A-Fa-f]{6})\\s*;', 'm'));
  semanticBase[name] = m[1].toLowerCase();
}
// the rules as site.variables writes them, read back from it so that a
// change there shows here
const rule = (name, state) => {
  const m = site.match(new RegExp('^@' + name + state + '\\s*:\\s*([^;]+);', 'm'));
  return m[1].trim().replace(new RegExp('@' + name + '\\b'), 'BASE');
};
const colorRules = Object.fromEntries(['Hover', 'Focus', 'Down', 'Active'].map(s => [s, rule('red', s)]));
const neutralRules = Object.fromEntries(['Hover', 'Focus', 'Down', 'Active'].map(s => [s, rule('grey', s)]));
const stateInputs = [...Object.values(semanticBase)];
for (let i = 0; i < 20; i++) stateInputs.push('#' + hex2(byte()) + hex2(byte()) + hex2(byte()));
let lessSource = '';
stateInputs.forEach((code, i) => {
  for (const [kind, rules] of [['c', colorRules], ['n', neutralRules]]) {
    lessSource += `.${kind}${i} {\n`;
    for (const [state, r] of Object.entries(rules)) lessSource += `  ${state.toLowerCase()}: ${r.replace('BASE', code)};\n`;
    lessSource += '}\n';
  }
});
const css = (await less.render(lessSource)).css;
const readRules = (kind, i) => {
  const block = css.match(new RegExp('\\.' + kind + i + ' \\{([^}]*)\\}'))[1];
  return Object.fromEntries([...block.matchAll(/(\w+): (#[0-9a-f]{6})/g)].map(m => [m[1], m[2]]));
};
const states = stateInputs.map((code, i) => ({ code, color: readRules('c', i), neutral: readRules('n', i) }));

// ---- Radix Themes ----

const accents = ['gray', 'gold', 'bronze', 'brown', 'yellow', 'amber', 'orange', 'tomato', 'red', 'ruby', 'crimson',
  'pink', 'plum', 'purple', 'violet', 'iris', 'indigo', 'blue', 'cyan', 'teal', 'jade', 'green', 'grass', 'lime', 'mint', 'sky'];
const themesDir = path.join(modules, '@radix-ui/themes/src/styles/tokens');
const colorCss = fs.readFileSync(path.join(themesDir, 'color.css'), 'utf8');
const block = selector => {
  const at = colorCss.indexOf(selector);
  return colorCss.slice(colorCss.indexOf('{', at) + 1, colorCss.indexOf('}', at));
};
// a token's value as what it names: white, a step of the theme's gray (solid
// or translucent), a step of the black overlay, or an rgba colour
const named = value => {
  let m;
  if (value === 'white') return { what: 'white' };
  if ((m = value.match(/^var\(--gray-(\d+)\)$/))) return { what: 'gray', step: Number(m[1]) };
  if ((m = value.match(/^var\(--gray-a(\d+)\)$/))) return { what: 'gray-alpha', step: Number(m[1]) };
  if ((m = value.match(/^var\(--black-a(\d+)\)$/))) return { what: 'black-alpha', step: Number(m[1]) };
  if ((m = value.match(/^rgba\((\d+), (\d+), (\d+), ([0-9.]+)\)$/))) return { what: 'rgba', rgba: [m[1] / 255, m[2] / 255, m[3] / 255, Number(m[4])] };
  throw new Error('a token this script does not read: ' + value);
};
const tokens = text => Object.fromEntries([...text.matchAll(/--(color-[a-z-]+):\s*([^;]+);/g)].map(m => [m[1].replace(/-/g, '_'), named(m[2].trim())]));
const themeTokens = { light: tokens(block(':where(.radix-themes) {')), dark: tokens(block(':is(.dark, .dark-theme),')) };
const contrastOf = name => {
  const text = fs.readFileSync(path.join(themesDir, 'colors', name + '.css'), 'utf8');
  const m = text.match(new RegExp('--' + name + '-contrast:\\s*([^;]+);(?:\\s*/\\*\\s*light mode (\\w+) (\\d+)\\s*\\*/)?'));
  return m[1].trim() === 'white' ? { on: 'white' } : { on: 'step', gray: m[2], step: Number(m[3]) };
};
// the colour of the widest layer of --shadow-5, the shadow under a popover
// and a select's choices, in light and in dark (the first blocks of
// shadow.css, before its color-mix versions)
const shadowCss = fs.readFileSync(path.join(themesDir, 'shadow.css'), 'utf8');
const widestOf = selector => {
  const at = shadowCss.indexOf(selector);
  const body = shadowCss.slice(shadowCss.indexOf('{', at) + 1, shadowCss.indexOf('}', at));
  const value = body.match(/--shadow-5:\s*([^;]+);/)[1];
  const layers = value.split(/,(?![^(]*\))/).map(layer => {
    const m = layer.trim().match(/^((?:-?[0-9.]+(?:px)?\s+)+)(var\([^)]+\))$/);
    const lengths = m[1].trim().split(/\s+/).map(parseFloat);
    return { blur: lengths[2] ?? 0, color: named(m[2]) };
  });
  return layers.reduce((a, b) => (b.blur > a.blur ? b : a)).color;
};
const themes = {
  matching_gray: Object.fromEntries(accents.map(a => [a, matching.getMatchingGrayColor(a)])),
  contrast: Object.fromEntries(accents.map(a => [a, contrastOf(a)])),
  tokens: themeTokens,
  shadow: { light: widestOf(':where(.radix-themes) {'), dark: widestOf(':is(.dark, .dark-theme),') },
};

// ---- Radix Colors, measured ----

const scaleNames = ['gray', 'mauve', 'slate', 'sage', 'olive', 'sand', 'gold', 'bronze', 'brown', 'yellow', 'amber',
  'orange', 'tomato', 'red', 'ruby', 'crimson', 'pink', 'plum', 'purple', 'violet', 'iris', 'indigo', 'blue', 'cyan',
  'teal', 'jade', 'green', 'grass', 'lime', 'mint', 'sky'];
const round = (x, places) => Math.round(x * 10 ** places) / 10 ** places;
const measured = {};
let shortfalls = 0;
for (const name of scaleNames) {
  measured[name] = {};
  for (const [look, key] of [['light', name], ['dark', name + 'Dark']]) {
    const steps = Array.from({ length: 12 }, (_, i) => radix[key][name + (i + 1)]);
    const lch = steps.map(code => culori.oklch(code));
    measured[name][look] = { l: lch.map(x => round(x.l, 4)), c: lch.map(x => round(x.c, 4)) };
    const lc = (t, b) => Math.abs(apca.APCAcontrast(y8(t), y8(b)));
    if (lc(steps[10], steps[1]) < 60) shortfalls += 1;
    if (lc(steps[11], steps[1]) < 90) shortfalls += 1;
  }
}

// ---- written ----

const reference = {
  libraries: pinned,
  colors, backs, mixes, overs, fits, moves, contrasts, foregrounds, palette,
  semantic: { names: semanticNames, base: semanticBase, rules: { color: colorRules, neutral: neutralRules }, states },
  themes,
  radix: { measured, text_steps_under_their_contrast: shortfalls },
};
fs.writeFileSync(out, JSON.stringify(reference, null, 1) + '\n');

const count = (x) => (Array.isArray(x) ? x.reduce((n, y) => n + count(y), 0) : typeof x === 'number' ? 1 : x && typeof x === 'object' ? Object.values(x).reduce((n, y) => n + count(y), 0) : 0);
console.error(`wrote ${out}: ${count({ colors, backs, mixes, overs, fits, moves, contrasts })} numbers from culori and apca-w3, ` +
  `${foregrounds.length} foregrounds, ${palette.length} palette names, ${states.length * 8} Semantic UI shades, ` +
  `Radix Colors measured (${shortfalls} of Radix's own text steps under the contrast it states)`);
