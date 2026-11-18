// «Список»: details of the season that kit/spisok.js does not have. Same look and contract: flat shapes of the palette
// V, every function returns an SVG string for the 1080x1920 stage.
import { clamp } from '../../kit/index.js';
import { V, FLOOR, ease } from '../../kit/v2.js';

const n = (x) => Math.round(x * 100) / 100;
const chalk = (d, a, sw = 9) => {
  const k = ease(clamp(a));
  return k <= 0 ? '' : `<path d="${d}" pathLength="1" stroke-dasharray="1 2" stroke-dashoffset="${(1 - k).toFixed(4)}" fill="none" stroke="${V.white}" stroke-width="${sw}" stroke-linecap="round"/>`;
};

// A chalk cross on the wall by a flat door of kit/spisok.js flatDoor (same x, w, h: it sits where the circle would).
// a = 0..1: the first stroke, then the second.
export const chalkCross = ({ x, floor: fy = FLOOR, w = 190, h = 490, a = 1 }) => {
  const cx = x + w / 2 + 58, cy = fy - h * 0.62;
  return `<g filter="url(#ink)" opacity="0.9"><rect x="${cx - 80}" y="${n(cy - 80)}" width="160" height="160" fill="none"/><g transform="translate(${cx} ${n(cy)})">${chalk('M-30 -34 L32 30', a * 2)}${chalk('M30 -32 L-28 34', a * 2 - 1)}</g></g>`;
};

// Wide double track of wheels across the yard, on the ground in front of the houses (draw after floor()).
export const tracks = ({ ground = FLOOR, a = 1 } = {}) => {
  if (a <= 0) return '';
  const band = (y0) => {
    let d = '';
    for (let i = 0; i <= 24; i++) { const x = -60 + i * 50; d += `${i ? 'L' : 'M'}${x} ${n(y0 + 5 * Math.sin(i * 0.7))} `; }
    return `<path d="${d}" fill="none" stroke="${V.mid}" stroke-width="22" stroke-linecap="round"/>`;
  };
  return `<g opacity="${n(ease(a))}">${band(ground + 28)}${band(ground + 68)}</g>`;
};

// a door that shivers when it is knocked on: offset in px for the given seconds since the first knock (three knocks)
export const knockShake = (k, times = [0.1, 0.5, 0.9]) =>
  times.reduce((s, x) => { const u = k - x; return s + (u > 0 && u < 0.28 ? 6 * Math.sin((u / 0.28) * Math.PI) : 0); }, 0);
