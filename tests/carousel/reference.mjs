// What react-slick's carousels do, for Lory's carousels (lory.carousel) to be
// held to, number for number.
//
// The reference: react-slick 0.31.0 (React 19.3.1 beside it, which it
// imports), its own components run in Node: the Slider (settings, the
// responsive breakpoints, rows) and the InnerSlider it renders (the state:
// the current slide, the target, the track's offset, what is animating,
// autoplay, swipes, the slides lazily loaded), with the Track, Dots and
// arrows it renders read for what they show (which slides are rendered,
// which are clones, which are active and current, which dot is active, which
// arrow is disabled). Their arithmetic is the functions of
// lib/utils/innerSliderUtils.js; this script only drives them.
//
// Node has no page, so the few things the library reads from one are given
// here, plainly, from fixed inputs:
//   - time is a clock of this script's own: setTimeout and setInterval are
//     queued and fired at their due times as the script moves the clock on,
//     so a speed of 500 ms settles at 500 and autoplay ticks at exact times;
//   - the list is `width` CSS pixels wide, each slide as tall as `heights`
//     says, and the slides stand side by side in the track (one above
//     another when vertical), where their offsets are what a browser's
//     layout of react-slick's track gives: each slide after the ones
//     before it, as wide as the slide width react-slick set (or its own
//     width, for variableWidth);
//   - a press, a move and a release are the events React would hand the
//     list's handlers (clientX for a mouse, touches[0].pageX for a touch),
//     and a click on an arrow, a dot or a slide calls the onClick react-slick
//     rendered on it (none on a disabled arrow);
//   - a breakpoint is what react-slick's media queries pick once the window
//     is resized from a wide one to the width given (see `breakpointAt`).
//
// CSS `ease`, the curve react-slick's transitions use by default (cssEase),
// is the browser's: the script samples it in headless Chrome (the Web
// Animations API's own progress at fixed times) where Chrome is installed.
//
// Run with a pinned install, from a scratch folder (never Lory's own):
//   npm install --prefix <scratch>/ref react-slick@0.31.0
//   npm install --prefix <scratch>/vref vuetify@4.3.3 motion-plus@1.5.1
//   LORY_REF=<scratch>/ref LORY_VREF=<scratch>/vref node tests/carousel/reference.mjs
// It writes tests/carousel/reference.json beside it.
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const ref = process.env.LORY_REF;
if (!ref) throw new Error('LORY_REF: the folder react-slick 0.31.0 is installed in');
const require = createRequire(join(ref, 'node_modules', 'react-slick', 'package.json'));

// ---- the page react-slick asks for ----

// (a window with a document, so react-slick registers its media queries, and
// a separate document, so the ResizeObserver polyfill knows it has no page)
const queries = [];
globalThis.window = {
    document: { createElement() { return {}; } },
    addEventListener() {},
    removeEventListener() {},
    matchMedia(query) {
        const mql = { query, matches: matchesAt(query, page.width), listeners: [], addListener(f) { this.listeners.push(f); }, removeListener() {} };
        queries.push(mql);
        return mql;
    },
};
globalThis.document = { querySelectorAll() { return []; } };
const page = { width: 10000 };

// a media query of json2mq's, `(min-width: 481px) and (max-width: 600px)`,
// at a window width
function matchesAt(query, width) {
    let ok = true;
    for (const m of query.matchAll(/\((min|max)-width: (\d+)px\)/g)) {
        const v = Number(m[2]);
        if (m[1] === 'min' && width < v) ok = false;
        if (m[1] === 'max' && width > v) ok = false;
    }
    return ok;
}

// the window resized: each query whose answer changed tells its listeners, in
// the order they were registered, as a browser does
function resizeWindow(width) {
    page.width = width;
    for (const mql of queries) {
        const now = matchesAt(mql.query, width);
        if (now !== mql.matches) {
            mql.matches = now;
            for (const f of mql.listeners) f({ matches: now });
        }
    }
}

// ---- the clock ----

const clock = { now: 0, timers: [], made: 0 };
globalThis.setTimeout = (f, ms) => { const id = ++clock.made; clock.timers.push({ id, at: clock.now + (ms || 0), f, every: 0, order: id }); return id; };
globalThis.setInterval = (f, ms) => { const id = ++clock.made; clock.timers.push({ id, at: clock.now + ms, f, every: ms, order: id }); return id; };
globalThis.clearTimeout = (id) => { clock.timers = clock.timers.filter((t) => t.id !== id); };
globalThis.clearInterval = globalThis.clearTimeout;

// the clock moved on to `to`, each timer due by then fired at its own time,
// earliest first (and in the order they were set where two are due at once)
function advance(to) {
    for (;;) {
        const due = clock.timers.filter((t) => t.at <= to).sort((a, b) => a.at - b.at || a.order - b.order)[0];
        if (!due) break;
        clock.now = due.at;
        if (due.every) { due.at += due.every; due.order = ++clock.made; } else clock.timers = clock.timers.filter((t) => t !== due);
        due.f();
        commit();
    }
    clock.now = to;
}

// React's commits: what a handler or a timer sets is batched, then applied
// at once, componentDidUpdate called (which loads lazy slides and adapts the
// height), then the setState callbacks, in order; what those set is
// committed in turn
const batched = [];
function batching(comp) {
    comp.setState = function (u, cb) { batched.push({ comp: this, u, cb }); };
}
function commit() {
    while (batched.length) {
        const b = batched.splice(0);
        const comps = [];
        for (const x of b) if (!comps.includes(x.comp)) comps.push(x.comp);
        const before = comps.map((c) => c.state);
        for (const x of b) x.comp.state = { ...x.comp.state, ...(typeof x.u === 'function' ? x.u(x.comp.state, x.comp.props) : x.u) };
        comps.forEach((c, i) => { if (c.mounted && c.componentDidUpdate) c.componentDidUpdate(c.props, before[i]); });
        for (const x of b) if (x.cb) x.cb();
    }
}

const React = require('react');
const Slider = require('react-slick').default;
const { InnerSlider } = require('react-slick/lib/inner-slider');
const { Track } = require('react-slick/lib/track');
const { Dots } = require('react-slick/lib/dots');
const { PrevArrow, NextArrow } = require('react-slick/lib/arrows');
const versions = { 'react-slick': require('react-slick/package.json').version, react: require('react/package.json').version };

// ---- one carousel, driven ----

// the elements of a rendered tree of the given component type (searched
// through children and the components react-slick renders itself)
function found(el, type, out = []) {
    if (!el || typeof el !== 'object') return out;
    if (Array.isArray(el)) { for (const k of el) found(k, type, out); return out; }
    if (el.type === type) out.push(el);
    if (el.props && el.props.children !== undefined) found(el.props.children, type, out);
    return out;
}

