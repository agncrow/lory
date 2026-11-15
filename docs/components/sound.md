# sound: synths, envelopes, effects, filters, the transport, analysis, places

`sound` (packages/sound, `use sound` and its modules `sound.signal`,
`sound.envelope`, `sound.transport`, `sound.source`, `sound.filter`,
`sound.synth`, `sound.effect`, `sound.dynamics`, `sound.channel`,
`sound.analysis`, `sound.ui`) makes audio in the program itself, the way
Tone.js makes it. It covers time and pitch notation, parameters and their
ramps, envelopes, oscillators, noise and players, synths and a sampler,
filters, effects and dynamics. It also has channels and positional sound,
analysers and meters, the transport, and controls to play them with. What it
renders is held to Tone.js 15.1.22, as Chrome plays it
(tests/sound/reference.co and renders.co). No Tone.js source is included:
its behaviour was read from that version and from running it, and written
anew. The NOTICE file names what else was read.

A sound is a value: a rate and one or two channels of samples. Everything
renders ahead, sample by sample, in Crow. Nothing is a live audio graph.
The page is handed finished samples by `sound.play`, which asks the page
loader's `@sound` call to start a buffer some seconds from now. A program
that plays as it goes (a sequencer, a keyboard) renders each note when it is
due and hands it a little ahead. `transport.clock` and `transport.due` keep
that lead.

```sql
use sound
use synth
use effect
use transport

tr = transport.sequence[transport.transport[120.0], 0, 'C4 [E4 G4] . C5', '8n', '0']
hits = for f in transport.fired[tr, 0.0, 0.5]
    synth.hit[f.time, sound.hz[f.value], 0.1, 0.8]
tune = synth.played[synth.fm_synth[], hits, 22050.0]
heard = effect.applied[effect.with_wet[effect.feedback_delay[], 0.5], tune, 0.0]
sound.play[c, heard, 0.05]                     --- the page starts it 50 ms from now
```

packages/sound/example.co does this without a page (`crow test --packages`
runs it in both modes). examples/sound is the page: a synth, an effect, a
volume knob, a 4 × 8 step sequencer, a meter, a spectrum and a keyboard.

## What is built

Each function's one-line meaning is the comment above it in its module.
This section lists them by what they are for.

### Sounds, notation and pitch (`sound`, main.co)

| Function | What it answers |
|---|---|
| `mono`, `stereo`, `silence`, `frames_in` | A sound of one or two channels, or of nothing. How many samples some seconds take. |
| `length_of`, `duration_of`, `left_of`, `right_of` | A sound's length in samples and in seconds, and its channels. |
| `widened`, `narrowed`, `scaled`, `mixed`, `mixed_at`, `sliced`, `reversed`, `faded` | Sounds made from sounds. |
| `interleaved`, `call_of`, `play` | The samples the page reads, the call that hands them over, and handing them over. |
| `gain_of`, `db_of`, `equal_power` | Decibels and gains, and the equal-power law. |
| `tempo`, `metered`, `signature_of`, `beats_to_seconds`, `beats_of_seconds` | A tempo and a meter. |
| `is_time`, `seconds`, `seconds_after`, `ticks`, `ticks_of`, `seconds_of_ticks`, `ticks_of_seconds` | Tone's time notation (`4n`, `8t`, `1m`, `2:1:2`, `16n.`, `3i`, `+0.5`), as seconds and as ticks at 192 to a quarter. |
| `bars_beats`, `notation_of`, `quantized` | Tone's `toBarsBeatsSixteenths`, `toNotation` and `quantize`. |
| `a4`, `hz`, `midi`, `hz_of_midi`, `midi_exact`, `midi_of_hz`, `note_name`, `transposed`, `harmonized` | Pitch notation (`A4`, `F#3`, `Bb5`, `c-1`), MIDI numbers, notes, chords. |

### Parameters and signal maths (`sound.signal`)

| Function | What it answers |
|---|---|
| `param`, `value_at`, `rendered` | A parameter's timeline, its value at a time, and its samples. |
| `set_at`, `linear_at`, `exponential_at`, `target_at`, `curve_at` | Tone's scheduled changes: `setValueAtTime`, the ramps, `setTargetAtTime`, `setValueCurveAtTime`. |
| `linear_to`, `exponential_to`, `target_to`, `approach_at`, `ramp_to` | Ramps over a time from a time, as Tone's `…RampTo` and `rampTo` choose them. |
| `cancelled`, `held_at`, `ramp_point` | `cancelScheduledValues` and `cancelAndHoldAtTime`. |
| `scale`, `scale_exp`, `power`, `power_curve`, `negated`, `size_of`, `greater_than`, `audio_to_gain`, `gain_to_audio`, `waveshaped` | Tone's signal operators: Scale, ScaleExp, Pow, Negate, Abs, GreaterThan, AudioToGain, GainToAudio, WaveShaper. |

