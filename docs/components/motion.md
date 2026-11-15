# lory.motion: easings, springs, clocks, timelines, staggers

`lory.motion` (packages/lory/motion.co, `use lory.motion`) holds the numbers
animation needs. It has easings, springs and inertia, an animation's clock,
timelines, staggers and presence. It also has the arithmetic that scroll and
drag effects need. What it computes is what anime.js 4.5.0, Motion 14.7.1 and
AOS 2.3.4 compute, and tests/motion/reference.co holds it to their numbers.
None of their source is included: their formulas were read from those
versions and written anew, in the same order, so the floats come out the
same.

motion draws nothing. A program uses its numbers to draw, or hands them to
gui's `moved`, `faded` and `scaled`. An animation held between frames is the
program's definition, handed in each frame. motion keeps only its clock, in
`use memory`, under `lory.motion/…` and the animation's id.

```
e = motion.ease['outElastic(1, .3)']                 --- anime.js's spelling
y = motion.eased[e, 0.25]
y = motion.ease_at['ease-in-out-back', 0.25]         --- AOS's, a CSS bézier
x = motion.tween[c, 'box', target, 600.0, 'outQuad']
y = motion.spring_to[c, 'ball', target, motion.spring[170.0, 26.0, 1.0]]
v = motion.run[c, 'intro', motion.keyframes[[0.0, 100.0, 40.0], 900.0]]
motion.control[c, 'intro', k, 'pause', 0.0]
```

## What is built

### Easings

An easing is an `Ease`, named by text and spelt the way its library spells
it. Each spelling keeps its own library's arithmetic.

| Function | What it answers |
|---|---|
| `ease[name]` | The easing a text names. A name nothing knows is linear, as in anime.js. |
| `ease_known[name]` | Whether a text names an easing. |
| `eased[easing, t]` | The easing's value at `t`, from 0 at the start to 1 at the end. |
| `ease_at[name, t]` | The named easing's value at `t`. |
| `ease_names[]` | Every easing that has a name of its own, without numbers. |
| `cubic_bezier[x1, y1, x2, y2]` | CSS's `cubic-bezier()`, solved as Motion solves it: Newton's steps kept inside a bisection's bracket. |
| `steps[count, jump]` | CSS's `steps()`, with `jump-start`, `jump-end`, `jump-none`, `jump-both`, `start` or `end`. |
| `spring_settling[easing]` | How long anime.js says a spring easing takes to settle, in ms. anime.js gives this to an animation it eases. |

The spellings:

- **anime.js:**
  - `linear` and `none`.
  - `in`, `out`, `inOut` and `outIn`, with a power (`'inOut(3)'`, 1.68 by default).
  - Each of those turns of Quad, Cubic, Quart, Quint, Sine, Circ, Expo,
    Bounce, Back (overshoot, 1.7 by default) and Elastic (amplitude and
    period, 1 and .3 by default): `'outElastic(1, .3)'`.
  - `'cubicBezier(.6,-.28,.735,.045)'`, found by halving as anime.js finds it.
  - `'steps(10)'` and `'steps(10, true)'` (rounding up).
  - `'linear(0, 0.25 50%, 1)'`.
  - `'irregular(10, 1, seed)'`. anime.js draws its points from Math.random;
    here they come from anime.js's own seeded generator, so a seed always
    gives the same easing.
  - `'spring(mass, stiffness, damping, velocity)'` and `'springBounce(bounce, duration)'`.
- **Motion:** `easeIn`, `easeOut`, `easeInOut`, `circIn`, `circOut`,
  `circInOut`, `backIn`, `backOut`, `backInOut` and `anticipate`.
- **CSS:**
  - `ease`, `ease-in`, `ease-out` and `ease-in-out`.
  - `step-start` and `step-end`.
  - `'cubic-bezier(…)'` and `'steps(4, jump-both)'`.
- **AOS:**
  - Its twenty easing names are the cubic béziers its stylesheet gives them,
    for example `ease-in-out-back`.
  - AOS ships its cubic and quart béziers equal to its quad ones, and they
    are kept that way.

### Springs and inertia

