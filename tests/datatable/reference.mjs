// Lory's datatable held to TanStack Table and Grid.js.
//
// Runs the real libraries on fixed generated data and writes what they
// answered beside this script as reference.json, which reference.co holds
// lory.datatable to, value for value:
//
//   @tanstack/table-core        9.3.1  (in node: row models, columns, state)
//   @tanstack/match-sorter-utils 9.2.6 (in node: rankItem's fuzzy ranks)
//   gridjs                      6.2.0  (in headless Chrome: search, sort, pages)
//
// Install them into a folder of your own (nothing here downloads anything),
// then name that folder's node_modules:
//
//   npm install --prefix <dir> @tanstack/table-core@9.3.1 \
//       @tanstack/match-sorter-utils@9.2.6 gridjs@6.2.0
//   node tests/datatable/reference.mjs <dir>/node_modules
//
// The data is made here from a seeded generator (names from syllables), so
// the same run writes the same file; it runs in UTC wherever it runs (a
// date's text is JavaScript's local time, which lory.datatable writes in UTC). Each case builds a fresh table, changes
// its state step by step through the library's own functions, and reads the
// row models after every change (and after the change's scheduled resets
// run), as a page that draws after each change would.

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
const M = await load('@tanstack/match-sorter-utils/dist/index.js');
const { removeAccents } = await load('@tanstack/match-sorter-utils/dist/remove-accents.js');
const versions = {
  'table-core': JSON.parse(fs.readFileSync(path.join(LIB, '@tanstack/table-core/package.json'))).version,
  'match-sorter-utils': JSON.parse(fs.readFileSync(path.join(LIB, '@tanstack/match-sorter-utils/package.json'))).version,
  gridjs: JSON.parse(fs.readFileSync(path.join(LIB, 'gridjs/package.json'))).version,
};

// ---------------------------------------------------------------- values

// A cell as JSON: which JavaScript value it was, and the value.
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
  if (v instanceof Date) return { t: 'date', v: v.getTime() };
  if (Array.isArray(v)) return { t: 'list', v: v.map(enc) };
  throw new Error('no encoding for ' + String(v));
}

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const SYLLABLES = ['ka', 'lo', 'mi', 'ra', 'ten', 'vo', 'shi', 'an', 'bel', 'dor', 'el', 'fin', 'gar',
  'hal', 'ix', 'jo', 'ny', 'ost', 'pe', 'qui', 'ru', 'sa', 'tor', 'ul', 'ven', 'wy', 'zo'];
const STATUSES = ['single', 'relationship', 'complicated'];
const TAGS = ['red', 'green', 'blue', 'gold'];
const CODES = ['A2', 'A10', 'a1', 'B03', 'b3', '10', '9', 'x7y', 'X7Y10', 'Item 2', 'item 10',
  'item 2b', '007', 'Zed', 'zed 1', '1.5', 'b10', 'B2'];

function word(r, parts) {
  let w = '';
  for (let i = 0; i < parts; i++) w += SYLLABLES[Math.floor(r() * SYLLABLES.length)];
  return w;
}
const capital = (w) => w.charAt(0).toUpperCase() + w.slice(1);

function people(n) {
  const r = seeded(7);
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = { id: 'p' + i };
    let first = capital(word(r, 2));
    if (i % 7 === 3) first = first.toLowerCase();
    if (i === 20) first = out[4].first;
    p.first = first;
    p.last = capital(word(r, 2 + (i % 2)));
    const age = 18 + Math.floor(r() * 60);
    if (i % 11 === 3) { /* no age */ } else if (i % 13 === 5) p.age = null; else p.age = age;
    p.visits = Math.floor(r() * 1000);
    p.progress = Math.round(r() * 10000) / 100;
    p.status = STATUSES[Math.floor(r() * 3)];
    if (i % 17 !== 4) p.joined = new Date(Date.UTC(2020 + (i % 5), (i * 7) % 12, 1 + ((i * 13) % 28)));
    if (i % 19 !== 6) p.code = CODES[(i * 5) % CODES.length];
    const tags = [];
    for (const t of TAGS) if (r() < 0.4) tags.push(t);
    p.tags = tags;
    p.active = i % 3 !== 0;
    p.score = i % 5;
    out.push(p);
  }
  return out;
}

function tree() {
  const r = seeded(11);
  const make = (id, depth) => ({
    id,
    name: capital(word(r, 2)),
    amount: Math.floor(r() * 500) / 4,
    kind: ['a', 'b', 'c'][Math.floor(r() * 3)],
    ...(r() < 0.8 ? { note: word(r, 1) + ' ' + word(r, 1) } : {}),
    subs: [],
  });
  const out = [];
  for (let i = 0; i < 10; i++) {
    const top = make('t' + i, 0);
    for (let j = 0; j < i % 4; j++) {
      const sub = make(top.id + '.' + j, 1);
      if ((i + j) % 3 === 0) for (let k = 0; k < 2; k++) sub.subs.push(make(sub.id + '.' + k, 2));
      top.subs.push(sub);
    }
    out.push(top);
  }
  return out;
}

const DATA = { people: people(48), tree: tree() };

function rowsJson(rows) {
  return rows.map((row) => {
    const cells = {};
    for (const [k, v] of Object.entries(row)) if (k !== 'id' && k !== 'subs' && v !== undefined) cells[k] = enc(v);
    return { id: row.id, cells, subs: rowsJson(row.subs || []) };
  });
}

// ---------------------------------------------------------------- columns

const COLUMNS = {
  people: [
    { id: 'select', header: 'Select' },
    { id: 'name', header: 'Name', columns: [
      { accessorKey: 'first', header: 'First' },
      { accessorKey: 'last', header: 'Last' },
    ] },
    { id: 'info', header: 'Info', columns: [
      { accessorKey: 'age', header: 'Age' },
      { id: 'more', header: 'More', columns: [
        { accessorKey: 'visits', header: 'Visits' },
        { accessorKey: 'status', header: 'Status' },
        { accessorKey: 'progress', header: 'Progress' },
      ] },
    ] },
    { accessorKey: 'joined', header: 'Joined' },
    { accessorKey: 'code', header: 'Code' },
    { accessorKey: 'tags', header: 'Tags' },
    { accessorKey: 'active', header: 'Active' },
    { accessorKey: 'score', header: 'Score' },
  ],
  tree: [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'amount', header: 'Amount' },
    { accessorKey: 'kind', header: 'Kind' },
    { accessorKey: 'note', header: 'Note' },
  ],
};

// A column set with some definitions changed: {column id: {option: value}}
// merged into the leaf (or group) of that id.
function columnsWith(set, changes) {
  const walk = (cols) => cols.map((c) => {
    const id = c.id ?? c.accessorKey;
    const out = { ...c, ...(changes[id] || {}) };
    if (c.columns) out.columns = walk(c.columns);
    return out;
  });
  return walk(COLUMNS[set]);
}

// ---------------------------------------------------------------- the fuzzy filter and sort

const fuzzy = (row, columnId, value, addMeta) => {
  const itemRank = M.rankItem(row.getValue(columnId), value);
  addMeta?.({ itemRank });
  return itemRank.passed;
};
const rank = (rowA, rowB, columnId) => {
  let dir = 0;
  if (rowA.columnFiltersMeta[columnId]) {
    dir = M.compareItems(rowA.columnFiltersMeta[columnId].itemRank, rowB.columnFiltersMeta[columnId].itemRank);
  }
  return dir === 0 ? T.sortFns.alphanumeric(rowA, rowB, columnId) : dir;
};

const FEATURES = T.tableFeatures({
  ...T.stockFeatures,
  coreReactivityFeature: storeReactivityBindings(),
  filteredRowModel: T.createFilteredRowModel(),
  groupedRowModel: T.createGroupedRowModel(),
  sortedRowModel: T.createSortedRowModel(),
  expandedRowModel: T.createExpandedRowModel(),
  paginatedRowModel: T.createPaginatedRowModel(),
  facetedRowModel: T.createFacetedRowModel(),
  facetedUniqueValues: T.createFacetedUniqueValues(),
  facetedMinMaxValues: T.createFacetedMinMaxValues(),
  sortFns: { ...T.sortFns, rank },
  filterFns: { ...T.filterFns, fuzzy },
  aggregationFns: T.aggregationFns,
});

