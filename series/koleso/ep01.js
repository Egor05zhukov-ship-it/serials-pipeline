// «Колесо», серия 1 «Двенадцатый огонь». Аккаунт «Ты бы выжил?».
// Style 2 (kit/v2.js) with the details of this series from kit/koleso.js. No cuts: the picture follows the words through
// c.at / c.since, never through seconds of the voice file. Every draw() stands a little time before its first word and
// after its last: the neighbouring shots are drawn together while one dissolves into the other.
// Every scene has its own flat colour: sunset (hook, safe, lower, crowd), day (daughter, tickets, top, scream),
// the paper scheme (eleven, was, left), night (rule, lights, power, count, nums, empty), dawn (out, last).
// The count is the one of kit/koleso.js: 24 cabins, 12 steps from the top to the bottom, the heroes' cabin 0 was at the
// top three nights ago (s = 0) and is three steps down now (s = 3): nine nights are left. Eleven cabins have people
// (OCC); the twelfth light is cabin 1, the empty one right under the heroes.
// Silent clue for episode 2: the prints on the roof are small, a child's shoes (glassRoof in kit/koleso.js).
import { lerp } from '../../kit/index.js';
import { theme, sine, ease, hop, travel, cam, person, tag, steps } from '../../kit/v2.js';
import {
  K, SUN, DAY, NIGHT, DAWN, OCC, WHEEL, ROOM, spot, wheel, lights, platform, ground, sunSky, daySky, nightSky, dawnSky,
  tiny, dead, deadCrowd, cabinRoom, benchFront, popcorn, bottle, flashlight, ticket, ruleCard, scheme, glassRoof,
  midTag, bigCount, cabin,
} from '../../kit/koleso.js';

// text = what the captions show; say = the same words for the voice where it needs help (see series/ubezhishche/ep01.js).
// gap = the pause after the phrase. id = the name the shots know the phrase by. The words are the owner's text;
// short sentences in a row are separate phrases (alone in one file the voice stops for a second between them).
// For the voice and tools/phrase_check.py: «Тока нет» was heard as «Только нет», so it is «Электричества нет» (same
// meaning). The recogniser writes «одиннадцать … двадцати четырёх» and «двенадцатый» as digits, so the captions show
// digits and say keeps the words, as in series/spisok/ep01.js.
const N = [
  { id: 'z', text: 'Зомби-апокалипсис.', gap: 0.2 },
  { id: 'stuck', text: 'Ты застрял на *колесе обозрения*.', gap: 0.35 },
  { id: 'safe', text: 'Мёртвым сюда *не залезть*.', gap: 0.35 },
  { id: 'lower', text: 'Но каждую ночь колесо опускает вас *на одну кабину*.', gap: 0.5 },
  { id: 'dau', text: 'С тобой дочка. *Варя*. Ей семь.', gap: 0.4 },
  { id: 'tickets', text: 'Три дня назад вы купили *два билета*.', gap: 0.3 },
  { id: 'top', text: 'На самом верху колесо *встало*.', gap: 0.35 },
  { id: 'scream', text: 'Внизу *закричали*.', gap: 0.45 },
  { id: 'crowd', text: 'К вечеру под колесом стояла *толпа*.', gap: 0.25 },
  { id: 'quiet', text: 'И в ней уже *никто не кричал*.', gap: 0.5 },
  { id: 'eleven', text: 'Занято *11* кабин из 24.', say: 'Занято одиннадцать кабин из двадцати четырёх.', gap: 0.4 },
  { id: 'rule1', text: 'Правило одно.', gap: 0.25 },
  { id: 'rule2', text: 'Ночью каждая кабина зажигает *фонарик*.', gap: 0.25 },
  { id: 'alive', text: 'Значит, там *живы*.', gap: 0.4 },
  { id: 'lights', text: 'Одиннадцать кабин. Одиннадцать *огней*.', gap: 0.45 },
  { id: 'power1', text: 'Электричества нет.', gap: 0.25 },
  { id: 'power2', text: 'Но колесо каждую ночь *проворачивается* само.', gap: 0.5 },
  { id: 'was', text: 'Три ночи назад вы висели *на самом верху*.', gap: 0.3 },
  { id: 'now', text: 'Теперь над вами *три кабины*.', gap: 0.35 },
  { id: 'left', text: 'До земли осталось *девять ночей*.', gap: 0.55 },
  { id: 'count', text: 'Этой ночью Варя считала огни *вслух*.', gap: 0.4 },
  { id: 'n9', text: 'Девять.', gap: 0.3 },
  { id: 'n10', text: 'Десять.', gap: 0.3 },
  { id: 'n11', text: 'Одиннадцать.', gap: 0.45 },
  { id: 'twelve', text: '— Пап. *Двенадцать*.', say: 'Пап. Двенадцать.', gap: 0.55 },
  { id: 'empty', text: '12-й горел в *пустой* кабине.', say: 'Двенадцатый горел в пустой кабине.', gap: 0.25 },
  { id: 'below', text: 'Прямо *под вами*.', gap: 0.55 },
  { id: 'out', text: 'К утру он *погас*.', gap: 0.5 },
  { id: 'last', text: 'А на крыше вашей кабины | остались *следы*.' },
];

