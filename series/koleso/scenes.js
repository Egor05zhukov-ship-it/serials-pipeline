// «Колесо»: details of episode 2 and on, on top of kit/koleso.js. Same contract: pure JS, SVG strings for 1080x1920.
import { clamp } from '../../kit/index.js';
import { ease } from '../../kit/v2.js';
import { P } from '../../kit/people.js';
import { AMBER, K, DAWN, NIGHT } from '../../kit/koleso.js';

const n = (x) => Math.round(x * 100) / 100;
const wide = (y, h, fill) => `<rect x="-2000" y="${n(y)}" width="5080" height="${n(h)}" fill="${fill}"/>`;

// The bottom cabin seen close, standing over the boarding platform at dawn: its door swung open, nobody inside.
// (x, y) = the hanging point, k = size in cabin units (kit/koleso.js cabin(): 62 x 70 body). open 0..1 = the door.
export const openCabin = ({ x = 540, y = 360, k = 9, pal = DAWN, open = 1 }) => {
  const o = ease(clamp(open)), dark = '#0E131E';
  // the doorway on the right half of the body, the door panel swung out to the right (drawn narrower: turned to us)
  const doorW = 26, dx = 4 + doorW * (1 - 0.62 * o);
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${n(k)})">
  <rect x="-3" y="-40" width="6" height="56" fill="${pal.wheel}"/><rect x="-31" y="14" width="62" height="70" rx="13" fill="${pal.cabin}"/>
  <rect x="-23" y="24" width="20" height="30" rx="6" fill="${pal.win}"/>
  <rect x="2" y="20" width="${doorW}" height="62" rx="5" fill="${dark}"/>
  ${o > 0.004 ? `<path d="M${n(2 + doorW)} 20 L${n(2 + doorW + dx)} ${n(16 - 4 * o)} L${n(2 + doorW + dx)} ${n(86 + 4 * o)} L${n(2 + doorW)} 82 Z" fill="${pal.cabin}"/>
  <rect x="${n(2 + doorW + 0.25 * dx)}" y="26" width="${n(0.5 * dx)}" height="24" rx="3" fill="${pal.win}"/>` : ''}
  <rect x="-31" y="54" width="33" height="30" rx="10" fill="${pal.cabin}"/></g>`;
};

// A chain with a padlock across the booth by the platform (kit/koleso.js platform(): the booth is cx+290..cx+440).
// The silent clue of episode 2: nobody speaks of it; it plays in episode 4.
export const boothChain = ({ cx = 540, y = 1160, col = '#AEB6C2' }) => {
  const links = Array.from({ length: 9 }, (_, i) => `<ellipse cx="${cx + 300 + i * 16}" cy="${n(y - 22 + 6 * Math.sin(i * 0.7))}" rx="9" ry="5" fill="none" stroke="${col}" stroke-width="4"/>`).join('');
  return `${links}<rect x="${cx + 358}" y="${y - 20}" width="24" height="22" rx="4" fill="${col}"/>`;
};

// The roof from inside at night: moonlit glass, the dark frame; small shoes step across it one by one as shadows.
// steps = how many of the six prints are there (fractions fade the next one in).
export const roofNight = ({ steps = 6 } = {}) => {
  const pts = [[300, 980, 18], [420, 860, 22], [430, 700, 16], [560, 590, 24], [570, 430, 18], [700, 330, 26]];
  const shoe = ([x, y, r], j) => {
    const a = clamp(steps - j); if (a <= 0.004) return '';
    const side = j % 2 ? 1 : -1;
    return `<g opacity="${n(ease(a))}" transform="translate(${x + side * 26} ${y}) rotate(${r})"><ellipse cx="0" cy="-26" rx="27" ry="44" fill="#071022"/><ellipse cx="0" cy="46" rx="21" ry="24" fill="#071022"/></g>`;
  };
  return `${wide(-2000, 6000, '#0B1426')}<rect x="110" y="180" width="860" height="900" rx="30" fill="#4A6496"/>
  <circle cx="820" cy="300" r="60" fill="${NIGHT.moon}" opacity="0.55"/>
  <rect x="470" y="180" width="140" height="900" fill="#070D1A"/><rect x="110" y="610" width="860" height="26" fill="#0B1426"/>${pts.map(shoe).join('')}`;
};

// One print on the glass, big, and the daughter's shoe brought over it: the same size. slide 0..1 = the shoe comes in.
export const shoeMatch = ({ slide = 1 } = {}) => {
  const e = ease(clamp(slide)), sx = 540 + (1 - e) * 560, sy = 760 + (1 - e) * 120;
  const print = `<g transform="translate(540 760) rotate(14) scale(4.2)"><ellipse cx="0" cy="-26" rx="27" ry="44" fill="${AMBER}"/><ellipse cx="0" cy="46" rx="21" ry="24" fill="${AMBER}"/></g>`;
  const sole = `<g transform="translate(${n(sx)} ${n(sy)}) rotate(14) scale(4.2)" opacity="0.92"><path d="M-29 -26 C-30 -86 30 -86 29 -26 C28 6 22 22 22 46 C22 76 -22 76 -22 46 C-22 22 -28 6 -29 -26 Z" fill="none" stroke="${K.varya}" stroke-width="5"/>
  <rect x="-24" y="-8" width="48" height="10" rx="4" fill="${K.varya}"/></g>`;
  return `${wide(-2000, 6000, DAWN.roof)}<rect x="110" y="180" width="860" height="1000" rx="30" fill="${DAWN.glass}"/>${print}${sole}`;
};

// The sleeping daughter's forearm, close: the coral sleeve pushed up, three thin scratches on the skin.
// show 0..1 = the sleeve goes up and the scratches are seen.
export const scratchArm = ({ show = 1 } = {}) => {
  const e = ease(clamp(show)), sleeveEnd = 560 - 300 * e;
  const lines = [[470, 880, 600, 840], [490, 920, 640, 872], [515, 958, 660, 912]]
    .map(([a, b, c, d]) => `<path d="M${a} ${b} L${c} ${d}" stroke="#A9443D" stroke-width="9" stroke-linecap="round"/>`).join('');
  return `${wide(-2000, 6000, NIGHT.wall)}<rect x="-40" y="1000" width="1160" height="400" fill="${NIGHT.bench}"/>
  <path d="M-40 820 L860 820 Q980 830 990 900 Q980 970 860 980 L-40 980 Z" fill="${P.skin}" stroke="${P.line}" stroke-width="8"/>
  <circle cx="930" cy="900" r="92" fill="${P.skin}" stroke="${P.line}" stroke-width="8"/>
  <g opacity="${n(e)}">${lines}</g>
  <path d="M-40 790 L${n(sleeveEnd)} 790 Q${n(sleeveEnd + 40)} 900 ${n(sleeveEnd)} 1010 L-40 1010 Z" fill="${K.varya}" stroke="${P.line}" stroke-width="8"/>`;
};