### Envelopes (`sound.envelope`)

| Function | What it answers |
|---|---|
| `envelope`, `adsr`, `curved`, `is_curve` | Tone's Envelope and its attack, decay and release shapes (linear, exponential, sine, cosine, bounce, ripple, step). |
| `silent`, `attacked`, `released`, `attack_release` | A level, struck and let go. |
| `level_at`, `ends_at`, `rendered` | Its value at a time, when it dies away, its samples. |

### Sources (`sound.source`)

| Function | What it answers |
|---|---|
| `oscillator`, `with_partials`, `with_phase`, `with_detune`, `with_width`, `with_modulation`, `with_spread` | Tone's OmniOscillator in all its kinds: sine, square, sawtooth, triangle and their numbered partials, custom, pulse, pwm, am…, fm…, fat…. |
| `wave_of`, `phases_of`, `band_limited` | The page's wavetables and how it keeps them under Nyquist. |
| `rendered`, `rendered_after`, `steady`, `lfo` | An oscillator's samples at moving or steady pitch, and Tone's LFO. |
| `uniforms`, `noise`, `noise_heard` | White, pink and brown noise from a seeded generator, and as a mono render hears Tone's two-channel noise. |
| `player`, `at_pace`, `looped_between`, `backwards`, `with_fades`, `played` | Tone's Player: pace, loops, reverse, fades. |
| `grains` | Tone's GrainPlayer. |

### Filters (`sound.filter`)

| Function | What it answers |
|---|---|
| `biquad`, `coefficients`, `response_at`, `biquad_filtered`, `swept_biquad` | The page's BiquadFilter in its eight kinds, its coefficients and its response. |
| `filter`, `with_q`, `with_gain`, `with_rolloff`, `stages_of`, `filtered`, `swept` | Tone's Filter, with its -12, -24, -48 and -96 dB rolloffs. |
| `tone_frequencies`, `frequency_response`, `impulse_response` | Tone's `getFrequencyResponse` and a filter's impulse response. |
| `one_pole`, `comb`, `lowpass_comb`, `bands`, `equalized` | OnePoleFilter, FeedbackCombFilter, LowpassCombFilter, MultibandSplit, EQ3. |
| `convolved`, `convolver_scale` | Convolver and the page's scaling of its response. |
| `single` | A number rounded to a 32-bit float, as the page holds it. |

### Synths (`sound.synth`)

| Function | What it answers |
|---|---|
| `synth`, `mono_synth`, `fm_synth`, `am_synth`, `duo_synth`, `membrane_synth`, `metal_synth`, `noise_synth`, `pluck_synth`, `named` | Tone's nine instruments, with their defaults. |
| `with_oscillator`, `with_envelope`, `with_volume` | An instrument of another wave, envelope or level. |
| `hit`, `sounds_for`, `voiced`, `played`, `played_from` | Notes, one voice each, as Tone's PolySynth plays them (a 33rd voice at once is dropped). |
| `sampler`, `recording`, `sampled` | Tone's Sampler: the nearest recording, repitched, and its release. |

### Effects (`sound.effect`)

| Function | What it answers |
|---|---|
| `auto_filter`, `auto_panner`, `auto_wah`, `bit_crusher`, `chebyshev`, `chorus`, `distortion`, `feedback_delay`, `ping_pong_delay`, `freeverb`, `jc_reverb`, `reverb`, `frequency_shifter`, `phaser`, `pitch_shift`, `stereo_widener`, `tremolo`, `vibrato` | Every effect Tone 15.1.22 has, with its defaults. |
| `names`, `named` | Their names, and an effect by name. |
| `with_wet`, `with_frequency`, `with_depth`, `with_wave`, `with_spread`, `with_delay`, `with_sweep`, `with_bits`, `with_order`, `with_amount`, `with_room`, `with_decay`, `with_pitch`, `with_width` | Their settings. |
| `applied`, `applied_over`, `chained`, `tail_of`, `reverb_response` | A sound through an effect (with its tail, or for some seconds), through several, and how long an effect rings. |

### Dynamics (`sound.dynamics`)

