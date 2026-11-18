// Details of the series «Орбита» on top of kit/v2.js and the people of kit/people.js (style 3).
// Same contract: pure JS, every function returns an SVG string for the 1080x1920 stage.
// Scenes and their colours:
//   outside    black space with a few flat stars, the Earth as a huge arc at the bottom (day: blue and green; night:
//              dark navy with amber cities that can go out), the station white with blue panels;
//   inside     a pale grey-blue module, one round window, one round hatch; under FLOOR a dark band for the captions;
//   porthole   the frame is a dark wall with one big round window: the Earth at night, later the man outside.
// Amber is kept for the lights of the cities, the counters and the one clue: the name patch.
import { clamp, lerp, rnd } from './index.js';
import { V, FLOOR, ease, label, tag, textW } from './v2.js';
import { human, P, bean, limbPath, limb } from './people.js';

const n = (x) => Math.round(x * 100) / 100;
const RAD = Math.PI / 180;
let uid = 0; // ids of clip paths

export const AMBER = V.amber;
export const O = {
  space: '#060A16', star: '#C9D4E6',
  sea: '#1E5490', land: '#3F8F6C', cloud: '#DCE9F1', rim: '#6FA8DC',
  nSea: '#0A1730', nLand: '#14294B', nRim: '#1F4072',
  hull: '#EAEFF3', hull2: '#C2CCD7', panel: '#27508F', panel2: '#1C3B6E', dark: '#0F1A2C',
  wall: '#DCE4EB', rib: '#C6D0DA', band: '#0E182A', ring: '#6C8A9F', door: '#AFC0CC', wheel: '#2B3D54', glass: '#0B1322',
  dusk: '#182640', duskRing: '#3B4D69',
  suit: '#F2F4F6', suit2: '#CBD4DD', visor: '#131F36', glint: '#5C7EA6', stripe: '#E8604C',
  jump: '#3D6FB5', jump2: '#335C98', girl: '#2F8F95', paper: '#F3ECDD', ink: '#21364F',
};
export const NAME = 'ВЕТРОВ'; // the hero's surname: on his flight suit, on his own suit in the airlock and on the suit outside

// ---------- space and the Earth ----------
export const space = ({ stars = true, seed = 4 } = {}) => {
  let s = `<rect x="-2000" y="-2000" width="5080" height="6000" fill="${O.space}"/>`;
  if (stars) for (let i = 0; i < 30; i++) s += `<circle cx="${n(-100 + 1280 * rnd(seed + i * 3.1))}" cy="${n(-80 + 1300 * rnd(seed + i * 7.7))}" r="${n(2 + 2.6 * rnd(seed + i))}" fill="${O.star}" opacity="${n(0.45 + 0.5 * rnd(seed + i * 1.9))}"/>`;
  return s;
};
// The Earth: a circle of radius r whose top is at y = top. night = dark side; lit 0..1 = how many of the cities are on
// (they go out in a fixed order, the last one is the big one near the middle: «наш»).
const LAND = [[-520, 230, 330, 120, -12], [-80, 150, 260, 150, 8], [330, 260, 300, 110, 18], [640, 420, 240, 130, -6], [-760, 520, 260, 150, 10], [80, 560, 420, 170, -4]];
const CITY = [[-560, 250], [-470, 215], [-420, 290], [-610, 300], [-150, 130], [-60, 190], [-10, 120], [60, 210], [270, 250], [340, 300], [420, 240], [470, 310],
  [610, 430], [690, 400], [-800, 520], [-720, 560], [-650, 500], [-40, 520], [60, 600], [170, 540], [260, 610], [-120, 610], [120, 470], [330, 520], [-330, 330], [550, 300]];
