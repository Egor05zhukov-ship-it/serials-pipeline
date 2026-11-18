// «Колесо», серия 1 «Двенадцатый огонь». Аккаунт «Ты бы выжил?». Третья редакция (19.11.2026): связный рассказ.
// The owner on the earlier cuts: too fast, «быстрые перечисления» lose the thread, the idea of the story gets lost.
// So the episode is told the way series/SCENARIST.md, section 0, asks: one thought from the first sentence to the
// last («ты застрял на колесе, мёртвым сюда не залезть, но колесо каждую ночь опускает вас к ним, и сегодня на нём
// появился кто-то лишний»), whole sentences tied with «но / и / хотя», every detail pays off before the end (the
// lanterns mean «alive», so the extra lantern is the clue), and one question at the end with a reason to forward it.
// One row of N = one sentence = one voice file; «|» only cuts the caption into chunks. Inside a long sentence the
// picture changes by the share of its length (c.since / c.dur), never by seconds of the voice file.
// Scenes and their colours: sunset (hook, safe), day (the cabin), dusk (lower), night (who, lights, count, empty),
// the paper scheme (nine), dawn (out), the choice card.
// Silent clue for episode 2: the cabin under the heroes never had anyone at its window.
import { lerp } from '../../kit/index.js';
import { theme, sine, ease, cam, steps, choiceCard } from '../../kit/v2.js';
import { human } from '../../kit/people.js';
import {
  K, SUN, DAY, NIGHT, DAWN, ROOM, wheel, platform, ground, sunSky, nightSky, dawnSky,
  tiny, dead, deadCrowd, cabinRoom, benchFront, popcorn, bottle, flashlight, glassRoof, scheme, midTag, bigCount, cabin,
} from '../../kit/koleso.js';

const N = [
  { id: 'stuck', text: 'Ты застрял на *колесе обозрения* | во время зомби-апокалипсиса.', gap: 0.45 },
  { id: 'safe', text: 'Мёртвые не могут сюда залезть, | и сначала ты решил, | что вам с дочерью *повезло*.', gap: 0.5 },
  { id: 'lower', text: 'Но каждую ночь | колесо проворачивается | и опускает вашу кабину | *ближе к земле*.', gap: 0.5 },
  { id: 'who', text: 'Электричества в городе нет, | и ты до сих пор не знаешь, | *кто его двигает*.', gap: 0.55 },
  { id: 'nine', text: 'Через *девять ночей* | вы окажетесь внизу, | среди мёртвых.', gap: 0.6 },
  { id: 'others', text: 'В других кабинах тоже сидят люди, | и по ночам каждая | зажигает *фонарик*: | значит, там ещё есть живые.', gap: 0.55 },
  { id: 'torch', text: 'Твоя дочь считает | эти огоньки *перед сном*.', gap: 0.45 },
  { id: 'yest', text: 'Вчера она насчитала *11*.', say: 'Вчера она насчитала одиннадцать.', gap: 0.4 },
  { id: 'today', text: 'А сегодня — *12*.', say: 'А сегодня двенадцать.', gap: 0.65 },
  { id: 'empty', text: 'Лишний фонарик горел | в кабине под вами, | хотя она с первого дня *пустая*.', gap: 0.55 },
  { id: 'out', text: 'К утру он погас, | а на крыше вашей кабины | появились отпечатки | *детских ботинок*.', gap: 0.8 },
  { id: 'ask', text: 'Как ты поступишь: выйдешь на крышу или дождёшься ночи?', gap: 0.4 },
  { id: 'call', text: 'Напиши в комментариях и перешли другу: пусть выберет тоже.' },
];

