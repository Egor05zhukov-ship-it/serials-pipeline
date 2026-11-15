// «Ночная смена», серия 1. Аккаунт «Третье правило».
// narration: one unit = one voice file. *слово* = keyword in the caption, | = forced caption break,
// gap = pause after the unit, s.
// shots: from = index of the first narration unit of the shot; draw(p, t, c) returns SVG.
//   p = progress of the shot 0..1, t = seconds since the shot started,
//   c.sp(i) = progress of unit i, c.since(i) = seconds since unit i started, c.dur(i) = its length.
import { C, cam, lerp, clamp, easeOut, easeInOut, flicker, txt, room, lamp, shelves, counter, heroBox, sticker, person, hooded, badge, palm, pickupWindow, glassWall, note, plate } from '../../kit/index.js';

const RULES = [
  ['После полуночи', 'дверь не открывай.', 'Выдавай через окошко.'],
  ['Придут без кода —', 'не спорь. Отдай коробку', 'с нижней полки.'],
  ['Заказ на своё имя', 'не открывай.', 'И не возвращай.'],
];
const desk = (t) => `<rect width="1080" height="1920" fill="${C.counterFront}"/><ellipse cx="540" cy="800" rx="660" ry="840" fill="${C.mint}" opacity="${0.06 * flicker(t)}"/>`;

