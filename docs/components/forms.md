# lory.forms and lory.editors: form controls, a form's rules, two editors

`lory.forms` (packages/lory/forms.co) holds the controls a form is made of
beyond gui's own, the rules a form is checked by, and the words shown under
a field that fails one. `lory.editors` (packages/lory/editors.co) holds a
Markdown editor whose preview Lory draws, that preview alone, and an image
editor.

Both are built of gui's vocabulary (`lory.gui`). A program places their
controls in its tree as it places gui's own, and reads what the reader did
from the frame's events, by id:

    use lory.gui
    use lory.forms

    fn view_of[s]
        gui.column[[forms.switch['wifi', 'Wi-Fi', s.wifi], forms.rating['stars', s.stars]]]

    for e in shown.events
        if e.id eq 'wifi'
            s.wifi = e.num gt 0.5

A control of one part tells its events as gui's controls do. A control of
several parts that holds what is being typed (a stepper, a code, a
combobox, a masked field, the editors) keeps it in a record the program
holds, as it holds a field's words. The control is drawn from the record,
and its `…_after` function brings the record up to date once a frame,
after `gui.show`:

    s.code = forms.otp_after['code', s.code, shown]

`examples/forms` puts most of them together in a sign-up form.

## The vocabulary

### Buttons that stay pressed, groups and switches

| Function | What it does |
|---|---|
| `toggle_button[id, words, on, wide = 0.0]` | A button that stays pressed. A press, or Enter or space with the focus, tells `toggle` (`num` 1 pressed, 0 let up). |
| `toggle_group[id, choices, pressed, multiple = false, along = 'row', loop = true]` | Buttons that stay pressed, in a row or a column, one stop of Tab, the arrows moving the focus among them. At most one is pressed (`choose`, with '' when it is let up), or any (`multiple`: `toggle` for each). |
| `pressed_after[pressed, e, multiple = false]` | The words pressed once a group's event is applied. |
| `segmented[id, choices, chosen, wide = 0.0]` | Choices on one track, one always chosen. Another pressed, or Enter or space on the one with the focus, tells `choose`. |
| `switch[id, words, on, size = 'medium', tone = 'accent', submits = false, busy = false]` | A switch with its words beside it. A press (on its words too) or space tells `toggle`. Enter toggles it, or, where it `submits`, tells `submit`. `busy` turns a loader on its thumb and takes no input. |

### Ratings, cards and a range

