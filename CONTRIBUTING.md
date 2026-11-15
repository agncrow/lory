# Contributing

Lory is in alpha, developed by Vijay Sriram at aggnr. During the alpha it
takes no pull requests. Its controls and the Crow they are written in still
change between releases, and every line is kept under one hand. A pull
request is closed with this note by a workflow, so nobody waits on one.

What is welcome, in Issues:

- **A bug**, with the program that shows it and what each mode said:
  `crow run -i file.co` and `crow run file.co`. Lory's answers are held
  to be the same in both, so a difference between them is a bug by itself.
- **A component that does not behave as you expect**, with what you did
  and what it did.
- **A question** that the README or the site's guide does not answer.
- **What you built with it.**

Working from a checkout: `./test.sh` runs the whole suite, which is every
package's tests in both modes, every example built for the web and driven
in headless Chrome, and walks in a made-up headset when Chrome is there.
