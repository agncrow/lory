// Lory's window, the host's side: the real page kept open beside the room's
// canvas, pictured for the room's window, and done to as the reader does to
// the window. The program — a site's own, which draws its room with Lory's
// window (packages/window/main.co says how), built for the web and served
// at /room-build/room.wasm, this page at /room/ — draws the room; this
// module is what a program cannot be: the browser's own page, its markup
// and its events.
//
// The room shows the page's main column in one window before its reader,
// a pixel of the page `zoom` dp there (a dp is 1.15 mm seen from a metre:
// what a headset's guidelines count sizes in), the window 1024 dp across —
// so the page is laid out 1024 / zoom of its own pixels wide (beside its
// side, which the room does not show: what can be pressed there is the
// room's Pages menu). The page is as tall as it is, nothing of it scrolls:
// its picture is its own markup drawn by the browser (an SVG image of a
// copy of the page's body), cut into tiles TILE tall, each in a texture
// unit of the canvas's WebGL context (8 and on), and the program shows the
// tiles through its window and scrolls them itself. Only the tiles near
// what the window shows are drawn when the page changes; the rest when
// the reader scrolls toward them. What the page changes by itself in the
// window (a number a tick moves on) is pictured alone where it can be —
// the block it is in, drawn over its place in its tiles (`patch`) — not
// the page again. A copy is not scrolled, so a box that scrolls within the
// page (a wide table's, a log's) has what is in its copy moved by its
// scroll (`scrolls_into`), in the page's picture and a block's alone; its
// scrolling is a change to picture like the page's own, and what can be
// pressed in it is pressed only where the box shows it (`shown_in`).
//
// The program prints where the pointer is and what it did, in the page's
// own pixels (`@at x y`, `@down`, `@drag`, `@up`, `@wheel x y dx dy`; x
// from the main column's left, y from the page's top); the host finds what
// of the page lies there — a control, or one near enough: each is grown
// toward 48 dp, half way to its neighbours at most — says what can be
// pressed (`hover`), and does the press on the page itself. A slider
// follows the pointer while it is held. A list to choose from or a field
// to type in is asked of the reader in the room (`ask`): its choice
// (`@chose i`) or its words (`@typed`, `@entered`, `@done`) are given to
// the page's control. A thing of the page that scrolls itself is scrolled
// by `@wheel`, and what it could not take is given back (`more`) for the
// page to scroll by. `@menu i` presses a thing of the page's side;
// `@zoom z` lays the page out again for larger or smaller letters;
// `@pulse hand strength ms` is felt in a controller; `@scroll top tall` is
// what the window shows now. Which of the page's elements are its main
// column and its side the program may say (`@parts`, selectors; `main`,
// and `aside` or `nav`, where it says none).
//
// A widget of the page — an element Crow mounted a widget in, its kind in
// `data-crow-widget` and its words in `data-crow-props` — is a program's
// own drawing, pictured as nothing here: it is told to the program
// (`widgets`) with where it lies, its kind, its props, and what the
// widget's module put on its element for the room (`el.__room`: its words
// and numbers, as `room`). A program that draws it in the window says how
// tall it needs it (`@sized n h`: the widget's element is made that tall),
// and hands it what the reader did to it (`@widget n words`: given to
// `el.__room.told(words)`, the module's own way to hear it).
//
// The program also says where its panels hang (`@panels`) and what
// controls of its own it shows (`@chrome`), which the room is measured by
// (`lory_targets`, near this file's foot).
'use strict';

const TILE = 800;           // a tile of the page's picture, in the page's pixels
const SHARP = 2;            // texels to a pixel of the page
const MOST = 8;             // tiles at most (texture units 8 to 15)
const SOON = 350;           // ms between pictures while the reader does something to the page,
const SOON_FOR = 2000;      // for as long as this after it,
const CALM = 1000;          // and while the page changes by itself (a session that plays)
const UNIT = 8;             // the first texture unit a tile's picture is in
const WIDE_DP = 1024;       // the window, in dp
const TALL_DP = 720;
const ZOOMS = [1, 1.3, 1.6];
const TARGET_DP = 48;       // what a thing pressed should measure, at least
const PRESSED = 'button, a[href], input, select, textarea, label, summary, [data-crow-click], [role="button"]';
const KEPT = PRESSED + ', [data-crow-widget]';   // what must stand where it stood for a block to be pictured alone
const PATCHED_MOST = 4;     // blocks a change of the page is pictured in alone, at most

const frame = document.getElementById('page');
const canvas = document.getElementById('room');
const said = document.getElementById('said');
const params = new URLSearchParams(location.search);

let room = null;            // the program
let gl = null;
let doc = null;             // the page's document
let zoom = 1.3;             // dp to a pixel of the page
let laid = null;            // the page as last pictured: { wide, tall, left, tiles, v }
let view = { top: 0, tall: Math.round(TALL_DP / 1.3) };   // what the window shows, as the program last said
let image = null;           // the last picture taken, kept for the tiles not drawn yet
let stale = true;           // the page changed since its last picture
let touched = [];           // what the page changed by itself since then, outside its widgets (`noted`)
let restated = false;       // a widget changed since the widgets were last told
let restated_at = 0;        // when they were last told without a picture
let anchors = '';           // what stood about the stretch the last picture took, and where (`anchored`)
let unseen = null;          // what changed since in the last picture's tiles but out of the window, [top, bottom]: pictured when the window comes to it
let pending = new Set();    // what the page changed in the window since, to be pictured alone (`patch`)
let watched = new Set();    // the blocks seen changing: where each stands is read with every picture
let boxed = new Map();      // where each of them stood when the page was last pictured (`stood_of`)
let outgrown = new WeakMap(); // a block that did not stand still as it changed: the block it is pictured in instead
let drawing = false;
let pictured = 0;           // when the last picture was taken
let acted = 0;              // when the reader last did something to the page
let version = 0;
let over = '';              // what the pointer is over, as last told
let down = null;            // the element a press began on
let sliding = null;         // a slider that follows the pointer while it is held
let slid = null;            // where it lay when its picture was taken
let asking = null;          // the control a choice or words are asked for
// (What follows is the page as it stood the moment its picture was taken:
// the reader sees the picture, so what they point at is what was there
// then. A page that changes by itself — a session that plays — is ahead of
// its picture by a few tenths of a second, and what it offers now may lie
// a row further down than what is seen.)
let widgeted = [];          // the widgets told, in the order told
let boxes = [];             // where each of them lay: { x, y, w, h }
let targets = [];           // what can be pressed in the main column, each with the box it is grown to
let scrolls = [];           // what scrolls by itself: { el, x, y, w, h, sx, sy }
let side = [];              // what can be pressed in the page's side: the room's menu
let panels = null;          // where the program says each panel hangs: { cols, wide, tall, at, sig }
let chrome = [];            // the program's own controls: { name, x, y, w, h } in its panels' pixels
let standing = 'bar';       // how the room stands: its `bar` shown, something `raised` before the window, or `typing`
let measured = null;        // the last measure given of the room, and what it was made from
let session = null;         // the headset's session, for a pulse in a hand
let mixed = false;          // the reader asked to see their own room about the window
const sheets = [];          // a canvas and a texture a tile
// which of the page's elements are its main column and its side: the
// first each list finds (the program may say others, `@parts`)
let wanted = { main: ['main', '[role="main"]'], side: ['aside', 'nav'] };
const sizes = new WeakMap(); // a widget's element: how tall the program needs it (`@sized`)

// (the letters' size the reader last chose, kept by the browser: under
// the name a room hosted by Myna kept it by, before this page was Lory's)
try {
  let kept = Number(localStorage.getItem('room.zoom'));
  if (!ZOOMS.includes(kept)) kept = Number(localStorage.getItem('myna.room.zoom'));
  if (ZOOMS.includes(kept)) zoom = kept;
} catch (e) { /* nothing kept */ }
view.tall = Math.round(TALL_DP / zoom);

function fail(words) {
  said.style.display = 'block';
  said.textContent = words;
}

// the page asked for: the address given, or the page the reader came from
function asked() {
  const at = params.get('at');
  if (at && at.startsWith('/')) return at;
  try {
    const from = new URL(document.referrer);
    if (from.origin === location.origin && !from.pathname.startsWith('/room') && !from.pathname.startsWith('/studio')) return from.pathname + from.search;
  } catch (e) { /* no referrer */ }
  return '/';
}

// (a `told` event: `text` would be typed into a field that has the focus)
function tell(message) {
  if (room) room.give({ type: 'told', text: JSON.stringify(message) });
}

// the page's pixels across the window
const wide = () => Math.round(WIDE_DP / zoom / 2) * 2;

// ---- the page's picture ----

// the page's side (what the room's menu is made of) and its main column:
// where the column begins, and how tall what is in it stands — its own
// children's feet, not the column's box, which a tall frame stretches
function parts() {
  const main = first_of(wanted.main);
  const sidebar = first_of(wanted.side);
  if (!main) return { left: 0, tall: Math.max(200, doc.body.scrollHeight), main: null };
  const m = main.getBoundingClientRect();
  let foot = m.top;
  for (const el of main.children) {
    const r = el.getBoundingClientRect();
    if (r.height > 0) foot = Math.max(foot, r.bottom);
    for (const inner of el.children) {
      const q = inner.getBoundingClientRect();
      if (q.height > 0) foot = Math.max(foot, q.bottom);
    }
  }
  return { left: sidebar ? Math.max(0, Math.round(m.left)) : 0, tall: Math.max(200, Math.ceil(foot + 24)), main };
}

// the first element of the page that a list of selectors finds (a
// selector this browser does not take finds nothing)
function first_of(list) {
  for (const sel of list) {
    let el = null;
    try { el = doc.querySelector(sel); } catch (e) { el = null; }
    if (el) return el;
  }
  return null;
}

