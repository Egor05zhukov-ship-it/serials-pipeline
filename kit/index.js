// Drawing kit: palette, motion helpers, props, characters, overlays.
// Pure JS (no Node or DOM APIs) so episodes import it in Node and in the browser.
// Every function returns an SVG string for a 1080x1920 stage.

export const W = 1080, H = 1920;

export const C = {
  void: '#05080F', night: '#0B1220', wall: '#141F36', wall2: '#1F2E4E', floor: '#0E1729',
  counterTop: '#2C4068', counterFront: '#1C2A49', glass: '#0A1324', glassEdge: '#3B5078',
  mint: '#DFF8EC', mintDim: '#9FD9C3', red: '#FF4338', redDark: '#B3261E', warm: '#FF8A3D',
  card: '#C9995F', cardDark: '#A77B46', cardLight: '#DDB37A', tape: '#EAD9B0',
  paper: '#F4ECD6', ink: '#1B2740', white: '#FFFFFF',
  skin: '#F0C6A2', skinShade: '#D9A982', hair: '#232A3B', vest: '#2F8F7D', vestDark: '#236E60',
  hood: '#2B3856', hoodDark: '#1B2439', pale: '#B9C6DD', paleShade: '#93A3C2',
};

// ---------- motion helpers ----------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, p) => a + (b - a) * p;
export const seg = (p, a, b) => clamp((p - a) / (b - a));
export const easeOut = (p) => 1 - Math.pow(1 - p, 3);
export const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
export const rnd = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
// fluorescent lamp: mostly steady, short dips
export const flicker = (t, seed = 0) => { const r = rnd(Math.floor(t * 12) + seed * 17); return r > 0.94 ? 0.55 : r > 0.89 ? 0.82 : 1; };
export const blink = (t, seed = 0) => (((t + 1.7 + seed * 1.3) % (3.4 + seed)) < 0.12 ? 0.12 : 1); // eyes open on the first frame
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const n = (x) => Math.round(x * 100) / 100;

// camera: scale around a focus point, optional shift
export const cam = (inner, { s = 1, x = 0, y = 0, cx = W / 2, cy = H / 2 } = {}) =>
  `<g transform="translate(${n(cx + x)} ${n(cy + y)}) scale(${n(s)}) translate(${-cx} ${-cy})">${inner}</g>`;

const txt = (x, y, str, { size = 40, weight = 800, fill = C.white, anchor = 'middle', ls = 0, extra = '' } = {}) =>
  `<text x="${n(x)}" y="${n(y)}" text-anchor="${anchor}" font-family="Mont" font-weight="${weight}" font-size="${size}" letter-spacing="${ls}" fill="${fill}" ${extra}>${esc(str)}</text>`;
export { txt };

// ---------- room ----------
export const lamp = ({ x = 540, y = 170, w = 460, f = 1, floorY = 1560 } = {}) => `
  <polygon points="${x - w / 2},${y + 20} ${x + w / 2},${y + 20} ${x + w / 2 + 340},${floorY} ${x - w / 2 - 340},${floorY}" fill="${C.mint}" opacity="${n(0.075 * f)}"/>
  <rect x="${x - w / 2 - 24}" y="${y - 22}" width="${w + 48}" height="18" rx="6" fill="${C.wall2}"/>
  <rect x="${x - w / 2 - 20}" y="${y - 8}" width="${w + 40}" height="38" rx="19" fill="${C.mint}" opacity="${n(0.12 * f)}"/>
  <rect x="${x - w / 2}" y="${y}" width="${w}" height="22" rx="11" fill="${C.mint}" opacity="${n(0.35 + 0.65 * f)}"/>`;

export const room = ({ t = 0, floorY = 1560 } = {}) => `
  <rect width="${W}" height="${H}" fill="${C.wall}"/>
  <rect y="${floorY}" width="${W}" height="${H - floorY}" fill="${C.floor}"/>
  <rect y="${floorY - 8}" width="${W}" height="10" fill="${C.wall2}"/>
  ${lamp({ f: flicker(t), floorY })}`;

