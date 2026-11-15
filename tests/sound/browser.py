#!/usr/bin/env python3
"""The sound example's web build, checked in headless Chrome.

    python3 -I tests/sound/browser.py [BUILD]

BUILD is the example's web build, examples/sound/main_web by default (made
by `crow build --target web main.co` in examples/sound, with a page loader
that knows `@sound`). The build is copied to a scratch folder beside a page
of this script's own, which holds the build's page in a frame of the same
origin and watches it: every buffer the page starts is counted (its rate,
channels, length and loudest sample kept), and every error thrown is kept.
The folder is served on a free port of this Mac's own address and this
Mac's Chrome (LORY_CHROME names another) opens it headless, sound allowed
to start without a press and muted. Then, as a reader would, it presses down
the left of the page a row at a time until a press plays a note. It holds:

  - the program started and drew, and nothing was thrown or said;
  - a press on the keyboard handed the page a sound it started: at 22050
    a second, longer than the note's 0.3 s, and not silent.

Python's own library alone is used; nothing is installed or downloaded.
"""
import functools
import http.server
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading

HERE = os.path.dirname(os.path.abspath(__file__))
BUILT = os.path.join(HERE, '..', '..', 'examples', 'sound', 'main_web')
CHROME = os.environ.get('LORY_CHROME') or '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
WIDE, TALL = 900, 760

WATCH = """<!doctype html><html><head><meta charset="utf-8"><title>sound check</title>
<style>html, body { margin: 0; } iframe { border: 0; width: %(w)dpx; height: %(h)dpx; display: block; }</style></head>
<body><iframe id="app" src="index.html"></iframe>
<script>
'use strict';
const seen = { ok: true, started: [], thrown: [], said: '', drew: false, pressed_at: [] };
const app = document.getElementById('app');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
app.addEventListener('load', async () => {
  const w = app.contentWindow;
  w.addEventListener('error', (e) => seen.thrown.push(String(e.message)));
  w.addEventListener('unhandledrejection', (e) => seen.thrown.push(String(e.reason)));
  const start = w.AudioBufferSourceNode.prototype.start;
  w.AudioBufferSourceNode.prototype.start = function (...a) {
    const b = this.buffer;
    let loudest = 0;
    for (let ch = 0; ch < b.numberOfChannels; ch++) for (const v of b.getChannelData(ch)) loudest = Math.max(loudest, Math.abs(v));
    seen.started.push({ rate: b.sampleRate, channels: b.numberOfChannels, frames: b.length, loudest });
    return start.apply(this, a);
  };
  try {
    for (let i = 0; i < 100 && !w.crow; i++) await wait(100);
    seen.drew = !!w.crow;
    const canvas = w.document.getElementById('page');
    const press = (type, x, y) => canvas.dispatchEvent(new w.PointerEvent(type, { pointerId: 1, pointerType: 'mouse', clientX: x, clientY: y, button: 0, buttons: type === 'pointerdown' ? 1 : 0, bubbles: true }));
    await wait(500);
    for (let y = %(h)d - 12; y > %(h)d / 3 && seen.started.length === 0; y -= 16) {
      press('pointermove', 60, y);
      await wait(60);
      press('pointerdown', 60, y);
      await wait(60);
      press('pointerup', 60, y);
      await wait(200);
      seen.pressed_at.push(y);
    }
    await wait(300);
    seen.canvas = [canvas.width, canvas.height, canvas.getBoundingClientRect().width];
    let frames = 0; const count = () => { frames++; w.requestAnimationFrame(count); }; w.requestAnimationFrame(count);
    await wait(1000); seen.frames_a_second = frames;
    const said = w.document.getElementById('said');
    seen.said = said && said.style.display === 'block' ? said.textContent : '';
  } catch (e) {
    seen.ok = false;
    seen.thrown.push(String(e && e.stack || e));
  }
  await fetch('/done', { method: 'POST', body: JSON.stringify(seen) });
});
</script></body></html>"""


def main():
    built = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else BUILT)
    if not os.path.exists(os.path.join(built, 'main.wasm')):
        print(f'no web build at {built}: run `crow build --target web main.co` in examples/sound')
        return 1
    folder = tempfile.mkdtemp(prefix='lory-sound-browser-')
    got = {}
    done = threading.Event()

    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def guess_type(self, path):
            return 'application/wasm' if path.endswith('.wasm') else super().guess_type(path)

        def do_POST(self):
            n = int(self.headers.get('Content-Length', 0))
            got['body'] = self.rfile.read(n)
            self.send_response(200)
            self.end_headers()
            done.set()

    try:
        site = os.path.join(folder, 'site')
        shutil.copytree(built, site)
        with open(os.path.join(site, 'watch.html'), 'w') as f:
            f.write(WATCH % {'w': WIDE, 'h': TALL})
        server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=site))
        port = server.server_address[1]
        threading.Thread(target=server.serve_forever, daemon=True).start()
        chrome = subprocess.Popen([CHROME, '--headless=new', '--no-first-run', '--no-default-browser-check',
                                   '--autoplay-policy=no-user-gesture-required', '--mute-audio',
                                   f'--window-size={WIDE + 20},{TALL + 20}', f'--user-data-dir={folder}/profile',
                                   f'http://127.0.0.1:{port}/watch.html'],
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        finished = done.wait(180)
        chrome.terminate()
        try:
            chrome.wait(10)
        except subprocess.TimeoutExpired:
            chrome.kill()
        server.shutdown()
        if not finished:
            print('the page posted nothing in three minutes')
            return 1
        seen = json.loads(got['body'])
        wrong = []
        if not seen['ok'] or seen['thrown']:
            wrong.append('the page threw: ' + '; '.join(seen['thrown']))
        if seen['said']:
            wrong.append('the page said: ' + seen['said'])
        if not seen['drew']:
            wrong.append('the program never started')
        if not seen['started']:
            wrong.append(f'no press played a note (pressed at {len(seen["pressed_at"])} heights)')
        else:
            s = seen['started'][0]
            if s['rate'] != 22050 or s['frames'] <= 0.3 * 22050 or s['loudest'] <= 0.01:
                wrong.append(f'the note handed was not the one made: {s}')
        if wrong:
            for w in wrong:
                print('FAIL', w)
            print({k: v for k, v in seen.items() if k != 'pressed_at'})
            return 1
        s = seen['started'][0]
        print(f'ok: the program drew; a press {TALL - seen["pressed_at"][-1]} px up the page played a note '
              f'({s["frames"]} frames at {s["rate"]}, {s["channels"]} channel(s), loudest {s["loudest"]:.3f}); nothing thrown')
        return 0
    finally:
        shutil.rmtree(folder, ignore_errors=True)


if __name__ == '__main__':
    sys.exit(main())
