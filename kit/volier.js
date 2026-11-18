// Details of the series «Вольер» on top of kit/v2.js (style 2): flat shapes without outlines for the place, hand-drawn
// people and animals with the wobbling dark outline of kit/v2.js. Same contract: pure JS, every function returns an SVG
// string for the 1080x1920 stage.
// New in this series: every scene has its own flat colour, so the episode does not melt into one grey-blue spot on a
// phone. Four scenes: the zoo by day (light sky, sand, dark green blocks), the night enclosure (dark, big readable
// figures), the wall with the rules (light wall, dark letters), the cold room (cold grey-blue). The ginger tiger is the
// main colour of the series; amber (V.amber) is kept for clues and counters; captions stay white (drawn by the theme).
// The lower part of every scene (below FLOOR) stays dark: the captions sit there.
import { clamp, lerp, rnd } from './index.js';
import { V, FLOOR, ease, label, textW, theme as base, cover as baseCover, endCard as baseEndCard } from './v2.js';

const n = (x) => Math.round(x * 100) / 100;
const TAU = Math.PI * 2;

// ---------- palette ----------
export const P = {
  // the tiger
  tiger: '#E8792B', stripe: '#2B1B12', muzzle: '#F7E7D2',
  // people of the series
  brother: '#5F8FB4', vera: '#D9606F', keeper: '#8C7A55', others: ['#B9C2C1', '#9C8C80', '#6F9A97'],
  // the dead: the same little people, grey-green
  dead: '#6F8068', deadSkin: '#AAB89C',
  // the zoo by day
  day: { sky: '#CFE4E7', far: '#2F5E43', sand: '#DDBB80', ground: '#24432F', wall: '#A99C84', bars: '#1E2A25', plate: '#F4EFE3' },
  // the night enclosure
  night: { bg: '#15232E', wall: '#1F3443', floor: '#0C1720', ceil: '#0A121A', bars: '#05090D', sky: '#0F1B24', ground: '#0B141B' },
  // the wall with the rules
  wall: { paint: '#E9E0CC', ink: '#2A2521', smear: '#3B302B', base: '#3A332E' },
  // the cold room
  cold: { bg: '#A7BBC8', shelf: '#7A919F', floor: '#3F5564', meat: '#B24A44', fat: '#E9B9A9' },
  // the last shot
  dark: { bg: '#060B0F', floor: '#03070A', tiger: '#15202A', vera: '#3E2830', skin: '#4E443D' },
  amber: V.amber,
};

const INK = `stroke="${V.line}" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"`;
const blinkAt = (t, seed) => {
  const per = 3.6 + 1.9 * rnd(seed + 1), u = (((t + per * (0.35 + 0.5 * rnd(seed + 2))) % per) + per) % per;
  return u < 0.1 ? ease(u / 0.1) : u < 0.15 ? 1 : u < 0.3 ? 1 - ease((u - 0.15) / 0.15) : 0;
};

