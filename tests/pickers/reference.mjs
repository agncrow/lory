// Calendar arithmetic as date-fns does it, for Lory's calendar
// (packages/lory/calendar.co) to be held to number for number by
// tests/pickers/reference.co.
//
// The reference: date-fns 4.1.0, the date library react-datepicker 9.1.0
// stands on (it formats, parses and moves every date of its pickers with
// it). Each section below runs date-fns on fixed inputs and keeps what it
// answered:
//
//   grids       the days of a month's calendar (startOfWeek of its first day
//               to endOfWeek of its last), every weekStartsOn 0 to 6, across
//               leap years and century years
//   iso_weeks   getISOWeek and getISOWeekYear around the years' turns
//   weeks       getWeek and getWeekYear, every weekStartsOn and
//               firstWeekContainsDate
//   months      addMonths (Jan 31 + 1 month is the month's last day)
//   years       addYears (Feb 29 + 1 year is Feb 28)
//   week_ends   startOfWeek and endOfWeek, every weekStartsOn
//   quarters    getQuarter, startOfQuarter and endOfQuarter
//   differences differenceInCalendarDays
//   intervals   eachDayOfInterval
//   formats     format, each token Lory supports, in en-US, en-GB, fr, de
//               and es
//   parses      parse, the tokens Lory supports, against a reference date
//   locales     each locale's weekStartsOn and firstWeekContainsDate
//   zones       instants formatted in a time zone (a run of date-fns in a
//               process whose TZ is that zone), each zone's midnights and
//               the hours of its days
//
// Every date here is a calendar date: the run is in UTC (TZ=UTC), so a
// date-fns Date at midnight is the day itself, written yyyy-MM-dd.
//
// Run with a pinned install, from a scratch folder (never Lory's own):
//   npm install --prefix <scratch>/ref date-fns@4.1.0
//   TZ=UTC LORY_REF=<scratch>/ref node tests/pickers/reference.mjs
// It writes tests/pickers/reference.json beside it.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const VERSION = '4.1.0';
const ref = process.env.LORY_REF;
if (!ref) throw new Error(`LORY_REF: the folder date-fns ${VERSION} is installed in`);
const require = createRequire(`${ref}/node_modules/`);
const installed = require('date-fns/package.json').version;
if (installed !== VERSION) throw new Error(`date-fns ${installed} is installed; the reference is ${VERSION}`);
const df = require('date-fns');
const { enUS, enGB, fr, de, es } = require('date-fns/locale');
const LOCALES = { 'en-US': enUS, 'en-GB': enGB, fr, de, es };

// ---- a run in one time zone (this script, started again with TZ set) ----

if (process.env.LORY_ZONE_JOB) {
    const job = JSON.parse(process.env.LORY_ZONE_JOB);
    const out = { shown: [], midnights: [] };
    for (const at of job.instants) {
        out.shown.push(df.format(new Date(at), "yyyy-MM-dd'T'HH:mm:ss xxx"));
    }
    for (const [y, m, d] of job.days) {
        const midnight = df.startOfDay(new Date(y, m - 1, d, 12));
        const next = df.startOfDay(new Date(y, m - 1, d + 1, 12));
        out.midnights.push({ at: midnight.toISOString(), hours: Math.round((next - midnight) / 3600000) });
    }
    process.stdout.write(JSON.stringify(out));
    process.exit(0);
}

if (new Date(2024, 0, 1).getTimezoneOffset() !== 0) throw new Error('run it in UTC: TZ=UTC');

// ---- dates written and read ----

function day(y, m, d) {
    const t = new Date(Date.UTC(2000, 0, 1));
    t.setUTCFullYear(y, m - 1, d);
    return t;
}

function iso(t) {
    return df.format(t, 'yyyy-MM-dd');
}

function stamp(t) {
    return df.format(t, "yyyy-MM-dd'T'HH:mm:ss");
}

function at(y, m, d, h, mi, s) {
    const t = day(y, m, d);
    t.setUTCHours(h, mi, s, 0);
    return t;
}

// a fixed stream of numbers (a linear congruential generator), so every run
// writes the same cases
let seed = 20261114;
function next() {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
}
function within(lo, hi) {
    return lo + Math.floor(next() * (hi - lo + 1));
}

// ---- the sections ----

const grids = [];
for (const year of [1600, 1700, 1800, 1900, 1999, 2000, 2023, 2024, 2025, 2100, 2400]) {
    for (let month = 1; month <= 12; month++) {
        for (let starts = 0; starts <= 6; starts++) {
            const first = df.startOfWeek(df.startOfMonth(day(year, month, 1)), { weekStartsOn: starts });
            const last = df.endOfWeek(df.endOfMonth(day(year, month, 1)), { weekStartsOn: starts });
            const days = df.eachDayOfInterval({ start: first, end: last });
            grids.push({ year, month, starts, first: iso(first), last: iso(df.startOfDay(last)), days: days.length });
        }
    }
}

