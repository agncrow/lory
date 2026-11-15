#!/usr/bin/env python3
"""Lory's sound package held to Tone.js's own answers.

Runs Tone.js (the copy installed where the first argument says: the `tone`
folder under node_modules, pinned to 15.1.22) in headless Chrome on fixed
inputs: its time and pitch notation, its envelopes' and parameters' values,
its transport's events, and patches rendered offline (Tone.Offline at a
fixed rate) measured as sound.analysis measures them. reference.js, beside
this script, is the page's code; what it posts is written beside this
script as reference.json, which reference.co holds the package to.

    npm install --prefix <ref> tone@15.1.22
    python3 -I tests/sound/reference.py <ref>/node_modules/tone

Nothing else is downloaded: the browser is this Mac's Chrome (LORY_CHROME
names another), and the rest is Python's own library.
"""
import functools
import http.server
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import threading

HERE = os.path.dirname(os.path.abspath(__file__))
CHROME = os.environ.get('LORY_CHROME') or '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
PINNED = '15.1.22'

PAGE = """<!doctype html><html><head><meta charset="utf-8"><title>tone reference</title></head>
<body><script src="Tone.js"></script><script src="reference.js"></script></body></html>"""


def free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    tone = os.path.expanduser(sys.argv[1])
    with open(os.path.join(tone, 'package.json')) as f:
        version = json.load(f)['version']
    if version != PINNED:
        print(f'tone is {version} at {tone}, and this script is pinned to {PINNED}')
        return 1
    folder = tempfile.mkdtemp(prefix='lory-sound-reference-')
    got = {}
    done = threading.Event()

    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def do_POST(self):
            n = int(self.headers.get('Content-Length', 0))
            got['body'] = self.rfile.read(n)
            self.send_response(200)
            self.end_headers()
            done.set()

    try:
        shutil.copy(os.path.join(tone, 'build', 'Tone.js'), folder)
        shutil.copy(os.path.join(HERE, 'reference.js'), folder)
        with open(os.path.join(folder, 'page.html'), 'w') as f:
            f.write(PAGE)
        port = free_port()
        server = http.server.ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Handler, directory=folder))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        chrome = subprocess.Popen([CHROME, '--headless=new', '--no-first-run', '--no-default-browser-check',
                                   '--autoplay-policy=no-user-gesture-required', '--mute-audio',
                                   f'--user-data-dir={folder}/profile', f'http://127.0.0.1:{port}/page.html'],
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        finished = done.wait(600)
        chrome.terminate()
        try:
            chrome.wait(10)
        except subprocess.TimeoutExpired:
            chrome.kill()
        server.shutdown()
        if not finished:
            print('the page posted nothing in ten minutes')
            return 1
        answer = json.loads(got['body'])
        if not answer.get('ok'):
            print('the page failed:', answer.get('error'))
            return 1
        with open(os.path.join(HERE, 'reference.json'), 'w') as f:
            json.dump(answer, f, separators=(',', ':'))
        parts = ', '.join(f'{k} {len(v)}' for k, v in answer.items() if isinstance(v, list))
        print(f'wrote reference.json from Tone {answer["tone"]}: {parts}')
        return 0
    finally:
        shutil.rmtree(folder, ignore_errors=True)


if __name__ == '__main__':
    sys.exit(main())