| Function | What it does |
|---|---|
| `rating[id, value, most = 5, half = false, clearable = true, readonly = false, size = 24.0]` | Stars, `value` of `most` lit. A press sets the rating (a star's left half sets a half, where `half`); the one set, pressed again, clears it. The pointer over them shows what a press would set, and the arrows move it. Each is a `change`. |
| `rating_at[px, most, size, half]` | The rating a press `px` CSS pixels into the stars sets. |
| `rating_pressed[was, at, clearable]`, `rating_keyed[was, key, most, half]` | The rating once a press, or an arrow, moved it. |
| `card[value, title, words = '']` | A card: what it stands for, its title and the words under it. |
| `radio_cards[id, cards, chosen, columns = 2, tall = 64.0]` | Cards of which one is chosen: one stop of Tab, a press or every arrow choosing (`choose`, with the card's value). |
| `card_after_key[at, key, n]` | The card a key moves the choice to. |
| `checkbox_cards[id, cards, ticked, columns = 2, tall = 64.0]` | Cards any of which are ticked, each a stop of Tab. A press or space tells `toggle` with the card's value. |
| `range_slider[id, low, high, lo, hi, step = 1.0, gap_steps = 0, wide = 240.0]` | Two thumbs on one track, each a stop of Tab. Each move tells `change` under the thumb's id (`words` `low` or `high`, `num` its value). |
| `range_after[low, high, e]` | The low and the high once an event of the range is applied. |
| `snapped[v, lo, hi, step]` | A value snapped to the nearest step from `lo`, to the step's decimals, and kept within the range. |
| `range_keyed[v, key, lo, hi, step, which]` | A thumb's value once a key moved it. |

### Fields that hold what is typed

| Function | What it does |
|---|---|
| `stepper_of[value, places = 0, empty = false]` | A stepper's record, holding `value` (or nothing). |
| `stepper[id, s, lo, hi, step = 1.0, hint = '', wide = 180.0]` | A field for a number with a button either side that steps it. `stepper_after[id, s, shown, lo, hi, step, places]` answers the reader. |
| `password[id, value, shown, hint = '', wide = 240.0]` | A field of dots and a button that shows its words. `password_after[id, value, shown, frame_shown]` says whether they show. |
| `code_of[words = '']`, `code_text[s]` | A one-time code's record, and its characters as words. |
| `otp[id, s, size = 6, masked = false]` | A box for each character of a code. `otp_after[id, s, shown, size = 6, kind = 'numeric', auto = false]` answers the reader. |
| `code_kept[words, kind = 'numeric']` | The characters a code keeps of what is typed or pasted: `numeric`, `alpha`, `alphanumeric` or `none` refused. |
| `code_typed[s, words, size, kind]`, `code_keyed[s, key, ctrl, size]` | The code once characters are typed, or a key pressed, at its box. |
| `combo_of[chosen = '']`, `combo_choices[s, choices, prefix = true]` | A combobox's record, and the choices its list shows. |
| `combobox[id, s, choices, hint = '', wide = 240.0, most = 8, prefix = true]` | A field and, while it is open, the list of the choices what is typed is found in. `combobox_after[id, s, choices, shown, prefix = true, free = false]` answers the reader; `free` takes what is typed as the choice where no entry is. |
| `masked_of[words, mask]`, `masked[id, s, mask, hint = '', wide = 240.0]` | A field kept to a mask as it is typed. `masked_after[id, s, mask, shown]` answers the reader. |

### Masks, filters, numbers and sizes

These answer from their arguments alone.

| Function | What it does |
|---|---|
| `mask_named[name]` | The mask of that name: `credit-card`, `date`, `date-time`, `iso-date`, `phone`, `social` or `time`. |
| `mask_text[words, mask]`, `unmask_text[words, mask]` | The words as the mask writes them, and without the mask's own characters. A mask's tokens are `#` a digit, `A` and `a` a letter made upper or lower case, `N` and `n` a letter or digit, `X` anything but a letter or digit, and `\` makes the next character the mask's own. |
| `mask_valid[words, mask]`, `mask_complete[words, mask]` | Whether the mask loses nothing of the words, and whether they fill every token. |
| `match_ranges[words, query]` | Where the query is found in the words, case aside. |
| `filtered[choices, query, prefix = false]`, `matching[choices, query, prefix = true]` | The places, or the choices, the query is found in. `prefix` orders them: a whole match first, then a match at the start, at a word's start, then anywhere. |
| `number_text[x, places = -1]` | A number written with `places` decimals, rounded as `Intl.NumberFormat` rounds. |
| `number_kept[words, places = -1]` | The characters of a number in the words. |
| `number_typed[data, value, start, end, places = -1]` | What typing `data` over a selection does to a number's words: taken as typed, refused, or changed (with the caret's new place). |
| `file_size[bytes, base = 1000]` | Bytes as words (`base` 1024: kibibytes and the rest). |
| `fixed_text[x, places]`, `js_number[words]`, `js_text[x]` | JavaScript's `toFixed`, `Number` and `String`, for the temperature converter. |

### A form and its rules

| Function | What it does |
|---|---|
| `want[field, label, rules, says = [], optional = false]` | A field and its rules in order, with what each says where it fails ('' or none: `rule_says`). An `optional` field left empty passes. |
| `passes[rule, value, fields]` | Whether a value passes a rule, written as Semantic UI writes it (`minLength[8]`, `integer[1..10]`, `match[password]`). |
| `rule_says[rule, label]`, `rule_name[rule]`, `rule_value[rule]` | What a failed rule says of a field, and a rule's name and value. |
| `failures_of[w, fields]`, `errors_of[wants, fields]` | Every failure of a field, in its rules' order, and the first of each field. |
| `form_of[fields]` | A form's record: each field's value by id, the error under each, and what happened this frame (`sent`, `failed`). |
| `form_after[f, wants, shown, on = 'submit', submit = 'submit', focus_first = true]` | The form once the frame is answered: fields set from their events, checked when it is sent and as `on` says. |
| `error_of[f, field]` | The words shown under a field: its error, or ''. |
| `labelled[field_id, label, control, note = '', fault = '', passive = false]` | A field under its label, with a note and its error under it. A press on the label gives the field the focus, unless `passive`. |
| `fieldset[legend, kids, disabled = false]` | Controls under a legend; `disabled` sets every one of them aside. |

The rules are `empty`, `checked`, `email`, `url`, `integer` (with a span),
`decimal`, `number`, `regExp[/pattern/flags]`, `is`, `isExactly`, `not`,
`notExactly`, `contains`, `containsExactly`, `doesntContain`,
`doesntContainExactly`, `minLength` (and `length`), `exactLength`,
`maxLength`, `match`, `different`, `minCount`, `exactCount` and
`maxCount`. A value is checked with the white space round it left out, and
a rule Lory does not know fails.

### Linked fields and bound words

| Function | What it does |
|---|---|
| `temperature_of[]`, `temperature[id, t]`, `temperature_after[id, t, shown]` | A field of degrees Celsius and one of Fahrenheit: typing in either writes the other. |
| `fahrenheit_of[celsius]`, `celsius_of[fahrenheit]` | The other field's words, as JavaScript computes and writes them. |
| `reversed[words]` | The words' characters the other way round. |
| `ticked_after[ticked, value, on]` | The values ticked, in the order they were ticked. |

### Small controls

| Function | What it does |
|---|---|
| `char_count[words, most]`, `count_tone[words, most]` | How many characters of `most` are written: muted, then the warning's colour from nine tenths, the danger's past `most`. |
| `copy_button[id, words, copied_at = -1.0]` | A button that hands `words` to the page's clipboard and tells `copy` (`num` the frame's time); a tick shows for a second and a half from `copied_at`. |
| `badge[id, words, state]`, `badge_next[state]` | A badge of a state, `idle`, `busy`, `done` or `failed`, that tells `press`; and the state it goes to next. |

### A colour picker

| Function | What it does |
|---|---|
| `picker_of[code]`, `picker_color[p]`, `picker_hex[p]` | A picker's record from a hex code (`colors.parse`), its colour, and its code. |
| `color_picker[id, p, opacity = true, swatches = [], wide = 240.0]` | A square of saturation and value, a bar of hues, one of opacity, the colour beside its code in a field, and swatches. `color_after[id, p, shown]` answers the reader. |

### Files

| Function | What it does |
|---|---|
| `file_drop[id, files, hint, wide = 0.0, tall = 110.0, base = 1000]` | A zone to drop files on or press, the files under it (each `Picked[name, bytes]`) with a button to take one away, and their count and size. A press tells `press`. |
| `files_after[id, files, shown]` | The files once a button took one away. |

### The Markdown editor (`lory.editors`)

| Function | What it does |
|---|---|
| `markdown_blocks[text]` | The text's blocks as CommonMark reads them, the document first, each paragraph's and heading's words read into inline pieces. |
| `inlines_of[words]` | A paragraph's words read into pieces: text, code, breaks, links, and the emphasis that opens and closes between them. |
| `tree_text[blocks]` | The blocks written as the reference writes CommonMark's tree: `(document (heading 1 (text "Notes")))`. |
| `notes_of[text]` | An editor's record: its words, their blocks, the steps to go back to and forward to, and the preview's scroll. |
| `markdown_editor[id, s, wide = 640.0, lines = 14]` | A field of lines and beside it their preview, drawn by Lory. `markdown_after[id, s, shown]` answers the reader. |
| `markdown_viewer[id, doc, scroll = 0.0, wide = 320.0, tall = 240.0]` | The preview alone, to be read; it tells `change` as it is scrolled. |

### The image editor (`lory.editors`)

| Function | What it does |
|---|---|
| `picture_of[image, wide, tall]` | A picture's record: an image `lory.load_image` numbered (-1: none, a grid stands in), shown whole, the pen in hand. |
| `image_editor[id, p, wide = 640.0, tall = 400.0]` | The tools, the steps, and the picture to drag on. `picture_after[id, p, shown]` answers the reader. |
| `picture_back[p]`, `picture_on[p]` | The picture a step back, and a step forward again. |
| `view_of[p, x, y, w, h]`, `on_screen[v, u, w]`, `on_picture[v, x, y]` | Where the picture stands in a box, and its points on the screen and back. |

The tools are a pen, a line, a box, a ring, words, a crop and a move. The
steps turn the picture a quarter left or right, mirror it across or
upright, zoom out and in, show it whole, and go back or forward. The pen's
colour and width and the words a mark writes are the record's `color`,
`width` and `words`, which the program sets from controls of its own (a
colour picker, a slider, a field).

## How these controls are answered

- **A record for each control.** gui keeps the focus, and the words and
  caret of each field, by id. A control of several parts keeps the rest in
  its own record: the box with the focus, the list open, the steps to go
  back to. It reads the frame's raw events (`lory.events`) where gui does
  not tell what it needs.
- **A field's turn.** gui keeps a caret for every id it has given the
  focus, and `gui.focus` sets a field's words but not its caret. So a
  control that writes new words into its field (a stepper as it steps, a
  combobox as a choice is made) gives the field an id it has never had
  (`gen`, from a count kept for the whole program), and the caret stands at
  their end.
- **What painters see.** A painter sees only its `Drawn`. What a painter of
  these modules needs beyond it (a preview's blocks, a picture's marks) is
  kept in process memory by the control's id as the tree is built.
- **Motion.** What moves is eased by `lory.motion`. A switch's thumb slides
  and its track takes its colour over 150 milliseconds (`tween`, `outQuad`).
  A copy button's tick comes in over 200 milliseconds (`ease_at`). A
  badge's mark grows in over 200 milliseconds as the last one shrinks away
  over 120 (`presence`).
- **Icons.** The glyphs are `lory.icons`': the stars, the eye of a
  password, the tick, cross and loader of a badge, the copy button's, the
  stepper's minus and plus, the file zone's upload, and the image editor's
  tools and steps.
- **In a headset.** Every control is pressed by the ray as by a pointer,
  and a field with the focus is typed in on gui's drawn keyboard.

## Behaviours held

- **Toggle button and toggle group** (Radix's Toggle and Toggle Group).
  Space and Enter toggle. A group is one stop of Tab; the arrows along it
  move the focus, round past its ends where it loops; Home and End go to
  its first and last.
- **Segmented control** (Radix Themes, Vuetify's mandatory group). One
  choice is always chosen; pressing the chosen one again changes nothing.
- **Switch** (Headless UI, Radix, Vuetify). Space toggles; Enter toggles
  (Radix's) or sends the form (Headless UI's, `submits`); pressing its
  words toggles it; a busy switch (Vuetify's loading) takes no input.
- **Rating** (Semantic UI, Vuetify). A press sets the rating; the rating
  set, pressed again, clears it where it may be cleared; the pointer over
  the stars lights them up to it; half stars from a star's left half;
  `readonly` takes no input.
- **Radio and checkbox cards** (Radix Themes). Radio cards are one stop of
  Tab, and every arrow moves the choice, along the cards as they are
  written. Each checkbox card is its own stop, toggled by space.
- **Range slider** (Radix's Slider, Vuetify's range). A press on the track
  moves the nearer thumb there and drags it. The arrows move the thumb with
  the focus by a step, Page Up and Page Down by ten, Home and End to the
  ends. Values snap to the nearest step from the low end, to the step's
  decimals. A thumb stops `gap_steps` short of the other.
- **Number stepper** (Vuetify's number input). The buttons and the up and
  down arrows step it. A button held steps at once, then every 50
  milliseconds after half a second. A button that would not move the
  number is set aside. Typing keeps a number's characters and `places`
  decimals (Vuetify's `processPlainInput`). Leaving the field holds the
  number within its range, written with `places` decimals; coming back
  writes it with as few as it needs.
- **Password** (Radix's Password Toggle Field). A press on the button shows
  or hides the words and gives the field back the focus; Enter or space on
  the button keeps the focus there; sending the form hides them again.
- **One-time code** (Radix's One-Time Password Field, Vuetify's OTP
  input). Typing fills the box with the focus and moves on. Backspace
  clears and moves back; Delete clears and closes up those after; Control
  or Command with Backspace clears all. A paste fills every box from the
  first, whatever box has the focus. The arrows move between the boxes
  filled and the first empty one; Home and End go to the ends. Enter sends
  it; `auto` sends it as its last box is filled. What a `kind` refuses is
  passed over.
- **Combobox** (Headless UI's Combobox, Vuetify's autocomplete and
  combobox). Typing opens the list, the first entry ready for Enter. The
  down and up arrows open it and move along it, stopping at its ends; Home
  and Page Up go to its first, End and Page Down to its last. Enter or a
  press chooses; Escape closes it and puts back the words of the choice
  made; Tab chooses the entry the keys stand on; a press elsewhere closes
  it. The part found is marked in each entry, and `prefix` orders entries
  as Vuetify's `filtered-order="prefix"` does.
- **Masked field** (Vuetify's mask input). The mask's own characters are
  written in as the words are typed, a character a token refuses is
  passed over, and Backspace over a mask's character takes the one before
  it.
- **Form** (Semantic UI's form validation, Vuetify's form, Radix's Form,
  Headless UI's Field and Fieldset). Sent by its button or by Enter in a
  field, the form checks every field and shows each field's first failure
  under it, and the first field that fails takes the focus. With `on`
  `'submit'`, a field showing an error is checked again 200 milliseconds
  after typing in it stops (Semantic UI's delay), or as it is left. `on`
  `'blur'` checks a field as it is left, and `'input'` as it is typed in.
  A press on a label gives its field the focus, unless the label is
  `passive`. A fieldset that is `disabled` sets every control in it aside.
- **Temperature converter** (Vue's 7GUIs example). Typing in either field
  writes the other, unrounded, and words that are no number write `NaN`.
- **Bound words** (Vue's examples). `reversed` turns the words round;
  `ticked_after` keeps the boxes ticked in the order they were ticked.
- **Small controls** (Motion's examples). The count turns the warning's
  colour from nine tenths of its most and the danger's past it. The copy
  button hands its words to the page (`lory.copy`) and shows a tick. The
  badge goes round idle, busy, done.
- **Colour picker** (Vuetify's, react-colorful's). The square and the bars
  are dragged, or moved by the arrows while they have the focus (a
  hundredth, or a degree of hue). A gray keeps the hue it was picked at, so
  the square keeps its colour as it is dragged through white or black. A
  hex code typed is taken once it is one, and moving the square or a bar
  writes the new code.
- **File zone** (Vuetify's file input and file upload). The files are
  listed with their sizes, each with a button that takes it away, and the
  count and total size are written under them.
- **Markdown editor** (TOAST UI's Editor). Typing reads the words again a
  tenth of a second after it stops. Control or Command with Z goes back a
  step, and with Shift, or Y, forward again; a step back is kept where
  typing paused for a second or more. The preview is scrolled by the wheel
  (a headset's thumbstick too), or by the arrows, Page Up, Page Down and
  Home while it has the focus, no further than its end. It draws headings,
  paragraphs, strong words and emphasis, code spans on a ground of their
  own, links in the accent and underlined, lists, block quotes, code
  blocks and breaks.
- **Image editor** (TOAST UI's Image Editor). Dragging with a tool draws
  its mark: a pen's path, a line, a box or a ring from corner to corner,
  or words at a point. The crop keeps the part dragged over. The move tool
  moves the view, and the wheel over the picture zooms it. Each change is a
  step to go back from: its buttons, or Control or Command with Z, with
  Shift or Y forward. The marks are kept in the picture's own pixels, so
  they turn, mirror and crop with it.

## Parity

### Numbers from the libraries

`tests/forms/reference.mjs` runs the libraries these controls follow, on
fixed inputs, and writes what they answer to `tests/forms/reference.json`.
`tests/forms/reference.co` reads that file and holds Lory to every case
(`crow test tests/forms/reference.co`, from Lory's root).

| What | Library | Cases | Lory |
|---|---|---|---|
| A mask's writing and reading: mask, unmask, isValid, isComplete | vuetify 4.3.3 (`useMask`) | 324: 12 masks, 27 words each | all the same |
| An autocomplete's filter: the items found, their prefix order, and each match's ranges | vuetify 4.3.3 (`filterItems`, and `useFilter` with `filteredOrder: 'prefix'`) | 12 queries over 16 items | all the same |
| A number written to a precision | vuetify 4.3.3 (`formatNumber`, en-US, no grouping) | 120 | all the same |
| A number's characters kept | vuetify 4.3.3 (`extractNumber`) | 54 | all the same |
| Typing into a number's words | vuetify 4.3.3 (`processPlainInput`) | 51 | all the same |
| A file's size | vuetify 4.3.3 (`humanReadableFileSize`) | 30 | all the same |
| The temperature converter's other field | JavaScript (`Number`, `String`), as Vue's example computes it | 23 | all the same |
| A form's rules | semantic-ui-form 2.5.0, run with jquery 3.7.1 in jsdom 26.1.0 | 146 | all the same |
| A Markdown text's tree | commonmark 0.31.2 | 44 texts | all the same |

- **How the reference is run.** The libraries are installed, pinned, in a
  scratch folder, never in Lory's own:
  `npm install --prefix <scratch>/ref vuetify@4.3.3 vue@3.5.24
  semantic-ui-form@2.5.0 jquery@3.7.1 jsdom@26.1.0 commonmark@0.31.2`.
  Then `LORY_REF=<scratch>/ref node tests/forms/reference.mjs` writes the
  file.
- **The rules are checked through the form.** Each rule is checked by
  Semantic UI's own form behaviour (`is valid` on a field), in a page of
  jsdom, so a value is trimmed and a rule's bracketed value read as the
  form reads them.
- **The prefix order is Vuetify's own.** `useFilter` is run outside a
  component, on Vue's reactivity, with `filteredOrder: 'prefix'`.
- **Markdown.** The texts cover what the preview draws: both kinds of
  heading, paragraphs and breaks, emphasis by CommonMark's rules of
  delimiter runs, code spans and blocks, lists tight and loose and nested,
  block quotes with lazy lines, thematic breaks, escapes and inline links.
  Lory's tree is written as `tree_text` writes it, and commonmark's tree is
  written the same way by the script.
- **What Lory answers.** Every case is the same: 7 blocks, 15 truths.

### Both of Crow's modes

The blocks pass under `crow test` and `crow test --compiled`. Plain blocks
run in the interpreter even then, so a program is also run both ways.

- `tests/modes/forms.co` writes what the modules compute on fixed inputs:
  masks, filters, numbers, sizes, temperatures, rules and their words,
  ratings, cards, steps, a code's typing, a combobox, a colour picker,
  Markdown trees, points of a turned picture, and a sign-up form's boxes
  and events when it is sent. It writes 393 lines.
- `tests/modes.sh crow tests/modes/forms.co` runs it with `crow run -i`
  and compiled with `crow run`, and every line is the same.

### The browser

- `examples/forms` builds for the web (`crow build --target web main.co`).
- Its build was driven once in headless Chrome by a script over Chrome's
  debugging socket. The form sent empty showed its six errors, with the
  name field given the focus. A name typed there lost its error a moment
  later. "ind" typed in the country listed India and Indonesia with the
  part found marked, and Enter chose India. A press on the third star lit
  three. Words typed in the Markdown field showed in the preview with their
  emphasis. The page threw nothing and logged no error.
- No browser check is kept under `tests/`: the example's blocks drive the
  same steps from frames.

### In a headset

- In forms.co, a block presses a star by a controller's ray, gives a
  code's box the focus by the ray, and types a digit on gui's drawn
  keyboard.
- In editors.co, a block drags a pen's mark across a picture by the ray,
  and types in the Markdown field on the drawn keyboard.

## Where Lory differs, and why

- **Markdown not read.** HTML blocks and inline HTML are not read: Lory
  draws no HTML. Link reference definitions and reference links, entities
  and numeric character references, autolinks, images, and the
  percent-encoding of a link's destination are not read yet. A tab is read
  as spaces to the next multiple of four.
- **No WYSIWYG editing.** TOAST UI's WYSIWYG mode edits styled text in
  place, through the browser's editing engine (`contenteditable`). Lory
  draws its text itself and gui's field holds plain words, so editing in
  place would need a caret and a selection over drawn, styled runs and a
  document model with commands, which is an editor of its own. The
  Markdown field and its preview are the part that can be held to a
  reference.
- **No toolbar and no scroll kept in step.** A toolbar that makes the words
  under the caret bold needs the field's caret and selection, and a
  preview that scrolls with the field needs the field's scroll. gui does
  not tell either.
- **No pixel filters on a picture.** Grayscale, blur, sharpen and the rest
  of TOAST UI's filters change an image's pixels. Lory hands an image to
  the GPU as a texture and has no way to read or write its pixels, so
  filters, resizing and a mask are not built. Loading a picture and saving
  one are the page's: Lory draws an image `lory.load_image` loaded.
- **Words on a turned picture stay upright.** A words mark is placed where
  the turn puts its point, and its words are not turned with the picture.
- **Files are listed, not chosen.** The file zone tells `press`. Opening
  the browser's file chooser and handing over dropped files is the page's
  work, and Lory's page does neither yet.
- **Not built.** Semantic UI's `creditCard` rule; grouping in a number's
  words; a code's boxes in a column, and a code kind given by a pattern;
  a combobox's button, many choices at once (chips) and categories; the
  colour picker's fields for red, green and blue, or hue, saturation and
  lightness (it has the hex field); the range slider standing upright,
  with ticks or labels on its thumbs, and Shift with an arrow for a larger
  step (gui does not tell a drawn control the keys held); the count's
  spring.
- **Motion's dots-morph button** belongs to `lory.motion`, not here.

## What waits on gui, Lory's drawing and the page

- **gui.** A drawn control or a sized field could record its own width as
  its box, not its column's (these controls wrap each in a row so a press
  past them misses). `gui.focus` could take a caret, or put it at the end
  of the words it sets, so no control needs a field's turn. A program could
  read which id has the focus. A field could tell the keys it does not use,
  and a drawn control the keys held and the words typed. Roving could go in
  two directions, take Page Up and Page Down, and land on the pressed item
  when Tab comes in. A press on a label could give its control the focus.
  A field could tell its caret, selection and scroll.
- **Lory's drawing.** Reading and writing an image's pixels, for filters;
  and drawing part of an image, or an image turned, from its corners.
- **The page.** A file chooser opened by the program, and drops (with
  their names, sizes and bytes) handed to it as input.

## The example

`examples/forms` is a sign-up form, drawn by Lory in gui's dark look.

- **The form.** A name, an email address, a password with its reveal, a
  country found in a combobox, a code of six digits and a switch to agree
  to the terms. Each is checked by its rules when the form is sent, and
  each error shows under its field.
- **Beside it.** A price range of two thumbs, a rating of half stars, and
  a few words about the reader in Markdown, with its preview and a count
  of its characters.
- **Its blocks.** They send the form empty and filled, find a country by
  typing, rate, and type in the Markdown field.

## The survey's rows

These are the rows of [README.md](README.md) whose home is `lory.forms`,
and the two rows of `lory.gui` whose rest is here.

| Row | Status |
|---|---|
| Button group / toggle group / segmented control | Built and tested: `toggle_group` (one or many, a row or a column, looping), `segmented` (one always chosen). |
| Color picker | Built and tested: a square of saturation and value, bars of hue and opacity, the hex field, swatches (TOAST UI's preset palette). Not built: fields for each channel. |
| Combobox and autocomplete | Built and tested: Headless UI's keys, Vuetify's filter and prefix order (held to vuetify 4.3.3), `free` words (Vuetify's combobox), the part found marked. A list of choices fetched by the program is its own to pass. Not built: the button, chips, categories, fuzzy search. |
| File input and file drop | Built and tested as a zone only: the files listed with their sizes (held to vuetify 4.3.3 in 30 cases), each taken away by its button, their count and total. The chooser, the drop and the scrim on drag over need the page. |
| Form and validation | Built and tested: Semantic UI's rules (held to semantic-ui-form 2.5.0 in 146 cases) with their words, checking on submit, on leaving and on typing, the first failure shown, the first failing field given the focus, labels and notes (Headless UI's Field, `passive`), a fieldset set aside. Not built: Semantic UI's API behaviour (requests are the program's), `creditCard`, Vuetify's confirm edit, the 7GUIs flight booker. |
| Image editor (crop, filters, draw) | Built and tested: crop, quarter turns, mirrors, a pen, lines, boxes, rings, words, undo and redo, show whole, zoom and move. Not built: filters, resize, icons and a mask (they need an image's pixels); loading and saving are the page's. |
| Linked fields and unit conversion | Built and tested: the temperature converter, held to JavaScript's numbers in 23 cases. |
| Masked input | Built and tested: every token and named mask, held to vuetify 4.3.3 in 324 cases. |
| Number stepper | Built and tested: bounds, step, precision when typing and pasting, a held button repeating. Not built: grouping. |
| One-time password input | Built and tested: Radix's typing, paste, Backspace, Delete and clearing; Enter and `auto` send; masked; numeric, alpha and alphanumeric. Not built: upright boxes, a pattern. The browser's autofill is the page's. |
| Password field with reveal toggle | Built and tested: the reveal by pointer gives the focus back, by key keeps it, sending hides the words. |
| Rating | Built and tested: press, clear, the pointer's preview, half stars, arrows, readonly, any number of stars. |
| Rich text and Markdown editor | Built and tested: a Markdown field with a live preview drawn by Lory (held to commonmark 0.31.2 in 44 texts), steps back and forward, a read-only viewer (`markdown_viewer`), the look's dark and light. Not built: WYSIWYG, the toolbar, scroll in step, plugins, a table's menu, pasting styled text. |
| Selectable cards (checkbox cards, radio cards) | Built and tested: `radio_cards` and `checkbox_cards`. |
| Small interactive controls (character counter, copy button, multi-state badge, dots-morph button) | Built and tested: the counter, the copy button (its tick eased by `lory.motion`), the badge (its marks swapped by `lory.motion`'s presence). Not built: the counter's spring; the dots-morph button is `lory.motion`'s. |
| Switch (toggle) and variants | Built and tested: Space, Enter (toggling, or sending where it `submits`), its words pressed, three sizes, a tone, busy, the thumb sliding. |
| Text input binding and live echo | Built and tested: words reversed, boxes ticked kept in order. Binding a field to a value is the program's record, as gui's controls are. |
| Toggle button | Built and tested: `toggle_button`. |
| Slider (value and range) | The range is built and tested here: two thumbs, presses and drags on the track, the keys, snapping, the gap kept. Not built: upright, ticks, thumb labels. |
