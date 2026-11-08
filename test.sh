#!/bin/bash
# Lory's whole suite against a crow binary, from this repository's root:
# each package's test blocks and its example in both modes, Kite's
# indicators held to klinecharts' answers (tests/kite/reference.json,
# written by tests/kite/reference.py), and every example built for the
# browser (`crow build --target web`, written to examples/<name>/main_web).
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
step "kite reference" "$CROW" test tests/kite/reference.co
for dir in examples/*/; do
    name=$(basename "$dir")
    step "web $name" bash -c "cd '$dir' && '$CROW' build --target web main.co"
done
if [ ${#failed[@]} -eq 0 ]; then
    echo "✓ lory: every step passes ($CROW)"
else
    echo "✗ lory: ${failed[*]} failed ($CROW)"
    exit 1
fi