| Function | What it answers |
|---|---|
| `spring[stiffness, damping, mass]` | A spring by its physics. Motion's defaults are 100, 10 and 1. |
| `spring_duration[duration, bounce]` | A spring that settles in `duration` ms with a `bounce` from -1 to 1. Motion's defaults are 800 and 0.3. |
| `spring_visual[visual, bounce]` | A spring that seems to take `visual` seconds. |
| `spring_physics[sp]` | The stiffness, damping and mass a spring comes to, and whether it is defined by time. |
| `spring_sample[sp, origin, to, velocity, ms]` | Where the spring is `ms` after it set out at `velocity` units a second: its value, its velocity and whether it is at rest. |
| `inertia[origin, velocity]` | A throw, with Motion's defaults. Tune its fields: power .8, time constant 325 ms, a bounce spring of 500 and 10, rest delta .5, bounds `low` and `high`, and a `snap` step. |
| `glide[thrown]`, `glided[thrown, g, ms]` | The throw at its start, then `ms` after it was let go. A bound catches it at the first time asked that finds it outside, as Motion's frames find it. The spring that catches it then carries it to the bound. |

The rest of a spring, as Motion has it:

- `rest_speed` and `rest_delta`, when 0, are Motion's own: 0.01 and 0.005
  for a move under 5 units, and 2 and 0.5 for a longer one.
- A spring defined by time rests when its time is over.
- A spring defined by time sets out still, ignoring the velocity it is
  given, as Motion's does.

### Animations and their clocks

An animation is a `Tween`: keyframe values, the offset of each value (0 to 1),
an easing for each stretch between two values, a duration, and anime.js's
timer settings. Those settings are a `delay`, `loops` (more plays, -1 for
ever), a `loop_delay` between plays, `alternate` and `reversed`.

| Function | What it answers |
|---|---|
| `keyframes[vals, duration]` | Values spaced evenly, each stretch eased in and out, played once. These are Motion's keyframes. |
| `tween_of[origin, to, duration, name]` | One value moving to another with the easing named. |
| `with_ease[k, name]` | The animation with every stretch eased by the easing named. |
| `track_value[k, ms]` | The value `ms` into one play. It holds at the ends outside them, as Motion's keyframes do. |
| `playhead[k, ms]` | anime.js's timer `ms` after the start: the time into the current play, which play it is, the progress through it and whether it has ended. |
| `tween_value[k, ms]` | The value on that clock. |
| `tween_duration[k]` | The whole time, with every play and pause counted. |

### Held between frames

Each of these reads the frame's time, `lory.time[c]`. Each keeps what it must
under its id.

| Function | What it answers |
|---|---|
| `run[c, id, k]`, `run_state[c, id, k]` | The value, or the playhead, of animation `k` on the clock kept under `id`. The clock starts the first frame it is asked for. |
| `control[c, id, k, act, num]` | The clock told what to do (the acts are below). |
| `clock_at[c, id]` | The clock as it stands: its own time, its speed, and whether it is paused or turned. |
| `tween[c, id, target, duration, name]` | A value easing to `target`. A new target starts it again from where it is. |
| `spring_to[c, id, target, sp]` | A value a spring carries to `target`. A new target starts the spring from where the value is, at the speed it has. |
| `presence[c, id, shown, enter, leave, name]` | A value from 0 to 1 that enters over `enter` ms while shown and leaves over `leave` ms once hidden. A change half way turns it where it stands. It says when its exit is over (`gone`), so the program can stop drawing it. |
| `presence_of[shown, since, origin, enter, leave, name, at]` | The same, from what it was given, kept nowhere. |

The acts that `control` takes:

- `'play'`: forward from where the clock is, or from the start once it has
  ended.
- `'reverse'`: back from where it is.
- `'alternate'`: the other way, as anime.js's `alternate()`. An alternating
  clock with an even count of plays keeps its direction.
- `'pause'` and `'resume'`.
- `'seek'`: to `num` ms of the clock's own time, as anime.js's `seek`.
- `'speed'`: `num` times as fast.
- `'restart'`.

### Timelines

