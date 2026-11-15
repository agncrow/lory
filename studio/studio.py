#!/usr/bin/env python3
"""Lory Studio, from a shell.

    python3 studio.py serve [BUILD]        the Studio's page on http://localhost:3990/studio/ (and a
                                           web build's folder beside it, at /), with the helper the
                                           page's "real headset" panel speaks to
    python3 studio.py walk WALK.json       a walk taken in a headless browser's made-up headset: its
                                           steps told, its pictures held to the ones kept beside it
                                           (WALK.shots/), `--update` to keep the new ones instead
    python3 studio.py profile WALK.json    where a frame's time goes once the walk is taken: by kind
                                           (memory, JSON, Crow's runtime, the program) and by function
    python3 studio.py device state         the headset on the cable: what it is, what it shows
    python3 studio.py device open URL      a page opened in its browser (this Mac's port reached)
    python3 studio.py device shot FILE     a picture of what its display shows, both eyes
    python3 studio.py device record        its page's doings in VR kept from now on
    python3 studio.py device take FILE     the recording taken (played back in the Studio's page, or
                                           by a walk's `replay` step), and how its frames went
    python3 studio.py device cost          how the frames recorded so far went (how many a second, what each cost)
    python3 studio.py device profile       where its frames' time goes, watched a few seconds (worn, in VR)
    python3 studio.py device eval JS       JavaScript run in its page
    python3 studio.py device awake|rest    its display kept lit off the face, and given back

Nothing is installed or downloaded: the browser is this Mac's Chrome
(LORY_CHROME names another), the cable tool is `adb` where one is installed,
and the rest is Python's own library. The headset tools only read, but for
`open` (a page shown), `record` and `eval` (scripts run in the page shown)
and `awake` (the headset's wear sensor answered for: `rest` gives it back).
"""
import argparse
import atexit
import base64
import http.server
import json
import os
import shutil
import socket
import struct
import subprocess
import sys
import tempfile
import threading
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(HERE, 'web')
CHROME = os.environ.get('LORY_CHROME') or '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
ADB = os.environ.get('LORY_ADB') or shutil.which('adb') or '/opt/homebrew/bin/adb'
PORT = 3990
DEVTOOLS = 9333
TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
         '.wasm': 'application/wasm', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
         '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.map': 'application/json'}


def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()


class Refused(Exception):
    """Something that could not be done, said in a line."""


# ---- a browser's page, spoken to over its debugging socket ----

class Tab:
    def __init__(self, ws_url, timeout=30):
        u = urllib.parse.urlparse(ws_url)
        self.s = socket.create_connection((u.hostname, u.port), timeout=timeout)
        key = base64.b64encode(os.urandom(16)).decode()
        self.s.sendall(('GET %s HTTP/1.1\r\nHost: %s:%d\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
                        'Sec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n' % (u.path, u.hostname, u.port, key)).encode())
        head = b''
        while b'\r\n\r\n' not in head:
            got = self.s.recv(4096)
            if not got:
                raise Refused('the browser closed its debugging socket')
            head += got
        if b' 101 ' not in head.split(b'\r\n', 1)[0]:
            raise Refused('the browser refused its debugging socket: %s' % head.split(b'\r\n', 1)[0].decode('latin-1'))
        self.rest = head.split(b'\r\n\r\n', 1)[1]
        self.n = 0
        self.events = []

    def _send(self, op, data):
        n = len(data)
        if n < 126:
            h = struct.pack('!BB', 0x80 | op, 0x80 | n)
        elif n < 65536:
            h = struct.pack('!BBH', 0x80 | op, 0x80 | 126, n)
        else:
            h = struct.pack('!BBQ', 0x80 | op, 0x80 | 127, n)
        # (a client's frame is masked; a mask of zeros leaves the bytes as they are)
        self.s.sendall(h + b'\x00\x00\x00\x00' + data)

    def _take(self, n):
        while len(self.rest) < n:
            got = self.s.recv(1 << 16)
            if not got:
                raise Refused('the browser closed its debugging socket')
            self.rest += got
        out, self.rest = self.rest[:n], self.rest[n:]
        return out

    def _message(self):
        whole = b''
        while True:
            b0, b1 = self._take(2)
            n = b1 & 0x7f
            if n == 126:
                n = struct.unpack('!H', self._take(2))[0]
            elif n == 127:
                n = struct.unpack('!Q', self._take(8))[0]
            body = self._take(n)
            op = b0 & 0x0f
            if op == 9:
                self._send(10, body)
            elif op == 8:
                raise Refused('the browser closed its debugging socket')
            elif op in (0, 1, 2):
                whole += body
                if b0 & 0x80:
                    return json.loads(whole.decode('utf-8'))

    def ask(self, method, params=None, timeout=30):
        self.n += 1
        mine = self.n
        self.s.settimeout(timeout)
        self._send(1, json.dumps({'id': mine, 'method': method, 'params': params or {}}).encode('utf-8'))
        try:
            while True:
                m = self._message()
                if m.get('id') == mine:
                    if 'error' in m:
                        raise Refused('%s: %s' % (method, m['error'].get('message', m['error'])))
                    return m.get('result', {})
                if 'method' in m:
                    self.events.append(m)
        except socket.timeout:
            raise Refused('%s was not answered in %d s' % (method, timeout))

    def evaluate(self, js, timeout=30, gesture=False):
        """An expression's value (a promise's, once kept), as JSON gives it."""
        r = self.ask('Runtime.evaluate', {'expression': js, 'awaitPromise': True, 'returnByValue': True, 'userGesture': gesture}, timeout)
        if 'exceptionDetails' in r:
            d = r['exceptionDetails']
            raise Refused('the page threw: %s' % (d.get('exception', {}).get('description') or d.get('text') or json.dumps(d)[:400]))
        return r.get('result', {}).get('value')

    def said(self):
        """What the page logged as errors, and what it threw, since last asked."""
        out = []
        for m in self.events:
            if m['method'] == 'Runtime.exceptionThrown':
                d = m['params']['exceptionDetails']
                out.append('threw: ' + (d.get('exception', {}).get('description') or d.get('text', '')))
            elif m['method'] == 'Runtime.consoleAPICalled' and m['params'].get('type') in ('error', 'warning'):
                out.append(m['params']['type'] + ': ' + ' '.join(str(a.get('value', a.get('description', ''))) for a in m['params'].get('args', [])))
        self.events = []
        return out

    def close(self):
        try:
            self.s.close()
        except OSError:
            pass


