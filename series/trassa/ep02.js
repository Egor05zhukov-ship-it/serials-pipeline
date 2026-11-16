// «Трасса. Минус 38», серия 2 «Угарный газ». Аккаунт «Ты бы выжил?».
// Same construction as ep01.js: the picture follows the words through c.sp / c.since / sentenceAt(), never through seconds.
// Silent clue: the phone left on the cold dashboard loses charge (14 → 11 %); episode 3 pays it off.
import { cam, lerp, clamp, easeOut, easeInOut, txt } from '../../kit/index.js';
import { T, theme, ditch, inCar, seatBack, pipeClose, kostya, anya, gauge, card, versus, icon, ignition, mitt, sky, forest, snow, snowfall, vapour, spray, suvSide, sentenceAt } from '../../kit/trassa.js';

const N = [
  'Минус | *сорок один*. Наша машина | в кювете | на зимнике.',
  'До посёлка | сорок километров. Связи нет. Со мной сестра, | ей *девять*.',
  'Выхлопная труба | ушла в сугроб. Двадцать минут | выхлоп шёл | *в салон*.',
  { text: 'Аня не просыпалась.', gap: 0.2 }, // no highlight: the caption lies on the orange jacket
  'Я вытащил её | из машины. Прямо *на снег*, | на мороз.',
  { text: '— Аня! *Дыши*!', gap: 0.3 },
  { text: 'Она *открыла* глаза. — Костя, | меня тошнит.', gap: 0.2 },
  'Это *угарный газ*. У него нет | ни цвета, | ни запаха.',
  'Тяжёлая голова. Тянет в сон. Тошнит. Это его *признаки*.',
  { text: 'Помощь одна: | *свежий воздух*. Сразу.', gap: 0.2 },
  'Потом я откопал | выхлопную трубу. *Руками*.',
  'Теперь у нас | *правило*.',
  'Мотор — | *десять минут* | в час. Не больше.',
  'Окно открыто | на *два пальца*.',
  'Перед каждым пуском | я *откапываю* трубу.',
  { text: 'Так бензина хватит | не на шесть часов. На *тридцать шесть*.', gap: 0.2 },
  'Первый пуск. Десять минут | *тепла*. Заглушил.',
  'Второй. Третий. Всё | *по правилу*.',
  { text: 'Два десять ночи. Четвёртый пуск. Я повернул | *ключ*.', gap: 0.3 },
  { text: '*Щелчок*. И тишина.', gap: 0.5 },
  '*Аккумулятор*.',
];
const say = (i) => (typeof N[i] === 'string' ? N[i] : N[i].text);
const at = (i, k) => sentenceAt(say(i), k); // share of unit i at which its k-th sentence starts
const since = (c, i, from = 0) => c.since(i) - from * c.dur(i); // seconds since that moment
const pop = (c, i, from = 0, len = 0.35) => clamp(since(c, i, from) / len);
const n2 = (x) => Math.round(x * 100) / 100;
const temp = gauge({ icon: 'temp', value: '−41°C', accent: true });
const stroke = `paint-order="stroke" stroke="${T.void}" stroke-width="26" stroke-linejoin="round"`;
const dim = (a = 0.7) => `<rect x="-300" y="-600" width="1680" height="3120" fill="${T.night}" opacity="${a}"/>`;

// Kostya and Anya on the snow by the car; a and k override their poses
const outside = (t, a = {}, k = {}) => sky({ t, horizon: 760, seed: 3 }) + forest({ y: 760, h: 120, gap: 74, seed: 5, fill: T.far2 }) + forest({ y: 772, h: 82, gap: 50, seed: 9 })
  + snow({ y: 770, fill: T.field, seed: 2, amp: 8, rim: 0.22 }) + snow({ y: 960, fill: T.field2, seed: 6, amp: 12, rim: 0.4 })
  + suvSide({ x: 1040, y: 1130, s: 1.3, rot: 9, cabin: 0.9, tail: 1 }) + `<ellipse cx="560" cy="1150" rx="340" ry="70" fill="${T.yellow}" opacity="0.1"/>`
  + anya({ x: 340, y: 900, s: 1.1, t, eyes: 0, tilt: -16, cover: 1, pale: 0.5, bob: 0, ...a })
  + kostya({ x: 700, y: 810, s: 1.25, t, jacket: false, worry: 1, look: -1, lookY: 0.4, tilt: -9, ...k })
  + snow({ y: 1230, fill: T.bank, seed: 8, amp: 20, rim: 0.7 }) + snowfall({ t, seed: 2 });

