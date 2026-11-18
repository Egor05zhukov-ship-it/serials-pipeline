// Drawing kit, style 2 (series «Убежище»): flat poster rooms and hand-drawn people.
// Same contract as kit/index.js: pure JS, every function returns an SVG string for the 1080x1920 stage.
// Rules of the look (the approved frame is brand/style-chosen.jpg):
//   - the room is flat shapes of the palette V: no outlines, gradients, glows, particles or textures;
//   - people are drawn by hand: thick dark outline, wobbled by the filters in defs(), which also "boil" the line;
//   - a shot holds at most three room shapes, the people and one amber tag with plain text;
//   - nothing pops and nothing moves linearly: sine() for cameras and walks, ease() for everything that appears.
// The theme at the bottom draws the whole frame itself (shot changes, captions, end card), see kit/stage.html.
import { clamp, lerp, rnd, esc } from './index.js';
import { textW, sentenceAt } from './trassa.js';

export const W = 1080, H = 1920, FLOOR = 1200;
export const V = {
  bg: '#17364A', floor: '#102838', mid: '#1F4A63', obj: '#245672', deep: '#0C1F2C', amber: '#F2B441', white: '#FFFFFF',
  line: '#0B1620', skin: '#F4D9C2', legs: '#7C8A93', ilya: '#6F9A97', vika: '#F2B441', gordeev: '#8A8F98',
  crowd: ['#D9B88F', '#B9C2C1', '#C98B7A'], soft: '#B9C2C1',
};

const n = (x) => Math.round(x * 100) / 100;
const TAU = Math.PI * 2;
let uid = 0; // ids of clip paths inside one frame

// ---------- motion ----------
export const sine = (p) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(p)); // cameras, walks
export const ease = (p) => { p = clamp(p); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }; // things that appear or turn
// a value that climbs by one at each of the given moments, each climb eased over len seconds (for rolling numbers)
export const steps = (t, times, len = 0.4) => times.reduce((s, x) => s + ease((t - x) / len), 0);
// one soft hop: 0 -> h -> 0 over len seconds
export const hop = (since, h = 12, len = 0.42) => (since <= 0 || since >= len ? 0 : h * Math.pow(Math.sin((Math.PI * since) / len), 2));
// eased walk from a to b that starts at t0 and lasts dur: position, step phase and how wide the steps are
export const travel = (t, t0, dur, a, b, stride = 150) => {
  const p = clamp((t - t0) / dur), x = lerp(a, b, sine(p));
  return { x, p, ph: Math.abs(x - a) / stride, amp: Math.min(1, 2.4 * Math.sin(Math.PI * p)) };
};

// camera: scale around a point of the floor line, so the caption band stays where it is. The scale keeps five
// decimals: a slow push-in rounded to hundredths moves in visible jumps.
export const cam = (inner, { s = 1, x = 0, y = 0, cx = 540, cy = FLOOR } = {}) =>
  `<g transform="translate(${n(cx + x)} ${n(cy + y)}) scale(${s.toFixed(5)}) translate(${-cx} ${-cy})">${inner}</g>`;

export const label = (x, y, str, { size = 52, weight = 800, fill = V.white, anchor = 'middle', ls = 1, opacity = 1 } = {}) =>
  `<text x="${n(x)}" y="${n(y)}" text-anchor="${anchor}" font-family="Mont" font-weight="${weight}" font-size="${n(size)}" letter-spacing="${ls}" fill="${fill}" text-rendering="geometricPrecision"${opacity < 1 ? ` opacity="${n(opacity)}"` : ''}>${esc(str)}</text>`;

// ---------- filters: the hand of the artist ----------
// hd0..hd3: a still wobble (the drawing) plus a small one whose seed changes every 6 frames (the line boil).
// ink: the still wobble alone, for handwriting on paper. boil = number of the 6-frame step.
export const defs = (boil = 0) => {
  const still = (seed) => `<feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="${seed}" result="a"/><feDisplacementMap in="SourceGraphic" in2="a" scale="13" xChannelSelector="R" yChannelSelector="G" result="b"/>`;
  const hand = (i) => `<filter id="hd${i}" x="-30%" y="-14%" width="160%" height="128%" color-interpolation-filters="sRGB">${still(7 + i * 5)}<feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="1" seed="${40 + i * 9 + (boil % 4)}" result="c"/><feDisplacementMap in="b" in2="c" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter>`;
  // sf0..sf3: the calm hand of kit/people.js (style 3): a line that is clean but not a ruler's, a boil you feel more than see
  const soft = (i) => `<filter id="sf${i}" x="-24%" y="-12%" width="148%" height="124%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="${11 + i * 5}" result="a"/><feDisplacementMap in="SourceGraphic" in2="a" scale="2.8" xChannelSelector="R" yChannelSelector="G" result="b"/><feTurbulence type="fractalNoise" baseFrequency="0.034" numOctaves="1" seed="${60 + i * 9 + (boil % 4)}" result="c"/><feDisplacementMap in="b" in2="c" scale="1.3" xChannelSelector="R" yChannelSelector="G"/></filter>`;
  return `${[0, 1, 2, 3].map(hand).join('')}${[0, 1, 2, 3].map(soft).join('')}<filter id="ink" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">${still(3)}</filter><clipPath id="fc"><rect width="${W}" height="${H}"/></clipPath>`;
};

