# Forms, validation and editors

`lory.forms` gives you the controls a form is made of, beyond gui's own
buttons, fields and checkboxes, and the rules a form is checked by.
`lory.editors` adds a Markdown editor with a live preview and an image
editor. Each control is built from `lory.gui` and placed in a tree like
gui's own controls; your program keeps the values, and Lory keeps the
rest (focus, words being typed, a slider being dragged).

Every control works by keyboard, pointer and touch. Tab moves between
controls, and the arrows move within a group or a slider, with Home and
End going to the ends. Enter and space press, toggle or choose, and
Escape closes a combobox's list. A form is checked when its submit button
is pressed or Enter is typed in a field. The first field that fails gets
the focus, and each field's first failed rule is shown under it. After
that, a field in error is checked again as it is typed in.

## Components

| Component | What it does |
|---|---|
| Toggle button and toggle group | Buttons that stay pressed, alone or side by side |
| Segmented control | Choices on one track, one always chosen |
| Switch | On or off, with a loading state and an option to send the form on Enter |
| Rating | Stars, with half stars and a press to clear |
| Radio and checkbox cards | Cards to choose one of, or to tick |
| Range slider | A low and a high value set by two thumbs, kept a gap apart |
| Number stepper | A number typed or stepped by buttons and the arrows, kept within bounds |
| Password field | Dots until its button reveals the words |
| One-time code | A code typed one character to a box, pasted whole, or edited with Backspace and Delete |
| Combobox | A field that filters a list as you type and chooses by Enter or a press, and can also take free words |
| Masked field | Words kept to a mask such as `(###) ###-####` |
| Form rules | Rules such as `empty`, `email`, `url`, `integer[1..10]`, `minLength[8]`, `match[field]` and `regExp[/…/]`, with a message for each failure |
| Labelled field and fieldset | A label over a field, a note and an error under it, and a group that can be disabled together |
| Linked fields | Two fields kept in step by a conversion, such as a temperature converter |
| Colour picker | Hue, saturation and value, an opacity, swatches and a hex field |
| File drop zone | A zone that lists files dropped on it, with their sizes |
| Small controls | A character count, a copy button and a badge that steps through states |
| Markdown editor | Markdown typed beside a live preview, plus a viewer on its own |
| Image editor | Crop, turn, flip and zoom a picture, draw on it with a pen, lines, boxes, rings and words, and undo or redo each step |

## Using it

```crow
use sys
use memory
use lory
use lory.gui
use lory.forms

struct App [form, stars]

fn wants[]
    [forms.want['name', 'Your name', ['empty']], forms.want['email', 'Your email', ['empty', 'email']], forms.want['agree', 'The terms', ['checked'], says = ['Please agree to the terms']]]

fn page_of[a]
    f = a.form
    who = f.fields['name']
    mail = f.fields['email']
    name = forms.labelled['name', 'Name', gui.field['name', who], fault = forms.error_of[f, 'name']]
    email = forms.labelled['email', 'Email', gui.field['email', mail, hint = 'ada@example.com'], fault = forms.error_of[f, 'email']]
    agree = forms.switch['agree', 'I agree to the terms', f.fields['agree'] eq 'on']
    stars = forms.rating['stars', a.stars, half = true]
    gui.panel[[gui.heading['Sign up'], name, email, agree, stars, gui.button['submit', 'Send']], gap = 14.0]

fn answered[a, shown]
    for e in shown.events
        if e.id eq 'stars' and e.act eq 'change'
            a.stars = e.num
    a.form = forms.form_after[a.form, wants[], shown]
    a

fn draw[frame]
    a = recall['app', App[forms.form_of[map['name' = '', 'email' = '', 'agree' = '']], 0.0]]
    c = lory.begin[frame]
    shown = gui.show[c, page_of[a]]
    a = answered[a, shown]
    remember['app', a]
    lory.end[shown.canvas]

sys.frames[draw]
```

`a.form.sent` is true on the frame the form passes its rules. For a
Markdown editor, keep `editors.notes_of[text]` in your record, draw
`editors.markdown_editor['about', notes]` and bring it up to date with
`editors.markdown_after['about', notes, shown]`.

## In a headset

Controls are pressed by a controller's ray as by a mouse, and a field
given the focus brings up Lory's drawn keyboard. In the image editor, the
ray draws with the pen as a pointer does.

## Try it

[Open the forms example](../../examples/forms/)

## Not included yet

- Editing styled text in place (the Markdown editor edits plain words beside its preview)
- A formatting toolbar, and a preview that scrolls in step with the field
- Filters on a picture's pixels, such as grayscale or blur
- HTML, images, autolinks and link reference definitions in Markdown
- A combobox with several choices at once, or with categories
- A vertical range slider, and labels on its thumbs
