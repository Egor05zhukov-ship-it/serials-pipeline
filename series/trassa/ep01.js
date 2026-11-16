// «Трасса. Минус 38», серия 1 «Кювет». Аккаунт «Ты бы выжил?».
// Built like series/nochnaya-smena/ep01.js: narration units, shots that start at a unit, draw(p, t, c).
// The picture follows the words through c.sp / c.since / sentenceAt(), never through seconds,
// so a different voice changes the length of the episode but not what happens on which word.
import { cam, lerp, clamp, easeOut, easeInOut, txt } from '../../kit/index.js';
import { T, theme, ditch, drive, roadAhead, roadPt, inCar, seatBack, rearScene, pipeClose, kostya, anya, kostyaBack, hand, gauge, rulePlate, sky, snowfall, vapour, spray, burst, flow, sentenceAt } from '../../kit/trassa.js';

const N = [
  'Минус | *тридцать восемь*. Машина | в кювете.',
  'До посёлка | *сорок километров*. Бензина | на шесть часов. Связи нет.',
  { text: 'А на заднем сиденье | спит моя *сестра*.', gap: 0.25 },
  'Мы с Аней | ехали по *зимнику* | к бабушке. Ане девять.',
  'За весь вечер | навстречу не попалась | *ни одна* машина.',
  { text: 'На повороте | нас *понесло*. Удар. Тишина.', gap: 0.3 },
  'Колёса *висят* в снегу. Сам я | не выеду.',
  'Первая мысль: | идти *за помощью*.',
  'Сорок километров. Это *восемь часов* | пешком.',
  'На таком морозе | и ветру | открытая кожа | *белеет* | за десять минут.',
  'С ребёнком на руках | я *не дойду* | и до утра.',
  'Значит, *остаёмся*. Машина — | это стены, | печка | и шесть часов тепла.',
  'Я завёл мотор | и укрыл Аню | своей *курткой*.',
  'В салоне стало *тепло*. Меня начало | клонить в сон.',
  { text: 'Слишком *быстро*. И голова тяжёлая, | как после бани.', gap: 0.3 },
  'Я вышел | проверить машину. Обошёл *сзади*.',
  { text: 'Выхлопная труба | ушла *в сугроб*. Целиком.', gap: 0.3 },
  'Мотор работал | уже двадцать минут. И весь выхлоп | шёл к нам | *в салон*.',
  { text: 'Я рванул | заднюю дверь. — *Аня*!', gap: 0.45 },
  'Она *не проснулась*.',
];
const say = (i) => (typeof N[i] === 'string' ? N[i] : N[i].text);
const at = (i, k) => sentenceAt(say(i), k); // share of unit i at which its k-th sentence starts
const since = (c, i, from = 0) => c.since(i) - from * c.dur(i); // seconds since that moment
const pop = (c, i, from = 0, len = 0.35) => clamp(since(c, i, from) / len);
const n2 = (x) => Math.round(x * 100) / 100;
const temp = gauge({ icon: 'temp', value: '−38°C', accent: true });
const stroke = `paint-order="stroke" stroke="${T.void}" stroke-width="26" stroke-linejoin="round"`;