| Function | What it answers |
|---|---|
| `timeline[]` | An empty timeline. |
| `timeline_add[tl, name, duration, position, delay = 0, loops = 0]` | The timeline with a child named `name` placed at `position`. |
| `timeline_label[tl, name, position]` | The timeline with a label at `position`. |
| `timeline_position[tl, position]` | The time a position names, as anime.js reads it (the forms are below). |
| `timeline_duration[tl]` | The whole timeline's length, with its `loops` and `loop_delay` counted. |
| `child_of[tl, name]`, `label_at[tl, name]` | A child, or where a label stands. |
| `child_playhead[tl, name, ms]` | The clock of the child named, when the timeline stands at `ms`. |

The positions, as anime.js reads them:

- `''`: after everything.
- A number of ms.
- `'+=100'`, `'-=100'` and `'*=2'`, counted from the end.
- A label, alone or with an amount: `'intro'`, `'intro+=50'`.
- `'<'`: the end of the last child added. `'<<'`: its start. Both take an
  amount: `'<+=50'`, `'<<-=20'`.

A child of no length is moved a hundred-billionth of a ms earlier, as anime.js
moves one.

### Staggers

| Function | What it answers |
|---|---|
| `stagger[each]` | anime.js's stagger, `each` ms between neighbours. |
| `stagger_range[first, last]` | anime.js's stagger over a range of delays, from `first` to `last`. |
| `stagger_motion[each]` | Motion's stagger, which counts in seconds. |
| `stagger_eased[st, name]` | The stagger with its delays eased. |
| `stagger_grid[st, columns, rows]` | The stagger over a grid. |
| `staggers[st, total]`, `staggered[st, index, total]` | Every item's delay, or the delay of one. |
| `hypotenuse[x, y]` | A length as V8's `Math.hypot` finds it, so grid distances are Motion's floats. |

A `Stagger` record also has these fields:

- `origin`: `first`, `center`, `last`, `random`, an index as text, Motion's
  `edges`, or anime.js's `point` at (`origin_x`, `origin_y`) of the grid.
- `reversed`.
- `axis`: `x` or `y`.
- `base`: added to every delay.
- `seed`: for its random order.

### Scroll, numbers, paths and text

| Function | What it answers |
|---|---|
| `scroll_progress[scroll, container, target, inset, offsets]` | How far a target has come through its container, from 0 to 1, as Motion's `scroll()` offsets say. Each offset meets an edge of the target with an edge of the container: `'start end'`, `'0 1'`, `'100px 50%'`. With no offsets given it is `['start start', 'end end']`. |
| `scroll_window[scroll, offset, target_size, container_size, scroll_size, enter, leave]` | anime.js's onScroll thresholds: where the target's progress starts and ends, its length, the progress to six places, and whether the target is in view. The forms are `'end start'`, `'center top'`, `'25%'`, `'min'`, `'max'` and `'start+=50'`. |
| `reveal_line[top, height, window_height, placement, offset]` | The scroll at which AOS reveals an element, by its nine anchor placements. |
| `revealed[scroll_top, window_height, line]` | Whether AOS shows an element with that line. |
| `damp`, `blend`, `map_range`, `wrapped`, `snapped` | anime.js's `damp`, `lerp`, `mapRange`, `wrap` and `snap`. |
| `random_seeded[seed]`, `random_next[r, lo, hi, places]`, `random_unit[r]` | anime.js's seeded random generator, scaled or unscaled. |
| `path_length[xs, ys]` | The length of a polyline. |
| `path_point[xs, ys, along]` | The point `along` (0 to 1) of the way along a polyline, and its heading: a motion path. |
| `path_drawn[xs, ys, along]` | The first `along` of a polyline: line drawing. |
| `words_of[line]`, `characters_of[line]` | Text split into words or characters, to stagger. |

## Behaviours held

Each behaviour below is a test block in motion.co. There are 38 blocks and
245 truths, and they pass interpreted and compiled.

- **Easings:**
  - CSS's steps jump where the CSS easing spec says: end, start, none, both,
    `step-start` and `step-end`.
  - anime.js's steps round down unless told to round up.
  - Each library's spellings name the same easings, and default numbers are
    filled in.
  - A name nothing knows is linear and not known.
  - A bézier on the diagonal is linear.
  - Motion's turned easings mirror each other.
  - Every named easing ends at 1, and every one but `step-start` starts at 0.
