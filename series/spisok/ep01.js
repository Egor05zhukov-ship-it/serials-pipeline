// «Список», серия 1 «Десятый адрес». Аккаунт «Третье правило».
// Style 2 (kit/v2.js) with the details of this series from kit/spisok.js. No cuts: the picture follows the words through
// c.at / c.since, never through seconds of the voice file. Every draw() must stand a little time before its first word
// and after its last: the neighbouring shots are drawn together while one dissolves or slides into the other.
// The power is out in the story, so no shot has a lamp: the sky in the window is the light shape of a room, the dot on
// the dial of the receiver is the only amber thing in it.
// 17 shots; «flat» holds two pictures (the landing, then the kitchen) and slides from one to the other by itself.
// Silent clue: a chalk circle on the wall by every open door (gone, flat, more). Nobody mentions it; episode 2 ends on
// a chalk cross on their own door.
// Counters: the day without light as a tag (ДЕНЬ 3, ДЕНЬ 5) and the number of the address in the broadcast: it rolls
// 01-10 in «ten», and in «on» it runs to 09 and turns to 10 on «Десятым он называет ваш».
import { lerp } from '../../kit/index.js';
import { V, FLOOR, theme, sine, ease, hop, travel, cam, bg, floor, person, tag, rollTag } from '../../kit/v2.js';
import { S, WIN, receiver, speech, windowCity, shelf, houses, flatDoor, table, chair, mug, notebook } from '../../kit/spisok.js';

// text = what the captions show; say = the same words for the voice where it needs help (see series/ubezhishche/ep01.js).
// gap = the pause after the phrase. id = the name the shots know the phrase by.
// Version 2 (17.11.2026): the text of the second blind panel (the sister by name, the one rule, the ending that breaks it).
// The words are the panel's. What is done for the voice and for tools/phrase_check.py:
//   - «адреса» at the end of a phrase came out as «а́дреса». An acute («адреса́», «адресо́в») was heard by the recogniser
//     as an extra sound («адресаю», «адресоев»), a capital vowel did not move the stress. What works is an ellipsis in
//     say («Он читает адреса…»): the same words, the stress on the last syllable, a clean take. «адресов» is read right
//     without any mark (measured on the takes: the first «а» is short and reduced, the last vowel is a full «о»).
//   - «двенадцатой квартиры»: the recogniser writes the ordinal as «12-й», and the check cannot compare that with the
//     word. So the caption says «12-й» and say keeps the word: the voice reads the line as it was written.
//   - a dash that opens a line of dialogue is left out of say.
//   - «Соне девять лет» stays in one phrase with the sentence before it: cut alone, the recogniser wrote «Sony 9 лет».
const N = [
  { id: 'h1', text: 'Каждую ночь радио читает *десять адресов*.', gap: 0.3 },
  { id: 'h2', text: 'А утром в этих квартирах *никого нет*.', gap: 0.5 },
  { id: 'dark', text: 'Свет погас *во всей стране* три дня назад.', gap: 0.3 },
  { id: 'nolink', text: 'Ни связи, ни новостей.', gap: 0.45 },
  { id: 'you', text: 'Ты живёшь вдвоём с *сестрой*. Соне девять лет.', gap: 0.4 },
  { id: 'secret', text: 'О том, что она у тебя, *не знает никто*.', gap: 0.3 },
  { id: 'take', text: 'Иначе её заберут.', gap: 0.45 },
  { id: 'rule', text: 'Поэтому у вас одно правило: *дверь не открывать*.', gap: 0.3 },
  { id: 'noone', text: 'Никому.', gap: 0.55 },
  { id: 'found', text: 'На третий день ты находишь дедушкин *приёмник* на батарейках.', gap: 0.4 },
  { id: 'knob', text: 'Крутишь ручку.', gap: 0.3 },
  { id: 'noise', text: 'Шум. Шум.', gap: 0.35 },
  { id: 'voice', text: 'И вдруг *голос*.', gap: 0.3 },
  { id: 'calm', text: 'Спокойный, как у диктора.', gap: 0.45 },
  { id: 'reads', text: 'Он читает *адреса*.', say: 'Он читает адреса…', gap: 0.45 },
  { id: 'sadovaya', text: '— Улица *Садовая*, дом четыре, квартира двенадцать.', say: 'Улица Садовая, дом четыре, квартира двенадцать.', gap: 0.5 },
  { id: 'ten', text: 'Десять адресов.', gap: 0.3 },
  { id: 'three', text: 'Ровно в *три часа* ночи.', gap: 0.35 },
  { id: 'silence', text: 'Потом тишина.', gap: 0.6 },
  { id: 'go', text: 'Утром ты идёшь на Садовую.', gap: 0.3 },
  { id: 'yard', text: 'Это через двор.', gap: 0.5 },
  { id: 'door', text: 'Дверь 12-й квартиры *открыта*.', say: 'Дверь двенадцатой квартиры открыта.', gap: 0.5 },
  { id: 'tea', text: 'На столе чай.', gap: 0.3 },
  { id: 'hot', text: 'Ещё *горячий*.', gap: 0.45 },
  { id: 'nobody', text: '*Людей нет.*', gap: 0.6 },
  { id: 'next', text: 'На следующую ночь он читает ещё десять адресов.', gap: 0.3 },
  { id: 'empty', text: 'Утром пустеют ещё десять квартир.', gap: 0.5 },
  { id: 'write', text: 'Ты записываешь их в тетрадь.', gap: 0.3 },
  { id: 'order', text: 'И замечаешь *порядок*.', gap: 0.5 },
  { id: 'street', text: 'Он идёт по улицам подряд.', gap: 0.3 },
  { id: 'house', text: 'Дом за домом.', gap: 0.35 },
  { id: 'closer', text: 'Всё ближе к *вашему*.', gap: 0.6 },
  { id: 'ask', text: '— А нас тоже прочитают? — спрашивает Соня.', say: 'А нас тоже прочитают? — спрашивает Соня.', gap: 0.4 },
  { id: 'answer', text: '— Нас *нет в списках*, — говоришь ты.', say: 'Нас нет в списках, — говоришь ты.', gap: 0.65 },
  { id: 'on', text: 'В три часа ночи ты включаешь приёмник.', gap: 0.45 },
  { id: 'nine', text: '*Девять* адресов.', gap: 0.55 },
  { id: 'tenth', text: 'Десятым он называет *ваш*.', gap: 0.6 },
  { id: 'last', text: 'И добавляет: | «Двое. Взрослый и *девочка*».', say: 'И добавляет: «Двое. Взрослый и девочка».' },
];

