// Where a layer stands against the control it is anchored to, as Floating UI
// places it, for Lory's gui (`gui.anchored`) to be held to number for number.
//
// The reference: @floating-ui/core 1.7.5, the engine Radix's and Headless
// UI's popovers, menus and tooltips stand on, set up as Radix sets it up
// (@radix-ui/react-popper): the placement `side` or `side-align`, then
// offset (the gap along the side), shift (along the side, kept inside the
// page `margin` from its edge, limited to stay against the anchor:
// limitShift) and flip (to the other side, and the other alignment, where
// it overflows), with the page as the boundary and `margin` its padding.
//
// Run with a pinned install, from a scratch folder (never Lory's own):
//   npm install --prefix <scratch>/ref @floating-ui/core@1.7.5
//   LORY_REF=<scratch>/ref node tests/gui/placement.mjs
// It writes tests/gui/placement.json beside it.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ref = process.env.LORY_REF;
if (!ref) throw new Error('LORY_REF: the folder @floating-ui/core 1.7.5 is installed in');
const { computePosition, offset, shift, limitShift, flip } = await import(`${ref}/node_modules/@floating-ui/core/dist/floating-ui.core.mjs`);

const page = { w: 900, h: 700 };

function platformFor(ref, fw, fh) {
    return {
        getElementRects: async () => ({
            reference: { x: ref.x, y: ref.y, width: ref.w, height: ref.h },
            floating: { x: 0, y: 0, width: fw, height: fh },
        }),
        getClippingRect: async () => ({ x: 0, y: 0, width: page.w, height: page.h }),
        getDimensions: async () => ({ width: fw, height: fh }),
    };
}

// a fixed spread of anchors (in the middle, at each edge, in each corner),
// sizes (small, wide, tall, wider than the page) and every placement
const anchors = [
    { x: 420, y: 330, w: 80, h: 34 },
    { x: 4, y: 330, w: 80, h: 34 },
    { x: 820, y: 330, w: 76, h: 34 },
    { x: 420, y: 2, w: 80, h: 34 },
    { x: 420, y: 662, w: 80, h: 34 },
    { x: 6, y: 6, w: 120, h: 34 },
    { x: 774, y: 660, w: 120, h: 34 },
    { x: 300, y: 600, w: 300, h: 60 },
    { x: 850, y: 20, w: 40, h: 20 },
    { x: 20, y: 640, w: 40, h: 50 },
];
const sizes = [[160, 120], [320, 60], [120, 420], [960, 80], [200, 690]];
const sides = ['bottom', 'top', 'right', 'left'];
const aligns = ['center', 'start', 'end'];
const setups = [[6, 8], [0, 0]];

const cases = [];
for (const a of anchors) {
    for (const [fw, fh] of sizes) {
        for (const side of sides) {
            for (const align of aligns) {
                for (const [gap, margin] of setups) {
                    const placement = align === 'center' ? side : `${side}-${align}`;
                    const pad = { padding: margin };
                    const r = await computePosition({}, {}, {
                        placement,
                        platform: platformFor(a, fw, fh),
                        middleware: [
                            offset({ mainAxis: gap, alignmentAxis: 0 }),
                            shift({ mainAxis: true, crossAxis: false, limiter: limitShift(), ...pad }),
                            flip({ ...pad }),
                        ],
                    });
                    const [gotSide, gotAlign] = r.placement.split('-');
                    cases.push({
                        anchor: [a.x, a.y, a.w, a.h], size: [fw, fh], side, align, gap, margin,
                        x: r.x, y: r.y, placed_side: gotSide, placed_align: gotAlign || 'center',
                    });
                }
            }
        }
    }
}
const here = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(here, 'placement.json'), JSON.stringify({ library: '@floating-ui/core 1.7.5', page: [page.w, page.h], cases }, null, 0) + '\n');
console.log(`${cases.length} cases`);
