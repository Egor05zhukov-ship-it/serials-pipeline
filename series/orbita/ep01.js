// «Орбита», серия 1 «Стук». Аккаунт «Третье правило». Третья редакция (19.11.2026): связный рассказ.
// One thought from the first sentence to the last (series/SCENARIST.md, section 0): «я остался один на станции, Земля
// молчит и возвращаться некуда, но сегодня в люк постучали снаружи, и на скафандре гостя моя фамилия». Whole sentences
// tied with «а / и / хотя»; nobody is introduced and nothing is explained (why the Earth is silent, who is outside).
// One row of N = one sentence = one voice file; «|» only cuts the caption into chunks. Inside a long sentence the
// picture changes by the share of its length (c.since / c.dur).
// Scenes and their colours: outside by day (hook), the call on a warm screen (call), the night Earth in the round
// window (earth), the pale module (air, knock), the man in the window (seen, man), outside at night (inside «seen»),
// the patch (name), the choice card.
// Silent clue: the hero's own suit hangs in the niche with the same amber patch (shot «air»); the suit outside shows
// its patch small in the window before the voice names it.
import { clamp, lerp } from '../../kit/index.js';
import { theme, sine, ease, cam, choiceCard } from '../../kit/v2.js';
import { human, P } from '../../kit/people.js';
import { O, space, earth, station, hatchAt, suit, hero, moduleRoom, porthole, hatch, shake, tablet, lookOut, midTag, band } from '../../kit/orbita.js';

const N = [
  { id: 'one', text: 'Я остался один | на космической станции, | а Земля не отвечает | уже *третий день*.', gap: 0.55 },
  { id: 'dau', text: 'Последней на связь вышла дочь | и успела сказать только одно: | «Папа, *не спускайся*».', say: 'Последней на связь вышла дочь и успела сказать только одно. Папа, не спускайся.', gap: 0.6 },
  { id: 'gas', text: 'Той же ночью внизу | один за другим | погасли *огни городов*.', gap: 0.6 },
  { id: 'air', text: 'Воздуха у меня на *сорок дней*, | а возвращаться, похоже, некуда.', gap: 0.6 },
  { id: 'knock', text: 'Сегодня в люк *постучали*.', gap: 0.35 },
  { id: 'outside', text: '*Снаружи*.', gap: 0.6 },
  { id: 'seen', text: 'Я подтянулся к окну | и увидел человека *в скафандре*, | хотя ни один корабль | к станции не подлетал.', gap: 0.5 },
  { id: 'visor', text: 'Стекло его шлема было тёмным, | и я не видел, *кто внутри*.', gap: 0.45 },
  { id: 'lock', text: 'Он протянул руку | и показал на люк: | просил *открыть*.', gap: 0.55 },
  { id: 'name', text: 'И тогда я заметил, | что на его скафандре | написана *моя фамилия*.', gap: 0.8 },
  { id: 'ask', text: 'Как бы ты поступил: открыл люк или затаился?', gap: 0.4 },
  { id: 'call', text: 'Напиши в комментариях и перешли другу: пусть выберет тоже.' },
];
const U = Object.fromEntries(N.map((u, i) => [u.id, i]));
const mix = (a, b, k) => (k <= 0 ? a : k >= 1 ? b : `${a}<g opacity="${k.toFixed(3)}">${b}</g>`);
// the picture of the hook: the station over the day side of the Earth (also the cover)
const hookArt = (k = 0) => space() + earth({ top: lerp(1090, 1050, k) }) + station({ x: 540, y: 610, s: lerp(1, 1.1, k) });
// the girl on the screen of the call: only her head and shoulders fit the screen
const girl = (o) => human({ x: 540, y: 1424, k: 2.5, col: O.girl, hair: { style: 'bob', col: P.hair.black }, wear: 'tee', seed: 1, shadow: false, armL: 4, armR: 4, style: { nohair: false }, ...o });
// the man outside, seen through the round window; up = 0..1 his arm goes up
const outside = (p, c, { up = 0, s0 = 1, s1 = 1.14 } = {}) => {
  const view = space({ seed: 9 }) + suit({ x: 560, y: 1150, k: 1.25, tilt: -7, armL: 18, armR: lerp(18, 152, up), t: c.t });
  return cam(lookOut({ view }), { s: lerp(s0, s1, sine(p)), cx: 540, cy: 700 }) + band(1240);
};

