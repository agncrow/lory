# Contributing

Lory is in alpha, developed by Vijay Sriram at aggnr. During the alpha it
takes no pull requests. Its controls and the Crow they are written in still
change between releases, and every line is kept under one hand. A pull
request is closed with this note by a workflow, so nobody waits on one.

What is welcome, in Issues:

- **A bug**, with the program that shows it and what each mode said:
  `crow run -i file.co` and `crow run file.co`. Lory's answers are held
  to be the same in both, so a difference between them is a bug by itself.
- **A component that behaves differently from its reference.** Name the
  reference (a Radix primitive, a Vuetify component, a Chart.js chart) and
  say what it does that Lory's does not. docs/components/ says what each
  is held to.
- **A question** that the README, the component pages or the design does not
  answer.
- **What you built with it.**

Working from a checkout: `./test.sh` runs the whole suite, which is every
package's tests in both modes, the parity checks against the reference
libraries, every example built for the web, and a walk in a made-up headset
when Chrome is there.