- **Springs:**
  - A spring sets out still and comes to rest at its target.
  - A thrown spring sets out at its speed.
  - A critically damped spring never passes its target.
  - A spring with a duration rests when its time is over.
  - A bouncy spring passes its target first.
- **Clocks:**
  - A clock pauses, resumes, seeks, reverses and changes speed between
    frames, its value continuous through each change.
  - A clock plays at the end from the start.
  - A clock plays its loops back and forth and restarts.
  - A clock waits out its delay and the pauses between plays.
  - Keyframes ease each stretch and hold at their ends.
- **Held values:**
  - A tween given a new target sets out from where it is.
  - A spring given a new target keeps its speed: the value carries on the
    way it was going for a frame before it turns.
  - Presence enters and exits, says when it is gone, and turned half way
    goes back from where it is.
  - In a headset, a clock, a tween, a spring and a presence run on the
    headset's frames as on a page's, the same at the same times.
- **Scroll:**
  - Motion's offsets meet edges of the target and of the container, as
    names, fractions, percentages and pixels.
  - anime.js's window enters at the container's end, by default and with
    `center`, `+=` and the rest.
  - AOS reveals at each of its nine anchor placements.
- **Inertia:**
  - A throw slows to where its power carries it.
  - A bound catches a throw with a spring.
  - A snapped throw lands on its step.
- **Timelines:**
  - Positions follow anime.js: after, `-=`, `<`, `<<`, labels with
    amounts, absolute times and `<+=`.
  - A child waits out its own delay.
  - A child's loops count in its length.
  - A looping timeline counts its pauses.
- **Staggers:**
  - anime.js counts from first, center, last and reversed, from a base and
    over a range.
  - anime.js's grid measures from its centre, or along an axis (negative
    before the origin, as anime.js has it).
  - Motion counts in its own units and from its edges.
  - A random order is the same for the same seed, and holds every delay
    once.
  - The seeded random stays in its range.
- **Paths and text:**
  - A point runs along a polyline by its length, with its heading.
  - A line drawn so far ends at its fraction.
  - Text splits into words and characters.
  - anime.js's damp, lerp, mapRange, wrap and snap.

## Parity

### Numbers: reference.mjs and reference.co

`tests/motion/reference.mjs` runs the real libraries in node, on fixed inputs,
and writes `tests/motion/reference.json` (14,094 numbers). The libraries are
animejs 4.5.0, motion 14.7.1 (with motion-dom 14.7.1 and motion-utils
14.7.0), and aos 2.3.4 (its stylesheet read for its easings). To regenerate:

```
npm install --prefix <scratch>/ref --ignore-scripts animejs@4.5.0 motion@14.7.1 aos@2.3.4
node tests/motion/reference.mjs <scratch>/ref/node_modules
```

`tests/motion/reference.co` holds Lory to every number. Run it from the
repository's root:

```
crow test tests/motion/reference.co
crow test --compiled tests/motion/reference.co
```

All 9,840 numbers are held, and 9,526 of them (96.8%) are the same bit for
bit. The AOS block also checks its twenty names.

| What | Cases | Numbers held | Bit for bit | Farthest off (× 2^-52 of the case) |
|---|---|---|---|---|
| Easings at t = 0, .05, …, 1: every name of anime.js, Motion, CSS and AOS, anime.js's parameters, béziers, steps, linear(), irregular() | 123 | 2,583 | 2,511 | 0.63 |
| AOS's twenty names known, each the bézier its stylesheet gives | 20 | (truths) | | |
| anime.js spring easings: settling time, solver time, values | 11 | 275 | 270 | 2 |
| Motion springs every 16 ms until rest: value, velocity, at rest; physics, duration and visual forms, under-, critically and over-damped | 16 | 3,198 | 3,020 | 1.08 |
| A spring given a new target while moving, keeping its velocity | 3 | 519 | 486 | 0.83 |
| Staggers: anime.js's first, center, last, index, range, reversed, eased, grid, axis, random with a seed; Motion's first, last, center, index, edges, eased, grid, random | 38 | 386 | 380 | 0.09 |
| Timeline positions: children's offsets, delays and lengths, labels, one play and the whole | 5 | 114 | 114 | 0 |
| Timer clocks (playhead) with loops, delays, loop delays, alternate and reversed | 8 | 500 | 500 | 0 |
| Keyframes with offsets, per-stretch easings and a whole easing | 8 | 278 | 274 | 1.07 |
| Inertia: power, time constant, bounds caught by a spring, snap | 8 | 1,592 | 1,576 | 1.09 |
| Motion's scroll offsets over a scroll's length | 10 | 330 | 330 | 0 |
| damp, lerp, mapRange, wrap, snap and the seeded random | | 65 | 65 | 0 |

