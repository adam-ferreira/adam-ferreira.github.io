// A boulder problem from a seed: the same number always lays out the same wall, so a problem can be shared by its number
// and the screenshot tests stay still. Pure: no Three.js, no DOM. Units: metres, from the wall's bottom left corner.

/** A 4 m wide, 4.4 m high panel, overhanging by 25°, with a T-nut every 20 cm (where a hold can be bolted). */
export const WALL = { w: 4, h: 4.4, angle: 25, grid: 0.2 };

/** Hold shapes, each drawn from one blob (boulder.js): width, height and depth ranges in metres. */
export const SHAPES = {
  jug: { w: [0.16, 0.24], h: [0.1, 0.15], d: [0.08, 0.1], tilt: 0.4 },
  crimp: { w: [0.12, 0.18], h: [0.04, 0.06], d: [0.03, 0.04], tilt: 0.5 },
  sloper: { w: [0.22, 0.32], h: [0.16, 0.24], d: [0.06, 0.08], tilt: Math.PI },
  pinch: { w: [0.06, 0.09], h: [0.16, 0.22], d: [0.06, 0.08], tilt: 0.3 },
  foot: { w: [0.05, 0.07], h: [0.04, 0.05], d: [0.025, 0.035], tilt: Math.PI },
};

const GRADES = ['4', '5', '5+', '6A', '6A+', '6B', '6B+', '6C', '6C+', '7A', '7A+', '7B', '7B+', '7C', '7C+', '8A'];
// a problem's style: how often each hand hold comes up
const STYLES = [
  { jug: 5, pinch: 2, sloper: 2, crimp: 1 },
  { crimp: 5, pinch: 2, jug: 2, sloper: 1 },
  { sloper: 5, pinch: 2, jug: 2, crimp: 1 },
];
// how much each hand hold adds to the grade: a rough guess, not a rating
const HARD = { jug: 0, pinch: 0.6, sloper: 0.9, crimp: 1.1 };

/** Mulberry32: a tiny seeded generator, one per problem (THREE.MathUtils.seededRandom keeps a single seed for the page). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The problem drawn on the posters (npm run posters): the page shows it first, without popping in, so the poster gives
 *  way unseen. */
export const POSTER_SEED = 412;

export const formatSeed = (seed) => String(seed).padStart(4, '0');
export const randomSeed = () => 1 + Math.floor(Math.random() * 9999);

/** The problem numbered `seed`: its holds (the line, its feet, then the other circuits' holds around it), its number of
 *  hand moves and its estimated grade. Each hold: x, y (its bolt), shape, w, h, d, rot (about the wall's normal), role
 *  (start, hand, top, foot or other), shade (0-2, the other circuits' greys) and delay (s, when it pops in). */
export function generate(seed) {
  const r = rng(seed);
  const range = (a, b) => a + (b - a) * r();
  const clampX = (x) => Math.min(WALL.w - 0.3, Math.max(0.3, x));
  const weighted = (w) => {
    let s = r() * Object.values(w).reduce((a, b) => a + b, 0);
    for (const [k, v] of Object.entries(w)) if ((s -= v) < 0) return k;
    return Object.keys(w)[0];
  };
  const holds = [];
  const free = (x, y, gap) => holds.every((h) => Math.hypot(h.x - x, h.y - y) >= gap);
  // bolted on the T-nut grid, the hold's body a few centimetres off its bolt
  const onGrid = (v) => Math.round(v / WALL.grid) * WALL.grid + range(-0.03, 0.03);
  function place(x, y, shape, role, order) {
    for (let i = 0; i < 6 && !free(x, y, 0.2); i++) x = clampX(x + (i % 2 ? -1 : 1) * WALL.grid * (i + 1));   // sideways until free
    const s = SHAPES[shape];
    const hold = {
      x: onGrid(x), y: onGrid(y), shape, role, shade: 0, order,
      w: range(...s.w), h: range(...s.h), d: range(...s.d), rot: range(-s.tilt, s.tilt),
      delay: 0,
    };
    holds.push(hold);
    return hold;
  }

  // the line: from a start at hip height to the top, one move at a time, hands alternating
  const style = STYLES[Math.floor(r() * STYLES.length)];
  const reach = range(0.45, 0.8);   // how far apart the moves are: the grade's main lever
  let x = range(1, WALL.w - 1), y = range(1, 1.4), side = r() < 0.5 ? -1 : 1;
  place(x, y, weighted(style), 'start', 0);
  if (r() < 0.6) place(x - side * range(0.3, 0.5), y + range(-0.1, 0.1), weighted(style), 'start', 0);   // else a matched start
  place(x + range(-0.4, 0.4), range(0.3, 0.5), 'foot', 'foot', 0);
  let moves = 0, total = 0, longest = 0, hardness = 0;
  while (y < WALL.h - 0.8) {
    const nx = clampX(x + side * range(0.15, 0.6)), ny = Math.min(y + reach * range(0.6, 1.25), WALL.h - 0.55);
    const shape = weighted(style);
    place(nx, ny, shape, 'hand', ++moves);
    const len = Math.hypot(nx - x, ny - y);
    total += len; longest = Math.max(longest, len); hardness += HARD[shape];
    if (r() < 0.65 && ny > 1.4) place(x + range(-0.3, 0.3), ny - range(0.9, 1.3), 'foot', 'foot', moves);
    x = nx; y = ny; side = -side;
  }
  const top = place(clampX(x + side * range(0, 0.4)), WALL.h - range(0.2, 0.35), r() < 0.6 ? 'jug' : weighted(style), 'top', ++moves);
  const last = Math.hypot(top.x - x, top.y - y);
  total += last; longest = Math.max(longest, last);

  // the other circuits' holds, in greys around the line
  const others = Math.round(range(36, 48));
  for (let i = 0, tries = 0; i < others && tries < 400; tries++) {
    const ox = range(0.25, WALL.w - 0.25), oy = range(0.3, WALL.h - 0.2);
    if (!free(ox, oy, 0.26)) continue;
    const h = place(ox, oy, r() < 0.25 ? 'foot' : weighted({ jug: 3, crimp: 3, sloper: 2, pinch: 2 }), 'other', 0);
    h.shade = Math.floor(r() * 3);
    h.delay = range(0, 0.35);
    i++;
  }
  // the line pops in once the wall is set, from the start to the top, as a climber would read it
  for (const h of holds) if (h.role !== 'other') h.delay = 0.45 + h.order * 0.08 + (h.role === 'foot' ? 0.04 : 0);

  // the grade: 6C for a median problem, then up or down with the average move, the longest one and the holds. Weights
  // set on 1 400 seeds (28/10/2026) so the grades spread from about 5 to 7C+
  const mean = total / moves, hard = hardness / moves;
  const index = 7 + 20 * (mean - 0.64) + 10 * (longest - 0.83) + 8 * (hard - 0.53);
  const grade = GRADES[Math.max(0, Math.min(GRADES.length - 1, Math.round(index)))];
  return { seed, holds, moves, grade };
}