// options as JSON (what reference.co reads) and as the library takes them:
// `unselectable` names rows enableRowSelection answers false for,
// `unpinnable` rows enableRowPinning answers false for, and `closed` rows
// enableSubRowSelection answers false for.
function libraryOptions(o) {
  const out = { ...o };
  delete out.unselectable;
  delete out.closed;
  delete out.unpinnable;
  if (o.unselectable) out.enableRowSelection = (row) => !o.unselectable.includes(row.id);
  if (o.closed) out.enableSubRowSelection = (row) => !o.closed.includes(row.id);
  if (o.unpinnable) out.enableRowPinning = (row) => !o.unpinnable.includes(row.id);
  return out;
}

function decodeState(state) {
  const out = { ...state };
  if (state.columnFilters) out.columnFilters = state.columnFilters.map((f) => ({ id: f.id, value: dec(f.value) }));
  if ('globalFilter' in state) out.globalFilter = dec(state.globalFilter);
  return out;
}

// The inverse of enc, for filter values written in the cases.
function dec(j) {
  if (j === undefined) return undefined;
  if (j === null || typeof j !== 'object' || Array.isArray(j) || !('t' in j)) {
    if (Array.isArray(j)) return j.map(dec);
    return j;
  }
  switch (j.t) {
    case 'missing': return undefined;
    case 'null': return null;
    case 'date': return new Date(j.v);
    case 'list': return j.v.map(dec);
    case 'number': return j.v === 'NaN' ? NaN : j.v === 'inf' ? Infinity : j.v === '-inf' ? -Infinity : j.v;
    default: return j.v;
  }
}