const U = Object.fromEntries(N.map((u, i) => [u.id, i]));
const dad = (o) => person({ col: K.dad, seed: 0, y: 1100, ...o });
const varya = (o) => person({ col: K.varya, seed: 1, k: 0.62, y: 1100, ...o });
// the lights that are on before Varya counts: all of OCC but the three she adds with «девять, десять, одиннадцать»
const LATE = [18, 14, 6], EARLY = OCC.filter((i) => !LATE.includes(i));
// order in which the eleven lights come on in «lights» (around the wheel, from the top)
const ROUND = [21, 22, 0, 2, 4, 6, 8, 14, 16, 18, 20];
// the hook picture: the wheel against the sunset, the dead around the platform (also the cover)
const hookArt = (t = 0, look = -0.3) => sunSky() + wheel({ pal: SUN }) + platform({ pal: SUN }) + ground(SUN.ground)
  + deadCrowd({ x0: 90, x1: 990, y: 1236, count: 28, s: 0.22, t, seed: 3, lookY: look });
// The close shot of the heroes' cabin and the one under it: a wheel of radius 1400 with big cabins, its hub far below
// on the left, so the two cabins (at -45 and -30 degrees) hang across the middle of the frame.
const BIG = { cx: -561, cy: 1405, R: 1400 };
const heads = () => tiny({ x: -10, y: 72, s: 0.09, col: K.dad, seed: 0, look: 0.5, lookY: 0.4 }) + tiny({ x: 11, y: 70, s: 0.1, k: 0.62, col: K.varya, seed: 1, look: 0.9, lookY: 0.8 });
const close = ({ pal, lit, s = 3 }) => wheel({ ...BIG, s, pal, lit, k: 3.2, legs: false, inside: { 0: heads() } });

