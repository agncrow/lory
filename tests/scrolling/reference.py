"""lory.scrolling held to the libraries it re-implements.

Runs each reference library, at a pinned version, in headless Chrome on
fixed pages (the pages beside this script, in pages/), and writes what they
did as reference.json, which reference.co holds lory.scrolling to, number
for number:

- AOS 2.3.4 (npm's latest, the line the AOS site's demo runs) and AOS
  3.0.0-beta.6 (npm's `next`, the one with `mirror`): where each element's
  animation starts and ends as the page scrolls, by its offset, anchor and
  anchor placement, `once` and `mirror`; the duration, delay and easing its
  stylesheet gives; each easing's curve as the browser draws it; each
  animation's look hidden, shown and on its way; a transition turned back
  halfway (pages/aos.html).
- Motion 14.7.1: a scroll's progress through a target, its offsets
  ("start end", "end start", pixels, percentages, `vh`) resolved into
  numbers, at fixed scroll positions (pages/motion.html).
- Lenis 1.3.27: a wheel's smoothed scroll, frame by frame, and an animated
  `scrollTo` (pages/lenis.html).
- fullPage.js 4.0.41 (GPLv3: run here to learn its numbers, never copied
  into Lory): its defaults, the move's speed and easing, the keyboard, the
  navigation dots and anchors, loops and continuous scrolling, slides and
  their arrows, fitting to a section, the responsive fallback, lazy
  loading (pages/fullpage.html).

The libraries are read where a pinned install put them (never inside Lory):

    npm install --prefix <scratch>/ref aos@2.3.4 aos3@npm:aos@3.0.0-beta.6 \\
        motion@14.7.1 lenis@1.3.27 fullpage.js@4.0.41
    python3 -I tests/scrolling/reference.py <scratch>/ref/node_modules

Nothing is downloaded: the browser is this Mac's Chrome (LORY_CHROME names
another), and the rest is Python's own library.
"""
import functools
import html
import http.server
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import threading

HERE = os.path.dirname(os.path.abspath(__file__))
CHROME = os.environ.get('LORY_CHROME') or '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
VERSIONS = {'aos': '2.3.4', 'aos3': '3.0.0-beta.6', 'motion': '14.7.1', 'lenis': '1.3.27', 'fullpage.js': '4.0.41'}

# (the page, what it is asked, the budget of virtual time it may take)
RUNS = [
    ('aos.html', 'v=aos&run=defaults', 60000),
    ('aos.html', 'v=aos&run=once', 60000),
    ('aos.html', 'v=aos3&run=defaults', 60000),
    ('aos.html', 'v=aos3&run=moved', 60000),
    ('aos.html', 'v=aos3&run=once', 60000),
    ('aos.html', 'v=aos3&run=mirror', 60000),
    ('aos.html', 'v=aos3&run=timing', 60000),
    ('motion.html', '', 60000),
    ('lenis.html', '', 60000),
    ('fullpage.html', 'run=defaults', 10000),
    ('fullpage.html', 'run=keys', 40000),
    ('fullpage.html', 'run=lock', 30000),
    ('fullpage.html', 'run=wheel', 200000),
    ('fullpage.html', 'run=nav', 30000),
    ('fullpage.html', 'run=anchors#three', 30000),
    ('fullpage.html', 'run=anchors_still#three', 10000),
    ('fullpage.html', 'run=loops', 20000),
    ('fullpage.html', 'run=continuous', 20000),
    ('fullpage.html', 'run=slides', 30000),
    ('fullpage.html', 'run=slides_still', 20000),
    ('fullpage.html', 'run=fit', 40000),
    ('fullpage.html', 'run=fit_off', 20000),
    ('fullpage.html', 'run=scrollbar', 20000),
    ('fullpage.html', 'run=script', 20000),
    ('fullpage.html', 'run=speed', 20000),
    ('fullpage.html', 'run=responsive', 30000),
    ('fullpage.html', 'run=lazy', 30000),
    ('fullpage.html', 'run=hidden', 20000),
    ('fullpage.html', 'run=overflow', 30000),
    ('fullpage.html', 'run=heights', 20000),
    ('fullpage.html', 'run=refused', 20000),
]


def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def check_versions(lib):
    for name, want in VERSIONS.items():
        with open(os.path.join(lib, name, 'package.json')) as f:
            got = json.load(f)['version']
        if got != want:
            sys.exit(f'{name} is {got} at {lib}; the reference is {want}')


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    lib = os.path.abspath(os.path.expanduser(sys.argv[1]))
    check_versions(lib)
    only = sys.argv[2] if len(sys.argv) > 2 else ''
    folder = tempfile.mkdtemp(prefix='lory-scrolling-ref-')
    try:
        os.symlink(lib, os.path.join(folder, 'lib'))
        for name in os.listdir(os.path.join(HERE, 'pages')):
            shutil.copy(os.path.join(HERE, 'pages', name), folder)
        port = free_port()
        quiet = type('Quiet', (http.server.SimpleHTTPRequestHandler,), {'log_message': lambda *a: None})
        server = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(quiet, directory=folder))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        found = {}
        path = os.path.join(HERE, 'reference.json')
        if only and os.path.exists(path):
            with open(path) as f:
                found = json.load(f)
        for page, query, budget in RUNS:
            key = page.split('.')[0] + ('?' + query if query else '')
            if only and only not in key:
                continue
            url = f'http://127.0.0.1:{port}/{page}' + ('?' + query if query else '')
            dom = subprocess.run([CHROME, '--headless=new', '--window-size=1000,800', '--hide-scrollbars',
                                  f'--user-data-dir={folder}/profile', f'--virtual-time-budget={budget}',
                                  '--dump-dom', url], capture_output=True, text=True, timeout=600).stdout
            said = re.search(r'<pre id="out">(.*?)</pre>', dom, re.S)
            text = html.unescape(said.group(1)) if said else ''
            if not text.startswith('{'):
                sys.exit(f'{key}: the page said nothing of what it found: {text[:300] or dom[:300]}')
            found[key] = json.loads(text)
            print(f'{key}: {len(text)} characters')
        server.shutdown()
        found['versions'] = VERSIONS
        with open(path, 'w') as f:
            json.dump(found, f, separators=(',', ':'))
        print(f'wrote {path}')
    finally:
        shutil.rmtree(folder, ignore_errors=True)


main()