// a widget's props as the page gave them, as JSON text: `{}` where they
// are none. (Read once a set of props: each picture asks, and a widget's
// words may be many — a chart's marks, its levels)
const props_read = new Map();

function props_of(el) {
  const text = el.getAttribute('data-crow-props') || '{}';
  let ok = props_read.get(text);
  if (ok === undefined) {
    try { const j = JSON.parse(text); ok = !!j && typeof j === 'object' && !Array.isArray(j); } catch (e) { ok = false; }
    if (props_read.size > 40) props_read.clear();
    props_read.set(text, ok);
  }
  return ok ? text : '{}';
}

// what a widget's module put on its element for the room, its words and
// numbers (what it hears by, `told`, is no word)
function room_words(el) {
  const out = {};
  const src = el.__room;
  if (src && typeof src === 'object') {
    for (const [k, v] of Object.entries(src)) if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') out[k] = v;
  }
  return out;
}

// a copy of the page's body as markup an image can hold: the values typed
// and chosen written into it, its scripts gone
function markup(found) {
  const copy = doc.body.cloneNode(true);
  values_into(doc.body, copy);
  scrolls_into(doc.body, copy, scrolled_within(found));
  for (const s of copy.querySelectorAll('script, iframe')) s.remove();
  return new XMLSerializer().serializeToString(copy);
}

// ---- what scrolls within the page, as it is scrolled ----

// A copy keeps no scroll: what a thing of the page that scrolls by itself
// holds — a wide table in its box, a long answer — is moved in the copy as
// far as the thing is scrolled. Each element it holds is moved (its own
// `translate` added to, which moves nothing else about it) and its words
// in a span moved; what stands still as its holder scrolls (set apart from
// it, or stuck to its edge) is left where it is, as is what a thing stuck
// deeper in it would stand at (a table's head held at the top of the box
// it scrolls in is pictured scrolled with the rest).

// of things that may scroll (`scroll_candidates`), those scrolled now (a
// field or a list scrolls inside itself, as no copy of it can)
function scrolled_within(found) {
  const out = [];
  for (const el of found) if ((el.scrollLeft || el.scrollTop) && el.tagName !== 'TEXTAREA' && el.tagName !== 'SELECT') out.push(el);
  return out;
}

// where an element lies under `root`, as its place among its holder's
// elements and theirs; and the element at such a place in a copy of it
function path_to(root, el) {
  const path = [];
  for (let at = el; at && at !== root; at = at.parentElement) path.push(Array.prototype.indexOf.call(at.parentElement.children, at));
  return path.reverse();
}
function follow(root, path) {
  let at = root;
  for (const i of path) at = at ? at.children[i] : null;
  return at || null;
}

// each scrolled thing of `root` moved in its copy as far as it is scrolled
// (found first, all of them: a span made for words moves the places after it)
function scrolls_into(root, copy, list) {
  const pairs = [];
  for (const el of list) {
    const o = follow(copy, path_to(root, el));
    if (o && o.childNodes.length === el.childNodes.length) pairs.push([el, o]);
  }
  for (const [el, o] of pairs) {
    const sx = el.scrollLeft, sy = el.scrollTop;
    const holds = getComputedStyle(el).position !== 'static';
    const live = el.childNodes, kids = [...o.childNodes];
    kids.forEach((k, i) => {
      const l = live[i];
      if (k.nodeType === 1) {
        const ks = getComputedStyle(l);
        if (ks.position === 'fixed' || ks.position === 'sticky' || (ks.position === 'absolute' && !holds)) return;
        const t = ks.translate && ks.translate !== 'none' ? ks.translate.split(' ') : [];
        k.style.setProperty('translate', ((parseFloat(t[0]) || 0) - sx) + 'px ' + ((parseFloat(t[1]) || 0) - sy) + 'px', 'important');
      } else if (k.nodeType === 3 && k.nodeValue.trim()) {
        const span = doc.createElement('span');
        span.setAttribute('style', 'position:relative!important;left:' + (-sx) + 'px!important;top:' + (-sy) + 'px!important');
        o.replaceChild(span, k);
        span.appendChild(k);
      }
    });
  }
}

// the values typed and chosen in a part of the page written into its copy
function values_into(part, copy) {
  const fields = (root) => [...(root.matches('input, select, textarea') ? [root] : []), ...root.querySelectorAll('input, select, textarea')];
  const then = fields(copy);
  fields(part).forEach((el, i) => {
    const o = then[i];
    if (!o) return;
    if (el.tagName === 'INPUT') {
      if (el.type === 'checkbox' || el.type === 'radio') {
        if (el.checked) o.setAttribute('checked', ''); else o.removeAttribute('checked');
      } else o.setAttribute('value', el.value);
    } else if (el.tagName === 'SELECT') {
      Array.from(o.options).forEach((op, j) => (j === el.selectedIndex ? op.setAttribute('selected', '') : op.removeAttribute('selected')));
    } else o.textContent = el.value;
  });
}

// the page's styles, and what its root and body give every element
// a style sheet's rules as text, what it imports written in: an image
// loads nothing, so a sheet the page imports (`@import`, or a `<link>`)
// would be missing from its picture, and the page drawn there laid out
// other than it is — its words wrapped elsewhere than the boxes of its
// widgets and controls, read from the page itself, say
function sheet_text(sheet, depth) {
  let rules = null;
  try { rules = sheet.cssRules; } catch (e) { return ''; }
  let out = '';
  for (const r of rules) {
    // (3: an import; the rule is of the page's own window, so its kind is asked by number)
    if (r.type === 3) { if (r.styleSheet && depth < 4) out += sheet_text(r.styleSheet, depth + 1); }
    else out += r.cssText + '\n';
  }
  return out;
}

// how many rules each sheet has, imports and all: the page's styles written
// out again only when they change
function sheets_key(sheets, depth) {
  let key = '';
  for (const sheet of sheets) {
    let rules = null;
    try { rules = sheet.cssRules; } catch (e) { key += 'x,'; continue; }
    key += rules.length + ',';
    if (depth < 4) for (const r of rules) if (r.type === 3) key += '(' + (r.styleSheet ? sheets_key([r.styleSheet], depth + 1) : '-') + ')';
  }
  return key;
}

let styled = { doc: null, key: '', css: '', names: null, scrollers: null, rules: null };

// The page's rules, each with what the subject of each of its selectors
// must be to be chosen — an id, a class or a tag, or anything (null) — and
// the rules a grouping rule (`@media`, `@supports`, `@layer`) holds: a
// block pictured alone is given only the rules that could choose what it
// holds (all the page's rules are most of its picture's making)
function ruled(rules, depth, out) {
  for (const r of rules) {
    if (r.type === 3) {
      let inner = null;
      try { inner = r.styleSheet && depth < 4 ? r.styleSheet.cssRules : null; } catch (e) { inner = null; }
      if (inner) ruled(inner, depth + 1, out);
      continue;
    }
    const held = r.cssRules && r.cssRules.length;
    if (r.selectorText !== undefined && !held) out.push({ text: r.cssText, keys: split_selectors(r.selectorText).map(subject_key) });
    else if (held && r.selectorText === undefined) out.push({ open: r.cssText.slice(0, r.cssText.indexOf('{') + 1), inner: ruled(r.cssRules, depth, []) });
    else out.push({ text: r.cssText, keys: null });
  }
  return out;
}

// a selector list's selectors (a comma in brackets or quotes is theirs)
function split_selectors(text) {
  const out = [];
  let depth = 0, q = '', from = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '\\') { i++; continue; }
    if (q) { if (c === q) q = ''; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ',' && depth === 0) { out.push(text.slice(from, i)); from = i + 1; }
  }
  out.push(text.slice(from));
  return out;
}

