# Lory Studio

A bench for what Lory draws in a headset: the page a Crow web build runs in,
held in a made-up headset on a desk, walked by a script, measured, and held
against what a real headset did.

A headset is a slow place to find a fault. It has to be worn, nothing it
shows can be pointed at from outside, and what went wrong a moment ago is
gone. The Studio moves that work to the desk: the page's own program and
Crow's own loader run unchanged, and find a headset where a browser has
none. What only the real one can say (how fast it draws, what the wearer
did) is taken from it over its cable and brought back.

It is not an editor, and nothing here is part of a program that uses Lory:
the Studio is a page, three scripts and one Python file.

## Three ways in

**A site that serves it.** Myna, and any app on Myna, serve the Studio at
`/studio/` beside their own pages (a link in their `web/` folder to
`studio/web` here). Open it with the page to try:

    http://localhost:3800/studio/?at=/room/index.html?at=/reports

**A build's folder.** For a program built with `crow build --target web`:

    python3 studio/studio.py serve examples/scene/main_web
    # → http://localhost:3990/studio/?at=/index.html

**No window at all.** A walk (below) in a headless browser, its pictures
held to the ones kept:

    python3 studio/studio.py walk studio/walks/scene.json

Nothing is installed or downloaded: the browser is this machine's Chrome
(`LORY_CHROME` names another), and the rest is Python's own library.

## The page

`Open` loads a page of the same site into the frame. `Enter VR` has the
page's program enter its headset as it would a Quest's: the view becomes an
eye's picture of the headset's frame (a Quest 3's, 3360 by 1760, two eyes
64 mm apart), and from then on:

