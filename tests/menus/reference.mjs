// Lory's menus, overlays and disclosure, held to the libraries they follow.
//
// This script runs the real libraries on fixed inputs and writes
// reference.json beside itself; tests/menus/reference.co holds
// packages/lory/menus.co, overlays.co and disclosure.co to every answer
// in it.
//
// Pinned versions (installed into a scratch folder, never system-wide):
//   cmdk 1.1.1 (its command-score)
//   @radix-ui/react-menu 2.2.1, react-context-menu 2.4.1,
//     react-tooltip 1.4.1, react-hover-card 1.2.1, react-toast 1.3.1,
//     react-navigation-menu 1.4.1, react-accordion 1.3.1
//   vuetify 4.3.1 (with vue 3.5.45, which its select strategies import)
//   semantic-ui-css 2.4.1 (its dimmer's numbers, read from its css)
//
//   npm install --prefix <scratch>/ref --ignore-scripts cmdk@1.1.1 \
//     @radix-ui/react-menu@2.2.1 @radix-ui/react-context-menu@2.4.1 \
//     @radix-ui/react-tooltip@1.4.1 @radix-ui/react-hover-card@1.2.1 \
//     @radix-ui/react-toast@1.3.1 @radix-ui/react-navigation-menu@1.4.1 \
//     @radix-ui/react-accordion@1.3.1 vuetify@4.3.1 vue@3.5.45 \
//     semantic-ui-css@2.4.1
//   node tests/menus/reference.mjs <scratch>/ref/node_modules
//
// Radix keeps the functions measured here (getNextMatch,
// isPointInPolygon, getExitSideFromRect, getPaddedExitPoints, getHull,
// isDeltaInDirection) to itself, not exported: this script finds each in
// the installed package's dist file as it runs and evaluates it there, so
// the library's own code answers; none of it is kept here. Each number
// Lory holds as a constant is found in the library's file by a pattern,
// and its file and line are written with it. Yes and no are written 1
// and 0.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ref = process.argv[2];
if (!ref) {
  console.error('usage: node reference.mjs <folder holding node_modules of the pinned libraries>');
  process.exit(2);
}
const here = dirname(fileURLToPath(import.meta.url));

const packages = ['cmdk', 'vuetify', 'vue', 'semantic-ui-css', '@radix-ui/react-menu',
  '@radix-ui/react-context-menu', '@radix-ui/react-tooltip', '@radix-ui/react-hover-card',
  '@radix-ui/react-toast', '@radix-ui/react-navigation-menu', '@radix-ui/react-accordion'];
const versions = {};
for (const p of packages) versions[p] = JSON.parse(readFileSync(join(ref, p, 'package.json'), 'utf8')).version;

const { commandScore } = await import(join(ref, 'cmdk/dist/command-score.mjs'));
const { classicSelectStrategy } = await import(join(ref, 'vuetify/lib/composables/nested/selectStrategies.js'));

// ---- Radix's private functions, evaluated from its dist files ----

// the text of `function name(...) {...}` or `var name = ... => {...}, "name");`
// in a file, its braces counted
const picked = (file, name) => {
  const src = readFileSync(join(ref, file), 'utf8');
  let at = src.indexOf('\nfunction ' + name + '(');
  if (at < 0) at = src.indexOf('\nvar ' + name + ' = ');
  if (at < 0) throw new Error(name + ' not found in ' + file);
  let i = src.indexOf('{', at);
  let depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  let end = i + 1;
  if (src.slice(at, at + 5) === '\nvar ') end = src.indexOf(';', end) + 1;
  return src.slice(at, end);
};
const evaluated = (file, names, prelude = '') => {
  const body = prelude + '\nconst __name = (f) => f;\n' + names.map(n => picked(file, n)).join('\n') +
    '\nreturn {' + names.join(', ') + '};';
  return new Function(body)();
};
const menu = evaluated('@radix-ui/react-menu/dist/index.mjs', ['wrapArray', 'getNextMatch', 'isPointInPolygon']);
const tip = evaluated('@radix-ui/react-tooltip/dist/index.mjs',
  ['getExitSideFromRect', 'getPaddedExitPoints', 'getPointsFromRect', 'getHull', 'getHullPresorted']);
const toast = evaluated('@radix-ui/react-toast/dist/index.mjs', ['isDeltaInDirection'],
  'const SwipeDirection = { Left: "left", Right: "right", Up: "up", Down: "down" };');