export const HOME = [20, 330]; // «наш город»: the last light, a little bigger than the rest
export const earth = ({ top = 1040, r = 1500, cx = 540, night = false, lit = 1, clouds = true, home = 1 } = {}) => {
  const cy = top + r, id = `ec${uid++}`, sea = night ? O.nSea : O.sea, land = night ? O.nLand : O.land;
  const blobs = LAND.map(([x, y, rx, ry, rot]) => `<ellipse cx="${cx + x}" cy="${top + y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx + x} ${top + y})" fill="${land}"/>`).join('');
  const cl = !night && clouds ? [[-380, 120, 190, 34], [150, 90, 240, 30], [520, 200, 170, 28], [-140, 360, 260, 34], [420, 470, 220, 30]].map(([x, y, w, h]) => `<rect x="${cx + x - w / 2}" y="${top + y}" width="${w}" height="${h}" rx="${h / 2}" fill="${O.cloud}"/>`).join('') : '';
  let cities = '';
  if (night) {
    const on = clamp(lit) * CITY.length;
    cities = CITY.map(([x, y], i) => { const a = clamp(on - i); return a <= 0.004 ? '' : `<circle cx="${cx + x}" cy="${top + y}" r="${n(7 + 5 * rnd(i + 2))}" fill="${AMBER}" opacity="${n(ease(a))}"/>`; }).join('')
      + (home > 0.004 ? `<circle cx="${cx + HOME[0]}" cy="${top + HOME[1]}" r="17" fill="${AMBER}" opacity="${n(ease(clamp(home)))}"/>` : '');
  }
  return `<clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath><circle cx="${cx}" cy="${cy}" r="${r + 12}" fill="${night ? O.nRim : O.rim}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${sea}"/><g clip-path="url(#${id})">${blobs}${cl}${cities}</g>`;
};