export const box = ({ x, y, w, h, tone = 0 }) => {
  const fill = [C.card, C.cardLight, C.cardDark][tone % 3];
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="5" fill="${fill}"/>
  <rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h * 0.15)}" rx="5" fill="#000" opacity="0.12"/>
  <rect x="${n(x + w * 0.43)}" y="${n(y)}" width="${n(w * 0.14)}" height="${n(h)}" fill="${C.tape}" opacity="0.8"/>
  <rect x="${n(x + w * 0.1)}" y="${n(y + h * 0.5)}" width="${n(w * 0.26)}" height="${n(h * 0.26)}" rx="3" fill="${C.paper}" opacity="0.85"/>`;
};

export const shelves = ({ x = 90, y = 420, w = 900, rows = 3, rowH = 210, emptyRow = -1, seed = 1, dim = 1 } = {}) => {
  let s = `<g opacity="${dim}">`;
  for (let r = 0; r < rows; r++) {
    const yy = y + r * rowH;
    if (r !== emptyRow) {
      let cx = x + 22, i = 0;
      for (;;) {
        const bw = 120 + Math.floor(rnd(seed + r * 13 + i) * 120), bh = 80 + Math.floor(rnd(seed + r * 7 + i * 3) * (rowH - 130));
        if (cx + bw > x + w - 16) break;
        s += box({ x: cx, y: yy + rowH - 18 - bh, w: bw, h: bh, tone: Math.floor(rnd(seed + r + i * 5) * 3) });
        cx += bw + 16; i++;
      }
    }
    s += `<rect x="${x}" y="${yy + rowH - 18}" width="${w}" height="18" fill="${C.wall2}"/>`;
  }
  s += `<rect x="${x - 14}" y="${y - 10}" width="14" height="${rows * rowH + 10}" fill="${C.wall2}"/><rect x="${x + w}" y="${y - 10}" width="14" height="${rows * rowH + 10}" fill="${C.wall2}"/>`;
  return s + '</g>';
};

export const counter = ({ y = 1180, sign = true } = {}) => `
  <rect x="0" y="${y}" width="${W}" height="46" fill="${C.counterTop}"/>
  <rect x="0" y="${y + 46}" width="${W}" height="${H - y}" fill="${C.counterFront}"/>
  <rect x="0" y="${y + 46}" width="${W}" height="12" fill="#000" opacity="0.2"/>
  ${sign ? `<rect x="380" y="${y + 300}" width="320" height="76" rx="14" fill="${C.wall}"/>${txt(540, y + 352, 'ВЫДАЧА', { size: 36, fill: C.mintDim, ls: 6 })}` : ''}`; // sign sits below the caption zone

// address sticker: "КОМУ: АРТЁМ К." + barcode
export const sticker = ({ x, y, w, h, name = 'АРТЁМ К.' }) => {
  let bars = '';
  for (let i = 0; i < 14; i++) bars += `<rect x="${n(x + w * 0.08 + i * w * 0.06)}" y="${n(y + h * 0.72)}" width="${n(w * (rnd(i) > 0.5 ? 0.035 : 0.018))}" height="${n(h * 0.18)}" fill="${C.ink}"/>`;
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(h * 0.06)}" fill="${C.paper}"/>
  ${txt(x + w * 0.08, y + h * 0.26, 'КОМУ:', { size: n(h * 0.17), weight: 600, fill: C.ink, anchor: 'start' })}
  ${txt(x + w * 0.08, y + h * 0.56, name, { size: n(Math.min(h * 0.27, w * 0.135)), fill: C.red, anchor: 'start' })}${bars}`;
};

