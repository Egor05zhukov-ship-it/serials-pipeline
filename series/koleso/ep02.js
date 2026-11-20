// «Колесо», серия 2 «Дверь изнутри». Аккаунт @acc3.
// One line: you hang on the wheel over the dead, in the morning the bottom cabin is empty and its door was opened
// from inside, so people leave by themselves, and tonight a child walks over your roof.
// Viewers' choice under episode 1: no votes, so «В прошлой серии решили ждать ночи» (it leads to the boy at night).
// Scenes and colours: dawn (the open cabin, the foot of the wheel, the rule), day (the cabin inside), paper (scheme),
// dawn glass (the print), night (the lights, the arm, the roof, the boy), the choice card.
// Silent clue for episode 4: the chain with a padlock on the operator's booth (place shot), never named.
import { lerp } from '../../kit/index.js';
import { theme, sine, ease, cam, steps, choiceCard } from '../../kit/v2.js';
import { human } from '../../kit/people.js';
import {
  K, DAY, NIGHT, DAWN, ROOM, wheel, platform, ground, nightSky, dawnSky,
  dead, deadCrowd, cabinRoom, benchFront, popcorn, bottle, flashlight, glassRoof, scheme, midTag, bigCount, ruleCard, OCC,
} from '../../kit/koleso.js';
import { openCabin, boothChain, roofNight, shoeMatch, scratchArm } from './scenes.js';

const N = [
  { id: 'door', text: 'Утром нижняя кабина *опустела*, | а её дверь | стояла открытой.', gap: 0.45 },
  { id: 'place', text: 'Пятый день ты с дочерью сидишь | в кабине колеса обозрения, | а внизу бродят *мёртвые*.', gap: 0.5 },
  { id: 'chose', text: 'В прошлой серии решили *ждать ночи*, | и на крышу ты не полез.', gap: 0.5 },
  { id: 'lock', text: 'Но двери кабин | открываются *только изнутри*, | а мёртвые замков не открывают.', gap: 0.5 },
  { id: 'self', text: 'Выходит, люди из нижней кабины | *ушли сами*.', gap: 0.6 },
  { id: 'small', text: 'А отпечатки на вашей крыше | были совсем маленькие, | как *ботинки дочери*.', gap: 0.55 },
  { id: 'count', text: 'Вечером Варя пересчитала фонарики, | и их стало | *на один меньше*.', gap: 0.5 },
  { id: 'arm', text: 'Когда она уснула, | ты приподнял её рукав | и снова посмотрел на *царапину*.', gap: 0.55 },
  { id: 'steps', text: 'И тут по крыше над вами | кто-то прошёл | *лёгкими шагами*.', gap: 0.5 },
  { id: 'edge', text: 'Потом всё стихло | прямо над вашим *окном*.', gap: 0.5 },
  { id: 'boy', text: 'За стеклом сидел *мальчик*.', gap: 0.8 },
  { id: 'ask', text: 'Как ты поступишь: откроешь ему дверь или затаишься?', gap: 0.4 },
  { id: 'call', text: 'Напиши в комментариях и перешли другу: пусть выберет тоже.' },
];

const U = Object.fromEntries(N.map((u, i) => [u.id, i]));
const mix = (a, b, k) => (k <= 0 ? a : k >= 1 ? b : `${a}<g opacity="${k.toFixed(3)}">${b}</g>`);
const S = 4; // the wheel has turned four steps since the heroes were at the top; cabin 8 is at the bottom now
const dad = (o) => human({ col: K.dad, seed: 0, y: 1104, k: 1.15, shadow: false, ...o });
const varya = (o) => human({ col: K.varya, hair: K.varyaHair, wear: 'dress', seed: 1, k: 0.72, y: 1104, shadow: false, style: { nohair: false }, ...o });
const boy = (o) => human({ col: '#8C82B8', hair: { style: 'short', col: '#3D2C26' }, seed: 5, k: 0.86, shadow: false, style: { nohair: false }, ...o });
// the lanterns at night: every cabin with people but the one that went down (cabin 8)
const LIT = [21, 22, 0, 2, 4, 6, 14, 16, 18, 20];
// the hook picture: the empty bottom cabin over the platform at dawn, its door open, the dead small around (also the cover)
const hookArt = (t = 0, open = 1) => dawnSky() + platform({ pal: DAWN, booth: false }) + ground(DAWN.ground)
  + openCabin({ x: 540, y: 360, k: 9, open })
  + deadCrowd({ x0: 40, x1: 1040, y: 1236, count: 22, s: 0.24, t, seed: 7, lookY: -0.5 });
