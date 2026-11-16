// Drawing parts for «Трасса. Минус 38» (account «Ты бы выжил?»).
// Same rules as kit/index.js: pure JS, every function returns an SVG string for the 1080x1920 stage.
// Shared helpers and the head construction come from kit/index.js so both series look like one studio.
import { W, H, C, clamp, lerp, seg, easeOut, easeInOut, rnd, blink, esc, txt } from './index.js';

const n = (x) => Math.round(x * 100) / 100;
const wrap = (x, m) => ((x % m) + m) % m;
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
export const mix = (a, b, p) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * clamp(p)).toString(16).padStart(2, '0')).join(''); };

export const T = {
  void: '#050C16', night: '#0E2238', dusk: '#1A3E66', far: '#0A1A2C', far2: '#102740',
  snow: '#EAF2F8', snowLit: '#C3D7E9', field: '#254467', field2: '#2E527B', bank: '#38608E', road: '#4A76A6', rim: '#A9C8E4', rut: '#213D62',
  orange: '#FF7A1A', orangeDark: '#D45A0C', orangeLight: '#FFA35E', yellow: '#FFD23F',
  red: '#E23B30', redDark: '#AB261D', ginger: '#E57A2E', gingerDark: '#BE5A1E',
  car: '#A3B9CF', carDark: '#6C87A6', carLight: '#C6D6E6', trim: '#15243A', tyre: '#0B131F', metal: '#A9B8C8', metalDark: '#73839A',
  glass: '#0A1728', glassLit: '#F7C56B',
  panel: '#081524', panelEdge: '#2F4E74', label: '#8FB0D0',
  grey: '#929EAE', greyDark: '#6B7789', sweater: '#3D4D68', sweaterLight: '#566A8C',
  skin: C.skin, skinShade: C.skinShade, ink: C.ink, hair: '#40291E',
  coat: '#F2EADB', coatShade: '#D3C7B0', seat: '#22395A', seatLight: '#31507A', cabin: '#132B47', cabinLight: '#1E3D61', cabinWarm: '#5A3420', torch: '#DCEBFA',
};

// ---------- landscape ----------
// night sky down to the horizon; stars twinkle slowly
export const sky = ({ t = 0, horizon = 900, stars = 1, seed = 0, moon = null } = {}) => {
  let s = `<defs><linearGradient id="tSky" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${n(horizon + 30)}"><stop offset="0" stop-color="#061322"/><stop offset="0.62" stop-color="${T.night}"/><stop offset="1" stop-color="${T.dusk}"/></linearGradient></defs>
  <rect x="-300" y="-600" width="${W + 600}" height="${n(horizon + 630)}" fill="url(#tSky)"/>`;
  for (let i = 0; i < 44; i++) {
    const x = rnd(seed + i * 3.1) * W, y = rnd(seed + i * 7.3 + 1) * (horizon - 150), r = 1.6 + rnd(i + 9) * 2.3;
    s += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${T.snow}" opacity="${n(stars * (0.3 + 0.5 * (0.5 + 0.5 * Math.sin((i % 3 ? 0 : t) * (0.6 + rnd(i) * 1.1) + i * 2.4))))}"/>`;
  }
  if (moon) { // frost halo around the moon: the colder the night, the clearer the ring
    const { x, y, r = 46 } = moon;
    s += `<circle cx="${x}" cy="${y}" r="${r * 3.2}" fill="none" stroke="${T.snow}" stroke-width="4" opacity="0.05"/><circle cx="${x}" cy="${y}" r="${r * 1.9}" fill="${T.snow}" opacity="0.05"/>
    <circle cx="${x}" cy="${y}" r="${r}" fill="${T.snow}" opacity="0.92"/>`;
  }
  return s;
};

const spruce = (x, y, h, fill) => {
  const w = h * 0.46;
  return `<path d="M${n(x)} ${n(y - h)} L${n(x + w * 0.26)} ${n(y - h * 0.63)} L${n(x + w * 0.15)} ${n(y - h * 0.63)} L${n(x + w * 0.39)} ${n(y - h * 0.31)} L${n(x + w * 0.24)} ${n(y - h * 0.31)} L${n(x + w * 0.5)} ${n(y + 2)} L${n(x - w * 0.5)} ${n(y + 2)} L${n(x - w * 0.24)} ${n(y - h * 0.31)} L${n(x - w * 0.39)} ${n(y - h * 0.31)} L${n(x - w * 0.15)} ${n(y - h * 0.63)} L${n(x - w * 0.26)} ${n(y - h * 0.63)} Z" fill="${fill}"/>`;
};
// taiga on the horizon; shift scrolls it (parallax)
export const forest = ({ y = 900, h = 120, gap = 58, seed = 1, fill = T.far, shift = 0 } = {}) => {
  let s = '';
  const i0 = Math.floor((shift - 120) / gap), i1 = Math.ceil((shift + W + 120) / gap);
  for (let i = i0; i <= i1; i++) {
    const x = i * gap + (rnd(seed + i * 1.37) - 0.5) * gap * 0.7 - shift, hh = h * (0.55 + 0.75 * rnd(seed + i * 2.91));
    s += spruce(x, y, hh, fill);
  }
  return s + `<rect x="0" y="${n(y - 2)}" width="${W}" height="${n(h * 0.16)}" fill="${fill}"/>`;
};

// snow surface from y down, with soft drifts; rim draws the light crest line
export const snow = ({ y = 900, fill = T.field, amp = 14, seed = 0, shift = 0, rim = 0.5, to = H + 600 } = {}) => {
  const f = (x) => y + amp * Math.sin((x + shift) * 0.0061 + seed * 1.7) + amp * 0.55 * Math.sin((x + shift) * 0.0137 + seed * 3.1);
  let d = `M-300 ${n(f(-300))}`;
  for (let x = -260; x <= W + 300; x += 40) d += ` L${x} ${n(f(x))}`;
  return `<path d="${d} L${W + 300} ${to} L-300 ${to} Z" fill="${fill}"/>${rim > 0 ? `<path d="${d}" fill="none" stroke="${T.rim}" stroke-width="5" stroke-linecap="round" opacity="${n(rim)}"/>` : ''}`;
};
export const snowY = ({ y = 900, amp = 14, seed = 0, shift = 0 } = {}, x) => y + amp * Math.sin((x + shift) * 0.0061 + seed * 1.7) + amp * 0.55 * Math.sin((x + shift) * 0.0137 + seed * 3.1);

// marker pole of a winter road (вешка): reflective orange band on top, snow at the foot
export const pole = ({ x, y, h = 150, s = 1, lean = 0, dim = 1 }) => `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(lean)}) scale(${n(s)})" opacity="${n(dim)}">
  <rect x="-5" y="${-h}" width="10" height="${h + 6}" rx="3" fill="${T.trim}"/>
  <rect x="-7" y="${-h}" width="14" height="30" rx="3" fill="${T.orange}"/><rect x="-7" y="${-h + 36}" width="14" height="10" rx="2" fill="${T.snow}"/>
  <ellipse cx="0" cy="4" rx="26" ry="9" fill="${T.rim}" opacity="0.55"/></g>`;

// snowflakes in the wind: short streaks, slower and smaller in the distance
export const snowfall = ({ t = 0, count = 46, wind = 230, fall = 120, seed = 0, y0 = 0, y1 = H, size = 1, opacity = 0.75 } = {}) => {
  let s = '';
  const span = W + 300, hgt = y1 - y0;
  for (let i = 0; i < count; i++) {
    const z = 0.35 + rnd(seed + i * 1.7) * 0.85;
    const x = wrap(rnd(seed + i * 5.3 + 2) * span - wind * z * t, span) - 150;
    const y = y0 + wrap(rnd(seed + i * 9.1 + 4) * hgt + fall * z * t + 14 * Math.sin(t * 1.4 + i), hgt);
    const r = size * (1.6 + 3 * z * z), len = 0.045 * z;
    s += `<line x1="${n(x)}" y1="${n(y)}" x2="${n(x + wind * len)}" y2="${n(y - fall * len)}" stroke="${T.snow}" stroke-width="${n(r * 2)}" stroke-linecap="round" opacity="${n(opacity * (0.22 + 0.5 * z))}"/>`;
  }
  return s;
};

// low drifting snow along the ground (позёмка)
export const drift = ({ t = 0, y = 1200, count = 5, wind = 260, seed = 0, opacity = 0.2, spread = 160 } = {}) => {
  let s = '';
  const span = W + 900;
  for (let i = 0; i < count; i++) {
    const z = 0.6 + rnd(seed + i * 2.3) * 0.8, len = 300 + rnd(seed + i * 4.1) * 380;
    const x = wrap(rnd(seed + i * 6.7) * span - wind * z * t, span) - 450, yy = y + (rnd(seed + i * 8.9) - 0.5) * spread;
    s += `<path d="M${n(x)} ${n(yy)} q ${n(len * 0.25)} ${n(-14 * z)} ${n(len * 0.5)} 0 t ${n(len * 0.5)} 0" fill="none" stroke="${T.snow}" stroke-width="${n(10 * z)}" stroke-linecap="round" opacity="${n(opacity * z)}"/>`;
  }
  return s;
};

// breath in the frost: puffs leave the mouth on every exhale, rise, grow and fade
export const vapour = ({ x, y, t = 0, s = 1, dir = 1, every = 2.8, seed = 0, strength = 1 }) => {
  let out = '';
  const life = 1.7, tt = t + seed * 1.13;
  for (let c = Math.floor(tt / every) - 1; c <= Math.floor(tt / every); c++) for (let k = 0; k < 4; k++) {
    const age = tt - (c * every + k * 0.26);
    if (age < 0 || age > life) continue;
    const ph = age / life, e = easeOut(ph);
    const px = x + dir * (16 + 96 * e) * s + Math.sin(k * 2.1 + c) * 8 * s, py = y - (6 + 74 * e + k * 6) * s, r = (12 + 36 * e) * s, a = n(strength * 0.16 * (1 - ph) * Math.min(1, ph * 7));
    out += `<circle cx="${n(px)}" cy="${n(py)}" r="${n(r)}" fill="${T.snow}" opacity="${a}"/><circle cx="${n(px + r * 0.7)}" cy="${n(py - r * 0.3)}" r="${n(r * 0.74)}" fill="${T.snow}" opacity="${a}"/><circle cx="${n(px - r * 0.6)}" cy="${n(py + r * 0.25)}" r="${n(r * 0.66)}" fill="${T.snow}" opacity="${a}"/>`;
  }
  return out;
};

// two headlights far away on the road; k = how close (0 = a dot on the horizon), on = 0..1
export const farLights = ({ x = 540, y = 800, k = 0, on = 1, t = 0 }) => {
  if (on <= 0.01) return '';
  const r = lerp(3.5, 15, k), gap = lerp(7, 40, k), f = 0.9 + 0.1 * Math.sin(t * 9);
  return [-1, 1].map((sd) => `<circle cx="${n(x + sd * gap)}" cy="${n(y)}" r="${n(r * 4.6)}" fill="${T.yellow}" opacity="${n(0.1 * on * f)}"/><circle cx="${n(x + sd * gap)}" cy="${n(y)}" r="${n(r * 2.2)}" fill="${T.yellow}" opacity="${n(0.24 * on * f)}"/><circle cx="${n(x + sd * gap)}" cy="${n(y)}" r="${n(r)}" fill="#FFF3C4" opacity="${n(on)}"/>`).join('')
    + `<ellipse cx="${n(x)}" cy="${n(y + r * 3 + 8)}" rx="${n(gap * 3.4 + 20)}" ry="${n(r * 1.6 + 5)}" fill="${T.yellow}" opacity="${n(0.16 * on * f)}"/>`;
};

// ---------- the car: a boxy SUV with no brand ----------
const wheel = (cx, cy, r, spin = 0) => {
  let sp = '';
  for (let i = 0; i < 5; i++) { const a = spin + (i * Math.PI * 2) / 5; sp += `<line x1="${n(cx + Math.cos(a) * r * 0.2)}" y1="${n(cy + Math.sin(a) * r * 0.2)}" x2="${n(cx + Math.cos(a) * r * 0.52)}" y2="${n(cy + Math.sin(a) * r * 0.52)}" stroke="${T.metalDark}" stroke-width="${n(r * 0.14)}" stroke-linecap="round"/>`; }
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${T.tyre}"/><circle cx="${cx}" cy="${cy}" r="${n(r * 0.6)}" fill="${T.metal}"/>${sp}<circle cx="${cx}" cy="${cy}" r="${n(r * 0.17)}" fill="${T.trim}"/>`;
};