// the hero's parcel: big cardboard box with the sticker; warm = 0..1 adds heat
export const heroBox = ({ x, y, w, h, t = 0, warm = 0 }) => {
  let heat = '';
  if (warm > 0) for (let k = 0; k < 3; k++) {
    const hx = x + w * (0.25 + k * 0.25), ph = t * 2.2 + k * 1.7, a = 16 * Math.sin(ph), rise = (t * 26 + k * 20) % 40;
    heat += `<path d="M${n(hx)} ${n(y - 26 - rise)} q ${n(a)} -34 0 -68 q ${n(-a)} -34 0 -68" stroke="${C.warm}" stroke-width="8" fill="none" stroke-linecap="round" opacity="${n(0.75 * warm * (1 - rise / 60))}"/>`;
  }
  return `<ellipse cx="${n(x + w / 2)}" cy="${n(y + h / 2)}" rx="${n(w * 0.8)}" ry="${n(h * 0.85)}" fill="${C.warm}" opacity="${n(0.13 * warm)}"/>
  <rect x="${n(x)}" y="${n(y)}" width="${w}" height="${h}" rx="8" fill="${C.card}"/>
  <rect x="${n(x)}" y="${n(y)}" width="${w}" height="${n(h * 0.14)}" rx="8" fill="${C.cardDark}" opacity="0.6"/>
  <rect x="${n(x + w * 0.62)}" y="${n(y)}" width="${n(w * 0.12)}" height="${h}" fill="${C.tape}"/>
  <rect x="${n(x)}" y="${n(y + h - 12)}" width="${w}" height="12" fill="#000" opacity="0.16"/>
  ${sticker({ x: x + w * 0.06, y: y + h * 0.3, w: w * 0.5, h: h * 0.5 })}${heat}`;
};

// ---------- characters ----------
// hero: (x, y) is the centre of the head
export const person = ({ x, y, s = 1, t = 0, look = 0, lookY = 0, worry = 0, seed = 0 }) => {
  const b = blink(t, seed), bob = Math.sin(t * 1.5 + seed) * 4;
  const ex = look * 16, ey = lookY * 12;
  return `<g transform="translate(${n(x)} ${n(y + bob)}) scale(${s})">
  <path d="M-170 460 Q-172 170 -84 132 L84 132 Q172 170 170 460 Z" fill="${C.hair}"/>
  <path d="M-128 460 L-108 164 Q-70 136 -46 136 L-20 262 L20 262 L46 136 Q70 136 108 164 L128 460 Z" fill="${C.vest}"/>
  <rect x="-6" y="262" width="12" height="198" fill="${C.vestDark}"/>
  <rect x="48" y="214" width="62" height="40" rx="7" fill="${C.paper}"/><rect x="56" y="224" width="46" height="7" rx="3" fill="${C.red}"/><rect x="56" y="238" width="30" height="6" rx="3" fill="${C.ink}" opacity="0.5"/>
  <rect x="-30" y="80" width="60" height="70" rx="24" fill="${C.skinShade}"/>
  <circle cx="0" cy="0" r="108" fill="${C.skin}"/>
  <path d="M-108 -4 Q-114 -118 0 -118 Q114 -118 108 -4 Q78 -62 0 -58 Q-78 -62 -108 -4 Z" fill="${C.hair}"/>
  <ellipse cx="${n(-38 + ex)}" cy="${n(10 + ey)}" rx="12" ry="${n(14 * b)}" fill="${C.ink}"/>
  <ellipse cx="${n(38 + ex)}" cy="${n(10 + ey)}" rx="12" ry="${n(14 * b)}" fill="${C.ink}"/>
  <path d="M-60 ${n(-26 + worry * 9)} L-20 ${n(-26 - worry * 11)}" stroke="${C.hair}" stroke-width="9" stroke-linecap="round"/>
  <path d="M60 ${n(-26 + worry * 9)} L20 ${n(-26 - worry * 11)}" stroke="${C.hair}" stroke-width="9" stroke-linecap="round"/>
  <path d="M-18 56 Q0 ${n(62 - worry * 14)} 18 56" stroke="${C.ink}" stroke-width="8" fill="none" stroke-linecap="round"/>
  </g>`;
};

