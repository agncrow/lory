"""How far Lory's picture of Babylon.js's first scene is from Babylon's.

    python3 compare.py lory.png babylon.png [diff.png]

Prints, over every pixel: the share that differ at all, the share that
differ by more than 2 (of 255) in any channel, the largest difference, and
the mean; and writes a picture of where they differ (each pixel's largest
difference, times eight).
"""
import sys
from PIL import Image

a = Image.open(sys.argv[1]).convert('RGB')
b = Image.open(sys.argv[2]).convert('RGB')
assert a.size == b.size, (a.size, b.size)
w, h = a.size
pa, pb = a.load(), b.load()
out = Image.new('L', a.size)
po = out.load()
some = over = most = 0
total = 0
for y in range(h):
    for x in range(w):
        d = max(abs(i - j) for i, j in zip(pa[x, y], pb[x, y]))
        po[x, y] = min(255, d * 8)
        total += d
        some += d > 0
        over += d > 2
        most = max(most, d)
n = w * h
print(f'pixels {n}: differ {100 * some / n:.3f}%, by more than 2 {100 * over / n:.3f}%, largest {most}, mean {total / n:.4f}')
if len(sys.argv) > 3:
    out.save(sys.argv[3])