| Function | What it answers |
|---|---|
| `compressor`, `compressor_of`, `curve_at`, `makeup_of`, `reduction_at`, `sharpness_of`, `compressed` | The page's DynamicsCompressor: its curve, knee, makeup gain and reduction. |
| `limiter`, `limited` | Tone's Limiter. |
| `multiband_compressed`, `multiband_defaults`, `mid_side_compressed` | MultibandCompressor and MidSideCompressor. |
| `gate`, `gate_of`, `gated` | Tone's Gate. |

### Channels and places (`sound.channel`)

| Function | What it answers |
|---|---|
| `panned`, `volumed`, `muted`, `pan_vol` | Panner, Volume, PanVol. |
| `strip`, `strip_at`, `with_mute`, `with_solo`, `heard_among`, `mixed_strips` | Tone's Channel and Solo: strips mixed with mutes and solos. |
| `crossfaded`, `mono_of`, `mid_side_of`, `joined` | CrossFade, Mono, MidSideSplit and MidSideMerge. |
| `listener`, `listener_at`, `listener_of` | The listener, and the one a frame's view gives (a headset's head). |
| `place`, `with_distance`, `with_cone`, `azimuth_elevation`, `distance_gain`, `cone_gain`, `gains_of`, `placed` | Panner3D and three.js's PositionalAudio: equal-power panning, the linear, inverse and exponential distance models, and cones. |

### Analysis (`sound.analysis`)

| Function | What it answers |
|---|---|
| `analyser`, `analysed`, `values_of`, `band_hz` | Tone's Analyser: `fft` (Blackman window, smoothing 0.8, in dB) and `waveform`. |
| `meter`, `metered`, `dc_of`, `followed` | Meter, DCMeter and Follower. |
| `rms`, `level`, `windows`, `spectrum`, `peak_near`, `centroid`, `measured`, `measure_of` | Measures the tests use, and a program can: level, fundamental, centroid, RMS windows. |
| `falls_3db`, `rises_3db`, `response_of_impulse` | Where a response falls or rises 3 dB, and a response read from an impulse. |

### Controls (`sound.ui`)

| Function | What it answers |
|---|---|
| `keyboard`, `keys_laid`, `key_at`, `is_white` | A piano keyboard, how its keys lie, and the key under a point. |
| `steps`, `empty_grid`, `toggled`, `is_on` | A step sequencer's grid. |
| `knob`, `knob_angle` | A knob, turned by drag, arrows, Page Up and Down, Home and End. |
| `meter`, `meter_share`, `spectrum`, `waveform`, `peaks_of` | A level meter, a spectrum and a waveform drawn. |
| `player`, `paces`, `clock` | An audio player's bar: play and pause, seek, pace, `m:ss`. |

## The behaviours held

- **Time and pitch.** Every notation Tone reads, its ticks at 192 a
  quarter, swing, and the transport's loop, `scheduleRepeat`, Part, Sequence
  (its nested steps and rests), Pattern (each kind, random ones seeded) and
  `nextSubdivision` all fire on the same ticks and seconds as Tone.
- **Ramps** follow the Web Audio spec's formulas, including an exponential
  ramp to nothing ending at the least value, `setTarget`'s approach, and
  cancel-and-hold.
- **Oscillators** use the page's band-limited wavetables: the partials a
  table keeps at each pitch, faded in between tables as Chrome does.
- **Players** subtract the fade-out from the duration, as Tone does. The page
  reads between samples linearly and past the end it extrapolates.
- **Loops of nodes**, such as feedback delays and combs, come round one
  render quantum (128 samples) late or not, as the page's graph does.
  FeedbackCombFilter's worklet reads its delay and feedback once every 128
  frames. DelayLine reads `floor(delay × rate)` with the delay as a 32-bit
  float.
- **Tone's LFOs start at time 0** (their construction), so a render from
  later is shifted along the same wave.
