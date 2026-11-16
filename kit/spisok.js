// Details of the series «Список» on top of kit/v2.js (style 2): the same flat poster shapes of the palette V, the same
// hand-drawn people. Same contract: pure JS, every function returns an SVG string for the 1080x1920 stage.
// The power is out in this story, so there are no lamps here: the light shape of a room is the sky in the window.
// Amber is kept for the dot on the dial of the receiver, the tag, the keyword of a caption and the two things the
// story points at: the windows on the evening the power went, the house numbers the hero notices in his notebook.
import { clamp, lerp } from './index.js';
import { V, FLOOR, ease, label } from './v2.js';

const n = (x) => Math.round(x * 100) / 100;

// who wears what in this series, and the colour of chalk
export const S = { you: V.crowd[2], sonya: V.crowd[0], chalk: V.white };

// a line that is drawn by hand: a = 0..1 how much of it is there (needs the «ink» filter of kit/v2.js around it)
const stroke = (d, a, { fill = V.white, sw = 16 } = {}) => {
  const k = ease(a);
  return k <= 0 ? '' : `<path d="${d}" pathLength="1" stroke-dasharray="1 2" stroke-dashoffset="${(1 - k).toFixed(4)}" fill="none" stroke="${fill}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
};

// ---------- the receiver ----------
// Old battery receiver. (x, y) = middle of its bottom edge; s = size (1 = 300 x 190 without the aerial).
// on 0..1 lights the amber dot of the dial; needle 0..1 = where the needle stands on the scale; knob = angle of the
// tuning knob in degrees; pulse 0..1 lets the lit dot breathe with a voice; ant 0..1 = how far the aerial is pulled out.
export const receiver = ({ x, y, s = 1, on = 0, needle = 0.3, knob = 0, pulse = 0, ant = 1 }) => {
  const slits = [0, 1, 2, 3, 4].map((i) => `<rect x="-120" y="${-153 + i * 27}" width="128" height="12" rx="6" fill="${V.floor}"/>`).join('');
  const nx = 46 + clamp(needle) * 68, lit = clamp(on), ax = 112 + 84 * ant, ay = -182 - 236 * ant;
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})">
  <path d="M112 -182 L${n(ax)} ${n(ay)}" stroke="${V.obj}" stroke-width="9" stroke-linecap="round"/><circle cx="${n(ax)}" cy="${n(ay)}" r="9" fill="${V.obj}"/>
  <rect x="-150" y="-190" width="300" height="190" rx="26" fill="${V.obj}"/>${slits}
  <rect x="34" y="-154" width="92" height="46" rx="10" fill="${V.floor}"/><rect x="${n(nx - 3)}" y="-147" width="6" height="32" rx="3" fill="${V.soft}"/>
  <g transform="translate(58 -56)"><circle r="27" fill="${V.floor}"/><path d="M0 -8 L0 -19" transform="rotate(${n(knob)})" stroke="${V.obj}" stroke-width="7" stroke-linecap="round"/></g>
  <circle cx="110" cy="-56" r="14" fill="${V.floor}"/>${lit > 0.004 ? `<circle cx="110" cy="-56" r="${n(14 + 3 * pulse)}" fill="${V.amber}" opacity="${n(lit)}"/>` : ''}</g>`;
};
// how a calm voice moves the lit dot: slow, never still, never a jump (t = seconds)
export const speech = (t) => 0.5 + 0.3 * Math.sin(t * 7.3) + 0.2 * Math.sin(t * 11.9 + 1.3);