**The tolerance.** A number is held when Lory's float is the library's, or
differs from it by no more than 2^-50 of the largest number its case
reaches. That is four units in the last place of a number between 1 and 2.
A case is one easing over its 21 times, one spring's values or its speeds,
one throw, or one stagger.

**Why there is one.** Only what exp, sine, cosine, arcsine, arccosine and
powers give differs at all. The machine's maths library and V8's round
those a last bit apart, and a formula holds up to three of them. Addition,
subtraction, multiplication, division and square roots are the same bit for
bit, so every tween, timeline, clock, scroll offset and helper is exact.

**Why it is measured against the case.** A sum that cancels carries a
difference into a smaller number. A throw passing 14 on its way from 100 to
-300 is off by 1.09 units of its case, but by 17 units of itself.

**Only in test blocks.** Some things are held in motion.co's test blocks
alone, because they need a DOM or a page that node does not have: AOS's
anchor placements, anime.js's onScroll thresholds, CSS steps as the spec
states them, and the clock's controls over frames.

### Both modes: tests/modes/motion.co

`crow test --compiled` runs a plain test block in the interpreter: it
compiles only the apps a block opens. So `tests/modes/motion.co` is a
program that writes out what motion computes, a case to a line, and
`tests/modes.sh` runs it interpreted (`crow run -i`) and compiled
(`crow run`) and holds the two outputs equal, line by line. Each number is
written as the fewest digits that read back as the same float, so equal
lines mean every bit is the same.

The cases are every input reference.json holds, then what the tests above
hold only in blocks:

- a clock paused, resumed, reversed, sought, sped up and restarted over
  frames;
- a tween and a spring given new targets, and a presence turned half way;
- anime.js's scroll windows and AOS's nine lines;
- a motion path and words split.

```
tests/modes.sh crow tests/modes/motion.co      (from the repository's root)
```

It writes 242 lines, the same in both modes. reference.co holds the
interpreter's numbers to the libraries, so the compiled program's are held
to them too.

### The browser

`examples/motion` builds for the web (`crow build --target web main.co`). It
has four panels:

- **A gallery of easing curves:** sixteen curves, each pressed to show it
  large, and a select of easings named with their numbers.
- **A spring tuned with sliders:** stiffness, damping and mass. Its step
  response is drawn with where it rests, and its ball is sent back and forth
  by a press.
- **A staggered grid:** a wave from the first, center, last or a random dot,
  or from the dot pressed.
- **A timeline:** played, paused, reversed, restarted and sought with a
  slider, its children drawn as bars in time under a playhead.

The example's nine test blocks (37 truths) pass interpreted and compiled.
Three of them are in a headset (below).

`tests/motion/browser.py` drives the build in headless Chrome, at 1400 by
1400. It uses this Mac's Chrome, and nothing is installed. The page steps
the program's frames itself, asks it where its controls are, and reads its
drawing:

- The timeline's playhead moves on while playing and stands while paused.
  It runs back once reversed and on once played again. The seek slider,
  pressed at three quarters, puts it at 0.76 of the track.
- About 3,000 pixels change over 20 frames.
- The ball, pressed, is carried by its spring from the left end of its
  track (0.05) to the right end (0.95).
- The large curve, outElastic(1, .3) at first, rises above the line of 1
  (102 pixels). Once outExpo is pressed in the gallery, it does not (0).

