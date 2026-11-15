# The binary files in tests/models/files/, written for Lory's tests by this
# script (run once from the repository's root: python3 tests/models/make_files.py);
# the text files there were written by hand. Nothing here is downloaded:
# each file's numbers are this script's own.
import os
import struct

here = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'files')


def put(name, data):
    with open(os.path.join(here, name), 'wb') as f:
        f.write(data)


def header(words):
    raw = words.encode('ascii')
    return raw + b' ' * (80 - len(raw))


def stl(head, triangles, attributes=None):
    out = bytearray(head)
    out += struct.pack('<I', len(triangles))
    for k, (normal, a, b, c) in enumerate(triangles):
        out += struct.pack('<12f', *normal, *a, *b, *c)
        out += struct.pack('<H', attributes[k] if attributes else 0)
    return bytes(out)


wedge = [
    ((0, 0, -1), (0, 0, 0), (1, 0, 0), (0, 1, 0)),
    ((0, -1, 0), (0, 0, 0), (1, 0, 0), (0, 0, 0.5)),
    ((0.6, 0.6, 0.53), (1, 0, 0), (0, 1, 0), (0.1, 0.2, 0.333)),
]
put('wedge.stl', stl(header('binary STL of a wedge, written for Lory\'s tests'), wedge))
put('solid_binary.stl', stl(header('solid, though binary: its length says so'), wedge[:2]))


def packed(r, g, b, own=True):
    return (0 if own else 0x8000) | r | (g << 5) | (b << 10)


painted_head = b'painted STL COLOR=' + bytes([200, 100, 50, 255]) + b' for Lory\'s tests'
painted_head = painted_head + b' ' * (80 - len(painted_head))
put('painted.stl', stl(painted_head, wedge + [((0, 0, 1), (0, 0, 1), (1, 0, 1), (0, 1, 1))],
                       [packed(31, 0, 0), packed(0, 31, 0, own=False), packed(3, 17, 29), packed(31, 31, 31)]))

cube = [(0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0), (0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1)]
squares = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
shades = [(255, 0, 0), (0, 255, 0), (0, 0, 255), (255, 255, 0), (0, 255, 255), (255, 0, 255), (128, 128, 128), (10, 20, 30)]


def ply_head(form, vertex_lines, count, face_lines, faces, more=''):
    return ('ply\nformat %s 1.0\ncomment written for Lory\'s tests\nelement vertex %d\n%s'
            'element face %d\n%s%send_header\n' % (form, count, vertex_lines, faces, face_lines, more)).encode('ascii')


out = bytearray(ply_head('binary_little_endian',
                         'property float x\nproperty float y\nproperty float z\n'
                         'property uchar red\nproperty uchar green\nproperty uchar blue\n',
                         8, 'property list uchar int vertex_indices\n', 6,
                         'element edge 2\nproperty int vertex1\nproperty int vertex2\n'))
for p, c in zip(cube, shades):
    out += struct.pack('<3f3B', *p, *c)
for q in squares:
    out += struct.pack('<B4i', 4, *q)
out += struct.pack('<2i', 0, 1) + struct.pack('<2i', 2, 3)
put('cube_le.ply', bytes(out))

out = bytearray(ply_head('binary_big_endian',
                         'property double x\nproperty double y\nproperty double z\n'
                         'property float nx\nproperty float ny\nproperty float nz\n'
                         'property ushort red\nproperty ushort green\nproperty ushort blue\n',
                         8, 'property list uchar uint vertex_indices\n', 7))
for p, c in zip(cube, shades):
    n = tuple(0.577 if v else -0.577 for v in p)
    out += struct.pack('>3d3f3H', p[0] + 0.1, p[1] / 3.0, p[2] - 0.7, *n, c[0] * 257, c[1] * 200, c[2] * 101)
for q in squares:
    out += struct.pack('>B4I', 4, *q)
out += struct.pack('>B3I', 3, 6, 2, 1)
put('cube_be.ply', bytes(out))

# every byte's value as a colour, normals of signed bytes, and a corner past
# the vertices (the triangles' corners are then kept in 32 bits)
count = 86
out = bytearray(ply_head('binary_little_endian',
                         'property float x\nproperty float y\nproperty float z\n'
                         'property uchar red\nproperty uchar green\nproperty uchar blue\n'
                         'property char nx\nproperty char ny\nproperty char nz\n',
                         count, 'property list uchar int vertex_indices\n', 2))
