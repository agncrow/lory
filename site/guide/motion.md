# Motion

`lory.motion` moves things: easings, springs, throws that slow to a stop,
animations kept between frames, timelines, staggers, and the arithmetic of
scroll-driven effects. An easing is named by its text, so a program can
write `'outQuad'`, `'inOutBack(2)'`, `'outElastic(1, .3)'`,
`'easeInOut'`, `'ease-in-out'`, `'cubic-bezier(.68,-.55,.265,1.55)'`,
`'steps(5, jump-both)'`, `'linear(0, 0.6 30%, 1)'` or
`'spring(1, 120, 9, 0)'`. A name it does not know is linear.

An animation held between frames is your program's definition (what moves,
for how long, with which easing), handed in each frame, and Lory's clock for
it, kept under an id and read against the frame's time. A new target starts
a tween again from where the value stands, and a spring from where it is at
the speed it has, so motion never jumps. A clock can be paused, resumed,
reversed, sought, sped up and restarted. The values drive what is drawn:
a control moved, faded or scaled with `gui.moved`, `gui.faded` and
`gui.scaled`, or anything a program paints.

## Components

| Component | What it does |
|---|---|
| Easings | Named curves in families (quad, cubic, quart, quint, sine, circ, expo, bounce, back, elastic) turned in, out, in-out and out-in; cubic béziers, steps, points and irregular curves |
| Spring | A spring by its stiffness, damping and mass, or by how long it takes and how much it bounces |
| Throw | A value let go at a speed, slowing to rest, caught by a spring at its bounds and snapped to a step |
| Tween | A value easing to a target, kept between frames |
| Keyframes | Several values over a time, each stretch with its own easing |
| Clock | An animation's playback: delay, repeats, pauses between, alternate direction, speed |
| Presence | A value from 0 to 1 that enters while something is shown and leaves once it is hidden, turning where it stands if changed half way |
| Timeline | Children placed one after another, at offsets (`'-=300'`), labels (`'turn'`) or beside the one before (`'<'`, `'<<+=200'`) |
| Stagger | Delays across a list or a grid, from the first, the last, the centre, the edges, a point or a random order |
| Scroll progress | How far a target has come through its container, by offsets that meet the two's edges |
| Scroll window | Where a target's scroll-driven progress starts and ends |
| Reveal line | The scroll at which an element is revealed, by its anchor placement |
| Motion path | A point and its heading along a line of points, and the line drawn so far |
| Text split | A line split into words or characters to stagger |
| Number helpers | Damp, blend, map from one range to another, wrap, snap and a seeded random |

## Using it

```crow
use sys
use memory
use lory
use lory.gui
use lory.motion

struct Page [card_shown]

fn draw[frame]
    a = recall['page', Page[false]]
    c = lory.begin[frame]
    x = motion.tween[c, 'box', 300.0, 600.0, 'outQuad']
    y = motion.spring_to[c, 'ball', 200.0, motion.spring[170.0, 12.0, 1.0]]
    p = motion.presence[c, 'card', a.card_shown, 300.0, 200.0, 'outBack']
    card = gui.faded[gui.scaled[gui.panel[[gui.heading['Hello']]], 0.9 + 0.1 * p.value], p.value]
    tree = gui.column[[gui.button['toggle', 'Show the card'], card], pad = 24.0]
    shown = gui.show[c, tree]
    for e in shown.events
        if e.id eq 'toggle' and e.act eq 'press'
            a.card_shown = not a.card_shown
    remember['page', a]
    canvas = lory.rect[shown.canvas, x, y, 40.0, 40.0, gui.dark[].accent]
    lory.end[canvas]

sys.frames[draw]
```

`motion.run` plays a keyframed animation on a clock kept under its id, and
`motion.control` tells that clock to `play`, `pause`, `resume`, `reverse`,
`alternate`, `seek`, `speed` or `restart`.

## In a headset

Motion runs on the frame's time in a headset as on a page, so a spring or a
timeline plays at the same pace on a panel in the room.

## Try it

[Open the motion example](../../examples/motion/)
