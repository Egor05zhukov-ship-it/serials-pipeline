// Details of the series «Колесо» on top of kit/v2.js (style 2): flat poster shapes, the same hand-drawn people.
// Same contract: pure JS, every function returns an SVG string for the 1080x1920 stage.
// New in this series: every scene has its own flat colour (the critics of «Убежище»: one blue-teal colour for the
// whole episode turns into a grey spot on a phone). The scenes of the series and their palettes:
//   SUN   sunset: the sky in flat warm bands, the wheel a dark silhouette;
//   DAY   daylight: a pale sky, teal cabins, a light cream cabin seen in a cutaway;
//   NIGHT dark blue sky, the cabins with people show amber windows;
//   DAWN  pale lilac sky, then the dark view up through the glass roof;
//   PAPER the scheme: a cream sheet on dark navy.
// Amber (#F2B441) is kept for the lights, the clues and the counters; captions are white (the theme draws them).
// The ground (everything under FLOOR) is dark in every scene, so the white captions always stand on dark.
import { clamp, lerp, rnd } from './index.js';
import { V, FLOOR, ease, label, person, tag, rollTag, textW } from './v2.js';

const n = (x) => Math.round(x * 100) / 100;
const RAD = Math.PI / 180;

export const AMBER = V.amber;
export const K = {
  varya: '#E8604C', // Varya's jacket: the mark of the heroes' cabin in every picture
  dad: '#6F9A97',
  dead: '#8EA58A', // the dead: the same people, grey-green
  crowd: ['#D9B88F', '#B9C2C1', '#C98B7A', '#9DB4D6'],
  ink: '#21364F',
};

// palettes of the scenes: sky, wheel (rim, spokes, legs), cabin, window, ground, platform
export const SUN = {
  bands: ['#4A3466', '#7E4670', '#C25A6A', '#E8825E', '#F4AE76'], sun: '#F8D49A',
  wheel: '#2B1A33', cabin: '#2B1A33', win: '#6E4262', ground: '#1D1224', deck: '#2B1A33',
};
export const DAY = {
  sky: '#A8D8E6', far: '#D4ECF2', wheel: '#4F7A88', cabin: '#2F8F95', win: '#DDF0F4', ground: '#2B3A40', deck: '#3E5862',
  wall: '#F2E6CD', frame: '#2F8F95', glass: '#CBE9F1', bench: '#B66A3C', front: '#9A5530',
};
export const NIGHT = {
  sky: '#14284D', moon: '#DCE3EE', wheel: '#0B1834', cabin: '#26406C', win: '#0E1C38', ground: '#081124', deck: '#22396A',
  wall: '#2A4170', frame: '#172A4F', glass: '#0E1D3C', bench: '#1E335C', front: '#162747',
};
export const DAWN = {
  bands: ['#9C98B8', '#B9B2C9', '#D3C6D2', '#E6CDC0'], wheel: '#4C4A66', cabin: '#5E5B7C', win: '#3C3A55', ground: '#1F1D2E', deck: '#3A384F',
  roof: '#141A28', glass: '#3E4762', bar: '#0E131E',
};
export const PAPER = { back: '#1B2C42', sheet: '#EFE8DA', ink: '#21364F', soft: '#A3ADB8' };

// ---------- skies ----------
const wide = (y, h, fill) => `<rect x="-2000" y="${n(y)}" width="5080" height="${n(h)}" fill="${fill}"/>`;
export const ground = (fill, y = FLOOR) => wide(y, 3000, fill);
// sunset: flat bands, the lowest one touches the horizon; a pale sun half set behind the ground
export const sunSky = ({ sun = true } = {}) => {
  const ys = [-2000, 470, 720, 900, 1040];
  return SUN.bands.map((c, i) => wide(ys[i], (ys[i + 1] ?? FLOOR) - ys[i] + 2, c)).join('')
    + (sun ? `<circle cx="790" cy="1110" r="160" fill="${SUN.sun}"/>` : '');
};
export const daySky = () => wide(-2000, 2000 + FLOOR, DAY.sky) + `<circle cx="210" cy="300" r="70" fill="${DAY.far}"/>`;
export const nightSky = ({ moon = true } = {}) => wide(-2000, 2000 + FLOOR, NIGHT.sky) + (moon ? `<circle cx="860" cy="250" r="52" fill="${NIGHT.moon}"/>` : '');
export const dawnSky = () => {
  const ys = [-2000, 560, 820, 1010];
  return DAWN.bands.map((c, i) => wide(ys[i], (ys[i + 1] ?? FLOOR) - ys[i] + 2, c)).join('');
};