// ---------- people ----------
const INK = `stroke="${V.line}" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"`;
// eyes close for a moment every 3-5 seconds; open on the first frame
const blinkAt = (t, seed) => {
  const per = 3.3 + 1.9 * rnd(seed + 1), u = (((t + per * (0.35 + 0.5 * rnd(seed + 2))) % per) + per) % per;
  return u < 0.1 ? ease(u / 0.1) : u < 0.15 ? 1 : u < 0.3 ? 1 - ease((u - 0.15) / 0.15) : 0;
};
// rounded body: top and bottom widths, top and bottom corner radii
const bean = (wt, wb, yt, yb, rt, rb) => {
  const a = wt / 2, b = wb / 2, sl = (a - b) / (yb - yt);
  return `M${n(-a + rt)} ${n(yt)} L${n(a - rt)} ${n(yt)} Q${n(a)} ${n(yt)} ${n(a - sl * rt)} ${n(yt + rt)} L${n(b + sl * rb)} ${n(yb - rb)} Q${n(b)} ${n(yb)} ${n(b - rb)} ${n(yb)} L${n(-b + rb)} ${n(yb)} Q${n(-b)} ${n(yb)} ${n(-b - sl * rb)} ${n(yb - rb)} L${n(-a + sl * rt)} ${n(yt + rt)} Q${n(-a)} ${n(yt)} ${n(-a + rt)} ${n(yt)} Z`;
};
// ration pack, a prop that people carry; (x, y) = middle of its bottom edge
const packShape = (x, y, s = 1) => `<rect x="${n(x - 40 * s)}" y="${n(y - 56 * s)}" width="${n(80 * s)}" height="${n(56 * s)}" rx="${n(11 * s)}" fill="${V.crowd[0]}" ${INK}/>`;
export const pack = ({ x, y, seed = 0, s = 1, alpha = 1 }) => `<g transform="translate(${n(x)} ${n(y)})" filter="url(#hd${seed % 4})"${alpha < 1 ? ` opacity="${n(alpha)}"` : ''}>${packShape(0, 0, s)}</g>`;

