// «Колесо», серия 1 «Двенадцатый огонь». Аккаунт «Ты бы выжил?». Вторая редакция, формат 4 (19.11.2026).
// What changed after the owner's notes: the daughter is not introduced («С тобой дочь», no age, no name tag), the
// arithmetic is gone from the voice (24 cabins, 11 of 24, three nights ago: the counter on the screen is enough), there
// is a new riddle in the middle (nobody has seen who turns the wheel), the people are the ones of kit/people.js, and
// the episode ends with the viewer's choice and a call for comments.
// No cuts: the picture follows the words through c.at / c.since, never through seconds of the voice file. Every draw()
// stands a little time before its first word and after its last: neighbouring shots are drawn together in a dissolve.
// Scenes and their colours: sunset (hook, safe, lower, crowd), day (daughter, top, scream), night (power, turn,
// lights, count, nums, empty), dawn (out, roof), the choice card.
// Silent clue for episode 2: the cabin under the heroes is the only one that never had anyone at its window.
import { lerp } from '../../kit/index.js';
import { theme, sine, ease, travel, cam, steps, choiceCard } from '../../kit/v2.js';
import { human } from '../../kit/people.js';
import {
  K, SUN, DAY, NIGHT, DAWN, OCC, ROOM, spot, wheel, lights, platform, ground, sunSky, daySky, nightSky, dawnSky,
  tiny, dead, deadCrowd, cabinRoom, benchFront, popcorn, bottle, flashlight, glassRoof, midTag, bigCount, cabin,
} from '../../kit/koleso.js';

// text = what the captions show; say = the same words for the voice where it needs help. gap = the pause after the
// phrase. id = the name the shots know the phrase by. Short sentences in a row are separate phrases.
const N = [
  { id: 'z', text: 'Зомби-апокалипсис.', gap: 0.2 },
  { id: 'stuck', text: 'Ты застрял на *колесе обозрения*.', gap: 0.35 },
  { id: 'safe', text: 'Мёртвым сюда *не залезть*.', gap: 0.35 },
  { id: 'lower', text: 'Но каждую ночь колесо опускает вас *на одну кабину*.', gap: 0.5 },
  { id: 'dau', text: 'С тобой *дочь*.', gap: 0.35 },
  { id: 'came', text: 'Три дня назад вы пришли *покататься*.', gap: 0.3 },
  { id: 'top', text: 'Наверху колесо *встало*.', gap: 0.3 },
  { id: 'scream', text: 'Внизу *закричали*.', gap: 0.45 },
  { id: 'crowd', text: 'К вечеру под колесом стояла *толпа*.', gap: 0.25 },
  { id: 'quiet', text: 'И в ней уже никто *не кричал*.', gap: 0.5 },
  { id: 'power', text: 'Электричества нет *во всём городе*.', gap: 0.3 },
  { id: 'turn', text: 'Но каждую полночь колесо *проворачивается*.', gap: 0.2 },
  { id: 'self', text: '*Само*.', gap: 0.4 },
  { id: 'who', text: 'Ты ни разу не видел, *кто его крутит*.', gap: 0.5 },
  { id: 'others', text: 'В других кабинах тоже *люди*.', gap: 0.25 },
  { id: 'torch', text: 'Ночью все зажигают *фонарики*.', gap: 0.25 },
  { id: 'alive', text: 'Так вы считаете *живых*.', gap: 0.4 },
  { id: 'yest', text: 'Вчера их было *11*.', say: 'Вчера их было одиннадцать.', gap: 0.45 },
  { id: 'count', text: 'Сегодня считала *Варя*.', gap: 0.35 },
  { id: 'n10', text: 'Десять.', gap: 0.3 },
  { id: 'n11', text: 'Одиннадцать.', gap: 0.45 },
  { id: 'twelve', text: '— Пап. *Двенадцать*.', say: 'Пап. Двенадцать.', gap: 0.55 },
  { id: 'empty', text: '12-й горел в *пустой* кабине.', say: 'Двенадцатый горел в пустой кабине.', gap: 0.25 },
  { id: 'below', text: 'Прямо *под вами*.', gap: 0.55 },
  { id: 'out', text: 'К утру он *погас*.', gap: 0.45 },
  { id: 'last', text: 'А на крыше вашей кабины | остались *следы*.', gap: 0.35 },
  { id: 'small', text: '*Детские*.', gap: 0.7 },
  { id: 'q', text: 'Что делать?', gap: 0.3 },
  { id: 'optA', text: 'Вариант А. Выйти на крышу.', gap: 0.3 },
  { id: 'optB', text: 'Вариант Б. Ждать ночи.', gap: 0.35 },
  { id: 'call', text: 'Пиши в комментариях.' },
];