// ---------- the wheel ----------
// 24 cabins. Cabin 0 is the heroes'. s = how many steps (one cabin each) the wheel has turned since the heroes were at
// the very top: s = 0 three nights ago, s = 3 now; fractions are the wheel in motion. It turns clockwise on the screen,
// so the heroes go down the right side: from the top to the bottom is 12 steps, at s = 3 nine are left.
export const SLOTS = 24, STEP = 15, NOW = 3;
// the cabins with people (11 of 24). At s = 3: two above the heroes (at the top and one step down from it), the heroes,
// four lower on the right side, four on the upper left. Cabin 1, right under the heroes, is empty: the twelfth light.
export const OCC = [0, 2, 4, 6, 8, 14, 16, 18, 20, 21, 22];
export const angleOf = (i, s = NOW) => -90 + STEP * (i + s);
export const WHEEL = { cx: 540, cy: 656, R: 420 }; // the general shot: the bottom cabin stands on the platform at y 1160
export const spot = (i, s = NOW, { cx, cy, R } = WHEEL) => { const a = angleOf(i, s) * RAD; return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }; };

// One cabin hanging from the rim at (x, y): a short hanger, a rounded body, a window band.
// k = size (1: 60 x 84). lit 0..1 = amber window; hero = Varya's jacket in the window; inside = SVG drawn in the window
// (people for close shots) in cabin units, origin at the hanging point.
export const cabin = ({ x, y, k = 1, pal, lit = 0, hero = false, inside = '' }) => {
  const L = clamp(lit);
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${n(k)})">
  <rect x="-3" y="-2" width="6" height="18" fill="${pal.wheel}"/><rect x="-31" y="14" width="62" height="70" rx="13" fill="${pal.cabin}"/>
  <rect x="-23" y="24" width="46" height="30" rx="6" fill="${pal.win}"/>${L > 0.004 ? `<rect x="-23" y="24" width="46" height="30" rx="6" fill="${AMBER}" opacity="${n(L)}"/>` : ''}
  ${inside}${hero && !inside ? `<rect x="-12" y="38" width="16" height="16" rx="4" fill="${K.varya}"/>` : ''}
  <rect x="-31" y="54" width="62" height="30" rx="10" fill="${pal.cabin}"/></g>`;
};

// The whole wheel. lit = { cabin: 0..1 } amber windows; legs = the A-frame down to the ground; k = cabin size.
// Spokes and rim are shapes (a ring is a circle with a wide stroke and no fill), never outlines of something.
export const wheel = ({ cx = WHEEL.cx, cy = WHEEL.cy, R = WHEEL.R, s = NOW, pal, lit = {}, k = 1, legs = true, groundY = FLOOR, hero = true, inside = {} }) => {
  const rot = s * STEP;
  const spokes = Array.from({ length: SLOTS }, (_, i) => {
    const a = (angleOf(i, s)) * RAD;
    return `<path d="M${cx} ${cy} L${n(cx + R * Math.cos(a))} ${n(cy + R * Math.sin(a))}" stroke="${pal.wheel}" stroke-width="${n(5 * k)}"/>`;
  }).join('');
  const lg = legs ? [-1, 1].map((d) => `<path d="M${cx - 16 * k} ${cy} L${cx + 16 * k} ${cy} L${n(cx + d * R * 0.62 + 26 * k)} ${groundY + 40} L${n(cx + d * R * 0.62 - 26 * k)} ${groundY + 40} Z" fill="${pal.wheel}"/>`).join('') : '';
  const cabs = Array.from({ length: SLOTS }, (_, i) => {
    const p = spot(i, s, { cx, cy, R });
    return cabin({ x: p.x, y: p.y, k, pal, lit: lit[i] || 0, hero: hero && i === 0, inside: inside[i] || '' });
  }).join('');
  return `${lg}<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${pal.wheel}" stroke-width="${n(15 * k)}"/>
  <circle cx="${cx}" cy="${cy}" r="${n(R - 46 * k)}" fill="none" stroke="${pal.wheel}" stroke-width="${n(6 * k)}"/>${spokes}
  <circle cx="${cx}" cy="${cy}" r="${n(34 * k)}" fill="${pal.wheel}"/><g data-rot="${n(rot)}">${cabs}</g>`;
};
// all cabins with people lit (a = 0..1), or only some of them
export const lights = (a = 1, which = OCC) => Object.fromEntries(which.map((i) => [i, a]));

// The boarding platform under the wheel and the operator's booth to the right of it (its window is dark: no power).
export const platform = ({ cx = 540, y = 1160, pal, booth = true } = {}) =>
  `<rect x="${cx - 250}" y="${y}" width="500" height="80" fill="${pal.deck}"/>
  ${booth ? `<rect x="${cx + 290}" y="${y - 150}" width="150" height="230" fill="${pal.deck}"/><rect x="${cx + 270}" y="${y - 176}" width="190" height="34" rx="8" fill="${pal.deck}"/>
  <rect x="${cx + 318}" y="${y - 118}" width="94" height="66" rx="6" fill="${pal.win}"/>` : ''}`;

// ---------- people ----------
// a person drawn at size s with everything scaled (the outline too): small figures stay light, not blobs
export const tiny = ({ x, y, s = 0.3, ...o }) => `<g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})">${person({ x: 0, y: 0, ...o })}</g>`;
// the dead: grey-green, leaning, swaying slowly
export const dead = ({ x, y, s = 0.3, t = 0, seed = 0, lean = 1, look = 0, lookY = -0.4 }) => {
  const tl = lean * (5 + 4 * rnd(seed + 11)) * (rnd(seed + 3) < 0.5 ? -1 : 1) + 1.6 * Math.sin(t * 0.9 + seed);
  return tiny({ x, y, s, col: K.dead, t, seed, tilt: tl, look, lookY });
};
// a crowd of the dead between x0 and x1, standing on y (deeper ones a little higher and smaller)
export const deadCrowd = ({ x0, x1, y, count = 20, s = 0.3, t = 0, seed = 1, depth = 26, look = 0, lookY = -0.6 }) => {
  const list = Array.from({ length: count }, (_, i) => ({ i, x: lerp(x0, x1, (i + 0.5 * rnd(seed + i * 7)) / count), d: rnd(seed + i * 13) }));
  return list.sort((a, b) => a.d - b.d).map((m) => dead({ x: m.x, y: y - depth * (1 - m.d), s: s * (0.9 + 0.12 * m.d), t, seed: seed + m.i, look, lookY })).join('');
};