export default {
  series: 'Орбита',
  episode: 1,
  theme,
  gap: 0.3,
  tail: 0.5,
  endCardDur: 2.4,
  narration: N,
  choice: { a: 'Открыть люк', b: 'Затаиться' },
  shots: [
    {
      id: 'hook', from: U.one, // the station over the blue Earth, the counter of silence from frame 0
      draw(p) {
        return hookArt(sine(p)) + midTag({ text: 'ЗЕМЛЯ МОЛЧИТ 3 ДНЯ', y: 300, size: 76 });
      },
    },
    {
      id: 'call', from: U.dau, // the last call from home on a floating tablet: the daughter says her words, then «no signal»
      draw(p, t, c) {
        const d = c.dur(U.dau), g = c.since(U.dau), w = ease((g - 0.6 * d) / 0.4), off = (g - d - 0.05) / 0.25;
        const face = girl({ t: c.t, lookY: -0.1, worry: w, mouth: w > 0.5 ? 'o' : 'none' });
        return moduleRoom() + tablet({ x: 540, y: 660, face, off, rot: lerp(-3, -1, sine(p)) }) + band();
      },
    },
    {
      id: 'earth', from: U.gas, // the night side in the round window: the cities go out one after another, ours is the last
      draw(p, t, c) {
        const g = c.since(U.gas), d = c.dur(U.gas), lit = 1 - clamp((g - 0.3 * d) / (0.5 * d)), home = 1 - (g - 0.88 * d) / 0.35;
        const view = space({ stars: false }) + earth({ top: 400, night: true, lit, home });
        return cam(lookOut({ view }), { s: lerp(1, 1.09, sine(p)), cx: 540, cy: 700 }) + band(1240);
      },
    },
    {
      id: 'air', from: U.air, // the whole module: the hero floats alone, his own suit hangs in the niche, the Earth in the window is dark
      draw(p, t, c) {
        const niche = `<rect x="80" y="470" width="290" height="700" rx="40" fill="${O.rib}"/><rect x="120" y="500" width="210" height="18" rx="9" fill="${O.wheel}"/>`;
        const scene = moduleRoom() + porthole({ x: 840, y: 640, r: 150, view: earth({ top: 660, r: 620, cx: 840, night: true, lit: 0, home: 0 }) })
          + niche + suit({ x: 225, y: 1120, k: 0.86, armL: 3, armR: 3, t: 0 })
          + hero({ x: 610, y: 1090, k: 1.08, t: c.t, look: 0.5, lookY: -0.2, worry: 0.6, tilt: -6 });
        return cam(scene, { s: lerp(1.02, 1.1, sine(p)), cx: 540 }) + midTag({ text: 'ВОЗДУХА НА 40 ДНЕЙ', y: 230, size: 72, a: (t - 0.05) / 0.35 });
      },
    },
    {
      id: 'knock', from: U.knock, // inside, the round hatch: three knocks push it, then the camera goes to its dark window
      draw(p, t, c) {
        const k0 = c.since(U.knock) - 0.78 * c.dur(U.knock), kn = [k0, k0 - 0.22, k0 - 0.42]; // the three knocks of the recording
        const push = sine((c.since(U.outside) + 0.15) / 1.3);
        return cam(moduleRoom() + hatch({ x: 540, y: 690, r: 300, dx: shake(kn, 11), dy: shake(kn.map((u) => u - 0.03), 5), sticker: false }), { s: lerp(1, 1.5, push), cx: 540, cy: 690 }) + band();
      },
    },
    {
      id: 'seen', from: U.seen, // through the round window: a man in a suit; on «ни один корабль» the station from outside, nothing near it
      draw(p, t, c) {
        const k = ease((c.since(U.seen) - 0.58 * c.dur(U.seen)) / 0.45);
        const man = outside(p, c);
        if (k <= 0) return man;
        const st = { x: 520, y: 640, s: lerp(0.9, 0.76, sine(p)), rot: -8 }, h = hatchAt(st);
        const far = space({ seed: 12 }) + earth({ top: 1150, night: true, lit: 0, home: 0 }) + station(st)
          + suit({ x: h.x + 44 * st.s, y: h.y + 150 * st.s, k: 0.34 * st.s, tilt: -24, t: c.t, name: '' });
        return mix(man, far, k);
      },
    },
    {
      id: 'man', from: U.visor, // closer: the dark visor; then he lifts a hand and points at the hatch
      draw(p, t, c) {
        return outside(p, c, { up: ease((c.since(U.lock) - 0.05) / 0.8), s0: 1.16, s1: 1.3 });
      },
    },
    {
      id: 'name', from: U.name, caption: { size: 92, max: 940, push: 0.04 }, // the chest of the suit outside, close: the amber patch
      draw(p, t, c) {
        const scene = space({ stars: false }) + suit({ x: 540, y: 1690, k: 3.6, tilt: -3, armL: 10, armR: 10, t: c.t * 0.4 });
        return cam(scene, { s: lerp(1, 1.09, sine(p)), cx: 540, cy: 720 }) + band(1190);
      },
    },
    {
      id: 'choice', from: U.ask, caption: { hide: true }, // the viewer's choice and the reason to forward the episode
      draw(p, t, c) {
        const d = c.dur(U.ask), g = c.since(U.ask);
        return choiceCard({ p, q: 'КАК БЫ ТЫ ПОСТУПИЛ?', a: g - 0.34 * d, b: g - 0.66 * d, c: c.since(U.call) + 0.05, optA: 'ОТКРЫТЬ ЛЮК', optB: 'ЗАТАИТЬСЯ', call: 'НАПИШИ В КОММЕНТАРИЯХ', call2: 'и перешли другу: пусть выберет тоже', back: O.band, fill: '#1C2C47' });
      },
    },
  ],
  sfx: [
    { type: 'impact-low', phrase: 'one', vol: 0.5 },
    { type: 'radio-static', phrase: 'dau', at: 1, vol: 0.35 },
    { type: 'impact-low', phrase: 'gas', at: 0.88, vol: 0.45 },
    { type: 'knock-door', phrase: 'knock', at: 0.78, vol: 0.9 },
    { type: 'impact-low', phrase: 'seen', at: 0.3, vol: 0.6 },
    { type: 'knock-door', phrase: 'lock', at: 1, vol: 0.9 },
    { type: 'impact-low', phrase: 'name', at: 0.6, vol: 0.8 },
  ],
  experiment: 'связный рассказ без перечислений (раздел 0 сценариста), не зомби, темп 1,05, вопрос и просьба переслать в конце; жду watched выше 0,55 и пересылки от 1 % охвата',
  endCard: { line: 'Продолжение завтра', sub: 'Серия 2' },
  cover: {
    ep: 1,
    title: ['ОРБИТА'],
    hook: 'В ЛЮК ПОСТУЧАЛИ СНАРУЖИ',
    hookHi: 'СНАРУЖИ',
    art: hookArt(0.5),
  },
  post: `Я остался один на космической станции, а Земля не отвечает третий день. Сегодня в люк постучали. Снаружи.

«Орбита», серия 1.

Как бы ты поступил: А — открыть люк, Б — затаиться? Напиши в комментариях.
Перешли тому, кому доверил бы этот люк.

#орбита #космос #страшныеистории #минисериал #анимация`,
};