// ---------- the station from outside ----------
// (x, y) = the middle of the central module; s = size. lit = amber windows; ship = the hero's own small ship at the
// left end; hatch = the round door on the node at the right end (the man knocks there).
export const HATCH = { x: 330, y: 0 }; // where the hatch is, in station units
export const station = ({ x = 540, y = 620, s = 1, rot = -8, lit = 1, ship = true, dark = false } = {}) => {
  const hull = dark ? '#8793A3' : O.hull, hull2 = dark ? '#5E6B7D' : O.hull2, panel = dark ? '#16294C' : O.panel, panel2 = dark ? '#0F1E3A' : O.panel2;
  const wing = (wx) => [-1, 1].map((d) => `<rect x="${wx - 62}" y="${d > 0 ? 70 : -330}" width="124" height="260" rx="10" fill="${panel}"/>${[0, 1, 2].map((i) => `<rect x="${wx - 62}" y="${(d > 0 ? 70 : -330) + 60 + i * 66}" width="124" height="7" fill="${panel2}"/>`).join('')}<rect x="${wx - 7}" y="${d > 0 ? 40 : -80}" width="14" height="40" fill="${hull2}"/>`).join('');
  const win = (wx) => `<rect x="${wx - 17}" y="-14" width="34" height="28" rx="9" fill="${lit > 0.5 ? AMBER : O.dark}"/>`;
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)}) scale(${n(s)})">${wing(-170)}${wing(120)}
  <rect x="-300" y="-46" width="540" height="92" rx="44" fill="${hull}"/><rect x="-60" y="-46" width="16" height="92" fill="${hull2}"/><rect x="90" y="-46" width="16" height="92" fill="${hull2}"/>
  ${win(-210)}${win(-130)}${win(20)}${win(170)}
  <circle cx="${HATCH.x}" cy="0" r="92" fill="${hull}"/><circle cx="${HATCH.x}" cy="0" r="50" fill="${hull2}"/><circle cx="${HATCH.x}" cy="0" r="30" fill="${O.dark}"/>
  ${ship ? `<path d="M-300 -34 L-388 -22 Q-430 0 -388 22 L-300 34 Z" fill="${hull2}"/><rect x="-316" y="-40" width="18" height="80" rx="6" fill="${hull}"/>` : ''}
  <rect x="-24" y="-120" width="10" height="80" fill="${hull2}"/><circle cx="-19" cy="-128" r="22" fill="${hull}"/></g>`;
};
// the point of the hatch on the stage for the same station parameters
export const hatchAt = ({ x = 540, y = 620, s = 1, rot = -8 } = {}) => { const a = rot * RAD; return { x: x + s * HATCH.x * Math.cos(a), y: y + s * HATCH.x * Math.sin(a) }; };

// ---------- a man in a space suit ----------
// (x, y) = the point between the boots, k = size, tilt in degrees. name = the patch on the chest ('' = none): amber,
// it is the clue. armL / armR in degrees from «hanging down», as in human(). The visor is dark: no face.
export const suit = ({ x, y, k = 1, tilt = 0, armL = 16, armR = 16, name = NAME, t = 0, seed = 2, alpha = 1, patch = 1 }) => {
  if (alpha <= 0.004) return '';
  const ow = 6.5, line = P.line, INK = `stroke="${line}" stroke-width="${ow}" stroke-linejoin="round" stroke-linecap="round"`;
  const r = 76 * k, tw = 176 * k, th = 196 * k, ll = 150 * k, lw = 58 * k, al = 150 * k, aw = 50 * k;
  const yh = -ll + 12 * k, yb = yh + 18 * k, yt = yh - th, hy = yt - r + 40 * k, shX = tw / 2 - 18 * k, shY = yt + 40 * k, hipX = lw * 0.58;
  const bob = 6 * k * Math.sin(t * 0.8 + seed);
  const legOne = (d) => `${limb(limbPath(d * hipX, yh, d * hipX * 1.08, -26 * k, 0), lw, O.suit, ow, line)}<rect x="${n(d * hipX * 1.08 - lw * 0.62)}" y="${n(-36 * k)}" width="${n(lw * 1.24)}" height="${n(38 * k)}" rx="${n(13 * k)}" fill="${O.suit2}" ${INK}/>`;
  const armOne = (d, deg) => {
    const a = deg * RAD, hx = d * shX + d * al * Math.sin(a), hyy = shY + al * Math.cos(a), mx = d * shX + d * al * 0.55 * Math.sin(a), my = shY + al * 0.55 * Math.cos(a);
    return `${limb(limbPath(d * shX, shY, hx, hyy, d * 8 * k), aw, O.suit, ow, line)}<circle cx="${n(mx)}" cy="${n(my)}" r="${n(aw * 0.2)}" fill="${O.stripe}"/><circle cx="${n(hx)}" cy="${n(hyy)}" r="${n(aw * 0.6)}" fill="${O.suit2}" ${INK}/>`;
  };
  const pw = Math.max(textW(name, 24 * k, 1) + 26 * k, 96 * k), ph = 40 * k;
  const nameTag = name && patch > 0.004 ? `<g opacity="${n(clamp(patch))}"><rect x="${n(-pw / 2)}" y="${n(yt + 44 * k)}" width="${n(pw)}" height="${n(ph)}" rx="${n(8 * k)}" fill="${AMBER}" ${INK}/>${label(0, yt + 44 * k + ph / 2 + 24 * k * 0.355, name, { size: n(24 * k), fill: O.ink, ls: 1 })}</g>` : '';
  return `<g transform="translate(${n(x)} ${n(y + bob)}) rotate(${n(tilt)})" filter="url(#sf${seed % 4})"${alpha < 1 ? ` opacity="${n(alpha)}"` : ''}>
  <rect x="${n(-tw * 0.58)}" y="${n(yt - 6 * k)}" width="${n(tw * 1.16)}" height="${n(th * 0.82)}" rx="${n(26 * k)}" fill="${O.suit2}" ${INK}/>
  ${armOne(-1, armL)}${armOne(1, armR)}${legOne(-1)}${legOne(1)}
  <path d="${bean(tw, tw * 0.94, yt, yb, 0.3 * tw, 0.2 * tw)}" fill="${O.suit}" ${INK}/>
  <rect x="${n(-38 * k)}" y="${n(yt + 100 * k)}" width="${n(76 * k)}" height="${n(52 * k)}" rx="${n(9 * k)}" fill="${O.suit2}" ${INK}/><rect x="${n(-22 * k)}" y="${n(yt + 116 * k)}" width="${n(16 * k)}" height="${n(16 * k)}" rx="3" fill="${O.stripe}"/><rect x="${n(6 * k)}" y="${n(yt + 116 * k)}" width="${n(16 * k)}" height="${n(16 * k)}" rx="3" fill="${O.panel}"/>
  ${nameTag}
  <rect x="${n(-r * 0.72)}" y="${n(hy + r * 0.74)}" width="${n(r * 1.44)}" height="${n(26 * k)}" rx="${n(12 * k)}" fill="${O.suit2}" ${INK}/>
  <circle cx="0" cy="${n(hy)}" r="${n(r)}" fill="${O.suit}" ${INK}/><ellipse cx="0" cy="${n(hy + 4 * k)}" rx="${n(r * 0.72)}" ry="${n(r * 0.6)}" fill="${O.visor}" ${INK}/>
  <path d="M${n(-r * 0.42)} ${n(hy - r * 0.2)} Q${n(-r * 0.3)} ${n(hy - r * 0.42)} ${n(-r * 0.04)} ${n(hy - r * 0.44)}" stroke="${O.glint}" stroke-width="${n(9 * k)}" stroke-linecap="round" fill="none"/></g>`;
};

// ---------- the hero ----------
// the hero in his blue flight suit, floating: no shadow, a slow drift; the amber name patch on the chest
export const hero = ({ x, y, k = 1, t = 0, tilt = -5, float = 1, patch = true, ...o }) => {
  const dy = float * 9 * Math.sin(t * 0.7), yt = -(138 + 166) * k;
  const tagW = 82 * k, tagH = 28 * k;
  const nameTag = patch && !o.back ? `<g transform="translate(${n(x)} ${n(y + dy)}) rotate(${n(tilt)})"><rect x="${n(8 * k)}" y="${n(yt + 46 * k)}" width="${n(tagW)}" height="${n(tagH)}" rx="${n(6 * k)}" fill="${AMBER}"/>${label(8 * k + tagW / 2, yt + 46 * k + tagH / 2 + 17 * k * 0.355, NAME, { size: n(17 * k), fill: O.ink })}</g>` : '';
  return human({ x, y: y + dy, k, col: O.jump, legs: O.jump2, hair: { style: 'short', col: P.hair.dark }, wear: 'jacket', seed: 0, t, tilt, shadow: false, armL: 24, armR: 20, ...o }) + nameTag;
};

// ---------- inside ----------
// the module: a pale wall with ribs; under FLOOR a dark band (the captions stand on it)
export const moduleRoom = ({ wall = O.wall, rib = O.rib } = {}) =>
  `<rect x="-2000" y="-2000" width="5080" height="${2000 + FLOOR}" fill="${wall}"/>${[-140, 200, 540, 880, 1220].map((x) => `<rect x="${x - 17}" y="-2000" width="34" height="${2000 + FLOOR}" fill="${rib}"/>`).join('')}
  <rect x="-2000" y="150" width="5080" height="40" fill="${rib}"/><rect x="-2000" y="${FLOOR}" width="5080" height="3000" fill="${O.band}"/>`;
// a round window; view = SVG seen through it (drawn in stage coordinates, clipped to the glass)
export const porthole = ({ x, y, r = 150, view = '', ring = O.ring }) => {
  const id = `pc${uid++}`;
  return `<clipPath id="${id}"><circle cx="${x}" cy="${y}" r="${r}"/></clipPath><circle cx="${x}" cy="${y}" r="${n(r * 1.2)}" fill="${ring}"/><circle cx="${x}" cy="${y}" r="${r}" fill="${O.space}"/><g clip-path="url(#${id})">${view}</g>`;
};
// the hatch: a round door with a wheel and a small dark window. dx, dy = how far a knock has pushed it; sticker = the
// small sheet of rules beside it
export const hatch = ({ x = 540, y = 700, r = 290, dx = 0, dy = 0, turn = 0, sticker = true } = {}) => {
  const spokes = [0, 60, 120].map((a) => `<path d="M${n(-r * 0.5)} 0 L${n(r * 0.5)} 0" transform="rotate(${a + turn})" stroke="${O.wheel}" stroke-width="${n(r * 0.07)}" stroke-linecap="round"/>`).join('');
  const st = sticker ? `<g transform="translate(${n(x + r * 1.02)} ${n(y - r * 0.9)}) rotate(4)"><rect width="${n(r * 0.62)}" height="${n(r * 0.74)}" rx="10" fill="${O.paper}"/>${[0, 1].map((i) => `<rect x="${n(r * 0.08)}" y="${n(r * (0.2 + i * 0.17))}" width="${n(r * 0.46)}" height="${n(r * 0.05)}" rx="4" fill="${O.ink}"/>`).join('')}<rect x="${n(r * 0.08)}" y="${n(r * 0.54)}" width="${n(r * 0.4)}" height="${n(r * 0.09)}" rx="8" fill="#A9AFB6"/><rect x="${n(r * 0.08)}" y="${n(r * 0.07)}" width="${n(r * 0.3)}" height="${n(r * 0.06)}" rx="4" fill="${AMBER}"/></g>` : '';
  return `<circle cx="${x}" cy="${y}" r="${n(r * 1.16)}" fill="${O.ring}"/>${st}<g transform="translate(${n(x + dx)} ${n(y + dy)})"><circle r="${r}" fill="${O.door}"/>
  <circle r="${n(r * 0.6)}" fill="none" stroke="${O.wheel}" stroke-width="${n(r * 0.07)}"/>${spokes}<circle r="${n(r * 0.3)}" fill="${O.wheel}"/><circle r="${n(r * 0.22)}" fill="${O.glass}"/></g>`;
};
// the push of the hatch by three knocks that start at the given moments (seconds since each): a short dying shake
export const shake = (sinces, amp = 9) => sinces.reduce((s, u) => s + (u > 0 && u < 0.34 ? amp * Math.sin(u * 60) * (1 - u / 0.34) : 0), 0);

// the sheet of rules, big: three lines, the third rubbed out. a = 0..1 lets it rise in; rub = 0..1 shows the smear
export const rulesCard = ({ a = 1, rub = 1 }) => {
  const e = ease(a), y0 = 330, row = (i, str) => label(160, y0 + 330 + i * 150, str, { size: 43, fill: O.ink, anchor: 'start' });
  const k = ease(rub);
  return `<g opacity="${n(e)}" transform="translate(0 ${n((1 - e) * 30)})"><rect x="90" y="${y0}" width="900" height="720" rx="34" fill="${O.paper}"/>
  <rect x="150" y="${y0 + 60}" width="430" height="92" rx="20" fill="${AMBER}"/>${label(365, y0 + 124, 'ПРАВИЛА ЛЮКА', { size: 46, fill: O.ink, ls: 2 })}
  ${row(0, '1. ЖДИ КОМАНДЫ С ЗЕМЛИ')}${row(1, '2. СНАЧАЛА СМОТРИ В ОКНО')}${label(160, y0 + 630, '3.', { size: 43, fill: O.ink, anchor: 'start' })}
  <path d="M250 ${y0 + 612} Q420 ${y0 + 570} 560 ${y0 + 616} T880 ${y0 + 606}" stroke="#B4B9BF" stroke-width="${n(64 * k)}" stroke-linecap="round" fill="none" opacity="${n(k)}"/></g>`;
};

// a tablet floating in the module: the call from home. on 0..1 = the picture is there; face = SVG of who is on the
// screen (clipped); off 0..1 = the picture is gone, «НЕТ СВЯЗИ»
export const tablet = ({ x = 540, y = 700, w = 720, h = 880, face = '', off = 0, rot = -3, room = '#F1E3C8' }) => {
  const id = `tb${uid++}`, o = ease(off);
  return `<g transform="rotate(${rot} ${x} ${y})"><rect x="${x - w / 2 - 34}" y="${y - h / 2 - 34}" width="${w + 68}" height="${h + 68}" rx="56" fill="${O.wheel}"/>
  <clipPath id="${id}"><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="26"/></clipPath>
  <g clip-path="url(#${id})"><rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" fill="${room}"/>${face}
  ${o > 0.004 ? `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" fill="${O.glass}" opacity="${n(o)}"/><g opacity="${n(o)}">${label(x, y + 20, 'НЕТ СВЯЗИ', { size: 70, fill: AMBER, ls: 3 })}</g>` : ''}</g></g>`;
};

// the frame as a dark wall with one big round window (r) in the middle: what the hero sees outside
export const lookOut = ({ view = '', cx = 540, cy = 700, r = 470 }) => {
  const id = `lo${uid++}`;
  return `<rect x="-2000" y="-2000" width="5080" height="6000" fill="${O.dusk}"/><clipPath id="${id}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
  <circle cx="${cx}" cy="${cy}" r="${r + 46}" fill="${O.duskRing}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${O.space}"/><g clip-path="url(#${id})">${view}</g>
  <rect x="-2000" y="${FLOOR + 40}" width="5080" height="3000" fill="${O.band}"/>`;
};

// six dots for «три удара, пауза, ещё три»: on = how many are lit (fractions fade in)
export const knockDots = ({ on = 0, y = 300 }) => [0, 1, 2, 3, 4, 5].map((i) => {
  const x = 540 + (i - 2.5) * 96 + (i > 2 ? 60 : -60), a = clamp(on - i);
  return `<circle cx="${x}" cy="${y}" r="26" fill="${O.rib}"/>${a > 0.004 ? `<circle cx="${x}" cy="${y}" r="${n(26 * ease(a))}" fill="${AMBER}"/>` : ''}`;
}).join('');

// tags of this series, set in the middle
export const midTag = ({ text, y = 330, size = 84, a = 1, pad = 0.55 }) => tag({ x: 540 - (textW(text, size, 1) + 2 * pad * size) / 2, y, text, size, a, pad });
// the dark band under FLOOR, drawn over a camera move so the captions always stand on dark
export const band = (y = FLOOR) => `<rect x="-2000" y="${y}" width="5080" height="3000" fill="${O.band}"/>`;