// ---------- a cabin from inside ----------
// The cutaway: back wall, two big windows (the sky behind the glass), the roof and the hanger, the bench.
// People sit by being drawn between bench() and benchFront(): their legs go behind the front of the bench.
export const ROOM = { seat: 1030, front: 1062 };
export const cabinRoom = ({ pal, sky, view = '' }) =>
  `${wide(-2000, 2000 + FLOOR, sky)}<rect x="470" y="-600" width="140" height="900" fill="${pal.frame}"/>
  <rect x="40" y="250" width="1000" height="1000" rx="46" fill="${pal.frame}"/><rect x="70" y="300" width="940" height="950" rx="30" fill="${pal.wall}"/>
  <rect x="112" y="370" width="410" height="440" rx="22" fill="${pal.glass}"/><rect x="558" y="370" width="410" height="440" rx="22" fill="${pal.glass}"/>${view}
  <rect x="140" y="${ROOM.seat}" width="800" height="${ROOM.front - ROOM.seat}" rx="8" fill="${pal.bench}"/>`;
export const benchFront = ({ pal }) => `<rect x="150" y="${ROOM.front}" width="780" height="${FLOOR - ROOM.front + 10}" fill="${pal.front}"/>${ground(pal === DAY ? DAY.ground : NIGHT.ground)}`;

// props: popcorn box (stripes, puffs on top), a bottle of water, a flashlight. (x, y) = middle of the bottom edge
export const popcorn = ({ x, y, s = 1 }) => {
  const st = [-1, 0, 1].map((i) => `<path d="M${n(i * 30 - 9)} -150 L${n(i * 30 + 9)} -150 L${n(i * 24 + 7)} 0 L${n(i * 24 - 7)} 0 Z" fill="#F4EBDD"/>`).join('');
  const puffs = [[-40, -160, 26], [-8, -176, 30], [28, -164, 27], [52, -150, 20], [-58, -146, 18]].map(([px, py, r]) => `<circle cx="${px}" cy="${py}" r="${r}" fill="#F6E7B8"/>`).join('');
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})">${puffs}<path d="M-62 -150 L62 -150 L48 0 L-48 0 Z" fill="#D8473A"/>${st}</g>`;
};
export const bottle = ({ x, y, s = 1, level = 0.55 }) =>
  `<g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})"><rect x="-30" y="-150" width="60" height="150" rx="18" fill="#BFE3EF"/>
  <rect x="-30" y="${n(-150 * level)}" width="60" height="${n(150 * level)}" rx="18" fill="#7FB8D0"/><rect x="-16" y="-186" width="32" height="44" rx="8" fill="#BFE3EF"/><rect x="-18" y="-204" width="36" height="22" rx="6" fill="#2C5D73"/></g>`;