// A person. (x, y) = the point between the feet. k = size (1 adult, 0.66 child); the outline keeps its thickness.
// look / lookY -1..1 move the eyes; walk = { ph, amp } from travel(); hop lifts the whole figure;
// worry 0..1 draws the brows; shoulders widens the top (uniform); cap = peaked cap;
// pack = 1 (carries a ration) or { u, fx, fy } (the ration flies in from the point fx, fy relative to the feet).
export const person = ({ x, y = FLOOR, k = 1, col = V.ilya, t = 0, seed = 0, look = 0, lookY = 0, walk = null, tilt = 0, worry = 0, wide = 1, tall = 1, shoulders = 0, cap = false, hop: up = 0, alpha = 1, pack: pk = 0 }) => {
  if (alpha <= 0.004) return '';
  const r = 72 * k, bw = 144 * k * wide, bh = 236 * k * tall, lw = Math.max(24, 36 * k), ll = 96 * k, ldx = 30 * k * wide;
  const br = Math.sin(TAU * (t / 3.4 + rnd(seed + 5))); // breathing, 1.4 %
  const ph = walk ? walk.ph : 0, amp = walk ? walk.amp : 0, sw = Math.sin(TAU * ph);
  const bob = (-5 * k * amp * (1 - Math.cos(2 * TAU * ph))) / 2 - up;
  const lift = (d) => { const s = d * sw; return s > 0 ? 16 * k * amp * s * s : 0; };
  const yb = -ll + 10 * k + bob, yt = yb - bh * (1 + 0.014 * br), hy = yt - r + 10 * k;
  const legs = [-1, 1].map((d) => `<rect x="${n(d * ldx - lw / 2)}" y="${n(yb - 24 * k)}" width="${n(lw)}" height="${n(Math.max(8, 24 * k - yb - lift(d) - up))}" rx="${n(lw / 2)}" fill="${V.legs}" ${INK}/>`).join('');
  const body = `<path d="${bean(bw * (1 + shoulders) * (1 - 0.006 * br), bw, yt, yb, (shoulders ? 0.3 : 0.44) * bw, 0.3 * bw)}" fill="${col}" ${INK}/>`;
  const er = 9 * Math.pow(k, 0.75), ex = 25 * k, shut = blinkAt(t, seed), ecx = look * 11 * k, ecy = hy + 3 * k + lookY * 8 * k;
  const eyes = [-1, 1].map((d) => `<ellipse cx="${n(d * ex + ecx)}" cy="${n(ecy)}" rx="${n(er)}" ry="${n(er * (1 - 0.86 * shut))}" fill="${V.line}"/>`).join('');
  const brows = worry > 0.02 && !cap ? [-1, 1].map((d) => `<path d="M${n(d * (ex + 15 * k) + ecx)} ${n(ecy - 19 * k)} L${n(d * (ex - 9 * k) + ecx)} ${n(ecy - 28 * k)}" stroke="${V.line}" stroke-width="${n(6.5 * Math.sqrt(k))}" stroke-linecap="round" opacity="${n(clamp(worry))}"/>`).join('') : '';
  const hat = cap ? `<path d="M${n(-r)} ${n(hy - r * 0.3)} Q${n(-r * 1.08)} ${n(hy - r * 1.3)} 0 ${n(hy - r * 1.26)} Q${n(r * 1.08)} ${n(hy - r * 1.3)} ${n(r)} ${n(hy - r * 0.3)} Z" fill="${col}" ${INK}/><rect x="${n(-r * 1.12)}" y="${n(hy - r * 0.44)}" width="${n(r * 2.24)}" height="${n(r * 0.27)}" rx="${n(r * 0.13)}" fill="${V.line}"/>` : '';
  let box = '';
  if (pk) {
    const u = pk === 1 ? 1 : ease(pk.u), hx = 0, hyy = yb - 30 * k;
    if (u > 0) box = pk === 1 || u >= 1 ? packShape(hx, hyy) : `<g opacity="${n(clamp(u * 5))}">${packShape(lerp(pk.fx, hx, u), lerp(pk.fy, hyy, u) - 70 * Math.sin(Math.PI * u))}</g>`;
  }
  return `<g transform="translate(${n(x)} ${n(y)})${tilt ? ` rotate(${n(tilt)})` : ''}" filter="url(#hd${seed % 4})"${alpha < 1 ? ` opacity="${n(alpha)}"` : ''}>${legs}${body}${box}<circle cx="0" cy="${n(hy)}" r="${n(r)}" fill="${V.skin}" ${INK}/>${hat}${eyes}${brows}</g>`;
};

// A dog in the same hand: (x, y) = the point under its belly. dir = where it looks (1 right, -1 left).
export const dog = ({ x, y = FLOOR, s: size = 1, t = 0, seed = 3, walk = null, dir = 1, col = V.crowd[0], alpha = 1 }) => {
  if (alpha <= 0.004) return '';
  const ph = walk ? walk.ph : 0, amp = walk ? walk.amp : 0, sw = Math.sin(TAU * ph), br = Math.sin(TAU * (t / 2.1 + rnd(seed)));
  const lift = (d) => { const s = d * sw; return s > 0 ? 12 * amp * s * s : 0; };
  const bob = (-4 * amp * (1 - Math.cos(2 * TAU * ph))) / 2, hx = dir * 62, hy = -132 + bob, wag = Math.sin(t * 9 + seed) * 10;
  const legs = [-1, 1].map((d) => `<rect x="${n(d * 44 - 12)}" y="${n(-66 + bob)}" width="24" height="${n(66 - bob - lift(d))}" rx="12" fill="${col}" ${INK}/>`).join('');
  const ears = [-1, 1].map((d) => `<ellipse cx="${n(hx + d * 26)}" cy="${n(hy - 30)}" rx="13" ry="20" transform="rotate(${d * 24} ${n(hx + d * 26)} ${n(hy - 30)})" fill="${col}" ${INK}/>`).join('');
  const eyes = [-1, 1].map((d) => `<ellipse cx="${n(hx + d * 14 + dir * 4)}" cy="${n(hy)}" rx="6" ry="${n(6 * (1 - 0.86 * blinkAt(t, seed)))}" fill="${V.line}"/>`).join('');
  return `<g transform="translate(${n(x)} ${n(y)})${size !== 1 ? ` scale(${n(size)})` : ''}" filter="url(#hd${seed % 4})"${alpha < 1 ? ` opacity="${n(alpha)}"` : ''}>
  <path d="M${-dir * 72} ${n(-104 + bob)} Q${-dir * 104} ${n(-128 + bob)} ${n(-dir * (104 + wag * 0.4))} ${n(-158 + bob - Math.abs(wag) * 0.3)}" fill="none" ${INK}/>
  ${legs}<rect x="-76" y="${n(-124 + bob - 1.2 * br)}" width="152" height="${n(78 + 1.2 * br)}" rx="36" fill="${col}" ${INK}/>${ears}<circle cx="${hx}" cy="${n(hy)}" r="42" fill="${col}" ${INK}/>${eyes}</g>`;
};