const turns = [1999, 2003, 2004, 2008, 2009, 2014, 2015, 2019, 2020, 2025, 2026, 2099, 2100];
const iso_weeks = [];
for (const y of turns) {
    for (let i = 0; i < 20; i++) {
        const t = df.addDays(day(y, 12, 22), i);
        iso_weeks.push({ date: iso(t), week: df.getISOWeek(t), year: df.getISOWeekYear(t) });
    }
}
for (let m = 1; m <= 12; m++) {
    const t = day(2024, m, 1);
    iso_weeks.push({ date: iso(t), week: df.getISOWeek(t), year: df.getISOWeekYear(t) });
}

const weeks = [];
for (const y of [2020, 2021, 2026]) {
    for (let i = 0; i < 16; i++) {
        const t = df.addDays(day(y, 12, 24), i);
        for (let starts = 0; starts <= 6; starts++) {
            for (let contains = 1; contains <= 7; contains++) {
                const o = { weekStartsOn: starts, firstWeekContainsDate: contains };
                weeks.push({ date: iso(t), starts, contains, week: df.getWeek(t, o), year: df.getWeekYear(t, o) });
            }
        }
    }
}

const months = [];
const month_days = [[2024, 1, 28], [2024, 1, 29], [2024, 1, 30], [2024, 1, 31], [2023, 1, 29], [2023, 1, 30], [2023, 1, 31],
    [2024, 3, 31], [2024, 5, 31], [2024, 8, 31], [2024, 10, 31], [2024, 12, 31], [1900, 1, 31], [2000, 1, 31], [2100, 1, 31],
    [2024, 2, 29], [2023, 2, 28], [2000, 2, 29], [1999, 12, 31], [2024, 7, 15], [2026, 11, 14]];
for (const [y, m, d] of month_days) {
    for (const n of [-25, -13, -12, -11, -2, -1, 0, 1, 2, 3, 11, 12, 13, 24, 25, 48, 1200]) {
        months.push({ date: iso(day(y, m, d)), n, result: iso(df.addMonths(day(y, m, d), n)) });
    }
}

const years = [];
for (const [y, m, d] of [[2024, 2, 29], [2000, 2, 29], [1996, 2, 29], [2023, 2, 28], [2024, 2, 28], [2024, 3, 1], [1900, 2, 28], [2024, 12, 31]]) {
    for (const n of [-400, -100, -4, -1, 1, 3, 4, 8, 76, 100, 400]) {
        years.push({ date: iso(day(y, m, d)), n, result: iso(df.addYears(day(y, m, d), n)) });
    }
}

const week_ends = [];
const end_days = [];
for (let i = 0; i < 21; i++) end_days.push(df.addDays(day(2024, 2, 25), i));
for (let i = 0; i < 8; i++) end_days.push(df.addDays(day(2024, 12, 28), i));
for (const t of end_days) {
    for (let starts = 0; starts <= 6; starts++) {
        week_ends.push({ date: iso(t), starts, start: iso(df.startOfWeek(t, { weekStartsOn: starts })), end: iso(df.startOfDay(df.endOfWeek(t, { weekStartsOn: starts }))) });
    }
}

const quarters = [];
for (const y of [2023, 2024]) {
    for (let m = 1; m <= 12; m++) {
        for (const d of [1, 15, df.getDaysInMonth(day(y, m, 1))]) {
            const t = day(y, m, d);
            quarters.push({ date: iso(t), quarter: df.getQuarter(t), start: iso(df.startOfQuarter(t)), end: iso(df.startOfDay(df.endOfQuarter(t))) });
        }
    }
}
for (const t of [day(1900, 2, 28), day(2000, 2, 29), day(2100, 12, 31)]) {
    quarters.push({ date: iso(t), quarter: df.getQuarter(t), start: iso(df.startOfQuarter(t)), end: iso(df.startOfDay(df.endOfQuarter(t))) });
}

const differences = [];
const pairs = [[day(2024, 3, 5), day(2024, 3, 5)], [day(2024, 3, 6), day(2024, 3, 5)], [day(2025, 3, 1), day(2024, 3, 1)],
    [day(2024, 3, 1), day(2023, 3, 1)], [day(2000, 3, 1), day(1900, 3, 1)], [day(2100, 3, 1), day(2000, 3, 1)],
    [day(1970, 1, 1), day(2024, 2, 29)], [day(1600, 1, 1), day(2400, 12, 31)], [day(2024, 12, 31), day(2024, 1, 1)]];