def pages(port):
    with urllib.request.urlopen('http://127.0.0.1:%d/json/list' % port, timeout=6) as r:
        return [t for t in json.load(r) if t.get('type') == 'page']


# ---- this Mac's Chrome, headless ----

class Chrome:
    def __init__(self, show=False, size=(1280, 900)):
        if not os.path.exists(CHROME):
            raise Refused('no Chrome at %s (LORY_CHROME names another)' % CHROME)
        self.dir = tempfile.mkdtemp(prefix='lory-studio-')
        args = [CHROME, '--remote-debugging-port=0', '--user-data-dir=' + self.dir, '--no-first-run', '--no-default-browser-check',
                '--disable-extensions', '--mute-audio', '--hide-scrollbars', '--window-size=%d,%d' % size, '--ignore-gpu-blocklist',
                '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
                'about:blank']
        if not show:
            args.insert(1, '--headless=new')
        self.p = subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        atexit.register(self.close)
        told = os.path.join(self.dir, 'DevToolsActivePort')
        till = time.time() + 20
        while not os.path.exists(told):
            if time.time() > till or self.p.poll() is not None:
                raise Refused('Chrome did not start')
            time.sleep(0.05)
        time.sleep(0.05)
        self.port = int(read(told).split('\n')[0])

    def tab(self):
        till = time.time() + 10
        while True:
            found = pages(self.port)
            if found:
                return Tab(found[0]['webSocketDebuggerUrl'])
            if time.time() > till:
                raise Refused('Chrome opened no page')
            time.sleep(0.1)

    def close(self):
        if self.p and self.p.poll() is None:
            self.p.terminate()
            try:
                self.p.wait(5)
            except subprocess.TimeoutExpired:
                self.p.kill()
        self.p = None
        shutil.rmtree(self.dir, ignore_errors=True)


# ---- the headset on the cable ----

