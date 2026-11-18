// «Список», серия 2 «Три часа ночи». Аккаунт «Третье правило».
// Style 2 (kit/v2.js) with the details of kit/spisok.js and ./scenes.js. The picture follows the words through c.at /
// c.since. No lamps: the power is out; the dot on the dial of the receiver is the only amber thing in a room.
// The guarantee that breaks: «Постучат и уйдут. Дверь стальная». They knock, name the family, wait and leave: it seems
// to work. In the morning every door of the landing stands open with a chalk circle; on yours there is a cross.
// Silent clue: a wide double track of wheels across the yard at dawn (the bus; nobody mentions it).
// Counters: ДЕНЬ 5 at night, ДЕНЬ 6 in the morning; the address count turns 09 -> 10 in «tenth»; the clock 2:55, 3:00.
// For the voice (see ep01): dashes that open dialogue are left out of say; «Соне девять лет» stays in one phrase with
// the sentence before it; «адресов»/«адрес» only in the middle of a phrase.
import { lerp } from '../../kit/index.js';
import { V, FLOOR, theme, sine, ease, hop, travel, cam, bg, floor, person, tag, rollTag } from '../../kit/v2.js';
import { S, WIN, receiver, speech, windowCity, houses, flatDoor } from '../../kit/spisok.js';
import { chalkCross, tracks, knockShake } from './scenes.js';

const N = [
  { id: 'h1', text: 'Напомню. Каждую ночь радио читает *десять адресов*.', gap: 0.3 },
  { id: 'h2', text: 'А утром в этих квартирах *никого нет*.', gap: 0.5 },
  { id: 'tenth', text: 'Этой ночью десятым назвали *ваш* адрес.', gap: 0.3 },
  { id: 'two', text: 'И сказали, что вас *двое*.', gap: 0.55 },
  { id: 'dark', text: 'Свет погас во всей стране пять дней назад.', gap: 0.4 },
  { id: 'sister', text: 'Ты прячешь у себя *сестру*. Соне девять лет.', gap: 0.3 },
  { id: 'papers', text: 'По бумагам она должна быть в *интернате*.', gap: 0.5 },
  { id: 'steel', text: '— Постучат и уйдут, — говоришь ты. — Дверь *стальная*.', say: 'Постучат и уйдут, — говоришь ты. Дверь стальная.', gap: 0.55 },
  { id: 'hide', text: 'Без пяти три ты прячешь Соню в *кладовку*.', gap: 0.3 },
  { id: 'sit', text: 'Сам садишься у двери.', gap: 0.5 },
  { id: 'steps', text: 'Ровно в три в подъезде *шаги*.', gap: 0.35 },
  { id: 'slam', text: 'Наверху хлопает дверь.', gap: 0.3 },
  { id: 'down', text: 'Потом шаги идут вниз. *К вам*.', gap: 0.5 },
  { id: 'knock', text: 'В дверь *стучат*. Три раза, спокойно.', gap: 0.5 },
  { id: 'orlov', text: '— *Орлов*, — говорит мужской голос.', say: 'Орлов, — говорит мужской голос.', gap: 0.35 },
  { id: 'girl', text: '— И девочка с вами.', say: 'И девочка с вами.', gap: 0.3 },
  { id: 'minutes', text: '*Пятнадцать минут* на сборы.', gap: 0.6 },
  { id: 'breath', text: 'Ты не дышишь.', gap: 0.3 },
  { id: 'pantry', text: 'Из кладовки *ни звука*.', gap: 0.5 },
  { id: 'wait', text: 'За дверью ждут. Минуту. Две.', gap: 0.5 },
  { id: 'leave', text: 'Потом шаги уходят вниз.', gap: 0.4 },
  { id: 'worked', text: 'Дверь стальная. *Сработало*.', gap: 0.6 },
  { id: 'dawn', text: 'Под утро во дворе тихо и пусто.', gap: 0.5 },
  { id: 'out', text: 'Ты выходишь на площадку.', gap: 0.3 },
  { id: 'open', text: 'Все двери в подъезде *открыты*.', gap: 0.3 },
  { id: 'circle', text: 'У каждой двери мелом нарисован *круг*.', gap: 0.5 },
  { id: 'turn', text: 'Ты оборачиваешься к своей.', gap: 0.65 },
  { id: 'last', text: 'На вашей двери мелом *крест*.' },
];

