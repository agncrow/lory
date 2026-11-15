#!/bin/bash
# A program run in both of Crow's modes, what it writes held equal line for
# line: the interpreter's run (`crow run -i`) and the compiled program's
# (`crow run`). A test block runs in the interpreter even under
# `crow test --compiled`, which compiles only the apps a block opens, so
# what a module computes is held to both modes by a program that writes it
# out (tests/modes/<area>.co), and the two answers compared.
# Usage: tests/modes.sh CROW FILE.co
set -u
crow=$1
program=$2
out=$(mktemp -d)
trap 'rm -rf "$out"' EXIT
if ! "$crow" run -i "$program" > "$out/interpreted" 2> "$out/interpreted.err"; then
    echo "the interpreter stopped:"
    tail -5 "$out/interpreted.err"
    exit 1
fi
if ! "$crow" run "$program" > "$out/compiled" 2> "$out/compiled.err"; then
    echo "the compiled program stopped:"
    tail -5 "$out/compiled.err"
    exit 1
fi
if ! diff -q "$out/interpreted" "$out/compiled" > /dev/null; then
    echo "the modes differ:"
    diff "$out/interpreted" "$out/compiled" | head -20
    exit 1
fi
lines=$(wc -l < "$out/interpreted" | tr -d ' ')
if [ "$lines" -eq 0 ]; then
    echo "the program wrote nothing to compare"
    exit 1
fi
echo "$lines lines, the same in both modes"
