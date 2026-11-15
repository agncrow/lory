// Lory's datagrid held to TanStack Table, TOAST UI Grid and JavaScript.
//
// Runs the real libraries on fixed inputs and writes what they answered
// beside this script as reference.json, which reference.co holds
// lory.datagrid to, value for value:
//
//   @tanstack/table-core 9.3.1   (in node: cell selection, cell spanning)
//   tui-grid             4.21.22 (in headless Chrome: the keymap, focus and
//                                 selection, clearing, copying and pasting)
//   JavaScript itself             (in node: the 7GUIs Cells formulas, worked
//                                 out as Vue's example works them out, by
//                                 JavaScript's own arithmetic)
//
// Install them into a folder of your own (nothing here downloads anything),
// then name that folder's node_modules:
//
//   npm install --prefix <dir> @tanstack/table-core@9.3.1 tui-grid@4.21.22
//   node tests/datagrid/reference.mjs <dir>/node_modules
//
// Every input is written here, so the same run writes the same file.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

process.env.TZ = 'UTC';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const LIB = path.resolve(process.argv[2] || '');
const CHROME = process.env.LORY_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const load = (rel) => import(pathToFileURL(path.join(LIB, rel)).href);

const T = await load('@tanstack/table-core/dist/index.js');
const { storeReactivityBindings } = await load('@tanstack/table-core/dist/store-reactivity-bindings.js');
const versions = {
  'table-core': JSON.parse(fs.readFileSync(path.join(LIB, '@tanstack/table-core/package.json'))).version,
  'tui-grid': JSON.parse(fs.readFileSync(path.join(LIB, 'tui-grid/package.json'))).version,
};

// ---------------------------------------------------------------- values

function enc(v) {
  if (v === undefined) return { t: 'missing' };
  if (v === null) return { t: 'null' };
  if (typeof v === 'number') {
    if (Number.isNaN(v)) return { t: 'number', v: 'NaN' };
    if (v === Infinity) return { t: 'number', v: 'inf' };
    if (v === -Infinity) return { t: 'number', v: '-inf' };
    return { t: 'number', v };
  }
  if (typeof v === 'string') return { t: 'text', v };
  if (typeof v === 'boolean') return { t: 'bool', v };
  throw new Error('no encoding for ' + String(v));
}

// ---------------------------------------------------------------- table-core: the sheet

const TEAMS = ['red', 'red', 'red', 'blue', 'blue', 'gold', 'gold', 'gold', 'gold', 'red', 'blue', 'blue', 'green', 'green'];
const SHIFTS = ['am', 'am', 'pm', 'pm', 'pm', 'am', 'am', 'pm', 'pm', 'pm', 'am', 'am', 'am', 'pm'];
function sheet() {
  const out = [];
  for (let i = 0; i < 14; i++) {
    const row = { id: 'r' + i, team: TEAMS[i], shift: SHIFTS[i], name: 'n' + ((i * 5) % 14), hours: (i * 5) % 9, rate: 10 + (i % 4) * 2.5 };
    if (i % 5 !== 2) row.note = i % 3 === 0 ? 'x' : 'y';
    if (i === 6) row.note = null;
    out.push(row);
  }
  return out;
}
const SHEET = sheet();
const KEYS = ['team', 'shift', 'name', 'hours', 'rate', 'note'];

const FEATURES = T.tableFeatures({
  ...T.stockFeatures,
  coreReactivityFeature: storeReactivityBindings(),
  filteredRowModel: T.createFilteredRowModel(),
  sortedRowModel: T.createSortedRowModel(),
  expandedRowModel: T.createExpandedRowModel(),
  paginatedRowModel: T.createPaginatedRowModel(),
  sortFns: T.sortFns,
  filterFns: T.filterFns,
});