const U = Object.fromEntries(N.map((u, i) => [u.id, i]));
// moments the picture reacts to: [phrase, number of the sentence in it]
const CUE = { named: ['sister', 1], steelSaid: ['steel', 1], toYou: ['down', 1], calm: ['knock', 1], two: ['wait', 2] };
const at = (c, key) => c.at(U[CUE[key][0]], CUE[key][1]);
const RX = WIN.x + WIN.w / 2, RY = WIN.y + WIN.h;
const you = (o) => person({ col: S.you, seed: 0, y: FLOOR + 8, ...o });
const sonya = (o) => person({ col: S.sonya, seed: 1, k: 0.62, y: FLOOR + 8, ...o });
const radio = (o) => receiver({ x: RX, y: RY, s: 0.95, needle: 0.8, knob: 380, ...o });
const COUNT = ['09', '10'];
const HALL = { cx: 640, x: -100 };
const DOOR = 820, PANTRY = 250; // the hall of the flat: the front door on the right, the pantry on the left
const hall = ({ chain = 1, shake = 0, pantry = 0 } = {}) =>
  flatDoor({ x: PANTRY, w: 150, h: 440, open: pantry }) + `<g transform="translate(${shake.toFixed(2)} 0)">${flatDoor({ x: DOOR, chain })}</g>` + floor();
const LAND = [[150, '5'], [480, '6'], [810, '8']]; // the landing of the second floor; yours is number seven