const U = Object.fromEntries(N.map((u, i) => [u.id, i]));
// Moments the picture reacts to: [phrase, number of the sentence in it]. When a phrase is split, only this table changes.
const CUE = { named: ['you', 1], hiss1: ['noise', 0], hiss2: ['noise', 1] };
const at = (c, key) => c.at(U[CUE[key][0]], CUE[key][1]); // seconds since that moment (negative before it)
const RX = WIN.x + WIN.w / 2, RY = WIN.y + WIN.h; // the receiver stands in the middle of the sill
const you = (o) => person({ col: S.you, seed: 0, y: FLOOR + 8, ...o });
const sonya = (o) => person({ col: S.sonya, seed: 1, k: 0.62, y: FLOOR + 8, ...o });
const radio = (o) => receiver({ x: RX, y: RY, s: 0.95, needle: 0.8, knob: 380, ...o });
const COUNT = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];
const SIGN = 'САДОВАЯ, 4';
const HALL = { cx: 640, x: -100 }; // the hall of the flat: «sister» and «rule» share one camera, so one runs on into the other
// Two pictures in one shot: the second slides in from the right, the way enter: 'left' of the kit does it (u = 0..1).
const slide = (a, b, u) => {
  const e = ease(u), part = (s, dx) => `<g transform="translate(${(1080 * dx).toFixed(1)} 0)"><g clip-path="url(#fc)">${s}</g></g>`;
  return e <= 0 ? a : e >= 1 ? b : part(a, -e) + part(b, 1 - e);
};