// ---------- the tiger ----------
// (x, y) = the point under its belly on the floor. dir = where the head is (1 right, -1 left). s = size (1: about 600 px
// long and 520 px tall standing, a grown man is 480). pose 'stand' or 'lie'. up 0..1 lifts the head when lying
// (0 = the chin on the paws). sleep 0..1 closes the eyes. look -1..1 moves the eyes sideways, lookY up/down.
// roar 0..1 opens the mouth. walk = { ph, amp } from travel(). dark = 1 draws it as a dark shape with amber eyes.
export const tiger = ({ x, y = FLOOR, s = 1, t = 0, seed = 2, dir = 1, pose = 'stand', up = 1, sleep = 0, look = 0, lookY = 0, roar = 0, walk = null, dark = 0, alpha = 1 }) => {
  if (alpha <= 0.004) return '';
  const col = dark ? P.dark.tiger : P.tiger, st = dark ? '#0B1218' : P.stripe, mz = dark ? '#1B2732' : P.muzzle, line = dark ? `stroke="#020406" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"` : INK;
  const br = Math.sin(TAU * (t / (sleep > 0.5 ? 3.2 : 2.4) + rnd(seed))) * (sleep > 0.5 ? 1.6 : 1);
  const ph = walk ? walk.ph : 0, amp = walk ? walk.amp : 0, sw = Math.sin(TAU * ph);
  const lift = (d) => { const v = d * sw; return v > 0 ? 18 * amp * v * v : 0; };
  const bob = (-6 * amp * (1 - Math.cos(2 * TAU * ph))) / 2;
  let out = '';
  // the body box: left, right, top, bottom (in the frame where the head is on the right)
  const lie = pose === 'lie';
  const bx0 = lie ? -300 : -285, bx1 = lie ? 230 : 265, bt = (lie ? -215 : -405) + bob - 3 * br, bb = lie ? 0 : -165 + bob;
  // tail first, behind the body
  const tl = lie
    ? `M${bx0 + 30} ${-40} Q${bx0 - 120} ${-10} ${bx0 - 200} ${-30 + 6 * Math.sin(t * 1.3 + seed)}`
    : `M${bx0 + 30} ${n(bt + 70)} Q${bx0 - 90} ${n(bt + 110)} ${bx0 - 105} ${n(bt + 260)} Q${bx0 - 112} ${n(bt + 330 + 8 * Math.sin(t * 1.6 + seed))} ${n(bx0 - 60 + 10 * Math.sin(t * 1.6 + seed))} ${n(bt + 345)}`;
  out += `<path d="${tl}" fill="none" stroke="${dark ? '#020406' : V.line}" stroke-width="46" stroke-linecap="round"/><path d="${tl}" fill="none" stroke="${col}" stroke-width="27" stroke-linecap="round"/>`;
  // legs
  if (lie) {
    out += `<ellipse cx="${bx0 + 95}" cy="-62" rx="110" ry="80" fill="${col}" ${line}/>`; // the haunch
  } else {
    for (const [lx, far] of [[-215, 1], [175, 1], [-150, 0], [235, 0]]) {
      const lf = lift(far ? 1 : -1) * (lx > 0 ? 1 : -1);
      out += `<rect x="${lx - 30}" y="${n(bb - 40)}" width="60" height="${n(40 - bb - Math.max(0, lf))}" rx="30" fill="${far ? shade(col) : col}" ${line}/>`;
    }
  }
  // body
  out += `<rect x="${bx0}" y="${n(bt)}" width="${bx1 - bx0}" height="${n(bb - bt)}" rx="${lie ? 105 : 112}" fill="${col}" ${line}/>`;
  // stripes: dark wedges from the back down, no outline
  const sx = lie ? [-200, -125, -50, 25, 100, 165] : [-185, -110, -35, 40, 115, 185];
  out += sx.map((xx, i) => {
    const top = bt + (Math.abs(xx) > 150 ? 16 : 6), len = (lie ? 85 : 100) + (i % 2) * 30, w = 17;
    return `<path d="M${xx - w} ${n(top)} Q${xx - 4} ${n(top + len * 0.55)} ${xx + 6} ${n(top + len)} Q${xx + 7} ${n(top + len * 0.5)} ${xx + w} ${n(top)} Z" fill="${st}"/>`;
  }).join('');
  if (lie) { // front paws on the floor
    out += [0, 1].map((k) => `<rect x="${150 + k * 26}" y="${-44 + k * 4}" width="200" height="44" rx="22" fill="${k ? col : shade(col)}" ${line}/>`).join('');
  }
  // head
  const hx = lie ? 300 : 315, hy = lie ? lerp(-78, -205, ease(up)) : bt - 30, r = 102;
  out += `<g transform="translate(${hx} ${n(hy)})">`;
  out += [-1, 1].map((d) => `<circle cx="${d * 62}" cy="-78" r="32" fill="${col}" ${line}/><circle cx="${d * 62}" cy="-76" r="14" fill="${st}"/>`).join('');
  out += `<circle r="${r}" fill="${col}" ${line}/>`;
  out += [-26, 0, 26].map((d, i) => `<path d="M${d - 9} ${-r + 8} Q${d} ${-r + 34 + (i === 1 ? 10 : 0)} ${d + 9} ${-r + 8} Z" fill="${st}"/>`).join(''); // forehead
  out += [-1, 1].map((d) => `<path d="M${d * r} -6 L${d * (r - 30)} 2 L${d * r} 14 Z" fill="${st}"/>`).join(''); // cheeks
  const mo = clamp(roar);
  out += `<ellipse cx="10" cy="${n(38 + 6 * mo)}" rx="62" ry="${n(42 + 10 * mo)}" fill="${mz}"/>`;
  if (mo > 0.02) out += `<ellipse cx="10" cy="${n(52 + 8 * mo)}" rx="${n(30 * mo + 4)}" ry="${n(24 * mo + 2)}" fill="${V.line}"/>`;
  out += `<path d="M-5 14 L25 14 L10 30 Z" fill="${V.line}" stroke="${V.line}" stroke-width="6" stroke-linejoin="round"/>`;
  const shut = Math.max(clamp(sleep), dark ? 0 : blinkAt(t, seed)), er = dark ? 14 : 10;
  out += [-1, 1].map((d) => `<ellipse cx="${n(d * 36 + 12 + look * 12)}" cy="${n(-20 + lookY * 8)}" rx="${er}" ry="${n(er * (1 - 0.86 * shut))}" fill="${dark ? P.amber : V.line}"/>`).join('');
  out += '</g>';
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${n(s * dir)} ${n(s)})" filter="url(#hd${seed % 4})"${alpha < 1 ? ` opacity="${n(alpha)}"` : ''}>${out}</g>`;
};
// the far legs a shade darker
const shade = (hex) => { const c = parseInt(hex.slice(1), 16), f = (v) => Math.round(v * 0.82); return `#${[f(c >> 16), f((c >> 8) & 255), f(c & 255)].map((v) => v.toString(16).padStart(2, '0')).join('')}`; };