// small heads seen through the car windows
const miniKostya = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-62 110 Q-62 44 -24 36 L24 36 Q62 44 62 110 Z" fill="${T.orange}"/><circle cx="0" cy="0" r="38" fill="${T.skin}"/><path d="M-40 -6 Q-42 -46 0 -46 Q42 -46 40 -6 Z" fill="${T.grey}"/><rect x="-42" y="-16" width="84" height="16" rx="7" fill="${T.greyDark}"/><circle cx="8" cy="8" r="4.5" fill="${T.ink}"/><circle cx="28" cy="8" r="4.5" fill="${T.ink}"/></g>`;
const miniAnya = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-50 100 Q-50 40 -20 32 L20 32 Q50 40 50 100 Z" fill="${T.coat}"/><circle cx="0" cy="0" r="34" fill="${T.skin}"/><path d="M-36 -4 Q-38 -42 0 -42 Q38 -42 36 -4 Z" fill="${T.red}"/><rect x="-38" y="-14" width="76" height="14" rx="6" fill="${T.redDark}"/><circle cx="0" cy="-48" r="13" fill="${T.snow}"/><circle cx="6" cy="8" r="4" fill="${T.ink}"/><circle cx="24" cy="8" r="4" fill="${T.ink}"/><rect x="-40" y="2" width="12" height="46" rx="6" fill="${T.ginger}"/></g>`;

// side view, nose to the right. (x, y) = ground under the middle of the car.
// lights/tail/cabin = 0..1, spinF/spinR = wheel angles, who = which heads are seen in the windows
export const suvSide = ({ x, y, s = 1, rot = 0, flip = false, lights = 0, tail = 0, cabin = 0, spinF = 0, spinR = 0, roofSnow = 1, who = '', beam = 0, beamLen = 620, beamDrop = 0 }) => {
  const glass = (d) => `<path d="${d}" fill="${T.glass}"/>${cabin > 0 ? `<path d="${d}" fill="${T.glassLit}" opacity="${n(0.62 * cabin)}"/>` : ''}`;
  const wins = ['M-404 -430 L-256 -430 L-256 -318 L-410 -318 Z', 'M-232 -430 L-58 -430 L-58 -318 L-232 -318 Z', 'M-34 -430 L92 -430 Q104 -430 110 -418 L156 -318 L-34 -318 Z'];
  const heads = `<clipPath id="tWin"><path d="${wins[1]} ${wins[2]}"/></clipPath><g clip-path="url(#tWin)">${who.includes('a') ? miniAnya(-150, -352) : ''}${who.includes('k') ? miniKostya(36, -372) : ''}</g>`;
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)}) scale(${flip ? -s : s} ${s})">
  ${beam > 0 ? `<polygon points="446,-252 ${446 + beamLen},${-330 + beamDrop} ${446 + beamLen},${-20 + beamDrop} 446,-232" fill="${T.yellow}" opacity="${n(0.15 * beam)}"/><polygon points="446,-250 ${446 + beamLen},${-262 + beamDrop} ${446 + beamLen},${-96 + beamDrop} 446,-234" fill="${T.yellow}" opacity="${n(0.13 * beam)}"/>` : ''}
  <rect x="-478" y="-338" width="40" height="156" rx="16" fill="${T.tyre}"/><rect x="-470" y="-300" width="12" height="80" rx="6" fill="${T.trim}"/>
  <rect x="-472" y="-132" width="46" height="13" rx="5" fill="${T.metalDark}"/>
  <path d="M-436 -118 L-436 -300 L-424 -438 Q-422 -454 -404 -454 L100 -454 Q120 -454 130 -438 L196 -302 L418 -290 Q440 -288 440 -268 L440 -118 Z" fill="${T.car}"/>
  <path d="M-436 -300 L196 -302 L196 -292 L-436 -290 Z" fill="${T.carLight}" opacity="0.6"/>
  <rect x="-436" y="-176" width="876" height="58" fill="${T.carDark}"/>
  ${wins.map(glass).join('')}${heads}
  <rect x="-246" y="-318" width="5" height="142" fill="${T.carDark}"/><rect x="-46" y="-318" width="5" height="142" fill="${T.carDark}"/><rect x="176" y="-300" width="5" height="124" fill="${T.carDark}"/>
  <rect x="-110" y="-292" width="42" height="12" rx="6" fill="${T.trim}"/><rect x="92" y="-292" width="42" height="12" rx="6" fill="${T.trim}"/>
  <rect x="140" y="-338" width="30" height="24" rx="7" fill="${T.trim}"/>
  <rect x="-390" y="-474" width="470" height="9" rx="4" fill="${T.trim}"/><rect x="-360" y="-470" width="9" height="18" fill="${T.trim}"/><rect x="42" y="-470" width="9" height="18" fill="${T.trim}"/>
  ${roofSnow > 0 ? `<path d="M-420 -452 Q-404 -486 -330 -480 Q-230 -494 -120 -482 Q-10 -494 70 -478 Q112 -474 116 -454 L100 -454 L-404 -454 Z" fill="${T.snow}" opacity="${n(0.95 * roofSnow)}"/><path d="M204 -302 Q300 -322 418 -292 L418 -290 L196 -302 Z" fill="${T.snow}" opacity="${n(0.95 * roofSnow)}"/>` : ''}
  <rect x="-456" y="-178" width="34" height="56" rx="9" fill="${T.trim}"/><rect x="424" y="-178" width="34" height="56" rx="9" fill="${T.trim}"/>
  <rect x="-440" y="-296" width="14" height="56" rx="5" fill="${T.red}" opacity="${n(0.55 + 0.45 * tail)}"/>${tail > 0 ? `<circle cx="-440" cy="-268" r="46" fill="${T.red}" opacity="${n(0.2 * tail)}"/>` : ''}
  <rect x="424" y="-264" width="20" height="36" rx="6" fill="${lights > 0 ? '#FFF3C4' : T.metal}"/>${lights > 0 ? `<circle cx="440" cy="-246" r="58" fill="${T.yellow}" opacity="${n(0.22 * lights)}"/>` : ''}
  <path d="M-360 -80 A98 98 0 0 1 -164 -80 Z" fill="${T.trim}"/><path d="M164 -80 A98 98 0 0 1 360 -80 Z" fill="${T.trim}"/>
  ${wheel(-262, -80, 80, spinR)}${wheel(262, -80, 80, spinF)}
  </g>`;
};

// rear view. (x, y) = ground under the middle. exhaust is on the right
export const suvRear = ({ x, y, s = 1, rot = 0, tail = 0, cabin = 0, roofSnow = 1, smoke = 0, t = 0 }) => {
  let puffs = '';
  if (smoke > 0) for (let k = 0; k < 4; k++) { const ph = wrap(t * 0.5 + k / 4, 1); puffs += `<circle cx="${n(196 + 70 * ph + 10 * Math.sin(k * 3 + t))}" cy="${n(-112 - 90 * ph)}" r="${n(16 + 44 * ph)}" fill="${T.snowLit}" opacity="${n(0.32 * smoke * (1 - ph))}"/>`; }
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)}) scale(${s})">
  <rect x="-286" y="-160" width="96" height="160" rx="22" fill="${T.tyre}"/><rect x="190" y="-160" width="96" height="160" rx="22" fill="${T.tyre}"/>
  <rect x="-250" y="-150" width="500" height="70" fill="${T.trim}"/>
  <rect x="150" y="-126" width="56" height="26" rx="10" fill="${T.metal}"/><ellipse cx="204" cy="-113" rx="9" ry="13" fill="${T.tyre}"/>
  <path d="M-280 -150 L-280 -430 Q-280 -520 -196 -520 L196 -520 Q280 -520 280 -430 L280 -150 Z" fill="${T.car}"/>
  <rect x="-280" y="-214" width="560" height="64" fill="${T.carDark}"/>
  <rect x="-212" y="-486" width="424" height="150" rx="22" fill="${T.glass}"/>${cabin > 0 ? `<rect x="-212" y="-486" width="424" height="150" rx="22" fill="${T.glassLit}" opacity="${n(0.6 * cabin)}"/>` : ''}
  <circle cx="0" cy="-262" r="112" fill="${T.tyre}"/><circle cx="0" cy="-262" r="80" fill="${T.carDark}"/><circle cx="0" cy="-262" r="80" fill="none" stroke="${T.car}" stroke-width="6"/><circle cx="0" cy="-262" r="16" fill="${T.trim}"/>
  <rect x="-272" y="-330" width="44" height="104" rx="12" fill="${T.red}" opacity="${n(0.55 + 0.45 * tail)}"/><rect x="228" y="-330" width="44" height="104" rx="12" fill="${T.red}" opacity="${n(0.55 + 0.45 * tail)}"/>
  ${tail > 0 ? `<circle cx="-250" cy="-278" r="86" fill="${T.red}" opacity="${n(0.16 * tail)}"/><circle cx="250" cy="-278" r="86" fill="${T.red}" opacity="${n(0.16 * tail)}"/>` : ''}
  <rect x="-300" y="-170" width="600" height="44" rx="14" fill="${T.trim}"/>
  <rect x="-86" y="-166" width="172" height="36" rx="6" fill="${T.snowLit}"/><rect x="-66" y="-154" width="60" height="12" rx="4" fill="${T.trim}" opacity="0.5"/><rect x="10" y="-154" width="52" height="12" rx="4" fill="${T.trim}" opacity="0.5"/>
  <rect x="-230" y="-540" width="460" height="10" rx="5" fill="${T.trim}"/>
  ${roofSnow > 0 ? `<path d="M-250 -516 Q-240 -556 -150 -548 Q-40 -566 60 -550 Q170 -560 236 -536 Q256 -528 250 -516 Q200 -522 196 -520 L-196 -520 Z" fill="${T.snow}" opacity="${n(0.95 * roofSnow)}"/>` : ''}
  ${puffs}</g>`;
};

// ---------- characters ----------
// The head is built exactly like the pilot's hero: circle r=108, ink ellipse eyes, brow strokes, mouth curve.
// eyes: 1 = open, 0 = closed (asleep); sleepy 0..1 lowers the lids
const face = ({ t = 0, look = 0, lookY = 0, worry = 0, eyes = 1, seed = 0, brow = T.hair, mouth = 0, sleepy = 0, eyeR = [12, 14], eyeX = 38, eyeY = 10, browW = 9 }) => {
  const b = eyes <= 0.05 ? 0 : blink(t, seed) * eyes * (1 - 0.55 * sleepy), ex = look * 16, ey = lookY * 12;
  const eye = (sx) => (b <= 0.02
    ? `<path d="M${n(sx * eyeX - 15)} ${eyeY + 4} Q${n(sx * eyeX)} ${eyeY + 16} ${n(sx * eyeX + 15)} ${eyeY + 4}" stroke="${T.ink}" stroke-width="7" fill="none" stroke-linecap="round"/>`
    : `<ellipse cx="${n(sx * eyeX + ex)}" cy="${n(eyeY + ey + sleepy * 5)}" rx="${eyeR[0]}" ry="${n(Math.max(1.6, eyeR[1] * b))}" fill="${T.ink}"/>`);
  const by = eyeY - 36 + sleepy * 10;
  const m = mouth > 0.05 // open mouth (calling, gasping)
    ? `<ellipse cx="0" cy="62" rx="${n(13 + 9 * mouth)}" ry="${n(6 + 15 * mouth)}" fill="${T.ink}"/>`
    : `<path d="M-18 56 Q0 ${n(62 - worry * 14)} 18 56" stroke="${T.ink}" stroke-width="8" fill="none" stroke-linecap="round"/>`;
  return `${eye(-1)}${eye(1)}
  <path d="M${-eyeX - 22} ${n(by + worry * 9)} L${-eyeX + 18} ${n(by - worry * 11)}" stroke="${brow}" stroke-width="${browW}" stroke-linecap="round"/>
  <path d="M${eyeX + 22} ${n(by + worry * 9)} L${eyeX - 18} ${n(by - worry * 11)}" stroke="${brow}" stroke-width="${browW}" stroke-linecap="round"/>${m}`;
};
const cheeks = (a = 0.28, col = T.red) => `<ellipse cx="-66" cy="44" rx="20" ry="13" fill="${col}" opacity="${a}"/><ellipse cx="66" cy="44" rx="20" ry="13" fill="${col}" opacity="${a}"/>`;
const knitHat = (main, cuff, ribs) => {
  let r = '';
  for (let i = -4; i <= 4; i++) r += `<rect x="${i * 24 - 2.5}" y="-85" width="5" height="36" rx="2" fill="${ribs}" opacity="0.55"/>`;
  return `<path d="M-112 -56 Q-120 -172 0 -172 Q120 -172 112 -56 Z" fill="${main}"/><rect x="-118" y="-92" width="236" height="50" rx="20" fill="${cuff}"/>${r}`;
};

