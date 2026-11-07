# Lory — progress log

Vijay (2026-11-07): build all phases 0–8 of docs/lory-design.md, fix every
Crow bug found on the way (each with its test), decide open questions by
recommendation, then compare against Babylon.js samples and fix the
differences. Also fix the interpreter's slow start (Myna: 138 s).

## Crow side (repository agncrow/crow, branch toward-1.0)

Done, uncommitted (2026-11-07):
- crow_runtime builds for wasm32-unknown-unknown: TLS crates off wasm
  (a stand-in `rustls` in sys.rs refuses at the handshake), faer without
  rayon on wasm, `stops::MOST` 2^28 on 32-bit.
- `crow_runtime::host`: write_out/write_err/clock/Started/stopped, and the
  page's imports (`crow` module: write, now, random, paint) +
  getrandom's custom backend.
- `crow_runtime::page`: `paint`, `frames`, exports `crow_alloc`,
  `crow_frame`.
- display/stops/moments/cores routed through host; emitter's halt_at
  through `host::stopped`.
- `Effect::Page` ("page"), `Effect::in_browser`.
- rows `sys.paint[text]`, `sys.frames[f]` (FRAME sig: Json -> Unit).
- `crow build --target web` (src/web_target.rs, emit_rs::WEB): refuses
  effects a browser lacks, builds a cdylib in .crow_build/web, writes
  `<name>_web/` with index.html + crow.js (crow_runtime/web/).
- Bug fixed: a module-qualified call of a row taking a function
  (`sys.frames[draw]`) had not typed the function (calls.rs
  `module_row_takes_a_function`). Needs its parity test.

Batch format: list of lists of text; arguments by form (crow.js header).

Verified: a program that clears by `frame.t` draws in headless Chrome
(`Google Chrome --headless=new --use-angle=swiftshader
--enable-unsafe-swiftshader --screenshot`).

To do on the Crow side: tests (parity, errors, unit), spec + book,
USAGE line, docs check, self-check lists, freeze, gate; toolchain's wasm
std in `crow setup` and the bundle's TARGETS.