export default {
  series: 'Ночная смена',
  episode: 1,
  gap: 0.16,
  tail: 0.7,
  bedVolume: 0.3,
  narration: [
    'В три ночи | в мой пункт выдачи | пришёл *заказ* | на моё имя.',
    'Я ничего не *заказывал*.',
    { text: 'А коробка *тёплая*.', gap: 0.35 },
    'Я тут *вторую* ночь.',
    'Прошлая сменщица, *Вера*, | уволилась | одним днём.',
    { text: 'И оставила на кассе записку. *Три* правила.', gap: 0.3 },
    '*Первое*. После полуночи | дверь не открывай. Выдавай | через окошко.',
    '*Второе*. Придут без кода — | не спорь. Отдай любую коробку | с нижней полки.',
    { text: '*Третье*. Заказ на своё имя | не открывай. И не возвращай.', gap: 0.45 },
    { text: 'Нижняя полка *пустая*. Я проверил ещё вечером.', gap: 0.5 },
    { text: 'Три ноль семь. *Стук* в окошко.', gap: 0.55 },
    'Женщина в капюшоне. Лица *не видно*.',
    { text: '— Мне заказ. *Без кода*.', gap: 0.4 },
    'На стойке | одна коробка. *Моя*.',
    { text: 'И она | только что | *сдвинулась*. Сама.', gap: 0.45 },
    'Женщина кладёт | ладонь на стекло. На запястье бейдж. «*Вера*. Пункт выдачи».',
    { text: 'Она смотрит | на коробку | и *улыбается*.', gap: 0.35 },
    { text: '— Ты ведь её уже *открыл*.', gap: 0.5 },
    { text: 'Я опускаю глаза. Скотч на коробке *разрезан*.', gap: 0.7 },
    'Я её *не трогал*.',
  ],
  sfx: [{ type: 'hit', sentence: 19, at: 0, vol: 0.9 }], // sentence = narration unit, at = 0..1 inside it
  shots: [
    {
      id: 'counter', from: 0, // the parcel on the counter, 03:00
      draw(p, t, c) {
        const scene = room({ t }) + shelves({ y: 430, rows: 3, rowH: 200, seed: 3, dim: 0.5 })
          + person({ x: 300, y: 840, s: 1.2, t, look: 0.9, lookY: 0.7, worry: c.sp(1) })
          + counter({ y: 1210 }) + heroBox({ x: 520, y: 950, w: 400, h: 260, t, warm: easeOut(c.sp(2)) });
        return cam(scene, { s: lerp(1, 1.16, easeInOut(p)), cx: 720, cy: 1080 }) + plate({ text: '03:00' });
      },
    },
    {
      id: 'hero', from: 3, // second night; Vera's badge still hangs on the hook
      draw(p, t, c) {
        const v = easeOut(clamp(c.since(4) / 0.5));
        const hook = `<g opacity="${lerp(0.5, 1, v)}"><rect x="842" y="470" width="16" height="16" rx="8" fill="${C.glassEdge}"/><rect x="847" y="480" width="6" height="84" fill="${C.red}"/>${badge({ x: 850, y: 560, w: 180, rot: Math.sin(t * 1.8) * 3, glow: v * 0.8 })}</g>`;
        const scene = room({ t }) + shelves({ y: 380, rows: 3, rowH: 230, seed: 9, dim: 0.45 }) + hook
          + person({ x: 450, y: 900, s: 1.55, t, look: v * 0.9, lookY: -v * 0.6, worry: 0.3 + 0.4 * v, seed: 1 }) + counter({ y: 1500, sign: false });
        return cam(scene, { s: lerp(1.02, 1.1, p), cx: 540, cy: 900 }) + plate({ text: 'СМЕНА 2' });
      },
    },
    {
      id: 'note', from: 5, caption: { y: 1390 }, // the note slides in, rule one
      draw(p, t, c) {
        const slide = (1 - easeOut(clamp(t / 0.5))) * 520;
        return cam(desk(t) + `<g transform="translate(0 ${slide})">${note({ rules: RULES, reveal: [easeOut(clamp(c.since(6) / 0.45)), 0, 0] })}</g>`, { s: lerp(1, 1.07, easeInOut(p)), cx: 540, cy: 780 });
      },
    },
    {
      id: 'rule2', from: 7, caption: { y: 1390 }, // closer: rule two
      draw(p, t) {
        return cam(desk(t) + note({ rules: RULES, reveal: [1, easeOut(clamp(t / 0.45)), 0] }), { s: lerp(1.16, 1.26, easeInOut(p)), cx: 540, cy: 860, y: -120 });
      },
    },
    {
      id: 'rule3', from: 8, caption: { y: 1390 }, // the third rule, in red
      draw(p, t) {
        const sc = desk(t) + note({ rules: RULES, reveal: [1, 1, easeOut(clamp(t / 0.4))], hi: easeOut(clamp((t - 0.3) / 0.9)) });
        return cam(sc, { s: lerp(1.28, 1.4, easeInOut(p)), cx: 540, cy: 1080, y: -180 });
      },
    },
    {
      id: 'shelves', from: 9, // the bottom shelf is empty
      draw(p, t) {
        const pulse = 0.55 + 0.45 * Math.sin(t * 5), y = 950;
        const mark = `<rect x="126" y="${y}" width="828" height="192" rx="10" fill="${C.red}" opacity="${0.05 + 0.05 * pulse}"/><rect x="126" y="${y}" width="828" height="192" rx="10" fill="none" stroke="${C.red}" stroke-width="7" stroke-dasharray="26 18" opacity="${pulse}"/>`;
        const scene = room({ t }) + shelves({ x: 110, y: 250, w: 860, rows: 4, rowH: 230, emptyRow: 3, seed: 5 }) + mark;
        return cam(scene, { s: lerp(1, 1.14, easeInOut(p)), cx: 540, cy: 1040 });
      },
    },
    {
      id: 'window', from: 10, // 03:07, knock, the hooded visitor
      draw(p, t, c) {
        const tk = c.since(10) - 0.55 * c.dur(10);
        const shake = [0, 0.26, 0.52].reduce((s, d) => s + (tk > d && tk < d + 0.22 ? Math.sin((tk - d) * 60) * 10 * Math.exp(-(tk - d) * 16) : 0), 0);
        const ap = easeOut(clamp(c.since(11) / 0.9)), sp = c.since(12);
        const lean = sp > 0 ? easeOut(clamp(sp / 0.6)) : 0; // she leans to the glass when she speaks
        const inner = hooded({ x: 540, y: 840 + 30 * lean, s: 1.15 + 0.1 * lean, tilt: Math.sin(t * 0.9) * 1.5, opacity: ap });
        const tuk = tk > 0 && tk < 1.3 ? `<g opacity="${clamp((1.3 - tk) * 2)}" transform="rotate(-7 780 390)">${txt(780, 400, 'ТУК-ТУК', { size: 80, fill: C.red })}</g>` : '';
        const scene = `<rect width="1080" height="1920" fill="${C.wall}"/>` + lamp({ f: flicker(t, 3) * 0.7 }) + pickupWindow({ shake, inner }) + tuk;
        return cam(scene, { s: lerp(1, 1.05, p) + 0.2 * easeInOut(clamp(c.since(11) / 1.6)), cx: 540, cy: 860 }) + plate({ text: '03:07', accent: true });
      },
    },
    {
      id: 'box', from: 13, // the parcel moves by itself
      draw(p, t, c) {
        const tm = c.since(14) - 0.5 * c.dur(14), k = easeOut(clamp(tm / 0.14)), dx = 110 * k;
        const jolt = tm > 0 && tm < 0.3 ? Math.sin(tm * 90) * 5 * (1 - tm / 0.3) : 0;
        const fade = 1 - clamp((tm - 0.3) / 0.9);
        const streak = k > 0 ? [0, 1, 2].map((i) => `<rect x="250" y="${830 + i * 110}" width="${dx}" height="10" rx="5" fill="${C.mint}" opacity="${0.4 * fade}"/>`).join('') : '';
        const scene = `<rect width="1080" height="1920" fill="${C.wall}"/>` + lamp({ f: flicker(t, 5) }) + counter({ y: 1150, sign: false }) + streak
          + heroBox({ x: 250 + dx, y: 760 + jolt, w: 520, h: 390, t, warm: 0.5 });
        return cam(scene, { s: lerp(1.04, 1.14, easeInOut(p)), cx: 560, cy: 960 });
      },
    },
    {
      id: 'palm', from: 15, // palm on the glass, then the badge on the wrist
      draw(p, t, c) {
        const a = easeOut(clamp(t / 0.35)), z = easeInOut(clamp((c.sp(15) - 0.42) / 0.25));
        const scene = glassWall() + `<g opacity="${a}" transform="translate(0 ${(1 - a) * 120})">${palm({ x: 430, y: 780, s: 1.45, press: a, glow: z * (0.6 + 0.4 * Math.sin(t * 6)) })}</g>`;
        return cam(scene, { s: lerp(1, 1.5, z) + 0.04 * p, cx: lerp(540, 705, z), cy: lerp(960, 1143, z), x: lerp(0, -165, z), y: lerp(0, -243, z) });
      },
    },
    {
      id: 'hood', from: 16, // she smiles
      draw(p, t, c) {
        const smile = easeInOut(clamp((c.sp(16) - 0.55) / 0.45));
        const scene = glassWall() + hooded({ x: 540, y: 780, s: 2.2, smile, tilt: lerp(0, -5, easeInOut(clamp(c.sp(16) / 0.6))) });
        return cam(scene, { s: lerp(1, 1.1, easeInOut(p)), cx: 540, cy: 900 });
      },
    },
    {
      id: 'top', from: 18, // the tape is cut
      draw(p, t, c) {
        const k = easeInOut(clamp((c.sp(18) - 0.5) / 0.3)), x = 170, y = 400, w = 740, h = 740, my = y + h / 2;
        let slit = '';
        if (k > 0) {
          const N = 16, pts = Array.from({ length: Math.max(2, Math.round(N * k) + 1) }, (_, i) => `${x + 40 + ((w - 80) * i) / N},${my + (i % 2 ? -7 : 7)}`).join(' ');
          slit = `<polyline points="${pts}" fill="none" stroke="${C.warm}" stroke-width="26" opacity="0.4" stroke-linejoin="round"/><polyline points="${pts}" fill="none" stroke="${C.void}" stroke-width="11" stroke-linejoin="round"/>`;
        }
        const scene = `<rect width="1080" height="1920" fill="${C.counterTop}"/><ellipse cx="540" cy="780" rx="700" ry="820" fill="${C.mint}" opacity="${0.07 * flicker(t, 7)}"/>
          <rect x="${x + 16}" y="${y + 20}" width="${w}" height="${h}" rx="10" fill="#000" opacity="0.25"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${C.card}"/>
          <rect x="${x + 22}" y="${y + 22}" width="${w - 44}" height="${h - 44}" rx="6" fill="none" stroke="${C.cardDark}" stroke-width="5" opacity="0.6"/>
          <rect x="${x}" y="${my - 46}" width="${w}" height="92" fill="${C.tape}"/>` + sticker({ x: x + 60, y: y + 80, w: 340, h: 190 }) + slit;
        return cam(scene, { s: lerp(1, 1.1, easeInOut(p)), cx: 540, cy: 770 });
      },
    },
    {
      id: 'black', from: 19, caption: { y: 920, size: 104 }, // the last line on black
      draw(p, t) {
        const g = easeOut(clamp(t / 1.2));
        return `<rect width="1080" height="1920" fill="${C.void}"/><rect x="${540 - 320 * g}" y="1090" width="${640 * g}" height="7" rx="3" fill="${C.red}" opacity="${0.85 * g}"/>`;
      },
    },
  ],
  endCard: { title: 'ТРЕТЬЕ ПРАВИЛО', line: 'СЕРИЯ 2 — ЗАВТРА', sub: 'подпишись, чтобы не пропустить' },
  cover: {
    ep: 1,
    title: ['ЗАКАЗ', 'НА МОЁ ИМЯ'],
    hook: 'Я НИЧЕГО НЕ ЗАКАЗЫВАЛ',
    art: room({ t: 0.5 }) + counter({ y: 1060, sign: false }) + heroBox({ x: 270, y: 700, w: 540, h: 360, t: 0.4, warm: 1 }),
  },
  post: `В три ночи в мой пункт выдачи пришёл заказ на моё имя. Я ничего не заказывал. А коробка тёплая 📦

«Ночная смена», серия 1. Сменщица оставила три правила. Третье, похоже, уже нарушено.

Серия 2 — завтра. Подпишись, чтобы не пропустить.

#страшныеистории #хоррор #минисериал #анимация #ночнаясмена`,
};