// ---------- the room ----------
export const bg = (fill = V.bg) => `<rect width="${W}" height="${H}" fill="${fill}"/>`;
export const floor = (y = FLOOR) => `<rect x="-3000" y="${y}" width="7080" height="3000" fill="${V.floor}"/>`;
// something that was not there comes up from the floor: a = 0..1
export const appear = (inner, a, dy = 46) => (a <= 0 ? '' : a >= 1 ? inner : `<g opacity="${n(ease(a))}" transform="translate(0 ${n((1 - ease(a)) * dy)})">${inner}</g>`);

// hanging lamp with its cone of light; swing in degrees
export const lamp = ({ x = 540, y = 230, floor: fy = FLOOR, swing = 0, cone = true } = {}) => {
  const k = 0.394, far = fy + 400, half = 88 + k * (far - y);
  return `<g${swing ? ` transform="rotate(${n(swing)} ${x} -300)"` : ''}>${cone ? `<path d="M${x - 88} ${y} L${x + 88} ${y} L${n(x + half)} ${far} L${n(x - half)} ${far} Z" fill="${V.mid}"/>` : ''}
  <rect x="${x - 4}" y="-600" width="8" height="${y + 600 - 50}" fill="${V.deep}"/><path d="M${x - 88} ${y} Q${x - 80} ${y - 62} ${x} ${y - 62} Q${x + 80} ${y - 62} ${x + 88} ${y} Z" fill="${V.deep}"/><circle cx="${x}" cy="${y + 14}" r="26" fill="${V.amber}"/></g>`;
};

// round steel door with a wheel. open 0..1 rolls the disc aside by `away` px and shows the dark opening; turn = wheel angle
export const hatch = ({ x = 250, y = FLOOR - 360, r = 208, turn = 0, open = 0, away = -330 } = {}) => {
  const dx = away * open, rot = turn + ((dx / r) * 180) / Math.PI;
  const spokes = [90, 30, 150].map((a) => `<path d="M${n(-r * 0.74)} 0 L${n(r * 0.74)} 0" transform="rotate(${a})" stroke="${V.floor}" stroke-width="${n(r * 0.085)}" stroke-linecap="round"/>`).join('');
  return `${open > 0 ? `<circle cx="${x}" cy="${y}" r="${r}" fill="${V.deep}"/>` : ''}<g transform="translate(${n(x + dx)} ${y})"><circle r="${r}" fill="${V.obj}"/><g transform="rotate(${n(rot)})">${spokes}<circle r="${n(r * 0.385)}" fill="${V.floor}"/></g></g>`;
};

// the second door on the far wall: closed, no wheel, a small lamp above it
export const wallDoor = ({ x = 1000, floor: fy = FLOOR, w = 132, h = 256, lit = 1 } = {}) =>
  `<rect x="${x - w / 2}" y="${fy - h}" width="${w}" height="${h + 40}" rx="12" fill="${V.obj}"/><circle cx="${n(x + w * 0.27)}" cy="${n(fy - h * 0.47)}" r="9" fill="${V.floor}"/>${lit ? `<circle cx="${x}" cy="${fy - h - 44}" r="11" fill="${V.amber}"/>` : ''}`;

// row of two-tier bunks along the wall
export const bunks = ({ x = 90, floor: fy = FLOOR, count = 3, w = 300, h = 430 } = {}) => {
  let s = '';
  for (let i = 0; i <= count; i++) s += `<rect x="${x + i * w - 11}" y="${fy - h}" width="22" height="${h + 30}" rx="6" fill="${V.obj}"/>`;
  for (const lvl of [0.4, 0.86]) {
    s += `<rect x="${x}" y="${n(fy - h * lvl)}" width="${count * w}" height="34" fill="${V.obj}"/>`;
    for (let i = 0; i < count; i++) s += `<rect x="${x + i * w + 26}" y="${n(fy - h * lvl - 24)}" width="84" height="40" rx="14" fill="${V.obj}"/>`;
  }
  return s;
};

// crate of rations; packs = how many rations show above its edge
export const crate = ({ x = 540, floor: fy = FLOOR, w = 340, h = 220, packs = 0 } = {}) => {
  const top = fy - h;
  const ps = Array.from({ length: packs }, (_, i) => pack({ x: x - w / 2 + 74 + (i * (w - 148)) / Math.max(1, packs - 1), y: top + 18, seed: i + 1 })).join('');
  return `${ps}<rect x="${x - w / 2}" y="${top}" width="${w}" height="${h}" fill="${V.obj}"/>${[1, 2].map((i) => `<rect x="${x - w / 2}" y="${n(top + (h * i) / 3 - 5)}" width="${w}" height="10" fill="${V.mid}"/>`).join('')}`;
};

