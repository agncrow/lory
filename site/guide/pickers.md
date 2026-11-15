# Dates, times and calendars

Lory's date and time controls come in two modules. `lory.calendar` is the
arithmetic of days, dates written in a locale's words and read back from
words, the rules for which days may be chosen, a month's calendar drawn as
one control, and a scheduler. `lory.pickers` puts them in a field: a day, a
range, several days, a week, a month, a quarter, a year (and ranges of
them), a time, or a day and a time, each with its calendar or list in a
layer under the field, or inline without one.

Your program holds what is chosen, a list of moments; Lory holds the rest
under the picker's id (the month shown, the day the keys move from, the
words being typed, whether the calendar is open). A press on the field
opens the calendar, and words typed are read by the field's pattern as you
type. In the calendar the arrow keys move a day or a week, Page Up and Page
Down a month (with Shift a year), Home and End to the week's first and last
day, Enter and space choose and Escape closes; days that may not be chosen
are stepped past. A choice that ends (a day, a week, a range's last day)
closes the calendar and gives the focus back to the field. A list of times
scrolls by the wheel or a trackpad and is keyed through with the arrows.

## Components

| Component | What it does |
|---|---|
| Date field | A day typed or chosen from a calendar that opens under the field |
| Range field | A first and a last day, the days to the pointer shaded, over one or more months |
| Multiple dates | Days added and taken away by pressing, written `a, b` or `a (+n)` |
| Week, month, quarter and year fields | A period chosen from its tiles or its calendar, and ranges of months, quarters and years |
| Time field | A time from a list at a set step, or typed and stepped by Up and Down |
| Date and time field | A day from the calendar and its time from the list beside it |
| Inline calendar | Any of the above without its field, always shown |
| Month calendar | One or several months side by side, with weekday names, week numbers, tones and holidays |
| Scheduler | A month, week or day of entries, overlapping ones side by side and whole days in lanes |
| Date rules | Earliest and latest days, days and spans left out or only allowed, a filter, tones and holidays |
| Date formats | Moments written and read by patterns such as `MM/dd/yyyy`, `EEEE, MMMM do` and `h:mm aa`, in en-US, en-GB, fr, de and es, in any zone |

## Using it

```crow
use sys
use memory
use lory
use lory.gui
use lory.calendar
use lory.pickers

fn due_of[]
    p = pickers.with_icon[pickers.date_picker['due']]
    p = pickers.clearable[pickers.with_today[p, 'Today']]
    pickers.ruled[p, calendar.bounded[calendar.rules[], calendar.day[2026, 1, 1], calendar.day[2026, 12, 31]]]

struct App [due]

fn draw[frame]
    a = recall['app', App[[calendar.day[2026, 7, 14]]]]
    c = lory.begin[frame]
    tree = gui.column[[gui.label['Due'], pickers.control[due_of[], a.due]]]
    shown = gui.show[c, tree]
    a.due = pickers.answered[due_of[], a.due, shown]
    remember['app', a]
    lory.end[shown.canvas]

sys.frames[draw]
```

Days are moments at midnight in UTC (`calendar.day[2024, 3, 5]`), so they
compare and subtract as moments do. `calendar.add_months[calendar.day[2024,
1, 31], 1]` is 2024-02-29, and `calendar.format[t, 'yyyy-MM-dd',
calendar.locale['en-US']]` writes a day.

## In a headset

Calendars, lists and the scheduler are drawn on the page as on a screen and
pressed by a controller's ray as by a mouse; a thumbstick scrolls the list
of times. A field typed in brings up Lory's drawn keyboard, but choosing by
pressing needs no keyboard at all.

## Try it

[Open the pickers example](../../examples/pickers/)

## Not included yet

- Dragging to create, move or stretch a scheduler's entry
- Month and year dropdowns in a calendar's header
- Reading typed words by several patterns in turn
- Locales beyond en-US, en-GB, fr, de and es