- **Noise** is two channels in Tone, so a mono listener hears their average
  (white noise's RMS 0.41, not 0.58). `noise_heard` gives that.
- **Positional sound** uses the spec's PannerNode: equal power, the three
  distance models and cones, and three.js's defaults.

## How parity is checked

- **tests/sound/reference.js** runs Tone 15.1.22 in Chrome's
  OfflineAudioContext. It writes tests/sound/reference.json: notation,
  ramps, envelopes, the transport, oscillators, the LFO, filters, signals,
  players, analysers, places, every synth's and every effect's render, and
  dynamics. **reference.py** drives it in headless Chrome. Both are kept so
  the numbers can be made again.
- **tests/sound/reference.co** (6 blocks, 14 truths) holds 169 of those
  numbers exactly or to the stated tolerance: notation, ticks, pitches, ramp
  values, envelope levels, transport firings.
- **tests/sound/renders.co** (10 blocks) holds the renders: about 28,500
  numbers, mostly samples, plus measures of the renders the tests cannot hold
  sample by sample (synths, the reverb, the compressor).
- **Each module's own tests** (packages/sound/*.co, 54 blocks, 264 truths)
  hold what Tone and the spec define: identities, edges and defaults.
- **tests/modes/sound.co** writes 102 lines of the package's numbers.
  `tests/modes.sh crow tests/modes/sound.co` finds them the same, bit for
  bit, interpreted and compiled.
- **packages/sound/example.co** runs under `crow test --packages`, in both
  modes.
- **tests/sound/browser.py** opens examples/sound's web build in headless
  Chrome, presses the keyboard as a reader would, and holds that the page
  started a buffer: at 22050 a second, longer than the 0.3 s note, and not
  silent. Nothing may be thrown.
- **examples/sound/main.co**'s tests hold that a mouse press and a headset
  frame's press each ask `@sound`, and that the sequencer hands its steps
  0.2 s ahead.

### Tolerances, and why

The renders are short (hundredths of a second, at 8 or 16 kHz) to keep the
tests quick.

| What | Held to | Why |
|---|---|---|
| Notation, ticks, firings, pitches | exact | Plain arithmetic in doubles, the same order as Tone. |
| Oscillators | 5e-4 (pulse 2e-3) | Chrome builds its wavetables by an FFT in single precision and reads them with interpolation. Pulse is two sawtooths and a waveshaper, so its error is twice theirs. |
| LFO | 1e-4 | It is an oscillator through Tone's scale, at low pitch, so the table's error is smaller. |
| Filter responses | relative 1e-5 | The page works in single precision. |
| Impulses, comb, one-pole, EQ3, convolver | 1e-6 | Single precision on samples near 1. |
| Signals | 1e-6 (scale and scale_exp 2e-5, GreaterThan exact) | ScaleExp goes through Tone's 8192-point Pow curve, read by interpolation. |
| Players | 1e-6 | Linear reads in single precision. |
| FFT bands above -100 dB / meter / waveform | 1e-4 dB / 1e-5 dB / 1e-6 | Single-precision FFT. Bands below -100 dB are the window's leakage and floating-point noise. |
| Places and pans | 1e-6 | The spec's formulas in single precision. |
| Pitched synths | level 0.1 dB, f0 0.02 Hz, centroid 0.5%, 10 ms RMS windows 0.05, harmonics above -60 dB within 0.5 dB | Envelopes run at k-rate and the page's ramps land on render quanta, so sample-by-sample difference grows over a note. What a listener hears (level, pitch, brightness, shape over time) is held instead. |
| MetalSynth | level 3 dB, silent where Tone is (windows 1–9) | Its six square partials through a highpass near Nyquist: the first 2 ms differ in their phases. |
| NoiseSynth | level 1.5 dB, silent after 110 ms | Noise is random, so only its level and envelope can match. |
| PluckSynth | level 6 dB, f0 0.05 Hz, fall over 5 windows within 3 dB | Tone's own renders of one pluck differ by about 5 dB from run to run: its noise burst is random. |
| Sampler | level 0.001 dB, f0 0.001 Hz, RMS 0.001 | A repitched player: near exact. |
| Plain effects | RMS windows 2e-5, first 480 samples 2e-4, level 1e-4 dB, f0 1e-4 | Delays, modulation and shapers on a sine, in single precision. |
| pitch_shift | RMS 1e-3, head 0.01, level 0.01 dB | Its two delay lines are swept by sawtooth LFOs read from wavetables. |
| frequency_shifter | RMS after 10 ms 0.01, level 0.05 dB, f0 0.01 Hz | Tone's Hilbert transform is a pair of allpass chains. This one is FFT-based and non-causal, so its first 10 ms differ. |
| Reverb | left-channel click energy within 5% | Its response is random noise, so its level on a sine depends on that noise's spectrum. The energy of a click's response does not. |
| Dynamics | settled peak within 1 dB | The spec leaves the compressor's envelope (adaptive release, the sine warp) to the browser. That envelope here is this package's own. Tone's settled peaks are 0.747, 0.5415, 0.9095 and 0.9, and this package's are 0.729, 0.505, 0.871 and 0.9. |
| Noise | RMS within 10%, slope within 1 dB an octave | Random by nature. Pink's -3 dB and brown's -6 dB an octave are held. |

### Known limits

- Plucks and Freeverb run away when the rate is below about π times their
  dampening. Render them at 16 kHz or more.
- Below 16 kHz, a filter's response above Nyquist is NaN, as Tone's is.
- MetalSynth's first 2 ms differ from Tone's.
- Everything renders ahead. A note's sound is made when it is due, not
  streamed, so a long effect tail costs its whole length up front.
  `applied_over` renders only the seconds asked for.

## The catalog's rows

| Row | Status |
|---|---|
| UI helpers | Built: `sound.ui`'s keyboard, steps, knob, meter, spectrum, waveform and player bar. |
| Audio-synchronised animation | Built: `transport.position`, `progress`, `fired`, and `clock`/`due` give what is playing at a frame's time. The example lights the playing step. |
| Analysis and meters | Built: `sound.analysis` and `ui.meter`, `ui.spectrum`, `ui.waveform`. |
| Analysis | Built: Analyser (fft, waveform), Meter, DCMeter, Follower. FFT held. |
| Audio context and time types | Built: notation, ticks, tempo, meter, quantize, pitch types. The context is the page's. A program reads time from its frame. |
| Audio player (extra) | Built: `source.player` and `ui.player`. |
| Channels, panning, volume, routing | Built: Panner, Volume, PanVol, Channel, Solo, Mono, CrossFade, MidSide. Recorder is not built (see below). |
| Dynamics | Built: Compressor, Limiter, Gate, Multiband, MidSide. The envelope is this package's own. |
| Effects | Built: all 18 of Tone 15.1.22's. ReverseDelay is not in 15.1.22. |
| Envelopes | Built: Envelope, its curves, and the envelopes each synth puts on its level and pitch. |
| Example demos: effects and routing | Built: examples/sound (effect select, knob), example.co. |
| Example demos: sequencing, events, offline | Built: the step sequencer, `transport.fired`. Every render is offline. |
| Example demos: signals | Built: the module tests and tests/modes/sound.co. |
| Example demos: sources, synths, sampler | Built: the synth select and keyboard. The mic is not built (see below). |
| Filters and EQ | Built: Filter, Biquad, OnePole, comb filters, MultibandSplit, EQ3, Convolver. |
| Positional audio (three.js) | Built: `channel.place`, `listener_of` a headset frame, `placed`. Equal power only. |
| Signals and signal maths | Built: Param's scheduling and every operator listed above. |
| Sources, players, buffers | Built: every oscillator, noise, Player, GrainPlayer, in-memory buffers. UserMedia and loading are not built. |
| Synthesizers | Built: all nine and PolySynth, Sampler. |
| Transport | Built: tempo, meter, swing, loops, scheduleRepeat, Part, Sequence, Pattern, position. |
| Video player (extra) | Not built: see below. |

## Not built, and why

- **The video player.** Video is decoded, timed and drawn by the browser,
  and the page loader has no call to show a video or read its frames. A
  player would be a page feature, not a sound one. `ui.player`'s bar is
  what a video player's controls would be.
- **UserMedia and the microphone.** This needs the page to ask for the
  microphone and stream its samples into the program. The loader has no such
  call. Everything else in `sound` would then work on the samples, as on any
  sound.
- **Recorder.** It records the page's live output. Here a sound is already a
  value: `sound.call_of` holds its samples. Saving one as a file needs a
  loader call to hand the reader a file.
- **Buffers loaded from a URL** (and Players with many buffers loading).
  Decoding a file is the browser's job, and the loader has no call to fetch
  and decode audio. `sampler` and `player` take sounds made or held by the
  program.
- **HRTF panning.** It convolves with measured head responses. Those are a
  data set the browser holds and this package would have to copy. Equal
  power is what Tone and three.js use by default.
- **ReverseDelay.** It is not in Tone 15.1.22, the version held to.
- **Chrome's exact compressor envelope.** The spec leaves it to the browser.
  The curve and the settled level are held, and the attack and release are
  this package's own.

## What the page loader would want

The page plays what `@sound` hands it, a buffer at a time. These calls
would bring it closer to a live graph:

- the audio clock and output latency in each frame, so notes are handed
  against the clock that plays them;
- a call to stop what was handed;
- a call that streams samples without gaps;
- resuming the audio context on the first press, where the browser asks
  for a gesture first.