// what a selector's subject must be: '#id', '.class' or a tag; null where
// it could be anything, or the selector is past reading here (an escape, a
// namespace)
function subject_key(sel) {
  sel = sel.trim();
  if (sel.includes('\\') || sel.includes('|')) return null;
  let depth = 0, q = '', start = 0;
  for (let i = 0; i < sel.length; i++) {
    const c = sel[i];
    if (q) { if (c === q) q = ''; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (depth === 0 && (c === ' ' || c === '>' || c === '+' || c === '~')) start = i + 1;
  }
  let last = sel.slice(start);
  // (what a part of an element — `::before` — is of, its brackets and their insides gone)
  for (let was = ''; was !== last; ) { was = last; last = last.replace(/\[[^\[\]]*\]|\([^()]*\)/g, ''); }
  last = last.split('::')[0];
  const id = last.match(/#([\w-]+)/);
  if (id) return '#' + id[1];
  const cls = last.match(/\.([\w-]+)/);
  if (cls) return '.' + cls[1];
  const tag = last.match(/^([a-zA-Z][\w-]*)/);
  return tag ? tag[1].toLowerCase() : null;
}

// the page's rules that could choose an element of a block or what holds it, as text an image can hold
function rules_for(el) {
  if (!styled.rules) {
    const all = [];
    for (const sheet of doc.styleSheets) {
      let rules = null;
      try { rules = sheet.cssRules; } catch (e) { rules = null; }
      if (rules) ruled(rules, 0, all);
    }
    styled.rules = all;
  }
  const keys = new Set();
  const add = (e) => { keys.add(e.localName.toLowerCase()); if (e.id) keys.add('#' + e.id); for (const c of e.classList) keys.add('.' + c); };
  add(el);
  for (const e of el.querySelectorAll('*')) add(e);
  for (let up = el.parentElement; up; up = up.parentElement) add(up);
  const pick = (entries) => {
    let out = '';
    for (const e of entries) {
      if (e.inner) { const inner = pick(e.inner); if (inner) out += e.open + '\n' + inner + '}\n'; }
      else if (!e.keys || e.keys.some((k) => k === null || keys.has(k))) out += e.text + '\n';
    }
    return out;
  };
  return pick(styled.rules).replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

function styles() {
  const key = sheets_key(doc.styleSheets, 0) + '|' + (doc.documentElement.getAttribute('style') || '');
  if (styled.doc !== doc || styled.key !== key) {
    let text = '';
    for (const sheet of doc.styleSheets) text += sheet_text(sheet, 0);
    styled = { doc, key, css: text, names: null, scrollers: null, rules: null };
  }
  const css = styled.css;
  const root = getComputedStyle(doc.documentElement);
  const body = getComputedStyle(doc.body);
  // (the root's own variables named once a set of styles: the root has
  // hundreds of properties to look through; their values read each time)
  if (!styled.names) {
    const names = [];
    for (let i = 0; i < root.length; i++) if (root[i].startsWith('--')) names.push(root[i]);
    styled.names = names;
  }
  let own = '';
  for (const name of styled.names) own += name + ':' + root.getPropertyValue(name) + ';';
  const ground = body.backgroundColor !== 'rgba(0, 0, 0, 0)' ? body.backgroundColor : (root.backgroundColor !== 'rgba(0, 0, 0, 0)' ? root.backgroundColor : '#0f1317');
  // (not its lines' height: what the page gives as a number — each
  // element's lines that many of its own letters tall — reads back as the
  // body's own lines in pixels, and so given would make every smaller
  // letter's lines as tall as the body's. The page's rules for its body
  // hold in the picture, whose body is one)
  const keep = ['font-family', 'font-size', 'color', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'color-scheme'];
  for (const name of keep) own += name + ':' + body.getPropertyValue(name) + ';';
  return { css: css.replace(/&/g, '&amp;').replace(/</g, '&lt;'), own: (doc.body.getAttribute('style') || '').replace(/;?\s*$/, ';') + own, ground, root: marks(doc.documentElement) + ` style="font-size:${root.fontSize}"`, body: marks(doc.body) };
}

// an element's marks as markup (but its style), for an element of the
// picture to stand as it does: the page's root's on the picture's root, so
// what its rules say of `:root[…]` holds there, and `rem` counts the same
const marks = (el) => {
  let out = '';
  for (const a of el.attributes) {
    if (a.name === 'style' || !/^[a-z_][\w.-]*$/i.test(a.name) || /^(xmlns|width|height|viewbox|version|x|y|preserveaspectratio)$/i.test(a.name)) continue;
    out += ' ' + a.name + '="' + a.value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;') + '"';
  }
  return out;
};

// the page, or a part of it, as an SVG image: its body's markup in a body
// of the picture's own (what the page's rules say of a body holds for it),
// its rules with it; laid out `wide` by `tall` of the page's pixels, the
// stretch from `from` to `upto` pictured, `sharp` texels a pixel
function svg_of(st, wide, tall, from, upto, inner, sharp, body_style) {
  return `<svg xmlns="http://www.w3.org/2000/svg"${st.root} width="${wide * sharp}" height="${(upto - from) * sharp}" viewBox="0 ${from} ${wide} ${upto - from}"><foreignObject width="${wide}" height="${tall}"><body xmlns="http://www.w3.org/1999/xhtml"${st.body} style="${(st.own + body_style).replace(/"/g, '&quot;')}"><style>${st.css}</style>${inner}</body></foreignObject></svg>`;
}

// a widget's box made as tall as the program needs it (`@sized`): the
// program draws it itself, and the widget's own module, unseen here, may
// not have said its height — or the page, laid out again, put back its
// own. Whether any was made so
function settle() {
  let grown = false;
  for (const el of doc.querySelectorAll('[data-crow-widget]')) {
    if (sized(el, sizes.get(el))) grown = true;
  }
  return grown;
}

// one widget made `h` tall, where it is not: whether it was
function sized(el, h) {
  if (h === undefined || el.style.height === h + 'px') return false;
  el.style.height = h + 'px';
  el.style.overflow = 'hidden';
  return true;
}

// the tiles the window shows, and one over and one under, drawn from the
// last picture where they have not been since it was taken
function tiles() {
  if (!image || !gl) return;
  const shown_first = Math.floor(view.top / TILE), shown_last = Math.floor((view.top + view.tall - 1) / TILE);
  const first = Math.max(0, shown_first - 1);
  const last = shown_last + 1;
  let drew = false;
  for (let k = first; k <= last && k < sheets.length; k++) {
    const s = sheets[k];
    if (!s || !s.dirty || k * TILE >= image.tall) continue;
    const tall = Math.min(TILE, image.tall - k * TILE);
    // (a tile the window shows that the last picture did not take is taken
    // by the next, soon; one over or under, when the window comes to it)
    if (k * TILE < image.from || k * TILE + tall > image.upto) {
      if (k >= shown_first && k <= shown_last) { stale = true; acted = performance.now(); }
      continue;
    }
    s.pen.fillStyle = image.ground;
    s.pen.fillRect(0, 0, s.cv.width, s.cv.height);
    s.pen.drawImage(image.img, image.left * SHARP, (k * TILE - image.from) * SHARP, image.wide * SHARP, tall * SHARP, 0, 0, image.wide * SHARP, tall * SHARP);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.activeTexture(gl.TEXTURE0 + UNIT + k);
    gl.bindTexture(gl.TEXTURE_2D, s.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, s.cv);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    s.dirty = false;
    drew = true;
  }
  if (drew) gl.activeTexture(gl.TEXTURE0);
}

async function picture() {
  if (drawing || !doc || !doc.body || !gl) return;
  drawing = true;
  stale = false;
  touched = [];
  unseen = null;
  pending.clear();
  restated = false;
  try {
    settle();
    let p = parts();
    const across = wide();
    // (the frame as wide as the page's side and the window's column: twice, where the side changes with the width)
    for (let i = 0; i < 2 && frame.style.width !== p.left + across + 'px'; i++) {
      frame.style.width = p.left + across + 'px';
      settle();
      p = parts();
    }
    const full = p.left + across;
    if (frame.style.height !== p.tall + 'px') frame.style.height = p.tall + 'px';
    const st = styles();
    // (only the part of the page about the window is drawn — the tiles it
    // shows, and while the reader does something to the page one over and
    // one under — the rest when it is scrolled toward. A page that changes
    // by itself is drawn again many times: what it is drawn from is the
    // dearest thing the room does, a stretch of frames in a headset)
    const reach = performance.now() - acted < SOON_FOR ? 1 : 0;
    const first = Math.max(0, Math.floor(view.top / TILE) - reach);
    const last = Math.floor((view.top + view.tall - 1) / TILE) + reach;
    const from = Math.min(first * TILE, Math.max(0, Math.ceil(p.tall / TILE) - 1) * TILE);
    const upto = Math.max(from + 1, Math.min(p.tall, (last + 1) * TILE));
    const scrollers = scroll_candidates();
    const svg = svg_of(st, full, p.tall, from, upto, markup(scrollers).replace(/^<body[^>]*>/, '').replace(/<\/body>$/, ''), SHARP, `background:${st.ground}`);
    // (what stands about the stretch as it is copied: a later change outside
    // it that moves these is pictured, one that does not waits)
    const stood = anchored(from, upto, p.left, across);
    // (and where each block seen changing stands, as it is copied: a change
    // in it later is pictured alone while it stands there)
    for (const b of watched) if (!b.isConnected) watched.delete(b);
    if (watched.size > 200) watched.clear();
    boxed = new Map();
    for (const b of watched) boxed.set(b, stood_of(b));
    // (what the page offers, read in the same breath as its markup)
    // (the page copied, what it offers read, and its picture made, each a
    // task of its own: the headset's frames are drawn between them)
    await new Promise((done) => setTimeout(done, 0));
    const scrolled = scrollables(p.left, scrollers);
    const found = { targets: pressables(p.left, from, upto, scrolled), side: sided(p.left), widgets: widgets(p.left), scrolls: scrolled };
    await new Promise((done) => setTimeout(done, 0));
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await img.decode();
    image = { img, left: p.left, wide: across, tall: p.tall, from, upto, ground: st.ground };
    const n = Math.max(1, Math.min(MOST, Math.ceil(p.tall / TILE)));
    for (let k = 0; k < n; k++) {
      if (!sheets[k] || sheets[k].cv.width !== across * SHARP) {
        const cv = document.createElement('canvas');
        cv.width = across * SHARP;
        cv.height = TILE * SHARP;
        sheets[k] = { cv, pen: cv.getContext('2d'), tex: sheets[k] ? sheets[k].tex : gl.createTexture(), dirty: true };
      }
      sheets[k].dirty = true;
    }
    tiles();
    anchors = stood;
    version += 1;
    laid = { wide: across, tall: Math.min(p.tall, n * TILE), left: p.left, tiles: n, v: version };
    targets = found.targets;
    side = found.side;
    scrolls = found.scrolls;
    widgeted = found.widgets.map((c) => c.el);
    boxes = found.widgets.map((c) => ({ x: c.x, y: c.y, w: c.w, h: c.h }));
    measured = null;
    over = '';
    tell({ t: 'page', wide: across, tall: laid.tall, tile: TILE, tiles: n, title: doc.title || doc.location.pathname, path: doc.location.pathname + doc.location.search, v: version, zoom });
    tell({ t: 'menu', names: side.map((s) => s.name), current: side.findIndex((s) => s.current) });
    told_widgets = '';
    tell_widgets(found.widgets);
    pictured = performance.now();
  } catch (e) {
    fail('the page could not be pictured: ' + (e && e.message ? e.message : e));
  }
  drawing = false;
}

// the page's widgets, each where it lies in the main column (one not laid
// out, a tab not shown, is none; one not yet as tall as the program needs
// it is told as it stands, and the program says)
function widgets(left) {
  const list = [];
  for (const el of doc.querySelectorAll('[data-crow-widget]')) {
    const r = el.getBoundingClientRect();
    if (r.width < 4) continue;
    list.push({ el, x: r.left - left, y: r.top, w: r.width, h: r.height });
  }
  return list;
}

// ---- what can be pressed ----

const seen = (el) => { const style = getComputedStyle(el); return style.visibility !== 'hidden' && style.display !== 'none'; };

// the control a label is of: its own (a `for`, or the control inside it),
// or the one it stands with in a field, as a page built by Crow words one;
// a label of no control is itself (and is nothing to press)
function control_of(el) {
  if (el.tagName !== 'LABEL') return el;
  if (el.control) return el.control;
  const field = el.closest('.crow-field, .crow-select, .field');
  const found = field && field.querySelector('input, select, textarea');
  return found || el;
}
const outermost = (el) => !(el.parentElement && el.parentElement.closest(PRESSED));

// the part of a box (the page's pixels) a thing that scrolls by itself
// shows (`s`, in the main column's), or none where it shows none of it
function shown_in(r, s, left) {
  const x0 = Math.max(r.left, s.x + left), x1 = Math.min(r.right, s.x + left + s.w);
  const y0 = Math.max(r.top, s.y), y1 = Math.min(r.bottom, s.y + s.h);
  if (x1 - x0 < 1 || y1 - y0 < 1) return null;
  return { left: x0, top: y0, right: x1, bottom: y1, width: x1 - x0, height: y1 - y0 };
}

// What can be pressed in the main column, each with its box (in the
// column's pixels) and the box it answers to. A control that stands in no
// other is grown toward what a thing pressed should measure in a headset
// (48 dp), half way to a neighbour at most: a press beside a small control
// lands on it. A control inside another (a button in a row that is itself
// pressed) answers to its own box. A control in a thing that scrolls by
// itself (`clips`, as `scrollables` found them) is only the part of it the
// thing shows: one scrolled out of it is nothing to press.
function pressables(left, from, upto, clips) {
  const least = TARGET_DP / zoom;
  const list = [];
  const all = doc.querySelectorAll(PRESSED);
  // (whether a thing that can be pressed holds it, or a widget does — what
  // is in a widget is the program's to draw and to press: asked of the
  // elements over it, one by one — matching the selector up its every
  // ancestor, for each of a page's controls, is longer than a frame in a
  // headset)
  const pressed = new Set(all);
  const held = (el) => { for (let up = el.parentElement; up; up = up.parentElement) if (pressed.has(up)) return true; return false; };
  const widget_in = (el) => { for (let up = el; up && up.hasAttribute; up = up.parentElement) if (up.hasAttribute('data-crow-widget')) return true; return false; };
  for (const el of all) {
    // (where it lies first: what lies outside the stretch pictured is not
    // in the window until it is pictured again, and its styles are the
    // dearer question)
    let at = el.getBoundingClientRect();
    if (at.width < 1 || at.height < 1 || at.right <= left + 1 || at.bottom < from - 64 || at.top > upto + 64) continue;
    for (const s of clips || []) if (at && s.el !== el && s.el.contains(el)) at = shown_in(at, s, left);
    if (!at) continue;
    if (widget_in(el) || !seen(el)) continue;
    // (a label of no control is words, not a thing to press; a control inside its own label is the label's)
    if (el.tagName === 'LABEL' && control_of(el) === el) continue;
    const mine = el.parentElement && el.parentElement.closest('label');
    if (mine && control_of(mine) === el) continue;
    const r = at;
    const c = control_of(el).getBoundingClientRect();
    list.push({ el, also: null, outer: !held(el), x: r.left - left, y: r.top, w: r.width, h: r.height, cx: c.left - left, cw: c.width });
  }
  // (a label beside or over its control is one thing with it: a press on either is the control's)
  for (const a of list.slice()) {
    if (a.el.tagName !== 'LABEL' || !a.outer || a.el.contains(control_of(a.el))) continue;
    const c = list.find((t) => t.el === control_of(a.el));
    if (!c) continue;
    const gap_x = Math.max(c.x - (a.x + a.w), a.x - (c.x + c.w), 0), gap_y = Math.max(c.y - (a.y + a.h), a.y - (c.y + c.h), 0);
    if (gap_x > 16 || gap_y > 16) continue;
    const x = Math.min(a.x, c.x), y = Math.min(a.y, c.y);
    c.w = Math.max(a.x + a.w, c.x + c.w) - x;
    c.h = Math.max(a.y + a.h, c.y + c.h) - y;
    c.x = x;
    c.y = y;
    c.also = a.el;
    list.splice(list.indexOf(a), 1);
  }
  const outers = list.filter((t) => t.outer);
  for (const a of list) {
    a.gx = a.x;
    a.gy = a.y;
    a.gw = a.w;
    a.gh = a.h;
    if (!a.outer) continue;
    let l = Math.max(0, (least - a.w) / 2), r = l, t = Math.max(0, (least - a.h) / 2), b = t;
    for (const o of outers) {
      if (o === a) continue;
      const beside = o.y < a.y + a.h + b && o.y + o.h > a.y - t;
      const stacked = o.x < a.x + a.w + r && o.x + o.w > a.x - l;
      if (beside && o.x >= a.x + a.w - 1) r = Math.min(r, Math.max(0, (o.x - (a.x + a.w)) / 2));
      if (beside && o.x + o.w <= a.x + 1) l = Math.min(l, Math.max(0, (a.x - (o.x + o.w)) / 2));
      if (stacked && o.y >= a.y + a.h - 1) b = Math.min(b, Math.max(0, (o.y - (a.y + a.h)) / 2));
      if (stacked && o.y + o.h <= a.y + 1) t = Math.min(t, Math.max(0, (a.y - (o.y + o.h)) / 2));
    }
    a.gx = a.x - l;
    a.gy = a.y - t;
    a.gw = a.w + l + r;
    a.gh = a.h + t + b;
  }
  return list;
}

// what the page's styles let scroll: each rule whose overflow is auto or
// scroll, its selectors (what only a state of the pointer or of the focus
// would choose, chosen whatever the state; a part of an element, never)
function scroller_rules(rules, depth, out) {
  for (const r of rules) {
    if (r.type === 3) {
      if (r.styleSheet && depth < 4) {
        let inner = null;
        try { inner = r.styleSheet.cssRules; } catch (e) { inner = null; }
        if (inner) scroller_rules(inner, depth + 1, out);
      }
      continue;
    }
    if (r.style && r.selectorText && /auto|scroll/.test(r.style.overflow + ' ' + r.style.overflowX + ' ' + r.style.overflowY)) {
      for (const one of r.selectorText.split(',')) {
        if (one.includes('::')) continue;
        const sel = one.replace(/:(hover|focus-within|focus-visible|focus|active|visited)\b/g, '').trim();
        if (sel) out.add(sel);
      }
    }
    // (rules inside a media query, a supports, a layer)
    if (r.cssRules) scroller_rules(r.cssRules, depth, out);
  }
  return out;
}

function scroll_candidates(root) {
  root = root || doc.body;
  if (!styled.scrollers) {
    const sels = new Set(['textarea', 'select[multiple]', 'select[size]', '[style*="overflow"]']);
    for (const sheet of doc.styleSheets) {
      let rules = null;
      try { rules = sheet.cssRules; } catch (e) { continue; }
      scroller_rules(rules, 0, sels);
    }
    styled.scrollers = [...sels];
  }
  const found = new Set();
  for (const sel of styled.scrollers) {
    try {
      if (root !== doc.body && root.matches(sel)) found.add(root);
      for (const el of root.querySelectorAll(sel)) found.add(el);
    } catch (e) { /* a selector this browser does not take */ }
  }
  return found;
}

// what scrolls by itself in the main column: each thing that holds more
// than it shows, across or down — asked only of what the page's styles
// let scroll (to ask every element of a page how much it holds is longer
// than a frame, in a headset)
function scrollables(left, found) {
  const list = [];
  for (const el of found || scroll_candidates()) {
    const more_y = el.scrollHeight > el.clientHeight + 8, more_x = el.scrollWidth > el.clientWidth + 8;
    if (!more_y && !more_x) continue;
    const style = getComputedStyle(el);
    const sy = more_y && /auto|scroll/.test(style.overflowY), sx = more_x && /auto|scroll/.test(style.overflowX);
    if (!sx && !sy) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.right <= left + 1) continue;
    list.push({ el, x: r.left - left, y: r.top, w: r.width, h: r.height, sx, sy });
  }
  return list;
}

// what can be pressed in the page's side: the room's menu
function sided(left) {
  const list = [];
  if (!left) return list;
  const here = doc.location.pathname;
  // (the side's own controls, where the page has a side: the main column's are many)
  const side_el = first_of(wanted.side);
  for (const el of (side_el || doc).querySelectorAll(PRESSED)) {
    // (where it lies first: most of what can be pressed is in the main column)
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.left >= left) continue;
    if (!outermost(el) || !seen(el)) continue;
    const control = control_of(el);
    // (a button that is only a mark — the side's own fold — is no place to go)
    let name = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!name && (control.tagName === 'INPUT' || control.tagName === 'SELECT')) name = named(control);
    if (!name) continue;
    let current = el.getAttribute('aria-current') === 'page' || /\b(active|current|on)\b/.test(el.className || '');
    if (el.tagName === 'A') { try { current = current || new URL(el.href).pathname === here; } catch (e) { /* no address */ } }
    list.push({ el, name: name.length > 21 ? name.slice(0, 20) + '…' : name, current });
  }
  return list.slice(0, 40);
}