// ---------- the dead ----------
// the person of kit/v2.js in grey-green, a little bent, the face of the same colour family
export const deadify = (svg) => svg.split(V.skin).join(P.deadSkin);
export const darkify = (svg) => svg.split(V.skin).join(P.dark.skin);

// ---------- bars ----------
// rare dark vertical rods between x0 and x1 with a rail on top. gap = distance between the rods
export const bars = ({ x0, x1, top = 420, bottom = FLOOR + 30, gap = 170, w = 16, col = P.night.bars, rail = true, off = 0 }) => {
  let s = rail ? `<rect x="${x0}" y="${top - 24}" width="${x1 - x0}" height="26" fill="${col}"/>` : '';
  for (let x = x0 + off; x <= x1 + 0.5; x += gap) s += `<rect x="${n(x - w / 2)}" y="${top}" width="${w}" height="${bottom - top}" fill="${col}"/>`;
  return s;
};
// the partition between the tiger and the people: denser rods and the latch box in the middle
export const partition = ({ x = 600, top = 420, col = P.night.bars, latch = 0 }) =>
  bars({ x0: x - 66, x1: x + 66, top, gap: 66, w: 18, col }) + `<rect x="${x - 82}" y="${FLOOR - 430}" width="164" height="30" fill="${col}"/><rect x="${n(x - 26 + 30 * clamp(latch))}" y="${FLOOR - 452}" width="52" height="74" rx="8" fill="${col}"/>`;

// ---------- night enclosure, cut open ----------
// left: the tiger's cell with rare front rods; right of `split`: the keeper's corridor where the people live
export const vault = ({ split = 600, front = true, top = 400 } = {}) => {
  const c = P.night;
  return `<rect width="1080" height="1920" fill="${c.ceil}"/><rect x="-3000" y="${top}" width="7080" height="${FLOOR - top}" fill="${c.wall}"/>`
    + `<rect x="${split + 66}" y="${top}" width="3000" height="${FLOOR - top}" fill="${c.bg}"/>`
    + `<rect x="-3000" y="${FLOOR}" width="7080" height="3000" fill="${c.floor}"/>`;
};
export const vaultFront = ({ split = 600, top = 400 } = {}) => bars({ x0: -330, x1: split - 150, top, gap: 210, off: 30 }) + partition({ x: split, top });

// ---------- the zoo by day ----------
// light sky, dark green blocks of trees, sand where people walk, a dark green hedge below (under the captions)
export const zooDay = ({ trees = [[-60, 300], [330, 240], [700, 330], [1040, 260]] } = {}) => {
  const c = P.day;
  return `<rect width="1080" height="1920" fill="${c.sky}"/>${trees.map(([x, h]) => `<rect x="${x - 160}" y="${980 - h}" width="320" height="${h + 40}" rx="110" fill="${c.far}"/>`).join('')}`
    + `<rect x="-3000" y="960" width="7080" height="300" fill="${c.sand}"/><rect x="-3000" y="1250" width="7080" height="3000" fill="${c.ground}"/>`;
};
// the tiger house seen from the path: a concrete block, rare rods across its open front, a plate
export const cageDay = ({ x0 = 560, x1 = 1500, top = 600, plate = true } = {}) => {
  const c = P.day;
  return `<rect x="${x0}" y="${top - 80}" width="${x1 - x0}" height="${FLOOR - top + 110}" fill="${c.wall}"/><rect x="${x0 + 40}" y="${top}" width="${x1 - x0 - 80}" height="${FLOOR - top}" fill="#7E7262"/>`;
};
export const cageDayFront = ({ x0 = 560, x1 = 1500, top = 600, plate = true } = {}) => {
  const c = P.day;
  return bars({ x0: x0 + 40, x1: x1 - 40, top, bottom: FLOOR + 10, gap: 150, w: 16, col: c.bars })
    + (plate ? `<rect x="${x0 - 30}" y="${top - 215}" width="380" height="96" rx="12" fill="${c.plate}"/>${label(x0 + 160, top - 152, 'АМУРСКИЙ ТИГР', { size: 34, fill: '#2A2521', ls: 1 })}` : '');
};