// ---- the numbers Lory holds as constants, each found in its file ----

// (`after`: a pattern the line before must match, where the number
// stands alone on its line)
const found = (file, pattern, what, after = null) => {
  const lines = readFileSync(join(ref, file), 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(pattern);
    if (m && after && !(i > 0 && after.test(lines[i - 1]))) continue;
    if (m) return { what, value: Number(m[1]), file: file + ':' + (i + 1) };
  }
  throw new Error(what + ': ' + pattern + ' not found in ' + file);
};
const constants = [
  found('@radix-ui/react-menu/dist/index.mjs', /^\s*\}, (\d+)\);$/, 'submenu_delay', /onOpenChange\(true\)|pointerGraceTimerRef|onPointerGraceIntentChange|clearOpenTimer|\}\s*$|\);$/),
  found('@radix-ui/react-menu/dist/index.mjs', /^\s*const bleed = rightSide \? -\d+ : (\d+);/, 'grace_bleed'),
  found('@radix-ui/react-menu/dist/index.mjs', /^\s*(\d+)$/, 'grace_time', /onPointerGraceIntentChange\(null\),$/),
  found('@radix-ui/react-menu/dist/index.mjs', /updateSearch\(""\), (\d+e\d+)\)/, 'typeahead_time'),
  found('@radix-ui/react-context-menu/dist/index.mjs', /handleOpen\(event\), (\d+)\)/, 'long_press'),
  found('@radix-ui/react-navigation-menu/dist/index.mjs', /delayDuration = (\d+),/, 'nav_delay'),
  found('@radix-ui/react-navigation-menu/dist/index.mjs', /skipDelayDuration = (\d+),/, 'nav_skip_delay'),
  found('@radix-ui/react-navigation-menu/dist/index.mjs', /setValue\(""\), (\d+)\)/, 'nav_close_delay'),
  found('@radix-ui/react-tooltip/dist/index.mjs', /DEFAULT_DELAY_DURATION = (\d+);/, 'tip_delay'),
  found('@radix-ui/react-tooltip/dist/index.mjs', /skipDelayDuration = (\d+),/, 'tip_skip_delay'),
  found('@radix-ui/react-tooltip/dist/index.mjs', /getPaddedExitPoints\(exitPoint, exitSide, padding = (\d+)\)/, 'tip_padding'),
  found('@radix-ui/react-hover-card/dist/index.mjs', /openDelay = (\d+),/, 'card_open_delay'),
  found('@radix-ui/react-hover-card/dist/index.mjs', /closeDelay = (\d+)$/, 'card_close_delay'),
  found('@radix-ui/react-toast/dist/index.mjs', /duration = (\d+e\d+),/, 'toast_time'),
  found('@radix-ui/react-toast/dist/index.mjs', /swipeThreshold = (\d+),/, 'swipe_threshold'),
  found('@radix-ui/react-toast/dist/index.mjs', /"touch" \? (\d+) : \d+;/, 'swipe_start_touch'),
  found('@radix-ui/react-toast/dist/index.mjs', /"touch" \? \d+ : (\d+);/, 'swipe_start_mouse'),
  found('vuetify/lib/components/VSnackbarQueue/VSnackbarQueue.js', /^\s*default: (8)$/, 'snack_gap'),
  found('vuetify/lib/components/VSnackbar/VSnackbar.js', /^\s*default: (5000)$/, 'snack_time'),
  found('vuetify/lib/components/VBottomSheet/VBottomSheet.css', /transition-duration: ([\d.]+)s;/, 'sheet_seconds'),
  found('semantic-ui-css/components/dimmer.css', /animation-duration: ([\d.]+)s;/, 'dim_seconds'),
  found('semantic-ui-css/components/dimmer.css', /background-color: rgba\(0, 0, 0, ([\d.]+)\);/, 'dim_depth'),
];
const hotkey = readFileSync(join(ref, '@radix-ui/react-toast/dist/index.mjs'), 'utf8').match(/VIEWPORT_DEFAULT_HOTKEY = \["(\w+)"\]/)[1];

// ---- cmdk's command-score: every command against every query ----