// the visitor: hood, no face; (x, y) is the centre of the dark face opening
export const hooded = ({ x, y, s = 1, smile = 0, tilt = 0, opacity = 1 }) => `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(tilt)}) scale(${s})" opacity="${n(opacity)}">
  <path d="M-250 560 Q-262 230 -160 160 L160 160 Q262 230 250 560 Z" fill="${C.hoodDark}"/>
  <path d="M0 -200 Q-182 -190 -176 30 Q-170 170 -96 200 L96 200 Q170 170 176 30 Q182 -190 0 -200 Z" fill="${C.hood}"/>
  <path d="M0 -126 Q-118 -118 -114 30 Q-110 138 0 148 Q110 138 114 30 Q118 -118 0 -126 Z" fill="${C.void}"/>
  ${smile > 0.02 ? `<path d="M${n(-66 * smile)} 62 Q0 ${n(62 + 54 * smile)} ${n(66 * smile)} 62 Q0 ${n(62 + 20 * smile)} ${n(-66 * smile)} 62 Z" fill="${C.mint}" opacity="${n(clamp(smile * 3))}"/>` : ''}
  </g>`;

// staff badge: white card, red stripe
export const badge = ({ x, y, w = 200, name = 'ВЕРА', rot = 0, glow = 0 }) => {
  const h = w * 0.68;
  return `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)})">
  ${glow > 0 ? `<rect x="${-w / 2 - 14}" y="-14" width="${w + 28}" height="${h + 28}" rx="${w * 0.1}" fill="${C.red}" opacity="${n(0.35 * glow)}"/>` : ''}
  <rect x="${-w / 2}" y="0" width="${w}" height="${n(h)}" rx="${n(w * 0.06)}" fill="${C.paper}"/>
  <rect x="${-w / 2}" y="0" width="${w}" height="${n(h * 0.22)}" rx="${n(w * 0.06)}" fill="${C.red}"/>
  ${txt(0, h * 0.62, name, { size: n(w * 0.24), fill: C.ink })}
  ${txt(0, h * 0.86, 'ПУНКТ ВЫДАЧИ', { size: n(w * 0.085), weight: 600, fill: C.ink, ls: 1 })}
  </g>`;
};