```
python3 -I tests/motion/browser.py      (from the repository's root, after the build)
```

### In a headset

motion's values are read from the frame's time, so they run in a headset
as they do on a page, and one of motion.co's blocks holds that. The
example is made of gui's controls, so in a headset its page is 1000 by 560
on the panel, in one column. Its three headset blocks drive the example's
own frame function with headset frames: the right hand's ray, the trigger
and the thumbstick.

- **The ray:** aimed at a curve of the gallery, with the trigger pulled,
  it shows that curve large.
- **The thumbstick:** pushed toward the reader, it turns the page down to
  the timeline, 120 pixels a tenth of a second. The ray then presses Pause,
  and the timeline's clock stands where it was.
- **AR:** in a headset that shows the room through the drawing, the frame
  is cleared to nothing, and only the panels stand in the room.

## Where Lory differs, and why

- **An unknown label in a relative position.** anime.js answers NaN, and
  Lory answers the timeline's length. A position whose amount is not a
  number answers its base.
- **Infinite loops.** A clock that loops for ever flips its direction on
  `alternate` without seeking, as anime.js's does. Lory keeps no frame count
  to seek to.
- **`'play'` at the end** starts again from 0. anime.js's own note says the
  same for a seek; Lory makes it the rule.
- **`'steps(n)'`** is anime.js's, which multiplies by 1/n. CSS's `steps(n,
  end)` divides by n, and the two can differ by a last bit. Motion's `steps`,
  which caps its progress at .999, is not built: CSS's form covers it.
- **CSS's `linear()`.** It differs from anime.js's `linear()`, which is the
  one built. CSS's form adds two percentages for a point and reorders points
  given out of order.
- **A presence's exit retraces its entrance** curve. A separate exit easing
  is a second presence with its own name.
- **Scroll units.** The scroll offsets take px, %, fractions and names, but
  not `vw`, `vh` or a function of the element.
- **anime.js's stagger `jitter`** is not built.

## The survey's rows

The rows of survey/motion.md for motion.dev, anime.js and AOS. A row whose
component belongs to another of Lory's modules says so. motion gives it its
numbers.

### motion.dev