// ---------- the dead around the enclosure, seen from the side ----------
// ticks on the ground from the bars (x1) back towards the dead: one per step, `step` px apart
export const stepMarks = ({ x1, count = 10, step = 46, y = FLOOR + 6, col = '#2B3D49', hi = -1 }) =>
  Array.from({ length: count }, (_, i) => `<rect x="${n(x1 - (i + 1) * step - 5)}" y="${y}" width="10" height="34" rx="5" fill="${i + 1 === hi ? P.amber : col}"/>`).join('');

// ---------- the wall with the rules ----------
// a light painted wall, three rules in dark paint, the third under a smear, nine strokes crossed out beside them
const smearPath = 'M-10 30 C40 -6 120 18 200 4 C280 -10 360 20 450 2 C520 -8 560 14 590 30 C600 60 560 92 480 84 C400 76 330 100 250 90 C170 82 90 104 20 92 C-20 84 -30 56 -10 30 Z';
export const rulesWall = ({ marks = 1, hi = 0 } = {}) => {
  const c = P.wall, x = 120;
  const o = { size: 66, fill: c.ink, anchor: 'start', ls: 1 };
  let s = `<rect width="1080" height="1920" fill="${c.paint}"/><rect x="-3000" y="${FLOOR}" width="7080" height="3000" fill="${c.base}"/>`;
  s += label(x, 420, 'ПРАВИЛА', { ...o, size: 88 }) + `<rect x="${x}" y="450" width="420" height="12" rx="6" fill="${c.ink}"/>`;
  s += label(x, 600, '1. ТИГР ЕСТ ПЕРВЫМ', o);
  s += label(x, 740, '2. К РЕШЁТКЕ СПИНОЙ', o) + label(x + 66, 826, 'НЕ СТОЯТЬ', o);
  s += label(x, 966, '3.', o);
  // the third rule is painted over: no letters under the smear at all, so nothing can show through
  s += `<g filter="url(#ink)" transform="translate(${x + 70} 900) scale(1.36 1.1)"><path d="${smearPath}" fill="${c.smear}"/></g>`;
  // nine strokes, crossed out by one line: the silent clue (nine people lived here before)
  const mk = Array.from({ length: 9 }, (_, i) => `<path d="M${640 + i * 34 + (i % 2) * 3} 1060 L${636 + i * 34} 1150" stroke="${hi ? P.amber : c.ink}" stroke-width="11" stroke-linecap="round"/>`).join('');
  s += `<g filter="url(#ink)" opacity="${n(clamp(marks))}">${mk}<path d="M612 1128 L960 1078" stroke="${hi ? P.amber : c.ink}" stroke-width="10" stroke-linecap="round"/></g>`;
  return s;
};

// ---------- the cold room ----------
// cold grey-blue room, two steel shelves, meat in blocks of 8 kg (the count is the number of blocks)
export const coldRoom = ({ blocks = 4, x = 540 } = {}) => {
  const c = P.cold;
  let s = `<rect width="1080" height="1920" fill="${c.bg}"/><rect x="-3000" y="${FLOOR}" width="7080" height="3000" fill="${c.floor}"/>`;
  for (const yy of [760, 1060]) s += `<rect x="${x - 430}" y="${yy}" width="860" height="26" fill="${c.shelf}"/>`;
  s += `<rect x="${x - 440}" y="560" width="26" height="${FLOOR - 560}" fill="${c.shelf}"/><rect x="${x + 414}" y="560" width="26" height="${FLOOR - 560}" fill="${c.shelf}"/>`;
  const spots = [[x - 315, 1060], [x - 105, 1060], [x + 105, 1060], [x + 315, 1060], [x - 210, 760], [x, 760], [x + 210, 760]];
  s += spots.slice(0, blocks).map(([mx, my], i) => meat({ x: mx, y: my, seed: i })).join('');
  return s;
};
export const meat = ({ x, y, s = 1, seed = 0 }) =>
  `<g transform="translate(${n(x)} ${n(y)}) scale(${s})" filter="url(#hd${seed % 4})"><path d="M-90 0 L-96 -110 Q-80 -150 -10 -146 Q80 -150 96 -104 L92 0 Z" fill="${P.cold.meat}" ${INK}/><path d="M-70 -96 Q0 -120 72 -92" fill="none" stroke="${P.cold.fat}" stroke-width="16" stroke-linecap="round"/></g>`;

// ---------- centred tag helpers ----------
// width of a tag of kit/v2.js with this text, so it can be centred
export const tagW = (str, size, pad = 1) => textW(str, size, 1) + 2 * pad * size;

// ---------- theme: the end card and the cover in the colours of the night enclosure ----------
const recolor = (svg, map) => Object.entries(map).reduce((s, [a, b]) => s.split(a).join(b), svg);
export const endCard = (o) => recolor(baseEndCard(o), { [V.floor]: P.night.floor });
export const cover = (o) => recolor(baseCover(o), { [V.mid]: '#2A1A12', [V.bg]: P.night.ceil });
export const theme = { ...base, endCard, cover };
