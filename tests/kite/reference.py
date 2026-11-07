"""Kite's indicators held to klinecharts' own answers.

Runs klinecharts (the copy a project has installed: its path is the
first argument, the `klinecharts` folder under node_modules) in headless
Chrome on fixed bars, asks it for every built-in indicator's values, and
writes them beside this script as reference.json, which reference.co
holds Kite to, number for number.

    python3 -I tests/kite/reference.py ~/code/python_projects/finch/trading_app/ui/node_modules/klinecharts

Nothing is downloaded: the library is read where it is installed.
"""
import json
import math
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

# (name, parameters): every built-in at its defaults, and a few at others
CASES = [(n, None) for n in [
    'AVP', 'AO', 'BIAS', 'BOLL', 'BRAR', 'BBI', 'CCI', 'CR', 'DMA', 'DMI', 'EMV', 'EMA', 'MTM', 'MA',
    'MACD', 'OBV', 'PVT', 'PSY', 'ROC', 'RSI', 'SMA', 'KDJ', 'SAR', 'TRIX', 'VOL', 'VR', 'WR']] + [
    ('MA', [7, 21]), ('EMA', [9, 20]), ('RSI', [14]), ('BOLL', [10, 1.5]), ('MACD', [5, 13, 4]),
    ('KDJ', [14, 5, 5]), ('VOL', [3]), ('SAR', [1, 3, 15])]


def bars(n):
    """A walk of prices with flat runs and gaps, so the indicators meet
    every branch: rises, falls, no change, a bar of no range, no volume."""
    out = []
    price = 50.0
    for i in range(n):
        x = float(i)
        step = round(math.sin(x * 12.9898) * 1.7, 2)
        if i % 17 == 5:
            step = 0.0
        o = round(price, 2)
        c = round(price + step, 2)
        h = round(max(o, c) + abs(math.sin(x * 78.233)) * 0.9, 2)
        l = round(min(o, c) - abs(math.sin(x * 37.719)) * 0.9, 2)
        if i % 23 == 7:
            h = l = o = c
        v = 0.0 if i % 31 == 9 else round(1000 + abs(math.sin(x * 4.1414)) * 90000)
        out.append({'timestamp': 1700000000000 + i * 60000, 'open': o, 'high': h, 'low': l,
                    'close': c, 'volume': v, 'turnover': round(v * (o + c) / 2, 2)})
        price = c
    return out


def main():
    lib = os.path.expanduser(sys.argv[1])
    umd = os.path.join(lib, 'dist', 'umd', 'klinecharts.min.js')
    data = bars(300)
    page = '''<!doctype html><html><body><div id="c" style="width:900px;height:600px"></div>
<pre id="out">pending</pre>
<script src="file://%s"></script>
<script>
const bars = %s;
const cases = %s;
const chart = klinecharts.init('c');
chart.setSymbol({ticker: 'T'});
chart.setPeriod({span: 1, type: 'minute'});
chart.setDataLoader({getBars: ({callback}) => callback(bars, false)});
const ids = cases.map(([name, params], i) => {
  const value = {name: name, id: 'i' + i};
  if (params) value.calcParams = params;
  return chart.createIndicator(value, false);
});
setTimeout(() => {
  const out = cases.map(([name, params], i) => {
    const ind = chart.getIndicators({id: 'i' + i})[0];
    const keys = ind.figures.map(f => f.key);
    const values = {};
    keys.forEach(k => { values[k] = ind.result.map(r => (r && typeof r[k] === 'number' && isFinite(r[k])) ? r[k] : null); });
    return {name: name, params: ind.calcParams, values: values};
  });
  document.getElementById('out').textContent = JSON.stringify(out);
}, 1500);
</script></body></html>''' % (umd, json.dumps(data), json.dumps(CASES))
    with tempfile.TemporaryDirectory() as tmp:
        html = os.path.join(tmp, 'ref.html')
        with open(html, 'w') as f:
            f.write(page)
        dom = subprocess.run([CHROME, '--headless=new', '--allow-file-access-from-files',
                              '--user-data-dir=' + os.path.join(tmp, 'profile'),
                              '--virtual-time-budget=5000', '--dump-dom', 'file://' + html],
                             capture_output=True, text=True, timeout=120).stdout
    start = dom.index('<pre id="out">') + len('<pre id="out">')
    text = dom[start:dom.index('</pre>', start)]
    text = text.replace('&quot;', '"').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    indicators = json.loads(text)
    with open(os.path.join(HERE, 'reference.json'), 'w') as f:
        json.dump({'bars': data, 'indicators': indicators}, f)
    print('wrote %d indicators over %d bars' % (len(indicators), len(data)))


main()