for (let i = 0; i < 100; i++) {
    pairs.push([day(within(1600, 2400), within(1, 12), within(1, 28)), day(within(1600, 2400), within(1, 12), within(1, 28))]);
}
for (const [a, b] of pairs) {
    differences.push({ later: iso(a), earlier: iso(b), days: df.differenceInCalendarDays(a, b) });
}

const intervals = [];
for (const [a, b] of [[day(2024, 2, 27), day(2024, 3, 2)], [day(2023, 2, 27), day(2023, 3, 2)], [day(2024, 12, 30), day(2025, 1, 2)],
    [day(2024, 3, 5), day(2024, 3, 5)], [day(1900, 2, 27), day(1900, 3, 1)], [day(2000, 2, 27), day(2000, 3, 1)],
    [day(2023, 6, 15), day(2023, 8, 15)], [day(2024, 1, 1), day(2024, 12, 31)], [day(1999, 12, 25), day(2000, 1, 7)]]) {
    const days = df.eachDayOfInterval({ start: a, end: b }).map(iso);
    intervals.push({ start: iso(a), end: iso(b), count: days.length, days: days.length <= 70 ? days : [] });
}

// format: each token alone and the patterns the pickers use, over times
// chosen for their edges (midnight, noon, the hours about them; ordinal
// days; every month and weekday) and a fixed stream of others
const moments = [at(2024, 3, 5, 14, 7, 9), at(2024, 1, 1, 0, 0, 0), at(2024, 1, 2, 12, 0, 0), at(2024, 1, 3, 11, 59, 59),
    at(2024, 1, 4, 12, 59, 0), at(2024, 1, 11, 13, 0, 0), at(2024, 1, 12, 23, 59, 59), at(2024, 1, 13, 1, 5, 5),
    at(2024, 1, 21, 9, 30, 0), at(2024, 1, 22, 10, 0, 0), at(2024, 1, 23, 22, 15, 0), at(2024, 1, 24, 6, 45, 30),
    at(2024, 1, 31, 18, 0, 0), at(2023, 12, 31, 23, 0, 0), at(2021, 1, 3, 8, 0, 0), at(2020, 12, 31, 17, 30, 0),
    at(1999, 12, 31, 23, 59, 59), at(2000, 2, 29, 12, 30, 0), at(1900, 3, 1, 0, 0, 0), at(2100, 12, 31, 12, 0, 0)];
for (let m = 1; m <= 12; m++) moments.push(at(2025, m, within(1, 28), within(0, 23), within(0, 59), within(0, 59)));
while (moments.length < 40) moments.push(at(within(1990, 2040), within(1, 12), within(1, 28), within(0, 23), within(0, 59), within(0, 59)));
const tokens = ['yyyy', 'yy', 'y', 'MM', 'M', 'MMM', 'MMMM', 'LLLL', 'dd', 'd', 'do', 'EEE', 'EEEE', 'EEEEE', 'EEEEEE', 'HH', 'H', 'hh', 'h',
    'mm', 'm', 'ss', 's', 'a', 'aa', 'aaa', 'aaaa', 'Q', 'QQ', 'QQQ', 'QQQQ', 'w', 'ww', 'I', 'II', 'R', 'RRRR', 'xxx', 'XXX'];
const patterns = ['MM/dd/yyyy', 'LLLL yyyy', 'yyyy-MM-dd', 'h:mm aa', 'MMMM d, yyyy h:mm aa', 'I/R', 'yyyy, QQQ', 'dd.MM.yyyy',
    "EEEE, MMMM do, yyyy", "'Week' w", 'HH:mm:ss', "yyyy-MM-dd'T'HH:mm", "h 'o''clock'", 'MMM yyyy', 'EEE d MMM'];
const named = ['MMMM', 'MMM', 'LLLL', 'EEEE', 'EEE', 'EEEEEE', 'EEEEE', 'a', 'do', 'w', 'd MMMM yyyy', 'EEEE d MMMM'];
const formats = [];
for (const t of moments) {
    for (const pattern of [...tokens, ...patterns]) {
        formats.push({ at: stamp(t), locale: 'en-US', pattern, text: df.format(t, pattern, { useAdditionalWeekYearTokens: true }) });
    }
    for (const code of ['en-GB', 'fr', 'de', 'es']) {
        for (const pattern of named) {
            formats.push({ at: stamp(t), locale: code, pattern, text: df.format(t, pattern, { locale: LOCALES[code] }) });
        }
    }
}