// What of the page lay at a point of the main column when its picture was
// taken: the thing pressed there — the innermost control the point is in,
// or the nearest of those whose grown box holds it — whether a widget,
// the program's own, stands there, and what scrolls there by itself
function target_at(x, y) {
  if (!laid || !doc || x < 0 || x >= laid.wide || y < 0 || y >= laid.tall) return null;
  const inside = (b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h;
  const out = { hit: null, widget: boxes.some(inside), sx: null, sy: null };
  for (const t of scrolls) {
    if (!inside(t)) continue;
    if (t.sx && (!out.sx || t.w * t.h < out.sx.w * out.sx.h)) out.sx = t;
    if (t.sy && (!out.sy || t.w * t.h < out.sy.w * out.sy.h)) out.sy = t;
  }
  if (out.widget) return out;
  let best = Infinity;
  for (const t of targets) {
    if (!inside(t)) continue;
    if (t.w * t.h < best) { best = t.w * t.h; out.hit = t; }
  }
  if (out.hit) return out;
  for (const t of targets) {
    if (x < t.gx || x > t.gx + t.gw || y < t.gy || y > t.gy + t.gh) continue;
    const dx = Math.max(t.x - x, 0, x - (t.x + t.w)), dy = Math.max(t.y - y, 0, y - (t.y + t.h));
    if (dx * dx + dy * dy < best) { best = dx * dx + dy * dy; out.hit = t; }
  }
  return out;
}

function hover(x, y) {
  const at = target_at(x, y);
  const t = at && at.hit;
  const sx = at && at.sx ? 1 : 0, sy = at && at.sy ? 1 : 0;
  const key = (t ? targets.indexOf(t) + ':' + t.x + ':' + t.y : 'none') + sx + sy;
  if (key === over) return;
  over = key;
  if (!t) return tell({ t: 'hover', x: 0, y: 0, w: 0, h: 0, way: '', sx, sy });
  const c = control_of(t.el);
  const way = c.tagName === 'INPUT' && c.type === 'range' ? 'slide' : c.tagName === 'SELECT' ? 'choose' : typed_in(c) ? 'type' : 'press';
  tell({ t: 'hover', x: t.x, y: t.y, w: t.w, h: t.h, way, sx, sy });
}

// the words that name a control: its label's, or what it says of itself
function named(el) {
  const field = el.closest('.crow-field, .crow-select, label');
  const label = field && (field.tagName === 'LABEL' ? field : field.querySelector('label'));
  let words = label ? label.textContent.trim() : '';
  // (or the few words that stand just before it, as a page words a list)
  const before = (field || el).previousElementSibling;
  if (!words && before && before.children.length === 0 && before.textContent.trim().length <= 40) words = before.textContent.trim();
  return words || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.name || (el.tagName === 'SELECT' ? 'Choose' : 'Type');
}

const TYPED = ['text', 'search', 'number', 'date', 'time', 'datetime-local', 'email', 'url', 'tel', 'password', 'month', 'week', ''];

function typed_in(el) {
  return el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && TYPED.includes((el.getAttribute('type') || '').toLowerCase()));
}