export default {
  series: 'Трасса. Минус 38',
  episode: 2,
  theme,
  gap: 0.08,
  tail: 1.0,
  bedVolume: 0.3,
  narration: N,
  sfx: [{ type: 'hit', sentence: 20, at: 0, vol: 0.9 }],
  shots: [
    {
      id: 'ditch', from: 0, // the premise again: the ditch, the frost, no signal
      draw(p, t, c) {
        const z = easeInOut(clamp(c.since(1) / 1.4));
        return cam(ditch({ t, cabin: 0.9, who: 'a' }), { s: lerp(1, 1.2, z) + 0.03 * p, cx: 520, cy: 1020, y: lerp(0, -40, z) }) + temp
          + gauge({ y: 376, icon: 'pin', label: 'ДО ПОСЁЛКА', value: '40 КМ', pop: pop(c, 1) })
          + gauge({ y: 528, icon: 'nosignal', value: 'НЕТ СЕТИ', pop: pop(c, 1, at(1, 1)) });
      },
    },
    {
      id: 'recap', from: 2, // how episode 1 ended: the buried pipe, then Anya who does not wake
      draw(p, t, c) {
        const eng = gauge({ y: 376, icon: 'engine', label: 'МОТОР РАБОТАЛ', value: '20 МИН', accent: true });
        if (c.since(3) < 0) return cam(pipeClose({ t }), { s: lerp(1, 1.12, easeInOut(c.sp(2))), cx: 560, cy: 940 }) + temp + eng;
        const scene = seatBack({ t, bench: true, dome: 0.6, warm: 0.2 }) + anya({ x: 540, y: 900, s: 1.45, t, eyes: 0, tilt: 15, cover: 1, bob: 0.2, pale: 0.35 });
        return cam(scene, { s: lerp(1.06, 1.2, easeInOut(c.sp(3))), cx: 540, cy: 880 }) + snowfall({ t, count: 24, wind: 380, fall: 60, seed: 6, opacity: 0.55 });
      },
    },
    {
      id: 'out', from: 4, // out of the car, onto the snow: the only help is air
      draw(p, t, c) {
        const call = c.since(5), breath = since(c, 5, 0.75);
        const shout = call > 0 && call < 1.6 ? `<g opacity="${n2(clamp((1.6 - call) * 2.5))}" transform="translate(${n2(Math.sin(call * 60) * 10 * Math.exp(-call * 5))} 0) rotate(-5 540 450)">${txt(540, 500, 'ДЫШИ!', { size: 150, fill: T.orange, extra: stroke })}</g>` : '';
        const scene = outside(t, { tilt: lerp(-22, -14, easeInOut(p)) }, { mouth: call > 0 && call < 1.1 ? 0.9 : 0.15, tilt: -9 + Math.sin(t * 9) * (call > 0 && call < 1.1 ? 2 : 0) })
          + vapour({ x: 650, y: 880, t, s: 1.5, dir: -1, every: 1.3 }) + (breath > 0 ? vapour({ x: 250, y: 990, t: breath, s: 0.9, dir: -1, every: 9 }) : '');
        return cam(scene, { s: lerp(1.08, 1.2, easeInOut(p)), cx: 520, cy: 880, x: Math.sin(t * 40) * 16 * Math.exp(-t * 5), y: -70 }) + temp + shout;
      },
    },
    {
      id: 'awake', from: 6, // she opens her eyes
      draw(p, t, c) {
        const e = easeInOut(clamp(c.sp(6) / (at(6, 1) * 0.8))), talk = since(c, 6, at(6, 1));
        const scene = outside(t, { eyes: e, tilt: lerp(-14, -5, e), worry: 0.8, pale: 0.5, mouth: talk > 0 && talk < 1.2 ? 0.25 + 0.15 * Math.sin(t * 13) : 0, bob: 0.4 }, { worry: 0.5, mouth: 0, look: -1, lookY: 0.5 })
          + vapour({ x: 250, y: 990, t, s: 0.9, dir: -1, every: 2.2 });
        return cam(scene, { s: lerp(1.5, 1.62, easeInOut(p)), cx: 340, cy: 880, x: 190, y: -200 }) + temp;
      },
    },
    {
      id: 'gas', from: 7, caption: { y: 1400 }, // what it was: carbon monoxide, its signs, the only help
      draw(p, t, c) {
        const a = at(7, 1), d = 1 - a;
        const rows = [
          { icon: 'nocolor', text: 'НЕТ ЦВЕТА' }, { icon: 'nosmell', text: 'НЕТ ЗАПАХА' },
          { icon: 'head', text: 'ТЯЖЁЛАЯ ГОЛОВА' }, { icon: 'sleep', text: 'ТЯНЕТ В СОН' }, { icon: 'sick', text: 'ТОШНИТ' },
          { icon: 'air', text: 'СВЕЖИЙ ВОЗДУХ. СРАЗУ', tone: 'yellow' },
        ];
        const reveal = [pop(c, 7, a + 0.38 * d), pop(c, 7, a + 0.7 * d), pop(c, 8, 0.02), pop(c, 8, at(8, 1)), pop(c, 8, at(8, 2)), pop(c, 9, 0.3)];
        return cam(outside(t), { s: 1.1, cx: 520, cy: 880 }) + dim(0.74)
          + card({ y: 290, head: 'УГАРНЫЙ ГАЗ', icon: 'warn', rows, reveal, rowH: 132, pop: pop(c, 7, 0, 0.5) });
      },
    },
    {
      id: 'dig', from: 10, // the pipe is dug out by hand
      draw(p, t, c) {
        const k = c.sp(10), b = 1 - easeInOut(clamp((k - 0.12) / 0.62)), work = b > 0.04 ? 1 : 0;
        const paw = (ph, x, lean) => { const q = Math.sin(t * 8 + ph); return `<g transform="translate(${n2(x + 40 * q)} ${n2(1240 - 150 * Math.abs(q))}) rotate(${n2(lean + 10 * q)})"><rect x="-62" y="0" width="124" height="1100" rx="50" fill="${T.orange}"/>${mitt({ x: 0, y: 0, s: 1.5, col: T.grey, dark: T.greyDark })}</g>`; };
        return cam(pipeClose({ t, bury: b, seep: b, smoke: clamp(1 - b * 3) }), { s: lerp(1, 1.1, easeInOut(p)), cx: 560, cy: 940 })
          + (work ? spray({ x: 560, y: 1000, t, dir: 1, s: 2.2 }) + spray({ x: 520, y: 1010, t: t + 0.3, dir: -1, s: 1.8 }) + paw(0, 300, 36) + paw(2.2, 800, -36) : '') + temp;
      },
    },
    {
      id: 'rule', from: 11, // the rule of the episode, three lines
      draw(p, t, c) {
        const rows = [{ icon: 'ten', text: 'МОТОР: 10 МИНУТ В ЧАС' }, { icon: 'window', text: 'ОКНО — НА ДВА ПАЛЬЦА' }, { icon: 'pipe', text: 'ТРУБУ ОТКОПАТЬ', sub: 'перед каждым пуском' }];
        const scene = inCar({ t, dome: 0.6, gap: 1, K: { look: -0.6 }, A: { eyes: 1, tilt: -6, look: 0.8 } });
        return cam(scene, { s: lerp(1.02, 1.1, easeInOut(p)), cx: 540, cy: 900 }) + dim(0.72)
          + card({ y: 330, head: 'ПРАВИЛО', icon: 'wall', rows, reveal: [pop(c, 12, 0.12), pop(c, 13, 0.1), pop(c, 14, 0.1)], rowH: 172, pop: pop(c, 11, 0, 0.5) });
      },
    },
    {
      id: 'fuel', from: 15, // six hours of petrol become thirty-six
      draw(p, t, c) {
        const scene = inCar({ t, dome: 0.6, gap: 1, K: { look: -0.6 }, A: { eyes: 1, tilt: -6, look: 0.8 } });
        return cam(scene, { s: lerp(1.1, 1.16, easeInOut(p)), cx: 540, cy: 900 }) + dim(0.72)
          + versus({ y: 360, head: 'БЕНЗИНА ХВАТИТ НА', a: { big: '6', small: 'ЧАСОВ' }, b: { big: '36', small: 'ЧАСОВ' }, k: pop(c, 15, at(15, 1), 0.5), pop: pop(c, 15, 0, 0.45) });
      },
    },
    {
      id: 'cycles', from: 16, // three warm-ups by the clock; the phone on the dashboard is the silent clue
      draw(p, t, c) {
        const runs = [[c.since(16), since(c, 16, at(16, 2))], [c.since(17), since(c, 17, at(17, 1) * 0.8)], [since(c, 17, at(17, 1)), since(c, 17, at(17, 2))]];
        let warm = 0, on = false, i = 0, done = 0;
        for (const [a, b] of runs) if (a >= 0) { i++; on = b < 0; if (!on) done++; warm = on ? easeOut(clamp(a / 0.35)) : Math.max(0, 1 - b / 0.7); }
        const hh = ['23', '23', '00', '01'][i], ph = 14 - done;
        const scene = inCar({ t, dome: 0.35, dash: on ? 1 : 0, key: on ? 1 : 0, warm: 0.9 * warm, gap: 1, phone: true, K: { arm: on ? 'key' : 'wheel', look: on ? 0.8 : -0.4 }, A: { eyes: 0, tilt: -13 } });
        return cam(scene, { s: lerp(1.02, 1.12, easeInOut(p)), cx: 620, cy: 900, y: -40 })
          + gauge({ x: 30, y: 282, size: 48, icon: 'clock', value: `${hh}:${on || i === 0 ? '10' : '20'}` })
          + gauge({ x: 322, icon: 'ten', label: 'МОТОР', size: 40, value: on ? 'РАБОТАЕТ' : 'ЗАГЛУШЕН', accent: on })
          + gauge({ x: 749, y: 282, size: 48, icon: 'phone', value: `${ph} %`, level: ph / 100 });
      },
    },
    {
      id: 'key', from: 18, // 02:10, the fourth start: a click and nothing
      draw(p, t, c) {
        const ready = since(c, 18, at(18, 1)), wind = c.since(19) + 0.3, cl = c.since(19), quiet = since(c, 19, at(19, 1));
        const turn = cl >= 0.3 ? lerp(1, 0.66, easeOut(clamp((cl - 0.3) / 0.3))) : wind >= 0 ? lerp(0.66, 1, easeOut(clamp(wind / 0.25))) : 0.66 * easeOut(clamp(ready / 0.35));
        const lamps = quiet >= 0 ? 0.3 * Math.max(0, 1 - quiet / 0.8) : cl >= 0 ? clamp(0.3 + 0.25 * Math.sin(cl * 37) * Math.exp(-cl * 2)) : clamp(ready / 0.2);
        const click = cl >= 0 && cl < 1.3 ? `<g opacity="${n2(clamp((1.3 - cl) * 2.5))}" transform="translate(${n2(Math.sin(cl * 70) * 9 * Math.exp(-cl * 6))} 0) rotate(-6 760 880)">${txt(770, 900, 'ЩЁЛК', { size: 120, fill: T.orange, extra: stroke })}</g>` : '';
        return cam(ignition({ t, turn, lamps }), { s: lerp(1, 1.1, easeInOut(p)), cx: 540, cy: 860 }) + click + gauge({ icon: 'clock', value: '02:10', accent: true });
      },
    },
    {
      id: 'black', from: 20, caption: { y: 1010, size: 104 }, // the last word and the lamp that dies
      draw(p, t) {
        const g = easeOut(clamp(t / 1.2)), a = Math.max(0.1, Math.exp(-t * 1.1)) * (0.8 + 0.2 * Math.sin(t * 31));
        return `<rect width="1080" height="1920" fill="${T.void}"/><g opacity="${n2(a)}">${icon('battery', T.red, 540 - 28 * 6, 500, 6)}</g>
        <rect x="${n2(540 - 320 * g)}" y="1120" width="${n2(640 * g)}" height="7" rx="3" fill="${T.orange}" opacity="${n2(0.85 * g)}"/>`;
      },
    },
  ],
  endCard: { title: 'ТЫ БЫ ВЫЖИЛ?', line: 'СЕРИЯ 3 — ЗАВТРА', sub: 'подпишись, чтобы не пропустить' },
  cover: {
    ep: 2,
    title: ['УГАРНЫЙ', 'ГАЗ'],
    hook: 'НИ ЦВЕТА, НИ ЗАПАХА',
    art: cam(outside(1.2), { s: 1.02, cx: 540, cy: 900, y: -70 }),
  },
  post: `Сестра не просыпается: двадцать минут выхлоп шёл в салон. А у угарного газа нет ни цвета, ни запаха.

«Трасса. Минус 38», серия 2. Правило для тех, кто застрял зимой в машине: мотор десять минут в час, окно приоткрыто, выхлопная труба откопана.

Серия 3 — завтра. Подпишись, чтобы не пропустить.

#выживание #угарныйгаз #зимник #минисериал #анимация`,
};
