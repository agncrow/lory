# Sound

The sound package makes audio in your program itself, sample by sample:
synths and a sampler, envelopes, oscillators, noise and players, filters,
effects and dynamics, sound placed around the listener, a transport that
says which notes fall when, analysers and meters, and controls to play it
all with. `use sound` and the modules you need: `sound.signal`,
`sound.envelope`, `sound.transport`, `sound.source`, `sound.filter`,
`sound.synth`, `sound.effect`, `sound.dynamics`, `sound.channel`,
`sound.analysis` and `sound.ui`.

A sound is a value: a rate and one or two channels of samples. Nothing is a
live audio graph; everything is rendered ahead and handed to the page with
`sound.play`, which starts it a given number of seconds from now. A program
that plays as it goes, a sequencer or a keyboard, renders each note when it
is due and hands it over a little ahead (`transport.clock` and
`transport.due` keep that lead). Time is written in notation (`4n` a
quarter note, `8t` a triplet, `1m` a bar, `2:1:0` bars, beats and
sixteenths) and pitch by name (`C4`, `F#5`) or MIDI number. The controls
take a mouse, a touch or a headset's ray; a knob also turns by the arrows,
Page Up and Page Down, Home and End.

## Components

| Component | What it does |
|---|---|
| Synths | A plain synth, mono, FM, AM and duo synths, a membrane drum, a metal cymbal, a noise synth and a plucked string, each with its own defaults, up to 32 voices at once |
| Sampler | Recordings played at the nearest recorded pitch, faster or slower to reach the note |
| Envelopes | Attack, decay, sustain and release, straight, exponential or curved (sine, cosine, bounce, ripple, step) |
| Oscillators | Sine, square, sawtooth, triangle, custom partials, pulse and PWM, and their AM, FM and fat variants, band-limited |
| Noise and players | White, pink and brown noise from a seed; a buffer player (pace, loop, reverse, fades) and a grain player |
| Filters | Biquads of eight kinds, cascades of one to four, one-pole filters, combs, a three-band split and equaliser, convolution |
| Effects | Auto filter, auto panner, auto wah, bit crusher, Chebyshev, chorus, distortion, feedback and ping-pong delay, frequency shifter, phaser, pitch shift, a damped reverb, a Schroeder reverb, a convolution reverb, stereo widener, tremolo, vibrato |
| Dynamics | A compressor, a limiter, a gate, and multiband and mid-side compressors |
| Channels | Pan, volume, mute and solo strips, crossfades, mono and mid-side |
| Positional sound | A sound placed around a listener, with distance models and cones |
| Transport | Events once, repeated and looped, parts, sequences of nested steps and patterns, with swing and a loop |
| Analysis | A spectrum analyser, a waveform, a level meter, a DC meter and a follower, and measures of level, pitch and brightness |
| Controls | A piano keyboard, a step sequencer's grid, a knob, a level meter, a spectrum, a waveform and a player's bar |

## Using it

```crow
use sound
use sound.synth
use sound.effect
use sound.transport

fn tune_of[]
    tr = transport.sequence[transport.transport[120.0], 0, 'C4 [E4 G4] . C5', '8n', '0']
    hits = for f in transport.fired[tr, 0.0, 0.5]
        synth.hit[f.time, sound.hz[f.value], 0.1, 0.8]
    tune = synth.played[synth.fm_synth[], hits, 22050.0]
    effect.applied[effect.with_wet[effect.feedback_delay[], 0.5], tune, 0.0]

--- in a frame: the page starts the tune 50 ms from now
fn draw[c]
    sound.play[c, tune_of[], 0.05]
```

## In a headset

The listener can be the reader's head (`channel.listener_of[c]`), so a
placed sound stays where it is in the room as the head turns. The controls
take a controller's ray as they take a pointer.

## Try it

[Open the sound example](../../examples/sound/)

## Not included yet

- A microphone's input
- Recording the page's output to a file
- Audio files loaded and decoded
- Head-related (HRTF) panning
- A video player