// a control that is not pressed but asked of: a list's choice, a field's words
function ask(el) {
  asking = el;
  if (el.tagName === 'SELECT') {
    return tell({ t: 'ask', kind: 'choice', label: named(el), words: '', choices: Array.from(el.options).map((o) => o.textContent.trim()), chosen: el.selectedIndex, type: 'select' });
  }
  const type = (el.getAttribute('type') || 'text').toLowerCase();
  // (the room's keyboard has letters and digits: a date and a time are typed as their digits)
  const how = type === 'date' ? ' — its digits, as 20261106' : type === 'time' ? ' — its digits, as 0930' : '';
  const words = type === 'date' || type === 'time' ? el.value.replace(/\D/g, '') : el.value;
  tell({ t: 'ask', kind: 'words', label: named(el) + how, words, choices: [], chosen: -1, type });
}

// the words typed in the room, as the control takes them: a date's and a
// time's digits put in their form (nothing until there are enough)
function shaped(el, words) {
  const type = (el.getAttribute('type') || 'text').toLowerCase();
  const d = words.replace(/\D/g, '');
  if (type === 'date') return d.length === 8 ? d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8) : d.length === 0 ? '' : null;
  if (type === 'time') return d.length === 4 ? d.slice(0, 2) + ':' + d.slice(2, 4) : d.length === 3 ? '0' + d.slice(0, 1) + ':' + d.slice(1, 3) : d.length === 0 ? '' : null;
  return words;
}

function changed(el, kinds) {
  for (const kind of kinds) el.dispatchEvent(new Event(kind, { bubbles: true }));
  stale = true;
}

// a thing of the page pressed: a list or a field is asked of the reader,
// anything else is the page's own click
function press(el) {
  if (el.tagName === 'A' && el.target === '_blank') return;
  el = control_of(el).tagName === 'SELECT' || typed_in(control_of(el)) ? control_of(el) : el;
  if (el.disabled) return;
  if (el.tagName === 'SELECT' || typed_in(el)) return ask(el);
  if (el.focus) el.focus();
  el.click();
  stale = true;
}

// a slider put where the pointer is along it
function slide(x) {
  const k = Math.max(0, Math.min(1, (x - slid.cx) / Math.max(1, slid.cw)));
  const lo = Number(sliding.min || 0), hi = Number(sliding.max || 100), step = Number(sliding.step) || 1;
  const v = String(Math.min(hi, Math.max(lo, lo + Math.round(k * (hi - lo) / step) * step)));
  if (v !== sliding.value) {
    sliding.value = v;
    changed(sliding, ['input']);
  }
}

// ---- a pulse in a hand, and the reader's own room about the window ----

// The headset's session is the loader's own. The host stands in the way
// of its asking, to keep the session (a pulse is a controller's, and a
// controller the session's) and, where the reader asked for their own
// room about the window, to ask for that kind of session instead.
function hook() {
  const xr = navigator.xr;
  if (!xr || xr.room_asks) return;
  const asks = xr.requestSession.bind(xr);
  xr.room_asks = true;
  xr.requestSession = async (mode, init) => {
    let want = mode;
    if (mixed && mode === 'immersive-vr') {
      try { if (await xr.isSessionSupported('immersive-ar')) want = 'immersive-ar'; } catch (e) { /* the headset's own room is not offered */ }
    }
    const s = await asks(want, init);
    session = s;
    tell({ t: 'mode', ar: want === 'immersive-ar' });
    s.addEventListener('end', () => { session = null; tell({ t: 'mode', ar: false }); });
    return s;
  };
}

function pulse(hand, strength, ms) {
  if (!session) return;
  for (const src of session.inputSources) {
    if (src.handedness !== hand || !src.gamepad) continue;
    const pad = src.gamepad;
    try {
      if (pad.hapticActuators && pad.hapticActuators[0]) pad.hapticActuators[0].pulse(strength, ms);
      else if (pad.vibrationActuator) pad.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength });
    } catch (e) { /* a controller with no pulse to give */ }
  }
}

// ---- what the program prints ----