// the slides the track renders, in the order they stand, each with what
// its classes and style say
function rendered(h) {
    const tree = h.inner.render();
    const track = found(tree, Track)[0];
    const div = new Track(track.props).render();
    const kids = [].concat(div.props.children);
    return kids.map((el) => {
        const cls = el.props.className || '';
        const style = el.props.style || {};
        return {
            index: el.props['data-index'],
            active: /\bslick-active\b/.test(cls),
            center: /\bslick-center\b/.test(cls),
            cloned: /\bslick-cloned\b/.test(cls),
            current: /\bslick-current\b/.test(cls),
            loaded: el.props.children !== undefined,
            alpha: style.opacity === undefined ? 1 : style.opacity,
            width: h.settings.variableWidth ? (style.width || 0) : h.inner.state.slideWidth,
        };
    });
}

// where each slide stands in the track (a browser's layout of it: side by
// side, or one above another), as the nodes react-slick queries
function nodes(h) {
    const st = h.inner.state;
    let x = 0;
    let y = 0;
    return rendered(h).map((s) => {
        const k = ((s.index % h.count) + h.count) % h.count;
        const tall = h.heights[k];
        const wide = h.settings.vertical ? h.width : s.width;
        const node = {
            offsetLeft: h.settings.vertical ? 0 : x,
            offsetTop: h.settings.vertical ? y : 0,
            offsetWidth: wide,
            offsetHeight: tall,
            dataset: { index: String(s.index) },
            classes: s,
            focus() { h.focused = s.index; },
        };
        x += wide;
        y += tall;
        return node;
    });
}

function fakeList(h) {
    return {
        get offsetWidth() { return h.width; },
        style: {},
        querySelector(sel) {
            const m = sel.match(/data-index="(-?\d+)"/);
            return nodes(h).find((n) => n.dataset.index === m[1]) || null;
        },
        querySelectorAll(sel) {
            if (sel === '.slick-slide') return nodes(h);
            if (sel === '.slick-current') return nodes(h).filter((n) => n.classes.current);
            return [];
        },
    };
}

function fakeTrack(h) {
    return {
        get offsetWidth() { return nodes(h).reduce((a, n) => a + n.offsetWidth, 0); },
        get childNodes() { return nodes(h); },
        get children() { return nodes(h); },
    };
}

// `count` slides, each `widths` wide where it is given
function slidesOf(count, widths) {
    const kids = [];
    for (let i = 0; i < count; i++) {
        kids.push(React.createElement('div', { key: i, style: widths.length ? { width: widths[i] } : undefined }, `slide ${i}`));
    }
    return kids;
}

// a carousel of `count` slides with the settings given, its list `width`
// wide, its slides `heights` tall (and `widths` wide for variableWidth), in a
// window `page` wide, mounted at the clock's time
function mount(settings, count, opts = {}) {
    const h = { settings: null, count, width: opts.width || 800, heights: opts.heights || Array(count).fill(200), events: [], focused: null };
    const widths = opts.widths || [];
    const kids = slidesOf(count, widths);
    const log = (what, ...args) => h.events.push({ t: clock.now, what, args });
    const given = {
        ...settings,
        beforeChange: (a, b) => log('before', a, b),
        afterChange: (a) => log('after', a),
        onSwipe: (d) => log('swipe', d),
        onEdge: (d) => log('edge', d),
        onLazyLoad: (list) => log('lazy', ...list),
        children: kids,
    };
    queries.length = 0;
    resizeWindow(10000);
    const outer = new Slider(given);
    outer.setState = function (u, cb) { this.state = { ...this.state, ...(typeof u === 'function' ? u(this.state, this.props) : u) }; if (cb) cb(); };
    outer.componentDidMount();
    if (opts.page) resizeWindow(opts.page);
    const el = outer.render();
    h.outer = outer;
    h.plain = el.type !== InnerSlider;
    if (h.plain) return h;
    h.settings = { ...el.props };
    h.count = React.Children.count(el.props.children);
    if (widths.length && h.settings.variableWidth) h.heights = opts.heights || Array(h.count).fill(200);
    // (the hooks the InnerSlider calls on a swipe and on slides to load,
    // onSwipe and onLazyLoad, are dropped by 0.31.0's Slider, which hands on
    // only the settings among its default props: they are handed to the
    // InnerSlider here, so that when it calls them is known)
    const inner = new InnerSlider({ ...el.props, onSwipe: given.onSwipe, onLazyLoad: given.onLazyLoad, ...(opts.more || {}) });
    batching(inner);
    inner.list = fakeList(h);
    inner.track = { node: fakeTrack(h) };
    outer.innerSlider = inner;
    h.inner = inner;
    inner.componentDidMount();
    inner.mounted = true;
    commit();
    return h;
}

// ---- what a carousel shows, read ----