// air filter: a cylinder with slits and a pipe to the ceiling
export const filterUnit = ({ x = 170, floor: fy = FLOOR } = {}) =>
  `<rect x="${x - 20}" y="-600" width="40" height="${fy - 330 + 640}" fill="${V.obj}"/><rect x="${x - 85}" y="${fy - 330}" width="170" height="370" rx="30" fill="${V.obj}"/>${[0, 1, 2, 3].map((i) => `<rect x="${x - 50}" y="${fy - 262 + i * 46}" width="100" height="14" rx="7" fill="${V.floor}"/>`).join('')}`;

// water tank: a barrel with two hoops
export const barrel = ({ x = 560, floor: fy = FLOOR } = {}) =>
  `<rect x="${x - 125}" y="${fy - 300}" width="250" height="340" rx="44" fill="${V.obj}"/>${[68, 212].map((d) => `<rect x="${x - 125}" y="${fy - 300 + d}" width="250" height="16" fill="${V.mid}"/>`).join('')}`;

// school from the street: two wings with one row of windows, a taller middle with the entrance and the sign above it
// (the sign sits on the middle block, clear of the heads of the people who walk past the left wing)
export const school = ({ x = 600, ground = FLOOR, sign = 'ШКОЛА № 14' } = {}) => {
  let wins = '';
  for (const side of [-1, 1]) for (let c = 0; c < 3; c++) wins += `<rect x="${x + side * (205 + c * 112) - 42}" y="${ground - 400}" width="84" height="116" rx="6" fill="${V.obj}"/>`;
  return `<rect x="${x - 480}" y="${ground - 470}" width="960" height="510" fill="${V.mid}"/><rect x="${x - 140}" y="${ground - 620}" width="280" height="660" fill="${V.mid}"/>${wins}
  <rect x="${x - 66}" y="${ground - 204}" width="132" height="244" rx="8" fill="${V.deep}"/>${label(x, ground - 500, sign, { size: 32, ls: 2 })}`;
};

// stairs that come down from the left to the floor line; the landing starts at x0
export const STAIR = { x0: 230, run: 72, rise: 84 };
export const stairs = ({ x0 = STAIR.x0, run = STAIR.run, rise = STAIR.rise, count = 16, floor: fy = FLOOR } = {}) => {
  let d = `M3000 ${fy} L${x0} ${fy}`;
  for (let i = 0; i < count; i++) d += ` L${x0 - i * run} ${fy - (i + 1) * rise} L${x0 - (i + 1) * run} ${fy - (i + 1) * rise}`;
  return `<path d="${d} L-3000 ${fy - count * rise} L-3000 ${fy + 3000} L3000 ${fy + 3000} Z" fill="${V.floor}"/>`;
};
// height of the stairs under a walker at x: the step edges are smoothed, so feet glide from step to step
export const stairY = (x, { x0, run, rise } = STAIR, fy = FLOOR) => {
  const jj = (x0 - x) / run + 0.5;
  if (jj <= 0) return fy;
  const m = Math.floor(jj);
  return fy - rise * (m + ease((jj - m - 0.2) / 0.6));
};

// page of the logbook: a printed head and ruled lines; it goes on below the frame
export const page = ({ x = 130, y = 330, w = 820, head = 'ЖУРНАЛ УЧЁТА', rows = [1000, 1470, 1940] } = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="2800" rx="24" fill="${V.obj}"/>${label(x + 64, y + 150, head, { size: 50, fill: V.floor, anchor: 'start', ls: 3 })}<rect x="${x + 64}" y="${y + 188}" width="${w - 128}" height="8" rx="4" fill="${V.floor}"/>${rows.map((r) => `<rect x="${x + 64}" y="${r}" width="${w - 128}" height="8" rx="4" fill="${V.mid}"/>`).join('')}`;

// digits written by hand, stroke after stroke. (x, y) = left end of the baseline; a = 0..1 how much is written.
const GLYPH = {
  four: ['M66 4 L10 100 L98 100', 'M72 50 L72 150'],
  three: ['M14 24 C36 -6 92 -2 86 38 C82 66 54 72 40 74 C74 74 98 96 90 122 C82 156 24 156 8 126'],
  open4: ['M26 4 L12 94 L98 94', 'M78 28 L68 150'], // another hand: the top is open, the stem leans
};
export const written = ({ x, y, glyphs, s = 1.3, gap = 126, sw = 18, a = 1, skew = 0, fill = V.white }) => {
  const strokes = glyphs.flatMap((g, i) => GLYPH[g].map((d) => ({ d, dx: i * gap })));
  const body = strokes.map((st, j) => {
    const k = ease(clamp(a * strokes.length - j));
    return k <= 0 ? '' : `<path d="${st.d}" transform="translate(${st.dx} 0)" pathLength="1" stroke-dasharray="1 2" stroke-dashoffset="${(1 - k).toFixed(4)}" fill="none" stroke="${fill}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join('');
  return `<g transform="translate(${n(x)} ${n(y)}) skewX(${skew}) scale(${s}) translate(0 -150)" filter="url(#ink)">${body}</g>`;
};