// Kostya's head: grey knit hat. (0, 0) is the centre of the head, as in the pilot
export const kostyaHead = ({ t = 0, look = 0, lookY = 0, worry = 0, eyes = 1, sleepy = 0, mouth = 0, seed = 0, pale = 0 } = {}) => `
  <circle cx="0" cy="0" r="108" fill="${T.skin}"/>${pale > 0 ? `<circle cx="0" cy="0" r="108" fill="#B9C6DD" opacity="${n(0.5 * pale)}"/>` : ''}
  <path d="M-108 -30 Q-112 6 -100 34 L-92 -30 Z" fill="${T.hair}"/><path d="M108 -30 Q112 6 100 34 L92 -30 Z" fill="${T.hair}"/>
  ${cheeks(0.3 * (1 - pale))}${knitHat(T.grey, T.greyDark, T.grey)}
  ${face({ t, look, lookY, worry, eyes, sleepy, mouth, seed })}`;

// bust: head + shoulders. jacket = false shows the sweater (he gave the jacket to Anya)
export const kostya = ({ x, y, s = 1, t = 0, look = 0, lookY = 0, worry = 0, eyes = 1, sleepy = 0, mouth = 0, seed = 0, jacket = true, tilt = 0, bob = 1, pale = 0 }) => {
  const by = Math.sin(t * 1.5 + seed) * 4 * bob;
  const body = jacket
    ? `<path d="M-186 1000 L-186 470 Q-190 176 -92 134 L92 134 Q190 176 186 470 L186 1000 Z" fill="${T.orange}"/>
      <path d="M-186 1000 L-186 470 Q-188 300 -168 232 L-150 470 L-150 1000 Z" fill="${T.orangeDark}" opacity="0.55"/><path d="M186 1000 L186 470 Q188 300 168 232 L150 470 L150 1000 Z" fill="${T.orangeDark}" opacity="0.55"/>
      ${[286, 378, 470, 562, 654, 746].map((yy) => `<rect x="-152" y="${yy}" width="304" height="7" rx="3" fill="${T.orangeDark}" opacity="0.7"/>`).join('')}
      <rect x="-5" y="150" width="10" height="850" fill="${T.orangeDark}"/>
      <path d="M-84 150 Q-88 84 -40 78 L40 78 Q88 84 84 150 Q40 178 0 178 Q-40 178 -84 150 Z" fill="${T.orangeDark}"/>
      <rect x="-5" y="92" width="10" height="84" fill="${T.trim}" opacity="0.5"/>`
    : `<path d="M-176 1000 L-176 470 Q-180 180 -90 136 L90 136 Q180 180 176 470 L176 1000 Z" fill="${T.sweater}"/>
      <rect x="-140" y="250" width="280" height="12" rx="6" fill="${T.sweaterLight}" opacity="0.6"/><rect x="-146" y="290" width="292" height="12" rx="6" fill="${T.snowLit}" opacity="0.35"/><rect x="-150" y="330" width="300" height="12" rx="6" fill="${T.sweaterLight}" opacity="0.6"/>
      <path d="M-66 150 Q-70 88 -34 84 L34 84 Q70 88 66 150 Q30 170 0 170 Q-30 170 -66 150 Z" fill="${T.sweaterLight}"/>`;
  return `<g transform="translate(${n(x)} ${n(y + by)}) scale(${s})">${body}
  ${jacket ? '' : `<rect x="-30" y="76" width="60" height="40" rx="18" fill="${T.skinShade}"/>`}
  <g transform="rotate(${n(tilt)} 0 60)">${kostyaHead({ t, look, lookY, worry, eyes, sleepy, mouth, seed, pale })}</g></g>`;
};

// Anya's head: red hat with a pom-pom, ginger fringe and braid. (0, 0) is the centre of the head
const braid = (x0, y0, len = 5, s = 1) => {
  let o = '';
  for (let i = 0; i < len; i++) { const w = (30 - i * 2.4) * s, yy = y0 + i * 34 * s; o += `<ellipse cx="${n(x0 + (i % 2 ? 5 : -5) * s)}" cy="${n(yy)}" rx="${n(w)}" ry="${n(22 * s)}" fill="${i % 2 ? T.gingerDark : T.ginger}"/>`; }
  const ey = y0 + len * 34 * s;
  return `${o}<rect x="${n(x0 - 15 * s)}" y="${n(ey - 16 * s)}" width="${n(30 * s)}" height="${n(13 * s)}" rx="${n(5 * s)}" fill="${T.snow}"/><path d="M${n(x0 - 15 * s)} ${n(ey - 4 * s)} L${n(x0 + 15 * s)} ${n(ey - 4 * s)} L${n(x0 + 9 * s)} ${n(ey + 34 * s)} L${n(x0)} ${n(ey + 22 * s)} L${n(x0 - 9 * s)} ${n(ey + 34 * s)} Z" fill="${T.ginger}"/>`;
};
export const anyaHead = ({ t = 0, look = 0, lookY = 0, worry = 0, eyes = 1, sleepy = 0, mouth = 0, seed = 2, pale = 0 } = {}) => {
  let pom = '';
  for (let i = 0; i < 7; i++) { const a = (i * Math.PI * 2) / 7; pom += `<circle cx="${n(Math.cos(a) * 26)}" cy="${n(-190 + Math.sin(a) * 26)}" r="20" fill="${T.snow}"/>`; }
  return `${braid(96, 86)}
  <circle cx="0" cy="0" r="108" fill="${T.skin}"/>${pale > 0 ? `<circle cx="0" cy="0" r="108" fill="#B9C6DD" opacity="${n(0.5 * pale)}"/>` : ''}
  <path d="M-104 -40 Q-60 -12 -10 -44 Q30 -18 104 -40 L104 -70 L-104 -70 Z" fill="${T.ginger}"/>
  ${cheeks(0.34 * (1 - pale))}
  ${[[-74, 30], [-58, 24], [-64, 40], [74, 30], [58, 24], [64, 40]].map(([fx, fy]) => `<circle cx="${fx}" cy="${fy}" r="3.4" fill="${T.gingerDark}" opacity="0.7"/>`).join('')}
  ${knitHat(T.red, T.redDark, T.red)}<circle cx="0" cy="-190" r="30" fill="${T.snow}"/>${pom}
  ${face({ t, look, lookY, worry, eyes, sleepy, mouth, seed, brow: T.gingerDark, eyeR: [13, 16], eyeX: 40, eyeY: 16, browW: 7 })}`;
};
// bust: small shoulders in a light coat; cover 0..1 pulls Kostya's orange jacket over her
export const anya = ({ x, y, s = 1, t = 0, look = 0, lookY = 0, worry = 0, eyes = 1, sleepy = 0, mouth = 0, seed = 2, tilt = 0, bob = 1, cover = 0, pale = 0 }) => {
  const by = Math.sin(t * 1.3 + seed) * 3 * bob;
  return `<g transform="translate(${n(x)} ${n(y + by)}) scale(${s})">
  <path d="M-150 1000 L-150 440 Q-154 190 -78 138 L78 138 Q154 190 150 440 L150 1000 Z" fill="${T.coat}"/>
  <rect x="-118" y="270" width="236" height="7" rx="3" fill="${T.coatShade}"/><rect x="-124" y="350" width="248" height="7" rx="3" fill="${T.coatShade}"/>
  <path d="M-70 150 Q-74 92 -34 88 L34 88 Q74 92 70 150 Q34 172 0 172 Q-34 172 -70 150 Z" fill="${T.red}"/>
  ${cover > 0 ? `<g opacity="${n(clamp(cover * 3))}" transform="translate(0 ${n((1 - cover) * 260)})"><path d="M-210 1000 L-210 470 Q-214 214 -150 176 Q-60 150 0 164 Q70 146 152 176 Q214 214 210 470 L210 1000 Z" fill="${T.orange}"/><path d="M-150 176 Q-60 150 0 164 Q70 146 152 176 Q150 204 0 196 Q-150 206 -150 176 Z" fill="${T.orangeDark}"/>${[300, 390, 480, 570, 660, 750].map((yy) => `<rect x="-174" y="${yy}" width="348" height="7" rx="3" fill="${T.orangeDark}" opacity="0.7"/>`).join('')}</g>` : ''}
  <g transform="rotate(${n(tilt)} 0 70)">${anyaHead({ t, look, lookY, worry, eyes, sleepy, mouth, seed, pale })}</g></g>`;
};

// ---------- text helpers ----------
// glyph advances of Montserrat ExtraBold at font-size 1 (measured in Chrome), for laying out plates
const ADV = {};
[[26, ' '], [28, '.,:;'], [30, '!'], [37, '()'], [39, '-'], [41, '1'], [42, '°/'], [50, '–'], [53, 'г'], [56, 'т'], [57, 'з'], [60, '23Гэ?'], [61, '5ас−«»+×'], [62, 'хь'], [63, '7в'], [64, 'уя'], [65, '69еёч'], [66, 'ЗТо'], [67, '8к'], [68, 'ЕЁбл'], [69, '0п'], [70, '4нр'], [71, 'цъ'], [72, 'Эдий'], [73, 'РСЬC'], [74, 'БВУЧЯ'], [75, 'К'], [76, 'Х'], [80, 'Л'], [81, 'П'], [82, 'АИЙН'], [83, 'м'], [84, 'О'], [85, 'ДЦO'], [86, 'Ъ'], [87, 'ф'], [89, 'ы'], [90, '%'], [92, 'ю'], [95, 'ж'], [96, 'М'], [97, 'Ф'], [99, 'шщ'], [100, '—'], [105, 'Ы'], [110, 'Ш'], [111, 'Ж'], [112, 'Ю'], [114, 'Щ'], [123, '№']]
  .forEach(([v, cs]) => { for (const ch of cs) ADV[ch] = v / 100; });
export const textW = (str, size, ls = 0) => [...String(str)].reduce((a, ch) => a + (ADV[ch] ?? 0.72) * size + ls, 0);

// where the k-th sentence of a narration unit starts, 0..1 (same proportions as the caption timing),
// so a picture can react to a word without knowing how long the voice file is
export const sentenceAt = (text, k) => {
  const parts = String(text).replace(/[*|]/g, '').match(/[^.!?…]+[.!?…]+/g) || [text];
  const w = parts.map((p) => p.replace(/[^А-Яа-яЁё0-9]/g, '').length + 8), tot = w.reduce((a, b) => a + b, 0);
  return w.slice(0, k).reduce((a, b) => a + b, 0) / tot;
};