def adb(*args, timeout=20, text=True):
    if not ADB or not os.path.exists(ADB):
        raise Refused('no `adb` is installed here (the cable tool: `brew install android-platform-tools` is one way)')
    try:
        r = subprocess.run([ADB] + list(args), capture_output=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        raise Refused('adb %s was not answered' % args[0])
    if r.returncode != 0:
        raise Refused((r.stderr or r.stdout).decode('utf-8', 'replace').strip() or 'adb %s failed' % args[0])
    return r.stdout.decode('utf-8', 'replace') if text else r.stdout


class Headset:
    """The headset's browser page, reached through the cable; one socket kept."""

    def __init__(self):
        self.lock = threading.Lock()
        self.held = None
        self.held_id = ''
        self.forwarded = False

    def name(self):
        for line in adb('devices', '-l').split('\n')[1:]:
            parts = line.split()
            if len(parts) >= 2 and parts[1] == 'device':
                model = [p[6:] for p in parts if p.startswith('model:')]
                return (model[0] if model else parts[0]).replace('_', ' ')
            if len(parts) >= 2 and parts[1] == 'unauthorized':
                raise Refused('the headset is on the cable but has not allowed this Mac (put it on and allow USB debugging)')
        raise Refused('no headset is on the cable (Developer Mode on, the cable in, USB debugging allowed in the headset)')

    def reverses(self):
        out = []
        for line in adb('reverse', '--list').split('\n'):
            parts = line.split()
            if len(parts) >= 3 and parts[1].startswith('tcp:') and parts[1] == parts[2]:
                out.append(int(parts[1][4:]))
        return sorted(out)

    def awake(self):
        return 'mWakefulness=Awake' in adb('shell', 'dumpsys', 'power')

    def forward(self):
        if not self.forwarded:
            adb('forward', 'tcp:%d' % DEVTOOLS, 'localabstract:chrome_devtools_remote')
            self.forwarded = True
            atexit.register(self.unforward)

    def unforward(self):
        if self.forwarded:
            self.forwarded = False
            try:
                adb('forward', '--remove', 'tcp:%d' % DEVTOOLS)
            except Refused:
                pass

    def tabs(self):
        self.forward()
        try:
            return pages(DEVTOOLS)
        except OSError:
            return []

    def tab(self, prefix=''):
        """The page spoken to: the one at `prefix`, else the first one this Mac serves, else the first."""
        found = self.tabs()
        if not found:
            raise Refused('the headset\'s browser shows no page (is the browser open there?)')
        local = [t for t in found if t.get('url', '').startswith(('http://localhost', 'http://127.0.0.1'))]
        pick = ([t for t in found if prefix and t.get('url', '').startswith(prefix)] or local or found)[0]
        if self.held is None or self.held_id != pick['id']:
            if self.held:
                self.held.close()
            self.held = Tab(pick['webSocketDebuggerUrl'], timeout=10)
            self.held_id = pick['id']
        return self.held, pick

    def run(self, js, timeout=15, prefix='', gesture=False):
        with self.lock:
            try:
                tab, _ = self.tab(prefix)
                return tab.evaluate(js, timeout, gesture)
            except (OSError, Refused):
                if self.held:
                    self.held.close()
                self.held = None
                raise

    def state(self):
        out = {'device': None, 'reverses': [], 'tabs': [], 'recording': None}
        try:
            out['device'] = self.name()
            out['reverses'] = self.reverses()
            out['worn'] = self.awake()
            out['tabs'] = [{'url': t.get('url', ''), 'title': t.get('title', '')} for t in self.tabs()]
            if out['tabs'] and out['worn']:
                try:
                    out['recording'] = self.run('window.LoryHeadset && LoryHeadset.kept ? LoryHeadset.told(LoryHeadset.kept) : null', timeout=3)
                except Refused:
                    pass
        except Refused as e:
            out['why'] = str(e)
        return out

    def open(self, url):
        u = urllib.parse.urlparse(url)
        if u.scheme not in ('http', 'https'):
            raise Refused('a page\'s address begins http:// or https://')
        if u.hostname in ('localhost', '127.0.0.1') and u.port and u.port not in self.reverses():
            adb('reverse', 'tcp:%d' % u.port, 'tcp:%d' % u.port)
        with self.lock:
            try:
                tab, _ = self.tab()
                tab.ask('Page.navigate', {'url': url}, 10)
                # (and, once there, loaded again past the browser's cache: a
                # Quest's keeps a page's scripts and its build a while, and a
                # page changed on this Mac would be seen there as it was)
                time.sleep(2.0)
                tab.ask('Page.reload', {'ignoreCache': True}, 10)
            except (OSError, Refused):
                if self.held:
                    self.held.close()
                self.held = None
                adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url)
        return {'url': url}

    def record(self, keep=False):
        script = read(os.path.join(WEB, 'headset.js'))
        js = script + '\n;(' + ('(LoryHeadset.kept && LoryHeadset.kept.live) || ' if keep else '') + 'LoryHeadset.record()), location.href'
        return {'url': self.run(js, 15)}

    def take(self):
        got = self.run('window.LoryHeadset ? JSON.stringify(LoryHeadset.take()) : "null"', 60)
        return json.loads(got or 'null')

    def latest(self, since):
        return self.run('window.LoryHeadset ? LoryHeadset.latest(%s) : null' % json.dumps(float(since)), 4)

    def shot(self):
        png = adb('exec-out', 'screencap', '-p', timeout=30, text=False)
        if not png.startswith(b'\x89PNG'):
            raise Refused('the headset gave no picture of its display (asleep it gives none: worn, or kept awake, it does)')
        return png


# ---- the Studio's page served, a build's folder beside it, and the helper ----

def local(origin):
    u = urllib.parse.urlparse(origin or '')
    return u.scheme in ('http', 'https') and u.hostname in ('localhost', '127.0.0.1', '[::1]', '::1')