// ---------- tags ----------
// small amber tag, text only. (x, y) = top-left corner; a = 0..1 lets it slide in
export const tag = ({ x = 68, y = 330, text: str, size = 52, a = 1, pad = 1 }) => {
  if (a <= 0) return '';
  const e = ease(a), w = textW(str, size, 1) + 2 * pad * size, h = size * 1.92;
  return `<g opacity="${n(e)}" transform="translate(${n(x - (1 - e) * 36)} ${n(y)})"><rect width="${n(w)}" height="${n(h)}" rx="${n(size * 0.3)}" fill="${V.amber}"/>${label(w / 2, h / 2 + size * 0.355, str, { size, fill: V.floor })}</g>`;
};
// tag whose value rolls: pos 0 shows values[0], 1.5 is halfway between values[1] and values[2] (see steps()).
// Strings of digits of equal length roll digit by digit, like a counter; other texts roll whole.
export const rollTag = ({ x = 68, y = 330, values, pos = 0, size = 52, a = 1, pad = 1 }) => {
  if (a <= 0) return '';
  const last = values.length - 1, i = Math.min(last, Math.max(0, Math.floor(pos))), f = i >= last ? 0 : clamp(pos - i);
  const A = String(values[i]), B = String(values[Math.min(last, i + 1)]), h = size * 1.92, base = h / 2 + size * 0.355, e = ease(a), far = h * 0.78, o = { size, fill: V.floor };
  const pair = (cx, p, q) => (f === 0 || p === q ? label(cx, base, p, o) : label(cx, base - f * far, p, { ...o, opacity: 1 - f }) + label(cx, base + (1 - f) * far, q, { ...o, opacity: f }));
  let inner = '', w;
  if (A.length === B.length && /^[\d:]+$/.test(A + B)) {
    let cx = pad * size;
    [...A].forEach((ch, j) => { const cw = size * (ch === ':' ? 0.36 : 0.72); inner += pair(cx + cw / 2, ch, B[j]); cx += cw; });
    w = cx + pad * size;
  } else {
    w = lerp(textW(A, size, 1), textW(B, size, 1), f) + 2 * pad * size;
    inner = pair(w / 2, A, B);
  }
  const id = `tg${uid++}`, box = `width="${n(w)}" height="${n(h)}" rx="${n(size * 0.3)}"`;
  return `<g opacity="${n(e)}" transform="translate(${n(x - (1 - e) * 36)} ${n(y)})"><clipPath id="${id}"><rect ${box}/></clipPath><rect ${box} fill="${V.amber}"/><g clip-path="url(#${id})">${inner}</g></g>`;
};

// ---------- captions ----------
// White caps in the lower third, one amber keyword, no outline: a thin dark shadow only. A chunk leaves upwards
// in 3 frames and the next one rises in over 6, two frames behind it: the line rolls instead of switching.
const STOP = new Set('в во на с со и а но не ни без по к ко у за из от до о об её его их мой моё мою как что же ведь уже ещё ты я она он мне под кто это'.split(' '));
const lineW = (ws, size) => textW(ws.map((w) => w.w).join(' '), size, 1);
const wrap = (words, size, max) => {
  if (words.length < 2 || lineW(words, size) <= max) return [words];
  let best = 1, score = Infinity;
  for (let k = 1; k < words.length; k++) {
    const a = lineW(words.slice(0, k), size), b = lineW(words.slice(k), size), bare = words[k - 1].w.toLowerCase().replace(/[^а-яё]/g, '');
    // balanced lines; no preposition left hanging; the amber words stay together; nothing much wider than the safe width
    const sc = Math.abs(a - b) + (STOP.has(bare) ? 1e4 : 0) + (words[k - 1].hi && words[k].hi ? 300 : 0) + Math.max(0, Math.max(a, b) - max) * 20;
    if (sc < score) { score = sc; best = k; }
  }
  return [words.slice(0, best), words.slice(best)];
};
export const caption = (ch, t, { y = 1340, size = 78, hi = V.amber, fill = V.white, max = 810, first = false, scale = 1 } = {}) => {
  const a = first ? 1 : ease((t - ch.start - 0.033) / 0.1), b = ease((t - ch.end) / 0.066), op = a * (1 - b); // quick: the voice is fast, a chunk lives about a second
  if (op <= 0.004) return '';
  const lines = wrap(ch.lines.flat(), size, max), fs = n(size * Math.max(0.86, Math.min(1, max / Math.max(...lines.map((ln) => lineW(ln, size)))))); // a line slightly too wide is set smaller
  const lh = fs * 1.18, y0 = y - ((lines.length - 1) * lh) / 2;
  const row = (dark) => lines.map((ln, i) => `<text x="540" y="${n(y0 + i * lh)}" text-anchor="middle" font-family="Mont" font-weight="800" font-size="${fs}" letter-spacing="1" text-rendering="geometricPrecision">${ln.map((w) => `<tspan fill="${dark ? V.line : w.hi ? hi : fill}">${esc(w.w)}</tspan>`).join(' ')}</text>`).join('');
  return `<g opacity="${n(op)}" transform="translate(540 ${n(y + (1 - a) * 12 - b * 12)}) scale(${scale.toFixed(5)}) translate(-540 ${-y})"><g transform="translate(0 5)" opacity="0.45">${row(true)}</g>${row(false)}</g>`;
};