function leftOf(style) {
    const m = (style.transform || '').match(/translate3d\((-?[\d.e+-]+)px, (-?[\d.e+-]+)px/);
    if (!m) return 0;
    return Number(m[1]) + Number(m[2]);
}

function seen(h) {
    if (h.plain) return { plain: true };
    const st = h.inner.state;
    const tree = h.inner.render();
    const prev = found(tree, PrevArrow)[0];
    const next = found(tree, NextArrow)[0];
    const dots = found(tree, Dots)[0];
    let dotsSeen = { count: 0, active: -1 };
    if (dots) {
        const ul = new Dots(dots.props).render();
        const lis = [].concat(ul.props.children);
        dotsSeen = { count: lis.length, active: lis.findIndex((li) => /slick-active/.test(li.props.className || '')) };
    }
    const arrowDisabled = (a, Type) => {
        if (!a) return -1;
        const shown = new Type(a.props).render();
        return /slick-disabled/.test(shown.props.className) ? 1 : 0;
    };
    const style = st.trackStyle || {};
    const height = h.inner.list.style.height;
    return {
        t: clock.now,
        current: st.currentSlide,
        target: st.targetSlide,
        animating: !!st.animating,
        left: leftOf(style),
        moving: !!(style.transition && style.transition !== ''),
        autoplaying: st.autoplaying || '',
        dragging: !!st.dragging,
        swipe_left: st.swipeLeft === null || st.swipeLeft === undefined ? null : st.swipeLeft,
        slide_width: typeof st.slideWidth === 'number' ? st.slideWidth : 0,
        list_height: height ? Number(height.replace('px', '')) : -1,
        loaded: [...(st.lazyLoadedList || [])],
        slides: rendered(h).map((s) => [s.index, s.active ? 1 : 0, s.center ? 1 : 0, s.cloned ? 1 : 0, s.current ? 1 : 0, s.loaded ? 1 : 0, s.alpha]),
        dots: dotsSeen,
        prev_disabled: arrowDisabled(prev, PrevArrow),
        next_disabled: arrowDisabled(next, NextArrow),
    };
}

// ---- what a reader does ----

function pointerEvent(type, device, x, y) {
    const e = { type, target: { tagName: 'DIV' }, preventDefault() {}, stopPropagation() {} };
    if (device === 'touch') {
        e.touches = type === 'touchend' ? undefined : [{ pageX: x, pageY: y }];
        e._reactName = { touchstart: 'onTouchStart', touchmove: 'onTouchMove', touchend: 'onTouchEnd' }[type];
    } else {
        e.clientX = x;
        e.clientY = y;
        e._reactName = { mousedown: 'onMouseDown', mousemove: 'onMouseMove', mouseup: 'onMouseUp', mouseleave: 'onMouseLeave' }[type];
    }
    return e;
}

function listProps(h) {
    const tree = h.inner.render();
    const kids = [].concat(tree.props.children);
    return kids.find((k) => k && k.props && k.props.className === 'slick-list').props;
}

function act(h, a) {
    const e = { preventDefault() {}, stopPropagation() {} };
    const tree = h.inner.render();
    if (a.do === 'next' || a.do === 'previous') {
        // (no arrow is rendered where `arrows` is off or the carousel is off)
        const arrow = found(tree, a.do === 'next' ? NextArrow : PrevArrow)[0];
        if (arrow) {
            const shown = new (a.do === 'next' ? NextArrow : PrevArrow)(arrow.props).render();
            if (shown.props.onClick) shown.props.onClick(e);
        }
    } else if (a.do === 'dot') {
        const dots = found(tree, Dots)[0];
        if (dots) {
            const ul = new Dots(dots.props).render();
            const li = [].concat(ul.props.children)[a.index];
            [].concat(li.props.children)[0].props.onClick(e);
        }
    } else if (a.do === 'slide') {
        // a click on a slide: its own handler, then the list's
        const track = found(tree, Track)[0];
        const div = new Track(track.props).render();
        const el = [].concat(div.props.children).find((k) => k.props['data-index'] === a.index);
        el.props.onClick(e);
        listProps(h).onClick(e);
    } else if (a.do === 'key') {
        h.inner.keyHandler({ target: { tagName: 'DIV' }, keyCode: a.code });
    } else if (a.do === 'go') {
        h.outer.slickGoTo(a.index, !!a.instant);
    } else if (a.do === 'slick_next') {
        h.outer.slickNext();
    } else if (a.do === 'slick_prev') {
        h.outer.slickPrev();
    } else if (a.do === 'pause') {
        h.outer.slickPause();
    } else if (a.do === 'play') {
        h.outer.slickPlay();
    } else if (a.do === 'hover') {
        const p = found(tree, Track)[0].props;
        if (p.onMouseEnter) p.onMouseEnter(e);
    } else if (a.do === 'unhover') {
        const p = found(tree, Track)[0].props;
        if (p.onMouseLeave) p.onMouseLeave(e);
    } else if (a.do === 'down' || a.do === 'move' || a.do === 'up' || a.do === 'leave') {
        const lp = listProps(h);
        const touch = a.device === 'touch';
        const names = touch
            ? { down: ['onTouchStart', 'touchstart'], move: ['onTouchMove', 'touchmove'], up: ['onTouchEnd', 'touchend'] }
            : { down: ['onMouseDown', 'mousedown'], move: ['onMouseMove', 'mousemove'], up: ['onMouseUp', 'mouseup'], leave: ['onMouseLeave', 'mouseleave'] };
        const [handler, type] = names[a.do];
        if (lp[handler]) lp[handler](pointerEvent(type, a.device, a.x, a.y));
        // (a mouse's release where it was pressed is a click on the list too)
        if (a.do === 'up' && !touch) listProps(h).onClick(e);
    } else if (a.do === 'resize') {
        h.width = a.width;
        h.inner.resizeWindow();
    } else if (a.do === 'slides') {
        // (the program hands it another number of slides: React renders
        // the new children, then calls componentDidUpdate with the props
        // before)
        const before = h.inner.props;
        h.inner.props = { ...before, children: slidesOf(a.count, []) };
        h.count = a.count;
        h.heights = Array(a.count).fill(200);
        h.inner.componentDidUpdate(before, h.inner.state);
    } else if (a.do !== 'wait') {
        throw new Error(`unknown act ${a.do}`);
    }
    commit();
    // (what the act set off at once: a method's setTimeout of 0)
    advance(clock.now);
}

// a case: the carousel mounted at time 0, each act at its time, what it
// shows after each, and what it told (its hooks) all along
function run(name, settings, count, acts, opts = {}) {
    clock.now = 0;
    clock.timers = [];
    const h = mount(settings, count, opts);
    const settled = h.plain ? null : resolved(h);
    const steps = [{ do: 'mount', t: 0, seen: seen(h) }];
    for (const a of acts) {
        advance(a.t);
        if (!h.plain) act(h, a);
        steps.push({ ...a, seen: seen(h) });
    }
    // (timers left running: a carousel's last move settled)
    const out = { name, settings: plainSettings(settings), resolved: settled, count, width: opts.width || 800, page: opts.page || 0, heights: h.heights, widths: opts.widths || [], steps, events: h.events };
    clock.timers = [];
    return out;
}

// the settings a case gives, as JSON (react-slick's names; the defaults it
// takes for the rest are its own)
function plainSettings(s) {
    const out = {};
    for (const [k, v] of Object.entries(s)) if (typeof v !== 'function') out[k] = v;
    return out;
}

// the settings react-slick's Slider handed its InnerSlider: the breakpoint
// applied, centerMode and fade forcing, rows grouped
function resolved(h) {
    const s = h.settings;
    const keys = ['slidesToShow', 'slidesToScroll', 'infinite', 'centerMode', 'centerPadding', 'variableWidth', 'fade', 'speed', 'cssEase', 'autoplay', 'autoplaySpeed', 'pauseOnHover', 'dots', 'arrows', 'initialSlide', 'rtl', 'vertical', 'verticalSwiping', 'adaptiveHeight', 'lazyLoad', 'swipe', 'draggable', 'touchMove', 'touchThreshold', 'swipeToSlide', 'focusOnSelect', 'waitForAnimate', 'edgeFriction', 'accessibility', 'unslick', 'rows', 'slidesPerRow'];
    const out = {};
    for (const k of keys) out[k] = s[k] === undefined ? null : s[k];
    out.slideCount = h.count;
    return out;
}

// ---- the cases ----

const cases = [];
const at = (t, a) => ({ t, ...a });

// one at a time, six slides, wrapping (SimpleSlider): from every slide,
// next, previous, each dot and a go-to, each after the last move settled
{
    const s = { dots: true, infinite: true, speed: 500, slidesToShow: 1, slidesToScroll: 1 };
    for (let from = 0; from < 6; from++) {
        const acts = [at(0, { do: 'go', index: from, instant: true }), at(100, { do: 'next' }), at(700, { do: 'wait' }),
            at(800, { do: 'previous' }), at(1400, { do: 'previous' }), at(2000, { do: 'wait' })];
        for (let d = 0; d < 6; d++) acts.push(at(2100 + d * 700, { do: 'dot', index: d }), at(2100 + d * 700 + 600, { do: 'wait' }));
        cases.push(run(`simple from ${from}`, s, 6, acts));
    }
}

// pages of three, nine slides (MultipleItems), from each page and from
// between pages
{
    const s = { dots: true, infinite: true, speed: 500, slidesToShow: 3, slidesToScroll: 3 };
    for (const from of [0, 1, 2, 3, 6, 8]) {
        cases.push(run(`multiple from ${from}`, s, 9, [at(0, { do: 'go', index: from, instant: true }),
            at(600, { do: 'next' }), at(1200, { do: 'next' }), at(1800, { do: 'previous' }), at(2400, { do: 'previous' }),
            at(3000, { do: 'previous' }), at(3600, { do: 'dot', index: 1 }), at(4200, { do: 'dot', index: 2 }), at(4800, { do: 'wait' })]));
    }
}

// six slides, four shown, four a move, not wrapping (UnevenSetsFinite), and
// wrapping (UnevenSetsInfinite)
for (const infinite of [false, true]) {
    const s = { dots: true, infinite, speed: 500, slidesToShow: 4, slidesToScroll: 4 };
    cases.push(run(`uneven ${infinite ? 'infinite' : 'finite'}`, s, 6, [at(600, { do: 'next' }), at(1200, { do: 'next' }),
        at(1800, { do: 'next' }), at(2400, { do: 'previous' }), at(3000, { do: 'previous' }), at(3600, { do: 'dot', index: 1 }),
        at(4200, { do: 'dot', index: 0 }), at(4800, { do: 'go', index: 5 }), at(5400, { do: 'go', index: 0 }), at(6000, { do: 'wait' })]));
}

// three shown, one a move, not wrapping: to the end and back
{
    const s = { dots: true, infinite: false, speed: 500, slidesToShow: 3, slidesToScroll: 1 };
    const acts = [];
    for (let i = 0; i < 5; i++) acts.push(at(600 * (i + 1), { do: 'next' }));
    for (let i = 0; i < 5; i++) acts.push(at(3600 + 600 * i, { do: 'previous' }));
    acts.push(at(6600, { do: 'dot', index: 3 }), at(7200, { do: 'dot', index: 1 }), at(7800, { do: 'go', index: 4 }), at(8400, { do: 'wait' }));
    cases.push(run('finite by one', s, 6, acts));
}

// the middle slide centred with its neighbours peeking (CenterMode), wrapping
// and not, a pixel padding and a share of the width; a slide pressed is made
// current (focusOnSelect), a clone too
for (const [infinite, pad] of [[true, '60px'], [false, '60px'], [true, '10%'], [false, '0px']]) {
    const s = { className: 'center', centerMode: true, infinite, centerPadding: pad, slidesToShow: 3, speed: 500, focusOnSelect: true, dots: true };
    cases.push(run(`center ${infinite ? 'infinite' : 'finite'} ${pad}`, s, 6, [at(600, { do: 'next' }), at(1200, { do: 'next' }),
        at(1800, { do: 'previous' }), at(2400, { do: 'previous' }), at(3000, { do: 'previous' }), at(3600, { do: 'slide', index: 3 }),
        at(4200, { do: 'slide', index: 4 }), at(4800, { do: 'slide', index: infinite ? 6 : 0 }), at(5400, { do: 'slide', index: infinite ? -1 : 5 }),
        at(6000, { do: 'go', index: 5 }), at(6600, { do: 'next' }), at(7200, { do: 'dot', index: 2 }), at(7800, { do: 'wait' })]));
}

// slides of their own widths (VariableWidth), centred and not, wrapping and
// not
for (const [center, infinite] of [[true, true], [false, true], [false, false], [true, false]]) {
    const s = { className: 'slider variable-width', dots: true, infinite, centerMode: center, slidesToShow: 1, slidesToScroll: 1, variableWidth: true };
    cases.push(run(`variable ${center ? 'centred' : 'plain'} ${infinite ? 'infinite' : 'finite'}`, s, 6, [at(600, { do: 'next' }), at(1200, { do: 'next' }),
        at(1800, { do: 'next' }), at(2400, { do: 'previous' }), at(3000, { do: 'dot', index: 5 }), at(3600, { do: 'next' }),
        at(4200, { do: 'dot', index: 0 }), at(4800, { do: 'previous' }), at(5400, { do: 'wait' })], { widths: [100, 200, 75, 300, 225, 175] }));
}

// a cross-fade (Fade): a move that does not wait for the last (it is
// interrupted), and one that does
for (const wait of [false, true]) {
    const s = { dots: true, fade: true, infinite: true, speed: 500, slidesToShow: 1, slidesToScroll: 1, waitForAnimate: wait };
    cases.push(run(`fade ${wait ? 'waiting' : 'interrupted'}`, s, 4, [at(600, { do: 'next' }), at(800, { do: 'next' }),
        at(1000, { do: 'next' }), at(1700, { do: 'previous' }), at(2400, { do: 'previous' }), at(2600, { do: 'dot', index: 2 }),
        at(3300, { do: 'wait' }), at(3400, { do: 'key', code: 39 }), at(4100, { do: 'wait' })]));
}

// autoplay (AutoPlay): two seconds a move, two seconds moving, linear; then
// as PauseOnHover: the pointer resting on the track holds it, and leaving
// starts it again; a press on an arrow starts its count again
{
    const s = { dots: true, infinite: true, slidesToShow: 3, slidesToScroll: 1, autoplay: true, speed: 2000, autoplaySpeed: 2000, cssEase: 'linear' };
    const acts = [];
    for (let t = 1000; t <= 13000; t += 1000) acts.push(at(t, { do: 'wait' }));
    cases.push(run('autoplay', s, 6, acts));
    const h = { dots: true, infinite: true, slidesToShow: 3, slidesToScroll: 1, autoplay: true, autoplaySpeed: 2000, pauseOnHover: true };
    cases.push(run('autoplay paused on hover', h, 6, [at(1000, { do: 'wait' }), at(2100, { do: 'wait' }), at(2500, { do: 'hover' }),
        at(4200, { do: 'wait' }), at(6000, { do: 'wait' }), at(6100, { do: 'unhover' }), at(8000, { do: 'wait' }), at(8200, { do: 'wait' }),
        at(9000, { do: 'next' }), at(10000, { do: 'wait' }), at(11100, { do: 'wait' }), at(11200, { do: 'wait' }), at(13300, { do: 'wait' })]));
    const n = { dots: true, infinite: true, slidesToShow: 3, slidesToScroll: 1, autoplay: true, autoplaySpeed: 2000, pauseOnHover: false };
    cases.push(run('autoplay not paused on hover', n, 6, [at(2500, { do: 'hover' }), at(4200, { do: 'wait' }), at(6200, { do: 'wait' })]));
    // (AutoPlayMethods: paused and played from the program)
    const m = { dots: true, infinite: true, slidesToShow: 3, slidesToScroll: 1, autoplay: true, autoplaySpeed: 2000 };
    cases.push(run('autoplay methods', m, 6, [at(1000, { do: 'pause' }), at(6000, { do: 'wait' }), at(7000, { do: 'play' }),
        at(9000, { do: 'wait' }), at(9100, { do: 'wait' }), at(11200, { do: 'wait' }), at(11300, { do: 'pause' }), at(14000, { do: 'wait' })]));
    // (not wrapping: it stops at the end)
    const f = { infinite: false, slidesToShow: 2, slidesToScroll: 2, autoplay: true, autoplaySpeed: 1000, speed: 300 };
    const fa = [];
    for (let t = 500; t <= 6000; t += 500) fa.push(at(t, { do: 'wait' }));
    cases.push(run('autoplay finite', f, 6, fa));
}

// settings per window width (Responsive): four shown and not wrapping on a
// wide page, three and wrapping to 1024, two from slide 2 to 600, one to 480
{
    const s = { dots: true, infinite: false, speed: 500, slidesToShow: 4, slidesToScroll: 4, initialSlide: 0,
        responsive: [{ breakpoint: 1024, settings: { slidesToShow: 3, slidesToScroll: 3, infinite: true, dots: true } },
            { breakpoint: 600, settings: { slidesToShow: 2, slidesToScroll: 2, initialSlide: 2 } },
            { breakpoint: 480, settings: { slidesToShow: 1, slidesToScroll: 1 } }] };
    for (const page of [320, 480, 481, 500, 600, 601, 800, 1024, 1025, 1400]) {
        cases.push(run(`responsive at ${page}`, s, 8, [at(600, { do: 'next' }), at(1200, { do: 'next' }), at(1800, { do: 'previous' }), at(2400, { do: 'wait' })], { page, width: Math.min(page, 800) }));
    }
    // (a breakpoint that leaves the carousel off: its slides as they are)
    const u = { slidesToShow: 3, responsive: [{ breakpoint: 600, settings: 'unslick' }] };
    cases.push(run('responsive unslick', u, 6, [at(600, { do: 'next' })], { page: 500 }));
}

// right to left (Rtl), by arrows, dots, keys and autoplay
{
    const s = { dots: true, infinite: true, slidesToShow: 3, slidesToScroll: 1, rtl: true };
    cases.push(run('rtl', s, 6, [at(600, { do: 'next' }), at(1200, { do: 'next' }), at(1800, { do: 'previous' }), at(2400, { do: 'dot', index: 4 }),
        at(3000, { do: 'key', code: 37 }), at(3600, { do: 'key', code: 39 }), at(4200, { do: 'go', index: 0 }), at(4800, { do: 'wait' })]));
    const a = { dots: true, infinite: true, slidesToShow: 3, slidesToScroll: 1, autoplay: true, autoplaySpeed: 2000, pauseOnHover: true, rtl: true };
    cases.push(run('rtl autoplay', a, 6, [at(2100, { do: 'wait' }), at(4200, { do: 'wait' }), at(6300, { do: 'wait' })]));
    const f = { dots: true, infinite: false, slidesToShow: 2, slidesToScroll: 1, rtl: true, initialSlide: 1 };
    cases.push(run('rtl finite', f, 5, [at(600, { do: 'next' }), at(1200, { do: 'previous' }), at(1800, { do: 'previous' }), at(2400, { do: 'previous' }), at(3000, { do: 'wait' })]));
}

// a vertical track (VerticalMode), and its height following the slide shown
// (AdaptiveHeight)
{
    const s = { dots: true, infinite: true, slidesToShow: 3, slidesToScroll: 1, vertical: true, verticalSwiping: true };
    cases.push(run('vertical', s, 6, [at(600, { do: 'next' }), at(1200, { do: 'next' }), at(1800, { do: 'previous' }), at(2400, { do: 'dot', index: 5 }),
        at(3000, { do: 'wait' })], { heights: Array(6).fill(120) }));
    const f = { infinite: false, slidesToShow: 2, slidesToScroll: 1, vertical: true };
    cases.push(run('vertical finite', f, 5, [at(600, { do: 'next' }), at(1200, { do: 'next' }), at(1800, { do: 'next' }), at(2400, { do: 'next' }), at(3000, { do: 'wait' })], { heights: Array(5).fill(90) }));
    const a = { className: '', dots: true, infinite: true, slidesToShow: 1, slidesToScroll: 1, adaptiveHeight: true };
    cases.push(run('adaptive height', a, 6, [at(600, { do: 'next' }), at(1200, { do: 'next' }), at(1800, { do: 'next' }), at(2400, { do: 'previous' }),
        at(3000, { do: 'dot', index: 5 }), at(3600, { do: 'next' }), at(4200, { do: 'wait' })], { heights: [180, 220, 360, 200, 150, 240] }));
}

// slides loaded as they come near (LazyLoad: on demand, from slide 2), and
// one a second, outwards (progressive)
{
    const s = { lazyLoad: 'ondemand', dots: true, infinite: true, speed: 500, slidesToShow: 1, slidesToScroll: 1, initialSlide: 2 };
    cases.push(run('lazy on demand', s, 4, [at(600, { do: 'next' }), at(1200, { do: 'next' }), at(1800, { do: 'previous' }), at(2400, { do: 'previous' }),
        at(3000, { do: 'previous' }), at(3600, { do: 'wait' })]));
    const c = { lazyLoad: 'ondemand', infinite: true, slidesToShow: 3, centerMode: true, centerPadding: '40px', slidesToScroll: 1 };
    cases.push(run('lazy centred', c, 7, [at(600, { do: 'next' }), at(1200, { do: 'previous' }), at(1800, { do: 'previous' }), at(2400, { do: 'wait' })]));
    const f = { lazyLoad: 'ondemand', infinite: false, slidesToShow: 2, slidesToScroll: 2 };
    cases.push(run('lazy finite', f, 6, [at(600, { do: 'next' }), at(1200, { do: 'next' }), at(1800, { do: 'previous' }), at(2400, { do: 'wait' })]));
    const p = { lazyLoad: 'progressive', infinite: true, slidesToShow: 1, slidesToScroll: 1, initialSlide: 1 };
    const pa = [];
    for (let t = 500; t <= 9500; t += 1000) pa.push(at(t, { do: 'wait' }));
    cases.push(run('lazy progressive', p, 5, pa));
}

// swipes, by a mouse and by a touch: a drag too short to move (it settles
// back), one past the threshold (the list's width over touchThreshold), each
// way, at a carousel's ends (edge friction), across several slides
// (swipeToSlide), mostly up and down (a scroll of the page, not a swipe), a
// mouse leaving the list mid-drag, a drag while a move animates, vertical
// swiping, right to left
function swipe(t, device, from, by, steps = 4, extra = []) {
    const acts = [at(t, { do: 'down', device, x: from[0], y: from[1] })];
    for (let i = 1; i <= steps; i++) acts.push(at(t + 16 * i, { do: 'move', device, x: from[0] + (by[0] * i) / steps, y: from[1] + (by[1] * i) / steps }));
    acts.push(...extra.map((a, i) => at(t + 16 * (steps + 1 + i), a)));
    acts.push(at(t + 16 * (steps + 1 + extra.length), { do: 'up', device, x: from[0] + by[0], y: from[1] + by[1] }));
    return acts;
}
for (const device of ['mouse', 'touch']) {
    const one = { dots: true, infinite: true, speed: 500, slidesToShow: 1, slidesToScroll: 1 };
    cases.push(run(`swipe ${device}`, one, 6, [
        ...swipe(100, device, [500, 300], [-100, 0]), at(800, { do: 'wait' }),
        ...swipe(900, device, [500, 300], [-161, 6]), at(1600, { do: 'wait' }),
        ...swipe(1700, device, [300, 300], [200, -20]), at(2400, { do: 'wait' }),
        ...swipe(2500, device, [700, 300], [-600, 0], 6), at(3200, { do: 'wait' }),
        ...swipe(3300, device, [400, 300], [-160, 0]), at(4000, { do: 'wait' }),
        ...swipe(4100, device, [400, 300], [-30, 120]), at(4800, { do: 'wait' }),
        at(4900, { do: 'next' }), ...swipe(5000, device, [400, 300], [-300, 0]), at(5700, { do: 'wait' }),
    ]));
    const finite = { infinite: false, speed: 500, slidesToShow: 2, slidesToScroll: 1 };
    cases.push(run(`swipe ${device} at the ends`, finite, 4, [
        ...swipe(100, device, [300, 200], [250, 0]), at(800, { do: 'wait' }),
        ...swipe(900, device, [600, 200], [-250, 0]), at(1600, { do: 'wait' }),
        ...swipe(1700, device, [600, 200], [-250, 0]), at(2400, { do: 'wait' }),
        ...swipe(2500, device, [600, 200], [-250, 0]), at(3200, { do: 'wait' }),
        ...swipe(3300, device, [200, 200], [300, 0]), at(4000, { do: 'wait' }),
    ]));
    const five = { className: 'center', infinite: true, centerPadding: '60px', slidesToShow: 5, swipeToSlide: true };
    cases.push(run(`swipe ${device} to a slide`, five, 9, [
        ...swipe(100, device, [700, 200], [-370, 0]), at(800, { do: 'wait' }),
        ...swipe(900, device, [100, 200], [500, 0]), at(1600, { do: 'wait' }),
        ...swipe(1700, device, [700, 200], [-170, 0]), at(2400, { do: 'wait' }),
        ...swipe(2500, device, [700, 200], [-620, 0], 8), at(3200, { do: 'wait' }),
    ]));
    const ft = { infinite: true, slidesToShow: 1, touchThreshold: 10 };
    cases.push(run(`swipe ${device} threshold 10`, ft, 5, [...swipe(100, device, [400, 100], [-79, 0]), at(800, { do: 'wait' }),
        ...swipe(900, device, [400, 100], [-81, 0]), at(1600, { do: 'wait' })]));
    const r = { infinite: true, slidesToShow: 2, slidesToScroll: 1, rtl: true };
    cases.push(run(`swipe ${device} rtl`, r, 5, [...swipe(100, device, [400, 100], [-200, 0]), at(800, { do: 'wait' }),
        ...swipe(900, device, [400, 100], [200, 0]), at(1600, { do: 'wait' })]));
    const v = { infinite: true, slidesToShow: 3, slidesToScroll: 1, vertical: true, verticalSwiping: true, swipeToSlide: device === 'touch' };
    cases.push(run(`swipe ${device} vertical`, v, 6, [...swipe(100, device, [300, 300], [0, -150]), at(800, { do: 'wait' }),
        ...swipe(900, device, [300, 100], [10, 200]), at(1600, { do: 'wait' }), ...swipe(1700, device, [300, 300], [-200, -10]), at(2400, { do: 'wait' })],
    { heights: Array(6).fill(100) }));
    const vh = { infinite: true, slidesToShow: 3, slidesToScroll: 1, vertical: true };
    cases.push(run(`swipe ${device} vertical by sideways drags`, vh, 6, [...swipe(100, device, [500, 100], [-200, 0]), at(800, { do: 'wait' })], { heights: Array(6).fill(100) }));
}
{
    // (a mouse leaving the list while it drags ends the swipe there)
    const one = { infinite: true, speed: 500, slidesToShow: 1, slidesToScroll: 1 };
    cases.push(run('swipe mouse leaving', one, 6, [at(100, { do: 'down', device: 'mouse', x: 500, y: 300 }),
        at(116, { do: 'move', device: 'mouse', x: 400, y: 300 }), at(132, { do: 'move', device: 'mouse', x: 250, y: 300 }),
        at(148, { do: 'leave', device: 'mouse', x: 250, y: 300 }), at(164, { do: 'move', device: 'mouse', x: 100, y: 300 }),
        at(180, { do: 'up', device: 'mouse', x: 100, y: 300 }), at(900, { do: 'wait' })]));
    // (not draggable: a mouse does not swipe, a touch does)
    const nd = { infinite: true, slidesToShow: 1, draggable: false };
    cases.push(run('swipe not draggable', nd, 4, [...swipe(100, 'mouse', [500, 300], [-300, 0]), at(800, { do: 'wait' }),
        ...swipe(900, 'touch', [500, 300], [-300, 0]), at(1600, { do: 'wait' })]));
    // (swipe off: neither does)
    const ns = { infinite: true, slidesToShow: 1, swipe: false };
    cases.push(run('swipe off', ns, 4, [...swipe(100, 'touch', [500, 300], [-300, 0]), at(800, { do: 'wait' })]));
}

// the arrow keys (accessibility), right to left, and off
for (const [rtl, keys] of [[false, true], [true, true], [false, false]]) {
    const s = { infinite: true, slidesToShow: 1, slidesToScroll: 1, rtl, accessibility: keys };
    cases.push(run(`keys${rtl ? ' rtl' : ''}${keys ? '' : ' off'}`, s, 5, [at(600, { do: 'key', code: 39 }), at(1200, { do: 'key', code: 39 }),
        at(1800, { do: 'key', code: 37 }), at(2400, { do: 'key', code: 38 }), at(3000, { do: 'key', code: 37 }), at(3600, { do: 'key', code: 37 }), at(4200, { do: 'wait' })]));
}

// what the hooks tell and when (SlideChangeHooks: a second a move), a press
// while a move animates (waitForAnimate holds it), the methods (SlickGoTo,
// PreviousNextMethods)
{
    const s = { dots: true, infinite: true, speed: 1000, slidesToShow: 1, slidesToScroll: 1 };
    cases.push(run('hooks', s, 5, [at(500, { do: 'next' }), at(900, { do: 'next' }), at(1600, { do: 'next' }), at(2300, { do: 'wait' }),
        at(2400, { do: 'go', index: 4 }), at(2900, { do: 'go', index: 1, instant: true }), at(3500, { do: 'slick_next' }), at(4600, { do: 'slick_prev' }),
        at(5700, { do: 'go', index: 9 }), at(6800, { do: 'go', index: -2 }), at(7900, { do: 'wait' })]));
    const w = { infinite: true, speed: 1000, slidesToShow: 1, slidesToScroll: 1, waitForAnimate: false };
    cases.push(run('hooks not waiting', w, 5, [at(500, { do: 'next' }), at(900, { do: 'next' }), at(1100, { do: 'previous' }), at(2300, { do: 'wait' })]));
    const f = { infinite: false, speed: 400, slidesToShow: 2, slidesToScroll: 1 };
    cases.push(run('go to, not wrapping', f, 5, [at(500, { do: 'go', index: 4 }), at(1000, { do: 'go', index: -1 }), at(1500, { do: 'go', index: 2 }),
        at(2000, { do: 'go', index: 3 }), at(2500, { do: 'wait' })]));
}

// a carousel resized (Resizable): its slides take the new width
{
    const s = { dots: true, infinite: true, slidesToShow: 3, slidesToScroll: 1 };
    cases.push(run('resized', s, 6, [at(600, { do: 'next' }), at(1200, { do: 'resize', width: 600 }), at(1300, { do: 'next' }),
        at(1500, { do: 'resize', width: 1000 }), at(2100, { do: 'wait' })], { width: 900 }));
}

// rows of slides (MultipleRows: two rows of two a slide, three shown,
// centred), and too few slides to move (unslick)
{
    const s = { className: 'center', centerMode: true, infinite: true, centerPadding: '60px', slidesToShow: 3, speed: 500, rows: 2, slidesPerRow: 2 };
    cases.push(run('rows', s, 16, [at(600, { do: 'next' }), at(1200, { do: 'next' }), at(1800, { do: 'previous' }), at(2400, { do: 'wait' })]));
    cases.push(run('too few', { slidesToShow: 3, infinite: true }, 3, [at(600, { do: 'next' })]));
    cases.push(run('two of one', { slidesToShow: 1, infinite: true, dots: true }, 2, [at(600, { do: 'next' }), at(1200, { do: 'next' }), at(1800, { do: 'previous' }), at(2400, { do: 'wait' })]));
    cases.push(run('one slide', { slidesToShow: 1, infinite: true, dots: true }, 1, [at(600, { do: 'next' }), at(1200, { do: 'wait' })]));
}

// slides added and taken away (DynamicSlides): six, nine, six again, three
// a move
{
    const s = { dots: true, infinite: true, speed: 500, slidesToShow: 3, slidesToScroll: 3 };
    cases.push(run('dynamic slides', s, 6, [at(600, { do: 'next' }), at(1200, { do: 'slides', count: 9 }), at(1800, { do: 'next' }),
        at(2400, { do: 'slides', count: 6 }), at(3000, { do: 'next' }), at(3600, { do: 'previous' }), at(4200, { do: 'wait' })]));
    const f = { dots: true, infinite: false, speed: 500, slidesToShow: 2, slidesToScroll: 1 };
    cases.push(run('dynamic slides, not wrapping', f, 8, [at(600, { do: 'go', index: 6 }), at(1200, { do: 'slides', count: 5 }),
        at(1800, { do: 'previous' }), at(2400, { do: 'slides', count: 7 }), at(3000, { do: 'next' }), at(3600, { do: 'wait' })]));
}

// two carousels moving together (AsNavFor): the main one a slide at a time,
// its thumbnails three shown, a thumbnail pressed made current
// (focusOnSelect) and swiped to any slide (swipeToSlide); each moves the
// other
function runLinked(name, main, thumbs, count, acts) {
    clock.now = 0;
    clock.timers = [];
    const a = mount(main, count);
    const b = mount(thumbs, count);
    const ra = resolved(a);
    const rb = resolved(b);
    a.inner.props = { ...a.inner.props, asNavFor: b.outer };
    b.inner.props = { ...b.inner.props, asNavFor: a.outer };
    const pair = { main: a, thumbs: b };
    const seenA = [seen(a)];
    const seenB = [seen(b)];
    for (const x of acts) {
        advance(x.t);
        act(pair[x.on], x);
        seenA.push(seen(a));
        seenB.push(seen(b));
    }
    clock.timers = [];
    const one = (h, settings, r, all) => ({ settings: plainSettings(settings), resolved: r, seen: all, events: h.events });
    return { name, count, width: 800, acts: [{ do: 'mount', t: 0 }, ...acts], main: one(a, main, ra, seenA), thumbs: one(b, thumbs, rb, seenB) };
}
const linked = [];
{
    const on = (who, t, a) => ({ on: who, t, ...a });
    linked.push(runLinked('as nav for', {}, { slidesToShow: 3, swipeToSlide: true, focusOnSelect: true }, 6, [
        on('main', 600, { do: 'next' }), on('thumbs', 1200, { do: 'slide', index: 4 }), on('main', 1800, { do: 'previous' }),
        on('thumbs', 2400, { do: 'next' }), on('thumbs', 3000, { do: 'down', device: 'mouse', x: 600, y: 100 }),
        on('thumbs', 3016, { do: 'move', device: 'mouse', x: 500, y: 100 }), on('thumbs', 3032, { do: 'move', device: 'mouse', x: 300, y: 100 }),
        on('thumbs', 3048, { do: 'up', device: 'mouse', x: 300, y: 100 }), on('main', 3700, { do: 'go', index: 0 }),
        on('thumbs', 4300, { do: 'slide', index: -1 }), on('main', 4900, { do: 'wait' })]));
}

// CSS's timing functions as the browser eases with them: the Web
// Animations API's progress of an animation 1000 ms long at each fraction
// of it, in headless Chrome (null where Chrome is not installed)
function easeSampled() {
    const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    // (with Vuetify's window curve and Motion's default tween for a value)
    const names = ['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out', 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', 'cubic-bezier(0.7, 0, 0.3, 1)', 'cubic-bezier(0.25, 0.8, 0.5, 1)', 'cubic-bezier(0.25, 0.1, 0.35, 1)'];
    const fractions = [0, 0.001, 0.01, 0.025, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.975, 0.99, 0.999, 1];
    const page = `<!doctype html><html><body><div id="box"></div><pre id="out"></pre><script>
const names = ${JSON.stringify(names)};
const fractions = ${JSON.stringify(fractions)};
const out = {};
for (const n of names) {
    const a = document.getElementById('box').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1000, easing: n, fill: 'both' });
    a.pause();
    out[n] = fractions.map((f) => { a.currentTime = f * 1000; return a.effect.getComputedTiming().progress; });
    a.cancel();
}
document.getElementById('out').textContent = JSON.stringify(out);
</script></body></html>`;
    const dir = mkdtempSync(join(tmpdir(), 'lory-carousel-'));
    try {
        writeFileSync(join(dir, 'ease.html'), page);
        const r = spawnSync(chrome, ['--headless=new', '--disable-gpu', '--allow-file-access-from-files', `--user-data-dir=${join(dir, 'profile')}`,
            '--virtual-time-budget=5000', '--dump-dom', `file://${join(dir, 'ease.html')}`], { encoding: 'utf8' });
        const m = (r.stdout || '').match(/<pre id="out">([^<]*)<\/pre>/);
        if (!m) return null;
        const version = spawnSync(chrome, ['--version'], { encoding: 'utf8' }).stdout.trim();
        return { browser: version, fractions, curves: JSON.parse(m[1]) };
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

// ---- Vuetify's slide group and touch, Motion's Ticker ----
//
// From a second pinned install (vuetify@4.3.3 and motion-plus@1.5.1, which
// brings motion-plus-react 1.5.4 and motion 12.43.0), the library's own
// functions run on plain numbers: the slide group's scroll targets (its
// helpers.js, on elements given as their offsets), its scroll's eased
// positions (Vuetify's easeOutQuart, floored as its goTo floors them), the
// swipes Vuetify's v-touch hears (its directive, handed touch events), and
// the Ticker's clone count and wrap (motion-plus-react's calcNumClones,
// motion-utils' wrap). Run with LORY_VREF=<scratch>/vref beside LORY_REF.
async function vuetifySampled() {
    const vref = process.env.LORY_VREF;
    if (!vref) return null;
    const { pathToFileURL } = await import('node:url');
    const lib = (path) => pathToFileURL(join(vref, 'node_modules', path)).href;
    // (Vue, which Vuetify imports, reads the page as it loads: it is shown
    // none, not the stand-in react-slick was given)
    const page = { window: globalThis.window, document: globalThis.document };
    delete globalThis.window;
    delete globalThis.document;
    const helpers = await import(lib('vuetify/lib/components/VSlideGroup/helpers.js'));
    const easing = await import(lib('vuetify/lib/util/easing.js'));
    const touch = (await import(lib('vuetify/lib/directives/touch/index.js'))).default;
    const clones = await import(lib('motion-plus-react/dist/es/components/Ticker/utils/calc-num-clones.mjs'));
    const wrapping = await import(lib('motion-utils/dist/es/wrap.mjs'));
    globalThis.window = page.window;
    globalThis.document = page.document;
    const versionOf = (name) => JSON.parse(readFileSync(join(vref, 'node_modules', name, 'package.json'), 'utf8')).version;
    const targets = [];
    for (const room of [300, 748]) {
        for (const here of [0, 120, 410.5]) {
            for (const [start, size] of [[0, 90], [100, 120], [380, 75.5], [700, 140], [1200, 60]]) {
                const container = { offsetWidth: room, scrollLeft: here, scrollWidth: 2000 };
                const child = { offsetLeft: start, offsetWidth: size };
                targets.push({ room, here, start, size,
                    updated: helpers.calculateUpdatedTarget({ selectedElement: child, containerElement: container, isRtl: false, isHorizontal: true }),
                    centered: helpers.calculateCenteredTarget({ selectedElement: child, containerElement: container, isHorizontal: true }) });
            }
        }
    }
    const quart = easing.easingPatterns.easeOutQuart;
    const fractions = [0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1];
    const scrolls = [[0, 748], [748, 1089.5], [530, 0], [12.25, 300]].map(([from, to]) => ({ from, to,
        at: fractions.map((f) => Math.floor(from + (to - from) * quart(Math.min(Math.max(f, 0), 1)))) }));
    // (a touch's target is no element here: v-touch then finds nothing
    // scrolled under it)
    globalThis.Element ??= class {};
    const swipes = [];
    for (const [x0, y0, x1, y1] of [[100, 100, 60, 110], [100, 100, 120, 100], [100, 100, 100, 70], [0, 0, 30, 20], [0, 0, -10, 0], [0, 0, -17, 8], [0, 0, 16, 0], [50, 50, 50, 67], [0, 0, 40, 21]]) {
        const heard = [];
        const listeners = {};
        const el = { addEventListener(name, f) { listeners[name] = f; }, removeEventListener() {} };
        touch.mounted(el, { value: { left: () => heard.push('left'), right: () => heard.push('right'), up: () => heard.push('up'), down: () => heard.push('down') }, instance: { $: { uid: 1 } } });
        listeners.touchstart({ changedTouches: [{ clientX: x0, clientY: y0 }], target: null });
        listeners.touchend({ changedTouches: [{ clientX: x1, clientY: y1 }], target: null });
        swipes.push({ x0, y0, x1, y1, heard: heard.join(',') });
    }
    const tickers = [];
    for (const visible of [100, 852, 2000]) {
        for (const [positions, gap] of [[[{ start: 0, end: 150 }, { start: 160, end: 300 }, { start: 310, end: 637 }], 10], [[{ start: 0, end: 60 }], 0], [[{ start: 0, end: 200 }, { start: 224, end: 260 }], 24]]) {
            tickers.push({ visible, positions, gap, copies: clones.calcNumClones(visible, positions, gap) });
        }
    }
    const wraps = [[-647, 0, -10], [-647, 0, -647], [-647, 0, -700.25], [-647, 0, 5], [-310, 0, 1234.5], [-310, 0, -3000]].map(([low, high, v]) => ({ low, high, v, wrapped: wrapping.wrap(low, high, v) }));
    return { vuetify: versionOf('vuetify'), motion_plus_react: versionOf('motion-plus-react'), motion_utils: versionOf('motion-utils'), targets, scrolls, fractions, swipes, tickers, wraps };
}

const out = { versions, cases, linked, ease: easeSampled(), vuetify: await vuetifySampled() };
writeFileSync(join(dirname(fileURLToPath(import.meta.url)), 'reference.json'), JSON.stringify(out));
console.log(`wrote ${cases.length} cases, ${linked.length} linked, ease ${out.ease ? out.ease.browser : 'not sampled'}, vuetify ${out.vuetify ? out.vuetify.vuetify : 'not sampled'}`);