const U = Object.fromEntries(N.map((u, i) => [u.id, i]));
const mix = (a, b, k) => (k <= 0 ? a : k >= 1 ? b : `${a}<g opacity="${k.toFixed(3)}">${b}</g>`);
// the heroes inside the cabin: they stand behind the bench, so only the upper halves are seen
const dad = (o) => human({ col: K.dad, seed: 0, y: 1104, k: 1.15, shadow: false, ...o });
const varya = (o) => human({ col: K.varya, hair: K.varyaHair, wear: 'dress', seed: 1, k: 0.72, y: 1104, shadow: false, style: { nohair: false }, ...o });
// order in which the lanterns come on around the wheel, from the top
const ROUND = [21, 22, 0, 2, 4, 6, 8, 14, 16, 18, 20];
// the hook picture: the wheel black against the sunset, the dead around the platform (also the cover)
const hookArt = (t = 0, look = -0.3) => sunSky() + wheel({ pal: SUN }) + platform({ pal: SUN }) + ground(SUN.ground)
  + deadCrowd({ x0: 70, x1: 1010, y: 1226, count: 30, s: 0.25, t, seed: 3, lookY: look });
// The close shot of the heroes' cabin and the one under it: a wheel of radius 1400 with big cabins, its hub far below
// on the left, so the two cabins hang across the middle of the frame. The heroes are seen in their window.
const BIG = { cx: -561, cy: 1405, R: 1400 };
const heads = () => tiny({ x: -9, y: 96, s: 0.16, col: K.dad, seed: 0, look: 0.5, lookY: 0.5 })
  + tiny({ x: 12, y: 96, s: 0.16, k: 0.72, col: K.varya, hair: K.varyaHair, wear: 'dress', seed: 1, look: 0.9, lookY: 0.8, style: { nohair: false } });
const close = ({ pal, lit, s = 3 }) => wheel({ ...BIG, s, pal, lit, k: 3.2, legs: false, inside: { 0: heads() } });
// a city without a single lit window, far behind the wheel
const skyline = () => [[-40, 250, 330], [200, 170, 250], [360, 230, 420], [590, 150, 300], [730, 240, 380], [960, 200, 270]]
  .map(([x, w, h]) => `<rect x="${x}" y="${1200 - h}" width="${w}" height="${h + 20}" fill="${NIGHT.win}"/>`).join('');

