#!/bin/bash
# Lory's whole suite against a crow binary, from this repository's root:
# each package's test blocks and its example in both modes; each area's
# tests under tests/<area>/, most of them held to the numbers of the
# library the area follows (Kite's indicators to klinecharts', gui's layers
# to Floating UI's placement, colours to culori's, Vuetify's, Semantic UI's
# and Radix's: each area's reference script writes its reference.json, and
# docs/components/<area>.md says how); each example's test blocks; what
# each area computes written out in both of Crow's modes and held equal
# (tests/modes/<area>.co, by tests/modes.sh); every example built for the
# browser (`crow build --target web`, written to examples/<name>/main_web),
# gui's layers driven in a real browser (tests/gui/browser.py), the
# scene example walked in a made-up headset (Lory Studio's
# studio/walks/scene.json) and the controls example in one that shows the
# room through the drawing (studio/walks/controls_ar.json: AR, which needs
# a crow from 2026-11-14 on), in this machine's Chrome where there is one,
# their pictures held to the ones kept beside each walk.
# Usage: ./test.sh [path to crow]   (the crow on the PATH by default)
set -u
CROW=${1:-crow}
CROW=$(command -v "$CROW" || echo "$CROW")
cd "$(dirname "$0")" || exit 1
failed=()
step() {
    local name=$1
    shift
    echo "== $name"
    "$@" || failed+=("$name")
    echo
}
step packages "$CROW" test --packages
for file in tests/*/*.co; do
    # (the programs both modes run are tests/modes.sh's, below)
    case "$file" in tests/modes/*) continue ;; esac
    step "${file#tests/}" "$CROW" test "$file"
done
for dir in examples/*/; do
    name=$(basename "$dir")
    # every program of the example's folder: main.co and the parts a suite
    # (examples/solid, vue, lit) is made of
    for file in "$dir"*.co; do
        step "example $name: $(basename "$file")" bash -c "cd '$dir' && '$CROW' test '$(basename "$file")'"
    done
done
for program in tests/modes/*.co; do
    step "both modes: $(basename "$program" .co)" bash tests/modes.sh "$CROW" "$program"
done
for dir in examples/*/; do
    name=$(basename "$dir")
    step "web $name" bash -c "cd '$dir' && '$CROW' build --target web main.co"
done
CHROME=${LORY_CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}
if [ -x "$CHROME" ] && command -v python3 >/dev/null; then
    step "gui in a browser: a layer opened and closed" python3 -I tests/gui/browser.py
    step "colors in a browser: each swatch its colour, a theme chosen" python3 -I tests/colors/browser.py --built
    step "geometry in a browser: a shape drawn, turned, chosen, its edges taken away" python3 -I tests/geometry/browser.py
    step "motion in a browser: a timeline played, paused, reversed and sought, a spring" python3 -I tests/motion/browser.py
    step "map in a browser: tiles, drag, wheel, fly-to, clusters, a popup" python3 -I tests/map/browser.py
    step "charts in a browser: a gallery drawn, a dataset hidden, a tooltip, new data" python3 -I tests/charts/browser.py
    step "models in a browser: a model read and drawn, turned, chosen, its file written" python3 -I tests/models/browser.py
    step "datatable in a browser: paged, sorted, searched, a row chosen" python3 -I tests/datatable/browser.py
    step "datagrid in a browser: a cell focused, edited and saved, keys, the wheel, a live feed, a sheet" python3 -I tests/datagrid/browser.py
    step "three.js's scenes in a browser: 24 pictures held to three 0.187.0's, 11 more drawn" python3 -I tests/threejs/picture.py
    # sound needs a page loader that knows @sound (Crow's runtime after 2026-11-14)
    step "sound in a browser: a press plays a rendered buffer" bash -c "cd examples/sound && '$CROW' build --target web main.co >/dev/null && cd ../.. && python3 -I tests/sound/browser.py"
    step "icons in a browser: the whole sheet drawn, light and dark" python3 -I tests/icons/picture.py
    step "studio walk: scene in a headset" python3 -I studio/studio.py walk studio/walks/scene.json
    step "studio walk: controls in a headset that shows the room" python3 -I studio/studio.py walk studio/walks/controls_ar.json
else
    echo "== browser checks skipped: no Chrome at $CHROME (LORY_CHROME names another)"
    echo
fi
if [ ${#failed[@]} -eq 0 ]; then
    echo "✓ lory: every step passes ($CROW)"
else
    echo "✗ lory: ${failed[*]} failed ($CROW)"
    exit 1
fi