function heard(kind, text) {
  if (kind === 'error' || kind === 'stopped') return fail(kind === 'stopped' ? 'the room stopped: ' + text : text);
  if (kind !== 'log') return;
  const w = text.split(' ');
  const x = Number(w[1]), y = Number(w[2]);
  // (what the room says of itself is taken whether or not a page is open yet)
  if (w[0] === '@panels') return hung(w, text);
  if (w[0] === '@chrome') {
    // (`@chrome bar [...]`, `raised` or `typing`: what the room shows of its own, and how it stands)
    standing = w[1];
    try { chrome = JSON.parse(text.slice(text.indexOf('['))); } catch (e) { chrome = []; }
    measured = null;
    return;
  }
  if (w[0] === '@scroll') {
    view = { top: x, tall: y };
    measured = null;
    // (a change the window did not show, now in it: pictured soon)
    if (unseen && unseen[1] > x - 8 && unseen[0] < x + y + 8) { stale = true; acted = performance.now(); }
    return tiles();
  }
  if (w[0] === '@parts') {
    // (`@parts {"main": [...], "side": [...]}`: which of a page's elements are its column and its side)
    let j = null;
    try { j = JSON.parse(text.slice(text.indexOf('{'))); } catch (e) { j = null; }
    if (!j || typeof j !== 'object') return;
    const list = (v, was) => (Array.isArray(v) ? v.map(String) : was);
    const now = { main: list(j.main, wanted.main), side: list(j.side, wanted.side) };
    if (JSON.stringify(now) !== JSON.stringify(wanted)) {
      wanted = now;
      stale = true;
      pictured = 0;
    }
    return;
  }
  if (!doc) return;
  // (the reader doing something to the page — not pointing about it, nor a pulse felt — has its pictures sooner)
  if (w[0] !== '@at' && w[0] !== '@away' && w[0] !== '@pulse') acted = performance.now();
  if (w[0] === '@at') {
    hover(x, y);
    if (sliding) slide(x);
  }
  if (w[0] === '@away') over = '';
  if (w[0] === '@down') {
    const at = target_at(x, y);
    down = at && at.hit ? at.hit.el : null;
    const c = down ? control_of(down) : null;
    if (c && c.tagName === 'INPUT' && c.type === 'range' && !c.disabled) {
      sliding = c;
      slid = at.hit;
      slide(x);
    }
  }
  if (w[0] === '@drag' && sliding) slide(x);
  if (w[0] === '@up') {
    const began = down;
    down = null;
    if (sliding) {
      changed(sliding, ['change']);
      sliding = null;
    } else {
      const at = target_at(x, y);
      // (a thing gone from the page since its picture is not pressed)
      if (began && at && at.hit && at.hit.el === began && began.isConnected) press(began);
    }
  }
  if (w[0] === '@wheel') {
    const at = target_at(x, y);
    // (what it scrolls is pictured as any change of the page is: its scroll
    // is heard, `scrolled_by`, alone where its box stands still)
    if (at && at.sx && Number(w[3])) at.sx.el.scrollLeft += Number(w[3]);
    // (a thing at its end hands what is left of the scrolling on to the page, as a browser does)
    let left = Number(w[4]) || 0;
    if (at && at.sy && left) {
      const was = at.sy.el.scrollTop;
      at.sy.el.scrollTop += left;
      left -= at.sy.el.scrollTop - was;
    }
    if (Math.abs(left) >= 1) tell({ t: 'more', dy: left });
  }
  if (w[0] === '@menu' && side[x]) press(side[x].el);
  if (w[0] === '@zoom' && ZOOMS.includes(x) && x !== zoom) {
    zoom = x;
    try { localStorage.setItem('room.zoom', String(zoom)); } catch (e) { /* not kept */ }
    stale = true;
    pictured = 0;
  }
  if (w[0] === '@pulse') pulse(w[1], Number(w[2]) || 0.5, Number(w[3]) || 20);
  if (w[0] === '@chose' && asking && asking.tagName === 'SELECT') {
    asking.selectedIndex = x;
    changed(asking, ['input', 'change']);
    asking = null;
  }
  if (w[0] === '@typed' && asking) {
    let words = null;
    try { words = shaped(asking, JSON.parse(text.slice(7))); } catch (e) { /* not words */ }
    if (words !== null && words !== asking.value) {
      asking.value = words;
      changed(asking, ['input']);
    }
  }
  if ((w[0] === '@entered' || w[0] === '@done') && asking) {
    const el = asking;
    asking = null;
    changed(el, ['change']);
    // (Enter in a field of a form sends the form, as it does on the page)
    if (w[0] === '@entered' && el.form && el.form.requestSubmit) el.form.requestSubmit();
  }
  if (w[0] === '@closed') asking = null;
  if (w[0] === '@sized') {
    // (`@sized n h`: widget n made h tall, the room drawing it so; the page pictured again as it stands then)
    const el = widgeted[x];
    if (el && el.isConnected && y >= 0) {
      sizes.set(el, y);
      if (sized(el, y)) stale = true;
    }
  }
  if (w[0] === '@widget') {
    // (`@widget n words`: what the reader did to widget n, handed to the widget's own module)
    const el = widgeted[x];
    const own = el && el.__room;
    if (own && typeof own.told === 'function') {
      try { own.told(w.slice(2).join(' ')); } catch (e) { /* the module did not take it */ }
      stale = true;
    }
  }
}

// ---- what the room shows, for a measure ----

// Where the program says each panel hangs (`@panels cols wide tall`, then
// nine numbers a panel: its top left corner, its top right, its bottom
// left, in the room's metres).
function hung(w, text) {
  const n = w.slice(4).map(Number), at = [];
  for (let k = 0; k * 9 + 8 < n.length; k++) at.push([n.slice(k * 9, k * 9 + 3), n.slice(k * 9 + 3, k * 9 + 6), n.slice(k * 9 + 6, k * 9 + 9)]);
  panels = { cols: Number(w[1]), wide: Number(w[2]), tall: Number(w[3]), at, sig: text };
  measured = null;
}

// a box of a panel's pixels as four corners of the room: top left, top
// right, bottom right, bottom left
function corners(b) {
  const k = Math.max(0, Math.min(panels.at.length - 1, Math.floor(b.x / panels.wide)));
  const p = panels.at[k], x0 = b.x - k * panels.wide;
  const at = (px, py) => [0, 1, 2].map((i) => p[0][i] + (p[1][i] - p[0][i]) * (px / panels.wide) + (p[2][i] - p[0][i]) * (py / panels.tall));
  return [at(x0, b.y), at(x0 + b.w, b.y), at(x0 + b.w, b.y + b.h), at(x0, b.y + b.h)];
}

// What the reader has before them, each as four corners in the room's
// metres: every control of the page the window shows (the box it answers
// to), every run of its words (a box as tall as its letters), and the
// room's own controls. Nothing the room does by: it is what Lory Studio
// measures a room with (how many degrees a control takes from where its
// reader is, how tall its letters stand), asked of any page that has a
// `lory_targets`.
window.lory_targets = () => {
  if (!laid || !doc || !doc.body || !panels || !panels.at.length) return [];
  const stamp = laid.v + ' ' + pictured + ' ' + panels.sig + ' ' + view.top + ' ' + chrome.length + ' ' + standing;
  if (measured && measured.stamp === stamp) return measured.things;
  const things = [];
  const top = view.top, foot = view.top + view.tall;
  const shown = (y, h) => y + h / 2 >= top && y + h / 2 <= foot;
  // (what is raised before the window hides the page; while words are typed the page is read, not pressed)
  for (const t of standing === 'bar' ? targets : []) {
    // (a thing cut by the window's edge is on its way in or out: measured when it is whole)
    if (t.y < top || t.y + t.h > foot || t.x < 0 || t.x + t.w > laid.wide) continue;
    const y0 = Math.max(top, t.gy), y1 = Math.min(foot, t.gy + t.gh);
    const c = control_of(t.el);
    // (named by its label's words, its own, or what it is called; a list by what it is called, not all it offers)
    const own = c.tagName === 'SELECT' ? '' : (t.el.textContent || '').trim();
    const fallback = c.tagName === 'INPUT' && c.type === 'range' ? 'Slider' : named(c);
    const name = (((t.also && t.also.textContent) || '').trim() || own || fallback || c.value || t.el.tagName).replace(/\s+/g, ' ').slice(0, 40);
    things.push({ name, kind: 'target', quad: corners({ x: t.gx, y: y0, w: t.gw, h: y1 - y0 }) });
  }
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const range = doc.createRange();
  for (let n = standing === 'raised' ? null : walker.nextNode(); n; n = walker.nextNode()) {
    const words = n.nodeValue.trim();
    if (!words || !n.parentElement || n.parentElement.closest('[data-crow-widget]') || !seen(n.parentElement)) continue;
    const size = parseFloat(getComputedStyle(n.parentElement).fontSize) || 0;
    range.selectNodeContents(n);
    const r = range.getBoundingClientRect();
    if (r.width < 1 || !size || r.right <= laid.left + 1 || r.left >= laid.left + laid.wide) continue;
    const y = r.top + (r.height - size) / 2;
    if (!shown(y, size)) continue;
    things.push({ name: words.replace(/\s+/g, ' ').slice(0, 40), kind: 'text', quad: corners({ x: r.left - laid.left, y, w: r.width, h: size }) });
  }
  for (const c of chrome) things.push({ name: c.name, kind: c.kind === 'text' ? 'text' : 'target', quad: corners(c) });
  measured = { stamp, things };
  return things;
};

// ---- the page, opened and watched ----