// ---------- end card and cover ----------
// No account name and no question: «Продолжение завтра», the next episode under it, an amber line. t = seconds on the card
export const endCard = ({ t = 9, p = 1, line = 'Продолжение завтра', sub = 'Серия 2' } = {}) => {
  const words = line.split(' '), a = ease((t - 0.3) / 0.45), g = ease((t - 0.5) / 0.6), b = ease((t - 0.75) / 0.45), y0 = 900 - (words.length - 1) * 66;
  return `${bg(V.floor)}<g transform="translate(540 960) scale(${(1 + 0.03 * sine(p)).toFixed(5)}) translate(-540 -960)">
  <g opacity="${n(a)}" transform="translate(0 ${n((1 - a) * 26)})">${words.map((wd, i) => label(540, y0 + i * 132, wd, { size: 118 })).join('')}</g>
  <rect x="${n(540 - 130 * g)}" y="${y0 + (words.length - 1) * 132 + 62}" width="${n(260 * g)}" height="10" rx="5" fill="${V.amber}" opacity="${n(g)}"/>
  <g opacity="${n(b)}" transform="translate(0 ${n((1 - b) * 18)})">${label(540, y0 + (words.length - 1) * 132 + 164, sub, { size: 52, weight: 600, fill: V.soft })}</g></g>`;
};

// The viewer's choice (owner 19.11.2026: «зритель пусть выбирает, что будет дальше»): the last shot of an episode, under
// the voice that names the two options and calls for comments. a, b, c = seconds since option A, option B and the call
// were named (c.since of their phrases); optA / optB in caps, two or three words each. The shot hides the captions:
// give it caption: { hide: true }.
export const choiceCard = ({ a = 9, b = 9, c = 9, q = 'ЧТО ДЕЛАТЬ?', optA = '', optB = '', call = 'ПИШИ В КОММЕНТАРИЯХ', p = 1, back = V.floor, fill = V.mid }) => {
  const plate = (y, letter, str, u) => {
    if (u <= 0) return '';
    const e = ease(u / 0.35), fs = Math.min(66, (650 / textW(str, 66, 1)) * 66);
    return `<g opacity="${n(e)}" transform="translate(${n((1 - e) * 40)} 0)"><rect x="80" y="${y}" width="920" height="176" rx="38" fill="${fill}"/><circle cx="184" cy="${y + 88}" r="58" fill="${V.amber}"/>${label(184, y + 88 + 26, letter, { size: 74, fill: V.floor })}${label(278, y + 88 + fs * 0.355, str, { size: n(fs), anchor: 'start' })}</g>`;
  };
  const k = ease(c / 0.35);
  return `${bg(back)}<g transform="translate(540 960) scale(${(1 + 0.03 * sine(p)).toFixed(5)}) translate(-540 -960)">${label(540, 500, q, { size: 96 })}${plate(600, 'А', optA, a)}${plate(820, 'Б', optB, b)}
  ${c > 0 ? `<g opacity="${n(k)}" transform="translate(0 ${n((1 - k) * 20)})">${label(540, 1150, call, { size: 60, fill: V.amber, ls: 2 })}</g>` : ''}</g>`;
};