def handler(build, headset):
    class Handler(http.server.BaseHTTPRequestHandler):
        server_version = 'LoryStudio'
        protocol_version = 'HTTP/1.1'

        def log_message(self, *a):
            pass

        def send(self, code, body, kind='text/plain; charset=utf-8', more=None):
            if isinstance(body, str):
                body = body.encode('utf-8')
            self.send_response(code)
            self.send_header('Content-Type', kind)
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            origin = self.headers.get('Origin')
            if origin and local(origin):
                self.send_header('Access-Control-Allow-Origin', origin)
                self.send_header('Vary', 'Origin')
            for k, v in (more or {}).items():
                self.send_header(k, v)
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(body)

        # (the helper is this Mac's alone: asked by its own name, from a
        # page of its own, with a header no other site's page may send)
        def allowed(self):
            host = (self.headers.get('Host') or '').rsplit(':', 1)[0]
            if host not in ('localhost', '127.0.0.1', '[::1]'):
                return False
            origin = self.headers.get('Origin')
            return (not origin or local(origin)) and self.headers.get('X-Lory-Studio') == '1'

        def do_OPTIONS(self):
            origin = self.headers.get('Origin')
            if not local(origin):
                return self.send(403, 'not from here')
            self.send(204, b'', more={'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'X-Lory-Studio, Content-Type', 'Access-Control-Max-Age': '600'})

        def device(self, path, query, body):
            if not self.allowed():
                return self.send(403, 'the helper answers the Studio\'s page of this Mac only')
            try:
                if path == '/device/state':
                    out = headset.state()
                elif path == '/device/latest':
                    out = headset.latest(query.get('since', ['0'])[0])
                elif path == '/device/shot.png':
                    return self.send(200, headset.shot(), 'image/png')
                elif self.command != 'POST':
                    return self.send(405, 'that is asked with POST')
                elif path == '/device/open':
                    out = headset.open(str(body.get('url', '')))
                elif path == '/device/record':
                    out = headset.record(bool(body.get('keep')))
                elif path == '/device/take':
                    out = headset.take()
                else:
                    return self.send(404, 'the helper has no ' + path)
            except Refused as e:
                return self.send(409, str(e))
            except (OSError, ValueError) as e:
                return self.send(500, str(e))
            self.send(200, json.dumps(out), 'application/json')

        def file(self, path):
            if path == '/studio':
                return self.send(301, '', more={'Location': '/studio/'})
            if path.startswith('/studio/'):
                root, rel = WEB, path[len('/studio/'):]
            elif build:
                root, rel = build, path[1:]
            else:
                return self.send(404, 'nothing is served at ' + path + ' (the Studio\'s page is at /studio/)')
            full = os.path.realpath(os.path.join(root, urllib.parse.unquote(rel)))
            if os.path.isdir(full):
                full = os.path.join(full, 'index.html')
            if not (full == os.path.realpath(root) or full.startswith(os.path.realpath(root) + os.sep)) or not os.path.isfile(full):
                return self.send(404, 'there is no ' + path)
            with open(full, 'rb') as f:
                self.send(200, f.read(), TYPES.get(os.path.splitext(full)[1].lower(), 'application/octet-stream'))

        def do_GET(self):
            u = urllib.parse.urlparse(self.path)
            if u.path.startswith('/device/'):
                return self.device(u.path, urllib.parse.parse_qs(u.query), {})
            self.file(u.path)

        do_HEAD = do_GET

        def do_POST(self):
            u = urllib.parse.urlparse(self.path)
            n = int(self.headers.get('Content-Length') or 0)
            raw = self.rfile.read(n) if n else b''
            if not u.path.startswith('/device/'):
                return self.send(404, 'nothing takes a POST at ' + u.path)
            try:
                body = json.loads(raw.decode('utf-8')) if raw else {}
            except ValueError:
                return self.send(400, 'the body is not JSON')
            self.device(u.path, urllib.parse.parse_qs(u.query), body if isinstance(body, dict) else {})

    return Handler


def serving(build, port, headset):
    class Server(http.server.ThreadingHTTPServer):
        daemon_threads = True
        allow_reuse_address = True
    try:
        return Server(('127.0.0.1', port), handler(build, headset))
    except OSError as e:
        raise Refused('port %d cannot be listened on: %s' % (port, e))


def serve(args):
    build = os.path.abspath(args.build) if args.build else ''
    if build and not os.path.isdir(build):
        raise Refused('there is no folder ' + build)
    server = serving(build, args.port, Headset())
    print('Lory Studio: http://localhost:%d/studio/%s' % (args.port, '?at=/index.html' if build else ''))
    print('  ' + ('the build %s at /' % build if build else 'no build beside it: open the Studio a site serves (its /studio/), and this is its helper'))
    print('  the helper speaks to a headset on the cable, where there is one (Ctrl-C ends it)')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print()


# ---- a walk, in a headless browser ----

class Walked:
    """A walk's page opened in a headless browser, a made-up headset in it."""

    def __init__(self, args):
        self.path = os.path.abspath(args.walk)
        if not os.path.isfile(self.path):
            raise Refused('there is no walk ' + self.path)
        try:
            self.w = json.loads(read(self.path))
        except ValueError as e:
            raise Refused('the walk is not JSON (%s): %s' % (e, self.path))
        folder = os.path.dirname(self.path)
        self.kept = os.path.splitext(self.path)[0] + '.shots'
        self.server = None
        self.chrome = None
        at = args.at or self.w.get('at') or ''
        if self.w.get('build') and not args.at:
            build = os.path.normpath(os.path.join(folder, self.w['build']))
            if not os.path.isdir(build):
                raise Refused('the walk\'s build is not there: %s (build it: `crow build --target web …`)' % build)
            self.server = serving(build, 0, Headset())
            threading.Thread(target=self.server.serve_forever, daemon=True).start()
            at = 'http://localhost:%d%s' % (self.server.server_address[1], at or '/index.html')
        if not at.startswith('http'):
            raise Refused('the walk says no page to walk: an "at" that is a whole address, or a "build" folder beside it')
        self.at = at
        self.refs = {}
        if os.path.isdir(self.kept) and not getattr(args, 'update', False):
            for name in os.listdir(self.kept):
                if name.endswith('.png'):
                    with open(os.path.join(self.kept, name), 'rb') as f:
                        self.refs[name[:-4]] = 'data:image/png;base64,' + base64.b64encode(f.read()).decode()
        self.recs = {}
        for name, file in (self.w.get('recordings') or {}).items():
            self.recs[name] = json.loads(read(os.path.join(folder, file)))
        try:
            self.chrome = Chrome(show=args.show)
            self.tab = self.chrome.tab()
            self.tab.ask('Page.enable')
            self.tab.ask('Runtime.enable')
            self.tab.ask('Page.addScriptToEvaluateOnNewDocument', {'source': read(os.path.join(WEB, 'headset.js')) + '\n' + read(os.path.join(WEB, 'walk.js')) + '\nLoryHeadset.simulate();'})
            self.tab.ask('Page.navigate', {'url': at})
            till = time.time() + 30
            while self.tab.evaluate('document.readyState') != 'complete':
                if time.time() > till:
                    raise Refused('the page did not finish loading: ' + at)
                time.sleep(0.1)
        except Refused:
            self.close()
            raise

    def taken(self, most):
        """The walk's steps taken: what each came to."""
        js = 'LoryWalk.run(%s, {references: %s, recordings: %s}).then(JSON.stringify)' % (json.dumps(self.w), json.dumps(self.refs), json.dumps(self.recs))
        try:
            return json.loads(self.tab.evaluate(js, timeout=most))
        except Refused as e:
            for line in self.tab.said():
                print('  the page: ' + line[:300])
            raise Refused('the walk could not be taken: %s' % e)

    def close(self):
        if self.chrome:
            self.chrome.close()
        if self.server:
            self.server.shutdown()
        self.chrome = self.server = None


def told_steps(got, w):
    for s in got['steps']:
        print('  %s %2d %-8s %s' % ('ok ' if s['ok'] else 'NOT', s['n'], s['do'], (s.get('shot', '') + ': ' if s.get('shot') else '') + s.get('said', '')))
        seen = set()
        for t in (s.get('targets') or {}).get('small', []):
            key = (t['name'], round(t.get('dp_w', 0)), round(t.get('dp_h', 0)))
            if key in seen or len(seen) >= 12:
                continue
            seen.add(key)
            print('             %-30s %4.0f by %3.0f dp (%.1f° by %.1f°), %+.0f° to the side%s' % ((t['name'] or t['kind'])[:30], t.get('dp_w', 0), t.get('dp_h', 0), t['wide'], t['tall'], t['turn'], ', askew' if t.get('askew') else ''))
    if len(got['steps']) < len(w.get('steps', [])):
        print('  the walk ended there: %d steps were not taken' % (len(w['steps']) - len(got['steps'])))


def walk(args):
    page = Walked(args)
    w, at, kept, refs = page.w, page.at, page.kept, page.refs
    out = os.path.abspath(args.out) if args.out else os.path.splitext(page.path)[0] + '.out'
    try:
        if not args.json:
            print('walk "%s" at %s' % (w.get('name') or os.path.basename(page.path), at))
        got = page.taken(args.most)
        said = page.tab.said()
    finally:
        page.close()
    fresh, differed = [], []
    for name, url in got.get('shots', {}).items():
        png = base64.b64decode(url.split(',', 1)[1])
        if name not in refs:
            os.makedirs(kept, exist_ok=True)
            with open(os.path.join(kept, name + '.png'), 'wb') as f:
                f.write(png)
            fresh.append(name)
        elif name in got.get('diffs', {}) or any(s.get('shot') == name and not s['ok'] for s in got['steps']):
            os.makedirs(out, exist_ok=True)
            with open(os.path.join(out, name + '.png'), 'wb') as f:
                f.write(png)
            if got['diffs'].get(name):
                with open(os.path.join(out, name + '.diff.png'), 'wb') as f:
                    f.write(base64.b64decode(got['diffs'][name].split(',', 1)[1]))
            differed.append(name)
    if args.json:
        for s in got['steps']:
            s.pop('quad', None)
        print(json.dumps({'name': got.get('name'), 'ok': got['ok'], 'at': at, 'steps': got['steps'], 'kept': kept, 'new': fresh, 'differed': differed, 'page': said}, indent=1))
    else:
        told_steps(got, w)
        for line in said[:12]:
            print('  the page: ' + line[:300])
        if fresh:
            print('  %s: %s in %s' % ('kept anew' if args.update else 'new pictures kept', ', '.join(fresh), kept))
        if differed:
            print('  pictures that differ (and where) are in %s: %s' % (out, ', '.join(differed)))
        print('walked: ' + ('every step held' if got['ok'] else 'a step did not hold'))
    return 0 if got['ok'] else 1


# ---- where a frame's time goes ----

ESCAPES = {'$LT$': '<', '$GT$': '>', '$C$': ',', '$RF$': '&', '$BP$': '*', '$SP$': '@', '$LP$': '(', '$RP$': ')'}


def plain(name):
    """A compiled function's name as its path: `_ZN4room12charts_drawn17h…E` is room::charts_drawn."""
    body = name
    while body and body[-1].isdigit() and '.' in body[-8:]:
        body = body.rsplit('.', 1)[0]
    if body.startswith('_ZN') and body.endswith('E'):
        parts, i, body = [], 0, body[3:-1]
        while i < len(body) and body[i].isdigit():
            j = i
            while j < len(body) and body[j].isdigit():
                j += 1
            n = int(body[i:j])
            parts.append(body[j:j + n])
            i = j + n
        if parts and len(parts[-1]) == 17 and parts[-1][0] == 'h' and all(c in '0123456789abcdef' for c in parts[-1][1:]):
            parts.pop()
        body = '::'.join(parts)
    elif body.startswith('_R'):
        # (the newer naming: the name itself is its last part, its length before it)
        i = 0
        while i < len(body):
            if body[i].isdigit():
                j = i
                while j < len(body) and body[j].isdigit():
                    j += 1
                n, rest = int(body[i:j]), body[j:]
                if len(rest) == n or (rest.startswith('_') and len(rest) - 1 == n):
                    body = rest[len(rest) - n:]
                    break
                i = j
            else:
                i += 1
    for k, v in ESCAPES.items():
        body = body.replace(k, v)
    out, i = '', 0
    while i < len(body):
        if body[i] == '$' and body[i + 1:i + 2] == 'u':
            j = body.find('$', i + 2)
            try:
                out += chr(int(body[i + 2:j], 16))
                i = j + 1
                continue
            except ValueError:
                pass
        out += body[i]
        i += 1
    return out.replace('..', '::').replace('_<', '<')


def kind_of(name, url):
    # (a page may run more programs than one: a function is its own module's)
    program = url.rsplit('/', 1)[-1].split('.wasm')[0] if '.wasm' in url else ''
    if url.endswith('.js') or (url and '.wasm' not in url):
        return 'the loader (crow.js)' if url.endswith('crow.js') else 'the page\'s own script'
    if not url:
        return 'the browser' if name.startswith('(') else 'the page\'s own script'
    if 'dlmalloc' in name or '__rdl_' in name or '__rust_' in name or name.startswith('alloc::alloc'):
        return 'memory taken and given back'
    if 'serde_json' in name:
        return 'JSON written and read'
    if name.startswith('crow_runtime') or '<crow_runtime' in name:
        return 'Crow\'s runtime'
    mine = name.replace('<', '').lstrip('&')
    if mine.startswith(program + '::'):
        rest = mine[len(program) + 2:]
        return '%s: the packages it uses (%s)' % (program, rest.split('·')[0]) if '·' in rest.split('::')[0] else '%s: its own functions' % program
    return 'Rust\'s library'


def profiled(tab, run, seconds=0.0):
    """A profile taken while `run` (JavaScript) runs, or for `seconds`: the time by function."""
    tab.ask('Profiler.enable')
    tab.ask('Profiler.setSamplingInterval', {'interval': 100})
    tab.ask('Profiler.start')
    said = tab.evaluate(run, timeout=300) if run else None
    if seconds:
        time.sleep(seconds)
    p = tab.ask('Profiler.stop', timeout=120)['profile']
    nodes = {n['id']: n['callFrame'] for n in p['nodes']}
    above = {}
    for n in p['nodes']:
        for child in n.get('children', []):
            above[child] = n['id']
    spent, asked = {}, {}
    owners = {}

    # whose work a sample is: the nearest function over it that is the
    # program's own or a package's (not the allocator, not Rust's library),
    # or, where there is none, the page's own script's
    def owner(node):
        if node in owners:
            return owners[node]
        at, found = node, None
        while at is not None:
            f = nodes[at]
            name, url = f['functionName'], f.get('url', '')
            if '.wasm' in url:
                nice = plain(name)
                if kind_of(nice, url).split(':')[0] not in ('memory taken and given back', 'Rust\'s library', 'Crow\'s runtime', 'JSON written and read'):
                    found = nice
                    break
            elif url and name and not found:
                found = name + ' (%s)' % url.rsplit('/', 1)[-1].split('?')[0]
                if not url.endswith('crow.js'):
                    break
            at = above.get(at)
        owners[node] = found or '(the browser)'
        return owners[node]

    for node, us in zip(p.get('samples', []), p.get('timeDeltas', [])):
        f = nodes[node]
        if f['functionName'] in ('(idle)', '(root)'):
            continue
        key = (f['functionName'] or '(a function of no name)', f.get('url', ''))
        spent[key] = spent.get(key, 0) + us
        who = owner(node)
        asked[who] = asked.get(who, 0) + us
    spent['__asked__'] = asked
    return said, spent


def told_profile(spent, most=24):
    asked = spent.pop('__asked__', {})
    total = sum(spent.values()) or 1
    kinds, names = {}, {}
    for (name, url), us in spent.items():
        nice = plain(name) if '.wasm' in url else name + (' (%s)' % url.rsplit('/', 1)[-1].split('?')[0] if url else '')
        k = kind_of(nice, url)
        kinds[k] = kinds.get(k, 0) + us
        names[nice] = names.get(nice, 0) + us
    print('where the time goes:')
    for k, us in sorted(kinds.items(), key=lambda kv: -kv[1]):
        print('  %5.1f%%  %s' % (us * 100.0 / total, k))
    print('the functions that take most of it:')
    for n, us in sorted(names.items(), key=lambda kv: -kv[1])[:most]:
        print('  %5.1f%%  %s' % (us * 100.0 / total, n if len(n) <= 110 else n[:107] + '…'))
    if asked:
        print('whose work it is (a function of the program or its packages, with all it has done for it):')
        for n, us in sorted(asked.items(), key=lambda kv: -kv[1])[:most]:
            print('  %5.1f%%  %s' % (us * 100.0 / total, n if len(n) <= 110 else n[:107] + '…'))


def profile(args):
    page = Walked(args)
    try:
        print('walk "%s" at %s' % (page.w.get('name') or os.path.basename(page.path), page.at))
        got = page.taken(args.most)
        told_steps(got, page.w)
        if not page.tab.evaluate('!!(LoryHeadset.now && LoryHeadset.now.inside)'):
            raise Refused('the walk did not end in the headset: a profile is of its frames (no `leave` at the walk\'s end)')
        cost, spent = profiled(page.tab, '(() => { const s = LoryHeadset.now; s.state.cost.length = 0; for (let i = 0; i < %d; i++) s.pump(); return s.cost(); })()' % args.frames)
    finally:
        page.close()
    print('%d frames profiled where the walk ended: a frame costs %s ms here (95 in 100 under %s)' % (args.frames, cost.get('median'), cost.get('p95')))
    told_profile(spent, args.top)
    return 0


# ---- the headset, a command at a time ----

def device(args):
    h = Headset()
    what = args.what
    if what == 'serve':
        return serve(argparse.Namespace(build='', port=args.port))
    if what == 'state':
        s = h.state()
        if not s['device']:
            raise Refused(s.get('why') or 'no headset is on the cable')
        print('%s, %s' % (s['device'], 'awake' if s.get('worn') else 'asleep (worn, it wakes)'))
        print('reaches this Mac\'s ports: %s' % (', '.join(str(p) for p in s['reverses']) or 'none (`device open` a page of this Mac, or `adb reverse tcp:3800 tcp:3800`)'))
        for t in s['tabs']:
            print('shows: %s' % t['url'])
        if s['recording']:
            print('recording: %s' % json.dumps(s['recording']))
        return 0
    if what == 'open':
        print('opened in the headset: ' + h.open(args.rest[0])['url'])
    elif what == 'shot':
        png = h.shot()
        with open(args.rest[0], 'wb') as f:
            f.write(png)
        print('%s: %d bytes (both eyes, as the display shows them)' % (args.rest[0], len(png)))
    elif what == 'eval':
        js = args.rest[0] if args.rest[0] != '-' else sys.stdin.read()
        if os.path.isfile(js):
            js = read(js)
        print(json.dumps(h.run(js, timeout=args.most, gesture=args.gesture), indent=1))
    elif what == 'record':
        print('recording in ' + h.record()['url'])
        print('(put the headset on, enter VR in that page, do what should be seen; then `device take FILE`)')
    elif what == 'take':
        got = h.take()
        if not got or not got['recording']['samples']:
            raise Refused('the headset has recorded no frame (was `device record` given, and the page then in VR?)')
        with open(args.rest[0], 'w', encoding='utf-8') as f:
            json.dump(got, f)
        print('%s: %s' % (args.rest[0], json.dumps(got['told'])))
    elif what == 'cost':
        got = h.run('window.LoryHeadset && LoryHeadset.kept ? LoryHeadset.told(LoryHeadset.kept) : null', 10)
        if not got or not got.get('frames'):
            raise Refused('nothing is recorded to time (`device record`, then the page in VR a while)')
        print(json.dumps(got, indent=1))
    elif what == 'profile':
        with h.lock:
            tab, pick = h.tab()
            print('profiling %s for %g s (worn and in VR, its frames are what is timed)' % (pick.get('url', ''), args.seconds))
            _, spent = profiled(tab, '', args.seconds)
        if not spent:
            raise Refused('the page did nothing in that time (is the headset worn, the page in VR?)')
        told_profile(spent, args.top)
    elif what == 'awake':
        adb('shell', 'am', 'broadcast', '-a', 'com.oculus.vrpowermanager.prox_close')
        adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP')
        print('the headset is kept lit off the face: its wear sensor is answered for. Give it back when done: `device rest`')
    elif what == 'rest':
        adb('shell', 'am', 'broadcast', '-a', 'com.oculus.vrpowermanager.automation_disable')
        print('the wear sensor is the headset\'s own again')
    h.unforward()
    return 0


def main():
    p = argparse.ArgumentParser(prog='studio.py', description='Lory Studio from a shell: its page served, walks taken, a headset on the cable spoken to.')
    sub = p.add_subparsers(dest='command', required=True)
    s = sub.add_parser('serve', help='the Studio\'s page, a build beside it, and the helper')
    s.add_argument('build', nargs='?', default='', help='a web build\'s folder (crow build --target web …) served at /')
    s.add_argument('--port', type=int, default=PORT)
    w = sub.add_parser('walk', help='a walk taken in a headless browser')
    w.add_argument('walk', help='the walk, a JSON file')
    w.add_argument('--at', default='', help='the page to walk, in place of the walk\'s own')
    w.add_argument('--update', action='store_true', help='keep this run\'s pictures as the ones to hold to')
    w.add_argument('--out', default='', help='where differing pictures go (WALK.out/ unless said)')
    w.add_argument('--show', action='store_true', help='a browser window, not a headless one')
    w.add_argument('--json', action='store_true', help='the whole result as JSON')
    w.add_argument('--most', type=int, default=600, help='seconds the walk may take')
    d = sub.add_parser('device', help='the headset on the cable')
    d.add_argument('what', choices=['state', 'open', 'shot', 'eval', 'record', 'take', 'cost', 'profile', 'awake', 'rest', 'serve'])
    d.add_argument('rest', nargs='*')
    d.add_argument('--port', type=int, default=PORT)
    d.add_argument('--most', type=int, default=30, help='seconds an `eval` may take')
    d.add_argument('--gesture', action='store_true', help='`eval` as if the wearer had pressed (what entering VR needs)')
    d.add_argument('--seconds', type=float, default=5.0, help='how long `profile` watches')
    d.add_argument('--top', type=int, default=24, help='how many functions `profile` names')
    f = sub.add_parser('profile', help='where a frame\'s time goes, after a walk')
    f.add_argument('walk', help='the walk that brings the page to what is profiled (it ends in the headset)')
    f.add_argument('--at', default='', help='the page to walk, in place of the walk\'s own')
    f.add_argument('--frames', type=int, default=600, help='frames profiled')
    f.add_argument('--top', type=int, default=24, help='how many functions are named')
    f.add_argument('--show', action='store_true', help='a browser window, not a headless one')
    f.add_argument('--most', type=int, default=600, help='seconds the walk may take')
    args = p.parse_args()
    try:
        if args.command == 'device' and args.what in ('open', 'shot', 'eval', 'take') and not args.rest:
            raise Refused('`device %s` takes %s' % (args.what, {'open': 'a page\'s address', 'shot': 'a file to write', 'eval': 'JavaScript (or a file of it, or - for what is typed)', 'take': 'a file to write'}[args.what]))
        return {'serve': serve, 'walk': walk, 'profile': profile, 'device': device}[args.command](args) or 0
    except Refused as e:
        print('studio: %s' % e, file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