// parse: hand-written cases at their edges, then a format read back for
// each pattern, against a reference date
const parses = [];
function parsed(text, pattern, reference, locale = 'en-US') {
    const t = df.parse(text, pattern, reference, { locale: LOCALES[locale] });
    parses.push({ text, pattern, locale, reference: stamp(reference), result: df.isValid(t) ? stamp(t) : null });
}
const noon = at(2024, 1, 1, 12, 0, 0);
const early = at(2024, 1, 1, 0, 0, 0);
for (const [text, pattern] of [['1/2/24', 'MM/dd/yyyy'], ['01/02/2024', 'MM/dd/yyyy'], ['1/2/2024', 'M/d/yyyy'], ['01/02/24', 'MM/dd/yy'],
    ['01/02/99', 'MM/dd/yy'], ['01/02/74', 'MM/dd/yy'], ['01/02/75', 'MM/dd/yy'], ['01/02/00', 'MM/dd/yy'], ['02/30/2024', 'MM/dd/yyyy'],
    ['02/29/2024', 'MM/dd/yyyy'], ['02/29/2023', 'MM/dd/yyyy'], ['02/29/1900', 'MM/dd/yyyy'], ['02/29/2000', 'MM/dd/yyyy'],
    ['13/01/2024', 'MM/dd/yyyy'], ['00/10/2024', 'MM/dd/yyyy'], ['12/00/2024', 'MM/dd/yyyy'], ['12/32/2024', 'MM/dd/yyyy'],
    ['04/31/2024', 'MM/dd/yyyy'], ['2024-03-05', 'yyyy-MM-dd'], ['2024-3-5', 'yyyy-MM-dd'], ['5 March 2024', 'd MMMM yyyy'],
    ['5 mar 2024', 'd MMM yyyy'], ['5 MARCH 2024', 'd MMMM yyyy'], ['5 Mar 2024', 'd MMMM yyyy'], ['5 Marc 2024', 'd MMMM yyyy'],
    ['Mar 5, 2024', 'MMM d, yyyy'], ['10:30 PM', 'hh:mm a'], ['10:30 pm', 'hh:mm a'], ['12:00 am', 'hh:mm a'], ['12:00 PM', 'hh:mm a'],
    ['12:30 AM', 'h:mm a'], ['14:05', 'HH:mm'], ['24:00', 'HH:mm'], ['23:60', 'HH:mm'], ['9:05', 'H:mm'], ['09:05:07', 'HH:mm:ss'],
    ['9:5:7', 'H:m:s'], ['1/2/2024x', 'M/d/yyyy'], ['1/2/2024 ', 'M/d/yyyy'], [' 1/2/2024', 'M/d/yyyy'], ['123/02/2024', 'MM/dd/yyyy'],
    ['2024', 'yyyy'], ['24', 'yyyy'], ['12024', 'yyyy'], ['0', 'yyyy'], ['1st March 2024', 'do MMMM yyyy'],
    ['22nd March 2024', 'do MMMM yyyy'], ['3rd March 2024', 'do MMMM yyyy'], ['32nd March 2024', 'do MMMM yyyy'],
    ['1 March 2024', 'do MMMM yyyy'], ['March', 'MMMM'], ['5', 'd'], ['05/2024', 'MM/yyyy'], ['2024-03-05 10:30', 'yyyy-MM-dd HH:mm'],
    ['2024-03-05T10:30', "yyyy-MM-dd'T'HH:mm"], ["10 o'clock", "h 'o''clock'"], ['2024/03/05', 'yyyy-MM-dd'], ['', 'MM/dd/yyyy'],
    ['5.3.2024', 'd.M.yyyy'], ['05.03.2024', 'dd.MM.yyyy'], ['10:30', 'hh:mm'], ['7', 'h'], ['7 pm', 'h a'], ['7 p', 'h a'],
    ['2024, Q3', 'yyyy, QQQ'], ['2024, q3', 'yyyy, QQQ'], ['2024, 3', 'yyyy, QQQ'], ['2024, Q5', 'yyyy, QQQ'], ['Q1 2025', 'QQQ yyyy'],
    ['3/2024', 'Q/yyyy'], ['03/2024', 'QQ/yyyy'], ['2024, 3rd quarter', 'yyyy, QQQQ'], ['2024, 3 quarter', 'yyyy, QQQQ'],
    ['2024, Q2', 'yyyy, QQQQ'], ['Q3', 'QQQ'], ['3', 'Q'], ['10/2024', 'I/R'], ['1/2021', 'I/R'], ['53/2020', 'I/R'],
    ['53/2021', 'I/R'], ['54/2024', 'I/R'], ['0/2024', 'I/R'], ['10', 'I'], ['2024', 'R'], ['10/2024', 'II/RRRR'], ['W10 2024', "'W'I R"]]) {
    parsed(text, pattern, noon);
    parsed(text, pattern, early);
}
for (const reference of [at(1950, 6, 1, 0, 0, 0), at(2030, 6, 1, 0, 0, 0), at(2075, 6, 1, 0, 0, 0), at(1999, 6, 1, 0, 0, 0)]) {
    for (const yy of ['00', '24', '49', '50', '74', '75', '79', '80', '99']) {
        parsed(`03/05/${yy}`, 'MM/dd/yy', reference);
    }
}
const read_back = ['MM/dd/yyyy', 'M/d/yyyy', 'yyyy-MM-dd', 'dd.MM.yyyy', 'd MMMM yyyy', 'MMM d, yyyy', 'MM/dd/yy', 'h:mm aa',
    'HH:mm', 'HH:mm:ss', 'yyyy-MM-dd HH:mm', 'do MMMM yyyy', 'MMMM d, yyyy h:mm aa', 'hh:mm:ss a', 'yyyy, QQQ', 'QQQQ yyyy',
    'I/R', 'II/RRRR'];
