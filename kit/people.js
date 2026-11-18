// People, style 3 (19.11.2026). The owner: «мне нравится стиль, но отрисовка персонажей мне не очень приятная».
// The poster stays flat and the people keep their hand-drawn dark outline, but they are people now: arms and hands,
// hair, clothes, a small face that can be afraid, a calmer line (the filters sf0..sf3 of kit/v2.js wobble a third as
// much as hd0..hd3). Same contract as kit/v2.js: pure JS, every function returns an SVG string for the 1080x1920 stage.
//
//   human({ x, y, k, col, ... })   a person; (x, y) = the point between the feet, k = size (1 adult, 0.64 child)
//   shade({ x, y, k, col, ... })   the same figure as a flat silhouette with pale eyes: crowds, the dead, far people
//
// Angles of the arms are in degrees from «hanging down»: 0 = down, 90 = straight out to the arm's own side, 180 = up.
// An arm is drawn behind the body unless it is listed in `front` ('L', 'R' or 'LR'): then it lies over the chest.
import { clamp, lerp, rnd } from './index.js';
import { FLOOR, ease } from './v2.js';

const n = (x) => Math.round(x * 100) / 100;
const TAU = Math.PI * 2, RAD = Math.PI / 180;
let uid = 0; // ids of clip paths (unique inside a frame is enough)
// colour between two hex colours
export const mix = (a, b, p) => { const h = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); const A = h(a), B = h(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * p).toString(16).padStart(2, '0')).join(''); };

export const P = {
  line: '#17222F', skin: '#F6D9C2', blush: '#F0A08A', white: '#FFFFFF', shoe: '#27323F', legs: '#55667E',
  hair: { dark: '#3D2C26', black: '#272C3A', ginger: '#C9783F', blond: '#E6C47E', grey: '#C5C9CF', brown: '#7A5234' },
};

// the look of the whole cast: one place to change it (tools/sheet.mjs draws variants by passing `style` to human())
export const STYLE = { ow: 6.5, head: 61, torsoW: 122, torsoH: 166, leg: 146, legW: 34, arm: 146, armW: 29, blush: 0.42, filt: 'sf', shadow: 0.16, whites: 0, tone: 0 };

const blinkAt = (t, seed) => {
  const per = 3.3 + 1.9 * rnd(seed + 1), u = (((t + per * (0.35 + 0.5 * rnd(seed + 2))) % per) + per) % per;
  return u < 0.1 ? ease(u / 0.1) : u < 0.15 ? 1 : u < 0.3 ? 1 - ease((u - 0.15) / 0.15) : 0;
};
// rounded body: top and bottom widths, top and bottom corner radii
export const bean = (wt, wb, yt, yb, rt, rb) => {
  const a = wt / 2, b = wb / 2, sl = (a - b) / (yb - yt);
  return `M${n(-a + rt)} ${n(yt)} L${n(a - rt)} ${n(yt)} Q${n(a)} ${n(yt)} ${n(a - sl * rt)} ${n(yt + rt)} L${n(b + sl * rb)} ${n(yb - rb)} Q${n(b)} ${n(yb)} ${n(b - rb)} ${n(yb)} L${n(-b + rb)} ${n(yb)} Q${n(-b)} ${n(yb)} ${n(-b - sl * rb)} ${n(yb - rb)} L${n(-a + sl * rt)} ${n(yt + rt)} Q${n(-a)} ${n(yt)} ${n(-a + rt)} ${n(yt)} Z`;
};
// a limb: a thick rounded stroke over a slightly thicker dark one (the outline); bend pushes its middle sideways
export const limbPath = (x1, y1, x2, y2, bend) => {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
  return `M${n(x1)} ${n(y1)} Q${n((x1 + x2) / 2 - (dy / L) * bend)} ${n((y1 + y2) / 2 + (dx / L) * bend)} ${n(x2)} ${n(y2)}`;
};
export const limb = (d, w, fill, ow, line) => `${ow ? `<path d="${d}" fill="none" stroke="${line}" stroke-width="${n(w + 2 * ow)}" stroke-linecap="round"/>` : ''}<path d="${d}" fill="none" stroke="${fill}" stroke-width="${n(w)}" stroke-linecap="round"/>`;