// ---------- the room ----------
// Window with the dark town behind it and a sill; the receiver stands on the sill.
export const WIN = { x: 570, y: 330, w: 440, h: 550 };
export const windowCity = ({ x = WIN.x, y = WIN.y, w = WIN.w, h = WIN.h, sill = true } = {}) => {
  const roofs = [[0, 0.21, 0.26], [0.21, 0.19, 0.44], [0.4, 0.24, 0.2], [0.64, 0.17, 0.37], [0.81, 0.19, 0.29]]; // [from, width, height] in parts of the window
  const town = roofs.map(([a, b, c]) => `<rect x="${n(x + a * w)}" y="${n(y + h - c * h)}" width="${n(b * w + 0.5)}" height="${n(c * h)}" fill="${V.floor}"/>`).join('');
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${V.mid}"/>${town}
  <rect x="${n(x + w / 2 - 6)}" y="${y}" width="12" height="${h}" fill="${V.bg}"/><rect x="${x}" y="${n(y + h * 0.36)}" width="${w}" height="12" fill="${V.bg}"/>
  ${sill ? `<rect x="${x - 34}" y="${y + h}" width="${w + 68}" height="30" rx="6" fill="${V.obj}"/>` : ''}`;
};

// Shelf high on the wall (the place where old things are kept) with a box on it. The receiver is put on it by the shot.
export const shelf = ({ x = 380, y = 640, w = 640 } = {}) =>
  `<rect x="${x + 62}" y="${y - 118}" width="170" height="120" rx="10" fill="${V.mid}"/><rect x="${x}" y="${y}" width="${w}" height="30" rx="6" fill="${V.obj}"/>
  ${[0.16, 0.84].map((k) => `<rect x="${n(x + w * k - 11)}" y="${y + 30}" width="22" height="74" rx="8" fill="${V.obj}"/>`).join('')}`;

// ---------- the yard ----------
// Three blocks of flats on one ground line. dim[i] 0..1 lets a block sink into the night (its people are gone);
// lit = [[block, window, 0..1]] paints single windows amber (the evening before the power went);
// sign = text of the plate on the right block. Draw floor() after it.
export const YARD = [{ x: 190, w: 320, h: 690 }, { x: 540, w: 300, h: 540 }, { x: 885, w: 320, h: 740 }];
const panes = (b, ground) => {
  const rows = Math.floor((b.h - 334) / 150) + 1, out = [];
  for (let r = 0; r < rows; r++) for (const side of [-1, 1]) out.push([b.x + side * 72 - 42, ground - b.h + 64 + r * 150]);
  return out;
};
export const houses = ({ ground = FLOOR, dim = [0, 0, 0], lit = [], sign = '', body = V.mid, pane = V.floor } = {}) =>
  YARD.map((b, i) => {
    const top = ground - b.h, box = `x="${b.x - b.w / 2}" y="${top}" width="${b.w}" height="${b.h + 40}"`, ps = panes(b, ground);
    const d = clamp(dim[i] || 0);
    return `<rect ${box} fill="${body}"/>${ps.map(([x, y]) => `<rect x="${x}" y="${y}" width="84" height="100" rx="6" fill="${pane}"/>`).join('')}
    ${lit.filter(([k]) => k === i).map(([, j, a]) => (a > 0.004 && ps[j] ? `<rect x="${ps[j][0]}" y="${ps[j][1]}" width="84" height="100" rx="6" fill="${V.amber}" opacity="${n(clamp(a))}"/>` : '')).join('')}
    <rect x="${b.x - 45}" y="${ground - 150}" width="90" height="190" rx="6" fill="${V.deep}"/>
    ${sign && i === 2 ? `<rect x="${b.x - 118}" y="${ground - 236}" width="236" height="54" rx="8" fill="${V.floor}"/>${label(b.x, ground - 198, sign, { size: 30, ls: 2 })}` : ''}
    ${d > 0.004 ? `<rect ${box} fill="${V.bg}" opacity="${n(0.82 * ease(d))}"/>` : ''}`;
  }).join('');

// ---------- a landing ----------
// Door of a flat seen from the front. open 0..1 swings the leaf inwards: the dark flat shows, the leaf stays visible,
// narrowed, at the hinge side. num = the number above it. mark 0..1 writes a chalk circle on the wall to the right of
// the door (the silent clue of episode 1: the voice never mentions it). chain = 0..1 makes it the same door seen from
// inside the flat, with a peephole and a door chain: 0 = the chain hangs loose from the wall, 1 = it is latched across.
// Draw floor() after it.
export const flatDoor = ({ x, floor: fy = FLOOR, w = 190, h = 490, open = 0, num = '', mark = 0, chain = null }) => {
  const x0 = x - w / 2, top = fy - h, e = ease(open), free = lerp(w, w * 0.3, e), dy = 34 * e;
  const cx = x + w / 2 + 58, cy = fy - h * 0.62;
  return `${e > 0 ? `<rect x="${x0}" y="${top}" width="${w}" height="${h + 40}" fill="${V.deep}"/>` : ''}
  <path d="M${x0} ${top} L${n(x0 + free)} ${n(top + dy)} L${n(x0 + free)} ${n(fy + 40 - dy * 0.7)} L${x0} ${fy + 40} Z" fill="${V.obj}"/>
  ${e < 0.98 ? `<circle cx="${n(x0 + free - 30)}" cy="${n(fy - h * 0.46)}" r="9" fill="${V.floor}" opacity="${n(1 - e)}"/>` : ''}
  ${num ? label(x, top - 28, num, { size: 36, fill: V.soft }) : ''}${chain === null ? '' : doorChain(x + w / 2, fy - h * 0.56, chain) + `<circle cx="${x}" cy="${n(fy - h * 0.76)}" r="8" fill="${V.floor}"/>`}
  ${mark > 0 ? `<g filter="url(#ink)" opacity="0.9"><rect x="${cx - 80}" y="${n(cy - 80)}" width="160" height="160" fill="none"/><g transform="translate(${cx} ${n(cy)})">${stroke('M22 -27 C-8 -44 -37 -22 -35 4 C-33 30 -6 40 16 32 C40 22 42 -12 20 -28 C12 -33 2 -35 -6 -33', mark, { fill: S.chalk, sw: 8 })}</g></g>` : ''}`;
};

// The chain of a door: a plate on the wall at (x, y) = the edge of the leaf, a slot on the leaf, the chain between them.
// u 0..1: the loose end is lifted from where it hangs to the slot, then slides along it to the far end.
const doorChain = (x, y, u) => {
  const L = 190, ax = x + 28, lift = ease(clamp(u) / 0.55), run = ease((clamp(u) - 0.5) / 0.5);
  const ex = lerp(lerp(ax, x - 44, lift), x - 140, run), ey = lerp(y + L, y, lift), d = Math.hypot(ex - ax, ey - y);
  const sag = (Math.sqrt(Math.max(0, L * L - d * d)) / 2) * Math.min(1, Math.abs(ex - ax) / 60); // a chain that hangs straight down has no belly
  return `<rect x="${n(x - 152)}" y="${n(y - 12)}" width="124" height="24" rx="12" fill="${V.floor}"/><rect x="${n(x + 14)}" y="${n(y - 20)}" width="28" height="40" rx="8" fill="${V.floor}"/>
  <path d="M${n(ax)} ${n(y)} Q${n((ax + ex) / 2)} ${n((y + ey) / 2 + sag * 1.6)} ${n(ex)} ${n(ey)}" fill="none" stroke="${V.soft}" stroke-width="7" stroke-linecap="round" stroke-dasharray="11 9"/><circle cx="${n(ex)}" cy="${n(ey)}" r="11" fill="${V.soft}"/>`;
};

// ---------- a kitchen ----------
// Table: a top on two legs. (x = its middle; the top is h above the floor)
export const table = ({ x = 620, w = 520, h = 210, floor: fy = FLOOR } = {}) =>
  `${[-1, 1].map((d) => `<rect x="${n(x + d * (w / 2 - 54) - 13)}" y="${fy - h}" width="26" height="${h + 40}" fill="${V.obj}"/>`).join('')}<rect x="${x - w / 2}" y="${fy - h}" width="${w}" height="30" rx="8" fill="${V.obj}"/>`;
// Chair pushed back from the table. dir = 1: it faces right (the back is on the left).
export const chair = ({ x = 200, floor: fy = FLOOR, dir = 1 } = {}) =>
  `<g transform="translate(${x} ${fy}) scale(${dir} 1)"><rect x="-72" y="-330" width="24" height="370" rx="8" fill="${V.obj}"/><rect x="50" y="-150" width="22" height="190" rx="8" fill="${V.obj}"/><rect x="-72" y="-164" width="150" height="26" rx="8" fill="${V.obj}"/></g>`;
// Mug with steam. (x, y) = middle of its bottom edge; t = seconds (the steam sways); steam 0..1 = how much of it.
export const mug = ({ x, y, t = 0, steam = 1 }) => {
  const wisp = (dx, ph, hgt) => {
    let d = '';
    for (let i = 0; i <= 14; i++) { const u = i / 14, px = dx + 15 * Math.sin(u * 5.2 + ph - t * 1.5) * (0.25 + 0.75 * u); d += `${i ? 'L' : 'M'}${n(px)} ${n(-104 - u * hgt)} `; }
    return `<path d="${d}" fill="none" stroke="${V.soft}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" opacity="${n(0.7 * clamp(steam))}"/>`;
  };
  return `<g transform="translate(${n(x)} ${n(y)})">${steam > 0.004 ? wisp(-16, 0, 118) + wisp(18, 2.1, 150) : ''}
  <path d="M30 -62 Q64 -62 64 -38 Q64 -14 30 -16" fill="none" stroke="${V.soft}" stroke-width="12" stroke-linecap="round"/><rect x="-38" y="-80" width="76" height="80" rx="12" fill="${V.soft}"/></g>`;
};

// ---------- the notebook ----------
// Page of a squared notebook with the addresses written down: every row is a street (one long stroke: the same street
// again and again) and a house number. rows = [{ num: '4', a: 0..1 written, hi: 0..1 amber }]. The page goes on below
// the frame, so draw floor() over it, like page() of kit/v2.js.
const DIGIT = {
  0: ['M52 8 C16 8 10 64 10 80 C10 112 20 150 52 150 C84 150 94 112 94 80 C94 48 88 8 52 8'],
  1: ['M20 44 L58 8 L58 150'],
  2: ['M14 42 C22 2 90 2 86 46 C84 82 30 108 12 148 L96 148'],
  4: ['M66 4 L10 100 L98 100', 'M72 50 L72 150'],
  6: ['M86 14 C44 18 14 66 16 106 C18 140 38 152 56 150 C82 148 94 128 92 108 C90 84 70 72 52 76 C34 80 20 94 16 108'],
  8: ['M52 74 C22 64 22 18 52 8 C82 18 82 64 52 74 C16 88 16 142 52 150 C88 142 88 88 52 74'],
};
export const NOTE = { x: 150, y: 330, w: 780, first: 470, step: 145 };
export const notebook = ({ x = NOTE.x, y = NOTE.y, w = NOTE.w, rows = [] } = {}) => {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="2800" rx="22" fill="${V.obj}"/><rect x="${x + 96}" y="${y}" width="6" height="2800" fill="${V.mid}"/>`;
  for (let i = 0; i < 9; i++) s += `<rect x="${x}" y="${NOTE.first + i * NOTE.step}" width="${w}" height="6" fill="${V.mid}"/>`;
  rows.forEach((r, i) => {
    const by = NOTE.first + i * NOTE.step - 20, a = clamp(r.a ?? 1), digits = [...String(r.num)], sx = x + 150, len = 300, nx = sx + len + 70;
    const strokes = [{ d: `M0 -6 C80 -14 190 2 ${len} -8`, dx: 0, k: 1 }, ...digits.flatMap((ch, j) => DIGIT[ch].map((d) => ({ d, dx: len + 70 + j * 62, k: 0.52 })))];
    const draw = (fill, part) => strokes.map((st, j) => {
      if (part === 'num' && !j) return '';
      const body = stroke(st.d, a * strokes.length - j, { fill, sw: st.k === 1 ? 15 : 15 / st.k });
      return body && `<g transform="translate(${sx + st.dx} ${by}) ${st.k === 1 ? '' : `scale(${st.k}) translate(0 -150)`}">${body}</g>`;
    }).join('');
    s += `<g filter="url(#ink)"><rect x="${sx - 40}" y="${by - 130}" width="${nx - sx + 260}" height="180" fill="none"/>${draw(V.white)}${r.hi > 0.004 ? `<g opacity="${n(ease(r.hi))}">${draw(V.amber, 'num')}</g>` : ''}</g>`;
  });
  return s;
};