export default {
  series: 'Трасса. Минус 38',
  episode: 1,
  theme,
  gap: 0.12,
  tail: 1.2,
  bedVolume: 0.3,
  narration: N,
  sfx: [{ type: 'hit', sentence: 5, at: at(5, 1), vol: 0.8 }, { type: 'hit', sentence: 19, at: 0, vol: 0.9 }],
  shots: [
    {
      id: 'ditch', from: 0, // cold open: the car in the ditch; then the counters, one per sentence
      draw(p, t, c) {
        const z = easeInOut(clamp(c.since(1) / 1.4));
        return cam(ditch({ t, who: 'a' }), { s: lerp(1.22, 1, z) + 0.04 * p, cx: 520, cy: 1020, y: lerp(-40, 0, z) }) + temp
          + gauge({ y: 376, icon: 'pin', label: 'ДО ПОСЁЛКА', value: '40 КМ', pop: pop(c, 1) })
          + gauge({ y: 528, icon: 'fuel', label: 'БЕНЗИН', value: '6 ЧАСОВ', pop: pop(c, 1, at(1, 1)) })
          + gauge({ y: 680, icon: 'nosignal', value: 'НЕТ СЕТИ', pop: pop(c, 1, at(1, 2)) });
      },
    },
    {
      id: 'sister', from: 2, // inside: Anya asleep on the back seat
      draw(p, t) {
        return cam(inCar({ t, dome: 0.8, K: { look: -1, lookY: 0.2, worry: 0.5 }, A: { eyes: 0 } }), { s: lerp(1.25, 1.4, easeInOut(p)), cx: 250, cy: 900, y: -120 });
      },
    },
    {
      id: 'drive', from: 3, // earlier that evening; the sign under the snow is the silent clue («Зимник закрыт»)
      draw(p, t, c) {
        const sign = 1300 + 0.9 * 560 * (t - c.since(4)); // comes into frame when unit 4 starts
        return cam(drive({ t, sign }), { s: lerp(1, 1.06, p), cx: 540, cy: 1000 }) + temp + gauge({ y: 376, icon: 'clock', value: '21:38' });
      },
    },
    {
      id: 'crash', from: 5, // the skid, the hit, silence; then the wheels hanging in the snow
      draw(p, t, c) {
        const th = since(c, 5, at(5, 1)); // seconds since «Удар»
        if (th < 0) {
          const q = clamp(c.sp(5) / at(5, 1)), e = q * q;
          return cam(drive({ t: t + 9, rot: 15 * e, dy: 64 * e, slide: 300 * e }), { s: 1.06 + 0.08 * e, cx: 600, cy: 1040, x: Math.sin(t * 46) * 7 * q }) + temp + gauge({ y: 376, icon: 'clock', value: '21:40' });
        }
        const shake = Math.sin(th * 52) * 26 * Math.exp(-th * 5.5), flash = Math.exp(-th * 7);
        const z = easeInOut(clamp(c.since(6) / 1.2)), s6 = Math.max(0, c.since(6)), stop = at(6, 1) * c.dur(6);
        const spin = 15 * (s6 < stop ? s6 : stop + (1 - Math.exp(-(s6 - stop) * 3)) / 3), on = c.since(6) >= 0 ? clamp(1 - (s6 - stop) / 0.5) : 0;
        const scene = ditch({ t, who: 'a', spinR: spin }) + burst({ x: 900, y: 1130, age: th }) + spray({ x: 262, y: 1162, t, on });
        return cam(scene, { s: lerp(1.12, 1.7, z) + 0.03 * p, cx: lerp(540, 300, z), cy: lerp(1010, 1100, z), x: shake + lerp(0, 190, z), y: -shake * 0.4 })
          + (flash > 0.02 ? `<rect width="1080" height="1920" fill="${T.snow}" opacity="${n2(0.85 * flash)}"/>` : '') + temp + gauge({ y: 376, icon: 'clock', value: '21:40' });
      },
    },
    {
      id: 'walk', from: 7, // the first thought: go for help. Forty kilometres of this road
      draw(p, t, c) {
        const P = roadPt(0.5);
        const scene = roadAhead({ t }) + kostyaBack({ x: P.x - 20, y: P.y, s: (300 * P.s) / 700 });
        return cam(scene, { s: lerp(1.5, 1.15, easeInOut(p)), cx: 540, cy: P.y, y: -56 }) + temp
          + gauge({ y: 376, icon: 'pin', label: 'ДО ПОСЁЛКА', value: '40 КМ', pop: pop(c, 8) })
          + gauge({ y: 528, icon: 'walk', label: 'ПЕШКОМ', value: '8 ЧАСОВ', accent: true, pop: pop(c, 8, at(8, 1)) });
      },
    },
    {
      id: 'frost', from: 9, // bare skin goes white in ten minutes; with a child in his arms he will not get there
      draw(p, t, c) {
        if (c.since(10) < 0) {
          const k = c.sp(9), f = easeInOut(clamp((k - 0.25) / 0.65));
          return sky({ t, horizon: 1920, stars: 0.5, seed: 9 }) + snowfall({ t, count: 56, wind: 430, fall: 90, seed: 4 })
            + `<g transform="translate(720 840) rotate(-90)">${hand({ x: 0, y: 0, s: 1.5, frost: f })}</g>` + temp
            + gauge({ y: 376, icon: 'clock', label: 'НА МОРОЗЕ И ВЕТРУ', value: `${Math.round(10 * clamp(k / 0.9))} МИН`, accent: k >= 0.9 });
        }
        const k = c.sp(10), P = roadPt(lerp(0.5, 0.72, k)), fade = easeInOut(clamp(k / 0.9));
        const scene = roadAhead({ t, count: 84, wind: 430 })
          + `<g opacity="${n2(1 - 0.72 * fade)}">${kostyaBack({ x: P.x - 20, y: P.y + Math.sin(t * 7) * 3, s: (300 * P.s) / 700, carry: true })}</g>`
          + `<rect width="1080" height="1920" fill="${T.snowLit}" opacity="${n2(0.2 * fade)}"/>`;
        return cam(scene, { s: lerp(1.4, 1.25, k), cx: 540, cy: 1264, y: -56 }) + temp;
      },
    },
    {
      id: 'stay', from: 11, // the rule of the episode: stay with the car
      draw(p, t, c) {
        const a = at(11, 1), d = 1 - a;
        return cam(ditch({ t, who: 'a', cabin: 0.8 }), { s: lerp(1.04, 1.16, easeInOut(p)), cx: 520, cy: 1010 })
          + rulePlate({ y: 260, head: 'ПРАВИЛО', lines: ['ОСТАВАЙСЯ У МАШИНЫ'], pop: pop(c, 11, 0.1) })
          + gauge({ y: 452, size: 44, icon: 'wall', value: 'СТЕНЫ', pop: pop(c, 11, a + 0.3 * d) })
          + gauge({ y: 552, size: 44, icon: 'heat', value: 'ПЕЧКА', pop: pop(c, 11, a + 0.5 * d) })
          + gauge({ y: 652, size: 44, icon: 'fuel', value: '6 ЧАСОВ ТЕПЛА', pop: pop(c, 11, a + 0.66 * d) });
      },
    },
    {
      id: 'warm', from: 12, // engine on, the jacket goes to Anya; then the warmth and the sleep
      draw(p, t, c) {
        if (c.since(13) < 0) {
          const k = c.sp(12), give = easeInOut(clamp((k - 0.42) / 0.3));
          const scene = inCar({ t, dome: 0.8, key: easeOut(clamp(t / 0.3)), dash: clamp(t / 0.3), warm: 0.6 * clamp((k - 0.2) / 0.8),
            K: { jacket: give < 0.04, arm: k < 0.3 ? 'key' : give > 0.02 ? 'back' : 'wheel', look: give > 0.02 ? -1 : 0.7 }, A: { eyes: 0, cover: give } });
          return cam(scene, { s: lerp(1.15, 1.3, easeInOut(k)), cx: lerp(760, 300, easeInOut(clamp(k / 0.6))), cy: 900, y: -110 })
            + gauge({ icon: 'engine', label: 'МОТОР', value: 'РАБОТАЕТ', pop: pop(c, 12, 0.08) });
        }
        const k = clamp(c.since(13) / (c.since(13) - c.since(14) + c.dur(14))); // progress through units 13-14
        const sl = c.since(14) < 0 ? 0.75 * easeInOut(c.sp(13)) : lerp(0.12, 0.95, easeInOut(clamp((c.sp(14) - at(14, 1) * 0.8) / 0.6)));
        const scene = seatBack({ t, warm: 0.55 + 0.45 * k, dome: 0.7 })
          + kostya({ x: 540, y: 830 + 16 * sl, s: 1.5, t, jacket: false, sleepy: sl, worry: c.since(14) < 0 ? 0.1 : 0.6, tilt: 7 * sl + 3 * sl * Math.sin(t * 1.3), bob: 1 - 0.6 * sl });
        return cam(scene, { s: lerp(1, 1.1, easeInOut(k)), cx: 540, cy: 840 })
          + gauge({ icon: 'engine', label: 'МОТОР РАБОТАЕТ', value: `${Math.round(lerp(2, 19, k))} МИН` });
      },
    },
    {
      id: 'rear', from: 15, // out into the frost and round the back: the pipe is gone
      draw(p, t, c) {
        const eng = gauge({ y: 376, icon: 'engine', label: 'МОТОР РАБОТАЕТ', value: '20 МИН' });
        if (c.since(16) < 0) {
          const k = easeInOut(c.sp(15));
          return cam(rearScene({ t, torch: easeOut(clamp((c.sp(15) - 0.4) / 0.3)), seep: 0.8 }), { s: lerp(1.04, 1.3, k), cx: lerp(380, 720, k), cy: 1090 })
            + vapour({ x: 200, y: 1700, t, s: 3 }) + temp + eng;
        }
        return cam(pipeClose({ t }), { s: lerp(1, 1.12, easeInOut(c.sp(16))), cx: 560, cy: 940 }) + temp + eng;
      },
    },
    {
      id: 'co', from: 17, // twenty minutes of exhaust, and all of it went inside
      draw(p, t, c) {
        const k = easeInOut(pop(c, 17, at(17, 1) * 0.85, 1.5));
        const inner = flow({ pts: [[44, 1184], [160, 1158], [300, 1152], [408, 1128], [424, 1010], [384, 900], [300, 806]], t, k })
          + flow({ pts: [[44, 1184], [220, 1160], [520, 1152], [640, 1124], [652, 1000], [640, 860], [604, 770]], t, k: 0.96 * k, seed: 0.45 });
        const scene = inCar({ t, dome: 0.5, dash: 1, key: 1, warm: 0.75, K: null, A: { eyes: 0, cover: 1 }, inner })
          + `<path d="M-30 1108 Q50 1040 140 1098 Q230 1176 340 1236 L340 1320 L-30 1320 Z" fill="${T.bank}"/><path d="M-30 1108 Q50 1040 140 1098 Q230 1176 340 1236" fill="none" stroke="${T.rim}" stroke-width="6" stroke-linecap="round" opacity="0.75"/>`;
        return cam(scene, { s: lerp(1.08, 1.2, easeInOut(p)), cx: 300, cy: 960, y: -130 })
          + gauge({ icon: 'engine', label: 'МОТОР РАБОТАЕТ', value: '20 МИН', accent: true });
      },
    },
    {
      id: 'door', from: 18, // the back door; she does not wake
      draw(p, t, c) {
        const open = easeOut(clamp(t / 0.3)), call = since(c, 18, at(18, 1));
        const scene = seatBack({ t, bench: true, dome: 0.6, warm: 0.2 }) + anya({ x: 540, y: 900, s: 1.45, t, eyes: 0, tilt: 15, cover: 1, bob: 0.25, pale: 0.25 });
        const door = open < 1 ? `<rect x="${n2(1080 * open)}" y="0" width="1100" height="1920" fill="${T.carDark}"/><rect x="${n2(1080 * open)}" y="0" width="26" height="1920" fill="${T.trim}"/>` : '';
        const shout = call > 0 && call < 1.5 ? `<g opacity="${n2(clamp((1.5 - call) * 2.5))}" transform="translate(${n2(Math.sin(call * 60) * 10 * Math.exp(-call * 5))} 0) rotate(-6 540 430)">${txt(540, 470, 'АНЯ!', { size: 150, fill: T.orange, extra: stroke })}</g>` : '';
        return cam(scene, { s: lerp(1, 1.16, easeInOut(p)), cx: 540, cy: 880, x: Math.sin(t * 50) * 14 * Math.exp(-t * 7) }) + door
          + snowfall({ t, count: 30, wind: 380, fall: 60, seed: 6, opacity: 0.6 * open }) + shout;
      },
    },
    {
      id: 'black', from: 19, caption: { y: 920, size: 104 }, // the last line on black
      draw(p, t) {
        const g = easeOut(clamp(t / 1.2));
        return `<rect width="1080" height="1920" fill="${T.void}"/>${snowfall({ t, count: 16, opacity: 0.3, seed: 8 })}<rect x="${n2(540 - 320 * g)}" y="1090" width="${n2(640 * g)}" height="7" rx="3" fill="${T.orange}" opacity="${n2(0.85 * g)}"/>`;
      },
    },
  ],
  endCard: { title: 'ТЫ БЫ ВЫЖИЛ?', line: 'СЕРИЯ 2 — ЗАВТРА', sub: 'подпишись, чтобы не пропустить' },
  cover: {
    ep: 1,
    title: ['МАШИНА', 'В КЮВЕТЕ'],
    hook: 'МИНУС 38. СВЯЗИ НЕТ',
    art: cam(ditch({ t: 1.2, who: 'a', moon: false }), { s: 1.12, cx: 520, cy: 1000, y: -140 }),
  },
  post: `Минус тридцать восемь. Машина в кювете, до посёлка сорок километров, связи нет. А на заднем сиденье спит сестра, ей девять 🥶

«Трасса. Минус 38», серия 1. Костя решает не идти за помощью, а остаться у машины. Это правильно. Но одну вещь он не проверил.

Серия 2 — завтра. Подпишись, чтобы не пропустить.

#выживание #зимник #мороз #минисериал #анимация`,
};