// hair: `back` is drawn behind the head, `top` over it. r = head radius, (0, hy) = head centre
const HAIR = {
  bald: () => ({ back: '', top: '' }),
  short: (r, hy, ink, c) => ({ back: '', top: `<path d="M${n(-r * 1.03)} ${n(hy - r * 0.02)} C${n(-r * 1.1)} ${n(hy - r * 1.42)} ${n(r * 1.1)} ${n(hy - r * 1.42)} ${n(r * 1.03)} ${n(hy - r * 0.02)} C${n(r * 0.86)} ${n(hy - r * 0.5)} ${n(r * 0.42)} ${n(hy - r * 0.7)} ${n(-r * 0.12)} ${n(hy - r * 0.5)} C${n(-r * 0.5)} ${n(hy - r * 0.36)} ${n(-r * 0.86)} ${n(hy - r * 0.3)} ${n(-r * 1.03)} ${n(hy - r * 0.02)} Z" fill="${c}" ${ink}/>` }),
  crop: (r, hy, ink, c) => ({ back: '', top: `<path d="M${n(-r * 1.02)} ${n(hy - r * 0.16)} C${n(-r * 1.06)} ${n(hy - r * 1.36)} ${n(r * 1.06)} ${n(hy - r * 1.36)} ${n(r * 1.02)} ${n(hy - r * 0.16)} C${n(r * 0.6)} ${n(hy - r * 0.62)} ${n(-r * 0.6)} ${n(hy - r * 0.62)} ${n(-r * 1.02)} ${n(hy - r * 0.16)} Z" fill="${c}" ${ink}/>` }),
  bob: (r, hy, ink, c) => ({
    back: `<path d="M${n(-r * 1.16)} ${n(hy + r * 0.86)} C${n(-r * 1.5)} ${n(hy - r * 1.7)} ${n(r * 1.5)} ${n(hy - r * 1.7)} ${n(r * 1.16)} ${n(hy + r * 0.86)} Z" fill="${c}" ${ink}/>`,
    top: `<path d="M${n(-r * 1.02)} ${n(hy + r * 0.04)} C${n(-r * 1.08)} ${n(hy - r * 1.38)} ${n(r * 1.08)} ${n(hy - r * 1.38)} ${n(r * 1.02)} ${n(hy + r * 0.04)} C${n(r * 0.9)} ${n(hy - r * 0.46)} ${n(r * 0.5)} ${n(hy - r * 0.72)} ${n(r * 0.16)} ${n(hy - r * 0.6)} C${n(-r * 0.2)} ${n(hy - r * 0.3)} ${n(-r * 0.8)} ${n(hy - r * 0.28)} ${n(-r * 1.02)} ${n(hy + r * 0.04)} Z" fill="${c}" ${ink}/>`,
  }),
  tails: (r, hy, ink, c) => ({
    back: [-1, 1].map((d) => `<ellipse cx="${n(d * r * 1.08)}" cy="${n(hy + r * 0.34)}" rx="${n(r * 0.34)}" ry="${n(r * 0.56)}" transform="rotate(${-d * 16} ${n(d * r * 1.08)} ${n(hy + r * 0.34)})" fill="${c}" ${ink}/>`).join(''),
    top: `<path d="M${n(-r * 1.03)} ${n(hy - r * 0.04)} C${n(-r * 1.1)} ${n(hy - r * 1.4)} ${n(r * 1.1)} ${n(hy - r * 1.4)} ${n(r * 1.03)} ${n(hy - r * 0.04)} C${n(r * 0.8)} ${n(hy - r * 0.5)} ${n(r * 0.3)} ${n(hy - r * 0.62)} 0 ${n(hy - r * 0.66)} C${n(-r * 0.3)} ${n(hy - r * 0.62)} ${n(-r * 0.8)} ${n(hy - r * 0.5)} ${n(-r * 1.03)} ${n(hy - r * 0.04)} Z" fill="${c}" ${ink}/>`,
  }),
  beanie: (r, hy, ink, c) => ({ back: '', top: `<path d="M${n(-r * 1.04)} ${n(hy - r * 0.28)} C${n(-r * 1.04)} ${n(hy - r * 1.5)} ${n(r * 1.04)} ${n(hy - r * 1.5)} ${n(r * 1.04)} ${n(hy - r * 0.28)} Z" fill="${c}" ${ink}/><rect x="${n(-r * 1.12)}" y="${n(hy - r * 0.52)}" width="${n(r * 2.24)}" height="${n(r * 0.36)}" rx="${n(r * 0.16)}" fill="${c}" ${ink}/>` }),
  hood: (r, hy, ink, c) => ({ back: `<path d="M${n(-r * 1.26)} ${n(hy + r * 1.0)} C${n(-r * 1.56)} ${n(hy - r * 1.72)} ${n(r * 1.56)} ${n(hy - r * 1.72)} ${n(r * 1.26)} ${n(hy + r * 1.0)} Z" fill="${c}" ${ink}/>`, top: '' }),
};