// ---------- instrument plates ----------
const ICON = {
  temp: (c) => `<rect x="21" y="2" width="14" height="38" rx="7" fill="none" stroke="${c}" stroke-width="5"/><circle cx="28" cy="44" r="11" fill="${c}"/><rect x="25" y="16" width="6" height="26" fill="${c}"/>`,
  fuel: (c) => `<rect x="6" y="5" width="28" height="48" rx="5" fill="${c}"/><rect x="12" y="12" width="16" height="13" rx="2" fill="${T.panel}"/><path d="M34 20 L43 20 L49 27 L49 44 Q49 50 44 50 Q39 50 39 44 L39 32" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  phone: (c, lv = 1) => `<rect x="3" y="14" width="44" height="28" rx="7" fill="none" stroke="${c}" stroke-width="5"/><rect x="49" y="22" width="5" height="12" rx="2" fill="${c}"/><rect x="10" y="21" width="${n(Math.max(4, 30 * lv))}" height="14" rx="2" fill="${c}"/>`,
  clock: (c) => `<circle cx="28" cy="28" r="23" fill="none" stroke="${c}" stroke-width="5"/><path d="M28 14 L28 28 L38 35" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  pin: (c) => `<path d="M28 3 Q47 3 47 22 Q47 35 28 54 Q9 35 9 22 Q9 3 28 3 Z" fill="${c}"/><circle cx="28" cy="22" r="8" fill="${T.panel}"/>`,
  nosignal: (c) => `<rect x="4" y="38" width="9" height="14" rx="2" fill="${c}" opacity="0.45"/><rect x="17" y="28" width="9" height="24" rx="2" fill="${c}" opacity="0.45"/><rect x="30" y="17" width="9" height="35" rx="2" fill="${c}" opacity="0.45"/><rect x="43" y="6" width="9" height="46" rx="2" fill="${c}" opacity="0.45"/><path d="M6 8 L50 52" stroke="${T.orange}" stroke-width="7" stroke-linecap="round"/>`,
  walk: (c) => `<circle cx="30" cy="8" r="7" fill="${c}"/><path d="M30 18 L26 36 L16 52 M26 36 L38 52 M28 22 L16 30 M29 22 L42 30" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  heat: (c) => [10, 28, 46].map((x) => `<path d="M${x} 52 q -8 -12 0 -24 q 8 -12 0 -24" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round"/>`).join(''),
  wall: (c) => `<path d="M28 3 L50 11 L50 28 Q50 44 28 54 Q6 44 6 28 L6 11 Z" fill="none" stroke="${c}" stroke-width="5" stroke-linejoin="round"/><path d="M18 28 L26 36 L39 20" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  engine: (c) => `<rect x="10" y="20" width="32" height="24" rx="4" fill="${c}"/><rect x="18" y="10" width="16" height="8" rx="2" fill="${c}"/><rect x="2" y="26" width="8" height="12" rx="2" fill="${c}"/><rect x="42" y="24" width="10" height="16" rx="3" fill="${c}"/>`,
  warn: (c) => `<path d="M28 4 L53 50 L3 50 Z" fill="none" stroke="${c}" stroke-width="6" stroke-linejoin="round"/><rect x="25" y="20" width="6" height="16" rx="3" fill="${c}"/><circle cx="28" cy="42" r="3.6" fill="${c}"/>`,
};

// plate with an icon and a value, optional small label above; (x, y) = top-left corner. pop 0..1 animates the entrance
export const gauge = ({ x = 70, y = 260, icon = 'temp', value, label = '', accent = false, pop = 1, size = 56, level = 1 }) => {
  if (pop <= 0) return '';
  const col = accent ? T.orange : T.snow, tw = textW(value, size, 2), lw = label ? textW(label, 26, 2) * 0.96 : 0;
  const w = 104 + Math.max(tw, lw) + 26, h = label ? 136 : size + 44, a = easeOut(clamp(pop));
  return `<g transform="translate(${n(x)} ${n(y + h / 2)}) scale(${n(0.84 + 0.16 * a)}) translate(0 ${-h / 2})" opacity="${n(clamp(pop * 3))}">
  <rect x="0" y="0" width="${n(w)}" height="${h}" rx="18" fill="${T.panel}" stroke="${accent ? T.orange : T.panelEdge}" stroke-width="5"/>
  <g transform="translate(26 ${n(h / 2 - 28)})">${ICON[icon](col, level)}</g>
  ${label ? txt(104, 46, label, { size: 26, weight: 600, fill: T.label, anchor: 'start', ls: 2 }) : ''}
  ${txt(104, label ? 106 : h / 2 + size * 0.35, value, { size, fill: col, anchor: 'start', ls: 2 })}</g>`;
};
export const gaugeH = (label, size = 56) => (label ? 136 : size + 44);

// wide rule plate: orange header word, one or two lines of text; centred on x = 540
export const rulePlate = ({ y = 260, head = 'ПРАВИЛО', lines = [], pop = 1, size = 50, w = 0 }) => {
  if (pop <= 0) return '';
  const a = easeOut(clamp(pop)), ww = w || Math.max(...lines.map((l) => textW(l, size, 1)), textW(head, 30, 4)) + 96, h = 84 + lines.length * (size + 14) + 22;
  return `<g transform="translate(540 ${n(y + h / 2)}) scale(${n(0.84 + 0.16 * a)}) translate(-540 ${-h / 2})" opacity="${n(clamp(pop * 3))}">
  <rect x="${n(540 - ww / 2)}" y="0" width="${n(ww)}" height="${h}" rx="22" fill="${T.panel}" stroke="${T.orange}" stroke-width="5"/>
  <rect x="${n(540 - ww / 2)}" y="0" width="${n(ww)}" height="62" rx="22" fill="${T.orange}"/><rect x="${n(540 - ww / 2)}" y="34" width="${n(ww)}" height="28" fill="${T.orange}"/>
  ${txt(540, 44, head, { size: 30, fill: T.night, ls: 4 })}
  ${lines.map((l, i) => txt(540, 62 + (i + 1) * (size + 14) + 2, l, { size, fill: T.snow, ls: 1 })).join('')}</g>`;
};

// ---------- outdoor scenes ----------
// road sign plastered with snow: only «ЗИМНИК ЗА…» can be read (a silent clue, the voice never mentions it)
export const roadSign = ({ x, y, s = 1 }) => `<g transform="translate(${n(x)} ${n(y)}) scale(${s})">
  <rect x="-6" y="-250" width="12" height="258" fill="${T.trim}"/>
  <rect x="-124" y="-336" width="248" height="136" rx="12" fill="${T.yellow}"/><rect x="-124" y="-336" width="248" height="136" rx="12" fill="none" stroke="${T.trim}" stroke-width="7"/>
  ${txt(0, -278, 'ЗИМНИК', { size: 42, fill: T.trim })}${txt(0, -226, 'ЗАКРЫТ', { size: 42, fill: T.trim })}
  <path d="M-136 -340 Q-70 -362 -6 -344 Q64 -360 136 -340 L136 -310 Q92 -300 58 -312 Q16 -298 -36 -310 Q-86 -300 -136 -314 Z" fill="${T.snow}"/>
  <path d="M-26 -262 Q14 -276 62 -264 Q112 -272 134 -250 L134 -194 L-14 -194 Q-46 -222 -26 -262 Z" fill="${T.snow}"/>
  <ellipse cx="0" cy="8" rx="36" ry="11" fill="${T.rim}" opacity="0.6"/></g>`;

// the car in the ditch, side view from the field; the winter road runs behind it
export const DITCH = { x: 500, y: 1200, s: 0.86, rot: 9 };
const DRIFT = 'M-20 1244 Q150 1228 320 1248 Q500 1268 640 1208 Q760 1138 900 1126 Q1010 1120 1100 1152';
export const ditch = ({ t = 0, lights = 1, cabin = 0.45, tail = 1, spinR = 0, who = '', flakes = 1, moon = true, car = true } = {}) => {
  const hz = 800;
  const lit = lights > 0 ? `<ellipse cx="968" cy="1132" rx="176" ry="52" fill="${T.yellow}" opacity="${n(0.2 * lights)}"/><ellipse cx="990" cy="1126" rx="98" ry="26" fill="${T.snow}" opacity="${n(0.3 * lights)}"/>` : '';
  return sky({ t, horizon: hz, moon: moon ? { x: 850, y: 372, r: 36 } : null })
    + forest({ y: hz, h: 124, gap: 76, seed: 3, fill: T.far2 }) + forest({ y: hz + 14, h: 84, gap: 50, seed: 8 })
    + snow({ y: hz + 10, fill: T.field, seed: 1, amp: 8, rim: 0.22 })
    + `<path d="M-300 915.5 L1400 894.25 L1400 954.25 L-300 979.5 Z" fill="${T.road}"/><path d="M-300 937.5 L1400 916.25" stroke="${T.rut}" stroke-width="6" opacity="0.4"/><path d="M-300 959.5 L1400 936.25" stroke="${T.rut}" stroke-width="7" opacity="0.4"/>`
    + [70, 330, 590, 850].map((x) => pole({ x, y: 911 - x * 0.0125, h: 122, s: 0.9 })).join('')
    + snow({ y: 966, fill: T.field2, seed: 5, amp: 9, rim: 0.5 })
    + `<path d="M-40 990 Q130 1010 262 1160" stroke="${T.rut}" stroke-width="17" fill="none" stroke-linecap="round" opacity="0.7"/><path d="M40 978 Q210 992 350 1130" stroke="${T.rut}" stroke-width="17" fill="none" stroke-linecap="round" opacity="0.7"/>`
    + (car ? suvSide({ ...DITCH, lights, beam: lights, beamLen: 400, tail, cabin, spinR, who }) : '')
    + `<path d="${DRIFT} L1400 1152 L1400 ${H + 600} L-300 ${H + 600} L-300 1244 Z" fill="${T.bank}"/>${lit}<path d="${DRIFT}" fill="none" stroke="${T.rim}" stroke-width="6" stroke-linecap="round" opacity="0.7"/>`
    + (flakes > 0 ? drift({ t, y: 1310, opacity: 0.16 * flakes }) + snowfall({ t, opacity: 0.75 * flakes }) : '');
};

// driving along the winter road, side view; the world scrolls, the car stays in frame
export const drive = ({ t = 0, x = 450, speed = 560, rot = 0, dy = 0, sign = null, who = 'ak', lights = 1, slide = 0 } = {}) => {
  const hz = 830, sh = t * speed;
  let poles = '', marks = '';
  const gap = 430, i0 = Math.floor((sh * 0.9 - 100) / gap), i1 = Math.ceil((sh * 0.9 + W + 100) / gap);
  for (let i = i0; i <= i1; i++) poles += pole({ x: i * gap - sh * 0.9, y: 1052, h: 132 });
  for (let i = Math.floor((sh - 200) / 190); i <= Math.ceil((sh + W + 200) / 190); i++) marks += `<ellipse cx="${n(i * 190 + rnd(i) * 80 - sh)}" cy="${n(1180 + rnd(i * 3) * 34)}" rx="${n(40 + rnd(i * 7) * 50)}" ry="5" fill="${T.rut}" opacity="0.45"/>`;
  return sky({ t, horizon: hz })
    + forest({ y: hz, h: 124, gap: 76, seed: 3, fill: T.far2, shift: sh * 0.06 }) + forest({ y: hz + 14, h: 84, gap: 50, seed: 8, shift: sh * 0.12 })
    + snow({ y: hz + 10, fill: T.field, seed: 1, amp: 8, rim: 0.22, shift: sh * 0.3 })
    + snow({ y: 1040, fill: T.field2, seed: 4, amp: 7, rim: 0.45, shift: sh * 0.85 }) + poles + (sign != null ? roadSign({ x: sign - sh * 0.9, y: 1052 }) : '')
    + `<rect x="-300" y="1064" width="${W + 600}" height="170" fill="${T.road}"/><rect x="-300" y="1108" width="${W + 600}" height="9" fill="${T.rut}" opacity="0.35"/><rect x="-300" y="1150" width="${W + 600}" height="10" fill="${T.rut}" opacity="0.35"/>${marks}`
    + suvSide({ x: x + slide, y: 1172 + dy, s: 0.8, rot, lights, beam: lights, beamLen: 760, tail: 1, cabin: 0.3, who, spinF: sh / 64, spinR: sh / 64 })
    + snow({ y: 1226, fill: T.bank, seed: 7, amp: 12, rim: 0.65, shift: sh * 1.25 })
    + snowfall({ t, wind: 230 + speed * 0.9, fall: 60, count: 40, seed: 3 });
};

// the winter road running away to the horizon; pt(u) gives a point on its centre line (0 = near, 1 = horizon)
const RA = { l: [[96, 1920], [440, 1150], [546, 838]], r: [[1030, 1920], [712, 1150], [574, 838]] };
const bez = (P, u) => [0, 1].map((k) => (1 - u) * (1 - u) * P[0][k] + 2 * u * (1 - u) * P[1][k] + u * u * P[2][k]);
const roadS = (u) => 0.1 + 1.5 * Math.pow(1 - u, 1.25);
export const roadPt = (u) => { const a = bez(RA.l, u), b = bez(RA.r, u); return { x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, w: b[0] - a[0], s: roadS(u) }; };
export const roadAhead = ({ t = 0, flakes = 1, count = 46, wind = 230 } = {}) => {
  const hz = 824, q = (P) => `Q${P[1][0]} ${P[1][1]} ${P[2][0]} ${P[2][1]}`;
  let poles = '';
  [0.2, 0.36, 0.5, 0.62, 0.72, 0.8, 0.865, 0.915, 0.95].forEach((u) => {
    const s = roadS(u), dim = lerp(1, 0.55, u);
    for (const P of [RA.l, RA.r]) { const [px, py] = bez(P, u); poles += pole({ x: px + (P === RA.l ? -26 : 26) * s, y: py, h: 150, s, dim }); }
  });
  return sky({ t, horizon: hz, seed: 5 })
    + forest({ y: hz, h: 110, gap: 70, seed: 13, fill: T.far2 }) + forest({ y: hz + 12, h: 74, gap: 46, seed: 21 })
    + snow({ y: hz + 8, fill: T.field, seed: 2, amp: 5, rim: 0.2 }) + snow({ y: 1120, fill: T.field2, seed: 9, amp: 18, rim: 0.3 })
    + `<path d="M${RA.l[0][0] - 70} 1920 Q${RA.l[1][0] - 40} ${RA.l[1][1]} ${RA.l[2][0] - 4} ${RA.l[2][1]} L${RA.r[2][0] + 4} ${RA.r[2][1]} Q${RA.r[1][0] + 40} ${RA.r[1][1]} ${RA.r[0][0] + 70} 1920 Z" fill="${T.bank}"/>
    <path d="M${RA.l[0][0]} 1920 ${q(RA.l)} L${RA.r[2][0]} ${RA.r[2][1]} Q${RA.r[1][0]} ${RA.r[1][1]} ${RA.r[0][0]} 1920 Z" fill="${T.road}"/>
    <path d="M${RA.l[0][0] - 70} 1920 Q${RA.l[1][0] - 40} ${RA.l[1][1]} ${RA.l[2][0] - 4} ${RA.l[2][1]}" fill="none" stroke="${T.rim}" stroke-width="6" opacity="0.6"/><path d="M${RA.r[0][0] + 70} 1920 Q${RA.r[1][0] + 40} ${RA.r[1][1]} ${RA.r[2][0] + 4} ${RA.r[2][1]}" fill="none" stroke="${T.rim}" stroke-width="6" opacity="0.6"/>
    <path d="M400 1920 Q520 1150 556 838" fill="none" stroke="${T.rut}" stroke-width="20" opacity="0.4"/><path d="M730 1920 Q610 1150 566 838" fill="none" stroke="${T.rut}" stroke-width="20" opacity="0.4"/>`
    + poles + (flakes > 0 ? drift({ t, y: 1500, opacity: 0.16 * flakes, spread: 500, wind }) + snowfall({ t, count, wind, opacity: 0.75 * flakes, seed: 11 }) : '');
};

// Kostya from behind, standing; (x, y) = feet
export const kostyaBack = ({ x, y, s = 1, t = 0, carry = false }) => `<g transform="translate(${n(x)} ${n(y)}) scale(${s})">
  <rect x="-52" y="-250" width="46" height="246" rx="18" fill="#1B2A44"/><rect x="6" y="-250" width="46" height="246" rx="18" fill="#1B2A44"/>
  <rect x="-60" y="-34" width="56" height="36" rx="14" fill="${T.tyre}"/><rect x="4" y="-34" width="56" height="36" rx="14" fill="${T.tyre}"/>
  <rect x="-140" y="-520" width="50" height="250" rx="24" fill="${T.orangeDark}"/><rect x="90" y="-520" width="50" height="250" rx="24" fill="${T.orangeDark}"/>
  <path d="M-96 -222 L-110 -476 Q-106 -540 -44 -548 L44 -548 Q106 -540 110 -476 L96 -222 Z" fill="${T.orange}"/>
  <rect x="-100" y="-420" width="200" height="7" rx="3" fill="${T.orangeDark}" opacity="0.7"/><rect x="-98" y="-330" width="196" height="7" rx="3" fill="${T.orangeDark}" opacity="0.7"/>
  <path d="M-62 -540 Q-66 -582 -30 -586 L30 -586 Q66 -582 62 -540 Q30 -522 0 -522 Q-30 -522 -62 -540 Z" fill="${T.orangeDark}"/>
  ${carry ? `<circle cx="74" cy="-590" r="40" fill="${T.red}"/><rect x="34" y="-584" width="80" height="18" rx="8" fill="${T.redDark}"/><circle cx="80" cy="-636" r="15" fill="${T.snow}"/><rect x="100" y="-560" width="22" height="70" rx="11" fill="${T.ginger}"/><rect x="-150" y="-420" width="60" height="130" rx="26" fill="${T.coat}"/><rect x="-156" y="-320" width="40" height="110" rx="18" fill="#34406B"/><rect x="-160" y="-230" width="48" height="34" rx="14" fill="${T.grey}"/>` : ''}
  <circle cx="0" cy="-634" r="62" fill="${T.grey}"/><rect x="-66" y="-630" width="132" height="30" rx="13" fill="${T.greyDark}"/><rect x="-22" y="-600" width="44" height="22" rx="8" fill="${T.skinShade}"/>
  </g>`;

// open hand, built like the palm in the pilot; frost 0..1 whitens it from the fingertips down
export const hand = ({ x, y, s = 1, frost = 0 }) => {
  const f = [[-92, 150], [-42, 186], [8, 174], [58, 134]];
  const shape = (col, tip) => `<path d="M-98 -40 Q-98 -70 -70 -70 L74 -70 Q100 -70 100 -40 L100 100 Q100 160 40 160 L-40 160 Q-98 160 -98 100 Z" fill="${col}"/>
    ${f.map(([fx, fh]) => `<rect x="${fx}" y="${-60 - fh}" width="40" height="${fh + 30}" rx="20" fill="${col}"/>`).join('')}
    <rect x="-168" y="-20" width="110" height="44" rx="22" transform="rotate(28 -110 0)" fill="${col}"/>${tip}`;
  const cut = lerp(-270, 70, frost);
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${s})">
  <rect x="-80" y="200" width="160" height="560" rx="50" fill="${T.orange}"/><rect x="-88" y="190" width="176" height="70" rx="26" fill="${T.orangeDark}"/>
  <rect x="-60" y="120" width="120" height="100" rx="34" fill="${T.skinShade}"/>
  ${shape(T.skin, f.map(([fx, fh]) => `<ellipse cx="${fx + 20}" cy="${-34 - fh}" rx="13" ry="18" fill="${T.red}" opacity="0.22"/>`).join(''))}
  ${frost > 0 ? `<clipPath id="tFrost"><rect x="-260" y="-300" width="520" height="${n(cut + 300)}"/></clipPath><g clip-path="url(#tFrost)">${shape('#E4EEF8', '')}</g>
  <clipPath id="tFrost2"><rect x="-260" y="${n(cut - 26)}" width="520" height="52"/></clipPath><g clip-path="url(#tFrost2)" opacity="0.5">${shape('#E9C9B4', '')}</g>` : ''}
  </g>`;
};

