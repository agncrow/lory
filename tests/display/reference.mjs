// What lory.navigation and lory.display compute, as the reference libraries
// compute it, for tests/display/reference.co to hold Lory to number for
// number.
//
// The references, each at a pinned version:
//   vuetify 4.3.1 (with vue 3.5.44): v-pagination's page windows (given a
//     total-visible, and fitted to a width), v-hotkey's keys and labels,
//     v-progress-circular's geometry and its indeterminate spin
//   tui-pagination 3.4.1 (TOAST UI): its page windows, centred or not, and
//     where its "more" buttons move to
//   @mui/material 9.5.0 (with react 19.2.9): Breadcrumbs' collapsing
//   @vuetify/v0 1.3.2: toHighlight's match ranges (v-highlight's engine)
//   @radix-ui/themes 3.3.0: the spinner's leaves and the skeleton's pulse
//
// How each one runs (none needs a page of its own):
//   - Vuetify's components are rendered by Vue's server renderer (no DOM),
//     and the markup is read back with jsdom 26.1.0.
//   - TOAST UI Pagination builds its own DOM, so it runs in jsdom; its usage
//     statistics are off (left on, it sends the page's hostname away).
//   - MUI's Breadcrumbs are rendered by react-dom/server, read with jsdom.
//   - toHighlight is a pure function: it is called as it is.
//   - The CSS animations are the libraries' own style sheets, evaluated by
//     headless Chrome at set moments (each animation paused, its time set,
//     the computed style read).
//
// Run with a pinned install, from a scratch folder (never Lory's own):
//   npm install --prefix <scratch>/ref --ignore-scripts vuetify@4.3.1 \
//     vue@3.5.44 @vuetify/v0@1.3.2 tui-pagination@3.4.1 jsdom@26.1.0 \
//     @mui/material@9.5.0 react@19.2.9 react-dom@19.2.9 \
//     @emotion/react@11.14.0 @emotion/styled@11.14.1 @radix-ui/themes@3.3.0
//   LORY_REF=<scratch>/ref node tests/display/reference.mjs
// It writes tests/display/reference.json beside it.
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const ref = process.env.LORY_REF;
if (!ref) throw new Error('LORY_REF: the folder the references are installed in');
const lib = (p) => join(ref, 'node_modules', p);
const require = createRequire(join(ref, 'node_modules', 'index.js'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const { JSDOM } = require('jsdom');
const vue = await import(pathToFileURL(lib('vue/index.mjs')));
const { renderToString } = await import(pathToFileURL(lib('vue/server-renderer/index.mjs')));
const V = await import(pathToFileURL(lib('vuetify/dist/vuetify.esm.js')));

const parse = (html) => new JSDOM(`<!doctype html><body>${html}</body>`).window.document;

async function rendered(component, props, ssr = true) {
    const app = vue.createSSRApp({ render: () => vue.h(component, props) });
    app.use(V.createVuetify({ ssr, components: V.components }));
    return parse(await renderToString(app));
}

// ---- v-pagination: the pages shown (an ellipsis is 0) ----

async function vuetifyPages(props, ssr) {
    const doc = await rendered(V.components.VPagination, props, ssr);
    const items = [...doc.querySelectorAll('li.v-pagination__item')].map((li) => {
        const words = li.textContent.trim();
        return words === '...' ? 0 : Number(words);
    });
    const prev = doc.querySelector('li.v-pagination__prev button');
    const next = doc.querySelector('li.v-pagination__next button');
    const active = doc.querySelector('li.v-pagination__item--is-active');
    return {
        items,
        current: active ? Number(active.textContent.trim()) : 0,
        prev_off: prev ? prev.hasAttribute('disabled') : false,
        next_off: next ? next.hasAttribute('disabled') : false,
    };
}

const windows = [];
for (const length of [1, 2, 3, 4, 5, 7, 8, 10, 13, 20, 50]) {
    const pages = length <= 20 ? [...Array(length).keys()].map((i) => i + 1) : [1, 2, 3, 4, 5, 24, 25, 26, 46, 47, 48, 49, 50];
    for (const visible of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
        for (const page of pages) {
            const got = await vuetifyPages({ length, modelValue: page, totalVisible: visible });
            windows.push({ length, page, visible, ...got });
        }
    }
}

// (no total-visible: as many as fit the width, Vuetify's own measure of a
// page of that width: (width - 116) / 58 buttons)
const fitted = [];
for (const length of [2, 3, 5, 10, 20, 50]) {
    const pages = length <= 10 ? [...Array(length).keys()].map((i) => i + 1) : [1, 2, 4, 6, 9, 10, 11, length - 3, length - 1, length];
    for (const width of [150, 200, 290, 300, 400, 480, 500, 640, 800, 1000]) {
        for (const page of pages) {
            const got = await vuetifyPages({ length, modelValue: page }, { clientWidth: width });
            fitted.push({ length, page, width, ...got });
        }
    }
}

// ---- tui-pagination: the buttons in order, and where "more" moves ----

const dom = new JSDOM('<!doctype html><body></body>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
dom.window.tui = { usageStatistics: false };
const Pagination = require('tui-pagination');

function tuiMade(options) {
    const holder = document.createElement('div');
    document.body.appendChild(holder);
    const p = new Pagination(holder, { ...options, usageStatistics: false });
    return { p, holder };
}

function tuiButtons(holder) {
    const out = [];
    for (const el of holder.children) {
        const cls = ` ${el.className} `;
        const more = cls.match(/ tui-(prev|next)-is-ellip /);
        const move = cls.match(/ tui-(first|prev|next|last) /);
        if (cls.includes(' tui-is-selected ')) out.push(`[${el.textContent.trim()}]`);
        else if (more) out.push(`more_${more[1]}`);
        else if (move) out.push(cls.includes(' tui-is-disabled ') ? `${move[1]}_off` : move[1]);
        else out.push(el.textContent.trim());
    }
    return out;
}

function tuiAfterPress(options, kind) {
    const { p, holder } = tuiMade(options);
    const button = [...holder.children].find((el) => ` ${el.className} `.includes(kind));
    if (!button) return -1;
    button.click();
    const page = p.getCurrentPage();
    holder.remove();
    return page;
}

const tui = [];
for (const total of [0, 5, 10, 95, 100, 101, 250]) {
    for (const per of [10, 7]) {
        for (const visible of [1, 2, 3, 5, 10]) {
            for (const center of [false, true]) {
                const last = Math.max(1, Math.ceil(total / per));
                const pages = [...Array(Math.min(last, 37)).keys()].map((i) => i + 1);
                if (last > 37) pages.push(last - 1, last);
                for (const page of pages) {
                    const options = { totalItems: total, itemsPerPage: per, visiblePages: visible, page, centerAlign: center };
                    const { p, holder } = tuiMade(options);
                    const buttons = tuiButtons(holder);
                    holder.remove();
                    tui.push({
                        total, per, visible, center, page, buttons,
                        prev_more: tuiAfterPress(options, ' tui-prev-is-ellip '),
                        next_more: tuiAfterPress(options, ' tui-next-is-ellip '),
                    });
                }
            }
        }
    }
}

// ---- MUI Breadcrumbs: the crumbs shown (the ellipsis is -1) ----

// (rendered as a server renders it: the page TOAST UI needed is taken away,
// or emotion, MUI's styling, takes Node for a browser)
delete globalThis.window;
delete globalThis.document;

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const Breadcrumbs = require('@mui/material/Breadcrumbs').default;

const crumbs = [];
const quiet = console.error;
console.error = () => {};
for (let count = 0; count <= 10; count++) {
    for (const most of [0, 1, 2, 3, 4, 5, 8]) {
        for (const before of [0, 1, 2, 3]) {
            for (const after of [0, 1, 2, 3]) {
                const kids = [...Array(count).keys()].map((i) => React.createElement('span', { key: i, 'data-i': i }, `c${i}`));
                const html = renderToStaticMarkup(React.createElement(Breadcrumbs, { maxItems: most, itemsBeforeCollapse: before, itemsAfterCollapse: after }, kids));
                const doc = parse(html);
                const shown = [...doc.querySelectorAll('li.MuiBreadcrumbs-li')].map((li) => {
                    const kid = li.querySelector('[data-i]');
                    return kid ? Number(kid.getAttribute('data-i')) : -1;
                });
                const between = doc.querySelectorAll('li.MuiBreadcrumbs-separator').length;
                crumbs.push({ count, most, before, after, shown, between });
            }
        }
    }
}
console.error = quiet;

// ---- toHighlight: the matched ranges, in characters ----

const { toHighlight } = await import(pathToFileURL(lib('@vuetify/v0/dist/composables/toHighlight/index.mjs')));

function ranges(chunks) {
    const out = [];
    let at = 0;
    for (const c of chunks) {
        if (c.match) out.push([at, at + c.text.length]);
        at += c.text.length;
    }
    return out;
}

// (each text with the queries that try it: plain words, terms that overlap
// or touch, accents and letters folded, cases and Greek's final sigma)
const tried = [
    ['The quick brown fox jumps over the lazy dog', [['o'], ['the'], ['quick', 'fox'], ['quick bro', 'brown'], ['zzz'], ['']]],
    ['the THE The tHe', [['the'], ['THE'], ['he']]],
    ['abcd abcd', [['ab', 'cd'], ['b', 'bc'], ['abcd'], ['d a']]],
    ['Crème brûlée à la française, crème fraîche', [['creme'], ['crème'], ['brulee', 'francaise'], ['CRÈME'], ['a']]],
    ['Cafe CAFÉ café cafe', [['café'], ['cafe'], ['CAFÉ'], ['e']]],
    ['Łódź and Gdańsk, Straße and STRASSE', [['lodz', 'gdansk'], ['strasse'], ['ß'], ['ss'], ['straß'], ['sse']]],
    ['Æsir Ærø œuvre Þór', [['aesir', 'aero'], ['oeuvre', 'thor'], ['æ'], ['ae'], ['ro']]],
    ['ΣΑΣ σας Σας', [['σας'], ['ΣΑΣ'], ['ς'], ['σ']]],
    ['aaaa', [['aa'], ['a'], ['aaa']]],
    ['', [['a']]],
];
const highlights = [];
for (const [text, queries] of tried) {
    for (const query of queries) {
        for (const ignoreCase of [false, true]) {
            for (const matchAll of [false, true]) {
                for (const accents of [false, true, 'query', 'target']) {
                    const chunks = toHighlight(text, query, { ignoreCase, matchAll, ignoreAccents: accents });
                    highlights.push({ text, query, ignore_case: ignoreCase, match_all: matchAll, accents: String(accents), ranges: ranges(chunks) });
                }
            }
        }
    }
}
// (ranges given, merged as they are given)
const given = [[[0, 3]], [[4, 9], [0, 3]], [[0, 5], [3, 8]], [[0, 3], [3, 6]], [[2, 2], [5, 7]], [[6, 9], [1, 4], [3, 5]]];
const merged = given.map((matches) => ({ matches, ranges: ranges(toHighlight('abcdefghijkl', '', { matches })) }));

// ---- v-hotkey: the keys and the words between, and the label ----

const hotkeys = [];
const shortcuts = [
    'ctrl+k', 'meta+k', 'cmd+shift+p', 'alt+enter', 'ctrl+alt+delete', 'shift+tab', 'ctrl+k-p', 'g-g', 'ctrl/meta+s',
    'up down left right', 'esc', 'space', 'backspace', 'control+option+command', 'ctrl+plus', 'ctrl+minus', 'f1+a', 'a-b-c',
    'ctrl+k meta+p', 'shift+?', 'ctrl_k',
];
for (const keys of shortcuts) {
    for (const platform of ['mac', 'pc']) {
        for (const mode of ['symbol', 'text']) {
            const doc = await rendered(V.components.VHotkey, { keys, platform, displayMode: mode });
            const root = doc.querySelector('.v-hotkey');
            const combinations = [...doc.querySelectorAll('.v-hotkey__combination')].map((combo) =>
                [...combo.children].filter((el) => el.matches('.v-hotkey__key, .v-hotkey__divider')).map((el) => ({
                    part: el.matches('.v-hotkey__key') ? 'key' : 'between',
                    words: el.textContent,
                    shown: el.matches('.v-hotkey__key-symbol') ? 'symbol' : 'text',
                })));
            hotkeys.push({ keys, platform, mode, combinations, label: root.getAttribute('aria-label') });
        }
    }
}

// ---- v-progress-circular: its circle's numbers ----

const circles = [];
for (const value of [0, 1, 12.5, 40, 50, 99, 100, -5, 130]) {
    for (const [size, width] of [[32, 4], [50, 6], [64, 2], [100, 10], [20, 8]]) {
        for (const rotate of [0, 30]) {
            for (const rounded of [false, true]) {
                const doc = await rendered(V.components.VProgressCircular, { modelValue: value, size, width, rotate, rounded });
                const svg = doc.querySelector('svg');
                const over = doc.querySelector('.v-progress-circular__overlay');
                const box = svg.getAttribute('viewBox').split(' ').map(Number);
                const turn = svg.getAttribute('style').match(/-90deg \+ ([-0-9.e]+)deg/);
                circles.push({
                    value, size, width, rotate, rounded,
                    view: box[2],
                    stroke: Number(over.getAttribute('stroke-width')),
                    around: Number(over.getAttribute('stroke-dasharray')),
                    offset: parseFloat(over.getAttribute('stroke-dashoffset')),
                    start: Number(turn[1]),
                });
            }
        }
    }
}

// ---- the CSS animations, sampled in headless Chrome ----

const indeterminate = await renderToString((() => {
    const app = vue.createSSRApp({ render: () => vue.h(V.components.VProgressCircular, { indeterminate: true, size: 32, width: 4 }) });
    app.use(V.createVuetify({ ssr: true, components: V.components }));
    return app;
})());
const moments = [0, 50, 100, 175, 233, 350, 500, 600, 700, 777, 900, 1050, 1200, 1399, 1400, 1650, 2100];
const page = `<!doctype html><html><head>
<link rel="stylesheet" href="${pathToFileURL(lib('vuetify/lib/components/VProgressCircular/VProgressCircular.css'))}">
<link rel="stylesheet" href="${pathToFileURL(lib('vuetify/lib/components/VSkeletonLoader/VSkeletonLoader.css'))}">
<link rel="stylesheet" href="${pathToFileURL(lib('@radix-ui/themes/styles.css'))}">
</head><body>
<div id="circle">${indeterminate.replace('v-progress-circular ', 'v-progress-circular v-progress-circular--visible ')}</div>
<div class="radix-themes"><span id="spinner" class="rt-Spinner rt-r-size-2">${'<span class="rt-SpinnerLeaf"></span>'.repeat(8)}</span>
<span id="skeleton" class="rt-Skeleton" style="display:block;width:120px;height:20px;--gray-a3:rgb(0,0,0);--gray-a4:rgb(0,0,255)"></span></div>
<div class="v-skeleton-loader" style="width:200px"><div id="bone" class="v-skeleton-loader__bone" style="width:200px;height:20px"></div></div>
<pre id="out">pending</pre>
<script>
const moments = ${JSON.stringify(moments)};
function at(t) {
    for (const a of document.getAnimations()) { a.pause(); a.currentTime = t; }
}
function turned(m) {
    const n = m.match(/matrix\\(([^)]+)\\)/);
    if (!n) return 0;
    const [a, b] = n[1].split(',').map(Number);
    return Math.atan2(b, a) * 180 / Math.PI;
}
function shifted(m) {
    const n = m.match(/matrix\\(([^)]+)\\)/);
    return n ? Number(n[1].split(',')[4]) : 0;
}
window.onerror = (m) => { document.getElementById('out').textContent = 'failed: ' + m; };
window.addEventListener('load', () => setTimeout(() => {
    const svg = document.querySelector('#circle svg');
    const over = document.querySelector('#circle .v-progress-circular__overlay');
    const leaves = [...document.querySelectorAll('#spinner .rt-SpinnerLeaf')];
    const out = { spin: [], leaves: [], pulse: [], shimmer: [] };
    for (const t of moments) {
        at(t);
        const so = getComputedStyle(svg);
        const oo = getComputedStyle(over);
        out.spin.push({ t, svg: turned(so.transform), circle: turned(oo.transform),
            dash: parseFloat(oo.strokeDasharray.split(',')[0]), offset: parseFloat(oo.strokeDashoffset) });
        out.leaves.push({ t, opacity: leaves.map((l) => Number(getComputedStyle(l).opacity)),
            turn: leaves.map((l) => turned(getComputedStyle(l).transform)),
            whole: Number(getComputedStyle(document.getElementById('spinner')).opacity) });
        const blue = getComputedStyle(document.getElementById('skeleton')).backgroundColor.match(/[0-9.]+/g).map(Number);
        out.pulse.push({ t, blue: blue[2] / 255 });
        const bone = getComputedStyle(document.getElementById('bone'), '::after').transform;
        out.shimmer.push({ t, shift: shifted(bone) / 200 });
    }
    document.getElementById('out').textContent = JSON.stringify(out);
}, 100));
</script></body></html>`;
const scratch = mkdtempSync(join(tmpdir(), 'lory-display-'));
const html = join(scratch, 'page.html');
writeFileSync(html, page);
const dumped = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${join(scratch, 'profile')}`,
    '--allow-file-access-from-files', '--virtual-time-budget=4000', '--dump-dom', pathToFileURL(html).href], { encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'ignore'] });
rmSync(scratch, { recursive: true, force: true });
const found = dumped.match(/<pre id="out">([^<]*)<\/pre>/);
if (!found || !found[1].startsWith('{')) throw new Error(`headless Chrome gave no samples: ${found ? found[1] : dumped.slice(0, 400)}`);
const animated = JSON.parse(found[1].replaceAll('&quot;', '"'));

const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(here, 'reference.json'), JSON.stringify({
    versions: { vuetify: V.version, vue: vue.version, 'tui-pagination': '3.4.1', '@mui/material': '9.5.0', '@vuetify/v0': '1.3.2', '@radix-ui/themes': '3.3.0' },
    windows, fitted, tui, crumbs, highlights, merged, hotkeys, circles, ...animated,
}));
console.log(`windows ${windows.length}, fitted ${fitted.length}, tui ${tui.length}, crumbs ${crumbs.length}, highlights ${highlights.length}, merged ${merged.length}, hotkeys ${hotkeys.length}, circles ${circles.length}, spin ${animated.spin.length}`);
