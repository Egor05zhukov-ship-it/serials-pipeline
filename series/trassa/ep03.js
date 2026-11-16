// «Трасса. Минус 38», серия 3 «Аккумулятор». Аккаунт «Ты бы выжил?».
// Same construction as ep01.js: the picture follows the words through c.sp / c.since / sentenceAt(), never through seconds.
// Silent clue: Anya's red mitten lies in the snow by the car (she lost it when Kostya pulled her out); it pays off in episode 6.
import { cam, lerp, clamp, easeOut, easeInOut } from '../../kit/index.js';
import { T, theme, ditch, snowWall, inCar, seatBack, ignition, candleClose, roadAhead, roadPt, farLights, kostya, anya, kostyaBack, phone, mitt, gauge, rulePlate, versus, snowfall, vapour, spray, sentenceAt } from '../../kit/trassa.js';

const N = [
  'Минус | *сорок три*. Наша машина | в кювете | на зимнике.',
  'До посёлка | сорок километров. Связи нет. Со мной сестра, | ей *девять*.',
  'Мотор грел нас | по *десять минут* | в час.',
  { text: 'В два десять ночи | стартер *щёлкнул*. И всё.', gap: 0.3 },
  'На таком морозе | аккумулятор отдаёт | *вдвое меньше* тока. А у нас он | ещё и старый.',
  'Печки больше нет. В салоне уже | *минус двенадцать*.',
  { text: '— Костя, | мне *холодно*.', gap: 0.3 },
  'Значит, строим | *гнездо*.',
  'Оба на заднее сиденье. Вдвоём *теплее*.',
  'Коврики и чехлы — | *на стёкла*. Щели заткнул | тряпками.',
  'Снаружи обвалил | машину *снегом*. До самых окон.',
  { text: 'Снег *держит* тепло.', gap: 0.25 },
  'В бардачке | нашлась *свеча*. Я поставил её | в жестяную банку.',
  { text: 'Одна свеча — | это несколько | *градусов* тепла. Окно приоткрыто.', gap: 0.25 },
  'Телефон почти сел. На морозе | он садится | за минуты. Держу его | под курткой.', // no highlight: the captions lie on the orange jacket
  { text: 'Аня уснула. Я слежу | за *свечой*.', gap: 0.4 },
  'Три сорок. Далеко на зимнике — | *две фары*.',
  'Они едут. *К нам*.',
  { text: 'Ближе. Ещё *ближе*.', gap: 0.3 },
  { text: '*Триста метров*. Фары остановились.', gap: 0.6 },
  'И *погасли*.',
];
const say = (i) => (typeof N[i] === 'string' ? N[i] : N[i].text);
const at = (i, k) => sentenceAt(say(i), k); // share of unit i at which its k-th sentence starts
const since = (c, i, from = 0) => c.since(i) - from * c.dur(i); // seconds since that moment
const pop = (c, i, from = 0, len = 0.35) => clamp(since(c, i, from) / len);
const n2 = (x) => Math.round(x * 100) / 100;
const temp = gauge({ icon: 'temp', value: '−43°C', accent: true });
const dim = (a = 0.7) => `<rect x="-300" y="-600" width="1680" height="3120" fill="${T.night}" opacity="${a}"/>`;
const dark = { lights: 0, tail: 0, cabin: 0.1 }; // the car without the engine: no lamps, a little light inside
// the nest: both on the rear seat, mats on the glass, the candle on the dashboard
const nest = (t, o = {}) => inCar({ t, dome: 0, mats: 1, candle: 1, gap: 1, K: { seat: 'rear', look: 1, worry: 0.2 }, A: { eyes: 0, tilt: 8 }, ...o });
// the far headlights on the road: k = 0 on the horizon, 1 = three hundred metres away
const lights = (t, k, on = 1) => { const P = roadPt(lerp(0.965, 0.7, k)); return farLights({ x: P.x, y: P.y - 8 - 22 * k, k, on, t }); };

