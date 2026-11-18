// «Убежище»: props of the season that kit/v2.js does not have. Same look: flat shapes of V, people's hands in the
// thick wobbling line. Every function returns an SVG string for the 1080x1920 stage.
import { clamp, lerp } from '../../kit/index.js';
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

// ---------- episode 3 ----------
// The old plan of the shelter on a sheet of paper: the hall, the store and, on the right, a room the plan hides.
// stain 0..1 lays a blot of paint over that room; word 0..1 lets the two words under the paint show through.
export const PLAN = { x: 130, y: 330, w: 820, h: 820 };
export const planSheet = ({ stain = 1, word = 0 } = {}) => {
  const { x, y, w, h } = PLAN;
  const rooms = `<rect x="${x + 70}" y="${y + 170}" width="430" height="560" rx="10" fill="${V.mid}"/><rect x="${x + 70}" y="${y + 760}" width="190" height="40" rx="8" fill="${V.mid}"/>`
    + `<rect x="${x + 530}" y="${y + 170}" width="220" height="250" rx="10" fill="${V.mid}"/><rect x="${x + 530}" y="${y + 450}" width="220" height="280" rx="10" fill="${V.mid}"/>`;
  const blot = stain > 0 ? `<path d="M${x + 505} ${y + 440} C${x + 560} ${y + 410} ${x + 690} ${y + 418} ${x + 770} ${y + 445} C${x + 800} ${y + 540} ${x + 790} ${y + 660} ${x + 768} ${y + 752} C${x + 680} ${y + 770} ${x + 580} ${y + 768} ${x + 512} ${y + 748} C${x + 495} ${y + 650} ${x + 492} ${y + 540} ${x + 505} ${y + 440} Z" fill="${V.obj}" opacity="${n(ease(stain))}"/>` : '';
  const txt = word > 0 ? `<text x="${x + 640}" y="${y + 612}" text-anchor="middle" font-family="Mont" font-weight="800" font-size="50" letter-spacing="2" fill="${V.floor}" opacity="${n(0.85 * ease(word))}">ОТСЕК Б</text>` : '';
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="20" fill="${V.soft}"/><rect x="${x + 70}" y="${y + 70}" width="${w - 140}" height="14" rx="7" fill="${V.mid}"/>${rooms}${blot}${txt}`;
};

// a sheet of paper lying on the floor, pushed out from under a door at doorX: out 0..1 how far it has come
export const floorSheet = ({ doorX = 1000, out = 1, fy = FLOOR } = {}) => {
  if (out <= 0) return '';
  const tip = doorX - 30 - 150 * ease(out);
  return `<path d="M${n(tip)} ${fy + 2} L${doorX + 40} ${fy + 2} L${doorX + 40} ${fy + 16} L${n(tip - 10)} ${fy + 16} Z" fill="${V.soft}"/>`;
};

// a sheet held up in front of a person at (x, y) = its bottom middle; lift 0..1 brings it up from the floor
export const heldSheet = ({ x, y, lift = 1, seed = 0 }) =>
  lift <= 0 ? '' : `<g transform="translate(${n(x)} ${n(lerp(FLOOR, y, ease(lift)))})" filter="url(#hd${seed % 4})"><rect x="-48" y="-120" width="96" height="120" rx="6" fill="${V.soft}" ${INK}/></g>`;

// the note close up: printed rows (lines 0..1 how many are printed), then a pencil line below (pencil 0..1 written).
// The words themselves are in the caption: the sheet shows only their shape.
export const noteSheet = ({ x = 170, y = 380, w = 740, h = 760, lines = 1, pencil = 0 } = {}) => {
  const rows = [[0, 560], [1, 470]].map(([i, len]) => {
    const k = ease(clamp(lines * 2 - i));
    return k <= 0 ? '' : `<rect x="${x + 90}" y="${y + 140 + i * 90}" width="${n(len * k)}" height="44" rx="6" fill="${V.floor}"/>`;
  }).join('');
  const k = ease(pencil);
  let d = '';
  for (let i = 0; i <= 40; i++) { const u = i / 40; d += `${i ? 'L' : 'M'}${n(x + 90 + u * 540)} ${n(y + 480 + 18 * Math.sin(u * 46) * (0.6 + 0.4 * Math.sin(u * 7)))} `; }
  const pen = k > 0 ? `<g filter="url(#ink)"><path d="${d}" pathLength="1" stroke-dasharray="1 2" stroke-dashoffset="${(1 - k).toFixed(4)}" fill="none" stroke="${V.obj}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></g>` : '';
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${V.soft}"/>${rows}${pen}`;
};

export { lerp, sine };