export const flashlight = ({ x, y, s = 1, on = 0 }) =>
  `<g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})"><rect x="-90" y="-40" width="120" height="40" rx="16" fill="#3B4D6E"/><path d="M28 -50 L70 -62 L70 22 L28 10 Z" fill="#3B4D6E"/>
  <rect x="64" y="-60" width="16" height="80" rx="6" fill="#5A6C8C"/>${on > 0.004 ? `<rect x="64" y="-60" width="16" height="80" rx="6" fill="${AMBER}" opacity="${n(clamp(on))}"/>` : ''}</g>`;

// two tickets for the wheel (a big object for the close shot): cream with a coral band and a torn edge
export const ticket = ({ x, y, rot = 0, s = 1, notch = DAY.sky }) =>
  `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)}) scale(${n(s)})"><rect x="-300" y="-140" width="600" height="280" rx="22" fill="#F6EEDC"/>
  <rect x="-300" y="-140" width="120" height="280" rx="22" fill="${K.varya}"/><rect x="-200" y="-140" width="20" height="280" fill="${K.varya}"/>
  <circle cx="-180" cy="-140" r="22" fill="${notch}"/><circle cx="-180" cy="140" r="22" fill="${notch}"/>
  ${label(70, -10, 'КОЛЕСО', { size: 74, fill: K.ink, ls: 3 })}${label(70, 70, 'ОБОЗРЕНИЯ', { size: 44, fill: K.ink, ls: 3, weight: 700 })}</g>`;

// the rule card: a cream card on the night sky, the word «ПРАВИЛО» on an amber plate
export const ruleCard = ({ a = 1, lines = [] }) => {
  const e = ease(a), h = 210 + lines.length * 96, y0 = 960 - h / 2 - 140, fs = Math.min(78, ...lines.map((ln) => (800 / textW(ln, 78, 1)) * 78));
  return `<g opacity="${n(e)}" transform="translate(0 ${n((1 - e) * 30)})"><rect x="90" y="${n(y0)}" width="900" height="${n(h)}" rx="34" fill="#F3ECDD"/>
  <rect x="${540 - 170}" y="${n(y0 + 48)}" width="340" height="84" rx="20" fill="${AMBER}"/>${label(540, y0 + 106, 'ПРАВИЛО', { size: 52, fill: K.ink, ls: 4 })}
  ${lines.map((ln, i) => label(540, y0 + 230 + i * 96, ln, { size: fs, fill: K.ink })).join('')}</g>`;
};

// ---------- the scheme ----------
// The wheel as a diagram on a cream sheet: rim and spokes thin, the cabins as rings (empty) and dots (people), the
// heroes' cabin in Varya's colour with «ВЫ» beside it. fill = { cabin: 0..1 } how much of a dot is filled (for counting);
// path = 0..9 how many of the cabins on the way down are marked amber; above = 0..1 numbers the three cabins over the
// heroes; s = the turn of the wheel, like wheel().
export const SCH = { cx: 540, cy: 760, R: 300 };
export const scheme = ({ s = NOW, fill = null, path = 0, above = 0, you = 1 } = {}) => {
  const { cx, cy, R } = SCH, P = PAPER, at = (i) => spot(i, s, SCH);
  let out = `${wide(-2000, 6000, P.back)}<rect x="60" y="200" width="960" height="980" rx="30" fill="${P.sheet}"/>
  <path d="M${cx} ${cy} L${cx - 210} ${cy + R + 70} M${cx} ${cy} L${cx + 210} ${cy + R + 70}" stroke="${P.soft}" stroke-width="10" stroke-linecap="round"/>
  <rect x="${cx - 330}" y="${cy + R + 64}" width="660" height="12" rx="6" fill="${P.ink}"/>
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${P.soft}" stroke-width="8"/>`;
  for (let i = 0; i < SLOTS; i++) { const p = at(i); out += `<path d="M${cx} ${cy} L${n(p.x)} ${n(p.y)}" stroke="${P.soft}" stroke-width="3"/>`; }
  out += `<circle cx="${cx}" cy="${cy}" r="20" fill="${P.soft}"/>`;
  // the way down: the nine cabins after the heroes', amber rings, one by one
  for (let j = 1; j <= 9; j++) {
    const u = clamp(path - (j - 1)); if (u <= 0.004) continue;
    const p = at(j); out += `<circle cx="${n(p.x)}" cy="${n(p.y)}" r="${n(36 * ease(u))}" fill="${AMBER}"/>`;
  }
  for (let i = 0; i < SLOTS; i++) {
    const p = at(i), full = fill ? clamp(fill[i] || 0) : OCC.includes(i) ? 1 : 0;
    out += `<circle cx="${n(p.x)}" cy="${n(p.y)}" r="22" fill="${P.sheet}" stroke="${P.ink}" stroke-width="6"/>`;
    if (i === 0) out += `<circle cx="${n(p.x)}" cy="${n(p.y)}" r="25" fill="${K.varya}"/>`;
    else if (full > 0.004) out += `<circle cx="${n(p.x)}" cy="${n(p.y)}" r="${n(22 * ease(full))}" fill="${P.ink}"/>`;
  }
  if (above > 0.004) [21, 22, 23].forEach((i, j) => {
    const p = at(i), a = angleOf(i, s) * RAD, e = ease(above * 3 - j);
    if (e > 0) out += label(p.x + 74 * Math.cos(a), p.y + 74 * Math.sin(a) + 18, String(3 - j), { size: 54, fill: P.ink, opacity: e });
  });
  if (you > 0.004) { const p = at(0), a = angleOf(0, s) * RAD; out += label(p.x + 86 * Math.cos(a) + 10, p.y + 86 * Math.sin(a) + 18, 'ВЫ', { size: 50, fill: K.varya, opacity: ease(you) }); }
  return out;
};