export default {
  series: 'Колесо',
  episode: 1,
  theme,
  gap: 0.3,
  tail: 0.5,
  endCardDur: 2.4,
  narration: N,
  choice: { a: 'Выйти на крышу', b: 'Ждать ночи' },
  shots: [
    {
      id: 'hook', from: U.stuck, // the wheel black against the sunset, the dead small around it; the counter is there from frame 0
      draw(p, t, c) {
        return cam(hookArt(c.t), { s: lerp(1, 1.12, sine(p)), cy: 900 }) + midTag({ text: 'ДО ЗЕМЛИ 9 НОЧЕЙ', y: 372, size: 80 });
      },
    },
    {
      id: 'safe', from: U.safe, // the dead at the foot of the wheel look up; on «вам с дочерью повезло» the two of them in their cabin
      draw(p, t, c) {
        const k = ease((c.since(U.safe) - 0.5 * c.dur(U.safe)) / 0.45);
        const back = cam(sunSky({ sun: false }) + wheel({ pal: SUN }) + platform({ pal: SUN, booth: false }) + ground(SUN.ground), { s: lerp(2.1, 2.2, sine(p)), cx: 300, cy: 1150, x: 240 });
        const near = [110, 262, 420, 610, 770, 930].map((x, i) => dead({ x, y: 1222 + 10 * (i % 2), s: 0.56, t: c.t, seed: 20 + i, lookY: -1, look: i < 3 ? 0.4 : -0.4 })).join('');
        const foot = back + near + ground(SUN.ground, 1214);
        if (k <= 0) return foot;
        const view = `<path d="M150 780 L480 400" stroke="${DAY.wheel}" stroke-width="16"/>` + cabin({ x: 790, y: 470, k: 1.5, pal: DAY });
        const room = cabinRoom({ pal: DAY, sky: DAY.sky, view })
          + dad({ x: 330, t: c.t, look: 0.7, lookY: 0.45, armR: 16 }) + varya({ x: 560, t: c.t, look: -0.7, lookY: -0.45, armL: 34 })
          + popcorn({ x: 760, y: ROOM.seat }) + bottle({ x: 880, y: ROOM.seat }) + benchFront({ pal: DAY });
        return mix(foot, cam(room, { s: lerp(1.24, 1.34, sine(p)), cx: 450 }), k);
      },
    },
    {
      id: 'lower', from: U.lower, // the heroes' cabin up on the rim: the wheel turns one cabin on and stops
      draw(p, t, c) {
        const s = 2 + ease((c.since(U.lower) - 0.25 * c.dur(U.lower)) / 2);
        return cam(sunSky() + wheel({ pal: SUN, s }), { s: 1.6, cx: 795, cy: 380, x: -255, y: 260 + lerp(0, -30, sine(p)) }) + ground(SUN.ground);
      },
    },
    {
      id: 'who', from: U.who, // night, a city without one lit window; then the camera goes down to the dark booth: who is there?
      draw(p, t, c) {
        const down = sine((c.since(U.who) - 0.42 * c.dur(U.who)) / 1.7);
        const eyes = deadCrowd({ x0: 120, x1: 520, y: 1232, count: 9, s: 0.3, t: c.t, seed: 61, lookY: -0.2, col: '#3C4F5E' });
        const scene = nightSky({ moon: false }) + skyline() + wheel({ pal: NIGHT, s: 3 }) + platform({ pal: NIGHT }) + ground(NIGHT.ground) + eyes;
        return cam(scene, { s: lerp(1.12, 2.3, down), cx: lerp(540, 905, down), x: lerp(0, -365, down) });
      },
    },
    {
      id: 'nine', from: U.nine, // the scheme: the way down marked cabin by cabin, nine of them
      draw(p, t) {
        return cam(scheme({ path: Math.max(0, (t - 0.15) / 0.16) }), { s: lerp(1.08, 1.16, sine(p)), cx: 700, cy: 860, x: -40 })
          + midTag({ text: '9 НОЧЕЙ', y: 212, size: 110, a: (t - 0.1) / 0.35 });
      },
    },
    {
      id: 'lights', from: U.others, // night: the lanterns come on round the wheel, one cabin after another
      draw(p, t, c) {
        const k = c.since(U.others) - 0.32 * c.dur(U.others), lit = Object.fromEntries(ROUND.map((i, j) => [i, (k - 0.17 * j) / 0.3]));
        const scene = nightSky() + wheel({ pal: NIGHT, lit }) + platform({ pal: NIGHT }) + ground(NIGHT.ground);
        return cam(scene, { s: lerp(1, 1.07, sine(p)), cy: 900 });
      },
    },
    {
      id: 'count', from: U.torch, // the cabin at night, close: the daughter at the window points at the lanterns and counts
      draw(p, t, c) {
        const view = [[190, 520], [300, 690], [700, 450], [860, 600], [640, 720]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${14 - i}" fill="#F2B441"/>`).join('')
          + `<path d="M130 470 L500 760" stroke="${NIGHT.wheel}" stroke-width="16"/><path d="M580 760 L950 420" stroke="${NIGHT.wheel}" stroke-width="16"/>`;
        const now = c.since(U.today) > 0.2;
        const scene = cabinRoom({ pal: NIGHT, sky: NIGHT.sky, view }) + flashlight({ x: 830, y: ROOM.seat, s: 0.9, on: 1 })
          + dad({ x: 300, t: c.t, look: 0.6, lookY: -0.3, worry: now ? 0.8 : 0 })
          + varya({ x: 540, t: c.t, look: 0.5, lookY: -0.8, armR: 128, mouth: now ? 'o' : 'none', worry: now ? 0.7 : 0 }) + benchFront({ pal: NIGHT });
        return cam(scene, { s: lerp(1.2, 1.3, sine(p)), cx: 440 })
          + bigCount({ values: ['11', '12'], pos: steps(c.since(U.today), [0.25], 0.3), hiFrom: 1, y: 420, size: 210, a: (c.since(U.yest) + 0.05) / 0.3 });
      },
    },
    {
      id: 'empty', from: U.empty, // close: the heroes at their window, and the lit window under them with nobody inside
      draw(p, t, c) {
        const k = sine((c.since(U.empty) - 0.2) / 1.8);
        const scene = nightSky({ moon: false }) + close({ pal: NIGHT, lit: { 0: 1, 1: 1 } }) + ground(NIGHT.ground);
        return cam(scene, { s: lerp(1, 1.12, k), cx: 650, cy: 800, y: lerp(0, -70, k) });
      },
    },
    {
      id: 'out', from: U.out, // dawn: the lantern under them goes out; then, from inside, the glass roof with small prints on it
      draw(p, t, c) {
        const d = c.dur(U.out), g = c.since(U.out), off = ease((g - 0.06 * d) / 0.6), k = ease((g - 0.34 * d) / 0.45);
        const dawn = cam(dawnSky() + close({ pal: DAWN, lit: { 1: 1 - off } }) + ground(DAWN.ground), { s: lerp(1.12, 1.06, sine(p)), cx: 650, cy: 800, y: -70 });
        if (k <= 0) return dawn;
        return mix(dawn, cam(glassRoof({ prints: (g - 0.5 * d) / 0.5 }), { s: lerp(1, 1.1, sine(p)), cx: 540, cy: 640 }), k);
      },
    },
    {
      id: 'choice', from: U.ask, caption: { hide: true }, // the viewer's choice and the reason to forward the episode
      draw(p, t, c) {
        const d = c.dur(U.ask), g = c.since(U.ask);
        return choiceCard({ p, q: 'КАК ТЫ ПОСТУПИШЬ?', a: g - 0.32 * d, b: g - 0.64 * d, c: c.since(U.call) + 0.05, optA: 'ВЫЙТИ НА КРЫШУ', optB: 'ЖДАТЬ НОЧИ', call: 'НАПИШИ В КОММЕНТАРИЯХ', call2: 'и перешли другу: пусть выберет тоже' });
      },
    },
  ],
  sfx: [
    { type: 'impact-low', phrase: 'stuck', vol: 0.5 },
    { type: 'door-creak', phrase: 'lower', at: 0.3, vol: 0.4 },
    { type: 'wind-howl', phrase: 'who', loop: true, dur: 16, vol: 0.15 },
    { type: 'impact-low', phrase: 'today', at: 0.4, vol: 0.6 },
    { type: 'impact-low', phrase: 'out', at: 0.6, vol: 0.75 },
  ],
  experiment: 'связный рассказ без перечислений (раздел 0 сценариста), темп 1,05, вопрос и просьба переслать в конце; жду watched выше 0,55 и пересылки от 1 % охвата',
  endCard: { line: 'Продолжение завтра', sub: 'Серия 2' },
  cover: {
    ep: 1,
    title: ['КОЛЕСО'],
    hook: 'ДО ЗЕМЛИ ДЕВЯТЬ НОЧЕЙ',
    hookHi: 'ДЕВЯТЬ НОЧЕЙ',
    art: hookArt(0),
  },
  post: `Ты застрял на колесе обозрения во время зомби-апокалипсиса, и каждую ночь оно опускает вашу кабину ближе к земле.

«Колесо», серия 1.

Как ты поступишь: А — выйти на крышу, Б — ждать ночи? Напиши в комментариях.
Перешли тому, с кем оказался бы в этой кабине.

#колесо #зомбиапокалипсис #минисериал #анимация #тайна`,
};