const U = Object.fromEntries(N.map((u, i) => [u.id, i]));
// the heroes inside the cabin: they stand behind the bench, so only the upper halves are seen
const dad = (o) => human({ col: K.dad, hair: K.dadHair, seed: 0, y: 1104, k: 1.15, shadow: false, ...o });
const varya = (o) => human({ col: K.varya, hair: K.varyaHair, wear: 'dress', seed: 1, k: 0.72, y: 1104, shadow: false, ...o });
// the lights that are on before Varya counts: all of OCC but the two she adds with «десять, одиннадцать»
const LATE = [14, 6], EARLY = OCC.filter((i) => !LATE.includes(i));
// order in which the eleven lights come on in «lights» (around the wheel, from the top)
const ROUND = [21, 22, 0, 2, 4, 6, 8, 14, 16, 18, 20];
// the hook picture: the wheel black against the sunset, the dead around the platform (also the cover)
const hookArt = (t = 0, look = -0.3) => sunSky() + wheel({ pal: SUN }) + platform({ pal: SUN }) + ground(SUN.ground)
  + deadCrowd({ x0: 70, x1: 1010, y: 1226, count: 30, s: 0.25, t, seed: 3, lookY: look });
// The close shot of the heroes' cabin and the one under it: a wheel of radius 1400 with big cabins, its hub far below
// on the left, so the two cabins hang across the middle of the frame. The heroes are seen in their window.
const BIG = { cx: -561, cy: 1405, R: 1400 };
const heads = () => tiny({ x: -9, y: 96, s: 0.16, col: K.dad, hair: K.dadHair, seed: 0, look: 0.5, lookY: 0.5 })
  + tiny({ x: 12, y: 96, s: 0.16, k: 0.72, col: K.varya, hair: K.varyaHair, wear: 'dress', seed: 1, look: 0.9, lookY: 0.8 });
const close = ({ pal, lit, s = 3 }) => wheel({ ...BIG, s, pal, lit, k: 3.2, legs: false, inside: { 0: heads() } });
// a city without a single lit window, far behind the wheel
const skyline = () => [[-40, 250, 330], [200, 170, 250], [360, 230, 420], [590, 150, 300], [730, 240, 380], [960, 200, 270]]
  .map(([x, w, h]) => `<rect x="${x}" y="${1200 - h}" width="${w}" height="${h + 20}" fill="${NIGHT.win}"/>`).join('');