| Row | Status |
|---|---|
| Basic animation / Transition options / Keyframes / Keyframe wildcards | Built and tested: `tween_of`, `keyframes` with offsets and per-stretch easings, delay, loops, loop delay, alternate (mirror and reverse) and the playhead, held to Motion's keyframes. Wildcards are the program's: the current value is handed in. |
| Spring / CSS Spring / Spring follow cursor / Follow pointer / Scroll-linked spring | Built and tested: `spring`, `spring_duration`, `spring_visual`, `spring_sample`, held to Motion every 16 ms until rest. `spring_to` follows a target and keeps its speed when the target moves. A CSS `linear()` spring string is not built: Lory draws its own frames. |
| Drag with spring follow (multifollow) | Built, untested as a chain: each follower is a `spring_to` of the one before. |
| Bounce easing | Built and tested: `outBounce` and its turns. A program's own easing is a Crow function the program calls. |
| Rotate | Built, untested: an angle is `tween_value` of a looping `Tween` (`loops` -1). Drawing a rotation is the program's. |
| Color interpolation | Not built: colour spaces belong to `lory.colors`. motion gives the progress, and `lory.mix` blends in sRGB. |
| HTML content | Built: a value from `run` is written into words each frame. |
| useTime / useAnimationFrame / spinning cube | Built: `lory.time[c]` is the frame's time, and `lory.dt` the step. |
| Enter / Exit / AnimatePresence modes | Built and tested: `presence` (`entering`, `exiting`, `gone`). The modes are the program's: `wait` starts the new presence when the old one is `gone`, and `sync` runs both. popLayout's reflow is a layout animation (not built). |
| Variants / Orchestration | Built and tested: Motion's `stagger` with a base delay (delayChildren), from first or last (staggerDirection). Variants are the program's records. |
| Stagger / from edges / grid / random / physical | Built and tested against Motion: first, last, center, index, edges, grid, eased and seeded random. Physical distance is the grid's `hypotenuse`. |
| Gestures (hover and press) | Not motion's: gui's controls hover and press, and `scaled` and `faded` show it. |
| AnimateActivity / usePresenceData | Built, untested: a presence's direction is the program's data. |
| AnimateSuspense | Built, untested: two presences, one leaving as one enters. |
| Svelte Animate / Layout / View | Not built: layout animation (FLIP) waits on a layout record of gui's boxes from frame to frame. |
| Lenis smooth scroll | Built and tested: `damp` (anime.js's) and `blend` move a scroll toward its target each frame. Lenis's own numbers are not held. |
| Value transform and path drawing | Built and tested: `map_range` and `path_drawn`. |
| Drag / Constraints / Lock direction | Inertia after the drag is built and tested (`inertia`, `glide`, `glided`, held to Motion), with bounds caught by a spring. The drag itself is gui's and the drag and drop module's. |
| Reorder / Card stack / Sheet modal / iOS slider / Image reveal / Swipe actions / Apple Watch / Pinch | Not motion's: drag and drop and gestures. They use `spring_to`, `inertia` and `map_range`. |
| Press and hold / repeat / hold to confirm / double tap | Not motion's: gestures. A hold's progress is a `tween_value` of its time. |
| Accordion, tabs, command palette, menus, character counter, ripple, skeleton, notifications, gallery, cursor, bobble hover, modal, carousel, ticker | Not motion's: these are lory.gui's and the component modules'. Each uses motion's tweens, springs, staggers and presence. |
| Scroll-linked / scroll container / scroll-triggered / track element / pinning / footer reveal | Built and tested: `scroll_progress` with Motion's offsets. Pinning and the page are the scrolling module's. |
| Parallax / Parallax carousel | Built: a layer moves by `scroll_progress` times a factor (`map_range`). |
| Scroll zoom hero | Built: scale, blur and fade are `map_range` of `scroll_progress`. |
| Scroll word reveal | Built and tested: `words_of`, each word's opacity a `map_range` of its slice of the progress. |
| Layout animation / shared layout / view transitions / page curtains | Not built: they need gui's boxes held from frame to frame (FLIP), which is the next step for motion with gui. |
| Path drawing / morphing / motion along a path / add to basket | Built and tested: `path_drawn`, `path_point` and `path_length` on polylines. Morphing between paths and SVG path parsing are not built: they wait on a path module. |
| Text: typewriter / scramble / split / rolling / animated number | Split is built and tested (`words_of`, `characters_of`), with a stagger over the characters. Scramble's glyphs (anime.js's `scrambleText`) are not built. An animated number is `run` written into words. |
| Three.js demos / particle orb | Not motion's: lory.space draws 3D. motion's numbers drive it. |
| Confetti / hero stagger | Built, untested: launches are `random_next` and their entrance is `stagger` with `spring_to`. |

### anime.js

| Row | Status |
|---|---|
| Timer | Built and tested: `playhead` held to anime.js's timer, with loops, delays, loop delays, alternate and reversed. `control` gives play, pause, resume, seek, reverse, alternate, restart and speed. Callbacks are the program's: it reads `run_state` each frame. |
| Animation (animate) | Built and tested for numbers: `tween_of` and `keyframes`. Targets are the program's records. |
| Keyframes | Built and tested: arrays of values with offsets and per-stretch easings. anime.js's duration-based keyframes are a timeline. |
| Playback settings | Built and tested: loop, loopDelay, alternate, reversed, speed. frameRate and playbackEase are not built. |
| Composition | Built: `tween` replaces a running tween with one from where it stands. Blend composition, which adds tweens, is not built. |
| Callbacks and methods | Built: the methods are `control`'s acts. Callbacks are what the program reads from the playhead. |
| Timeline | Built and tested: absolute, `+=`, `-=`, `*=`, labels, `<` and `<<` with amounts, children's delays and loops, the timeline's loops. |
| Animatable | Built and tested: `tween` and `spring_to` retarget toward each value given. |
| Draggable | Release is built and tested: Motion's inertia, held to Motion, not anime.js's own draggable. The drag is the drag and drop module's. |
| Layout | Not built (FLIP, as above). |
| Scope | Not built: a program's scope is its own records. |
| Scroll observer (onScroll) | Built and tested in test blocks (`scroll_window`): enter and leave thresholds, `min`, `max`, `+=` and progress. The DOM's sync modes are the scrolling module's. |
| SVG: morphTo / createDrawable / createMotionPath | Drawable and motion path are built and tested on polylines (`path_drawn`, `path_point`). morphTo is not built. |
| Text: splitText | Built and tested: words and characters. Lines need a measured layout. |
| Text: scrambleText | Not built. |
| Stagger | Built and tested: start, from (first, center, last, index, random), reversed, ease, grid, axis and range. jitter is not built. |
| Utilities | Built and tested: damp, lerp, mapRange, wrap, snap, clamp, round, and the seeded random with shuffle. |
| Easings: built-in | Built and tested: every name and parameter. |
| Easings: cubicBezier, linear(), steps, irregular, spring | Built and tested. irregular takes a seed so it is the same each time. |
| WAAPI | Not built: no DOM. |
| Engine | Built: the frame's time (`lory.time`). anime.js's engine settings are the page's. |
| Three.js adapter | Not motion's: lory.space. |
| Getting started | Not a feature. |