// palm pressed against the glass, seen from inside; (x, y) is the centre of the palm
export const palm = ({ x, y, s = 1, press = 1, glow = 0 }) => {
  const f = [[-92, 150], [-42, 186], [8, 174], [58, 134]];
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${s})">
  <ellipse cx="0" cy="30" rx="${n(210 * press)}" ry="${n(260 * press)}" fill="${C.mint}" opacity="${n(0.055 * press)}"/>
  <rect x="-74" y="170" width="148" height="520" rx="46" fill="${C.hoodDark}"/>
  <rect x="-60" y="120" width="120" height="100" rx="34" fill="${C.paleShade}"/>
  <rect x="-70" y="176" width="140" height="22" rx="8" fill="${C.red}"/>
  <path d="M-98 -40 Q-98 -70 -70 -70 L74 -70 Q100 -70 100 -40 L100 100 Q100 160 40 160 L-40 160 Q-98 160 -98 100 Z" fill="${C.pale}"/>
  ${f.map(([fx, fh]) => `<rect x="${fx}" y="${-60 - fh}" width="40" height="${fh + 30}" rx="20" fill="${C.pale}"/>`).join('')}
  <rect x="-168" y="-20" width="110" height="44" rx="22" transform="rotate(28 -110 0)" fill="${C.pale}"/>
  ${f.map(([fx, fh]) => `<ellipse cx="${fx + 20}" cy="${-36 - fh}" rx="14" ry="20" fill="${C.white}" opacity="${n(0.3 * press)}"/>`).join('')}
  <ellipse cx="0" cy="70" rx="62" ry="56" fill="${C.white}" opacity="${n(0.16 * press)}"/>
  ${badge({ x: 190, y: 176, w: 220, rot: 6, glow })}
  </g>`;
};

// pickup window in the wall; inner is drawn behind the glass
export const pickupWindow = ({ x = 190, y = 470, w = 700, h = 720, shake = 0, inner = '' } = {}) => `<g transform="translate(${n(shake)} 0)">
  <rect x="${x - 28}" y="${y - 28}" width="${w + 56}" height="${h + 56}" rx="32" fill="${C.wall2}"/>
  <clipPath id="win"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14"/></clipPath>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${C.glass}"/>
  <g clip-path="url(#win)">${inner}
    <polygon points="${x + 70},${y} ${x + 210},${y} ${x + 20},${y + h} ${x - 120},${y + h}" fill="#fff" opacity="0.04"/>
    <polygon points="${x + 280},${y} ${x + 330},${y} ${x + 140},${y + h} ${x + 90},${y + h}" fill="#fff" opacity="0.03"/>
  </g>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="none" stroke="${C.glassEdge}" stroke-width="6"/>
  <rect x="${x + w / 2 - 180}" y="${y + h + 28}" width="360" height="46" rx="10" fill="${C.counterTop}"/>
  </g>`;

// dark glass filling the frame (close-ups from inside)
export const glassWall = () => `<rect width="${W}" height="${H}" fill="${C.glass}"/>
  <polygon points="120,0 330,0 -60,1920 -270,1920" fill="#fff" opacity="0.035"/>
  <polygon points="520,0 600,0 210,1920 130,1920" fill="#fff" opacity="0.03"/>`;

// the note with the rules. reveal[i] = 0..1, hi = 0..1 turns rule 3 red
export const NOTE = { x: 140, y: 330, w: 800, h: 900, rules: [220, 440, 660] };
export const note = ({ rules, reveal = [1, 1, 1], hi = 0, rot = -2 }) => {
  const { x, y, w, h } = NOTE;
  let s = `<g transform="rotate(${rot} 540 ${y + h / 2})">
  <rect x="${x + 10}" y="${y + 14}" width="${w}" height="${h}" rx="10" fill="#000" opacity="0.25"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${C.paper}"/>
  <rect x="${x + w / 2 - 70}" y="${y - 22}" width="140" height="50" rx="6" fill="${C.tape}" opacity="0.9"/>
  ${txt(x + 60, y + 128, 'ПРАВИЛА', { size: 70, fill: C.ink, anchor: 'start', ls: 3 })}
  <rect x="${x + 60}" y="${y + 150}" width="330" height="8" rx="4" fill="${C.red}"/>`;
  rules.forEach((lines, i) => {
    const a = reveal[i] || 0; if (a <= 0) return;
    const ry = y + NOTE.rules[i], red = i === 2 && hi > 0, col = red ? C.red : C.ink;
    s += `<g opacity="${n(a)}" transform="translate(0 ${n((1 - a) * 24)})">
    <circle cx="${x + 96}" cy="${ry + 34}" r="${n(36 * (1 + 0.4 * (1 - a)))}" fill="${col}"/>${txt(x + 96, ry + 50, String(i + 1), { size: 44, fill: C.paper })}
    ${lines.map((ln, k) => txt(x + 160, ry + 46 + k * 58, ln, { size: 44, weight: red ? 800 : 600, fill: col, anchor: 'start' })).join('')}
    ${red ? `<rect x="${x + 160}" y="${ry + lines.length * 58 + 4}" width="${n(520 * hi)}" height="9" rx="4" fill="${C.red}"/>` : ''}
    </g>`;
  });
  return s + '</g>';
};

// ---------- overlays ----------
export const plate = ({ x = 70, y = 260, text, accent = false, size = 56 }) => {
  const w = text.length * size * 0.7 + 60;
  return `<rect x="${x}" y="${y}" width="${n(w)}" height="${size + 44}" rx="18" fill="${C.night}" stroke="${accent ? C.red : C.glassEdge}" stroke-width="5"/>
  ${txt(x + w / 2, y + size + 10, text, { size, fill: accent ? C.red : C.mint, ls: 3 })}`;
};

// caption chunk: lines of words, one keyword in red. Lower third, like the genre's subtitles.
export const caption = (ch, t, { y = 1340, size = 74 } = {}) => {
  const a = clamp((t - ch.start) / 0.09), sc = 0.9 + 0.1 * easeOut(a), lh = size * 1.18;
  const y0 = y - ((ch.lines.length - 1) * lh) / 2;
  const lines = ch.lines.map((ln, i) => `<text x="540" y="${n(y0 + i * lh)}" text-anchor="middle" font-family="Mont" font-weight="800" font-size="${size}" letter-spacing="1" paint-order="stroke" stroke="${C.void}" stroke-width="${n(size * 0.24)}" stroke-linejoin="round">${ln.map((w) => `<tspan fill="${w.hi ? C.red : C.white}">${esc(w.w)}</tspan>`).join(' ')}</text>`).join('');
  return `<g transform="translate(540 ${y}) scale(${n(sc)}) translate(-540 ${-y})" opacity="${n(a)}">${lines}</g>`;
};

const logo = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.night}" stroke="${C.red}" stroke-width="${n(r * 0.09)}"/>${txt(x, y + r * 0.3, '№3', { size: n(r * 0.86), fill: C.red })}`;

