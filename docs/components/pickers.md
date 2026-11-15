# lory.calendar and lory.pickers: dates, times and a week of meetings

`lory.calendar` (packages/lory/calendar.co) is the arithmetic of days, the
words dates are written in and read from, the rules saying which days may
be chosen, a month's calendar drawn as one control, and a scheduler.
`lory.pickers` (packages/lory/pickers.co) puts them in a field: a day, a
range, several days, a week, a month, a quarter, a year (and ranges of
them), a time, or a day and a time, each with its calendar or list in a
layer under the field, or inline without one.

A program holds what is chosen, a list of moments, and asks each frame:

    due = pickers.date_picker['due']
    shown = gui.show[c, gui.column[[gui.label['Due'], pickers.control[due, chosen]]]]
    chosen = pickers.answered[due, chosen, shown]

Lory holds the rest under the picker's id: the month shown, the day the
keys move from, the words being typed, whether the calendar is open.

The days follow date-fns 4.1.0, the date library react-datepicker stands
on, number for number; the pickers follow react-datepicker 9.1.0: its keys,
the days it lets be chosen, the order a range is chosen in, its list of
times. Both are Lory's own code; nothing of either library is copied.

## Days, times and zones

- **A day** is a moment at midnight in UTC (`calendar.day[2024, 3, 5]`): a
  date with no clock and no zone. Days compare, subtract and keep their
  fields as Crow's moments do. `day` counts a month past December on into
  the next year and takes a day past the month's end as its last.
- **A time** is a moment, read in the picker's zone (`pickers.zoned`). A
  zone is an IANA name (`Europe/Paris`), an offset (`+05:30`) or `UTC`.
  `calendar.day_start[d, zone]` is where a day begins there and
  `calendar.hours_in_day` how long it is (23 or 25 hours where the clocks
  turn); `calendar.at_clock[d, seconds, zone]` is a clock on a day, a clock
  the turning skips taken as the moment after the gap.
- **Today** is `calendar.today[zone]`: the only thing here that reads the
  clock. Every other function answers the same for the same days.

## The vocabulary of lory.calendar