for k in range(count):
    c = [(3 * k + j) % 256 for j in range(3)]
    n = [((5 * k + 7 * j) % 256) - 128 for j in range(3)]
    out += struct.pack('<3f3B3b', k * 0.01, (k % 9) * 0.1, -k * 0.02, *c, *n)
out += struct.pack('<B3i', 3, 0, 1, 2)
out += struct.pack('<B3i', 3, 3, 70000, 5)
put('bytes.ply', bytes(out))


def pcd_head(fields, sizes, types, points, data):
    return ('# .PCD v0.7 - written for Lory\'s tests\nVERSION 0.7\nFIELDS %s\nSIZE %s\nTYPE %s\nCOUNT %s\n'
            'WIDTH %d\nHEIGHT 1\nVIEWPOINT 0 0 0 1 0 0 0\nPOINTS %d\nDATA %s\n'
            % (' '.join(fields), ' '.join(map(str, sizes)), ' '.join(types),
               ' '.join('1' for _ in fields), points, points, data)).encode('ascii')


cloud = [((0.0, 0.0, 0.0), (255, 0, 0)), ((1.0, 0.0, 0.0), (0, 255, 0)), ((0.0, 1.0, 0.0), (0, 0, 255)),
         ((0.5, 0.5, 0.5), (128, 64, 32)), ((-1.25, 2.5, 0.125), (1, 2, 3)), ((3.0, -3.0, 3.0), (250, 250, 250))]
out = bytearray(pcd_head(['x', 'y', 'z', 'rgb'], [4, 4, 4, 4], ['F', 'F', 'F', 'U'], len(cloud), 'binary'))
for p, (r, g, b) in cloud:
    out += struct.pack('<3fI', *p, (r << 16) | (g << 8) | b)
put('cloud_binary.pcd', bytes(out))


def lzf(data):
    out = bytearray()
    lit = bytearray()

    def flush():
        nonlocal lit
        while lit:
            chunk = lit[:32]
            out.append(len(chunk) - 1)
            out.extend(chunk)
            lit = lit[32:]

    i = 0
    n = len(data)
    while i < n:
        best, off = 0, 0
        for j in range(max(0, i - 8192), i):
            k = 0
            while i + k < n and data[j + k] == data[i + k] and k < 264:
                k += 1
            if k > best:
                best, off = k, i - j - 1
        if best >= 3:
            flush()
            run = best - 2
            if run < 7:
                out.append((run << 5) | (off >> 8))
            else:
                out.append((7 << 5) | (off >> 8))
                out.append(run - 7)
            out.append(off & 255)
            i += best
        else:
            lit.append(data[i])
            i += 1
    flush()
    return bytes(out)


many = [((k * 0.25, (k % 4) * 0.5, -k * 0.125), ((k * 40) % 256, (k * 70) % 256, 200)) for k in range(24)]
columns = bytearray()
for axis in range(3):
    for p, _ in many:
        columns += struct.pack('<f', p[axis])
for _, (r, g, b) in many:
    columns += struct.pack('<I', (r << 16) | (g << 8) | b)
for axis in range(3):
    for k in range(len(many)):
        columns += struct.pack('<f', [0.0, 0.0, 1.0][axis] if k % 2 else [1.0, 0.0, 0.0][axis])
squeezed = lzf(bytes(columns))
out = bytearray(pcd_head(['x', 'y', 'z', 'rgb', 'normal_x', 'normal_y', 'normal_z'], [4] * 7,
                         ['F', 'F', 'F', 'U', 'F', 'F', 'F'], len(many), 'binary_compressed'))
out += struct.pack('<II', len(squeezed), len(columns)) + squeezed
put('cloud_compressed.pcd', bytes(out))
# files that cannot be read, cut short or misordered: Lory must say why
def cut(name, source, length):
    with open(os.path.join(here, source), 'rb') as f:
        whole = f.read()
    put(name, whole[:length])


cut('short.stl', 'wedge.stl', 84 + 50 * 2 + 20)
cut('short.ply', 'cube_le.ply', 400)
cut('short.pcd', 'cloud_binary.pcd', 230)
put('misordered.ply', b'ply\nformat ascii 1.0\nproperty float x\nelement vertex 1\nproperty float y\nend_header\n1 2\n')
print('written to', here)