export default {
  series: 'Колесо',
  episode: 1,
  theme,
  gap: 0.25,
  tail: 1.1,
  endCardDur: 2.8,
  narration: N,
  shots: [
    {
      id: 'hook', from: U.z, // the wheel black against the sunset, the dead small around it; the counter is there from frame 0
      draw(p, t, c) {
        return cam(hookArt(c.t), { s: lerp(1, 1.06, sine(p)), cy: 900 }) + midTag({ text: 'ДО ЗЕМЛИ 9 НОЧЕЙ', y: 372, size: 80 });
      },
    },
    {
      id: 'safe', from: U.safe, // the foot of the wheel, close: the dead press at the leg and look up; the cabins are far above
      draw(p, t, c) {
        const back = cam(sunSky({ sun: false }) + wheel({ pal: SUN }) + platform({ pal: SUN, booth: false }) + ground(SUN.ground), { s: lerp(2.1, 2.2, sine(p)), cx: 300, cy: 1150, x: 240 });
        const near = [130, 270, 420, 600, 760, 905].map((x, i) => dead({ x, y: 1300 + 18 * (i % 2), s: 0.5, t: c.t, seed: 20 + i, lookY: -1, look: i < 3 ? 0.4 : -0.4 })).join('');
        return back + near;
      },
    },
    {
      id: 'lower', from: U.lower, // the heroes' cabin up on the rim: the wheel turns one cabin on and stops
      draw(p, t, c) {
        const s = 2 + ease((c.since(U.lower) - 0.4) / 2);
        return cam(sunSky() + wheel({ pal: SUN, s }), { s: 1.6, cx: 795, cy: 380, x: -255, y: 260 + lerp(0, -30, sine(p)) }) + ground(SUN.ground); // the ground stays at the bottom of the frame, under the captions
      },
    },
    {
      id: 'daughter', from: U.dau, // daylight, the cabin from inside: the two of them on the bench, popcorn and a bottle
      draw(p, t, c) {
        const named = c.at(U.dau, 1);
        const view = `<path d="M150 780 L480 400" stroke="${DAY.wheel}" stroke-width="16"/>` + cabin({ x: 790, y: 470, k: 1.5, pal: DAY });
        const scene = cabinRoom({ pal: DAY, sky: DAY.sky, view })
          + dad({ x: 360, t: c.t, look: 0.7, lookY: 0.5 }) + varya({ x: 570, t: c.t, look: -0.8, lookY: -0.3, hop: hop(named - 0.05, 12) })
          + popcorn({ x: 740, y: ROOM.seat }) + bottle({ x: 870, y: ROOM.seat }) + benchFront({ pal: DAY });
        return cam(scene, { s: lerp(1.04, 1.1, sine(p)), cx: 560, cy: 1000 }) + tag({ text: 'ВАРЯ, 7 ЛЕТ', size: 64, a: (named - 0.05) / 0.35 });
      },
    },
    {
      id: 'tickets', from: U.tickets, // close: the two tickets
      draw(p) {
        const scene = daySky() + ticket({ x: 520, y: 640, rot: -9 }) + ticket({ x: 560, y: 900, rot: 5 }) + ground(DAY.ground);
        return cam(scene, { s: lerp(1, 1.08, sine(p)), cx: 540, cy: 780 });
      },
    },
    {
      id: 'top', from: U.top, // three days ago, daylight: the wheel slows down and stops with the heroes at the very top
      draw(p, t, c) {
        const s = -0.7 * (1 - ease(clampT((c.since(U.top) + 0.4) / 2.2)));
        const people = [180, 300, 760, 880].map((x, i) => tiny({ x, y: 1236, s: 0.22, col: K.crowd[i], t: c.t, seed: 5 + i })).join('');
        const scene = daySky() + wheel({ pal: DAY, s }) + platform({ pal: DAY }) + ground(DAY.ground) + people;
        return cam(scene, { s: lerp(1, 1.3, sine(p)), cx: 540, cy: 300 });
      },
    },
    {
      id: 'scream', from: U.scream, // down at the platform: people run, the first of the dead walks in from the right
      draw(p, t, c) {
        const back = cam(daySky() + wheel({ pal: DAY, s: 0 }) + platform({ pal: DAY }) + ground(DAY.ground), { s: 2, cx: 540, cy: 1150 });
        const run = [0, 1, 2, 3].map((i) => { const w = travel(t, -0.4 + 0.15 * i, 2.2, 760 + 90 * i, -200 + 60 * i, 110); return tiny({ x: w.x, y: 1236 + 14 * (i % 2), s: 0.42, col: K.crowd[i], t: c.t, seed: 9 + i, walk: w, look: 0.9, worry: 1 }); }).join('');
        const w = travel(t, 0.2, 3, 1140, 900, 90);
        return back + tiny({ x: w.x, y: 1230, s: 0.42, col: K.dead, t: c.t, seed: 14, walk: w, tilt: -7, look: -0.6 }) + run;
      },
    },
    {
      id: 'crowd', from: U.crowd, // the same evening: the crowd of the dead under the wheel, still, all faces up
      draw(p, t, c) {
        const scene = sunSky() + wheel({ pal: SUN }) + platform({ pal: SUN }) + ground(SUN.ground)
          + deadCrowd({ x0: 180, x1: 900, y: 1250, count: 30, s: 0.3, t: c.t * (1 - 0.8 * ease(c.since(U.quiet) / 0.6)), seed: 40, lookY: -1, depth: 40 });
        return cam(scene, { s: lerp(1.55, 1.7, sine(p)), cx: 540, cy: 1150, y: 20 });
      },
    },
    {
      id: 'eleven', from: U.eleven, // the scheme: the cabins with people fill in one by one, eleven of twenty-four
      draw(p, t) {
        const fill = Object.fromEntries(ROUND.map((i, j) => [i, (t - 0.1 - 0.16 * j) / 0.25]));
        return cam(scheme({ fill }), { s: lerp(1, 1.04, sine(p)), cx: 540, cy: 760 }) + midTag({ text: '11 ИЗ 24', y: 222, size: 88, a: (t - 1.7) / 0.35 });
      },
    },
    {
      id: 'rule', from: U.rule1, // the card of the one rule on the night sky
      draw(p, t) {
        const back = nightSky() + wheel({ pal: NIGHT, lit: lights(1) }) + platform({ pal: NIGHT }) + ground(NIGHT.ground);
        return cam(back, { s: lerp(1.05, 1, sine(p)), cy: 900 }) + ruleCard({ a: (t + 0.05) / 0.4, lines: ['НОЧЬЮ КАЖДАЯ', 'КАБИНА ЗАЖИГАЕТ', 'ФОНАРИК'] });
      },
    },
    {
      id: 'lights', from: U.alive, // night: the eleven lights come on round the wheel
      draw(p, t, c) {
        const lit = Object.fromEntries(ROUND.map((i, j) => [i, (t - 0.05 - 0.17 * j) / 0.3]));
        const scene = nightSky() + wheel({ pal: NIGHT, lit }) + platform({ pal: NIGHT }) + ground(NIGHT.ground);
        return cam(scene, { s: lerp(1, 1.05, sine(p)), cy: 900 }) + midTag({ text: '11 ОГНЕЙ', y: 590, size: 96, a: (c.since(U.lights) - 0.1) / 0.35 });
      },
    },
    {
      id: 'power', from: U.power1, // the platform at night: the booth is dark, no power; the wheel turns one cabin by itself
      draw(p, t, c) {
        const s = 2 + ease((c.since(U.power2) - 0.3) / 2.2);
        const post = `<rect x="168" y="760" width="18" height="480" fill="${NIGHT.deck}"/><rect x="140" y="740" width="74" height="34" rx="10" fill="${NIGHT.deck}"/><rect x="152" y="772" width="50" height="16" rx="6" fill="${NIGHT.win}"/>`;
        const scene = nightSky({ moon: false }) + wheel({ pal: NIGHT, s, lit: lights(1) }) + post + platform({ pal: NIGHT }) + ground(NIGHT.ground);
        return cam(scene, { s: lerp(1.35, 1.45, sine(p)), cx: 640, cy: 1160, y: 10 });
      },
    },
    {
      id: 'was', from: U.was, // the scheme: three nights ago the heroes were at the top; three steps of the wheel bring them here
      draw(p, t, c) {
        const k = c.since(U.now), s = steps(k, [-0.75, -0.3, 0.15], 0.42);
        return cam(scheme({ s, above: (k - 0.7) / 0.9 }), { s: lerp(1, 1.05, sine(p)), cx: 540, cy: 600 });
      },
    },
    {
      id: 'left', from: U.left, // closer: the way down marked cabin by cabin, nine of them; the counter
      draw(p, t) {
        return cam(scheme({ path: Math.max(0, (t - 0.15) / 0.14) }), { s: lerp(1.08, 1.16, sine(p)), cx: 700, cy: 860, x: -40 })
          + midTag({ text: '9 НОЧЕЙ', y: 212, size: 110, a: (t - 0.2) / 0.35 });
      },
    },
    {
      id: 'count', from: U.count, // the cabin at night: Varya kneels at the window and counts, the father beside her
      draw(p, t, c) {
        const view = [[190, 520], [300, 690], [700, 450], [860, 600], [640, 720]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${14 - i}" fill="#F2B441"/>`).join('')
          + `<path d="M130 470 L500 760" stroke="${NIGHT.wheel}" stroke-width="16"/><path d="M580 760 L950 420" stroke="${NIGHT.wheel}" stroke-width="16"/>`;
        const scene = cabinRoom({ pal: NIGHT, sky: NIGHT.sky, view }) + flashlight({ x: 820, y: ROOM.seat, s: 0.9, on: 1 })
          + dad({ x: 330, t: c.t, look: 0.6, lookY: -0.4, worry: 0.4 }) + varya({ x: 560, y: 1050, t: c.t, look: 0.4, lookY: -0.9 }) + benchFront({ pal: NIGHT });
        return cam(scene, { s: lerp(1.05, 1.14, sine(p)), cx: 540, cy: 900 });
      },
    },
    {
      id: 'nums', from: U.n9, // the wheel at night: a light comes on with each number she says; twelve is the empty cabin under them
      draw(p, t, c) {
        const at = (id) => c.since(U[id]);
        const lit = { ...lights(1, EARLY), 18: at('n9') / 0.3, 14: at('n10') / 0.3, 6: at('n11') / 0.3, 0: 1, 1: (at('twelve') - 0.35) / 0.3 };
        const go = sine((at('twelve') - 0.2) / 1.6), h = spot(0);
        const scene = nightSky() + wheel({ pal: NIGHT, lit }) + platform({ pal: NIGHT }) + ground(NIGHT.ground);
        const T = (id) => t - at(id); // when that phrase starts, in the time of this shot
        const pos = steps(t, [T('n10'), T('n11'), T('twelve') + 0.35], 0.3);
        return cam(scene, { s: lerp(1, 1.45, go), cx: h.x + 30, cy: h.y + 160, x: lerp(0, 540 - h.x - 30, go), y: lerp(0, 330, go) })
          + bigCount({ values: ['9', '10', '11', '12'], pos, hiFrom: 3, y: 600, size: 250, a: (t + 0.1) / 0.3 });
      },
    },
    {
      id: 'empty', from: U.empty, // close: the heroes' cabin, and the lit window under it with nobody inside
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
      draw(p) {
        return cam(glassRoof(), { s: lerp(1, 1.08, sine(p)), cx: 540, cy: 640 });
      },
    },
  ],
  sfx: [
    { type: 'impact-low', phrase: 'z', vol: 0.5 },
    { type: 'wind-howl', phrase: 'rule1', loop: true, dur: 13, vol: 0.15 },
    { type: 'door-creak', phrase: 'power2', at: 0.35, vol: 0.35 },
    { type: 'wind-howl', phrase: 'count', loop: true, dur: 12, vol: 0.15 },
    { type: 'impact-low', phrase: 'twelve', at: 0.4, vol: 0.6 },
    { type: 'impact-low', phrase: 'last', offset: -0.1, vol: 0.7 },
  ],
  experiment: 'первая серия по формату 3: жанр и место в первой фразе, срок в третьей, неожиданное место; жду skipRate ниже 30 %',
  endCard: { line: 'Продолжение завтра', sub: 'Серия 2' },
  cover: {
    ep: 1,
    title: ['КОЛЕСО'],
    hook: 'ДО ЗЕМЛИ ДЕВЯТЬ НОЧЕЙ',
    hookHi: 'ДЕВЯТЬ НОЧЕЙ',
    art: hookArt(0),
  },
  post: `Зомби-апокалипсис. Ты застрял на колесе обозрения, и каждую ночь оно опускает вас на одну кабину.

«Колесо», серия 1.

#колесо #зомбиапокалипсис #минисериал #анимация #тайна`,
};

function clampT(x) { return Math.min(1, Math.max(0, x)); }