### AOS

| Row | Status |
|---|---|
| Fade, flip, slide, zoom in and zoom out families, fade-zoom-in | Built, untested: each is a presence's value turned into an offset, a turn, a scale or a fade by the program. AOS's own distances (100 px, 90°, .6, 1.2) are its stylesheet's and are not held. |
| Anchor placements (9) | Built and tested in test blocks: `reveal_line` and `revealed`, from AOS's calculateOffset. |
| Easings (20 names) | Built and tested: each name is the bézier aos.css gives it, held number for number. |
| Options and attributes | Built: offset, duration, easing, delay, anchor placement and once are arguments. AOS's global offset of 120 is added only where no placement is given. |
| API and events | Not built: init, refresh, aos:in and aos:out are the page's. A program compares `revealed` from frame to frame. |

## The catalog's rows

These are the rows of the catalog (README.md, "Animation and motion") homed
in `lory.motion`.

| Row | Status |
|---|---|
| Easing library (Penner, cubic-bezier, steps, irregular, linear()) | Built and tested. |
| Spring physics and follow-pointer springs | Built and tested. |
| Tween and keyframe animation (durations, delays, loops, playback) | Built and tested. |
| Timeline and orchestration (offsets, labels, variants) | Built and tested. |
| Stagger | Built and tested. |
| Frame clock, timers and animation engine | Built and tested. |
| Enter / exit transitions (data-state, presence) | Built and tested. |
| Value animation helpers (colour, number, transform, utilities) | Numbers and utilities are built and tested. Colour blending is `lory.mix`'s. |
| SVG path drawing, morphing and motion along a path | Drawing and motion along a path are built and tested. Morphing is not built. |
| Text animation (split, typewriter, scramble, animated numbers) | Split is built and tested, and animated numbers are built. Typewriter and scramble are not built. |
| Enter, exit and move transitions for lists | Enter and exit are built (presence with stagger). Move is not built: it needs FLIP. |
| Layout animation and shared-element transitions (FLIP) | Not built. |
| List, grid, hero and carousel transitions (FLIP layout motion) | Not built. |
| Page transition wipes (curtains) | Built, untested: a wipe is a presence's value drawn as a rectangle. |
| Reveal / hover swap | Built, untested: a presence. |
| Hover, press and long-press gestures | gui's. motion times a long press with a tween. |
| Animation scopes, media queries and setup | Not built: reduced motion is the program's choice of a zero duration. |
| Confetti and particle bursts; cursor and pointer effects; ripple and press feedback | Built, untested: seeded random, springs and presence. Drawing them is the program's. |
| misc: animation (three.js's keyframe tracks and groups) | Built, untested against three.js: a linear track is `keyframes` with its times as `offsets` and `with_ease[k, 'linear']`, and a discrete one eases each stretch by `step-end`. A group is one clock, `run` once and read for every object. Smooth (three.js's cubic interpolant) is not built. |
