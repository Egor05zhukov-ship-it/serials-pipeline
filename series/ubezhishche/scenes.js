// «Убежище»: props of the season that kit/v2.js does not have. Same look: flat shapes of V, people's hands in the
// thick wobbling line. Every function returns an SVG string for the 1080x1920 stage.
import { lerp } from '../../kit/index.js';
import { V, FLOOR, ease, sine, person } from '../../kit/v2.js';

const n = (x) => Math.round(x * 100) / 100;
const INK = `stroke="${V.line}" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"`;

// people of the season, the same as in ep01
export const ilya = (o) => person({ col: V.ilya, seed: 0, ...o });
export const vika = (o) => person({ col: V.vika, seed: 1, k: 0.66, ...o });

// a pack of tinned breakfast with a chalk mark (a white tick) on its side; (x, y) = middle of its bottom edge
export const markedPack = ({ x, y, s = 1, mark = 1, seed = 1 }) =>
  `<g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})" filter="url(#hd${seed % 4})"><rect x="-40" y="-56" width="80" height="56" rx="11" fill="${V.crowd[0]}" ${INK}/>`
  + (mark > 0 ? `<path d="M-20 -28 L-6 -14 L22 -42" pathLength="1" stroke-dasharray="1 2" stroke-dashoffset="${(1 - ease(mark)).toFixed(4)}" fill="none" stroke="${V.white}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>` : '')
  + '</g>';

// the store: a crate with the marked packs on it. marks = 0..n how many packs are already ticked (fractions draw the tick)
export const store = ({ x = 540, floor: fy = FLOOR, w = 340, h = 220, packs = 3, marks = 3, gone = -1 } = {}) => {
  const top = fy - h;
  let s = '';
  for (let i = 0; i < packs; i++) if (i !== gone) s += markedPack({ x: x - w / 2 + 74 + (i * (w - 148)) / Math.max(1, packs - 1), y: top + 18, mark: Math.min(1, Math.max(0, marks - i)), seed: i + 1 });
  return `${s}<rect x="${x - w / 2}" y="${top}" width="${w}" height="${h}" fill="${V.obj}"/>${[1, 2].map((i) => `<rect x="${x - w / 2}" y="${n(top + (h * i) / 3 - 5)}" width="${w}" height="10" fill="${V.mid}"/>`).join('')}`;
};

// a vent grate low in the wall. shift 0..1 slides the grate aside and shows the dark hole behind it
export const vent = ({ x = 760, y = FLOOR - 300, w = 220, h = 150, shift = 0 } = {}) => {
  const dx = 0.72 * w * shift;
  const slats = [0, 1, 2, 3].map((i) => `<rect x="${n(x - w / 2 + 22 + dx)}" y="${n(y - h / 2 + 22 + i * 30)}" width="${w - 44}" height="14" rx="7" fill="${V.floor}"/>`).join('');
  return `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="10" fill="${V.line}"/><rect x="${n(x - w / 2 + dx)}" y="${y - h / 2}" width="${w}" height="${h}" rx="10" fill="${V.obj}"/>${slats}`;
};

// an arm that reaches out of an opening at (x, y) to the left by `reach` px; holds a pack when hold > 0
export const arm = ({ x, y, reach = 0, hold = 0, seed = 2 }) => {
  if (reach <= 1) return '';
  const hx = x - reach;
  return `<g filter="url(#hd${seed % 4})"><rect x="${n(hx)}" y="${n(y - 24)}" width="${n(reach + 40)}" height="48" rx="24" fill="${V.gordeev}" ${INK}/>`
    + (hold > 0 ? `<rect x="${n(hx - 46)}" y="${n(y - 34)}" width="80" height="56" rx="11" fill="${V.crowd[0]}" ${INK}/>` : '')
    + `<circle cx="${n(hx)}" cy="${n(y)}" r="30" fill="${V.skin}" ${INK}/></g>`;
};

// flashlight beam from the point (x, y) towards (tx, ty): a flat pale cone, no glow
export const beam = ({ x, y, tx, ty, spread = 120, a = 1 }) => {
  if (a <= 0) return '';
  const dx = tx - x, dy = ty - y, L = Math.hypot(dx, dy) || 1, px = (-dy / L) * spread, py = (dx / L) * spread;
  return `<path d="M${n(x)} ${n(y)} L${n(tx + px)} ${n(ty + py)} L${n(tx - px)} ${n(ty - py)} Z" fill="${V.mid}" opacity="${n(ease(a))}"/>`;
};

// a small flashlight in a hand; (x, y) = its back end, pointing right (dir 1) or left (-1)
export const torch = ({ x, y, dir = 1, seed = 0 }) =>
  `<g filter="url(#hd${seed % 4})"><rect x="${n(dir > 0 ? x : x - 70)}" y="${n(y - 15)}" width="70" height="30" rx="10" fill="${V.deep}" ${INK}/></g>`;

// the narrow corridor seen through the opened grate: walls closing in to a far iron door with a small lamp.
// open 0..1 draws the far door (it comes out of the dark)
export const corridor = ({ cx = 540, cy = 860, door = 1 } = {}) => {
  const fw = 170, fh = 300, x0 = cx - fw / 2, y0 = cy - fh / 2;
  const walls = `<path d="M-200 -200 L${x0} ${y0} L${x0} ${y0 + fh} L-200 2200 Z" fill="${V.mid}"/><path d="M1280 -200 L${x0 + fw} ${y0} L${x0 + fw} ${y0 + fh} L1280 2200 Z" fill="${V.mid}"/>`;
  const far = `<rect x="${x0}" y="${y0}" width="${fw}" height="${fh}" fill="${V.line}"/>`;
  const d = door > 0 ? `<g opacity="${n(ease(door))}"><rect x="${x0 + 30}" y="${y0 + 90}" width="${fw - 60}" height="${fh - 90}" rx="8" fill="${V.obj}"/><circle cx="${cx}" cy="${y0 + 55}" r="10" fill="${V.amber}"/><circle cx="${x0 + fw - 50}" cy="${y0 + 200}" r="6" fill="${V.floor}"/></g>` : '';
  return `<rect x="-200" y="-200" width="1480" height="2400" fill="${V.deep}"/>${walls}${far}${d}`;
};

// a sleeping child on the lower bunk: lying figure drawn flat, eyes shut
export const sleeper = ({ x = 540, y = FLOOR - 170, col = V.vika, seed = 1, t = 0 }) => {
  const br = 1 + 0.02 * Math.sin((t / 3.2) * Math.PI * 2);
  return `<g transform="translate(${n(x)} ${n(y)})" filter="url(#hd${seed % 4})"><rect x="-150" y="${n(-70 * br)}" width="230" height="${n(70 * br)}" rx="34" fill="${col}" ${INK}/><circle cx="125" cy="-44" r="46" fill="${V.skin}" ${INK}/><path d="M108 -42 L124 -40 M136 -40 L150 -42" stroke="${V.line}" stroke-width="6" stroke-linecap="round"/></g>`;
};

// lower bunk for the sleeper: two posts and a board
export const bunk = ({ x = 540, floor: fy = FLOOR, w = 420 } = {}) =>
  `<rect x="${x - w / 2}" y="${fy - 170}" width="${w}" height="34" fill="${V.obj}"/><rect x="${x - w / 2 - 11}" y="${fy - 430}" width="22" height="460" rx="6" fill="${V.obj}"/><rect x="${x + w / 2 - 11}" y="${fy - 430}" width="22" height="460" rx="6" fill="${V.obj}"/>`;

export { lerp, sine };