export default {
  series: 'Список',
  episode: 2,
  theme,
  gap: 0.25,
  tail: 1.1,
  endCardDur: 2.8,
  narration: N,
  shots: [
    {
      id: 'hook', from: U.h1, // reminder: the receiver on the sill reads addresses to a brother and a sister
      draw(p, t, c) {
        const scene = windowCity() + radio({ on: 1, pulse: speech(c.t) }) + floor()
          + you({ x: 170, t: c.t, look: 0.9, lookY: -0.1 }) + sonya({ x: 325, t: c.t, look: 0.9, lookY: -0.7 });
        return bg() + cam(scene, { s: lerp(1.07, 1, sine(p)) }) + tag({ text: '10 АДРЕСОВ', a: (t - 0.5) / 0.35 });
      },
    },
    {
      id: 'gone', from: U.h2, enter: 'left', // morning: open doors, nobody inside
      draw(p) {
        const doors = [[150, '10'], [480, '11'], [810, '12']].map(([x, num]) => flatDoor({ x, num, open: 1, mark: 1 })).join('');
        return bg() + cam(doors + floor(), { s: lerp(1, 1.06, sine(p)), cx: 527, x: 13 });
      },
    },
    {
      id: 'tenth', from: U.tenth, // the count turns to ten: theirs. Then: two of them
      draw(p, t, c) {
        const z = c.since(U.two);
        const scene = windowCity() + radio({ on: 1, pulse: speech(c.t) }) + floor()
          + you({ x: 300, t: c.t, look: 0.9, lookY: -0.1, worry: 0.5 + 0.4 * ease(z / 0.5) })
          + sonya({ x: 445, t: c.t, look: lerp(0.9, -0.9, ease((z - 0.3) / 0.5)), lookY: -0.75, worry: 0.8 * ease(z / 0.5) });
        return bg() + cam(scene, { s: lerp(1.15, 1.3, sine(p)), cx: 600, x: -60 })
          + rollTag({ values: COUNT, pos: ease((t - 0.9) / 0.45), size: 96, pad: 0.55, a: (t + 0.1) / 0.35 })
          + tag({ y: 580, text: 'ДВОЕ', a: (z - 0.6) / 0.35 });
      },
    },
    {
      id: 'city', from: U.dark, // the dark town, five days without light
      draw(p, t) {
        return bg() + cam(houses({ dim: [0.3, 0.3, 0.3] }) + floor(), { s: lerp(1, 1.06, sine(p)), x: lerp(-12, 12, sine(p)) }) + tag({ text: 'ДЕНЬ 5', a: (t - 0.6) / 0.35 });
      },
    },
    {
      id: 'sister', from: U.sister, // the hall: the two of them; by the papers she should be in a children's home
      draw(p, t, c) {
        const named = at(c, 'named'), k = c.since(U.papers), there = ease((k - 0.2) / 0.6);
        const scene = flatDoor({ x: DOOR, chain: 1 }) + floor()
          + sonya({ x: 335, t: c.t, look: 0.9, lookY: -0.6, hop: hop(named - 0.1, 14) })
          + you({ x: 480, t: c.t, look: lerp(-0.85, 0.85, there), lookY: lerp(0.6, -0.1, there), worry: 0.6 * there });
        return bg() + cam(scene, { s: lerp(1.12, 1.25, sine(p)), ...HALL }) + tag({ text: 'СОНЯ, 9 ЛЕТ', a: (named - 0.05) / 0.35 });
      },
    },
    {
      id: 'steel', from: U.steel, // «they will knock and go»: he taps the steel door
      draw(p, t, c) {
        const s = at(c, 'steelSaid'), sh = knockShake(s, [0.15, 0.45]);
        const scene = hall({ shake: sh }) + you({ x: 640, t: c.t, look: 0.9, lookY: -0.1, worry: 0.3 }) + sonya({ x: 470, t: c.t, look: 0.9, lookY: -0.6, worry: 0.4 });
        return bg() + cam(scene, { s: lerp(1.2, 1.32, sine(p)), ...HALL }) + tag({ text: 'ДВЕРЬ СТАЛЬНАЯ', a: (s + 0.1) / 0.4 });
      },
    },
    {
      id: 'hide', from: U.hide, // five to three: Sonya goes into the pantry, the pantry door shuts
      draw(p, t, c) {
        const d = c.dur(U.hide), w = travel(t, 0.1, 0.5 * d, 470, PANTRY, 110);
        const open = ease((t - 0.05) / 0.4) * (1 - ease((t - 0.62 * d) / 0.45)), gone = ease((t - 0.5 * d) / 0.3);
        const scene = hall({ pantry: open }) + (gone < 1 ? sonya({ x: w.x, t: c.t, walk: w, look: -0.9, lookY: -0.4, alpha: 1 - gone }) : '')
          + you({ x: 640, t: c.t, look: -0.8, lookY: 0.4, worry: 0.6 });
        return bg(V.deep) + cam(scene, { s: lerp(1.15, 1.1, sine(p)), cx: 540 }) + tag({ text: '2:55', size: 64, a: (t - 0.2) / 0.35 });
      },
    },
    {
      id: 'sit', from: U.sit, // he waits in the hall, right at the door
      draw(p, t, c) {
        const w = travel(t, 0, 1.6, 640, 700);
        const scene = hall() + you({ x: w.x, t: c.t, walk: w, look: 0.9, lookY: lerp(-0.1, 0.4, ease((t - 1.6) / 0.6)), worry: 0.7 });
        return bg(V.deep) + cam(scene, { s: lerp(1.3, 1.45, sine(p)), cx: 760, x: -40 });
      },
    },
    {
      id: 'steps', from: U.steps, // three sharp: steps on the stairs; a door bangs above; the steps come down to them
      draw(p, t, c) {
        const sl = c.since(U.slam), dn = c.since(U.down), near = at(c, 'toYou');
        const look = sl < 0 ? 0.9 : dn < 0 ? 0.6 : 0.9;
        const scene = hall() + you({ x: 700, t: c.t, look, lookY: lerp(-0.1, dn < 0 ? -0.8 : -0.1, ease((sl + 0.05) / 0.4)), worry: 0.7 + 0.3 * ease(near / 0.4), hop: hop(sl - 0.1, 10) });
        return bg(V.deep) + cam(scene, { s: lerp(1.45, 1.7, sine(p)), cx: 780, x: -40 }) + tag({ text: '3:00', size: 64, a: (t + 0.1) / 0.35 });
      },
    },
    {
      id: 'knock', from: U.knock, // a knock: three times, calm; the door shivers on its chain
      draw(p, t, c) {
        const sh = knockShake(t - 0.1);
        const scene = hall({ shake: sh }) + you({ x: 640, t: c.t, look: 0.9, lookY: -0.1, worry: 1, hop: hop(t - 0.15, 12) });
        return bg(V.deep) + cam(scene, { s: lerp(1.6, 1.75, sine(p)), cx: DOOR, x: 540 - DOOR + 60 });
      },
    },
    {
      id: 'voice', from: U.orlov, // a man's voice names the family, and the girl; fifteen minutes to pack
      draw(p, t, c) {
        const g = c.since(U.girl), m = c.since(U.minutes);
        const scene = hall() + you({ x: 640, t: c.t, look: lerp(0.9, -0.8, ease((g - 0.3) / 0.5)), lookY: 0.2, worry: 1 });
        return bg(V.deep) + cam(scene, { s: lerp(1.35, 1.5, sine(p)), cx: 560 }) + tag({ text: '15 МИНУТ', a: (m + 0.1) / 0.4 });
      },
    },
    {
      id: 'pantry', from: U.breath, // he does not breathe; not a sound from the pantry
      draw(p, t, c) {
        const scene = hall() + you({ x: 640, t: c.t, look: -0.9, lookY: 0.3, worry: 1 });
        return bg(V.deep) + cam(scene, { s: lerp(1.4, 1.9, sine(p)), cx: PANTRY, x: 540 - PANTRY + lerp(160, 40, sine(p)) });
      },
    },
    {
      id: 'wait', from: U.wait, // they wait behind the door: one minute, two. Then the steps go down
      draw(p, t, c) {
        const l = c.since(U.leave);
        const scene = hall() + you({ x: 660, t: c.t, look: 0.9, lookY: lerp(-0.1, 0.5, ease(l / 0.8)), worry: 1 - 0.4 * ease(l / 1) });
        return bg(V.deep) + cam(scene, { s: lerp(1.5, 1.35, sine(p)), cx: 760, x: -40 })
          + rollTag({ values: ['1 МИНУТА', '2 МИНУТЫ'], pos: ease((at(c, 'two') + 0.05) / 0.4), a: (t - 0.3) / 0.35 });
      },
    },
    {
      id: 'worked', from: U.worked, // «the door is steel, it worked»: the pantry opens, Sonya comes out
      draw(p, t, c) {
        const op = ease((t - 0.4) / 0.6), w = travel(t, 0.9, 1.4, PANTRY, 430, 110);
        const scene = hall({ pantry: op }) + (op > 0.4 ? sonya({ x: w.x, t: c.t, walk: w, look: 0.9, lookY: -0.6 }) : '')
          + you({ x: 640, t: c.t, look: -0.8, lookY: 0.4, worry: 0.2 });
        return bg(V.deep) + cam(scene, { s: lerp(1.15, 1.1, sine(p)), cx: 540 });
      },
    },
    {
      id: 'dawn', from: U.dawn, // dawn: the yard is quiet and empty; a wide double track runs across it (nobody says so)
      draw(p, t) {
        return bg(V.mid) + cam(houses({ body: V.obj }) + floor() + tracks({ a: (t + 0.2) / 0.8 }), { s: lerp(1, 1.08, sine(p)), x: lerp(-20, 20, sine(p)) })
          + tag({ text: 'ДЕНЬ 6', a: (t - 0.4) / 0.35 });
      },
    },
    {
      id: 'landing', from: U.out, // the landing: every door open; a chalk circle by each one
      draw(p, t, c) {
        const o = c.since(U.open), ci = c.since(U.circle);
        const doors = LAND.map(([x, num], j) => flatDoor({ x, num, open: (o - 0.05 - 0.3 * j) / 0.8, mark: (ci - 0.1 - 0.35 * j) / 0.6 })).join('');
        const w = travel(t, 0, 1.6, -120, 120);
        return bg() + cam(doors + floor() + you({ x: w.x, t: c.t, walk: w, look: 0.9, lookY: -0.1, worry: 0.6 }), { s: lerp(1, 1.08, sine(p)), cx: 527, x: 13 });
      },
    },
    {
      id: 'own', from: U.turn, // he turns to his own door, number seven
      draw(p, t, c) {
        const l = c.since(U.last);
        const scene = flatDoor({ x: 640, num: '7' }) + chalkCross({ x: 640, a: (l + 0.2) / 1 }) + floor()
          + you({ x: 430, t: c.t, look: lerp(-0.9, 0.9, ease((t - 0.2) / 0.5)), lookY: -0.1, worry: 0.5 + 0.5 * ease(l / 0.6) });
        return bg() + cam(scene, { s: lerp(1.1, 1.4, sine(p)), cx: 640, x: -40 });
      },
    },
  ],
  endCard: { line: 'Продолжение завтра', sub: 'Серия 3' },
  cover: {
    ep: 2,
    title: ['ТРИ ЧАСА', 'НОЧИ'],
    hook: 'ПОСТУЧАТ И УЙДУТ',
    hookHi: 'УЙДУТ',
    art: flatDoor({ x: 700, chain: 1 }) + floor() + person({ col: S.you, seed: 0, x: 420, y: FLOOR + 8, look: 0.9, lookY: -0.1, worry: 1 }),
  },
  post: `Этой ночью радио назвало ваш адрес. В три часа в дверь постучали и назвали фамилию.

«Список», серия 2.

#список #минисериал #анимация #тайна #городбезсвета`,
};