// A person. Everything is optional but x.
//   col = clothes, legs = trousers, hair = { style, col } (styles: short, crop, bob, tails, beanie, hood, bald)
//   wear = 'jacket' | 'coat' | 'dress' | 'tee' (jacket has a collar and a zip, coat is long, dress flares)
//   look, lookY = -1..1 where the eyes and the face turn; wide = 0..1 eyes open in fear; worry = 0..1 brows
//   mouth = 'line' | 'o' | 'smile' | 'none'
//   armL, armR = degrees (see the head of the file); front = 'L' | 'R' | 'LR' arms drawn over the chest
//   inL, inR = SVG of a thing held in that hand (origin = the hand, y down)
//   walk = { ph, amp } from travel() of kit/v2.js; hop lifts the figure; leg = 0..1 shorter legs (sitting behind a bench)
//   back = true: seen from behind (no face)
export const human = ({ x, y = FLOOR, k = 1, col = '#6F9A97', legs = P.legs, skin = P.skin, hair = { style: 'short', col: P.hair.dark }, wear = 'jacket',
  col2 = null, t = 0, seed = 0, look = 0, lookY = 0, wide = 0, worry = 0, mouth = 'line', armL = 8, armR = 8, front = '', inL = '', inR = '',
  walk = null, tilt = 0, hop: up = 0, leg = 1, back = false, alpha = 1, shadow = true, style = null }) => {
  if (alpha <= 0.004) return '';
  const S = { ...STYLE, ...(style || {}) }, ow = S.ow, line = P.line;
  const INK = `stroke="${line}" stroke-width="${ow}" stroke-linejoin="round" stroke-linecap="round"`;
  const kh = Math.pow(k, 0.72); // a child's head is big for the body
  const r = S.head * kh, tw = S.torsoW * k, th = S.torsoH * k * (wear === 'coat' ? 1.16 : 1), ll = S.leg * k * leg, lw = Math.max(18, S.legW * k), al = S.arm * k, aw = Math.max(16, S.armW * k);
  const br = Math.sin(TAU * (t / 3.4 + rnd(seed + 5)));
  const ph = walk ? walk.ph : 0, amp = walk ? walk.amp : 0, sw = Math.sin(TAU * ph);
  const bob = (-5 * k * amp * (1 - Math.cos(2 * TAU * ph))) / 2 - up;
  const yh = -ll + 8 * k + bob; // hips
  const yb = yh + 16 * k + (wear === 'coat' ? 26 * k : wear === 'dress' ? 30 * k : 0), yt = yh - th * (1 + 0.012 * br) + (wear === 'coat' ? 0 : 0);
  const hy = yt - r + 7 * kh;
  const neck = `<rect x="${n(-0.27 * r)}" y="${n(hy + 0.6 * r)}" width="${n(0.54 * r)}" height="${n(0.62 * r)}" rx="${n(0.12 * r)}" fill="${skin}" ${INK}/>`;
  // legs: hips to feet; a walking leg swings along x and lifts
  const hipX = lw * 0.56;
  const legOne = (d) => {
    const s = d * sw, fx = d * hipX + 15 * k * amp * s, fy = -up - (s > 0 ? 14 * k * amp * s * s : 0);
    const dth = limbPath(d * hipX, yh, fx, fy - 12 * k, 0);
    return `${limb(dth, lw, legs, ow, line)}<path d="M${n(fx - lw * 0.62)} ${n(fy)} L${n(fx + lw * 0.62)} ${n(fy)} Q${n(fx + lw * 0.74)} ${n(fy - 22 * k)} ${n(fx)} ${n(fy - 24 * k)} Q${n(fx - lw * 0.74)} ${n(fy - 22 * k)} ${n(fx - lw * 0.62)} ${n(fy)} Z" fill="${P.shoe}" ${INK}/>`;
  };
  const legsSvg = ll > 6 ? legOne(-1) + legOne(1) : '';
  // arms
  const shX = tw / 2 - 13 * k, shY = yt + 26 * k;
  const armOne = (d, deg, held) => {
    const a = (deg + (walk ? -d * 12 * amp * sw : 0)) * RAD, hx = d * shX + d * al * Math.sin(a), hyy = shY + al * Math.cos(a);
    const dth = limbPath(d * shX, shY, hx, hyy, d * (deg < 60 ? 9 : 4) * k);
    const rot = (Math.atan2(hyy - shY, hx - d * shX) / RAD);
    return `${limb(dth, aw, col, ow, line)}<ellipse cx="${n(hx)}" cy="${n(hyy)}" rx="${n(aw * 0.66)}" ry="${n(aw * 0.52)}" transform="rotate(${n(rot)} ${n(hx)} ${n(hyy)})" fill="${skin}" ${INK}/>${held ? `<g transform="translate(${n(hx)} ${n(hyy)})">${held}</g>` : ''}`;
  };
  const arm = { L: armOne(-1, armL, inL), R: armOne(1, armR, inR) };
  const behind = ['L', 'R'].filter((s) => !front.includes(s)).map((s) => arm[s]).join(''), over = ['L', 'R'].filter((s) => front.includes(s)).map((s) => arm[s]).join('');
  // body
  const flare = wear === 'dress' ? 1.34 : wear === 'coat' ? 1.1 : 0.9;
  const bd = bean(tw * (1 - 0.005 * br), tw * flare, yt, yb, 0.36 * tw, wear === 'dress' ? 0.12 * tw : 0.2 * tw), cid = `pb${uid++}`;
  // tone: one flat darker band down the right side of the body (never a gradient)
  const toned = S.tone > 0.02 ? `<clipPath id="${cid}"><path d="${bd}"/></clipPath><rect x="${n(tw * 0.2)}" y="${n(yt - 4)}" width="${n(tw)}" height="${n(yb - yt + 8)}" fill="${mix(col, line, S.tone)}" clip-path="url(#${cid})"/>` : '';
  const body = `<path d="${bd}" fill="${col}" ${INK}/>${toned}${toned ? `<path d="${bd}" fill="none" ${INK}/>` : ''}`;
  const thin = `stroke="${line}" stroke-width="${n(ow * 0.72)}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  let trim = '';
  if (!back) {
    if (wear === 'jacket' || wear === 'coat') trim = `<path d="M${n(-0.17 * tw)} ${n(yt + 5 * k)} L0 ${n(yt + 0.2 * th)} L${n(0.17 * tw)} ${n(yt + 5 * k)}" ${thin}/><path d="M0 ${n(yt + 0.2 * th)} L0 ${n(yb - 8 * k)}" ${thin}/>`;
    if (col2) trim += `<path d="M${n(-0.3 * tw)} ${n(yt + 3 * k)} Q0 ${n(yt + 0.22 * th)} ${n(0.3 * tw)} ${n(yt + 3 * k)} L${n(0.24 * tw)} ${n(yt + 0.2 * th)} Q0 ${n(yt + 0.36 * th)} ${n(-0.24 * tw)} ${n(yt + 0.2 * th)} Z" fill="${col2}" ${INK}/>`;
  }
  // head
  const hs = HAIR[hair.style] || HAIR.short, hh = hs(r, hy, INK, hair.col || P.hair.dark);
  const head = back && hair.style !== 'bald'
    ? `<circle cx="0" cy="${n(hy)}" r="${n(r)}" fill="${hair.style === 'hood' || hair.style === 'beanie' ? hair.col : hair.col || P.hair.dark}" ${INK}/>`
    : `<circle cx="0" cy="${n(hy)}" r="${n(r)}" fill="${skin}" ${INK}/>`;
  let face = '';
  if (!back) {
    const fx = look * 0.15 * r, fy = hy + 0.1 * r + lookY * 0.1 * r, ex = 0.36 * r, shut = blinkAt(t, seed), W = clamp(Math.max(wide, S.whites));
    const erx = lerp(0.118, 0.13, W) * r, ery = lerp(0.158, 0.16, W) * r;
    const eyes = [-1, 1].map((d) => {
      const cx = d * ex + fx, px = cx + look * 0.05 * r * W, py = fy + lookY * 0.05 * r * W, open = 1 - 0.86 * shut;
      const white = W > 0.05 ? `<ellipse cx="${n(cx)}" cy="${n(fy)}" rx="${n(0.25 * r * W + erx * (1 - W))}" ry="${n((0.27 * r * W + ery * (1 - W)) * open)}" fill="${P.white}" stroke="${line}" stroke-width="${n(ow * 0.5)}"/>` : '';
      return `${white}<ellipse cx="${n(px)}" cy="${n(py)}" rx="${n(erx)}" ry="${n(ery * open)}" fill="${line}"/>${shut < 0.5 ? `<circle cx="${n(px + 0.045 * r)}" cy="${n(py - 0.06 * r)}" r="${n(0.04 * r)}" fill="${P.white}"/>` : ''}`;
    }).join('');
    // brows: a short stroke over each eye; worry lifts the inner end and the whole brow
    const wv = clamp(worry), by = fy - (0.36 + 0.1 * W + 0.06 * wv) * r;
    const brows = [-1, 1].map((d) => `<path d="M${n(d * (ex + 0.17 * r) + fx)} ${n(by + 0.07 * r * wv)} Q${n(d * ex + fx)} ${n(by - 0.05 * r)} ${n(d * (ex - 0.17 * r) + fx)} ${n(by - 0.1 * r * wv)}" stroke="${line}" stroke-width="${n(ow * 0.62)}" stroke-linecap="round" fill="none"/>`).join('');
    const my = fy + 0.44 * r, mw = 0.15 * r;
    const mth = mouth === 'o' ? `<ellipse cx="${n(fx)}" cy="${n(my + 0.03 * r)}" rx="${n(0.1 * r)}" ry="${n(0.13 * r)}" fill="${line}"/>`
      : mouth === 'smile' ? `<path d="M${n(fx - mw)} ${n(my - 0.03 * r)} Q${n(fx)} ${n(my + 0.13 * r)} ${n(fx + mw)} ${n(my - 0.03 * r)}" ${thin}/>`
      : mouth === 'line' ? `<path d="M${n(fx - mw * 0.8)} ${n(my)} Q${n(fx)} ${n(my + 0.03 * r)} ${n(fx + mw * 0.8)} ${n(my)}" ${thin}/>` : '';
    const blush = S.blush > 0.02 ? [-1, 1].map((d) => `<circle cx="${n(d * 0.6 * r + fx * 0.6)}" cy="${n(fy + 0.3 * r)}" r="${n(0.17 * r)}" fill="${P.blush}" opacity="${n(S.blush)}"/>`).join('') : '';
    face = blush + eyes + brows + mth;
  }
  const sh = shadow && S.shadow > 0 ? `<ellipse cx="0" cy="${n(2 * k)}" rx="${n(tw * 0.62)}" ry="${n(11 * k)}" fill="#000" opacity="${n(S.shadow * clamp(1 - up / (60 * k)))}"/>` : '';
  const filt = S.filt ? ` filter="url(#${S.filt}${seed % 4})"` : '';
  return `<g transform="translate(${n(x)} ${n(y)})">${sh}<g${tilt ? ` transform="rotate(${n(tilt)})"` : ''}${filt}${alpha < 1 ? ` opacity="${n(alpha)}"` : ''}>${hh.back}${behind}${legsSvg}${neck}${body}${trim}${over}${head}${back ? '' : hh.top}${back && (hair.style === 'bald') ? '' : ''}${face}</g></g>`;
};

// The same figure as one flat shape with two pale eyes: the dead, a crowd, someone far away or in the dark.
// lean = degrees; eyes = colour of the eyes or '' for none; armL / armR as in human().
export const shade = ({ x, y = FLOOR, k = 1, col = '#22303F', eyes = '#E9EEF2', t = 0, seed = 0, lean = 0, armL = 6, armR = 6, look = 0, lookY = 0, alpha = 1, hairy = true }) => {
  if (alpha <= 0.004) return '';
  const S = STYLE, kh = Math.pow(k, 0.72), r = S.head * kh, tw = S.torsoW * k, th = S.torsoH * k, ll = S.leg * k, lw = S.legW * k * 1.12, al = S.arm * k, aw = S.armW * k * 1.15;
  const yh = -ll + 8 * k, yb = yh + 16 * k, yt = yh - th, hy = yt - r + 16 * kh, hipX = lw * 0.5, shX = tw / 2 - 13 * k, shY = yt + 26 * k;
  const sway = lean + 1.5 * Math.sin(t * 0.9 + seed * 1.7);
  const st = (d, w) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${n(w)}" stroke-linecap="round"/>`;
  const legs = [-1, 1].map((d) => st(limbPath(d * hipX, yh, d * hipX, -8 * k, 0), lw)).join('');
  const arms = [[-1, armL], [1, armR]].map(([d, deg]) => { const a = deg * RAD; return st(limbPath(d * shX, shY, d * shX + d * al * Math.sin(a), shY + al * Math.cos(a), d * 8 * k), aw); }).join('');
  const ey = eyes ? [-1, 1].map((d) => `<ellipse cx="${n(d * 0.36 * r + look * 0.15 * r)}" cy="${n(hy + 0.1 * r + lookY * 0.1 * r)}" rx="${n(0.12 * r)}" ry="${n(0.15 * r)}" fill="${eyes}"/>`).join('') : '';
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(sway)})"${alpha < 1 ? ` opacity="${n(alpha)}"` : ''}>${legs}${arms}<path d="${bean(tw, tw * 0.9, yt, yb, 0.36 * tw, 0.2 * tw)}" fill="${col}"/><circle cx="0" cy="${n(hy)}" r="${n(r * (hairy ? 1.04 : 1))}" fill="${col}"/>${ey}</g>`;
};

// a crowd of silhouettes between x0 and x1 standing on y: the far ones a little higher, smaller and paler
export const crowd = ({ x0, x1, y, count = 20, k = 0.3, t = 0, seed = 1, depth = 26, col = '#22303F', far = null, eyes = '#E9EEF2', lean = 6, lookY = -0.5 }) => {
  const list = Array.from({ length: count }, (_, i) => ({ i, x: lerp(x0, x1, (i + 0.6 * rnd(seed + i * 7)) / count), d: rnd(seed + i * 13) }));
  return list.sort((a, b) => a.d - b.d).map((m) => shade({ x: m.x, y: y - depth * (1 - m.d), k: k * (0.86 + 0.16 * m.d), col: far && m.d < 0.45 ? far : col, eyes, t, seed: seed + m.i,
    lean: lean * (rnd(seed + m.i * 3) - 0.5) * 2, armL: 4 + 22 * rnd(seed + m.i * 5), armR: 4 + 22 * rnd(seed + m.i * 9), lookY })).join('');
};