// the night cabin with both heroes; o = options for the people
const nightRoom = ({ t, view = '', d = {}, v = {}, torch = 0 }) => cabinRoom({ pal: NIGHT, sky: NIGHT.sky, view })
  + flashlight({ x: 840, y: ROOM.seat, s: 0.9, on: torch }) + dad({ x: 300, t, ...d }) + varya({ x: 560, t, ...v }) + benchFront({ pal: NIGHT });
const asleep = { look: -0.2, lookY: 0.9, tilt: 12, mouth: 'none' };

export default {
  series: 'Колесо',
  episode: 2,
  theme,
  gap: 0.3,
  tail: 0.5,
  endCardDur: 2.4,
  narration: N,
  choice: { a: 'Открыть дверь', b: 'Затаиться' },
  shots: [
    {
      id: 'hook', from: U.door, // the bottom cabin, close, its door open and nobody inside; the counter from frame 0
      draw(p, t, c) {
        return cam(hookArt(c.t), { s: lerp(1, 1.08, sine(p)), cy: 900 }) + midTag({ text: 'ДО ЗЕМЛИ 8 НОЧЕЙ', y: 150, size: 80 });
      },
    },
    {
      id: 'place', from: U.place, // the whole wheel at dawn with the dead around it; then the dead close, looking up
      draw(p, t, c) {
        const k = ease((c.since(U.place) - 0.55 * c.dur(U.place)) / 0.45);
        const far = cam(dawnSky() + wheel({ pal: DAWN, s: S }) + platform({ pal: DAWN }) + boothChain({}) + ground(DAWN.ground)
          + deadCrowd({ x0: 60, x1: 1020, y: 1232, count: 30, s: 0.25, t: c.t, seed: 3, lookY: -0.4 }), { s: lerp(1, 1.06, sine(p)), cy: 900 })
          + midTag({ text: 'ДЕНЬ 5', y: 180, size: 70 });
        if (k <= 0) return far;
        const near = [110, 262, 420, 610, 770, 930].map((x, i) => dead({ x, y: 1222 + 10 * (i % 2), s: 0.56, t: c.t, seed: 40 + i, lookY: -1, look: i < 3 ? 0.4 : -0.4, col: '#3C3A55' })).join('');
        const foot = cam(dawnSky() + wheel({ pal: DAWN, s: S }) + platform({ pal: DAWN, booth: false }) + ground(DAWN.ground), { s: lerp(2.1, 2.2, sine(p)), cx: 300, cy: 1150, x: 240 }) + near + ground(DAWN.ground, 1214);
        return mix(far, foot, k);
      },
    },
    {
      id: 'chose', from: U.chose, // day in the cabin: both look up at the roof; then the roof from inside with the prints
      draw(p, t, c) {
        const k = ease((c.since(U.chose) - 0.5 * c.dur(U.chose)) / 0.45);
        const room = cabinRoom({ pal: DAY, sky: DAY.sky }) + dad({ x: 330, t: c.t, look: 0.3, lookY: -0.9, worry: 0.5, armR: 20 })
          + varya({ x: 570, t: c.t, look: -0.2, lookY: -0.9, armR: 150 }) + popcorn({ x: 770, y: ROOM.seat }) + bottle({ x: 890, y: ROOM.seat }) + benchFront({ pal: DAY });
        const a = cam(room, { s: lerp(1.2, 1.3, sine(p)), cx: 450 });
        if (k <= 0) return a;
        return mix(a, cam(glassRoof({ prints: 1 }), { s: lerp(1, 1.08, sine(p)), cx: 540, cy: 640 }), k);
      },
    },
    {
      id: 'rule', from: U.lock, // the rule card over the dawn wheel; then the dead at the platform under the open cabin
      draw(p, t, c) {
        const k = ease((c.since(U.lock) - 0.6 * c.dur(U.lock)) / 0.4);
        const back = dawnSky() + `<g opacity="0.5">${wheel({ pal: DAWN, s: S })}</g>` + ground(DAWN.ground);
        const card = back + ruleCard({ a: (t + 0.1) / 0.4, lines: ['ДВЕРЬ КАБИНЫ', 'ОТКРЫВАЕТСЯ', 'ТОЛЬКО ИЗНУТРИ'] });
        if (k <= 0) return card;
        const below = cam(hookArt(c.t), { s: 1.5, cx: 540, cy: 1150, y: -120 });
        return mix(card, below, k);
      },
    },
    {
      id: 'scheme', from: U.self, // the scheme: the bottom cabin goes from full to empty
      draw(p, t, c) {
        const gone = 1 - ease((c.since(U.self) - 0.45 * c.dur(U.self)) / 0.5);
        const fill = Object.fromEntries(OCC.map((i) => [i, i === 8 ? gone : 1]));
        return cam(scheme({ s: S, fill }), { s: lerp(1.05, 1.3, sine(p)), cx: 540, cy: 1060 });
      },
    },
    {
      id: 'shoe', from: U.small, // one print, big; the daughter's shoe comes over it: the same size
      draw(p, t, c) {
        return cam(shoeMatch({ slide: (c.since(U.small) - 0.5 * c.dur(U.small)) / 0.8 }), { s: lerp(1, 1.06, sine(p)), cy: 760 });
      },
    },
    {
      id: 'lights', from: U.count, // night: the lanterns come on round the wheel, one short; then the daughter counting
      draw(p, t, c) {
        const g = c.since(U.count), d = c.dur(U.count), k = ease((g - 0.45 * d) / 0.4);
        const lit = Object.fromEntries(LIT.map((i, j) => [i, (g - 0.15 * j) / 0.3]));
        const far = cam(nightSky() + wheel({ pal: NIGHT, s: S, lit }) + platform({ pal: NIGHT }) + ground(NIGHT.ground), { s: lerp(1, 1.06, sine(p)), cy: 900 });
        if (k <= 0) return far;
        const view = [[190, 520], [300, 690], [700, 450], [860, 600]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${14 - i}" fill="#F2B441"/>`).join('');
        const room = cam(nightRoom({ t: c.t, view, d: { look: 0.6, lookY: -0.3, worry: 0.6 }, v: { look: 0.5, lookY: -0.8, armR: 128, worry: 0.5 }, torch: 1 }), { s: lerp(1.2, 1.3, sine(p)), cx: 440 })
          + bigCount({ values: ['11', '10'], pos: steps(g, [0.72 * d], 0.3), hiFrom: 1, y: 420, size: 210 });
        return mix(far, room, k);
      },
    },
    {
      id: 'arm', from: U.arm, // the daughter asleep, the father bends to her; then her arm close with the scratches
      draw(p, t, c) {
        const g = c.since(U.arm), d = c.dur(U.arm), k = ease((g - 0.4 * d) / 0.4);
        const room = cam(nightRoom({ t: c.t, d: { look: 0.8, lookY: 0.5, worry: 0.8, tilt: 6, armR: 40 }, v: asleep }), { s: lerp(1.25, 1.35, sine(p)), cx: 440 });
        if (k <= 0) return room;
        return mix(room, cam(scratchArm({ show: (g - 0.55 * d) / 0.6 }), { s: lerp(1, 1.08, sine(p)), cx: 600, cy: 900 }), k);
      },
    },
    {
      id: 'steps', from: U.steps, // the roof from inside at night: small shoes cross it one by one; then his face, looking up
      draw(p, t, c) {
        const g = c.since(U.steps), d = c.dur(U.steps), k = ease((g - 0.7 * d) / 0.3);
        const roof = cam(roofNight({ steps: (g / (0.7 * d)) * 6 }), { s: lerp(1, 1.06, sine(p)), cx: 540, cy: 640 });
        if (k <= 0) return roof;
        const face = cam(nightRoom({ t: c.t, d: { look: 0.2, lookY: -1, wide: 1, worry: 1, mouth: 'o' }, v: { alpha: 0 } }), { s: 2.2, cx: 330, cy: 760 });
        return mix(roof, face, k);
      },
    },
    {
      id: 'edge', from: U.edge, // the dark right window of the cabin; the camera slowly comes to it
      draw(p, t, c) {
        return cam(nightRoom({ t: c.t, d: { look: 1, lookY: -0.2, wide: 1, worry: 1 }, v: asleep }), { s: lerp(1.3, 1.9, sine(p)), cx: lerp(540, 760, sine(p)), cy: lerp(1000, 640, sine(p)) });
      },
    },
    {
      id: 'boy', from: U.boy, // the boy outside the glass, his face at the window
      draw(p, t, c) {
        const view = `<clipPath id="kwin"><rect x="558" y="370" width="410" height="440" rx="22"/></clipPath>
          <g clip-path="url(#kwin)">${boy({ x: 770, y: 850, t: c.t, look: -0.6, lookY: 0.2, armL: 120, armR: 30 })}</g>`;
        return cam(nightRoom({ t: c.t, view, d: { look: 1, lookY: -0.2, wide: 1, worry: 1, mouth: 'o' }, v: { alpha: 0 } }), { s: lerp(1.9, 2.05, sine(p)), cx: 760, cy: 640 });
      },
    },
    {
      id: 'choice', from: U.ask, caption: { hide: true },
      draw(p, t, c) {
        const d = c.dur(U.ask), g = c.since(U.ask);
        return choiceCard({ p, q: 'КАК ТЫ ПОСТУПИШЬ?', a: g - 0.3 * d, b: g - 0.66 * d, c: c.since(U.call) + 0.05, optA: 'ОТКРЫТЬ ДВЕРЬ', optB: 'ЗАТАИТЬСЯ', call: 'НАПИШИ В КОММЕНТАРИЯХ', call2: 'и перешли другу: пусть выберет тоже' });
      },
    },
  ],
  sfx: [
    { type: 'impact-low', phrase: 'door', vol: 0.5 },
    { type: 'door-creak', phrase: 'door', at: 0.6, vol: 0.4 },
    { type: 'wind-howl', phrase: 'place', loop: true, dur: 14, vol: 0.15 },
    { type: 'impact-low', phrase: 'lock', at: 0.5, vol: 0.6 },
    { type: 'knock-glass', phrase: 'steps', at: 0.4, vol: 0.3 },
    { type: 'impact-low', phrase: 'boy', at: 0.5, vol: 0.75 },
  ],
  experiment: 'карточка правила «Дверь кабины открывается только изнутри» на 2–3 секунды (H5); жду сохранения от 1 % охвата',
  endCard: { line: 'Продолжение завтра', sub: 'Серия 3' },
  cover: {
    ep: 2,
    title: ['КОЛЕСО'],
    hook: 'ДО ЗЕМЛИ ВОСЕМЬ НОЧЕЙ',
    hookHi: 'ВОСЕМЬ НОЧЕЙ',
    art: hookArt(0),
  },
  post: `Утром нижняя кабина колеса обозрения опустела, а её дверь открыли изнутри.

«Колесо», серия 2.

Как ты поступишь: А — открыть дверь, Б — затаиться? Напиши в комментариях.
Перешли тому, с кем оказался бы в этой кабине.

#колесо #зомбиапокалипсис #минисериал #анимация #тайна`,
};