// A case: the table's state and options, the columns that may not be
// chosen, how cells span, and the steps taken.
//   span: { rows: [ids], columns: {id: n}, wide: {'id\trow': n}, off: [ids] }
function columnsOf(c) {
  const span = c.span || {};
  return KEYS.map((key) => {
    const def = { accessorKey: key, header: key };
    if ((c.unselectable || []).includes(key)) def.enableCellSelection = false;
    if ((span.rows || []).includes(key)) def.spanRows = true;
    if ((span.off || []).includes(key)) def.enableCellSpanning = false;
    const wide = Object.entries(span.wide || {}).filter(([k]) => k.split('\t')[0] === key);
    if (wide.length || (span.columns && key in span.columns)) {
      def.spanColumns = ({ row }) => {
        const own = (span.wide || {})[key + '\t' + row.id];
        if (own !== undefined) return own === 'all' ? Infinity : own;
        const all = (span.columns || {})[key];
        return all === 'all' ? Infinity : all ?? 1;
      };
    }
    return def;
  });
}

function make(c) {
  return T.constructTable({
    features: FEATURES,
    data: SHEET,
    columns: columnsOf(c),
    getRowId: (row) => row.id,
    ...(c.options || {}),
    initialState: { pagination: { pageIndex: 0, pageSize: 100 }, ...(c.state || {}) },
  });
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function read(table) {
  const rows = table.getRowsInDisplayOrder();
  const cols = table.getVisibleLeafColumns();
  const ordered = T.orderColumns ? null : null;
  const drawn = rows.length ? rows[0].getVisibleCells().map((cell) => cell.column.id) : [];
  const cells = [];
  for (const row of rows) {
    const byId = row.getAllCellsByColumnId();
    for (const id of drawn) {
      const cell = byId[id];
      const e = cell.getSelectionEdges();
      cells.push([cell.getIsSelected() ? 1 : 0, cell.getIsFocused() ? 1 : 0, e.top ? 1 : 0, e.right ? 1 : 0, e.bottom ? 1 : 0, e.left ? 1 : 0]);
    }
  }
  const focused = table.getFocusedCell();
  return {
    state: table.atoms.cellSelection.get().map((r) => [r.anchorRowId, r.anchorColumnId, r.focusRowId, r.focusColumnId, r.operation || 'include']),
    bounds: table.getCellSelectionBounds().map((b) => [b.minRowIndex, b.maxRowIndex, b.minColumnIndex, b.maxColumnIndex]),
    count: table.getSelectedCellCount(),
    ids: table.getSelectedCellIds(),
    rows: table.getCellSelectionRowIds(),
    columns: table.getCellSelectionColumnIds(),
    data: table.getSelectedCellRangesData().map((g) => g.map((r) => r.map(enc))),
    focused: focused ? focused.id : '',
    cells,
  };
}

function spansOf(table) {
  const ix = table.getCellSpanIndex();
  const out = [];
  const rendered = ix.rows;
  const drawn = rendered.length ? rendered[0].getVisibleCells().map((cell) => cell.column.id) : [];
  for (const row of rendered) {
    const byId = row.getAllCellsByColumnId();
    for (const id of drawn) {
      const cell = byId[id];
      out.push([cell.getRowSpan(), cell.getColSpan(), cell.getIsCovered() ? 1 : 0]);
    }
  }
  return {
    rendered: rendered.map((r) => r.id),
    columns: drawn,
    cells: out,
    merges: table.getCellSelectionMergeBounds().map((b) => [b.minRowIndex, b.maxRowIndex, b.minColumnIndex, b.maxColumnIndex]),
  };
}

// a document of our own, so a press opens a drag and a release ends it
function documentOf() {
  const d = { ups: [] };
  d.addEventListener = (name, f) => { if (name === 'mouseup') d.ups.push(f); };
  d.removeEventListener = (name, f) => { d.ups = d.ups.filter((g) => g !== f); };
  return d;
}

async function selectionCase(name, c) {
  const table = make(c);
  table.getRowModel();
  await tick();
  const doc = documentOf();
  const steps = [];
  const cellOf = (r, col) => table.getPrePaginatedRowModel().rowsById[r].getAllCellsByColumnId()[col];
  for (const s of c.steps) {
    const [op, ...a] = s;
    // (a press or a drag reaches only a cell that is shown)
    if ((op === 'press' || op === 'reach') && !table.getRowsInDisplayOrder().some((r) => r.id === a[0])) {
      steps.push({ step: s, skipped: true });
      continue;
    }
    if (op === 'press') cellOf(a[0], a[1]).getSelectionStartHandler(doc)({ shiftKey: !!a[2], ctrlKey: !!a[3], metaKey: false });
    else if (op === 'reach') cellOf(a[0], a[1]).getSelectionExtendHandler()({});
    else if (op === 'release') doc.ups.slice().forEach((f) => f());
    else if (op === 'move') table.moveCellSelection(a[0]);
    else if (op === 'extend') table.extendCellSelection(a[0]);
    else if (op === 'all') table.selectAllCells();
    else if (op === 'focus') table.setFocusedCell(a[0], a[1]);
    else if (op === 'range') table.selectCellRange({ anchorRowId: a[0], anchorColumnId: a[1], focusRowId: a[2], focusColumnId: a[3] }, { mode: a[4] });
    else if (op === 'clear') table.resetCellSelection(true);
    else throw new Error('no step ' + op);
    table.getRowModel();
    await tick();
    steps.push({ step: s, ...read(table) });
  }
  return { name, options: c.options || {}, state: c.state || {}, unselectable: c.unselectable || [], span: c.span || {}, spans: spansOf(table), steps };
}

const R = 'r';
const DRAG = [['press', 'r1', 'name'], ['reach', 'r2', 'name'], ['reach', 'r4', 'hours'], ['release'], ['reach', 'r6', 'rate'],
  ['press', 'r5', 'rate', true], ['press', 'r3', 'shift', false, true], ['press', 'r2', 'hours', false, true],
  ['reach', 'r7', 'note'], ['release'], ['move', 'down'], ['extend', 'right'], ['extend', 'right'], ['extend', 'down'],
  ['extend', 'up'], ['move', 'left'], ['move', 'left'], ['move', 'left'], ['move', 'up'], ['all'], ['move', 'right'],
  ['focus', 'r13', 'note'], ['move', 'down'], ['move', 'right'], ['extend', 'up'], ['extend', 'left'],
  ['range', 'r8', 'shift', 'r10', 'rate', 'include'], ['range', 'r9', 'name', 'r9', 'hours', 'exclude'],
  ['range', 'r0', 'team', 'r1', 'team', 'replace'], ['clear'], ['move', 'right'], ['extend', 'down']];
const KEYED = [['focus', 'r0', 'team'], ['move', 'right'], ['move', 'right'], ['extend', 'down'], ['extend', 'right'], ['move', 'down'],
  ['press', 'r4', 'team'], ['press', 'r6', 'note', true], ['press', 'r5', 'name', false, true], ['move', 'up'], ['extend', 'left'], ['all']];

const SELECTIONS = [];
const SPANNED = { rows: ['team', 'shift'], wide: { 'name\tr3': 2, 'hours\tr9': 'all', 'team\tr12': 3 } };
const CASES = [
  ['plain, dragged and keyed', { steps: DRAG }],
  ['sorted by hours, descending', { state: { sorting: [{ id: 'hours', desc: true }] }, steps: DRAG }],
  ['filtered to names with a 1', { state: { columnFilters: [{ id: 'name', value: '1' }] }, steps: DRAG }],
  ['ordered, a column pinned, one hidden', { state: { columnOrder: ['note', 'rate', 'name', 'team', 'shift', 'hours'], columnPinning: { start: ['hours'], end: [] }, columnVisibility: { shift: false } }, steps: DRAG }],
  ['paged five a page, the second page', { state: { pagination: { pageIndex: 1, pageSize: 5 } }, steps: DRAG }],
  ['a column that may not be chosen', { unselectable: ['shift', 'rate'], steps: DRAG.concat(KEYED) }],
  ['no Shift ranges', { options: { enableCellRangeSelection: false }, steps: KEYED }],
  ['no Ctrl rectangles', { options: { enableMultiCellRangeSelection: false }, steps: KEYED }],
  ['no drag', { options: { enableCellSelectionDrag: false }, steps: DRAG }],
  ['no selection at all', { options: { enableCellSelection: false }, steps: KEYED }],
  ['spanned', { span: SPANNED, steps: DRAG.concat(KEYED) }],
  ['spanned and sorted by team', { span: SPANNED, state: { sorting: [{ id: 'team', desc: false }] }, steps: DRAG }],
  ['spanned, a page of six', { span: SPANNED, state: { pagination: { pageIndex: 1, pageSize: 6 } }, steps: DRAG }],
  ['spanned with rows pinned', { span: SPANNED, state: { rowPinning: { top: ['r9'], bottom: ['r1'] } }, steps: KEYED }],
  ['spanned, a column pinned at each end', { span: { rows: ['team', 'shift'], columns: { team: 'all', name: 2 }, off: ['shift'] }, state: { columnPinning: { start: ['team'], end: ['note'] } }, steps: KEYED }],
  ['spanned off for the table', { span: SPANNED, options: { enableCellSpanning: false }, steps: KEYED }],
];
for (const [name, c] of CASES) SELECTIONS.push(await selectionCase(name, c));

// ---------------------------------------------------------------- JavaScript: the Cells formulas

// A cell as Vue's Cells example holds it: what was typed, trimmed. Its
// value: a formula (`=` first) worked out as a JavaScript expression in
// which `A0`-style names read other cells' values; else a number where
// the text is one; else the text. A formula that throws (a name of
// nothing, a cycle that never ends) is an error.
function evaluate(raw, at, depth) {
  if (depth > 200) throw new Error('too deep');
  const text = raw[at] ?? '';
  if (!text.startsWith('=')) {
    if (text !== '' && !Number.isNaN(Number(text))) return Number(text);
    return text;
  }
  const body = text.slice(1).replace(/\b([A-Z])(\d{1,2})\b/g, (_, c, r) => `get("${c}${r}")`);
  const get = (ref) => evaluate(raw, ref, depth + 1);
  // eslint-disable-next-line no-new-func
  return new Function('get', `return (${body});`)(get);
}
function shownOf(raw, at) {
  try {
    const v = evaluate(raw, at, 0);
    return { ok: true, value: enc(v), text: String(v) };
  } catch (e) {
    return { ok: false, value: enc(''), text: '#ERROR' };
  }
}
const SHEETS = [
  { A0: '2', B0: '=A0*3', C0: '=B0+A0', D0: '=C0/0', E0: '=-C0/0' },
  { A0: ' 5 ', A1: '=A0*A0', A2: '=A1-A0*2.5', A3: '=(A1+A2)/7', A4: '=A3%4', B0: 'hello', B1: '=B0+A0', B2: '=A0+B0', B3: '=B0*2', B4: '=B9+1' },
  { A0: '0.1', A1: '0.2', A2: '=A0+A1', A3: '=A2*3', A4: '=1/3', A5: '=2/3*3', A6: '=1e21*10', A7: '=0.000001/10', A8: '=-0' },
  { A0: '=A1+1', A1: '=A2+1', A2: '=A0+1', B0: '=C0+', B1: '=Z9', B2: '=(1+2', B3: '=1+2)', B4: '=3 4' },
  { C3: '7', C4: '=C3*-2', C5: '=C4- -1', C6: '=+C3', C7: '=C3+C4*C5-C6/C3', C8: '=((C3))', D3: '=C3 * 2 + 1', D4: '= C3', D5: '=C10+C3', C10: '12' },
  { E19: '42', E18: '=E19/E19', E17: '=E19-E18', A19: '=E19*E17', B19: 'x y', C19: '=B19+E19', D19: '=E19+B19+E19' },
  { A0: '3', A1: '', A2: '=A1*4', A3: '=A1+1', A4: '=A1+A0', A5: '  ', A6: '=A5+1', A7: '1e3', A8: '0x10', A9: '-.5', A10: '=A7+A8+A9' },
];
const CELLS = SHEETS.map((raw) => {
  const trimmed = {};
  for (const [k, v] of Object.entries(raw)) trimmed[k] = v.trim();
  const out = {};
  for (const c of 'ABCDE') for (let r = 0; r < 20; r++) out[c + r] = shownOf(trimmed, c + r);
  return { raw, cells: out };
});

// ---------------------------------------------------------------- TOAST UI Grid: the keymap

// A grid of 12 rows and 5 columns (a, b, c, d, e) with every column edited
// as text; each case focuses a cell, then types keys at the grid, reading
// the focused cell, the selection and the data after each key.
const TOAST_ROWS = [];
for (let i = 0; i < 12; i++) {
  TOAST_ROWS.push({ a: 'a' + i, b: String(i * 3), c: i % 2 ? 'odd' : 'even', d: 'd' + (11 - i), e: String(i * i) });
}
const TOAST_CASES = [
  { name: 'arrows and their edges', focus: [5, 'c'], keys: ['up', 'up', 'left', 'left', 'left', 'down', 'right', 'right', 'right', 'right', 'right', 'up', 'up', 'up', 'up', 'up', 'up'] },
  { name: 'home, end, page up and down, the corners', focus: [6, 'b'], keys: ['home', 'end', 'pageUp', 'pageDown', 'ctrl-home', 'ctrl-end', 'up', 'home'] },
  { name: 'shift extends, then a move lets it go', focus: [3, 'b'], keys: ['shift-down', 'shift-down', 'shift-right', 'shift-right', 'shift-up', 'shift-left', 'shift-left', 'shift-left', 'down', 'shift-end', 'shift-pageDown', 'shift-home', 'shift-pageUp', 'right'] },
  { name: 'shift with the corners and select-all', focus: [4, 'c'], keys: ['ctrl-shift-end', 'ctrl-shift-home', 'left', 'ctrl-a', 'down', 'ctrl-a', 'shift-up'] },
  { name: 'select-all, then shift up', focus: [5, 'b'], keys: ['ctrl-a', 'shift-up', 'shift-up'] },
  { name: 'select-all, then shift down', focus: [5, 'b'], keys: ['ctrl-a', 'shift-down'] },
  { name: 'select-all, then shift left', focus: [5, 'b'], keys: ['ctrl-a', 'shift-left', 'shift-right'] },
  { name: 'select-all at the corner, then shift right', focus: [0, 'a'], keys: ['ctrl-a', 'shift-right', 'shift-down', 'shift-pageUp'] },
  { name: 'tab goes on along the rows', focus: [0, 'd'], keys: ['tab', 'tab', 'tab', 'shift-tab', 'shift-tab', 'shift-tab', 'shift-tab', 'shift-tab'], edits: true },
  { name: 'tab at the last cell', focus: [11, 'd'], keys: ['tab', 'tab', 'tab'], edits: true },
  { name: 'delete clears the selection', focus: [2, 'b'], keys: ['shift-down', 'shift-right', 'del', 'down', 'down', 'backspace', 'up'] },
  { name: 'copy a cell and a rectangle', focus: [1, 'a'], keys: ['ctrl-c', 'shift-down', 'shift-right', 'shift-right', 'ctrl-c'] },
  { name: 'paste a block', focus: [8, 'c'], keys: ['paste:x1\ty1\nx2\ty2', 'down', 'paste:z', 'shift-down', 'shift-right', 'shift-right', 'shift-down', 'paste:p\tq\nr\ts', 'right', 'right', 'right', 'paste:1\t2\t3\t4'] },
  { name: 'paste quoted lines', focus: [0, 'a'], keys: ['paste:"two\nlines"\tplain\n"say ""hi"""\tend', 'ctrl-c'] },
];

const KEY_CODES = { backspace: 8, tab: 9, enter: 13, esc: 27, left: 37, up: 38, right: 39, down: 40, a: 65, c: 67, v: 86, space: 32, pageUp: 33, pageDown: 34, home: 36, end: 35, del: 46 };

function toastRun() {
  const js = path.join(LIB, 'tui-grid', 'dist', 'tui-grid.js');
  const css = path.join(LIB, 'tui-grid', 'dist', 'tui-grid.css');
  const page = `<!doctype html><html><head><link rel="stylesheet" href="file://${css}"></head><body>
<div id="g" style="width:800px"></div><pre id="out">pending</pre>
<script src="file://${js}"></script>
<script>
const CODES = ${JSON.stringify(KEY_CODES)};
const ROWS = ${JSON.stringify(TOAST_ROWS)};
const CASES = ${JSON.stringify(TOAST_CASES)};
const out = [];
const columns = ['a', 'b', 'c', 'd', 'e'].map((name) => ({ name, header: name.toUpperCase(), editor: 'text' }));
function key(el, stroke) {
  const parts = stroke.split('-');
  const name = parts[parts.length - 1];
  const ev = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ctrlKey: parts.includes('ctrl'), shiftKey: parts.includes('shift') });
  Object.defineProperty(ev, 'keyCode', { get: () => CODES[name] });
  Object.defineProperty(ev, 'which', { get: () => CODES[name] });
  el.dispatchEvent(ev);
}
async function run() {
  for (const c of CASES) {
    document.getElementById('g').innerHTML = '';
    const grid = new tui.Grid({ el: document.getElementById('g'), data: JSON.parse(JSON.stringify(ROWS)), columns, bodyHeight: 400, rowHeaders: [], usageStatistics: false });
    grid.focusAt(c.focus[0], ['a', 'b', 'c', 'd', 'e'].indexOf(c.focus[1]));
    await new Promise((r) => setTimeout(r, 30));
    const steps = [];
    for (const k of c.keys) {
      const clip = document.querySelector('.tui-grid-clipboard');
      let copied = null;
      if (k.startsWith('paste:')) {
        const data = new DataTransfer();
        data.setData('text/plain', k.slice(6));
        clip.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
      } else {
        key(clip, k);
        if (k === 'ctrl-c') copied = clip.textContent;
      }
      await new Promise((r) => setTimeout(r, 30));
      if (grid.isEditing && grid.isEditing()) grid.finishEditing();
      const f = grid.getFocusedCell();
      const s = grid.getSelectionRange();
      steps.push({ key: k, focus: [f.rowKey === null ? -1 : grid.getIndexOfRow(f.rowKey), f.columnName || ''],
        selection: s ? [s.start[0], s.end[0], s.start[1], s.end[1]] : null, copied,
        data: grid.getData().map((r) => ['a', 'b', 'c', 'd', 'e'].map((n) => r[n] === null || r[n] === undefined ? '' : String(r[n]))),
        rows: grid.getRowCount() });
    }
    out.push({ name: c.name, focus: c.focus, keys: c.keys, steps });
    grid.destroy();
  }
  document.getElementById('out').textContent = JSON.stringify(out);
}
run().catch((e) => { document.getElementById('out').textContent = 'failed ' + e.stack; });
</script></body></html>`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lory-datagrid-'));
  const file = path.join(dir, 'page.html');
  fs.writeFileSync(file, page);
  const dom = execFileSync(CHROME, ['--headless=new', '--allow-file-access-from-files', `--user-data-dir=${dir}/profile`,
    '--virtual-time-budget=20000', '--dump-dom', 'file://' + file], { encoding: 'utf8', maxBuffer: 64 << 20 });
  fs.rmSync(dir, { recursive: true, force: true });
  const found = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/);
  const text = found ? found[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&') : '';
  if (!text.startsWith('[')) throw new Error('TOAST UI Grid said: ' + text.slice(0, 400));
  return JSON.parse(text);
}
const TOAST = toastRun();

fs.writeFileSync(path.join(HERE, 'reference.json'), JSON.stringify({ versions, sheet: SHEET.map((r) => ({ id: r.id, cells: Object.fromEntries(KEYS.filter((k) => k in r).map((k) => [k, enc(r[k])])) })), keys: KEYS, selections: SELECTIONS, cells: CELLS, toast: { rows: TOAST_ROWS, cases: TOAST } }));
let values = 0;
const count = (x) => { if (Array.isArray(x)) x.forEach(count); else if (x && typeof x === 'object') Object.values(x).forEach(count); else values++; };
count({ SELECTIONS, CELLS, TOAST });
console.log(`wrote reference.json: ${SELECTIONS.length} selection cases, ${CELLS.length} sheets, ${TOAST.length} TOAST UI cases, ${values} values`);