export default {
  series: 'Список',
  episode: 1,
  theme,
  gap: 0.25,
  tail: 1.1,
  endCardDur: 2.8,
  narration: N,
  shots: [
    {
      id: 'hook', from: U.h1, // the hook: a dark room, the old receiver on the sill reads addresses to a brother and a sister
      draw(p, t, c) {
        const scene = windowCity() + radio({ on: 1, pulse: speech(c.t) }) + floor()
          + you({ x: 170, t: c.t, look: 0.9, lookY: -0.1 }) + sonya({ x: 325, t: c.t, look: 0.9, lookY: -0.7 });
        return bg() + cam(scene, { s: lerp(1.07, 1, sine(p)) }) + tag({ text: '10 АДРЕСОВ', a: (t - 0.5) / 0.35 });
      },
    },
    {
      id: 'gone', from: U.h2, enter: 'left', // morning: three flats, three open doors, nobody inside
      draw(p) {
        const doors = [[150, '10'], [480, '11'], [810, '12']].map(([x, num]) => flatDoor({ x, num, open: 1, mark: 1 })).join('');
        return bg() + cam(doors + floor(), { s: lerp(1, 1.06, sine(p)), cx: 527, x: 13 });
      },
    },
    {
      id: 'city', from: U.dark, // three evenings ago: the windows of the yard go dark one after another and stay dark
      draw(p, t) {
        const lit = [[0, 1], [2, 2], [1, 0], [0, 4], [2, 5], [1, 3], [0, 2], [2, 0]].map(([b, w], j) => [b, w, 1 - ease((t - 0.25 - 0.2 * j) / 0.45)]);
        return bg() + cam(houses({ lit }) + floor(), { s: lerp(1, 1.06, sine(p)), x: lerp(-12, 12, sine(p)) }) + tag({ text: 'ДЕНЬ 3', a: (t - 1.7) / 0.35 });
      },
    },
    {
      id: 'sister', from: U.you, // the hall of grandfather's flat: the two of them. Nobody knows she is here: she goes behind his back
      draw(p, t, c) {
        const named = at(c, 'named'), k = c.since(U.secret), hide = travel(k, 0.1, 1.5, 600, 335, 110), there = ease((k - 0.4) / 0.6);
        const scene = flatDoor({ x: 820, chain: 0 }) + floor()
          + sonya({ x: hide.x, t: c.t, walk: hide, look: lerp(-0.9, 0.9, ease((k - 1.4) / 0.4)), lookY: -0.6, hop: hop(named - 0.1, 14) })
          + you({ x: 430, t: c.t, look: 0.85, lookY: lerp(0.6, -0.1, there), worry: 0.6 * there });
        return bg() + cam(scene, { s: lerp(1.12, 1.25, sine(p)), ...HALL }) + tag({ text: 'СОНЯ, 9 ЛЕТ', a: (named - 0.05) / 0.35 });
      },
    },
    {
      id: 'rule', from: U.take, // the one rule: they go to the door, the chain is lifted and slid home
      draw(p, t, c) {
        const r = c.since(U.rule), i = travel(t, -0.1, 1.4, 430, 590), v = travel(t, 0.15, 1.5, 335, 440, 110);
        const scene = flatDoor({ x: 820, chain: (r - 0.5 * c.dur(U.rule)) / 1.3 }) + floor() // «…дверь не открывать»
          + sonya({ x: v.x, t: c.t, walk: v, look: 0.9, lookY: -0.5, worry: 0.5 })
          + you({ x: i.x, t: c.t, walk: i, look: 0.9, lookY: -0.1, worry: 0.6 });
        return bg() + cam(scene, { s: lerp(1.25, 1.42, sine(p)), ...HALL });
      },
    },
    {
      id: 'find', from: U.found, // day three: grandfather's receiver on the top shelf
      draw(p, t, c) {
        const i = travel(t, -0.3, 1.8, -130, 250), v = travel(t, 0, 2, -260, 420, 110), seen = ease((t - 1.5) / 0.5);
        const scene = shelf() + receiver({ x: 800, y: 640, s: 0.95, ant: 0.25 }) + floor()
          + you({ x: i.x, t: c.t, walk: i, look: 0.8, lookY: -0.9 * seen })
          + sonya({ x: v.x, t: c.t, walk: v, look: 0.9, lookY: -0.9 * seen, hop: hop(t - 2.7, 14) });
        return bg() + cam(scene, { s: lerp(1.04, 1.16, sine(p)), cx: 600 });
      },
    },
    {
      id: 'tune', from: U.knob, // close on the receiver: the knob turns, the needle crawls through the noise and stops on a voice
      draw(p, t, c) {
        const v = c.since(U.voice), found = ease((v + 0.05) / 0.4);
        const turn = ease(t / 0.9) + ease(at(c, 'hiss1') / 0.45) + ease(at(c, 'hiss2') / 0.45) + ease((v + 0.25) / 0.4); // four turns of the knob
        const scene = windowCity() + radio({ on: ease((t + 0.2) / 0.5), needle: 0.08 + 0.18 * turn + 0.012 * (1 - found) * Math.sin(c.t * 26), knob: 95 * turn, pulse: found * speech(c.t) });
        return bg() + cam(scene, { s: lerp(1.55, 1.7, sine(p)), cx: RX, cy: 790, x: 540 - RX, y: -40 }) + floor();
      },
    },
    {
      id: 'addr', from: U.reads, // it reads addresses. The first one is the house across the yard
      draw(p, t, c) {
        const to = sine((c.since(U.sadovaya) + 0.3) / 2.8);
        return bg() + cam(houses({ sign: SIGN }) + floor(), { s: 1 + 0.02 * sine(p) + 0.2 * to, cx: 885, x: -70 * to });
      },
    },
    {
      id: 'ten', from: U.ten, // ten addresses at three sharp; then the dot on the dial goes out
      draw(p, t, c) {
        const q = c.since(U.silence), off = ease((q - 0.1) / 0.7), span = t - q - 0.25; // the count runs until «Потом тишина»
        const scene = windowCity() + radio({ on: 1 - off, pulse: speech(c.t) * (1 - off) }) + floor()
          + you({ x: 170, t: c.t, look: 0.9, lookY: -0.1, worry: 0.7 })
          + sonya({ x: 325, t: c.t, look: lerp(-0.9, 0.9, ease((t - 0.2) / 0.5)), lookY: -0.65 });
        return bg() + cam(scene, { s: lerp(1.05, 1, sine(p)) }) + rollTag({ values: COUNT, pos: 9 * sine((t - 0.05) / span), size: 96, pad: 0.55, a: (t + 0.1) / 0.35 });
      },
    },
    {
      id: 'yard', from: U.go, // morning: across the yard to the house with the plate
      draw(p, t, c) {
        const w = travel(t, -0.1, 3, 150, 610);
        const scene = houses({ sign: SIGN, body: V.obj }) + floor() + you({ x: w.x, t: c.t, walk: w, look: 0.9, lookY: -0.2 });
        return bg(V.mid) + cam(scene, { s: lerp(1, 1.06, sine(p)), x: lerp(20, -30, sine(p)) });
      },
    },
    {
      id: 'flat', from: U.door, // the landing: flat twelve stands open. Then the picture slides on into its kitchen: tea, still hot, a chair pushed back, nobody
      draw(p, t, c) {
        const w = travel(t, -0.4, 1.6, 170, 380), see = ease((t - 0.9) / 0.6), back = sine((c.since(U.nobody) + 0.25) / 1.1);
        const landing = bg() + cam(flatDoor({ x: 660, num: '12', open: 1, mark: 1 }) + floor()
          + you({ x: w.x, t: c.t, walk: w, look: 0.9, lookY: -0.1, worry: 0.7 * see }), { s: lerp(1.2, 1.36, sine((t + 0.2) / 3)), cx: 560, x: -20 });
        const kitchen = bg() + cam(table({ x: 640 }) + mug({ x: 640, y: FLOOR - 210, t: c.t }) + chair({ x: 190 }) + floor(), { s: lerp(1.5, 1, back), cx: 640, x: lerp(-100, 0, back) });
        return slide(landing, kitchen, (c.since(U.tea) + 0.2) / 0.47);
      },
    },
    {
      id: 'more', from: U.next, // the next night ten more; in the morning three more doors swing open, one after another
      draw(p, t, c) {
        const m = c.since(U.empty);
        const doors = [[150, '31'], [480, '32'], [810, '33']].map(([x, num], j) => flatDoor({ x, num, open: (m - 0.05 - 0.4 * j) / 0.9, mark: (m - 0.75 - 0.4 * j) / 0.6 })).join('');
        return bg() + cam(doors + floor(), { s: lerp(1.06, 1, sine(p)), cx: 527, x: 13 })
          + rollTag({ values: ['10 КВАРТИР', '20 КВАРТИР'], pos: ease((m - 0.5 * c.dur(U.empty)) / 0.45), a: (t - 0.3) / 0.35 });
      },
    },
    {
      id: 'notebook', from: U.write, // the notebook: the same street again and again, the house numbers in a row
      draw(p, t, c) {
        const o = c.since(U.order);
        const rows = ['4', '6', '8', '10', '12'].map((num, i) => ({ num, a: i < 3 ? 1 : (t - 0.1 - (i - 3) * 0.85) / 0.8, hi: (o - 0.1 - 0.13 * i) / 0.35 }));
        return bg() + cam(notebook({ rows }), { s: lerp(1, 1.05, sine(p)), cy: 860 }) + floor();
      },
    },
    {
      id: 'map', from: U.street, // house after house: the dark crosses the yard towards their own door
      draw(p, t, c) {
        const k = c.since(U.closer), near = sine((k + 0.3) / 1.4), fear = ease(k / 0.6);
        const scene = houses({ dim: [0, (c.since(U.house) - 0.05) / 0.7, (t - 0.15) / 0.8], sign: SIGN }) + floor()
          + you({ x: 120, t: c.t, look: 0.9, lookY: -0.2, worry: 0.9 * fear })
          + sonya({ x: 262, t: c.t, look: lerp(0.9, -0.9, ease((k - 0.3) / 0.5)), lookY: -0.6, worry: 0.6 * fear });
        return bg() + cam(scene, { s: lerp(1, 1.14, near), x: lerp(0, 120, near) });
      },
    },
    {
      id: 'ask', from: U.ask, // day five, by the silent receiver: she asks, he lies and looks away
      draw(p, t, c) {
        const a = c.since(U.answer), toHer = ease((t - 0.6) / 0.5), away = ease((a - 0.75 * c.dur(U.answer)) / 0.5);
        const scene = windowCity() + radio() + floor()
          + you({ x: 300, t: c.t, look: lerp(lerp(0.5, 0.85, toHer), 0.9, away), lookY: lerp(lerp(-0.1, 0.6, toHer), -0.1, away), worry: 0.3 + 0.5 * away })
          + sonya({ x: 445, t: c.t, look: -0.9, lookY: -0.7, hop: hop(t - 0.1, 10), worry: 0.5 * ease(t / 0.5) });
        return bg() + cam(scene, { s: lerp(1.1, 1.2, sine(p)), cx: 560, x: -20 }) + tag({ text: 'ДЕНЬ 5', a: (t - 0.3) / 0.35 });
      },
    },
    {
      id: 'on', from: U.on, // three o'clock: the dial lights up, the count runs to nine; the tenth address is theirs
      draw(p, t, c) {
        const lit = ease((t - 1.15) / 0.45), q = c.since(U.nine), z = c.since(U.tenth), run = t - q + 0.9 * c.dur(U.nine) - 1.5; // nine is reached as «Девять адресов» ends
        const scene = windowCity() + radio({ on: lit, pulse: speech(c.t) * lit }) + floor()
          + you({ x: 300, t: c.t, look: 0.9, lookY: -0.1, worry: 0.4 + 0.3 * ease(q / 1) + 0.3 * ease(z / 0.5) })
          + sonya({ x: 445, t: c.t, look: lerp(0.9, -0.9, ease((z - 0.6) / 0.5)), lookY: -0.75, worry: 0.9 * ease(z / 0.5) });
        return bg() + cam(scene, { s: lerp(1, 1.26, sine(p)), cx: 600, x: -60 })
          + rollTag({ values: COUNT, pos: 8 * sine((t - 1.5) / run) + ease((z - 0.1) / 0.45), size: 96, pad: 0.55, a: (t - 1.3) / 0.35 });
      },
    },
    {
      id: 'black', from: U.last, caption: { y: 960, size: 108, max: 940, push: 0.05 }, // the last line alone
      draw() { return bg(V.deep); },
    },
  ],
  endCard: { line: 'Продолжение завтра', sub: 'Серия 2' },
  cover: {
    ep: 1,
    title: ['ДЕСЯТЫЙ', 'АДРЕС'],
    hook: 'РАДИО ЧИТАЕТ АДРЕСА',
    hookHi: 'АДРЕСА',
    art: windowCity() + radio({ on: 1 }) + floor() + you({ x: 170, look: 0.9, lookY: -0.1 }) + sonya({ x: 325, look: 0.9, lookY: -0.7, worry: 0.8 }),
  },
  post: `Во всей стране погас свет. Каждую ночь в три часа приёмник читает десять адресов, а утром в этих квартирах никого нет.

«Список», серия 1.

#список #минисериал #анимация #тайна #городбезсвета`,
};