const commands = [
  ['Open file', ''], ['Open recent', 'history'], ['Save', ''], ['Save as…', 'copy'],
  ['Close window', ''], ['New window', ''], ['Toggle sidebar', 'panel'], ['Toggle terminal', 'console shell'],
  ['Go to definition', 'jump'], ['Go to line', ''], ['Find in files', 'search grep'], ['Replace', ''],
  ['Settings', 'preferences options'], ['Keyboard shortcuts', 'keys bindings'], ['Change theme', 'dark light colour'],
  ['Zoom in', ''], ['Zoom out', ''], ['go-to-definition', ''], ['format_document', 'prettier'],
  ['Git: Commit', 'vcs'], ['Git: Push', 'vcs'], ['Calendar', ''], ['Calculator', 'maths'], ['Émoji picker', 'smile'],
];
const queries = ['o', 'of', 'file', 'xyz', 'tsb', 'stt', 'sett', 'Set', 'gtd', 'go to', 'gt', 'save',
  'sa', 'wnd', 'win', 'zi', 'zo', 'theme', 'dark', 'git', 'g:c', 'gc', 'cal', 'clac', 'emoji', 'é',
  'fd', 'format doc', 'ts', 'TOGGLE'];
const scores = [];
for (const [words, keywords] of commands) {
  const row = [];
  for (const q of queries) row.push(commandScore(words, q, keywords === '' ? [] : keywords.split(' ')));
  scores.push(row);
}

// ---- Radix's typeahead: getNextMatch ----

const lists = [
  ['Apple', 'Banana', 'Blueberry', 'Cherry', 'Date', 'Grape'],
  ['New Tab', 'New Window', 'New Private Window', 'Show Bookmarks', 'Show Full URLs', 'Developer Tools'],
  ['a', 'aa', 'ab', 'b', 'ba', 'bb', 'B'],
];
const searches = ['a', 'b', 'bl', 'B', 'bb', 'bbb', 'n', 'nn', 'new w', 'NEW P', 's', 'sh', 'show f', 'x', 'd', 'dev', 'aa', 'ab', 'c', 'g'];
const matches = [];
for (const names of lists) {
  for (const current of ['', ...names]) {
    for (const search of searches) {
      const got = menu.getNextMatch(names, search, current === '' ? undefined : current);
      matches.push([names, search, current, got === undefined ? '' : got]);
    }
  }
}

// ---- Radix's submenu grace: the area and whether points are in it ----

// (the five corners SubTrigger's pointerleave hands onPointerGraceIntentChange,
// from the pointer's point and the submenu's rect, its side right or not)
const graceArea = (x, y, rect, right) => {
  const bleed = right ? -5 : 5;
  const near = right ? rect.left : rect.right;
  const far = right ? rect.right : rect.left;
  return [{ x: x + bleed, y }, { x: near, y: rect.top }, { x: far, y: rect.top },
    { x: far, y: rect.bottom }, { x: near, y: rect.bottom }];
};
const graces = [];
for (const [x, y, box, right] of [
  [200, 120, [210, 60, 180, 240], true],
  [200, 290, [210, 60, 180, 240], true],
  [400, 100, [200, 90, 190, 160], false],
  [205, 40, [208, 30, 150, 300], true],
]) {
  const rect = { left: box[0], top: box[1], right: box[0] + box[2], bottom: box[1] + box[3] };
  const area = graceArea(x, y, rect, right);
  const points = [];
  for (let gx = 160; gx <= 440; gx += 20) {
    for (let gy = 0; gy <= 340; gy += 17) points.push([gx, gy, menu.isPointInPolygon({ x: gx, y: gy }, area)]);
  }
  graces.push({ x, y, box, right, area: area.flatMap(p => [p.x, p.y]), points });
}

// ---- Radix's tooltip grace: the exit side, its padded points, the hull ----