export const endCard = ({ p, title = 'ТРЕТЬЕ ПРАВИЛО', line = 'СЕРИЯ 2 — ЗАВТРА', sub = 'подпишись, чтобы не пропустить' }) => {
  const a = easeOut(clamp(p / 0.18)), b = easeOut(seg(p, 0.12, 0.34));
  return `<rect width="${W}" height="${H}" fill="${C.night}"/>
  <g opacity="${n(a)}" transform="translate(0 ${n((1 - a) * 30)})">${logo(540, 700, 150)}
  ${txt(540, 980, title, { size: 96, ls: 2 })}</g>
  <g opacity="${n(b)}" transform="translate(0 ${n((1 - b) * 30)})">
  <rect x="150" y="1060" width="780" height="130" rx="22" fill="${C.red}"/>${txt(540, 1150, line, { size: 68 })}
  ${txt(540, 1280, sub, { size: 40, weight: 600, fill: C.mintDim })}</g>`;
};

// cover for the profile grid: badge top right, art, title in caps, ribbon with the hook
export const cover = ({ ep = 1, title, hook, art = '' }) => `<rect width="${W}" height="${H}" fill="${C.night}"/>
  ${art}
  <rect x="0" y="1150" width="${W}" height="770" fill="${C.night}" opacity="0.86"/>
  <rect x="730" y="300" width="290" height="96" rx="20" fill="${C.red}"/>${txt(875, 368, `СЕРИЯ ${ep}`, { size: 52 })}
  ${title.map((ln, i) => txt(540, 1300 + i * 136, ln, { size: 124, ls: 1 })).join('')}
  <rect x="80" y="${1300 + title.length * 136 - 60}" width="920" height="118" rx="20" fill="${C.wall2}"/>
  ${txt(540, 1300 + title.length * 136 + 20, hook, { size: 58, fill: C.mint })}`;

// ---------- frame ----------
// tl = timeline built by build.js: { sent:[{start,end}], shots:[{i,start,end}], chunks, endCardStart, total }
export function frame(ep, tl, t) {
  if (t >= tl.endCardStart) return endCard({ p: (t - tl.endCardStart) / (tl.total - tl.endCardStart), ...(ep.endCard || {}) });
  const sh = tl.shots.find((s) => t >= s.start && t < s.end) || tl.shots[tl.shots.length - 1];
  const def = ep.shots[sh.i], local = t - sh.start, p = clamp(local / (sh.end - sh.start));
  const ctx = {
    t,
    sp: (i) => clamp((t - tl.sent[i].start) / (tl.sent[i].end - tl.sent[i].start)), // progress inside sentence i
    since: (i) => t - tl.sent[i].start, // seconds since sentence i started (negative before)
    dur: (i) => tl.sent[i].end - tl.sent[i].start,
  };
  let svg = def.draw(p, local, ctx);
  const ch = tl.chunks.find((c) => t >= c.start && t < c.end);
  if (ch) svg += caption(ch, t, def.caption || {});
  return svg;
}