function make(spec) {
  return T.constructTable({
    features: FEATURES,
    data: DATA[spec.data],
    columns: spec.changes ? columnsWith(spec.data, spec.changes) : COLUMNS[spec.data],
    getRowId: (row) => row.id,
    getSubRows: (row) => row.subs,
    ...libraryOptions(spec.options || {}),
    initialState: decodeState(spec.state || {}),
  });
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
async function settle(table) {
  table.getRowModel();
  await tick();
  table.getRowModel();
  await tick();
}

// ---------------------------------------------------------------- reading a table

const preorder = (rows) => {
  const out = [];
  const walk = (rs) => rs.forEach((r) => { out.push(`${r.id}:${r.depth}`); walk(r.subRows); });
  walk(rows);
  return out;
};
const ids = (rows) => rows.map((r) => `${r.id}:${r.depth}`);
const sortedKeys = (o) => Object.keys(o).filter((k) => o[k]).sort();

function models(table) {
  return {
    filtered: preorder(table.getFilteredRowModel().rows),
    filteredFlat: ids(table.getFilteredRowModel().flatRows),
    sorted: preorder(table.getSortedRowModel().rows),
    page: ids(table.getRowModel().rows),
    pageFlat: ids(table.getRowModel().flatRows),
    pagination: table.atoms.pagination.get(),
    pageCount: table.getPageCount(),
    rowCount: table.getRowCount(),
    canPrevious: table.getCanPreviousPage(),
    canNext: table.getCanNextPage(),
    pageOptions: table.getPageOptions().length,
  };
}

function groups(table) {
  const leafIds = table.getAllLeafColumns().map((c) => c.id);
  const out = [];
  const walk = (rows) => rows.forEach((row) => {
    if (row.groupingColumnId !== undefined) {
      const values = {};
      for (const id of leafIds) values[id] = enc(row.getValue(id));
      out.push({ id: row.id, depth: row.depth, index: row.index, parent: row.parentId ?? '', column: row.groupingColumnId,
        value: enc(row.groupingValue), leaves: row.leafRows.map((r) => r.id), subs: row.subRows.map((r) => r.id), values });
    }
    walk(row.subRows);
  });
  walk(table.getSortedRowModel().rows);
  const footers = {};
  for (const id of leafIds) footers[id] = enc(table.getColumn(id).getAggregationValue());
  return { groups: out, footers, leafOrder: leafIds, visibleOrder: table.getVisibleLeafColumns().map((c) => c.id) };
}

// ---------------------------------------------------------------- cases: row models

const CASES = [];
function rowCase(name, spec) {
  const table = make(spec);
  const out = models(table);
  if (spec.group) Object.assign(out, groups(table));
  if (spec.ranks) {
    out.ranks = {};
    for (const row of table.getFilteredRowModel().flatRows) {
      const meta = row.columnFiltersMeta;
      out.ranks[row.id] = {};
      for (const [id, m] of Object.entries(meta)) out.ranks[row.id][id] = m.itemRank.rank;
    }
  }
  CASES.push({ name, ...spec, out });
}

const PEOPLE_LEAVES = ['first', 'last', 'age', 'visits', 'status', 'progress', 'joined', 'code', 'active', 'score'];

// sorting: every leaf both ways (tags hold lists, which `basic` cannot order consistently)
for (const id of PEOPLE_LEAVES) {
  for (const desc of [false, true]) {
    rowCase(`sort ${id} ${desc ? 'desc' : 'asc'}`, { data: 'people', state: { sorting: [{ id, desc }], pagination: { pageIndex: 0, pageSize: 100 } } });
  }
}
rowCase('sort status then age desc', { data: 'people', state: { sorting: [{ id: 'status', desc: false }, { id: 'age', desc: true }], pagination: { pageIndex: 0, pageSize: 100 } } });
rowCase('sort active desc, score, last', { data: 'people', state: { sorting: [{ id: 'active', desc: true }, { id: 'score', desc: false }, { id: 'last', desc: false }], pagination: { pageIndex: 0, pageSize: 100 } } });
rowCase('sort score then first desc', { data: 'people', state: { sorting: [{ id: 'score', desc: false }, { id: 'first', desc: true }], pagination: { pageIndex: 0, pageSize: 100 } } });
for (const how of ['first', 'last', -1, 1]) {
  for (const desc of [false, true]) {
    rowCase(`sort age undefined ${how} ${desc ? 'desc' : 'asc'}`, { data: 'people', changes: { age: { sortUndefined: how }, joined: { sortUndefined: how } },
      state: { sorting: [{ id: 'age', desc }], pagination: { pageIndex: 0, pageSize: 100 } } });
    rowCase(`sort joined undefined ${how} ${desc ? 'desc' : 'asc'}`, { data: 'people', changes: { joined: { sortUndefined: how } },
      state: { sorting: [{ id: 'joined', desc }], pagination: { pageIndex: 0, pageSize: 100 } } });
  }
}
for (const desc of [false, true]) {
  rowCase(`sort code undefined compared ${desc ? 'desc' : 'asc'}`, { data: 'people', changes: { code: { sortUndefined: false } },
    state: { sorting: [{ id: 'code', desc }], pagination: { pageIndex: 0, pageSize: 100 } } });
  rowCase(`sort score inverted ${desc ? 'desc' : 'asc'}`, { data: 'people', changes: { score: { invertSorting: true } },
    state: { sorting: [{ id: 'score', desc }, { id: 'first', desc: false }], pagination: { pageIndex: 0, pageSize: 100 } } });
}
for (const fn of ['alphanumeric', 'alphanumericCaseSensitive', 'text', 'textCaseSensitive', 'basic', 'datetime']) {
  for (const id of ['code', 'first']) {
    rowCase(`sort ${id} by ${fn}`, { data: 'people', changes: { [id]: { sortFn: fn } }, state: { sorting: [{ id, desc: false }], pagination: { pageIndex: 0, pageSize: 100 } } });
  }
}
rowCase('sort a column that cannot sort', { data: 'people', changes: { first: { enableSorting: false } },
  state: { sorting: [{ id: 'first', desc: false }, { id: 'score', desc: true }], pagination: { pageIndex: 0, pageSize: 100 } } });
rowCase('sort tree amount desc', { data: 'tree', state: { sorting: [{ id: 'amount', desc: true }], expanded: true, pagination: { pageIndex: 0, pageSize: 100 } } });
rowCase('sort tree kind then name', { data: 'tree', state: { sorting: [{ id: 'kind', desc: false }, { id: 'name', desc: false }], expanded: true, pagination: { pageIndex: 0, pageSize: 100 } } });

// filtering
const filterCase = (name, filters, extra = {}) => rowCase(name, { data: 'people', ...extra,
  state: { columnFilters: filters, pagination: { pageIndex: 0, pageSize: 100 }, ...(extra.state || {}) } });
filterCase('filter first includes a', [{ id: 'first', value: enc('a') }]);
filterCase('filter first includes KA', [{ id: 'first', value: enc('KA') }]);
filterCase('filter age 30 to 50', [{ id: 'age', value: enc([30, 50]) }]);
filterCase('filter age from text 20', [{ id: 'age', value: enc(['20', null]) }]);
filterCase('filter age up to 40', [{ id: 'age', value: enc([null, 40]) }]);
filterCase('filter age reversed range', [{ id: 'age', value: enc([60, 30]) }]);
filterCase('filter status single', [{ id: 'status', value: enc('single') }]);
filterCase('filter active true', [{ id: 'active', value: enc(true) }]);
filterCase('filter active false', [{ id: 'active', value: enc(false) }]);
filterCase('filter tags red', [{ id: 'tags', value: enc(['red']) }]);
filterCase('filter tags red or gold', [{ id: 'tags', value: enc(['red', 'gold']) }]);
filterCase('filter joined in 2022', [{ id: 'joined', value: enc([new Date(Date.UTC(2022, 0, 1)), new Date(Date.UTC(2022, 11, 31))]) }]);
filterCase('filter code includes 1', [{ id: 'code', value: enc('1') }]);
filterCase('filter two columns', [{ id: 'status', value: enc('rel') }, { id: 'score', value: enc([1, 3]) }]);
filterCase('filter first sensitive', [{ id: 'first', value: enc('K') }], { changes: { first: { filterFn: 'includesStringSensitive' } } });
filterCase('filter first equals', [{ id: 'first', value: enc(DATA.people[4].first.toUpperCase()) }], { changes: { first: { filterFn: 'equalsString' } } });
filterCase('filter tags all', [{ id: 'tags', value: enc(['red', 'blue']) }], { changes: { tags: { filterFn: 'arrIncludesAll' } } });
filterCase('filter tags some', [{ id: 'tags', value: enc(['gold', 'green']) }], { changes: { tags: { filterFn: 'arrIncludesSome' } } });
filterCase('filter score equals 3', [{ id: 'score', value: enc(3) }], { changes: { score: { filterFn: 'equals' } } });
filterCase('filter score weakly equals text 3', [{ id: 'score', value: enc('3') }], { changes: { score: { filterFn: 'weakEquals' } } });
filterCase('filter code arrIncludes texts', [{ id: 'code', value: enc(['A', 'z']) }], { changes: { code: { filterFn: 'arrIncludes' } } });
filterCase('filter a column with filtering off', [{ id: 'first', value: enc('a') }], { changes: { first: { enableColumnFilter: false } } });
filterCase('global ka', [], { state: { globalFilter: enc('ka') } });
filterCase('global 3', [], { state: { globalFilter: enc('3') } });
filterCase('global number 2', [], { state: { globalFilter: enc(2) } });
filterCase('global without last', [], { changes: { last: { enableGlobalFilter: false } }, state: { globalFilter: enc('an') } });
filterCase('global with tags', [], { changes: { tags: { enableGlobalFilter: true } }, state: { globalFilter: enc('gold') } });
filterCase('global and a column', [{ id: 'active', value: enc(true) }], { state: { globalFilter: enc('o') } });
filterCase('global off for the table', [], { options: { enableGlobalFilter: false }, state: { globalFilter: enc('ka') } });
filterCase('global by equalsString', [], { options: { globalFilterFn: 'equalsString' }, state: { globalFilter: enc('single') } });

// filtering sub-rows: from the root down and from the leaves up
for (const fromLeaves of [false, true]) {
  for (const depth of [undefined, 0, 1]) {
    for (const value of ['a', 'zo']) {
      rowCase(`tree filter name ${value} ${fromLeaves ? 'leaves' : 'root'} ${depth ?? 'any'}`, { data: 'tree',
        options: { filterFromLeafRows: fromLeaves, ...(depth === undefined ? {} : { maxLeafRowFilterDepth: depth }) },
        state: { columnFilters: [{ id: 'name', value: enc(value) }], expanded: true, pagination: { pageIndex: 0, pageSize: 100 } } });
    }
  }
}
rowCase('tree filter amount', { data: 'tree', options: { filterFromLeafRows: true },
  state: { columnFilters: [{ id: 'amount', value: enc([20, 80]) }], expanded: true, pagination: { pageIndex: 0, pageSize: 100 } } });

// fuzzy
for (const q of ['ka', 'kl', 'tor', 'shi', 'xq', 'ann']) {
  rowCase(`fuzzy first ${q}`, { data: 'people', ranks: true, changes: { first: { filterFn: 'fuzzy', sortFn: 'rank' } },
    state: { columnFilters: [{ id: 'first', value: enc(q) }], sorting: [{ id: 'first', desc: false }], pagination: { pageIndex: 0, pageSize: 100 } } });
}
rowCase('fuzzy global', { data: 'people', ranks: true, options: { globalFilterFn: 'fuzzy' },
  state: { globalFilter: enc('ra'), pagination: { pageIndex: 0, pageSize: 100 } } });

// grouping and aggregation
const AGGREGATE = { age: { aggregationFn: 'mean' }, visits: { aggregationFn: 'sum' }, progress: { aggregationFn: 'median' },
  score: { aggregationFn: 'extent' }, code: { aggregationFn: 'uniqueCount' }, first: { aggregationFn: 'count' },
  last: { aggregationFn: 'first' }, tags: { aggregationFn: 'unique' }, active: { aggregationFn: 'last' } };
rowCase('group status', { data: 'people', group: true, changes: AGGREGATE, state: { grouping: ['status'], pagination: { pageIndex: 0, pageSize: 100 } } });
rowCase('group status, active', { data: 'people', group: true, changes: AGGREGATE, state: { grouping: ['status', 'active'], pagination: { pageIndex: 0, pageSize: 100 } } });
rowCase('group active, score', { data: 'people', group: true, changes: { ...AGGREGATE, age: { aggregationFn: 'min' }, progress: { aggregationFn: 'max' } },
  state: { grouping: ['active', 'score'], expanded: true, pagination: { pageIndex: 0, pageSize: 100 } } });
rowCase('group status auto aggregation', { data: 'people', group: true, state: { grouping: ['status'], pagination: { pageIndex: 0, pageSize: 100 } } });
rowCase('group age', { data: 'people', group: true, changes: AGGREGATE, state: { grouping: ['age'], sorting: [{ id: 'age', desc: false }], pagination: { pageIndex: 0, pageSize: 100 } } });
rowCase('group status sorted by visits', { data: 'people', group: true, changes: AGGREGATE,
  state: { grouping: ['status'], sorting: [{ id: 'visits', desc: true }], expanded: true, pagination: { pageIndex: 0, pageSize: 100 } } });
rowCase('group status removed', { data: 'people', group: true, options: { groupedColumnMode: 'remove' }, changes: AGGREGATE,
  state: { grouping: ['status'], pagination: { pageIndex: 0, pageSize: 100 } } });
rowCase('group status kept in place', { data: 'people', group: true, options: { groupedColumnMode: false }, changes: AGGREGATE,
  state: { grouping: ['status'], pagination: { pageIndex: 0, pageSize: 100 } } });
rowCase('group filtered', { data: 'people', group: true, changes: AGGREGATE,
  state: { grouping: ['score'], columnFilters: [{ id: 'active', value: enc(true) }], pagination: { pageIndex: 0, pageSize: 100 } } });
for (const paginateExpandedRows of [true, false]) {
  for (const pageIndex of [0, 1]) {
    rowCase(`group expanded pages ${paginateExpandedRows} ${pageIndex}`, { data: 'people', group: true, changes: AGGREGATE,
      options: { paginateExpandedRows }, state: { grouping: ['status'], expanded: { 'status:single': true }, pagination: { pageIndex, pageSize: 7 } } });
  }
}

// expanding and pages of the tree
for (const paginateExpandedRows of [true, false]) {
  for (const expanded of [{}, true, { t1: true, t2: true, 't3.0': true }, { 't3.0': true }, { t3: true }]) {
    for (const pageIndex of [0, 1, 2]) {
      rowCase(`tree expanded ${JSON.stringify(expanded)} ${paginateExpandedRows} ${pageIndex}`, { data: 'tree',
        options: { paginateExpandedRows }, state: { expanded, pagination: { pageIndex, pageSize: 4 } } });
    }
  }
}

// pages of people
for (const [pageIndex, pageSize] of [[0, 10], [1, 10], [4, 10], [5, 10], [0, 7], [6, 7], [2, 25], [0, 48], [0, 1], [47, 1]]) {
  rowCase(`page ${pageIndex} of ${pageSize}`, { data: 'people', state: { pagination: { pageIndex, pageSize } } });
}
rowCase('page with a known page count', { data: 'people', options: { manualPagination: true, pageCount: 3 }, state: { pagination: { pageIndex: 1, pageSize: 10 } } });
rowCase('page with an unknown page count', { data: 'people', options: { manualPagination: true, pageCount: -1 }, state: { pagination: { pageIndex: 2, pageSize: 10 } } });
rowCase('page with a row count', { data: 'people', options: { manualPagination: true, rowCount: 95 }, state: { pagination: { pageIndex: 2, pageSize: 10 } } });

// the program's own steps: each manual flag hands the rows on as they came
rowCase('manual sorting, filtering and grouping', { data: 'people', group: true, options: { manualSorting: true, manualFiltering: true, manualGrouping: true },
  state: { sorting: [{ id: 'age', desc: true }], columnFilters: [{ id: 'first', value: enc('a') }], grouping: ['status'], pagination: { pageIndex: 0, pageSize: 100 } } });
rowCase('tree manual expanding', { data: 'tree', options: { manualExpanding: true }, state: { expanded: true, pagination: { pageIndex: 0, pageSize: 4 } } });

// ---------------------------------------------------------------- unit cases: sort, filter and rank functions

const fakeRow = (v, extra = {}) => ({ getValue: () => v, index: 0, ...extra });
const SORT_POOL = ['a', 'B', 'b', 'a10', 'a2', 'A2', 'item 10', 'item 9', 'Item 9', '', '10', '9', '1.5', 'x1y', 'x01y',
  '007', '7', 'ab', 'a b', 'Zed', 'zed', 1, 2, 10, -1, 0, 1.5, 100, NaN, Infinity, true, false, null, undefined,
  new Date(Date.UTC(2021, 3, 5)), new Date(Date.UTC(2019, 0, 1)), [1, 2], '99999999999999999999', '99999999999999999998'];
const sortFnCases = [];
for (const fn of ['alphanumeric', 'alphanumericCaseSensitive', 'text', 'textCaseSensitive', 'datetime', 'basic']) {
  const f = T.sortFns[fn];
  const out = [];
  for (const a of SORT_POOL) for (const b of SORT_POOL) {
    if ((Array.isArray(a) || Array.isArray(b)) && (fn === 'basic' || fn === 'datetime')) { out.push(null); continue; }
    out.push(f(fakeRow(a), fakeRow(b), 'c'));
  }
  sortFnCases.push({ fn, out });
}

const FILTER_POOL = ['Kalo', 'kalo', 'KA', 'ka', 'lo', '', ' ', 'a b', '3', 3, 0, -2, 2.5, 30, true, false, null, undefined,
  ['red', 'blue'], ['red'], [], ['3'], [3], new Date(Date.UTC(2022, 5, 1))];
const FILTER_VALUES = {
  includesString: ['ka', 'KA', 'Lo', '3', '', 3, true],
  includesStringSensitive: ['ka', 'KA', 'Lo', '3', 3],
  equalsString: ['kalo', 'KALO', '3', 3, 'true'],
  equalsStringSensitive: ['kalo', 'Kalo', '3', 3],
  startsWith: ['ka', 'K', 'l', '3'],
  endsWith: ['lo', 'O', '3', 'b'],
  arrIncludes: [['red'], ['blue', 'x'], ['ka'], ['3'], [3], []],
  arrIncludesAll: [['red'], ['red', 'blue'], ['red', 'gold'], ['3']],
  arrIncludesSome: [['gold', 'red'], ['gold'], ['3'], [3]],
  arrHas: [['Kalo', 3], ['ka'], [true, null], ['3']],
  equals: ['ka', 3, '3', true, null, 0],
  weakEquals: ['ka', 3, '3', true, null, 0, '0', '', ' '],
  inNumberRange: [[0, 3], [3, 3], ['2', '30'], [null, 2.5], [5, null], [30, -2], ['', ''], ['x', 'y']],
  empty: [true],
  notEmpty: [true],
  greaterThan: [2, '2', 'k', 0],
  greaterThanOrEqualTo: [3, '3', 'kalo', -2],
  lessThan: [3, '3', 'kb'],
  lessThanOrEqualTo: [3, '2.5', 'ka'],
  between: [[0, 3], ['', 3], [2, ''], [3, 0], ['a', 'l']],
  betweenInclusive: [[0, 3], ['', 3], [3, 0], ['ka', 'lo']],
};
const filterFnCases = [];
for (const [fn, values] of Object.entries(FILTER_VALUES)) {
  const f = T.filterFns[fn] ?? T['filterFn_' + fn];
  const out = [];
  for (const fv of values) {
    const resolved = f.resolveFilterValue ? f.resolveFilterValue(fv) : fv;
    const row = [];
    for (const dv of FILTER_POOL) row.push(Boolean(f(fakeRow(dv), 'c', resolved)));
    out.push({ value: enc(fv), resolved: enc(resolved), passes: row });
  }
  const removes = [];
  for (const v of ['', ' ', null, undefined, 0, false, [], [null, null], ['', ''], [null, 3], 'x', ['x']]) {
    removes.push({ value: enc(v), removes: Boolean(f.autoRemove ? f.autoRemove(v) : false) });
  }
  filterFnCases.push({ fn, out, removes });
}

const RANK_ITEMS = ['Kalo', 'kalo', 'Kalo Ven', 'Ka-lo Ven', 'shimira', 'Tormi Ka', 'ann', 'Anna Bel', 'élan', 'Élan',
  'crème brûlée', 'Ünal', '', 'abc def ghi', 'a-b-c', 'tenvo', 'Ixven', 42, null, undefined, true, 'Zoë'];
const RANK_QUERIES = ['Kalo', 'kalo', 'ka', 'kv', 'kav', 'ven', 'lo', 'k', 'z', 'tk', 'adg', 'abc', 'ac', 'shmr', 'smr',
  'elan', 'creme', 'cb', 'unal', 'an', 'nl', '4', '42', 'nul', 'undefined', 'ue', 'zoe', 'xyz', 'Kalo Ven longer'];
const rankCases = [];
for (const item of RANK_ITEMS) {
  const out = [];
  for (const q of RANK_QUERIES) {
    const r = M.rankItem(item, q);
    out.push([r.rank, r.passed]);
  }
  rankCases.push({ item: enc(item), out });
}

// the accents rankItem takes off before it compares: every letter of Latin-1 and Latin Extended-A
const accentCases = [];
for (let c = 0xC0; c <= 0x17F; c++) accentCases.push([String.fromCharCode(c), removeAccents(String.fromCharCode(c))]);

// ---------------------------------------------------------------- sequences: toggling sorting

function sortReport(table, columns) {
  const out = { sorting: table.atoms.sorting.get().map((s) => ({ id: s.id, desc: s.desc })), columns: {} };
  for (const id of columns) {
    const c = table.getColumn(id);
    out.columns[id] = { sorted: c.getIsSorted(), index: c.getSortIndex(), next: c.getNextSortingOrder(false),
      nextMulti: c.getNextSortingOrder(true), first: c.getFirstSortDir(), canSort: c.getCanSort(),
      canMulti: c.getCanMultiSort(), auto: c.getAutoSortDir() };
  }
  return out;
}
const toggleCases = [];
async function toggleCase(name, spec, steps) {
  const table = make(spec);
  const watched = spec.watch || ['first', 'age', 'status', 'joined', 'select'];
  const out = [sortReport(table, watched)];
  for (const [id, multi] of steps) {
    table.getColumn(id).getToggleSortingHandler()({ shiftKey: multi });
    await settle(table);
    out.push(sortReport(table, watched));
  }
  toggleCases.push({ name, ...spec, watch: watched, steps, out });
}
await toggleCase('toggle text', { data: 'people' }, [['first', false], ['first', false], ['first', false], ['first', false]]);
await toggleCase('toggle number', { data: 'people' }, [['age', false], ['age', false], ['age', false], ['age', false]]);
await toggleCase('toggle date', { data: 'people' }, [['joined', false], ['joined', false], ['joined', false]]);
await toggleCase('toggle multi', { data: 'people' }, [['first', false], ['age', true], ['age', true], ['age', true],
  ['status', true], ['first', true], ['first', true], ['age', false], ['status', true], ['status', false]]);
await toggleCase('toggle without removal', { data: 'people', options: { enableSortingRemoval: false } },
  [['first', false], ['first', false], ['first', false], ['age', true], ['age', true], ['age', true]]);
await toggleCase('toggle without multi removal', { data: 'people', options: { enableMultiRemove: false } },
  [['first', false], ['age', true], ['age', true], ['age', true], ['first', false], ['first', false]]);
await toggleCase('toggle three of two', { data: 'people', options: { maxMultiSortColCount: 2 } },
  [['first', false], ['age', true], ['status', true], ['joined', true], ['age', true]]);
await toggleCase('toggle desc first', { data: 'people', options: { sortDescFirst: true } },
  [['first', false], ['first', false], ['first', false], ['age', false], ['age', false], ['age', false]]);
await toggleCase('toggle column asc first', { data: 'people', changes: { age: { sortDescFirst: false }, first: { sortDescFirst: true } } },
  [['age', false], ['age', false], ['age', false], ['first', false], ['first', false], ['first', false]]);
await toggleCase('toggle without multi', { data: 'people', options: { enableMultiSort: false } },
  [['first', false], ['age', true], ['status', true]]);
await toggleCase('toggle a column without multi', { data: 'people', changes: { age: { enableMultiSort: false } } },
  [['first', false], ['age', true], ['status', true], ['age', true]]);
await toggleCase('toggle a column that cannot sort', { data: 'people', changes: { first: { enableSorting: false } } },
  [['first', false], ['age', false], ['first', true]]);
await toggleCase('toggle with sorting off', { data: 'people', options: { enableSorting: false } }, [['first', false], ['age', false]]);
await toggleCase('toggle tree', { data: 'tree', watch: ['name', 'amount', 'kind', 'note'] },
  [['note', false], ['note', false], ['amount', true], ['kind', true]]);
await toggleCase('toggle after a filter', { data: 'people', state: { columnFilters: [{ id: 'age', value: enc([70, 99]) }] } },
  [['first', false], ['age', false]]);

// ---------------------------------------------------------------- sequences: pages and their resets

const pageCases = [];
async function pageCase(name, spec, steps) {
  const table = make(spec);
  await settle(table);
  const out = [models(table)];
  for (const s of steps) {
    const [what, arg] = s;
    if (what === 'index') table.setPageIndex(arg);
    else if (what === 'size') table.setPageSize(arg);
    else if (what === 'next') table.nextPage();
    else if (what === 'previous') table.previousPage();
    else if (what === 'first') table.firstPage();
    else if (what === 'last') table.lastPage();
    else if (what === 'filter') table.setColumnFilters(arg.map((f) => ({ id: f.id, value: dec(f.value) })));
    else if (what === 'global') table.setGlobalFilter(dec(arg));
    else if (what === 'sort') table.setSorting(arg);
    else if (what === 'group') table.setGrouping(arg);
    else if (what === 'expand') table.setExpanded(arg);
    else if (what === 'data') table.setOptions((old) => ({ ...old, data: DATA.people.slice(0, arg) }));
    else throw new Error(what);
    await settle(table);
    out.push(models(table));
  }
  pageCases.push({ name, ...spec, steps, out });
}
await pageCase('pages step by step', { data: 'people' }, [['next'], ['next'], ['previous'], ['last'], ['next'], ['first'], ['previous'],
  ['index', 3], ['index', 99], ['index', -4], ['index', 2], ['size', 7], ['size', 20], ['size', 3], ['last'], ['size', 50]]);
await pageCase('pages reset by changes', { data: 'people' }, [['index', 3], ['filter', [{ id: 'first', value: enc('a') }]], ['index', 1],
  ['global', enc('o')], ['index', 1], ['sort', [{ id: 'age', desc: true }]], ['index', 2], ['group', ['status']], ['index', 0],
  ['group', []], ['index', 3], ['expand', true], ['index', 4], ['data', 30]]);
await pageCase('pages not reset', { data: 'people', options: { autoResetPageIndex: false } }, [['index', 3],
  ['filter', [{ id: 'first', value: enc('a') }]], ['sort', [{ id: 'age', desc: true }]], ['index', 1], ['size', 4]]);
await pageCase('pages manual', { data: 'people', options: { manualPagination: true, pageCount: 4 } }, [['next'], ['last'], ['next'],
  ['index', 9], ['filter', [{ id: 'first', value: enc('a') }]], ['size', 5]]);
await pageCase('pages under manual sorting, filtering and grouping', { data: 'people', options: { manualSorting: true, manualFiltering: true, manualGrouping: true } },
  [['index', 3], ['filter', [{ id: 'first', value: enc('a') }]], ['index', 2], ['global', enc('o')], ['index', 1], ['sort', [{ id: 'age', desc: true }]],
  ['index', 2], ['group', ['status']], ['index', 4], ['group', []]]);
await pageCase('pages of the tree', { data: 'tree', state: { pagination: { pageIndex: 0, pageSize: 3 } } }, [['expand', true], ['next'],
  ['expand', { t2: true }], ['next'], ['next'], ['next']]);

// ---------------------------------------------------------------- sequences: expanding

function expandReport(table) {
  const e = table.atoms.expanded.get();
  const rows = {};
  for (const row of table.getCoreRowModel().flatRows) {
    rows[row.id] = [row.getCanExpand(), row.getIsExpanded(), row.getIsAllParentsExpanded()];
  }
  return { expanded: e === true ? true : sortedKeys(e), all: table.getIsAllRowsExpanded(), some: table.getIsSomeRowsExpanded(),
    can: table.getCanSomeRowsExpand(), depth: table.getExpandedDepth(), page: ids(table.getRowModel().rows), rows };
}
const expandCases = [];
async function expandCase(name, spec, steps) {
  const table = make(spec);
  await settle(table);
  const out = [expandReport(table)];
  for (const [what, id, value] of steps) {
    if (what === 'row') table.getRow(id, true).toggleExpanded(value);
    else if (what === 'all') table.toggleAllRowsExpanded(value);
    else if (what === 'filter') table.setColumnFilters(id.map((f) => ({ id: f.id, value: dec(f.value) })));
    else if (what === 'global') table.setGlobalFilter(dec(id));
    else if (what === 'sort') table.setSorting(id);
    else if (what === 'group') table.setGrouping(id);
    else throw new Error(what);
    await settle(table);
    out.push(expandReport(table));
  }
  expandCases.push({ name, ...spec, steps, out });
}
await expandCase('expand rows', { data: 'tree', state: { pagination: { pageIndex: 0, pageSize: 100 } } },
  [['row', 't1'], ['row', 't3'], ['row', 't3.0'], ['row', 't0'], ['row', 't1'], ['all'], ['all'], ['all', null, true],
    ['row', 't2'], ['row', 't2', true], ['all', null, false], ['all', null, false]]);
await expandCase('expand without expanding', { data: 'tree', options: { enableExpanding: false } }, [['row', 't1'], ['all']]);
await expandCase('expand a grouped table', { data: 'people', state: { grouping: ['status', 'active'], pagination: { pageIndex: 0, pageSize: 100 } } },
  [['row', 'status:single'], ['row', 'status:single>active:true'], ['all'], ['row', 'status:complicated']]);
const RESET_STEPS = [['row', 't3'], ['sort', [{ id: 'amount', desc: true }]], ['filter', [{ id: 'kind', value: enc('a') }]], ['row', 't3'],
  ['global', enc('o')], ['row', 't7'], ['group', ['kind']], ['row', 'kind:a'], ['group', []]];
await expandCase('expand reset by changes', { data: 'tree', state: { pagination: { pageIndex: 0, pageSize: 100 } } }, RESET_STEPS);
await expandCase('expand not reset', { data: 'tree', options: { autoResetExpanded: false }, state: { pagination: { pageIndex: 0, pageSize: 100 } } }, RESET_STEPS);
await expandCase('expand reset to its first state', { data: 'tree', state: { expanded: { t2: true }, pagination: { pageIndex: 0, pageSize: 100 } } }, RESET_STEPS);
await expandCase('expand manual', { data: 'tree', options: { manualExpanding: true }, state: { pagination: { pageIndex: 0, pageSize: 100 } } }, RESET_STEPS);
// (no group rows are made under manual grouping, so none is pressed)
await expandCase('expand under manual filtering and grouping', { data: 'tree', options: { manualFiltering: true, manualGrouping: true },
  state: { expanded: { t2: true }, pagination: { pageIndex: 0, pageSize: 100 } } }, RESET_STEPS.filter(([what, id]) => !(what === 'row' && id === 'kind:a')));

// ---------------------------------------------------------------- sequences: selection

function selectReport(table) {
  const rows = {};
  for (const row of table.getCoreRowModel().flatRows) {
    rows[row.id] = [row.getIsSelected(), row.getIsSomeSelected(), row.getIsAllSubRowsSelected(), row.getCanSelect(),
      row.getCanMultiSelect(), row.getCanSelectSubRows()];
  }
  return { selection: sortedKeys(table.atoms.rowSelection.get()), all: table.getIsAllRowsSelected(), some: table.getIsSomeRowsSelected(),
    allPage: table.getIsAllPageRowsSelected(), somePage: table.getIsSomePageRowsSelected(),
    selected: ids(table.getSelectedRowModel().flatRows), filteredSelected: ids(table.getFilteredSelectedRowModel().flatRows),
    groupedSelected: ids(table.getGroupedSelectedRowModel().flatRows), selectedTree: preorder(table.getSelectedRowModel().rows), rows };
}
const selectCases = [];
async function selectCase(name, spec, steps) {
  const table = make(spec);
  await settle(table);
  const out = [selectReport(table)];
  for (const [what, id, value] of steps) {
    if (what === 'row') table.getRow(id, true).toggleSelected(value ?? undefined);
    else if (what === 'all') table.toggleAllRowsSelected(value ?? undefined);
    else if (what === 'page') table.toggleAllPageRowsSelected(value ?? undefined);
    else throw new Error(what);
    await settle(table);
    out.push(selectReport(table));
  }
  selectCases.push({ name, ...spec, steps, out });
}
const TREE_PAGE = { pagination: { pageIndex: 0, pageSize: 4 } };
await selectCase('select rows', { data: 'tree', state: TREE_PAGE }, [['row', 't1'], ['row', 't3'], ['row', 't3.0', false], ['row', 't3.0.1'],
  ['row', 't3.0.0'], ['row', 't3.1'], ['row', 't3.2'], ['row', 't3', false], ['page'], ['page'], ['all'], ['row', 't9.0', false], ['all'], ['all', null, false]]);
await selectCase('select one at a time', { data: 'tree', options: { enableMultiRowSelection: false }, state: TREE_PAGE },
  [['row', 't1'], ['row', 't2'], ['row', 't3'], ['row', 't3'], ['all'], ['page']]);
await selectCase('select without sub-rows', { data: 'tree', options: { enableSubRowSelection: false }, state: TREE_PAGE },
  [['row', 't3'], ['row', 't3.0'], ['row', 't3.0.0'], ['row', 't3.0.1'], ['all'], ['page', null, false]]);
await selectCase('select some rows only', { data: 'tree', options: { unselectable: ['t2', 't3.1', 't3.0.1'], closed: ['t6'] }, state: TREE_PAGE },
  [['row', 't2'], ['row', 't3'], ['all'], ['page', null, false], ['row', 't6'], ['all', null, false]]);
await selectCase('select filtered', { data: 'tree', state: { ...TREE_PAGE, columnFilters: [{ id: 'kind', value: enc('a') }] } },
  [['all'], ['page', null, false], ['row', 't5'], ['all', null, false]]);
await selectCase('select grouped', { data: 'people', state: { grouping: ['status'], pagination: { pageIndex: 0, pageSize: 2 } } },
  [['row', 'status:single'], ['row', 'p4', false], ['page'], ['all', null, false], ['all']]);

// ---------------------------------------------------------------- sequences: row pinning

function pinReport(table) {
  const pinned = table.atoms.rowPinning.get();
  const rows = {};
  for (const row of table.getCoreRowModel().flatRows) rows[row.id] = [row.getIsPinned(), row.getPinnedIndex(), row.getCanPin()];
  return { top: [...pinned.top], bottom: [...pinned.bottom], topRows: ids(table.getTopRows()), centerRows: ids(table.getCenterRows()),
    bottomRows: ids(table.getBottomRows()), some: table.getIsSomeRowsPinned(), someTop: table.getIsSomeRowsPinned('top'), rows };
}
const pinCases = [];
async function pinCase(name, spec, steps) {
  const table = make(spec);
  await settle(table);
  const out = [pinReport(table)];
  for (const [id, position, leaves, parents] of steps) {
    table.getRow(id, true).pin(position, leaves, parents);
    await settle(table);
    out.push(pinReport(table));
  }
  pinCases.push({ name, ...spec, steps, out });
}
await pinCase('pin rows', { data: 'tree', state: { pagination: { pageIndex: 0, pageSize: 5 } } },
  [['t2', 'top'], ['t7', 'bottom'], ['t1', 'top'], ['t2', 'bottom'], ['t3', 'top', true], ['t3.0.1', 'bottom', false, true], ['t3', false, true], ['t1', false]]);
await pinCase('pin rows not kept', { data: 'tree', options: { keepPinnedRows: false }, state: { pagination: { pageIndex: 0, pageSize: 5 } } },
  [['t2', 'top'], ['t7', 'bottom'], ['t3.1', 'top'], ['t1', 'bottom']]);
await pinCase('pin rows expanded', { data: 'tree', state: { expanded: { t3: true }, pagination: { pageIndex: 0, pageSize: 5 } } },
  [['t3.1', 'top'], ['t3.0.0', 'top'], ['t5.0', 'bottom'], ['t0', 'top']]);
await pinCase('pin filtered rows', { data: 'tree', state: { columnFilters: [{ id: 'kind', value: enc('b') }], pagination: { pageIndex: 0, pageSize: 5 } } },
  [['t0', 'top'], ['t4', 'top'], ['t9', 'bottom']]);
await pinCase('pin filtered rows not kept', { data: 'tree', options: { keepPinnedRows: false },
  state: { columnFilters: [{ id: 'kind', value: enc('b') }], pagination: { pageIndex: 0, pageSize: 5 } } }, [['t0', 'top'], ['t4', 'top'], ['t9', 'bottom']]);
await pinCase('pin some rows only', { data: 'tree', options: { unpinnable: ['t4'] } }, [['t4', 'top'], ['t5', 'top']]);

// ---------------------------------------------------------------- columns: order, visibility, pinning, sizes, headers

function headerGroupsJson(groups) {
  return groups.map((g) => ({ id: g.id, depth: g.depth, headers: g.headers.map((h) => ({
    id: h.id, column: h.column.id, colSpan: h.colSpan, rowSpan: h.rowSpan, placeholder: h.isPlaceholder,
    placeholderId: h.placeholderId ?? '', depth: h.depth, index: h.index, size: h.getSize(), start: h.getStart(),
    subs: h.subHeaders.map((s) => s.id) })) }));
}
function columnReport(table) {
  const columns = {};
  for (const c of table.getAllFlatColumns()) {
    const pos = c.getIsPinned() || 'center';
    columns[c.id] = { visible: c.getIsVisible(), canHide: c.getCanHide(), pinned: c.getIsPinned(), pinnedIndex: c.getPinnedIndex(),
      canPin: c.getCanPin(), size: c.getSize(), start: c.getStart(), startHere: c.getStart(pos), after: c.getAfter(), afterHere: c.getAfter(pos),
      index: c.getIndex(), indexHere: c.getIndex(pos), first: c.getIsFirstColumn(), last: c.getIsLastColumn(),
      firstHere: c.getIsFirstColumn(pos), lastHere: c.getIsLastColumn(pos), canResize: c.getCanResize(), depth: c.depth,
      parent: c.parent?.id ?? '' };
  }
  const leafIds = (cs) => cs.map((c) => c.id);
  return {
    all: leafIds(table.getAllLeafColumns()), flat: leafIds(table.getAllFlatColumns()), visible: leafIds(table.getVisibleLeafColumns()),
    visibleFlat: leafIds(table.getVisibleFlatColumns()), start: leafIds(table.getStartVisibleLeafColumns()),
    center: leafIds(table.getCenterVisibleLeafColumns()), end: leafIds(table.getEndVisibleLeafColumns()),
    allVisible: table.getIsAllColumnsVisible(), someVisible: table.getIsSomeColumnsVisible(), somePinned: table.getIsSomeColumnsPinned(),
    total: table.getTotalSize(), startTotal: table.getStartTotalSize(), centerTotal: table.getCenterTotalSize(), endTotal: table.getEndTotalSize(),
    headers: headerGroupsJson(table.getHeaderGroups()), startHeaders: headerGroupsJson(table.getStartHeaderGroups()),
    centerHeaders: headerGroupsJson(table.getCenterHeaderGroups()), endHeaders: headerGroupsJson(table.getEndHeaderGroups()),
    visibility: { ...table.atoms.columnVisibility.get() }, pinning: table.atoms.columnPinning.get(), order: [...table.atoms.columnOrder.get()],
    sizing: { ...table.atoms.columnSizing.get() }, columns,
  };
}
const columnCases = [];
async function columnCase(name, spec, steps = []) {
  const table = make(spec);
  await settle(table);
  const out = [columnReport(table)];
  for (const [what, id, value] of steps) {
    if (what === 'hide') table.getColumn(id).toggleVisibility(value ?? undefined);
    else if (what === 'all') table.toggleAllColumnsVisible(value ?? undefined);
    else if (what === 'pin') table.getColumn(id).pin(value);
    else if (what === 'order') table.setColumnOrder(value);
    else if (what === 'reset size') table.getColumn(id).resetSize();
    else throw new Error(what);
    await settle(table);
    out.push(columnReport(table));
  }
  columnCases.push({ name, ...spec, steps, out });
}
await columnCase('columns as defined', { data: 'people' });
await columnCase('columns hidden', { data: 'people', state: { columnVisibility: { last: false, visits: false, status: false, progress: false } } });
await columnCase('columns with a group hidden', { data: 'people', state: { columnVisibility: { first: false, last: false, tags: false } } });
await columnCase('columns ordered', { data: 'people', state: { columnOrder: ['code', 'age', 'first', 'nothing', 'status'] } });
await columnCase('columns pinned', { data: 'people', state: { columnPinning: { start: ['first'], end: ['score'] } } });
await columnCase('columns pinned across groups', { data: 'people', state: { columnPinning: { start: ['visits', 'first'], end: ['code', 'age'] } } });
await columnCase('columns grouped first', { data: 'people', state: { grouping: ['status', 'code'] } });
await columnCase('columns grouped and removed', { data: 'people', options: { groupedColumnMode: 'remove' }, state: { grouping: ['status'] } });
await columnCase('columns everything at once', { data: 'people', state: { grouping: ['active'], columnOrder: ['score', 'progress', 'first'],
  columnPinning: { start: ['last', 'active'], end: ['visits'] }, columnVisibility: { joined: false, age: false } } });
await columnCase('columns sized', { data: 'people', changes: { first: { size: 220 }, last: { minSize: 60, size: 40 }, age: { maxSize: 70 },
  code: { size: 90, minSize: 100, maxSize: 80 } }, state: { columnSizing: { first: 300, age: 120, visits: 5, progress: 77.5 } } });
await columnCase('columns sized and pinned', { data: 'people', changes: { first: { size: 220 } },
  state: { columnSizing: { age: 60 }, columnPinning: { start: ['code', 'first'], end: ['progress'] }, columnVisibility: { last: false } } });
await columnCase('columns toggled', { data: 'people', changes: { first: { enableHiding: false }, score: { enablePinning: false } } },
  [['hide', 'last'], ['hide', 'more'], ['hide', 'more'], ['hide', 'name'], ['all', null, false], ['all'], ['hide', 'info', false],
    ['all', null, true], ['pin', 'name', 'start'], ['pin', 'score', 'end'], ['pin', 'more', 'end'], ['pin', 'status', false],
    ['pin', 'age', 'start'], ['pin', 'name', false], ['order', null, ['tags', 'last', 'age']], ['pin', 'tags', 'end']]);
await columnCase('columns of the tree', { data: 'tree', state: { columnVisibility: { kind: false } } });
await columnCase('columns with hiding off', { data: 'people', options: { enableHiding: false } }, [['hide', 'last'], ['all', null, false]]);
await columnCase('columns sizes reset', { data: 'people', state: { columnSizing: { first: 300, age: 120 } } }, [['reset size', 'first'], ['reset size', 'last']]);

// ---------------------------------------------------------------- sequences: resizing

const resizeCases = [];
async function resizeCase(name, spec, header, moves) {
  const table = make(spec);
  await settle(table);
  const listeners = {};
  const doc = { addEventListener: (t, f) => { listeners[t] = f; }, removeEventListener: (t) => { delete listeners[t]; } };
  const h = table.getFlatHeaders().find((x) => x.id === header);
  const out = [];
  const report = () => ({ sizing: { ...table.atoms.columnSizing.get() }, resizing: { ...table.atoms.columnResizing.get() },
    resizingColumns: table.getAllLeafColumns().filter((c) => c.getIsResizing()).map((c) => c.id) });
  h.getResizeHandler(doc)({ type: 'mousedown', clientX: moves[0] });
  await settle(table);
  out.push(report());
  for (const x of moves.slice(1, -1)) {
    listeners.mousemove?.({ clientX: x });
    await settle(table);
    out.push(report());
  }
  listeners.mouseup?.({ clientX: moves[moves.length - 1] });
  await settle(table);
  out.push(report());
  resizeCases.push({ name, ...spec, header, moves, out });
}
await resizeCase('resize first on end', { data: 'people' }, 'first', [100, 130, 160, 170]);
await resizeCase('resize first on change', { data: 'people', options: { columnResizeMode: 'onChange' } }, 'first', [100, 130, 90, 120]);
await resizeCase('resize right to left', { data: 'people', options: { columnResizeDirection: 'rtl', columnResizeMode: 'onChange' } }, 'age', [300, 280, 340]);
await resizeCase('resize a group', { data: 'people', options: { columnResizeMode: 'onChange' }, state: { columnSizing: { first: 100 } } }, '1_name_2_first_first', [50, 100, 0]);
await resizeCase('resize below nothing', { data: 'people' }, 'last', [400, 100, -500]);
await resizeCase('resize a clamped column', { data: 'people', changes: { code: { minSize: 80, maxSize: 160 } }, options: { columnResizeMode: 'onChange' } }, 'code', [10, 40, 100]);
await resizeCase('resize nested group', { data: 'people', options: { columnResizeMode: 'onChange' }, state: { columnSizing: { age: 33.3 } } }, '1_info_2_age_age', [0, 7, 13.7]);
await resizeCase('resize turned off', { data: 'people', changes: { first: { enableResizing: false } } }, 'first', [0, 50]);

// ---------------------------------------------------------------- faceting

function facets(table, columnIds) {
  const out = {};
  for (const id of columnIds) {
    const c = table.getColumn(id);
    out[id] = { rows: ids(c.getFacetedRowModel().flatRows), unique: [...c.getFacetedUniqueValues().entries()].map(([k, n]) => [enc(k), n]),
      minmax: enc(c.getFacetedMinMaxValues()) };
  }
  out.__global__ = { rows: ids(table.getGlobalFacetedRowModel().flatRows),
    unique: [...table.getGlobalFacetedUniqueValues().entries()].map(([k, n]) => [enc(k), n]), minmax: enc(table.getGlobalFacetedMinMaxValues()) };
  return out;
}
const facetCases = [];
function facetCase(name, spec) {
  const table = make(spec);
  facetCases.push({ name, ...spec, out: facets(table, spec.data === 'tree' ? ['name', 'amount', 'kind', 'note'] :
    ['first', 'age', 'status', 'joined', 'code', 'tags', 'active', 'score']) });
}
facetCase('facets of everything', { data: 'people' });
facetCase('facets with filters', { data: 'people', state: { columnFilters: [{ id: 'status', value: enc('single') }, { id: 'age', value: enc([20, 60]) }] } });
facetCase('facets with a global filter', { data: 'people', state: { columnFilters: [{ id: 'active', value: enc(true) }], globalFilter: enc('a') } });
facetCase('facets of the tree', { data: 'tree', options: { filterFromLeafRows: true }, state: { columnFilters: [{ id: 'kind', value: enc('a') }] } });

// ---------------------------------------------------------------- Grid.js in headless Chrome

function gridData(n) {
  const r = seeded(23);
  const cities = ['Oslo', 'Lima', 'Kyoto', 'Accra', 'Quito', 'Perth', 'Turin', 'Dakar'];
  const out = [];
  for (let i = 0; i < n; i++) {
    let name = capital(word(r, 2)) + ' ' + capital(word(r, 2));
    if (i % 9 === 4) name = name.toUpperCase();
    if (i === 12) name = 'Ka.lo (x)';
    if (i === 30) name = 'An  Ra';
    const code = 'C-' + (i * 37 % 100);
    const age = 18 + Math.floor(r() * 60);
    out.push([name, code, age, cities[Math.floor(r() * cities.length)]]);
  }
  return out;
}
const GRID_ROWS = gridData(57);
const GRID_STEPS = [
  ['read'], ['next'], ['next'], ['page', '5'], ['page', '6'], ['previous'], ['page', '1'], ['next'],
  ['search', 'an'], ['next'], ['search', 'AN'], ['search', 'ka.lo'], ['search', '(x'], ['search', '  '], ['search', ' ra '],
  ['search', '3'], ['search', 'zzz'], ['search', ''],
  ['sort', 0], ['sort', 0], ['sort', 0], ['sort', 2, true], ['sort', 2, true], ['next'], ['sort', 2, true], ['sort', 3, true],
  ['sort', 1, false], ['sort', 3, true], ['sort', 3, true], ['sort', 3, true], ['search', 'o'], ['next'], ['sort', 2], ['last'],
];
const GRID_SMALL_STEPS = [['read'], ['next'], ['next'], ['next'], ['next'], ['next'], ['last'], ['previous'], ['previous'], ['page', '1'],
  ['search', 'a'], ['next'], ['search', 'oslo'], ['search', 'perth lima']];

function gridjsReference() {
  if (!fs.existsSync(CHROME)) {
    console.error('no Chrome at ' + CHROME + ' (LORY_CHROME names another): Grid.js left out');
    return null;
  }
  const umd = path.join(LIB, 'gridjs', 'dist', 'gridjs.umd.js');
  const page = `<!doctype html><html><body><div id="w1"></div><div id="w2"></div><pre id="out">pending</pre>
<script src="${pathToFileURL(umd).href}"></script>
<script>
const rows = ${JSON.stringify(GRID_ROWS)};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
function read(el) {
  const text = (n) => n ? n.textContent.replace(/\\s+/g, ' ').trim() : null;
  const body = [...el.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent));
  const summary = el.querySelector('.gridjs-summary');
  const buttons = [...el.querySelectorAll('.gridjs-pages button')].map((b) => ({ text: text(b), disabled: b.disabled,
    current: b.classList.contains('gridjs-currentPage'), spread: b.classList.contains('gridjs-spread'), title: b.getAttribute('title') || '' }));
  const sorts = [...el.querySelectorAll('th')].map((th) => { const b = th.querySelector('.gridjs-sort');
    return b ? { state: b.classList.contains('gridjs-sort-asc') ? 'asc' : b.classList.contains('gridjs-sort-desc') ? 'desc' : 'neutral', title: b.getAttribute('title') } : null; });
  const input = el.querySelector('.gridjs-search-input');
  return { body, summary: text(summary), summaryTitle: summary ? summary.getAttribute('title') : null, buttons, sorts,
    placeholder: input ? input.getAttribute('placeholder') : null, empty: text(el.querySelector('.gridjs-notfound')) };
}
async function act(el, step) {
  const [what, a, b] = step;
  const buttons = () => [...el.querySelectorAll('.gridjs-pages button')];
  if (what === 'next') buttons().find((x) => x.textContent === 'Next').click();
  else if (what === 'previous') buttons().find((x) => x.textContent === 'Previous').click();
  else if (what === 'page') { const x = buttons().find((x) => x.textContent === a); if (x) x.click(); }
  else if (what === 'last') { const bs = buttons().filter((x) => /^[0-9]+$/.test(x.textContent)); bs[bs.length - 1].click(); }
  else if (what === 'search') { const i = el.querySelector('.gridjs-search-input'); i.value = a; i.dispatchEvent(new Event('input', { bubbles: true })); }
  else if (what === 'sort') el.querySelectorAll('th')[a].querySelector('.gridjs-sort').dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: !!b }));
  await wait(400);
}
async function run(el, config, steps) {
  new gridjs.Grid(config).render(el);
  await wait(600);
  const out = [];
  for (const s of steps) { if (s[0] !== 'read') await act(el, s); out.push(read(el)); }
  return out;
}
(async () => {
  const columns = ['Name', 'Code', 'Age', 'City'];
  const first = await run(document.getElementById('w1'), { columns, data: rows, search: true, sort: true, pagination: { limit: 10 } }, ${JSON.stringify(GRID_STEPS)});
  const second = await run(document.getElementById('w2'), { columns, data: rows.slice(0, 40), search: true, sort: true,
    pagination: { limit: 4, buttonsCount: 4 } }, ${JSON.stringify(GRID_SMALL_STEPS)});
  document.getElementById('out').textContent = JSON.stringify({ first, second });
})();
</script></body></html>`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lory-gridjs-'));
  try {
    const html = path.join(tmp, 'ref.html');
    fs.writeFileSync(html, page);
    let dom;
    try {
      dom = execFileSync(CHROME, ['--headless=new', '--allow-file-access-from-files', '--user-data-dir=' + path.join(tmp, 'profile'),
        '--virtual-time-budget=120000', '--dump-dom', pathToFileURL(html).href], { encoding: 'utf8', timeout: 180000, maxBuffer: 64 << 20,
        stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      // Chrome may stop with an error as it closes after writing the page out
      if (!e.stdout || !e.stdout.includes('<pre id="out">{')) throw e;
      dom = e.stdout;
    }
    const start = dom.indexOf('<pre id="out">') + '<pre id="out">'.length;
    const text = dom.slice(start, dom.indexOf('</pre>', start)).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    const runs = JSON.parse(text);
    return { rows: GRID_ROWS, columns: ['Name', 'Code', 'Age', 'City'], first: { limit: 10, buttons: 3, steps: GRID_STEPS, out: runs.first },
      second: { rows: 40, limit: 4, buttons: 4, steps: GRID_SMALL_STEPS, out: runs.second } };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------- write

const reference = {
  versions,
  data: { people: rowsJson(DATA.people), tree: rowsJson(DATA.tree) },
  columns: COLUMNS,
  sortPool: SORT_POOL.map(enc), sortFns: sortFnCases,
  filterPool: FILTER_POOL.map(enc), filterFns: filterFnCases,
  rankQueries: RANK_QUERIES, ranks: rankCases, accents: accentCases,
  cases: CASES, toggles: toggleCases, pages: pageCases, expands: expandCases, selects: selectCases, pins: pinCases,
  columnCases, resizes: resizeCases, facets: facetCases,
  gridjs: gridjsReference(),
};
fs.writeFileSync(path.join(HERE, 'reference.json'), JSON.stringify(reference));
const count = (x) => (Array.isArray(x) ? x.reduce((n, y) => n + count(y), 0) : x && typeof x === 'object' ? Object.values(x).reduce((n, y) => n + count(y), 0) : 1);
console.log(`wrote ${CASES.length} row cases, ${toggleCases.length + pageCases.length + expandCases.length + selectCases.length + pinCases.length + columnCases.length + resizeCases.length} sequences, ` +
  `${facetCases.length} facet cases, Grid.js ${reference.gridjs ? 'included' : 'left out'}; ${count(reference)} values in all`);