export default {
  series: 'Колесо',
  episode: 1,
  theme,
  gap: 0.25,
  tail: 0.5,
  endCardDur: 2.4,
  narration: N,
  choice: { a: 'Выйти на крышу', b: 'Ждать ночи' },
  shots: [
    {
      id: 'hook', from: U.z, // the wheel black against the sunset, the dead small around it; the counter is there from frame 0
      draw(p, t, c) {
        return cam(hookArt(c.t), { s: lerp(1, 1.06, sine(p)), cy: 900 }) + midTag({ text: 'ДО ЗЕМЛИ 9 НОЧЕЙ', y: 372, size: 80 });
      },
    },
    {
      id: 'safe', from: U.safe, // the foot of the wheel, close: the dead stand against the low sun and look up
      draw(p, t, c) {
        const back = cam(sunSky({ sun: false }) + wheel({ pal: SUN }) + platform({ pal: SUN, booth: false }) + ground(SUN.ground), { s: lerp(2.1, 2.2, sine(p)), cx: 300, cy: 1150, x: 240 });
        const near = [110, 262, 420, 610, 770, 930].map((x, i) => dead({ x, y: 1222 + 10 * (i % 2), s: 0.56, t: c.t, seed: 20 + i, lookY: -1, look: i < 3 ? 0.4 : -0.4 })).join('');
        return back + near + ground(SUN.ground, 1214);
      },
    },
    {
      id: 'lower', from: U.lower, // the heroes' cabin up on the rim: the wheel turns one cabin on and stops
      draw(p, t, c) {
        const s = 2 + ease((c.since(U.lower) - 0.4) / 2);
        return cam(sunSky() + wheel({ pal: SUN, s }), { s: 1.6, cx: 795, cy: 380, x: -255, y: 260 + lerp(0, -30, sine(p)) }) + ground(SUN.ground);
      },
    },
    {
      id: 'daughter', from: U.dau, // daylight, the cabin from inside, close on the two of them: popcorn and a bottle on the bench
      draw(p, t, c) {
        const view = `<path d="M150 780 L480 400" stroke="${DAY.wheel}" stroke-width="16"/>` + cabin({ x: 790, y: 470, k: 1.5, pal: DAY });
        const scene = cabinRoom({ pal: DAY, sky: DAY.sky, view })
          + dad({ x: 330, t: c.t, look: 0.7, lookY: 0.45, armR: 16 })
          + varya({ x: 560, t: c.t, look: -0.7, lookY: -0.45, mouth: 'smile', armL: 34 })
          + popcorn({ x: 760, y: ROOM.seat }) + bottle({ x: 880, y: ROOM.seat }) + benchFront({ pal: DAY });
        return cam(scene, { s: lerp(1.24, 1.34, sine(p)), cx: 450 });
      },
    },
    {
      id: 'top', from: U.top, // three days ago, daylight: the wheel slows down and stops with the heroes at the very top
      draw(p, t, c) {
        const s = -0.7 * (1 - ease(Math.min(1, Math.max(0, (c.since(U.top) + 0.4) / 2))));
        const people = [180, 300, 760, 880].map((x, i) => tiny({ x, y: 1236, s: 0.24, col: K.crowd[i], hair: i % 2 ? K.varyaHair : K.dadHair, t: c.t, seed: 5 + i })).join('');
        const scene = daySky() + wheel({ pal: DAY, s }) + platform({ pal: DAY }) + ground(DAY.ground) + people;
        return cam(scene, { s: lerp(1, 1.3, sine(p)), cx: 540, cy: 300 }) + ground(DAY.ground, 1236);
      },
    },
    {
      id: 'scream', from: U.scream, // down at the platform: people run, the first of the dead comes in from the right
      draw(p, t, c) {
        const back = cam(daySky() + wheel({ pal: DAY, s: 0 }) + platform({ pal: DAY }) + ground(DAY.ground), { s: 2, cx: 540, cy: 1150 });
        const run = [0, 1, 2, 3].map((i) => { const w = travel(t, -0.4 + 0.15 * i, 2.2, 760 + 90 * i, -200 + 60 * i, 110); return tiny({ x: w.x, y: 1236 + 14 * (i % 2), s: 0.46, col: K.crowd[i], hair: i % 2 ? K.varyaHair : K.dadHair, t: c.t, seed: 9 + i, walk: w, look: -0.9, worry: 1, wide: 0.9, mouth: 'o', tilt: -7, armL: [30, 95, 20, 70][i], armR: [80, 25, 110, 40][i] }); }).join('');
        const w = travel(t, 0.2, 3, 1140, 900, 90);
        return back + dead({ x: w.x, y: 1232, s: 0.48, t: c.t, seed: 14, lean: 1.4, look: -0.6, col: K.deadDay, eyes: K.eyeDay }) + run + ground(DAY.ground, 1262);
      },
    },
    {
      id: 'crowd', from: U.crowd, // the same evening: the crowd under the wheel, still, all faces up
      draw(p, t, c) {
        const scene = sunSky() + wheel({ pal: SUN }) + platform({ pal: SUN }) + ground(SUN.ground)
          + deadCrowd({ x0: 160, x1: 920, y: 1232, count: 32, s: 0.32, t: c.t * (1 - 0.8 * ease(c.since(U.quiet) / 0.6)), seed: 40, lookY: -1, depth: 40 });
        return cam(scene, { s: lerp(1.55, 1.7, sine(p)), cx: 540, cy: 1150, y: 20 });
      },
    },
    {
      id: 'power', from: U.power, // night: a city without a single lit window behind the dark wheel
      draw(p) {
        const scene = nightSky() + skyline() + wheel({ pal: NIGHT }) + platform({ pal: NIGHT }) + ground(NIGHT.ground);
        return cam(scene, { s: lerp(1.12, 1.04, sine(p)), cy: 900 });
      },
    },
    {
      id: 'turn', from: U.turn, // the wheel turns one cabin by itself; then the camera goes down to the dark booth: who is there?
      draw(p, t, c) {
        const s = 2 + ease((c.since(U.turn) - 0.5) / 2.1), down = sine((c.since(U.who) + 0.3) / 1.6);
        const eyes = deadCrowd({ x0: 120, x1: 520, y: 1232, count: 9, s: 0.3, t: c.t, seed: 61, lookY: -0.2, col: K.deadNight, eyes: K.eyeNight });
        const scene = nightSky({ moon: false }) + wheel({ pal: NIGHT, s }) + platform({ pal: NIGHT }) + ground(NIGHT.ground) + eyes;
        return cam(scene, { s: lerp(1.4, 2.3, down), cx: lerp(640, 905, down), x: lerp(0, -365, down) });
      },
    },
    {
      id: 'lights', from: U.others, // night: the lights come on round the wheel, one cabin after another
      draw(p, t, c) {
        const k = c.since(U.torch), lit = Object.fromEntries(ROUND.map((i, j) => [i, (k - 0.1 - 0.16 * j) / 0.3]));
        const scene = nightSky() + wheel({ pal: NIGHT, lit }) + platform({ pal: NIGHT }) + ground(NIGHT.ground);
        return cam(scene, { s: lerp(1, 1.06, sine(p)), cy: 900 }) + midTag({ text: '11 ОГНЕЙ', y: 590, size: 96, a: (c.since(U.yest) - 0.1) / 0.35 });
      },
    },
    {
      id: 'count', from: U.count, // the cabin at night, close: the daughter at the window points at the lights, the father beside her
      draw(p, t, c) {
        const view = [[190, 520], [300, 690], [700, 450], [860, 600], [640, 720]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${14 - i}" fill="#F2B441"/>`).join('')
          + `<path d="M130 470 L500 760" stroke="${NIGHT.wheel}" stroke-width="16"/><path d="M580 760 L950 420" stroke="${NIGHT.wheel}" stroke-width="16"/>`;
        const scene = cabinRoom({ pal: NIGHT, sky: NIGHT.sky, view }) + flashlight({ x: 830, y: ROOM.seat, s: 0.9, on: 1 })
          + dad({ x: 300, t: c.t, look: 0.6, lookY: -0.3, worry: 0.5 })
          + varya({ x: 540, t: c.t, look: 0.5, lookY: -0.8, armR: 128, mouth: 'o' }) + benchFront({ pal: NIGHT });
        return cam(scene, { s: lerp(1.2, 1.3, sine(p)), cx: 440 });
      },
    },
    {
      id: 'nums', from: U.n10, // the wheel at night: a light comes on with each number; twelve is the cabin under the heroes
      draw(p, t, c) {
        const at = (id) => c.since(U[id]);
        const lit = { ...lights(1, EARLY), 14: at('n10') / 0.3, 6: at('n11') / 0.3, 0: 1, 1: (at('twelve') - 0.35) / 0.3 };
        const go = sine((at('twelve') - 0.2) / 1.6), h = spot(0);
        const scene = nightSky() + wheel({ pal: NIGHT, lit }) + platform({ pal: NIGHT }) + ground(NIGHT.ground);
        const T = (id) => t - at(id); // when that phrase starts, in the time of this shot
        const pos = steps(t, [T('n11'), T('twelve') + 0.35], 0.3);
        return cam(scene, { s: lerp(1, 1.45, go), cx: h.x + 30, cy: h.y + 160, x: lerp(0, 540 - h.x - 30, go), y: lerp(0, 330, go) })
          + bigCount({ values: ['10', '11', '12'], pos, hiFrom: 2, y: 600, size: 250, a: (t + 0.1) / 0.3 });
      },
    },
    {
      id: 'empty', from: U.empty, // close: the heroes at their window, and the lit window under them with nobody inside
      draw(p, t, c) {
        const k = sine((c.since(U.below) + 0.2) / 1.4);
        const scene = nightSky({ moon: false }) + close({ pal: NIGHT, lit: { 0: 1, 1: 1 } }) + ground(NIGHT.ground);
        return cam(scene, { s: lerp(1, 1.12, k), cx: 650, cy: 800, y: lerp(0, -70, k) });
      },
    },
    {
      id: 'out', from: U.out, // dawn, the same two cabins: the light under them goes out
      draw(p, t, c) {
        const off = ease((c.since(U.out) - 0.35) / 0.7);
        const scene = dawnSky() + close({ pal: DAWN, lit: { 1: 1 - off } }) + ground(DAWN.ground);
        return cam(scene, { s: lerp(1.12, 1.06, sine(p)), cx: 650, cy: 800, y: -70 });
      },
    },
    {
      id: 'roof', from: U.last, caption: { y: 1340, size: 100, max: 940, push: 0.04 }, // from inside, up at the glass roof: small prints
      draw(p, t, c) {
        return cam(glassRoof({ prints: (c.since(U.last) + 0.1) / 0.5 }), { s: lerp(1, 1.1, sine(p)), cx: 540, cy: 640 });
      },
    },
    {
      id: 'choice', from: U.q, caption: { hide: true }, // the viewer's choice
      draw(p, t, c) {
        return choiceCard({ p, a: c.since(U.optA) + 0.1, b: c.since(U.optB) + 0.1, c: c.since(U.call) + 0.1, optA: 'ВЫЙТИ НА КРЫШУ', optB: 'ЖДАТЬ НОЧИ' });
      },
    },
  ],
  sfx: [
    { type: 'impact-low', phrase: 'z', vol: 0.5 },
    { type: 'wind-howl', phrase: 'power', loop: true, dur: 12, vol: 0.15 },
    { type: 'door-creak', phrase: 'turn', at: 0.4, vol: 0.4 },
    { type: 'impact-low', phrase: 'who', at: 0.5, vol: 0.45 },
    { type: 'wind-howl', phrase: 'count', loop: true, dur: 12, vol: 0.15 },
    { type: 'impact-low', phrase: 'twelve', at: 0.4, vol: 0.6 },
    { type: 'impact-low', phrase: 'small', offset: -0.05, vol: 0.75 },
  ],
  experiment: 'формат 4: героиню не представляем, чисел вслух два, загадка «кто крутит колесо», выбор зрителя в конце; жду skipRate ниже 30 % и комментарии от 1 % охвата',
  endCard: { line: 'Продолжение завтра', sub: 'Серия 2' },
  cover: {
    ep: 1,
    title: ['КОЛЕСО'],
    hook: 'ДО ЗЕМЛИ ДЕВЯТЬ НОЧЕЙ',
    hookHi: 'ДЕВЯТЬ НОЧЕЙ',
    art: hookArt(0),
  },
  post: `Зомби-апокалипсис. Ты застрял на колесе обозрения, и каждую ночь оно само опускает вас на одну кабину.

«Колесо», серия 1.

Что делать: А — выйти на крышу, Б — ждать ночи? Пиши в комментариях.

#колесо #зомбиапокалипсис #минисериал #анимация #тайна`,
};