for (const t of moments) {
    for (const pattern of read_back) {
        parsed(df.format(t, pattern), pattern, noon);
    }
    for (const code of ['en-GB', 'fr', 'de', 'es']) {
        for (const pattern of ['d MMMM yyyy', 'd MMM yyyy']) {
            parsed(df.format(t, pattern, { locale: LOCALES[code] }), pattern, noon, code);
        }
    }
}

const locales = [];
for (const [code, loc] of Object.entries(LOCALES)) {
    locales.push({ code, starts: loc.options.weekStartsOn, contains: loc.options.firstWeekContainsDate });
}

// zones: what an instant reads as in each zone, where each zone's days
// begin and how many hours they hold, around the turns of daylight time
const instants = ['2024-03-10T06:30:00Z', '2024-03-10T07:30:00Z', '2024-11-03T05:30:00Z', '2024-11-03T06:30:00Z',
    '2024-03-31T00:30:00Z', '2024-03-31T01:30:00Z', '2024-10-27T00:30:00Z', '2024-10-27T01:30:00Z', '2024-04-06T15:30:00Z',
    '2024-04-06T16:30:00Z', '2024-10-05T16:00:00Z', '2024-10-05T17:00:00Z', '2026-07-14T13:30:00Z', '2026-01-01T00:00:00Z',
    '1999-12-31T23:59:59Z', '2000-06-15T12:00:00Z'];
for (let m = 1; m <= 12; m++) instants.push(new Date(Date.UTC(2026, m - 1, 15, 12, 0, 0)).toISOString().replace('.000', ''));
const zone_days = [[2024, 3, 10], [2024, 11, 3], [2024, 3, 31], [2024, 10, 27], [2024, 4, 7], [2024, 10, 6], [2026, 7, 14], [2026, 1, 1]];
const zones = [];
for (const zone of ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Kolkata',
    'Australia/Adelaide', 'America/St_Johns', 'Pacific/Chatham']) {
    const job = JSON.stringify({ instants, days: zone_days });
    const run = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { env: { ...process.env, TZ: zone, LORY_ZONE_JOB: job }, encoding: 'utf8' });
    if (run.status !== 0) throw new Error(`the run in ${zone} failed: ${run.stderr}`);
    const got = JSON.parse(run.stdout);
    zones.push({ zone, instants, shown: got.shown, days: zone_days.map(([y, m, d]) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`), midnights: got.midnights });
}

const out = { library: 'date-fns', version: VERSION, grids, iso_weeks, weeks, months, years, week_ends, quarters, differences, intervals, formats, parses, locales, zones };
const counted = Object.fromEntries(Object.entries(out).filter(([, v]) => Array.isArray(v)).map(([k, v]) => [k, v.length]));
// one case to a line, so a change reads as the cases it changed
const lines = ['{', `"library": "date-fns", "version": "${VERSION}",`];
const sections = Object.keys(counted);
sections.forEach((name, i) => {
    lines.push(`"${name}": [`);
    out[name].forEach((c, j) => lines.push(JSON.stringify(c) + (j + 1 < out[name].length ? ',' : '')));
    lines.push(']' + (i + 1 < sections.length ? ',' : ''));
});
lines.push('}');
const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(here, 'reference.json'), lines.join('\n') + '\n');
console.log(`date-fns ${VERSION}:`, counted);