| what is done | what it is in the headset |
|---|---|
| the pointer moves | the right hand's ray passes through that point of the eye's picture (with Shift, the left hand's) |
| a click | that hand's trigger, pulled and let go |
| a right-drag (or Ctrl-drag) | the head turns and nods, the room dragged as if held |
| W A S D, Q E | the head walks; lowers and rises |
| the arrow keys, the wheel | the right thumbstick |
| G, 1, 2 | the grip, the A and the B button |
| an Alt-drag | an angle measured between two points of the picture |
| R, Space, Esc | the head and hands put back; the frames stopped or let run; the measure put away |

Add `&enter` to the address to go straight in. The eye shown is the left,
the right, or both side by side.

What is told beside the picture:

- **Where the head and each hand are**, what is pressed, and how many
  pulses the program has sent to a hand (a press that is not felt sends
  none).
- **What a frame costs**: the program's own work a frame, in milliseconds,
  as its median, the time 95 in 100 are under, and the worst. This is the
  desk's time; a headset's processor is several times slower, so its own
  time is taken from it (below). `count calls` adds a frame's draws, the
  buffers it fills and their bytes, the pictures it sends.
- **The centre of the view**: the 41° a guideline keeps content within,
  drawn about where the head faces, and the height a panel's middle
  belongs at, 5° under eye level. The `10° grid` draws the room's own
  directions.
- **Sizes**: where the page names what it shows (see *What a page gives*),
  every thing that is pressed is outlined — red under what a guideline
  asks of it, amber at it, green where it is easy — and words whose letters
  are too small are underlined. A size is counted as the guidelines count
  it, in dp on the panel a thing lies on: Android XR's 0.868 dp to a dmm,
  a dmm a millimetre seen from a metre, the metres those from the reader
  to the panel's own plane — so a thing at the edge of a flat window
  measures what it does at its middle. A target is asked to be 48 dp
  (56 to be easy), letters 14 dp (18 to read at ease). The angle a thing
  takes of the view is told beside it, and a thing whose panel is seen
  more than 53° off its face is counted small whatever its size.

## Walks

A walk is a list of steps taken in the made-up headset, as JSON. The
Studio's page runs one pasted into it; `studio.py walk` runs the same from a
shell, in a browser with no window, and a walk draws what it drew the last
time: the headset's clock is the walk's own, a frame a step.

    {"name": "the scene example, in a headset",
     "build": "../../examples/scene/main_web", "at": "/index.html",
     "steps": [
      {"do": "enter"},
      {"do": "wait", "frames": 20},
      {"do": "shot", "name": "standing"},
      {"do": "aim", "at": [0, 1, -2]},
      {"do": "shot", "name": "the ball pointed at"},
      {"do": "stick", "hand": "left", "y": -1, "frames": 36},
      {"do": "cost", "frames": 120}
     ]}

A walk says where its page is: `"build"`, a web build's folder beside the
walk (it is served for the walk's length), or `"at"`, the whole address of
a page some site is serving (`--at` names another).

| step | what it does |
|---|---|
| `enter`, `leave` | into the headset, and out |
| `wait` | frames drawn: `"frames"` of them, or `"ms"` of the headset's time |
| `until` | frames until `"js"` is so (`"most"` milliseconds, then it has failed) |
| `head` | the head put at `x y z`, turned `turn`, nodded `nod` (any of them) |
| `look` | the head turned to face a thing the page names (`"on"`) or a point (`"at"`) |
| `hand`, `aim` | a hand put, or its ray aimed: `"through": [u, v]` a point of an eye's picture, `"at": [x, y, z]` a point of the room, `"on": "name"` a thing the page names |
| `press` | aim, the trigger down, a few frames, up |
| `down`, `up`, `drag` | a press in parts; a press carried from one place `"to"` another |
| `squeeze`, `stick`, `button` | the grip; a thumbstick held `"frames"`; A or B |
| `check` | `"js"` must be so (`"says"` what that means) |
| `shot` | an eye's picture, held to the one kept under its `"name"` |
| `cost` | what a frame costs over `"frames"`; `"under"` a number of milliseconds to hold it to |
| `count` | a frame's WebGL calls; `"draws"` to hold them to |
| `targets` | what the page names, measured in dp: it fails where any is under what a guideline asks (`"note": true` tells it and goes on; `"kind"` `target` or `text` measures the one) |
| `replay` | a recording played through (`"recordings": {"name": "file.json"}` in the walk) |
| `js`, `say` | JavaScript run in the page; words in the report |

In `js`, `sim` is the headset, `crow` the page's program, `page` its
window. A hand is the right one unless the step says `"hand": "left"`.

**Pictures.** The first time a walk is taken its pictures are kept beside
it (`scene.shots/standing.png`). After that each is held to the one kept:
more than half a percent of its dots differing fails the step, and the new
picture and a picture of where they differ are written to `scene.out/`.
`--update` keeps the new ones instead. Kept pictures are a machine's own —
another graphics card rounds an edge another way — so a walk first taken
elsewhere is taken there with `--update`.

`./test.sh` takes `walks/scene.json` after it builds the examples, where
there is a Chrome.

## Recordings

What a headset did, frame by frame: where the head and each controller
were, what was pressed, what each frame cost. `Keep what I do` keeps one of
the made-up headset; `Save` and `Load` are a JSON file; `Play` has the
headset do it again, frame for frame, and a walk's `replay` step does the
same from a shell.

A recording taken from a real headset is played the same way — with its
own eyes (each eye's projection and place, as that headset gave them), so
the desk shows what was shown there. The page is the desk's own copy,
though: it is in the state the recording found it in only if it is brought
there first.

## The real headset

A Quest on its cable, with Developer Mode on and `adb` installed (the
Studio installs nothing; where there is no `adb` it says so):

    python3 studio/studio.py device state          # what it is, what its browser shows
    python3 studio/studio.py device open URL       # a page opened there (this Mac's port reached)
    python3 studio/studio.py device record         # the page's doings in VR kept from now on
    python3 studio/studio.py device take FILE      # the recording, and how its frames went
    python3 studio/studio.py device cost           # frames a second, a frame's cost, the waits between
    python3 studio/studio.py device profile        # where its frames' time goes (worn, in VR)
    python3 studio/studio.py device shot FILE      # a picture of its display, both eyes
    python3 studio/studio.py device eval JS        # JavaScript run in its page
    python3 studio/studio.py device awake | rest   # its display kept lit off the face, and given back

`record`, `take`, `cost` and `profile` need the page in VR, which needs the
headset worn: a Quest enters no session on a desk. `awake` answers for the
wear sensor so the display stays lit while it is set down; `rest` gives the
sensor back, and is always given after.

With `python3 studio/studio.py serve` running, the Studio's page reaches
the headset too (*The real headset*, at its foot): `Open this page there`,
`Record`, `Take the recording`, `Mirror` (pictures of its display, about
one a second), and `Follow`, which moves the made-up headset as the real
one moves, a dozen times a second, so someone at the desk sees where the
wearer looks and points.

The helper listens on this machine alone, answers pages of this machine
alone (its own name asked for, a local page asking, a header no other
site's page may send), and only what is listed above.

## Where the time goes

    python3 studio/studio.py profile walk.json

takes the walk, then profiles six hundred frames where it ended (so the
walk ends in the headset) and says where the time went: by kind — memory
taken and given back, JSON written and read, Crow's runtime, the loader,
the program's own functions, the packages it uses — and by function, each
named as its source names it (`room::kite·wall·drawn`,
`room::lory·space·_uniform`). `device profile` asks the same of the real
headset's frames.

## What a page gives

- **`window.crow`**: the loader's answer (`Crow.start(…).then((page) =>
  { window.crow = page; })`), as the page a web build writes keeps it. The
  Studio enters VR through it and reads its canvas.
- **`window.lory_targets()`**, where sizes are to be measured: a list of
  `{name, kind, quad}`, `kind` `"target"` (a thing pressed) or `"text"`
  (words, the quad as tall as their letters), `quad` four corners in the
  room's metres — top left, top right, bottom right, bottom left. Lory's
  window gives every control and every run of words of the page it shows
  (`packages/window/web/room.js`), and so does Myna's room, which is
  one.

The room's axes are WebXR's: x to the right, y up, the reader facing −z;
a turn is to the right as it grows, a nod up.

## What it is not

The made-up headset draws what the program draws and nothing a headset
adds: no lens, no reprojection, no frame dropped for being late. It has
controllers and no bare hands, and a session asked for as passthrough is
shown on a grey ground, not on a room. Its time is the desk's. What a
thing looks like and whether it can be reached are found here; whether it
is comfortable, and whether it is fast enough, are found in the headset —
with `record`, `cost` and `profile` to say what happened there.

## Files

    studio/studio.py          the shell side: serve, walk, profile, device
    studio/web/index.html     the Studio's page (studio.css, studio.js)
    studio/web/headset.js     the made-up headset, and the recorder for a real one
    studio/web/walk.js        the walks, run by the page and by studio.py alike
    studio/walks/scene.json   the scene example walked (scene.shots/: its pictures)