export default {
  series: 'Трасса. Минус 38',
  episode: 3,
  theme,
  gap: 0.12,
  tail: 1.2,
  bedVolume: 0.3,
  narration: N,
  sfx: [{ type: 'hit', sentence: 20, at: 0, vol: 0.9 }],
  shots: [
    {
      id: 'ditch', from: 0, // the premise again; this time the car is dark
      draw(p, t, c) {
        return cam(ditch({ t, ...dark }), { s: lerp(1, 1.16, easeInOut(p)), cx: 520, cy: 1010, y: -20 }) + temp
          + gauge({ y: 376, icon: 'pin', label: 'ДО ПОСЁЛКА', value: '40 КМ', pop: pop(c, 1) })
          + gauge({ y: 528, icon: 'nosignal', value: 'НЕТ СЕТИ', pop: pop(c, 1, at(1, 1)) });
      },
    },
    {
      id: 'recap', from: 2, // how episode 2 ended: warm-ups by the rule, then the click
      draw(p, t, c) {
        if (c.since(3) < 0) {
          const scene = inCar({ t, dome: 0.35, dash: 1, key: 1, warm: 0.8, gap: 1, K: { arm: 'key', look: 0.8 }, A: { eyes: 0, tilt: -13 } });
          return cam(scene, { s: lerp(1.04, 1.12, easeInOut(c.sp(2))), cx: 620, cy: 900, y: -40 })
            + gauge({ x: 30, y: 282, size: 48, icon: 'clock', value: '01:10' }) + gauge({ x: 322, icon: 'ten', label: 'МОТОР', size: 40, value: '10 МИН В ЧАС', accent: true });
        }
        const cl = since(c, 3, at(3, 0) + 0.45 * at(3, 1)), quiet = since(c, 3, at(3, 1));
        const turn = cl >= 0.3 ? lerp(1, 0.66, easeOut(clamp((cl - 0.3) / 0.3))) : cl >= -0.25 ? lerp(0.66, 1, easeOut(clamp((cl + 0.25) / 0.25))) : 0.66;
        const lamps = quiet >= 0 ? 0.3 * Math.max(0, 1 - quiet / 0.8) : cl >= 0 ? clamp(0.3 + 0.25 * Math.sin(cl * 37) * Math.exp(-cl * 2)) : 1;
        return cam(ignition({ t, turn, lamps }), { s: lerp(1, 1.08, easeInOut(c.sp(3))), cx: 540, cy: 860 }) + gauge({ icon: 'clock', value: '02:10', accent: true });
      },
    },
    {
      id: 'battery', from: 4, // why: in such frost a battery gives about half the current
      draw(p, t, c) {
        return cam(ignition({ t, turn: 0.66, lamps: 0.06 }), { s: 1.1, cx: 540, cy: 860 }) + dim(0.6)
          + versus({ y: 360, head: 'ТОК АККУМУЛЯТОРА', icon: 'battery', a: { big: '100%', small: 'В ТЕПЛЕ' }, b: { big: '≈50%', small: 'НА МОРОЗЕ' }, k: pop(c, 4, 0.42 * at(4, 1), 0.5), pop: pop(c, 4, 0, 0.45) }) + temp;
      },
    },
    {
      id: 'cold', from: 5, // no heater any more: minus twelve inside
      draw(p, t, c) {
        if (c.since(6) < 0) {
          const scene = inCar({ t, dome: 0.3, K: { worry: 0.7, look: -1 }, A: { eyes: 1, worry: 1, shiver: 1, tilt: -4, look: 0.6 } })
            + vapour({ x: 590, y: 760, t, s: 0.9 }) + vapour({ x: 300, y: 836, t: t + 1.2, s: 0.7 });
          return cam(scene, { s: lerp(1.04, 1.14, easeInOut(c.sp(5))), cx: 480, cy: 900, y: -30 }) + gauge({ y: 278, icon: 'temp', value: '−43°C', accent: true })
            + gauge({ x: 392, icon: 'temp', label: 'В САЛОНЕ', value: '−12°C', accent: true, pop: pop(c, 5, at(5, 1)) });
        }
        const talk = c.since(6);
        const scene = seatBack({ t, bench: true, dome: 0.3 })
          + `<g transform="translate(${n2(Math.sin(t * 40) * 4)} 0)">${anya({ x: 540, y: 880, s: 1.5, t, eyes: 1, worry: 1, pale: 0.35, lookY: -0.3, mouth: talk > 0.1 && talk < c.dur(6) ? 0.25 + 0.15 * Math.sin(t * 13) : 0 })}</g>`
          + vapour({ x: 600, y: 990, t, s: 1.6, every: 1.8 });
        return cam(scene, { s: lerp(1, 1.08, easeInOut(c.sp(6))), cx: 540, cy: 880 }) + gauge({ icon: 'temp', label: 'В САЛОНЕ', value: '−12°C', accent: true });
      },
    },
    {
      id: 'nest', from: 7, // the nest: both on the rear seat, mats and covers over the glass, gaps plugged
      draw(p, t, c) {
        const move = easeInOut(pop(c, 8, 0, 0.6)), mats = clamp(since(c, 9, 0) / (0.75 * c.dur(9)));
        const step = c.since(9) >= 0 ? (since(c, 9, at(9, 1)) >= 0 ? 3 : 2) : c.since(8) >= 0 ? 1 : 0;
        const line = ['СТРОИМ ГНЕЗДО', 'ОБА — НА ЗАДНЕЕ СИДЕНЬЕ', 'КОВРИКИ И ЧЕХЛЫ — НА СТЁКЛА', 'ЩЕЛИ ЗАТКНУТЬ'][step];
        const when = [pop(c, 7, 0.1), pop(c, 8), pop(c, 9), pop(c, 9, at(9, 1))][step];
        const scene = inCar({ t, dome: 0.3, mats: c.since(9) >= 0 ? mats : 0, K: move > 0.5 ? { seat: 'rear', look: -0.5 } : { look: -1, worry: 0.4 }, A: { eyes: 1, tilt: lerp(-4, 8, move), shiver: 1 - move, worry: 1 - move } });
        return cam(scene, { s: lerp(1.04, 1.14, easeInOut(p)), cx: lerp(540, 400, move), cy: 900, y: -20 })
          + rulePlate({ y: 260, head: step ? `ГНЕЗДО · ${step}` : 'ЧТО ДЕЛАТЬ', lines: [line], size: 46, pop: when, w: 900 });
      },
    },
    {
      id: 'bank', from: 10, // snow piled against the car up to the windows; the red mitten is the silent clue
      draw(p, t, c) {
        const k = clamp(c.sp(10) / 0.8), work = c.since(11) < 0 ? 1 : 0;
        const scene = ditch({ t, ...dark }) + snowWall({ k }) + mitt({ x: 96, y: 1236, s: 0.52, rot: 68 })
          + kostyaBack({ x: 930, y: 1330 + Math.sin(t * 7) * 5 * work, s: 0.62 }) + (work ? spray({ x: 860, y: 1120, t, dir: -1, s: 1.4 }) : '');
        return cam(scene, { s: lerp(1.02, 1.12, easeInOut(p)), cx: 520, cy: 1010 })
          + (c.since(11) < 0 ? rulePlate({ y: 260, head: 'ГНЕЗДО · 4', lines: ['ОБВАЛИТЬ МАШИНУ СНЕГОМ'], size: 46, pop: pop(c, 10, 0.1), w: 900 })
            : rulePlate({ y: 260, head: 'ПОЧЕМУ', lines: ['СНЕГ ДЕРЖИТ ТЕПЛО'], size: 46, pop: pop(c, 11), w: 900 }));
      },
    },
    {
      id: 'candle', from: 12, // a candle in a tin can: a few degrees of warmth
      draw(p, t, c) {
        const lit = easeOut(clamp(since(c, 12, at(12, 1) + 0.55 * (1 - at(12, 1))) / 0.5));
        return cam(candleClose({ t, lit }), { s: lerp(1, 1.06, easeInOut(p)), cx: 540, cy: 900, y: 230 })
          + (c.since(13) >= 0 ? rulePlate({ y: 260, head: 'СВЕЧА В БАНКЕ', lines: ['НЕСКОЛЬКО ГРАДУСОВ ТЕПЛА'], size: 46, pop: pop(c, 13, 0.2), w: 900 })
            + gauge({ y: 452, size: 44, icon: 'window', value: 'ОКНО ПРИОТКРЫТО', pop: pop(c, 13, at(13, 1)) }) : '');
      },
    },
    {
      id: 'phone', from: 14, // nine percent; in the frost it dies in minutes, so it goes under the jacket
      draw(p, t, c) {
        const hide = easeInOut(clamp(since(c, 14, at(14, 2)) / 0.7)), step = since(c, 14, at(14, 2)) >= 0 ? 2 : since(c, 14, at(14, 1)) >= 0 ? 1 : 0;
        const scene = seatBack({ t, dome: 0.15, warm: 0.25 }) + kostya({ x: 540, y: 800, s: 1.25, t, worry: 0.35, lookY: lerp(0.9, 0.2, hide) })
          + (hide < 1 ? `<g opacity="${n2(1 - clamp((hide - 0.6) / 0.4))}">${phone({ x: 540, y: lerp(1090, 1000, hide), s: lerp(0.62, 0.4, hide), rot: lerp(-6, 0, hide), pct: 9 })}</g>` : '')
          + vapour({ x: 600, y: 890, t, s: 1.4 });
        return cam(scene, { s: lerp(1, 1.06, easeInOut(p)), cx: 540, cy: 900 })
          + (step ? rulePlate({ y: 260, head: 'ТЕЛЕФОН', lines: [step === 1 ? 'НА МОРОЗЕ САДИТСЯ ЗА МИНУТЫ' : 'ДЕРЖАТЬ ПОД ОДЕЖДОЙ, У ТЕЛА'], size: 44, pop: pop(c, 14, at(14, step)), w: 900 })
            : gauge({ icon: 'phone', label: 'ТЕЛЕФОН', value: '9 %', level: 0.09, accent: true }));
      },
    },
    {
      id: 'watch', from: 15, // Anya sleeps, Kostya keeps watch over the candle
      draw(p, t, c) {
        return cam(nest(t), { s: lerp(1.08, 1.2, easeInOut(p)), cx: 480, cy: 900, y: -30 }) + gauge({ icon: 'clock', value: '03:39' });
      },
    },
    {
      id: 'lights', from: 16, // 03:40: two headlights far away on the winter road, coming closer
      draw(p, t, c) {
        const seen = since(c, 16, at(16, 1)), span = c.since(16) - c.since(18) + c.dur(18) - at(16, 1) * c.dur(16); // from «две фары» to the end of unit 18
        const k = 0.92 * easeInOut(clamp(seen / span));
        return cam(roadAhead({ t }) + (seen >= 0 ? lights(t, k, clamp(seen / 0.4)) : ''), { s: lerp(1.5, 1.2, easeInOut(p)), cx: 560, cy: 900, y: 140 })
          + gauge({ icon: 'clock', value: '03:40', accent: true });
      },
    },
    {
      id: 'stop', from: 19, // three hundred metres away they stop
      draw(p, t, c) {
        const k = lerp(0.92, 1, easeOut(clamp(t / 0.8)));
        return cam(roadAhead({ t }) + lights(t, k), { s: 1.2 + 0.04 * p, cx: 560, cy: 900, y: 140 })
          + gauge({ icon: 'clock', value: '03:40', accent: true }) + gauge({ y: 376, icon: 'pin', label: 'ДО НИХ', value: '300 М', pop: pop(c, 19, 0.05) });
      },
    },
    {
      id: 'dark', from: 20, caption: { y: 920, size: 104 }, // and they go out
      draw(p, t) {
        const on = 1 - clamp((t - 0.25) / 0.18), g = easeOut(clamp(t / 1.2));
        return cam(roadAhead({ t }) + lights(t, 1, on), { s: 1.24, cx: 560, cy: 900, y: 140 }) + dim(0.5 + 0.38 * clamp((t - 0.25) / 0.5))
          + `<rect x="${n2(540 - 320 * g)}" y="1090" width="${n2(640 * g)}" height="7" rx="3" fill="${T.orange}" opacity="${n2(0.85 * g)}"/>`;
      },
    },
  ],
  endCard: { title: 'ТЫ БЫ ВЫЖИЛ?', line: 'СЕРИЯ 4 — ЗАВТРА', sub: 'подпишись, чтобы не пропустить' },
  cover: {
    ep: 3,
    title: ['МИНУС 12', 'В САЛОНЕ'],
    hook: 'ПЕЧКИ БОЛЬШЕ НЕТ',
    art: cam(nest(1.2), { s: 1.06, cx: 540, cy: 900, y: -150 }),
  },
  post: `Аккумулятор сел. Печки больше нет: в салоне минус двенадцать, за бортом минус сорок три.

«Трасса. Минус 38», серия 3. Как пережить ночь в остывшей машине: гнездо на заднем сиденье, снег до самых окон и одна свеча в жестяной банке.

Серия 4 — завтра. Подпишись, чтобы не пропустить.

#выживание #зимник #мороз #минисериал #анимация`,
};