function opened() {
  try {
    doc = frame.contentDocument;
  } catch (e) {
    return fail('the room shows pages of this site only');
  }
  if (!doc || !doc.body) return;
  over = '';
  down = null;
  sliding = null;
  asking = null;
  widgeted = [];
  const here = doc.location.pathname + doc.location.search;
  document.getElementById('back').href = here;
  history.replaceState(null, '', location.pathname + '?at=' + encodeURIComponent(here));
  touched = [];
  unseen = null;
  pending = new Set();
  watched = new Set();
  boxed = new Map();
  outgrown = new WeakMap();
  restated = false;
  new MutationObserver(noted).observe(doc.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
  doc.addEventListener('scroll', scrolled_by, true);
  doc.addEventListener('input', () => { stale = true; }, true);
  stale = true;
}

// what the page changed by itself, sorted: a widget's change is the
// widgets to be told again (the program draws them; the page's picture
// shows nothing of them), anything else is kept to be looked at
// (`in_sight`)
function noted(records) {
  for (const r of records) {
    const el = r.target.nodeType === 1 ? r.target : r.target.parentElement;
    if (!el) continue;
    if (el.closest('[data-crow-widget]')) restated = true;
    else if (touched.length < 400) touched.push(el);
    else stale = true;
  }
}

// a thing of the page scrolled within itself — by the reader's stick or
// wheel, or by the page — changed as the page sees it: a change to look at
// (`in_sight`), pictured alone where it can be (its box stands where it
// stood, and nothing in it to press moved), else the page again. A widget's
// own scrolling is the widget's
function scrolled_by(e) {
  const el = e.target;
  if (!el || el.nodeType !== 1 || el.closest('[data-crow-widget]')) return;
  if (touched.length < 400) touched.push(el);
  else stale = true;
}

// what stands at the top, the middle and the foot of a stretch of the page,
// at its column's left and middle, and where — with how tall the page is:
// a change outside the stretch that moves what is in it moves these
function anchored(from, upto, left, across) {
  let out = String(Math.round(doc.body.scrollHeight));
  for (const y of [from + 2, (from + upto) / 2, upto - 2]) {
    for (const x of [left + 24, left + across / 2]) {
      const el = doc.elementFromPoint(x, y);
      const r = el ? el.getBoundingClientRect() : null;
      out += r ? '|' + el.tagName + ':' + Math.round(r.top) + ':' + Math.round(r.height) : '|-';
    }
  }
  return out;
}

// what of the page's own changes is in sight: what changed in the window
// (pictured alone where it can be, `patch`), or true where the change
// moved what the last picture took (a change over it that pushes the page
// down): the page is pictured again. What is not waits for the window: a
// tile the last picture did not take is taken when the window comes to it,
// and a change in a tile it took but the window cuts off (a page's tick: a
// status line, a table's cells over its charts) is kept in `unseen`,
// pictured when scrolled to
function in_sight() {
  const list = touched;
  touched = [];
  if (!image || !doc || !doc.body) return true;
  const shown = [];
  for (let el of list) {
    if (!el.isConnected) continue;
    let r = el.getBoundingClientRect();
    // (a thing the change hid stands where what holds it does)
    while (!r.width && !r.height && el.parentElement && el.parentElement !== doc.body) {
      el = el.parentElement;
      r = el.getBoundingClientRect();
    }
    if (r.bottom <= image.from - 8 || r.top >= image.upto + 8) continue;
    if (r.bottom > view.top - 8 && r.top < view.top + view.tall + 8) shown.push(el);
    else unseen = unseen ? [Math.min(unseen[0], r.top), Math.max(unseen[1], r.bottom)] : [r.top, r.bottom];
  }
  return anchored(image.from, image.upto, image.left, image.wide) !== anchors ? true : shown;
}

// the widgets told again as they stand now, with no picture of the page: a
// page that ticks while the window shows only its widgets — a session's
// charts — is not pictured again (in a headset that was a tenth of a
// second of frames every tick), but its widgets move on. A widget grown or
// moved changes the page: that is pictured
function restate() {
  restated = false;
  restated_at = performance.now();
  if (!laid || !doc || !doc.body) return;
  if (settle()) { stale = true; return; }
  const found = widgets(laid.left);
  const moved = found.length !== boxes.length || found.some((c, i) => Math.abs(c.x - boxes[i].x) > 0.5 || Math.abs(c.y - boxes[i].y) > 0.5 || Math.abs(c.w - boxes[i].w) > 0.5 || Math.abs(c.h - boxes[i].h) > 0.5);
  if (moved) { stale = true; return; }
  widgeted = found.map((c) => c.el);
  tell_widgets(found);
}

// the widgets told, where they differ from what was last told (a widget can
// change in ways its words do not: they would be read again for nothing).
// Each is its number, its kind, its box, its props (the page's own JSON,
// as it stands) and what its module put on its element for the room
let told_widgets = '';
function tell_widgets(found) {
  const list = found.map((c, n) => '{"n":' + n + ',"kind":' + JSON.stringify(c.el.getAttribute('data-crow-widget') || '') + ',"x":' + c.x + ',"y":' + c.y + ',"w":' + c.w + ',"h":' + c.h + ',"props":' + props_of(c.el) + ',"room":' + JSON.stringify(room_words(c.el)) + '}');
  const words = '{"t":"widgets","list":[' + list.join(',') + ']}';
  if (words === told_widgets) return;
  told_widgets = words;
  if (room) room.give({ type: 'told', text: words });
}

// ---- a change pictured alone ----

// What the page changed by itself in the window is pictured alone where it
// can be, not the page again: the block it is in — the nearest element laid
// out as a box of its own, a table's row or cell by its whole table —
// copied with shells of what holds it (each with its classes and its place
// among its own, so the page's styles choose for what is in it what they
// chose on the page, but no box of its own, only its ground), pictured at
// its own size and drawn over its place in the tiles that hold it. Only
// while it stands where it stood when the page was last pictured, and what
// can be pressed in it stands where it was read then (the reader points at
// what was read); that is read with each picture of every block seen
// changing, so a block's first change is pictured with the page.

const BOXED = /^(block|flex|grid|flow-root|list-item|table|inline-block|inline-flex|inline-grid|inline-table)$/;
// (a block alone stands in no line: what stood in one is the block it is)
const AS_BLOCK = { 'inline-block': 'flow-root', 'inline-flex': 'flex', 'inline-grid': 'grid', 'inline-table': 'table' };
// (what holds a block shows only its ground: the block's place is given it)
const SHELL = 'position:static!important;margin:0!important;padding:0!important;border:0!important;width:auto!important;height:auto!important;min-width:0!important;min-height:0!important;max-width:none!important;max-height:none!important;box-shadow:none!important;outline:0!important;overflow:visible!important;float:none!important;';

const unturned = (cs) => cs.transform === 'none' && (cs.translate || 'none') === 'none' && (cs.rotate || 'none') === 'none' && (cs.scale || 'none') === 'none' && (!cs.zoom || cs.zoom === '1');
const unblended = (cs) => (cs.backdropFilter || 'none') === 'none' && (cs.mixBlendMode || 'normal') === 'normal';

// the block a change is pictured in: the nearest element laid out as a box
// of its own that the page's flow puts in its place (not set apart, nor
// turned), whose children's margins stay inside it — or none
function block_of(el) {
  let b = el;
  while (b && b !== doc.body && b.nodeType === 1) {
    if (b.hasAttribute('data-crow-widget')) return null;
    const cs = getComputedStyle(b);
    if (cs.display.startsWith('table-')) {
      // (a table's part is laid out by the whole of it)
      let t = b.parentElement;
      while (t && t !== doc.body && !/^(inline-)?table$/.test(getComputedStyle(t).display)) t = t.parentElement;
      if (!t || t === doc.body) return null;
      b = t;
      continue;
    }
    if (BOXED.test(cs.display) && !collapses(b, cs)) {
      if ((cs.position !== 'static' && cs.position !== 'relative') || !unturned(cs) || !unblended(cs)) return null;
      // (a block cut by what holds it — a wide table in a box that scrolls
      // it across — is pictured as that box)
      const cut = cut_by(b);
      if (cut) { b = cut; continue; }
      return b;
    }
    b = b.parentElement;
  }
  return null;
}

// the nearest of what holds a block that shows only part of it
function cut_by(b) {
  const r = b.getBoundingClientRect();
  for (let up = b.parentElement; up && up !== doc.body; up = up.parentElement) {
    const us = getComputedStyle(up);
    if (us.overflowX === 'visible' && us.overflowY === 'visible') continue;
    const q = up.getBoundingClientRect();
    if (r.left < q.left - 0.02 || r.top < q.top - 0.02 || r.right > q.right + 0.02 || r.bottom > q.bottom + 0.02) return up;
  }
  return null;
}

// whether a top margin of what an element holds falls through its top
// (nothing there to hold it: no padding, no border, no box of its own the
// margins stay in): pictured alone, what is in it would stand lower by it
function collapses(el, cs) {
  let n = el, c = cs;
  for (let depth = 0; depth < 6; depth++) {
    if (!/^(block|list-item)$/.test(c.display) || c.overflowX !== 'visible' || c.overflowY !== 'visible' || parseFloat(c.paddingTop) || parseFloat(c.borderTopWidth)) return false;
    let first = null;
    for (let k = n.firstChild; k && !first; k = k.nextSibling) {
      if (k.nodeType === 3 && k.nodeValue.trim()) return false;
      if (k.nodeType !== 1) continue;
      const kc = getComputedStyle(k);
      if (kc.display === 'none' || kc.position === 'absolute' || kc.position === 'fixed' || kc.float !== 'none') continue;
      first = k;
      c = kc;
    }
    if (!first || !/^(block|list-item|flex|grid|flow-root|table)$/.test(c.display)) return false;
    if (parseFloat(c.marginTop)) return true;
    n = first;
  }
  return false;
}

// where a block stands, and where what in it can be pressed or is a widget
function stood_of(el) {
  const r = el.getBoundingClientRect();
  let held = '';
  for (const p of el.querySelectorAll(KEPT)) {
    const q = p.getBoundingClientRect();
    held += Math.round(q.left * 2) + ',' + Math.round(q.top * 2) + ',' + Math.round(q.width * 2) + ',' + Math.round(q.height * 2) + ';';
  }
  return { x: r.left, y: r.top, w: r.width, h: r.height, held };
}

const stands_as = (a, b) => !!a && !!b && Math.abs(a.x - b.x) < 0.02 && Math.abs(a.y - b.y) < 0.02 && Math.abs(a.w - b.w) < 0.02 && Math.abs(a.h - b.h) < 0.02 && a.held === b.held;

// whether the block is what is seen where it stands: nothing of the page laid over it
function uncovered(el, s) {
  for (const [fx, fy] of [[0.5, 0.5], [0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
    const hit = doc.elementFromPoint(s.x + s.w * fx, s.y + s.h * fy);
    if (!hit || (hit !== el && !el.contains(hit))) return false;
  }
  return true;
}

// the blocks the changes are pictured in, each as it stands: none where
// any is not to be pictured alone (the page is pictured whole then)
function blocks_of(list) {
  const found = [];
  for (const el of list) {
    if (!el.isConnected) continue;
    let b = block_of(el);
    while (b && outgrown.has(b)) b = outgrown.get(b);
    if (!b) return null;
    if (found.some((f) => f.el.contains(b))) continue;
    for (let i = found.length - 1; i >= 0; i--) if (b.contains(found[i].el)) found.splice(i, 1);
    found.push({ el: b, stood: null });
  }
  // (a block not seen changing before stands where the next picture finds it)
  let unread = false;
  for (const f of found) if (!boxed.has(f.el)) { watched.add(f.el); unread = true; }
  if (unread || found.length > PATCHED_MOST) return null;
  let area = 0;
  for (const f of found) {
    const s = (f.stood = stood_of(f.el));
    const was = boxed.get(f.el);
    if (!stands_as(s, was)) {
      // (a block that grew or shrank as it changed — words in a row — is
      // pictured from now on as what holds it, which may stand still; one
      // whose box stood still while what can be pressed in it moved — a
      // table scrolled in its box — is pictured with the page, whose
      // controls are read again with it)
      const grew = !was || Math.abs(s.x - was.x) >= 0.02 || Math.abs(s.y - was.y) >= 0.02 || Math.abs(s.w - was.w) >= 0.02 || Math.abs(s.h - was.h) >= 0.02;
      const up = grew && f.el.parentElement && block_of(f.el.parentElement);
      if (up) { outgrown.set(f.el, up); watched.add(up); }
      return null;
    }
    if (s.w < 1 || s.h < 1 || s.h > TILE) return null;
    if (s.x < image.left - 0.02 || s.x + s.w > image.left + image.wide + 0.02 || !uncovered(f.el, s)) return null;
    area += s.w * s.h;
  }
  return area > image.wide * view.tall ? null : found;
}

// a block pictured alone: its copy at its own size, as scrolled as it is
// within itself, in shells of what holds it, as an SVG image of its box
// made whole pixels (`x0`, `y0` its corner on the page) — or none, where
// what holds it would show other than its ground there (a picture of its
// own, a cut, a turn, a scroll)
function alone(b, st) {
  const el = b.el, s = b.stood;
  const x0 = Math.floor(s.x), y0 = Math.floor(s.y);
  const w = Math.ceil(s.x + s.w) - x0, h = Math.ceil(s.y + s.h) - y0;
  const cs = getComputedStyle(el);
  let inner = el.cloneNode(true);
  values_into(el, inner);
  scrolls_into(el, inner, scrolled_within(scroll_candidates(el)));
  for (const x of inner.querySelectorAll('script, iframe')) x.remove();
  inner.style.cssText += ';display:' + (AS_BLOCK[cs.display] || cs.display) + '!important;margin:0!important;width:' + s.w + 'px!important;height:' + s.h + 'px!important;min-width:0!important;min-height:0!important;max-width:none!important;max-height:none!important;box-sizing:border-box!important;float:none!important;inset:auto!important;';
  for (let at = el, up = el.parentElement; up; at = up, up = up.parentElement) {
    const shell = up.cloneNode(false);
    if (up !== doc.body) {
      const us = getComputedStyle(up);
      if (!unturned(us) || !unblended(us) || us.backgroundImage !== 'none' || us.clipPath !== 'none') return null;
      if (us.overflowX !== 'visible' || us.overflowY !== 'visible') {
        // (what cuts what it holds, or scrolls it: the block lies inside it, clear of its rounded corners, unscrolled)
        const r = up.getBoundingClientRect();
        const round = Math.max(parseFloat(us.borderTopLeftRadius) || 0, parseFloat(us.borderTopRightRadius) || 0, parseFloat(us.borderBottomLeftRadius) || 0, parseFloat(us.borderBottomRightRadius) || 0);
        if (up.scrollTop || up.scrollLeft || s.x < r.left - 0.02 || s.y < r.top - 0.02 || s.x + s.w > r.right + 0.02 || s.y + s.h > r.bottom + 0.02) return null;
        if (round && (s.x < r.left + round || s.x + s.w > r.right - round) && (s.y < r.top + round || s.y + s.h > r.bottom - round)) return null;
      }
      shell.style.cssText += ';' + SHELL + 'display:' + (us.display === 'contents' ? 'contents' : 'block') + '!important;background:' + us.backgroundColor + '!important;';
    }
    // (its place among its own kept, for what the page's styles say of an element's neighbours)
    for (const k of up.children) {
      if (k === at) shell.appendChild(inner);
      else if (k.tagName !== 'SCRIPT' && k.tagName !== 'IFRAME') {
        const stand_in = k.cloneNode(false);
        stand_in.setAttribute('style', 'display:none!important');
        shell.appendChild(stand_in);
      }
    }
    inner = shell;
    if (up === doc.body) break;
  }
  const held = new XMLSerializer().serializeToString(inner).replace(/^<body[^>]*>/, '').replace(/<\/body>$/, '');
  // (the picture's body is the block's frame: no box of the page's own, the block's corner where it stands in its first pixel)
  const svg = svg_of({ ...st, css: rules_for(el) }, w, h, 0, h, held, SHARP, `margin:0!important;border:0!important;min-width:0!important;max-width:none!important;min-height:0!important;max-height:none!important;box-sizing:border-box!important;width:${w}px!important;height:${h}px!important;overflow:hidden!important;padding:${s.y - y0}px 0 0 ${s.x - x0}px!important;background:${st.ground}!important`);
  return { svg, x0, y0, img: null };
}

const scratch = document.createElement('canvas');

// a block's picture drawn over its place in each tile that holds it: its
// whole texels (those its edges cut keep what the page's picture had),
// those alone sent to the GPU
function drawn_over(s, one) {
  let drew = false;
  for (let k = Math.max(0, Math.floor(s.y / TILE)); k * TILE < s.y + s.h && k < sheets.length; k++) {
    const sheet = sheets[k];
    if (!sheet || k * TILE >= image.tall) continue;
    const top = Math.max(s.y, k * TILE), foot = Math.min(s.y + s.h, (k + 1) * TILE);
    // (a tile not drawn since the page was pictured is drawn from that
    // picture when the window comes to it: what changed there is pictured then)
    if (sheet.dirty) {
      unseen = unseen ? [Math.min(unseen[0], top), Math.max(unseen[1], foot)] : [top, foot];
      continue;
    }
    const tx0 = Math.ceil((s.x - image.left) * SHARP), tx1 = Math.floor((s.x + s.w - image.left) * SHARP);
    const ty0 = Math.ceil((top - k * TILE) * SHARP), ty1 = Math.floor((foot - k * TILE) * SHARP);
    if (tx1 <= tx0 || ty1 <= ty0) continue;
    scratch.width = tx1 - tx0;
    scratch.height = ty1 - ty0;
    const pen = scratch.getContext('2d');
    pen.fillStyle = image.ground;
    pen.fillRect(0, 0, scratch.width, scratch.height);
    pen.drawImage(one.img, tx0 + (image.left - one.x0) * SHARP, ty0 + (k * TILE - one.y0) * SHARP, scratch.width, scratch.height, 0, 0, scratch.width, scratch.height);
    // (the tile's canvas kept as its texture shows it)
    sheet.pen.drawImage(scratch, tx0, ty0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.activeTexture(gl.TEXTURE0 + UNIT + k);
    gl.bindTexture(gl.TEXTURE_2D, sheet.tex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, tx0, ty0, gl.RGBA, gl.UNSIGNED_BYTE, scratch);
    gl.generateMipmap(gl.TEXTURE_2D);
    drew = true;
  }
  if (drew) gl.activeTexture(gl.TEXTURE0);
}

// the page's changes in the window pictured alone, each block over its
// place in its tiles; the page pictured whole where one cannot be
async function patch() {
  const list = [...pending];
  pending.clear();
  if (drawing || !image || !doc || !doc.body || !gl) return;
  const blocks = blocks_of(list);
  if (!blocks) { stale = true; return; }
  if (!blocks.length) return;
  drawing = true;
  const was = doc, from = image;
  try {
    const st = styles();
    const made = blocks.map((b) => alone(b, st));
    if (made.some((m) => !m)) { stale = true; return; }
    // (the blocks copied together, then each one's picture made and drawn,
    // each a task of its own: the headset's frames are drawn between them —
    // three made at once were a frame lost)
    for (let i = 0; i < blocks.length; i++) {
      await new Promise((done) => setTimeout(done, 0));
      const b = blocks[i], m = made[i];
      m.img = new Image();
      m.img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(m.svg);
      await m.img.decode();
      if (doc !== was || image !== from) return;
      // (the page moved while it was pictured: it is pictured whole)
      if (!b.el.isConnected || !stands_as(stood_of(b.el), b.stood)) { stale = true; return; }
      drawn_over(b.stood, m);
      measured = null;
    }
  } catch (e) {
    stale = true;
  } finally {
    drawing = false;
  }
}

// a picture when the page changed in sight: a few a second while the
// reader does something to it, one a second at most while it changes by
// itself (a session that plays). Each is the page drawn again and the
// tiles about the window sent to the GPU — in a headset, longer than a
// frame has, and a frame waits for it. A change the page made by itself in
// the window is pictured alone where it can be, as soon as it is seen; a
// change only to its widgets tells them again, no oftener than a picture
// would be
setInterval(() => {
  if (drawing) return;
  const now = performance.now();
  if (!stale && touched.length) {
    const shown = in_sight();
    if (shown === true) stale = true;
    else for (const el of shown) pending.add(el);
  }
  if (!stale) {
    if (pending.size) patch();
    else if (restated && now - restated_at > SOON) restate();
    return;
  }
  if (now - pictured > (now - acted < SOON_FOR ? SOON : CALM)) picture();
}, 120);

frame.addEventListener('load', opened);

// (`build`: another build of the program to try, by its address on this site)
const tried = params.get('build');
const MODULE = tried && tried.startsWith('/') && !tried.startsWith('//') ? tried : '/room-build/room.wasm';

Crow.start({ canvas, module: MODULE, said: heard }).then(async (page) => {
  room = page;
  gl = page.gl;
  // (the loader's way into the headset, with the host in the way of its asking)
  const enter = page.enter_vr;
  page.enter_vr = async () => { hook(); return enter(); };
  window.crow = page;
  frame.src = asked();
  if (await page.vr_supported()) {
    const vr = document.getElementById('vr');
    vr.style.display = 'block';
    vr.onclick = () => { mixed = false; page.enter_vr(); };
    let own = false;
    try { own = await navigator.xr.isSessionSupported('immersive-ar'); } catch (e) { own = false; }
    if (own) {
      const through = document.getElementById('mixed');
      through.style.display = 'block';
      through.onclick = () => { mixed = true; page.enter_vr(); };
    }
  }
}).catch((e) => fail(String(e && e.message ? e.message : e)));