// ---------- inside the car ----------
// Cross-section, nose to the right: rear seat on the left, front seat, steering wheel, key, dashboard.
// dome/dash/warm = 0..1 lights and heater, key = 0..1 turned. K and A are pose objects (null hides the person):
// K: { jacket, arm: 'wheel' | 'key' | 'back', look, eyes, sleepy, worry }, A: { eyes, tilt, cover 0..1, look }.
// The scene behind (sky) and the snow in front are drawn by the caller.
const limb = (pts, w, col) => `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
export const cabin = ({ t = 0, dome = 0.7, dash = 0, key = 0, warm = 0, tilt = 4, K = {}, A = {}, exhaust = true, phone = false, gap = 0, inner = '' } = {}) => {
  const far = ['M118 600 L288 600 L288 796 L118 796 Z', 'M312 600 L440 600 L440 796 L312 796 Z', 'M486 600 L846 600 L924 796 L486 796 Z'];
  const frost = (x, y, sx = 1) => `<path d="M${x} ${y} l${70 * sx} 0 q${-40 * sx} 14 ${-48 * sx} 30 q${-10 * sx} 20 ${-22 * sx} 44 Z" fill="${T.snow}" opacity="0.22"/>`;
  const wall = mix(mix(T.cabin, '#2A4468', 0.55 * dome), T.cabinWarm, 0.75 * warm), wall2 = mix(mix(T.cabinLight, '#375A86', 0.55 * dome), '#74452A', 0.75 * warm);
  const seatC = mix(T.seat, '#4A2E24', 0.6 * warm), seatL = mix(T.seatLight, '#6B4230', 0.6 * warm), cav = 'M92 566 L872 566 L972 820 L1010 820 L1010 1100 L92 1100 Z';
  let s = `<g transform="rotate(${n(tilt)} 540 900)">`;
  // body shell and the cavity
  s += `<circle cx="212" cy="1216" r="96" fill="${T.tyre}"/><circle cx="212" cy="1216" r="56" fill="${T.metal}"/><circle cx="896" cy="1216" r="96" fill="${T.tyre}"/><circle cx="896" cy="1216" r="56" fill="${T.metal}"/>
  ${exhaust ? `<rect x="40" y="1178" width="830" height="14" fill="${T.metalDark}"/><rect x="10" y="1172" width="64" height="24" rx="9" fill="${T.metal}"/>` : ''}
  <path d="M40 1190 L40 592 Q40 520 112 520 L868 520 Q900 520 914 548 L1016 806 L1130 816 L1130 1190 L1012 1190 A116 116 0 0 0 780 1190 L328 1190 A116 116 0 0 0 96 1190 Z" fill="${T.car}"/>
  <path d="M40 1136 L1130 1136 L1130 1190 L1012 1190 A116 116 0 0 0 780 1190 L328 1190 A116 116 0 0 0 96 1190 L40 1190 Z" fill="${T.carDark}"/>
  <path d="M112 520 Q130 484 220 492 Q340 476 470 490 Q600 478 720 490 Q830 484 868 520 Z" fill="${T.snow}"/><path d="M1022 808 Q1070 790 1130 800 L1130 816 Z" fill="${T.snow}"/>
  <path d="${cav}" fill="${wall}"/>
  <rect x="92" y="800" width="800" height="300" fill="${wall2}" opacity="0.7"/>
  ${far.map((d) => `<path d="${d}" fill="#07121F"/>`).join('')}
  <clipPath id="tFar"><path d="${far.join(' ')}"/></clipPath><g clip-path="url(#tFar)">${snowfall({ t, count: 16, y0: 590, y1: 800, seed: 31, opacity: 0.6 })}</g>
  ${frost(118, 600)}${frost(312, 600)}${frost(486, 600)}${frost(288, 600, -1)}${frost(440, 600, -1)}
  ${gap > 0 ? `<path d="M486 600 L846 600 L${n(846 + 8 * gap)} ${n(600 + 20 * gap)} L486 ${n(600 + 20 * gap)} Z" fill="#3A6EA5"/><rect x="560" y="588" width="210" height="${n(24 + 20 * gap)}" rx="16" fill="none" stroke="${T.orange}" stroke-width="5" opacity="${n(0.9 * gap)}"/>` : ''}
  <rect x="440" y="566" width="46" height="534" fill="${wall2}"/><rect x="300" y="800" width="5" height="300" fill="${wall}"/>
  <rect x="340" y="846" width="60" height="12" rx="6" fill="${wall}"/><rect x="560" y="846" width="60" height="12" rx="6" fill="${wall}"/>`;
  // dome lamp and its light
  s += `<rect x="424" y="566" width="78" height="16" rx="8" fill="${dome > 0.05 ? '#FFF3C4' : T.metalDark}"/>${dome > 0.05 ? `<polygon points="430,582 496,582 800,1100 130,1100" fill="#FFE9A8" opacity="${n(0.1 * dome)}"/>` : ''}`;
  // rear seat, front seat
  const seat = (bx, by) => `<rect x="${bx + 30}" y="${by + 54}" width="26" height="40" fill="${T.trim}"/><rect x="${bx + 150}" y="${by + 54}" width="26" height="40" fill="${T.trim}"/>
  <path d="M${bx - 18} ${by + 54} L${bx + 40} ${by + 54} L${bx - 6} ${by - 252} Q${bx - 10} ${by - 276} ${bx - 32} ${by - 276} L${bx - 50} ${by - 276} Q${bx - 74} ${by - 274} ${bx - 72} ${by - 246} Z" fill="${seatC}"/>
  <rect x="${bx - 80}" y="${by - 356}" width="60" height="78" rx="20" transform="rotate(-8 ${bx - 50} ${by - 317})" fill="${seatC}"/>
  <rect x="${bx - 6}" y="${by}" width="230" height="60" rx="26" fill="${seatL}"/>`;
  s += seat(170, 1012) + seat(520, 1012);
  // dashboard, wheel, key
  const turn = lerp(18, 78, key);
  s += `<path d="M790 828 Q790 812 806 812 L1010 812 L1010 1100 L884 1100 L884 992 L800 962 Q790 958 790 946 Z" fill="#0B182A"/><rect x="800" y="812" width="210" height="9" rx="4" fill="${wall2}"/>
  <rect x="790" y="838" width="12" height="62" rx="6" fill="${T.orange}" opacity="${n(0.15 + 0.85 * dash)}"/>${dash > 0 ? `<ellipse cx="770" cy="868" rx="76" ry="64" fill="${T.orange}" opacity="${n(0.12 * dash)}"/>` : ''}
  ${limb([[758, 886], [812, 936]], 20, '#263C5E')}<g transform="rotate(-20 748 868)"><ellipse cx="748" cy="868" rx="15" ry="82" fill="none" stroke="#3A5680" stroke-width="13"/></g>
  <circle cx="800" cy="930" r="11" fill="${T.metalDark}"/><g transform="translate(796 934) rotate(${n(turn)})"><rect x="-4" y="0" width="8" height="28" rx="3" fill="${T.metal}"/><rect x="-10" y="22" width="20" height="17" rx="6" fill="${T.trim}"/>
  <g transform="translate(0 38) rotate(${n(-turn + Math.sin(t * 3) * 6 * (0.3 + key))})"><rect x="-2" y="0" width="4" height="20" fill="${T.metal}"/><rect x="-9" y="18" width="18" height="24" rx="5" fill="${T.orange}"/></g></g>
  ${phone ? `<rect x="868" y="796" width="62" height="14" rx="5" fill="#03080F"/><rect x="872" y="798" width="54" height="6" rx="3" fill="${T.snowLit}" opacity="0.5"/>` : ''}`;
  if (warm > 0) for (let k = 0; k < 3; k++) { const ph = wrap(t * 0.6 + k / 3, 1); s += `<path d="M${n(770 - 150 * ph)} ${n(930 + k * 44 - 20 * ph)} q -20 -12 -40 0 t -40 0" stroke="${T.orangeLight}" stroke-width="7" fill="none" stroke-linecap="round" opacity="${n(0.6 * warm * (1 - ph) * Math.min(1, ph * 5))}"/>`; }
  // Anya on the rear seat
  if (A) {
    const cov = A.cover || 0;
    s += limb([[262, 1024], [352, 1012], [362, 1064]], 42, '#34406B') + `<rect x="338" y="1050" width="54" height="42" rx="15" fill="${T.grey}"/>`
      + `<path d="M222 1040 Q214 900 238 866 Q268 846 300 866 Q324 900 316 1040 Z" fill="${T.coat}"/>`
      + (cov > 0 ? `<g opacity="${n(clamp(cov * 12))}" transform="translate(${n((1 - cov) * 300)} ${n(-70 * Math.sin(cov * Math.PI))})"><path d="M206 1046 Q196 906 226 872 Q268 850 316 872 Q384 950 404 1030 Q402 1062 356 1056 Z" fill="${T.orange}"/><path d="M226 872 Q268 850 316 872 Q300 900 268 896 Q240 898 226 872 Z" fill="${T.orangeDark}"/><path d="M214 960 Q290 946 372 968" stroke="${T.orangeDark}" stroke-width="6" fill="none" opacity="0.7"/></g>` : '')
      + `<g transform="translate(266 794) rotate(${n(A.tilt ?? -13)}) scale(0.5)">${anyaHead({ t, eyes: A.eyes ?? 0, look: A.look || 0, worry: A.worry || 0, mouth: A.mouth || 0, pale: A.pale || 0 })}</g>`;
  }
  // Kostya on the front seat
  if (K) {
    const col = K.jacket === false ? T.sweater : T.orange, dark = K.jacket === false ? T.sweaterLight : T.orangeDark;
    const arm = K.arm === 'key' ? [[632, 838], [716, 934], [792, 934]] : K.arm === 'back' ? [[590, 840], [512, 880], [432, 898]] : [[632, 838], [692, 922], [744, 874]];
    s += limb([[600, 1022], [744, 1006], [808, 1078]], 52, '#1B2A44') + `<rect x="786" y="1062" width="70" height="38" rx="15" fill="${T.tyre}"/>`
      + `<path d="M546 1040 Q536 868 564 812 Q602 782 644 812 Q672 872 656 1040 Z" fill="${col}"/>`
      + `<g transform="translate(602 722) rotate(${n(K.tilt || 0)}) scale(0.58)">${kostyaHead({ t, look: K.look || 0, lookY: K.lookY || 0, eyes: K.eyes ?? 1, sleepy: K.sleepy || 0, worry: K.worry || 0, mouth: K.mouth || 0 })}</g>`
      + limb(arm, 42, dark) + `<circle cx="${arm[2][0]}" cy="${arm[2][1]}" r="18" fill="${T.skin}"/>`;
  }
  return s + inner + `<path d="M876 566 L976 820" stroke="#B9D6F0" stroke-width="10" stroke-linecap="round" opacity="0.35"/></g>`;
};

// the cross-section standing in the ditch: night behind, the cabin, deep snow in front
export const inCar = ({ t = 0, snowTop = 1246, ...o } = {}) => sky({ t, horizon: 690, seed: 4 }) + forest({ y: 690, h: 110, gap: 72, seed: 6, fill: T.far2 }) + snow({ y: 700, fill: T.field, seed: 2, amp: 6, rim: 0.2 })
  + snowfall({ t, count: 26, seed: 2, y1: 1200 }) + cabin({ t, ...o }) + snow({ y: snowTop, fill: T.bank, seed: 3, amp: 16, rim: 0.7 });

// behind a person sitting in the car, seen from the front: seat, headrest, side windows with frost
export const seatBack = ({ t = 0, warm = 0, dome = 0.6, bench = false } = {}) => {
  const wall = mix(mix(T.cabin, '#2A4468', 0.5 * dome), T.cabinWarm, 0.7 * warm), wall2 = mix(mix(T.cabinLight, '#375A86', 0.5 * dome), '#74452A', 0.7 * warm);
  const seatC = mix(T.seat, '#4A2E24', 0.6 * warm), seatL = mix(T.seatLight, '#6B4230', 0.6 * warm);
  const win = (sx) => `<g transform="translate(540 0) scale(${sx} 1)"><path d="M300 380 L560 330 L560 1010 L300 930 Z" fill="#07121F"/><path d="M300 380 L400 362 Q352 420 330 520 L300 560 Z" fill="${T.snow}" opacity="0.22"/><path d="M560 1010 L470 982 Q520 940 560 880 Z" fill="${T.snow}" opacity="0.16"/><path d="M300 380 L560 330 L560 1010 L300 930 Z" fill="none" stroke="${wall2}" stroke-width="14"/></g>`;
  return `<rect x="-300" y="-600" width="${W + 600}" height="${H + 1200}" fill="${wall}"/><rect x="-300" y="-600" width="${W + 600}" height="900" fill="${wall2}" opacity="0.6"/>
  ${win(1)}${win(-1)}<clipPath id="tSide"><path d="M840 380 L1100 330 L1100 1010 L840 930 Z M240 380 L-20 330 L-20 1010 L240 930 Z"/></clipPath><g clip-path="url(#tSide)">${snowfall({ t, count: 22, y0: 330, y1: 1010, seed: 17, opacity: 0.6 })}</g>
  <rect x="470" y="262" width="140" height="24" rx="12" fill="${dome > 0.05 ? '#FFF3C4' : T.metalDark}"/>${dome > 0.05 ? `<polygon points="480,286 600,286 980,1920 100,1920" fill="#FFE9A8" opacity="${n(0.08 * dome)}"/>` : ''}
  ${bench ? `<rect x="-40" y="700" width="1160" height="1300" rx="80" fill="${seatC}"/><rect x="-40" y="700" width="1160" height="44" rx="22" fill="${seatL}"/><rect x="536" y="744" width="8" height="1200" fill="${wall}" opacity="0.6"/>`
    : `<rect x="356" y="330" width="368" height="330" rx="80" fill="${seatL}"/><rect x="230" y="600" width="620" height="1400" rx="110" fill="${seatC}"/><rect x="300" y="700" width="8" height="1200" rx="4" fill="${wall}" opacity="0.5"/><rect x="772" y="700" width="8" height="1200" rx="4" fill="${wall}" opacity="0.5"/>`}`;
};

// ---------- the exhaust ----------
// rear view of the car in the ditch: the right corner with the exhaust pipe is under the drift.
// torch = 0..1 phone light on the drift, seep = 0..1 exhaust creeping out through the snow
export const REAR = { x: 500, y: 1236, s: 1.3, rot: 7, pipe: { x: 748, y: 1118 } };
export const rearScene = ({ t = 0, tail = 1, cabin = 0.5, torch = 1, seep = 1, bury = 1, smoke = 0 } = {}) => {
  const hz = 770, dy = (1 - bury) * 150;
  const d = `M-20 1262 Q200 1248 400 1254 Q540 1250 604 ${n(1150 + dy * 0.6)} Q664 ${n(1030 + dy)} 800 ${n(1018 + dy)} Q960 ${n(1012 + dy)} 1100 1066`;
  let puffs = '';
  if (seep > 0) for (let k = 0; k < 4; k++) { const ph = wrap(t * 0.32 + k / 4, 1); puffs += `<circle cx="${n(770 + 50 * Math.sin(k * 2.4) + 40 * ph)}" cy="${n(1030 - 150 * ph)}" r="${n(22 + 46 * ph)}" fill="${T.snowLit}" opacity="${n(0.2 * seep * (1 - ph) * Math.min(1, ph * 5))}"/>`; }
  return sky({ t, horizon: hz, seed: 7 }) + forest({ y: hz, h: 120, gap: 74, seed: 5, fill: T.far2 }) + forest({ y: hz + 12, h: 80, gap: 48, seed: 12 })
    + snow({ y: hz + 8, fill: T.field, seed: 3, amp: 8, rim: 0.22 }) + snow({ y: 1000, fill: T.field2, seed: 6, amp: 14, rim: 0.4 })
    + suvRear({ ...REAR, tail, cabin, smoke, t })
    + `<clipPath id="tRearDrift"><path d="${d} L1400 1066 L1400 ${H + 600} L-300 ${H + 600} L-300 1262 Z"/></clipPath><path d="${d} L1400 1066 L1400 ${H + 600} L-300 ${H + 600} L-300 1262 Z" fill="${T.bank}"/>`
    + (torch > 0 ? `<g clip-path="url(#tRearDrift)"><ellipse cx="770" cy="1120" rx="300" ry="170" fill="${T.torch}" opacity="${n(0.16 * torch)}"/><ellipse cx="770" cy="1110" rx="170" ry="92" fill="${T.torch}" opacity="${n(0.2 * torch)}"/></g>` : '')
    + `<path d="${d}" fill="none" stroke="${T.rim}" stroke-width="6" stroke-linecap="round" opacity="0.75"/>` + puffs
    + drift({ t, y: 1330, opacity: 0.16 }) + snowfall({ t, seed: 5 });
};

// close-up: the pipe under the bumper. bury 1 = the end is deep in the drift, 0 = dug out; smoke 0..1 free exhaust
export const pipeClose = ({ t = 0, bury = 1, torch = 1, smoke = 0, seep = 1 } = {}) => {
  const b = clamp(bury), top = (v0, v1) => n(lerp(v1, v0, b));
  const d = `M-20 ${top(1120, 1190)} Q190 ${top(1100, 1180)} 330 ${top(1000, 1164)} Q430 ${top(840, 1150)} 610 ${top(800, 1140)} Q840 ${top(772, 1128)} 1100 ${top(842, 1150)}`;
  let puffs = '';
  if (seep > 0 && b > 0.4) for (let k = 0; k < 5; k++) { const ph = wrap(t * 0.3 + k / 5, 1); puffs += `<circle cx="${n(540 + 120 * Math.sin(k * 2.2) + 30 * ph)}" cy="${n(820 - 230 * ph)}" r="${n(30 + 76 * ph)}" fill="${T.snowLit}" opacity="${n(0.2 * seep * (1 - ph) * Math.min(1, ph * 5))}"/>`; }
  if (smoke > 0) for (let k = 0; k < 6; k++) { const ph = wrap(t * 0.5 + k / 6, 1); puffs += `<circle cx="${n(700 + 300 * ph)}" cy="${n(936 - 170 * ph * ph + 16 * Math.sin(k * 3 + t * 2))}" r="${n(34 + 96 * ph)}" fill="${T.snowLit}" opacity="${n(0.32 * smoke * (1 - ph) * Math.min(1, ph * 6))}"/>`; }
  const hidden = b > 0.4 ? `<ellipse cx="720" cy="940" rx="${n(120 + 10 * Math.sin(t * 2))}" ry="${n(86 + 8 * Math.sin(t * 2.6))}" fill="#132A47" opacity="${n(0.55 * b)}"/><ellipse cx="800" cy="900" rx="70" ry="52" fill="#132A47" opacity="${n(0.4 * b)}"/>
  <rect x="384" y="884" width="296" height="106" rx="26" fill="none" stroke="${T.snow}" stroke-width="5" stroke-dasharray="20 14" opacity="${n(0.6 * b)}"/><ellipse cx="672" cy="937" rx="22" ry="50" fill="none" stroke="${T.snow}" stroke-width="5" stroke-dasharray="12 10" opacity="${n(0.6 * b)}"/>` : '';
  return `<rect x="-300" y="-600" width="${W + 600}" height="${H + 1200}" fill="#081626"/>
  <rect x="640" y="760" width="300" height="520" rx="70" fill="${T.tyre}"/><rect x="700" y="760" width="26" height="520" fill="#141F30"/><rect x="800" y="760" width="26" height="520" fill="#141F30"/>
  <path d="M-20 250 L800 250 Q880 250 880 330 L880 640 L-20 640 Z" fill="${T.car}"/><rect x="-20" y="560" width="900" height="80" fill="${T.carDark}"/>
  <rect x="640" y="310" width="180" height="230" rx="36" fill="${T.red}"/><rect x="664" y="334" width="132" height="60" rx="18" fill="#FF7A66" opacity="0.6"/><circle cx="730" cy="424" r="190" fill="${T.red}" opacity="0.09"/>
  <rect x="-20" y="640" width="960" height="150" rx="44" fill="${T.trim}"/><rect x="-20" y="640" width="960" height="26" fill="#1F3350"/>
  <rect x="150" y="790" width="60" height="100" fill="${T.metalDark}"/>
  <rect x="120" y="884" width="560" height="106" rx="26" fill="${T.metal}"/><rect x="120" y="898" width="560" height="20" fill="${T.snow}" opacity="0.4"/><rect x="120" y="958" width="560" height="32" rx="14" fill="${T.metalDark}" opacity="0.7"/>
  <rect x="560" y="876" width="34" height="122" rx="12" fill="${T.metalDark}"/><ellipse cx="672" cy="937" rx="22" ry="50" fill="#04090F"/><ellipse cx="672" cy="937" rx="22" ry="50" fill="none" stroke="${T.metalDark}" stroke-width="7"/>
  <clipPath id="tPipeDrift"><path d="${d} L1400 1150 L1400 ${H + 600} L-300 ${H + 600} L-300 1120 Z"/></clipPath><path d="${d} L1400 1150 L1400 ${H + 600} L-300 ${H + 600} L-300 1120 Z" fill="${T.bank}"/>
  <g clip-path="url(#tPipeDrift)">${torch > 0 ? `<ellipse cx="540" cy="930" rx="470" ry="330" fill="${T.torch}" opacity="${n(0.14 * torch)}"/><ellipse cx="540" cy="930" rx="300" ry="200" fill="${T.torch}" opacity="${n(0.16 * torch)}"/>` : ''}${hidden}</g>
  <path d="${d}" fill="none" stroke="${T.rim}" stroke-width="7" stroke-linecap="round" opacity="0.85"/>${puffs}${snowfall({ t, count: 26, seed: 9, size: 1.5 })}`;
};

// ---------- effects ----------
// snow thrown back by a spinning wheel; on = 0..1
export const spray = ({ x, y, t = 0, on = 1, dir = -1, s = 1 }) => {
  let o = '';
  if (on <= 0) return o;
  for (let i = 0; i < 18; i++) {
    const ph = wrap(t * 2.2 + rnd(i * 3.3), 1), vx = (120 + 190 * rnd(i * 5.1)) * s, vy = (150 + 150 * rnd(i * 7.7)) * s;
    o += `<circle cx="${n(x + dir * vx * ph)}" cy="${n(y - vy * ph + 330 * s * ph * ph)}" r="${n((7 + 10 * rnd(i)) * s * (1 - 0.5 * ph))}" fill="${T.snow}" opacity="${n(0.9 * on * (1 - ph))}"/>`;
  }
  return o;
};

// cloud of snow thrown up by an impact; age = seconds since the hit
export const burst = ({ x, y, age, s = 1 }) => {
  if (age < 0 || age > 1.6) return '';
  let o = '';
  const e = easeOut(clamp(age / 1.1));
  for (let i = 0; i < 22; i++) {
    const a = -Math.PI * (0.08 + 0.84 * rnd(i * 2.9)), d = (90 + 260 * rnd(i * 4.3)) * e * s;
    o += `<circle cx="${n(x + Math.cos(a) * d)}" cy="${n(y + Math.sin(a) * d * 0.8 + 130 * age * age)}" r="${n((16 + 30 * rnd(i * 6.1)) * s * (0.6 + 0.4 * e))}" fill="${i % 3 ? T.snow : T.snowLit}" opacity="${n(0.95 * (1 - clamp(age / 1.6)))}"/>`;
  }
  return o;
};

// the invisible made visible: a dotted line creeps along the points (k = 0..1 how far it has got), puffs travel along it
export const flow = ({ pts, t = 0, k = 1, count = 6, speed = 0.2, col = T.orange, r = 16, seed = 0, head = true }) => {
  if (k <= 0.01) return '';
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const tot = L[L.length - 1];
  const at = (u) => { const d = clamp(u) * tot; let i = 1; while (i < pts.length - 1 && L[i] < d) i++; const q = (d - L[i - 1]) / (L[i] - L[i - 1] || 1); return [lerp(pts[i - 1][0], pts[i][0], q), lerp(pts[i - 1][1], pts[i][1], q)]; };
  const P = Array.from({ length: 33 }, (_, j) => at((j / 32) * k)), [hx, hy] = at(k), [px, py] = at(k - 0.03), ang = (Math.atan2(hy - py, hx - px) * 180) / Math.PI;
  let o = `<polyline points="${P.map(([x, y]) => `${n(x)},${n(y)}`).join(' ')}" fill="none" stroke="${col}" stroke-width="9" stroke-dasharray="2 24" stroke-dashoffset="${n(-t * 70)}" stroke-linecap="round"/>`;
  for (let i = 0; i < count; i++) { const u = wrap(t * speed + i / count + seed, 1), [x, y] = at(u * k); o += `<circle cx="${n(x + 9 * Math.sin(i * 2.7 + t))}" cy="${n(y + 7 * Math.cos(i * 1.9 + t))}" r="${n(r * (0.8 + 0.9 * u))}" fill="#C7D5E4" opacity="${n(0.3 * (1 - 0.6 * u))}"/>`; }
  if (head) o += `<path d="M-26 -18 L8 0 L-26 18 Z" fill="${col}" transform="translate(${n(hx)} ${n(hy)}) rotate(${n(ang)})"/>`;
  return o;
};

// ---------- brand: captions, end card, cover ----------
// warning triangle with a question mark, as on the account avatar
export const logo = (x, y, r) => `<path d="M${n(x)} ${n(y - r)} L${n(x + r * 1.02)} ${n(y + r * 0.74)} L${n(x - r * 1.02)} ${n(y + r * 0.74)} Z" fill="${T.night}" stroke="${T.orange}" stroke-width="${n(r * 0.15)}" stroke-linejoin="round"/>${txt(x, y + r * 0.56, '?', { size: n(r * 1.12), fill: T.orange })}`;

export const endCard = ({ p, title = 'ТЫ БЫ ВЫЖИЛ?', line = 'СЕРИЯ 2 — ЗАВТРА', sub = 'подпишись, чтобы не пропустить' }) => {
  const a = easeOut(clamp(p / 0.18)), b = easeOut(seg(p, 0.12, 0.34)), lw = Math.max(780, textW(line, 68) + 110);
  return `<rect width="${W}" height="${H}" fill="${T.night}"/>
  <path d="M250 1920 L420 1560 L660 1560 L830 1920 Z" fill="#16304F"/><rect x="532" y="1600" width="16" height="70" fill="${T.snow}" opacity="0.8"/><rect x="530" y="1740" width="20" height="120" fill="${T.snow}" opacity="0.8"/>
  <g opacity="${n(a)}" transform="translate(0 ${n((1 - a) * 30)})">${logo(540, 690, 170)}
  ${txt(540, 990, title, { size: 96, ls: 2, fill: T.snow })}</g>
  <g opacity="${n(b)}" transform="translate(0 ${n((1 - b) * 30)})">
  <rect x="${n(540 - lw / 2)}" y="1064" width="${n(lw)}" height="130" rx="22" fill="${T.orange}"/>${txt(540, 1153, line, { size: 68, fill: T.night })}
  ${txt(540, 1284, sub, { size: 40, weight: 600, fill: T.label })}</g>`;
};

// cover for the profile grid: same composition as the pilot's cover, in this palette
export const cover = ({ ep = 1, title, hook, art = '' }) => {
  const size = Math.min(124, ...title.map((ln) => (940 / textW(ln, 124, 1)) * 124)), lh = size * 1.1, y0 = 1296 + (size - 124) * 0.4;
  const ry = y0 + (title.length - 1) * lh + 76, hs = Math.min(58, (860 / textW(hook, 58)) * 58);
  return `<rect width="${W}" height="${H}" fill="${T.night}"/>${art}
  <rect x="0" y="1150" width="${W}" height="770" fill="${T.night}" opacity="0.88"/><rect x="0" y="1150" width="${W}" height="8" fill="${T.orange}"/>
  <rect x="730" y="300" width="290" height="96" rx="20" fill="${T.orange}"/>${txt(875, 368, `СЕРИЯ ${ep}`, { size: 52, fill: T.night })}
  ${title.map((ln, i) => txt(540, y0 + i * lh, ln, { size: n(size), ls: 1, fill: T.snow })).join('')}
  <rect x="80" y="${n(ry)}" width="920" height="118" rx="20" fill="#1B3A5E"/>${txt(540, ry + 59 + hs * 0.36, hook, { size: n(hs), fill: T.yellow })}`;
};

// per-episode theme (see kit/stage.html): caption colours and the brand overlays of this account
export const theme = { caption: { hi: T.orange, stroke: T.void }, endCard, cover };

// ---------- information cards (episodes 2+) ----------
const ICON2 = {
  nocolor: (c) => `<path d="M3 28 Q28 4 53 28 Q28 52 3 28 Z" fill="none" stroke="${c}" stroke-width="5" stroke-linejoin="round"/><circle cx="28" cy="28" r="9" fill="${c}"/><path d="M8 50 L48 6" stroke="${T.orange}" stroke-width="7" stroke-linecap="round"/>`,
  nosmell: (c) => [14, 28, 42].map((x) => `<path d="M${x} 50 q -8 -11 0 -22 q 8 -11 0 -22" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('') + `<path d="M6 48 L50 8" stroke="${T.orange}" stroke-width="7" stroke-linecap="round"/>`,
  head: (c) => `<path d="M17 2 L39 2 L46 20 L10 20 Z" fill="${T.orange}"/><circle cx="28" cy="39" r="15" fill="none" stroke="${c}" stroke-width="5"/><path d="M20 39 L24 39 M32 39 L36 39" stroke="${c}" stroke-width="4.5" stroke-linecap="round"/>`,
  sleep: (c) => `<path d="M6 12 L32 12 L6 42 L32 42" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M38 28 L52 28 L38 46 L52 46" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  sick: (c) => `<circle cx="28" cy="28" r="24" fill="none" stroke="${c}" stroke-width="5"/><circle cx="19" cy="22" r="3.6" fill="${c}"/><circle cx="37" cy="22" r="3.6" fill="${c}"/><path d="M15 39 q 4.5 -7 9 0 t 9 0 t 9 0" stroke="${c}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  air: (c) => `<path d="M4 18 L34 18 Q46 18 46 9 Q46 2 38 3" stroke="${c}" stroke-width="5.5" fill="none" stroke-linecap="round"/><path d="M4 30 L50 30" stroke="${c}" stroke-width="5.5" stroke-linecap="round"/><path d="M4 42 L30 42 Q41 42 41 50 Q41 56 34 55" stroke="${c}" stroke-width="5.5" fill="none" stroke-linecap="round"/>`,
  ten: (c) => `<circle cx="28" cy="28" r="24" fill="none" stroke="${c}" stroke-width="5"/><path d="M28 28 L28 4 A24 24 0 0 1 48.8 16 Z" fill="${T.orange}"/><circle cx="28" cy="28" r="4" fill="${c}"/>`,
  window: (c) => `<path d="M6 52 L6 16 Q6 6 16 6 L50 6 L50 52 Z" fill="none" stroke="${c}" stroke-width="5" stroke-linejoin="round"/><rect x="6" y="18" width="44" height="5" fill="${c}"/><path d="M20 12 L36 12" stroke="${T.orange}" stroke-width="6" stroke-linecap="round"/>`,
  pipe: (c) => `<rect x="2" y="20" width="38" height="16" rx="5" fill="${c}"/><ellipse cx="40" cy="28" rx="5" ry="8" fill="${T.panel}" stroke="${c}" stroke-width="3"/><path d="M46 44 Q54 34 50 22 M40 50 Q50 46 54 38" stroke="${T.orange}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  seat: (c) => `<path d="M14 6 L22 6 L26 34 L46 34 Q52 34 52 40 L52 46 L14 46 Z" fill="${c}"/><rect x="18" y="46" width="6" height="8" fill="${c}"/><rect x="42" y="46" width="6" height="8" fill="${c}"/>`,
  mat: (c) => `<rect x="6" y="8" width="44" height="40" rx="6" fill="none" stroke="${c}" stroke-width="5"/><path d="M6 20 L50 20 M6 32 L50 32 M6 44 L50 44" stroke="${c}" stroke-width="4" opacity="0.6"/>`,
  plug: (c) => `<path d="M8 10 L8 46 M48 10 L48 46" stroke="${c}" stroke-width="5" stroke-linecap="round"/><path d="M14 20 q 7 -8 14 0 t 14 0 M14 36 q 7 -8 14 0 t 14 0" stroke="${T.orange}" stroke-width="6" fill="none" stroke-linecap="round"/>`,
  flame: (c) => `<path d="M28 4 Q46 24 42 38 Q39 54 28 54 Q17 54 14 38 Q10 24 28 4 Z" fill="${c}"/><path d="M28 28 Q36 38 33 46 Q31 51 28 51 Q25 51 23 46 Q20 38 28 28 Z" fill="${T.panel}" opacity="0.55"/>`,
  battery: (c) => `<rect x="4" y="16" width="48" height="32" rx="5" fill="none" stroke="${c}" stroke-width="5"/><rect x="11" y="8" width="10" height="8" fill="${c}"/><rect x="35" y="8" width="10" height="8" fill="${c}"/><path d="M11 32 L21 32 M35 32 L45 32 M40 27 L40 37" stroke="${c}" stroke-width="4.5" stroke-linecap="round"/>`,
  snowflake: (c) => [0, 60, 120].map((a) => `<path d="M28 4 L28 52 M28 12 L21 6 M28 12 L35 6 M28 44 L21 50 M28 44 L35 50" stroke="${c}" stroke-width="4.5" fill="none" stroke-linecap="round" transform="rotate(${a} 28 28)"/>`).join(''),
};
Object.assign(ICON, ICON2);
export const icon = (name, c = T.snow, x = 0, y = 0, s = 1) => `<g transform="translate(${n(x)} ${n(y)}) scale(${s})">${ICON[name](c)}</g>`;

// card with an orange header and rows that come in one by one.
// rows: [{ icon, text, sub, tone: 'orange' | 'yellow' }], reveal[i] = 0..1; (540, y) = middle of the top edge
export const card = ({ y = 300, w = 900, head, icon: hi = 'warn', rows = [], reveal = [], rowH = 150, size = 52, pop = 1 }) => {
  if (pop <= 0) return '';
  const x = 540 - w / 2, h = 112 + rows.length * rowH + 24, a = easeOut(clamp(pop));
  let s = `<g transform="translate(0 ${n((1 - a) * 500)})"><rect x="${x + 10}" y="${y + 14}" width="${w}" height="${h}" rx="30" fill="#000" opacity="0.28"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="30" fill="${T.panel}" stroke="${T.panelEdge}" stroke-width="5"/>
  <path d="M${x} ${y + 112} L${x} ${y + 30} Q${x} ${y} ${x + 30} ${y} L${x + w - 30} ${y} Q${x + w} ${y} ${x + w} ${y + 30} L${x + w} ${y + 112} Z" fill="${T.orange}"/>
  ${icon(hi, T.night, x + 40, y + 22, 1.22)}${txt(x + 134, y + 78, head, { size: Math.min(62, ((w - 190) / textW(head, 62, 2)) * 62), fill: T.night, anchor: 'start', ls: 2 })}`;
  rows.forEach((r, i) => {
    const k = clamp(reveal[i] ?? 1);
    if (k <= 0) return;
    const ry = y + 112 + i * rowH, cy = ry + rowH / 2 + 4, col = r.tone === 'orange' ? T.orange : r.tone === 'yellow' ? T.yellow : T.snow;
    const fs = Math.min(size, ((w - 210) / textW(r.text, size, 1)) * size);
    s += `<g opacity="${n(clamp(k * 2.5))}" transform="translate(${n((1 - easeOut(k)) * 50)} 0)">
    <circle cx="${x + 88}" cy="${cy}" r="48" fill="${T.cabinLight}"/>${icon(r.icon, col, x + 60, cy - 28)}
    ${txt(x + 164, cy + (r.sub ? -6 : fs * 0.35), r.text, { size: n(fs), fill: col, anchor: 'start', ls: 1 })}
    ${r.sub ? txt(x + 164, cy + 40, r.sub, { size: 34, weight: 600, fill: T.label, anchor: 'start' }) : ''}
    ${i < rows.length - 1 ? `<rect x="${x + 36}" y="${ry + rowH - 2}" width="${w - 72}" height="3" fill="${T.panelEdge}" opacity="0.7"/>` : ''}</g>`;
  });
  return s + '</g>';
};

// ---------- the ignition (episodes 2+) ----------
// close-up of the lock and the warning lamps. turn 0..1 = key from «0» to «старт», lamps 0..1 = how bright the panel is
export const ignition = ({ t = 0, turn = 0, lamps = 1 } = {}) => {
  const a = lerp(-36, 66, turn);
  const lamp = (x, y, name, col) => `<rect x="${x - 66}" y="${y - 48}" width="132" height="96" rx="20" fill="#060F1B"/><g opacity="${n(0.1 + 0.9 * lamps)}"><rect x="${x - 66}" y="${y - 48}" width="132" height="96" rx="20" fill="${col}" opacity="0.18"/>${icon(name, col, x - 34, y - 34, 1.2)}</g>`;
  const dial = (cx, k) => {
    let tk = '';
    for (let i = 0; i <= 8; i++) { const an = ((-220 + i * 32.5) * Math.PI) / 180; tk += `<line x1="${n(cx + Math.cos(an) * 108)}" y1="${n(510 + Math.sin(an) * 108)}" x2="${n(cx + Math.cos(an) * 128)}" y2="${n(510 + Math.sin(an) * 128)}" stroke="${mix('#2A4467', T.snow, 0.75 * lamps)}" stroke-width="7" stroke-linecap="round"/>`; }
    const an = ((-220 + k * 260) * Math.PI) / 180;
    return `<circle cx="${cx}" cy="510" r="150" fill="#071220" stroke="#27466B" stroke-width="6"/><circle cx="${cx}" cy="510" r="150" fill="${T.orange}" opacity="${n(0.07 * lamps)}"/>${tk}
    <line x1="${cx}" y1="510" x2="${n(cx + Math.cos(an) * 104)}" y2="${n(510 + Math.sin(an) * 104)}" stroke="${mix('#5A2A1E', T.orange, lamps)}" stroke-width="9" stroke-linecap="round"/><circle cx="${cx}" cy="510" r="16" fill="#1B3050"/>`;
  };
  const mark = (deg, label, r = 232) => { const an = ((deg - 90) * Math.PI) / 180; return txt(540 + Math.cos(an) * r, 1096 + Math.sin(an) * r, label, { size: label.length > 2 ? 36 : 44, fill: T.label }); };
  return `<rect x="-300" y="-600" width="${W + 600}" height="${H + 1200}" fill="#0A1626"/>
  <rect x="80" y="300" width="920" height="420" rx="70" fill="#0E1F37" stroke="#21395A" stroke-width="6"/>${dial(280, 0)}${dial(800, 0.04)}
  ${lamp(540, 396, 'battery', T.red)}${lamp(540, 510, 'engine', T.orange)}${lamp(540, 624, 'fuel', T.yellow)}
  <path d="M290 800 L790 800 Q850 800 850 860 L850 2600 L230 2600 L230 860 Q230 800 290 800 Z" fill="#12233D"/><rect x="230" y="800" width="620" height="16" rx="8" fill="#1B3252"/>
  <circle cx="540" cy="1080" r="156" fill="#1B3050"/><circle cx="540" cy="1080" r="116" fill="${T.metalDark}"/><circle cx="540" cy="1080" r="92" fill="#16263F"/>
  ${mark(-36, '0')}${mark(-2, 'I')}${mark(32, 'II')}${mark(96, 'СТАРТ', 300)}
  <g transform="translate(540 1080) rotate(${n(a)})"><rect x="-13" y="-70" width="26" height="140" rx="10" fill="${T.metal}"/>
  <path d="M-50 -250 Q-50 -286 -14 -286 L14 -286 Q50 -286 50 -250 L50 -96 Q50 -60 14 -60 L-14 -60 Q-50 -60 -50 -96 Z" fill="${T.tyre}"/><rect x="-30" y="-262" width="60" height="150" rx="22" fill="#1A2942"/><circle cx="0" cy="-236" r="13" fill="#0A1626"/>
  <g transform="translate(0 -236) rotate(${n(-a + Math.sin(t * 3.2) * (4 + 14 * turn))})"><circle cx="0" cy="26" r="26" fill="none" stroke="${T.metal}" stroke-width="7"/><rect x="-4" y="48" width="8" height="44" fill="${T.metal}"/><rect x="-30" y="88" width="60" height="96" rx="14" fill="${T.orange}"/><rect x="-16" y="104" width="32" height="8" rx="4" fill="${T.orangeDark}"/></g></g>`;
};

// mitten; (x, y) = middle of the cuff, it points up
export const mitt = ({ x, y, s = 1, rot = 0, col = T.red, dark = T.redDark }) => `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)}) scale(${s})"><rect x="-44" y="-150" width="88" height="160" rx="42" fill="${col}"/><rect x="34" y="-92" width="44" height="72" rx="22" transform="rotate(24 40 -60)" fill="${col}"/><rect x="-50" y="-22" width="100" height="40" rx="14" fill="${dark}"/></g>`;