| Function | What it does |
|---|---|
| `day[y, m, d]`, `day_of[t]`, `today[zone]`, `in_zone[t, zone]` | A day; the day a moment falls on (in UTC); today in a zone; a moment read in a zone (its fields there). |
| `leap_year[y]`, `days_in_month[y, m]`, `weekday[t]`, `seconds_into[t]` | The calendar's facts: 0 is Sunday. |
| `add_days`, `add_weeks`, `add_months`, `add_quarters`, `add_years` `[t, n]` | Days added. A month or a year added keeps the day, or takes the month's last (2024-01-31 and a month is 2024-02-29), and keeps the clock. |
| `days_between`, `months_between`, `quarters_between`, `years_between` `[t, since]` | Whole steps from `since` to `t`, as date-fns's `differenceIn…` counts them. |
| `start_of_week[t, week_start]`, `end_of_week`, `start_of_month`, `end_of_month`, `quarter`, `start_of_quarter`, `end_of_quarter`, `start_of_year`, `end_of_year` | Where periods begin and end. |
| `same_day`, `same_month`, `same_quarter`, `same_year` `[a, b]` | Whether two moments share a period. |
| `each_day[first, last]`, `no_days[]`, `plain_days[chosen]` | The days from one to another; an empty list of days; what is chosen, or none where it failed. |
| `week[t, week_start, first_holds]`, `week_year`, `iso_week[t]`, `iso_week_year[t]` | A week of the year by a locale's rule (the week holding January's `first_holds` is the first) and by ISO's. |
| `month_days[y, m, week_start, six]` | The days a month's calendar shows: whole weeks from the week's first day, six of them where asked (react-datepicker's `fixedHeight`). |
| `locale[name]`, `locales[]`, `ordinal[n, loc]` | en-US (the default), en-GB, fr, de, es: the first day of the week, the week rule, the names of months, weekdays and quarters, a.m. and p.m. |
| `format[t, pattern, loc]`, `pieces[pattern]` | A moment written by a date-fns pattern: `yyyy yy y`, `M MM MMM MMMM MMMMM` (and `L…`), `d dd do`, `E…` and `e…`, `H HH h hh m mm s ss`, `a aa aaa aaaa aaaaa`, `Q…`, `w ww I II R RRRR`, `xxx XXX`, quoted words. |
| `parse[words, pattern, loc, reference, zone]` | Words read by a pattern as date-fns reads them: what the pattern leaves out is the reference's; a year sets the date to its first day, a quarter or a month to its first, an ISO week to its Monday. Words that do not fit, a day the month lacks, or parts date-fns rules out together (a quarter and a month) are an error value of kind `parse`. |
| `day_start[d, zone]`, `hours_in_day[d, zone]`, `at_clock[d, seconds, zone]` | A day in a zone. |
| `rules[]`, `bounded[r, earliest, latest]`, `excluding[r, days]`, `excluding_spans[r, spans]`, `including[r, days]`, `including_spans[r, spans]`, `filtered[r, keep]`, `marking[r, days, tone]`, `observing[r, holidays]` | Which days may be chosen (react-datepicker's `minDate`, `maxDate`, `excludeDates`, `excludeDateIntervals`, `includeDates`, `includeDateIntervals`, `filterDate`), the days shown in a tone (`highlightDates`: accent, success, warning, danger) and the holidays (`holidays`, a dot and the name over the day). A span is `calendar.Span[start, end]`, both days held, a holiday `calendar.Holiday[day, name]`. |
| `day_off[r, t]`, `span_off[r, first, last]`, `tone_on`, `holiday_on`, `open_day_in_month` | What the rules say of a day. |
| `moving_key[key]`, `key_moved[t, key, shift, r, week_start, by_weeks]` | Where a key moves the focus (below). |
| `chosen_by[chosen, t, mode, swap, r, week_start]`, `choice_ends[…]` | What is chosen once a day is pressed: `day`, `days`, `week` or `range`, and whether that ends the choice. |
| `sheet[id, chosen]`, `focused_on`, `turned`, `turns_back`, `turns_on`, `sheet_wide`, `sheet_tall`, `day_spot`, `arrow_spot` | A month's calendar: its fields `shown` (the first month), `months` and `columns`, `loc`, `numbers` (the weeks' numbers), `six`, `rules`, `chosen`, `mode`, `swap`, `focus`, `previews` (a range's days to the pointer, shaded), `today`. |
| `month_view[sh]` | The calendar drawn: one control (below). |
| `entry[id, title, start, end]`, `whole_days[id, title, first, last]`, `side_by_side[entries, d, zone]`, `lanes[…]`, `hidden_on[…]` | A scheduler's entries and how they are laid. |
| `schedule[id, scope, shown, entries]`, `schedule_days`, `schedule_turned`, `schedule_tall`, `scheduler[sch]`, `entry_spot`, `entry_spots` | The scheduler: its fields `scope` (`month`, `week`, `day`), `loc`, `zone`, `first_hour`, `last_hour`, `hour_tall`, `lanes_shown`, `wide`. |
| `wheel_turns[c]`, `presses_at[c]`, `keys_typed[c]` | The frame's wheel turns, presses and keys (with Shift), for a painter. |

### The month's calendar

`month_view[sh]` is one drawn control (`gui.drawn`), as wide as its months
need: a title and two arrows, the weekdays' names, the weeks' numbers where
asked (ISO weeks, as react-datepicker numbers them), and the days. It
draws the range chosen as a band, the days a range would take as the
pointer moves (the preview), the tones and holidays, today's ring and the
focus's. It tells `press` (`words` the day, as `2024-03-20`) for a day that
may be chosen, `previous` and `next` for the arrows (dimmed past the
bounds), `title` for a month's title, `key` (`num` 1 with Shift) and `tab`
for keys typed while it has the focus. Months side by side leave out the
days the next or the last shows where they meet, as react-datepicker does.

### The scheduler

`scheduler[sch]` draws TOAST UI Calendar's three views as one control:

- **Month:** six weeks of cells; entries over several days in lanes across
  the row; `+N more` where a day holds more than `lanes_shown`.
- **Week and day:** the whole days in an all-day row, then the hours from
  `first_hour` to `last_hour`. Timed entries that overlap stand side by
  side: in the order they begin (the longer first), each in the first
  column free, every entry of a group of overlapping ones (directly or
  through others) sharing its number of columns. An entry ending as another
  begins does not overlap it.

It tells `open` (the entry's id), `more` (the day), `day` (a month's day
pressed where no entry is) and `slot` (the moment, to the half hour, where
a week's or a day's hours are pressed).

## The vocabulary of lory.pickers

| Function | What it does |
|---|---|
| `date_picker`, `range_picker`, `dates_picker`, `week_picker`, `month_picker`, `month_range_picker`, `quarter_picker`, `quarter_range_picker`, `year_picker`, `year_range_picker`, `time_picker`, `date_time_picker` `[id]` | A picker, its field written `MM/dd/yyyy` (a week `I/R`, a month `MM/yyyy`, a quarter `yyyy, QQQ`, a year `yyyy`, a time `h:mm aa`, a day and a time `MM/dd/yyyy h:mm aa`). Its fields can be set as any record's (`p.format = 'dd.MM.yyyy'`). |
| `inline[p]` | Its calendar or list alone, always shown, no field. |
| `localized[p, name]`, `zoned[p, zone]` | Its locale (its words and first weekday) and its zone. |
| `showing[p, n, columns]`, `numbered[p]`, `six_weeks[p]` | Several months, the weeks' numbers, six weeks always. |
| `ruled[p, rules]` | Which days may be chosen (`calendar.rules`); a month, quarter or year may not be chosen where it is past the bounds, holds a day left out, holds no day included, or its first day is filtered out, as react-datepicker decides. |
| `swapping[p]`, `kept_open[p]` | A range ended before its first day swapped (`swapRange`); the calendar kept open after a choice (`shouldCloseOnSelect` false). |
| `with_today[p, words]`, `clearable[p]`, `with_icon[p]`, `read_only[p]`, `turned_off[p]`, `hinted[p, words]`, `custom[p, own]` | A button choosing today; a cross clearing; a calendar's picture opening it; a field only read; the whole picker off; a hint; a control of the program's own shown instead of the field, opening the calendar (react-datepicker's `customInput`). |
| `timed[p, minutes]`, `times_bounded[p, earliest, latest]`, `times_excluding[p, times]`, `times_including[p, times]`, `times_adding[p, times]`, `times_filtered[p, keep]` | The list's times: `timeIntervals`, `minTime` with `maxTime` (both or neither, as react-datepicker has them), `excludeTimes`, `includeTimes`, `injectTimes`, `filterTime`. Times are seconds into the day. |
| `control[p, chosen]` | The picker drawn. |
| `answered[p, chosen, shown]` | What is chosen after the frame (below). |
| `written[p, chosen]`, `read_words[p, words, reference]`, `strict[p]` | The field's words (a range `a - b`, several days `a, b` or `a (+n)`); what words typed choose; words read only where the pattern writes them so for what they read (`strictParsing`: `3/5/2024` is then no day of `MM/dd/yyyy`, and `03/05/24` not the year 24). |
| `times_of[p, d]`, `time_off[p, t]`, `time_place[p, times, t]` | A day's list of times; whether a time may not be chosen; the place in a list of the last time not after a clock (where the list's keys move from). |
| `tile_moved[p, t, key]`, `years_page[y]`, `period_off[r, first, last]` | Where a key moves the focus among months, quarters or years; the first and last of the twelve years a page shows; whether a month, quarter or year may not be chosen. |
| `is_open[p]`, `tile_spot[p, shown, t]`, `time_spot[p, chosen, t]`, `tiles_wide[p]`, `tiles_tall[p]` | Whether the calendar is open; where a month's, quarter's or year's tile and a time are drawn, from the top left of the page or list (`[-1, -1, 0, 0]` where it is not shown); a page of tiles' size. For tests, and programs that point. |

### What a picker answers

`answered` takes the picker's events from `shown` in order:

- **The field:** a press opens the calendar (not where it is only read, or
  off); words typed are read by the pattern as they are typed and choose
  what they write where it may be chosen; Enter opens the calendar, or,
  open, chooses the day the keys moved to (else closes it). While the
  calendar is open the field keeps the focus, and its Up and Down arrows,
  Page Up and Page Down (with Shift, a year) move over the days; in a
  time's picker Up and Down step the time by the list's minutes, as
  react-datepicker's time input does. Tab closes it. The words as typed
  are the field's own `edit` event in `shown.events` (its id is the
  picker's), for a program that wants them raw (`onChangeRaw`).
- **The calendar:** a day pressed is chosen; the arrows turn the months;
  its keys move as below; Enter and space choose; Escape closes. A choice
  that ends (a day, a week, a range's last day) closes it and gives the
  focus back to the field; a range's first day and several days keep it
  open.
- **The list of times:** a time pressed is chosen; the wheel (or a
  headset's thumbstick) scrolls it; Up and Left a time back, Down and
  Right on, Enter chooses.
- **The buttons:** the icon opens and closes, the cross clears, Today
  chooses today.

## Behaviours held

The keys over a month's days are react-datepicker's (`onDayKeyDown`):

| Key | Moves the focus |
|---|---|
| Left, Right | A day (a week in a week's picker). |
| Up, Down | A week. |
| Page Up, Page Down | A month, keeping the day or taking the month's last; with Shift a year. |
| Home, End | The week's first day; its last. |

A day that may not be chosen is stepped past in the key's way; Page Up and
Home onto one go on to later days, Page Down and End back to earlier ones;
a step before the first day allowed is taken to it (or on from it, where it
is left out too), after the last back to it; after 40 steps the focus stays
where it was. Months move one across and three up and down, stepping past
those left out (40 steps); quarters move one across, and years one across
and three up and down (react-datepicker's leftover rule at a page's edge),
neither onto one left out. A page of years is twelve, ending on a multiple
of twelve (2017 to 2028).

A range is begun by its first press; a press on or after its first day ends
it; one before begins it again there (with `swapping`, ends it with the
two swapped); a press once it is whole begins a new one. Several days are
added in the order pressed and taken away when pressed again.

A day's list of times runs every `interval` minutes from the day's start
in the picker's zone, as many as the day's hours hold (46 on a day of 23
hours at 30 minutes), with the added times between the two they fall
between.

### Where Lory departs from react-datepicker, on purpose

- **End** goes to the week's last day, as react-datepicker's documents say.
  Its source goes to the Saturday whatever day the week begins on.
- **Enter on a page of years** with nothing chosen chooses the year with
  the focus; react-datepicker ignores it.
- **The field keeps the focus** while the calendar is open, and its keys
  move over the days. React-datepicker moves the browser's focus into the
  calendar; a control Lory draws takes the focus only from a press (a
  focus given by `gui.focus` would bring up a headset's keyboard).
- **Months moved by keys** are held to the bounds as whole months: a month
  holding a day allowed may be moved to. React-datepicker compares the day
  moved to with the bound, so the day of the month the focus was on
  decides it.
- **A field only read** cannot hold its words in Lory's field, which has
  no such state: typing into it is undone by writing its words back.
- **Times' bounds** given the wrong way round are taken the right way, as
  date-fns's interval takes them; one bound alone bounds nothing (it threw
  in react-datepicker).

## Parity

- **date-fns 4.1.0:** tests/pickers/reference.mjs runs date-fns on fixed
  inputs and writes reference.json; tests/pickers/reference.co holds
  lory.calendar to it in 9 blocks and 36 truths over 9,732 cases, every one
  held: 924 months' grids from each first weekday, 272 ISO weeks and 2,352
  weeks by a locale's rule, 357 months and 88 years added, 203 weeks' and 75
  quarters' ends, 109 days between and 9 runs of days, 4,080 dates written
  (every token, and the names in five locales), 1,248 words read or
  refused (the edges by hand, quarters and ISO weeks among them, and
  dates written read back), 5 locales' week rules, and 10 zones' instants
  and days (where each day begins, and its hours, on days the clocks turn).
  To write it again, with date-fns pinned in a scratch folder:

      npm install --prefix <scratch>/ref date-fns@4.1.0
      TZ=UTC LORY_REF=<scratch>/ref node tests/pickers/reference.mjs

- **react-datepicker 9.1.0:** tests/pickers/datepicker.co holds the keys,
  the steps past days left out, the bounds, the 40 steps, months', quarters'
  and years' keys, the pages of years, a range's order, several days, the
  list's intervals, bounds and DST days, strict parsing, and Enter and
  Escape through a field and a list in frames: 16 blocks, 116 truths, each
  a case worked by the rules of its published `dist/index.js`.
- **Both of Crow's modes:** tests/modes/pickers.co writes out what both
  modules compute on fixed days (216 lines: grids, weeks, sums, dates
  written and read, zones, keys, choices, times, tiles, words and a
  scheduler's layout); `tests/modes.sh crow tests/modes/pickers.co` holds
  the interpreter's run and the compiled program's equal.
- **The modules' own blocks:** calendar.co 14 blocks and 102 truths;
  pickers.co 17 blocks and 90 truths, each module with one in a headset's
  left eye (`"xr": true`).

## The example

examples/pickers shows a day in a field with its calendar, an icon, a
cross and a Today button; a stay chosen over two months; a calendar inline
with the weeks' numbers, two days in a tone and a holiday; a month and a
year; a list of times from 8:00 to 18:00; and a week of a scheduler whose
meetings overlap on the Monday and the Thursday, with an offsite over two
whole days. Its six blocks press each of them in frames, one in a headset.
It builds for the browser (`crow build --target web main.co`).

## In a headset

A calendar, a list and a scheduler are drawn on the page there as on a
screen, and pressed by a controller's ray as by a mouse. The list scrolls
by a thumbstick's turns. A field typed in brings up Lory's drawn keyboard;
the calendar's own keys come from a press on it, so choosing by pressing
needs no keyboard.

## What gui could do for the pickers

- **Drawn's `c`, `px` and `py` can fail** (gui reads them from the frame's
  input), so a painter that decides on them answers a value that can fail,
  and is refused against `_undrawn`'s plain kind with "gui.Node's field
  'painter' holds a function, and this is a function". Each painter here
  guards them first. gui answering them plain would spare every painter.
- **A field's unused keys:** a field consumes Up and Down and tells no key
  it does not use; the pickers read the frame's keys themselves while
  their calendar is open. A field telling `key` for Up, Down, Page Up,
  Page Down and Escape would do.
- **`gui.opens` on a field**, and a **read of which control has the
  focus**: the pickers open on a press read from the frame's presses.
- **Shift with a drawn control's keys** (`Drawn.keys` holds names alone),
  and the **wheel's turns in `Drawn`**.
- **Focus for a drawn control without a keyboard:** `gui.focus` writes
  the control's words, which brings up a headset's keyboard.
- **A field only read.**

## The survey's rows for the calendar and the pickers

The catalog's rows (docs/components/README.md), by its names:

| Row | Status |
|---|---|
| Calendar view (header, day names, week numbers, multi-month) | built and tested: a title and two arrows (dimmed past the bounds), the weekdays' names by locale, the first weekday by locale, ISO week numbers, months side by side moving together, six weeks where asked (`calendar.month_view`); not built: headers, day names, days and tiles drawn by the program, and month and year dropdowns in the header |
| Scheduler calendar (month, week, day views) | built and tested: month, week and day views, overlapping entries side by side, whole days in lanes, `+N more`, an entry pressed told, a press in the hours told as a moment (`calendar.scheduler`); not built: dragging to create, move or stretch an entry, the form and detail popups (a program opens a gui layer on `open`), the line for now, and zones side by side |
| Date constraints and highlighting (min, max, exclude, include, filter, holidays) | built and tested: bounds, days and spans left out, days and spans only allowed, a filter, days in four tones, holidays and their names (a dot on the day, the name over it under the pointer), keys stepping past what is left out (`calendar.rules` and its modifiers); not built: a message shown over a day left out |
| Date format, parsing and raw input | built and tested: date-fns's patterns written and read (4,080 and 1,248 cases), strict parsing (`pickers.strict`); the raw words are the field's `edit` event; not built: reading words by several patterns in turn, and the browser's own reading of a date react-datepicker falls back to |
| Date picker (single date, input and popup) | built and tested: a press opens, a day pressed is chosen and closes, the arrows turn the months, the keys move and Enter chooses, Escape closes, kept open after a choice, six weeks, a layer placed by gui's rules; not built: opening on the field's focus alone, closing on a page's scroll, a wrapper around the calendar, a month to open on and the chosen month shown last, keys turned off, callbacks on opening and closing (a program compares `is_open`) |
| Date picker input customisation (custom input, icon, clearable, read-only, today button) | built and tested: a program's own control (`custom`), an icon opening and closing, a cross clearing, read only, off, a Today button; built, untested: a hint (gui's field's own); not built: only the icon opening, content under the calendar, and a calendar anchored to another control |
| Date range picker | built and tested: first press its first day, a later one its last (closing), an earlier one beginning it again or swapped (`swapping`), the days to the pointer shaded, two months; built, untested: cleared by its cross, and two date pickers bounding each other by their rules (`selectsStart`, `selectsEnd`), each shading only its own day; not built: letting a range hold days left out (`selectsDisabledDaysInRange`) |
| Inline calendar (always visible) | built and tested: `inline`, and off with `turned_off` (pressed, it chooses nothing) |
| Locale and time zone | built and tested: en-US, en-GB, fr, de and es (first weekday, week rule, names of months, days, quarters and the day's halves), IANA zones, offsets and UTC, days of 23 and 25 hours; built, untested: a `calendar.Locale` record of the program's own; not built: other locales' tables, a localised caption over the list of times, and a zone's abbreviation (`zzz`) |
| Month picker | built and tested: twelve tiles, a tile pressed choosing the month's first day, the arrows turning the year, the keys, months left out, only allowed or past the bounds; not built: full names on the tiles, two or four columns, and several months chosen |
| Month range picker | built and tested: `month_range_picker`, its first and last months pressed on their tiles; built, untested: two month pickers bounding each other by their rules |
| Multiple-date selection | built and tested: `dates_picker`, a press adding or taking away a day, kept open, written `a, b` or `a (+n)` |
| Quarter picker and quarter range | built and tested: four tiles written `yyyy, QQQ`, `quarter_picker` and `quarter_range_picker` |
| Time constraints (exclude, include, filter, inject, range) | built and tested: `times_excluding`, `times_including`, `times_filtered`, `times_adding`, `times_bounded`, `timed` |
| Time picker (list and input) | built and tested: a list scrolled to the time chosen and by the wheel (a headset's thumbstick turns the same wheel), pressed or keyed through, written by the picker's pattern (`HH:mm` for 24 hours), a time typed and stepped by Up and Down, a day chosen keeping its time (`date_time_picker`); built, untested: the caption's words (`p.caption`, `''` for none); not built: a time control of the program's own in the calendar, separators filled in as a time is typed, and hour and minute selectors |
| Week picker | built and tested: a press choosing its week, written `I/R`, the week's first day by locale, a week left out where none of its days may be chosen |
| Year picker and year range | built and tested: pages of twelve years turned by the arrows, `year_picker` and `year_range_picker`; not built: another number of years to a page |

A screen reader's names for days (react-datepicker's aria labels) need the
host's accessibility tree, as gui.md says for its own rows.