// ---------- the glass roof ----------
// The last picture: from inside the cabin, looking up at the glass roof at dawn. Beams of the roof are dark, the glass
// shows the pale-dark sky and the hanger bar; on the glass the prints of small shoes, the one lit thing in the frame.
// prints 0..1 = how much of them is there; (cx, cy) = middle of the glass.
export const glassRoof = ({ prints = 1 } = {}) => {
  const P = DAWN, steps = [[300, 980, 18], [420, 860, 22], [430, 700, 16], [560, 590, 24], [570, 430, 18], [700, 330, 26]];
  const shoe = ([x, y, r], j) => {
    const side = j % 2 ? 1 : -1;
    return `<g transform="translate(${x + side * 26} ${y}) rotate(${r})"><ellipse cx="0" cy="-26" rx="27" ry="44" fill="${AMBER}"/><ellipse cx="0" cy="46" rx="21" ry="24" fill="${AMBER}"/></g>`;
  };
  const e = ease(prints);
  return `${wide(-2000, 6000, P.roof)}<rect x="110" y="180" width="860" height="900" rx="30" fill="${P.glass}"/>
  <rect x="470" y="180" width="140" height="900" fill="${P.bar}"/><rect x="110" y="610" width="860" height="26" fill="${P.roof}"/>
  ${e > 0.004 ? `<g opacity="${n(e)}">${steps.map(shoe).join('')}</g>` : ''}`;
};

// ---------- tags ----------
// a tag set in the middle of the frame (the big counters of this series)
export const midTag = ({ text, y = 330, size = 84, a = 1, pad = 0.55 }) => tag({ x: 540 - (textW(text, size, 1) + 2 * pad * size) / 2, y, text, size, a, pad });
export const midRoll = ({ values, pos, y = 330, size = 84, a = 1, pad = 0.55 }) => {
  const i = Math.min(values.length - 1, Math.max(0, Math.round(pos))), w = textW(String(values[i]), size, 1) + 2 * pad * size;
  return rollTag({ x: 540 - w / 2, y, values, pos, size, a, pad });
};
// a big bare number that rolls up to the next one: white, the values from hiFrom on in amber (Varya's count)
export const bigCount = ({ values, pos, y = 560, size = 260, hiFrom = 99, a = 1 }) => {
  if (a <= 0.004) return '';
  const last = values.length - 1, i = Math.min(last, Math.max(0, Math.floor(pos))), f = i >= last ? 0 : ease(pos - i);
  const one = (k, dy, op) => {
    if (op <= 0.004) return '';
    const fill = k >= hiFrom ? AMBER : V.white;
    return `<g opacity="${n(op * ease(a))}">${label(540, y + dy + 8, String(values[k]), { size, fill: V.line, opacity: 0.45 })}${label(540, y + dy, String(values[k]), { size, fill })}</g>`;
  };
  return one(i, -f * 120, 1 - f) + (f > 0 ? one(i + 1, (1 - f) * 120, f) : '');
};