const sides = [];
const trigger = { x: 100, y: 100, width: 120, height: 40 };
const rectOf = b => ({ top: b.y, bottom: b.y + b.height, left: b.x, right: b.x + b.width, x: b.x, y: b.y, width: b.width, height: b.height });
for (const [x, y] of [[100, 120], [220, 120], [160, 100], [160, 140], [100, 100], [220, 140], [130, 101],
  [219, 139], [101, 139], [160, 120], [110, 110], [210, 130], [99, 150], [230, 90]]) {
  const side = tip.getExitSideFromRect({ x, y }, rectOf(trigger));
  const padded = tip.getPaddedExitPoints({ x, y }, side).flatMap(p => [p.x, p.y]);
  sides.push([x, y, side, padded]);
}
const hulls = [];
for (const [x, y, to] of [
  [160, 140, { x: 120, y: 145, width: 80, height: 30 }],
  [160, 100, { x: 100, y: 40, width: 200, height: 55 }],
  [220, 120, { x: 225, y: 90, width: 60, height: 100 }],
  [100, 125, { x: 10, y: 130, width: 85, height: 20 }],
]) {
  const side = tip.getExitSideFromRect({ x, y }, rectOf(trigger));
  const points = [...tip.getPaddedExitPoints({ x, y }, side), ...tip.getPointsFromRect(rectOf(to))];
  hulls.push({ x, y, to: [to.x, to.y, to.width, to.height], hull: tip.getHull(points).flatMap(p => [p.x, p.y]) });
}
// (point sets of their own: a seeded sequence, lines and repeats among them)
let seed = 7;
const next = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % 41; };
const sets = [];
for (let k = 0; k < 12; k++) {
  const n = 3 + (k % 9);
  const pts = [];
  for (let i = 0; i < n; i++) pts.push({ x: next(), y: next() });
  if (k % 4 === 0) pts.push({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 20 }, { x: 10, y: 10 });
  sets.push({ points: pts.flatMap(p => [p.x, p.y]), hull: tip.getHull(pts).flatMap(p => [p.x, p.y]) });
}

// ---- Radix's toast swipe: isDeltaInDirection ----

const swipes = [];
for (const way of ['right', 'left', 'up', 'down']) {
  for (const [dx, dy] of [[49, 0], [50, 0], [51, 0], [-51, 0], [51, 51], [51, 50], [0, 51], [0, -51], [10, 60], [60, 10], [3, 1], [2, 0]]) {
    swipes.push([dx, dy, way, 50, toast.isDeltaInDirection({ x: dx, y: dy }, way, 50)]);
    swipes.push([dx, dy, way, 2, toast.isDeltaInDirection({ x: dx, y: dy }, way, 2)]);
  }
}

// ---- Vuetify's classic choosing: a tree, presses in turn, each id's tick ----

const tree = [
  ['root', ['a', 'b', 'c']],
  ['a', ['a1', 'a2']],
  ['b', ['b1', 'b2', 'b3']],
  ['b2', ['b2x', 'b2y']],
  ['c', ['c1']],
];
const order = ['root', 'a', 'a1', 'a2', 'b', 'b1', 'b2', 'b2x', 'b2y', 'b3', 'c', 'c1', 'd'];
const children = new Map(tree.map(([id, kids]) => [id, kids]));
const parents = new Map();
for (const [id, kids] of tree) for (const k of kids) parents.set(k, id);
const runs = [];
for (const [off, presses] of [
  [[], [['a1', true], ['a2', true], ['b2x', true], ['b', true], ['b2y', false], ['root', true], ['c1', false], ['root', false]]],
  [['b3'], [['b', true], ['b1', false], ['b1', true], ['b3', true], ['root', true], ['b2', false]]],
  [['a'], [['root', true], ['a1', false], ['a', false], ['a', true], ['d', true]]],
]) {
  const strategy = classicSelectStrategy(false);
  let selected = new Map();
  const steps = [];
  for (const [id, value] of presses) {
    selected = strategy.select({ id, value, selected, children, parents, disabled: new Set(off) });
    const ticks = order.map(i => selected.has(i) ? selected.get(i) : 'off');
    steps.push({ id, value, ticks, out: strategy.out(selected, children).sort() });
  }
  runs.push({ off, steps });
}

const out = {
  versions, constants, hotkey,
  commands, queries, scores,
  matches, graces, sides, hulls, sets, swipes,
  vuetify: { tree, order, runs },
};
writeFileSync(join(here, 'reference.json'), JSON.stringify(out, (k, v) => typeof v === 'boolean' ? (v ? 1 : 0) : v, 1) + '\n');
console.log('wrote', join(here, 'reference.json'), ':', scores.length * queries.length, 'scores,', matches.length, 'matches,',
  graces.reduce((a, g) => a + g.points.length, 0), 'grace points,', sides.length, 'exit sides,', hulls.length + sets.length, 'hulls,',
  swipes.length, 'swipes,', runs.reduce((a, r) => a + r.steps.length, 0) * order.length, 'ticks,', constants.length, 'constants');