// Cover for the profile grid: the frame of the series (art), the tag «СЕРИЯ N», the title in caps and a ribbon.
// hookHi = the part of the ribbon text that is amber.
export const cover = ({ ep = 1, title = [], hook = '', hookHi = '', art = '' } = {}) => {
  uid = 0;
  const size = Math.min(122, ...title.map((ln) => (900 / textW(ln, 122, 1)) * 122)), lh = size * 1.1, y0 = 1352, ry = y0 + (title.length - 1) * lh + 48;
  const hs = 56, plainW = textW(hook, hs, 1), i = hookHi ? hook.indexOf(hookHi) : -1;
  const rib = i < 0 ? label(540, ry + 73, hook, { size: hs })
    : `<text x="540" y="${n(ry + 73)}" text-anchor="middle" font-family="Mont" font-weight="800" font-size="${hs}" letter-spacing="1"><tspan fill="${V.white}">${esc(hook.slice(0, i))}</tspan><tspan fill="${V.amber}">${esc(hookHi)}</tspan><tspan fill="${V.white}">${esc(hook.slice(i + hookHi.length))}</tspan></text>`;
  return `<defs>${defs(0)}</defs>${bg()}${art}${tag({ text: `СЕРИЯ ${ep}` })}
  ${title.map((ln, k) => label(540, y0 + k * lh, ln, { size: n(size) })).join('')}
  <rect x="${n(540 - plainW / 2 - 54)}" y="${n(ry)}" width="${n(plainW + 108)}" height="110" rx="18" fill="${V.mid}"/>${rib}`;
};

// ---------- the frame ----------
// Shot changes are never cuts. A shot enters by `enter`: 'dissolve' (default, 12 frames) or a slide 'up' / 'left'
// (14 frames; 'up' = the new shot comes from below). The change starts LEAD seconds before the shot's first word
// and ends LAG seconds after it; both shots are drawn meanwhile, so draw() must accept t a little below zero and
// past the end. draw(p, t, c): p = 0..1 over everything the shot is seen for, t = seconds from its first word,
// c = { t (episode time), len, sp(i), since(i), dur(i), at(i, k) = seconds since sentence k of phrase i began;
// the moment is taken from the pauses of the voice (timeline marks), so it holds after a long stop too }.
const LEAD = { dissolve: 0.13, up: 0.2, left: 0.2 }, LAG = 0.27;
export function frame(ep, tl, t) {
  uid = 0;
  const N = ep.shots.length, th = ep.theme || {};
  const texts = ep.narration.map((u) => (typeof u === 'string' ? u : u.text));
  const start = (i) => (i < N ? tl.shots[i].start : tl.endCardStart), end = (i) => (i < N ? tl.shots[i].end : tl.total);
  const kind = (i) => (i < N && ep.shots[i].enter) || 'dissolve', lead = (i) => (i ? LEAD[kind(i)] : 0);
  const span = (i) => [start(i) - lead(i), i < N ? end(i) + LAG : end(i)];
  const c = {
    t,
    sp: (i) => clamp((t - tl.sent[i].start) / (tl.sent[i].end - tl.sent[i].start)),
    since: (i) => t - tl.sent[i].start,
    dur: (i) => tl.sent[i].end - tl.sent[i].start,
    at: (i, k = 0) => t - (tl.sent[i].marks?.[k] ?? tl.sent[i].start + sentenceAt(texts[i], k) * (tl.sent[i].end - tl.sent[i].start)),
  };
  const draw = (i) => {
    const [a, b] = span(i), p = clamp((t - a) / (b - a));
    if (i === N) return (th.endCard || endCard)({ t: t - tl.endCardStart, p, ...(ep.endCard || {}) });
    return ep.shots[i].draw(p, t - start(i), { ...c, len: end(i) - start(i) });
  };
  let i = 0;
  while (i < N && t >= start(i + 1) - lead(i + 1)) i++;
  const u = i ? (t - span(i)[0]) / (lead(i) + LAG) : 1;
  let pic;
  if (u >= 1) pic = draw(i);
  else if (kind(i) === 'dissolve') pic = `${draw(i - 1)}<g opacity="${sine(u).toFixed(4)}">${draw(i)}</g>`;
  else {
    const e = ease(u), [dx, dy] = kind(i) === 'up' ? [0, H] : [W, 0], clip = (s, k) => `<g transform="translate(${n(dx * k)} ${n(dy * k)})"><g clip-path="url(#fc)">${s}</g></g>`;
    pic = clip(draw(i - 1), -e) + clip(draw(i), 1 - e);
  }
  const shotOf = (x) => { let k = 0; while (k < N - 1 && x >= start(k + 1)) k++; return k; };
  const caps = tl.chunks.filter((ch) => t >= ch.start && t < ch.end + 0.1).map((ch) => {
    const k = shotOf(ch.start), o = { ...th.caption, ...ep.shots[k].caption }, [a, b] = span(k);
    if (o.hide) return ''; // the shot shows the words itself (choiceCard)
    return caption(ch, t, { ...o, first: ch.start === 0, scale: 1 + (o.push || 0) * sine((t - a) / (b - a)) });
  }).join('');
  return `<defs>${defs(Math.floor(Math.round(t * tl.fps) / 6))}</defs>${pic}${caps}`;
}

export const theme = { frame, cover, endCard, caption: { size: 78 } };
export { sentenceAt, textW };
