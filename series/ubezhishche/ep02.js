// «Убежище», серия 2 «Вторая дверь». Аккаунт «Ты бы выжил?».
// Text: the ready text of bible.md, split into phrases; nothing changed but the stress marks for the voice.
// The rule that breaks: «по плану дверь здесь одна». The break: a voice from behind the second door names Vika.
// Silent clue: the arm out of the vent wears the same grey as the man in uniform (it plays in episode 6).
// Style 2 (kit/v2.js), the same hall, people and door as ep01; new props are in ./scenes.js.
import { lerp } from '../../kit/index.js';
import { V, FLOOR, theme, sine, ease, hop, travel, cam, bg, floor, appear, person, lamp, hatch, wallDoor, crate, tag, rollTag } from '../../kit/v2.js';
import { ilya, vika, store, vent, arm, beam, torch, corridor, sleeper, bunk } from './scenes.js';

const N = [
  { id: 'remind', text: 'Напомню. В убежище под школой закрылись *сорок три* человека.', gap: 0.3 },
  { id: 'food', text: 'А еды каждый день уходит на *сорок четыре*.', gap: 0.4 },
  { id: 'night', text: 'Этой ночью учитель Илья Сергеев увидел, *кто* её берёт.', gap: 0.5 },
  { id: 'door', text: 'Стальная дверь закрыта *изнутри*.', say: 'Стальная дверь закрыта изнутри́.', gap: 0.25 },
  { id: 'one', text: 'По плану она здесь *одна*.', gap: 0.45 },
  { id: 'list', text: 'Илья пересчитал всех по списку. *Сорок три*.', gap: 0.35 },
  { id: 'vika', text: 'Последней в списке стоит его дочь, *Вика*.', gap: 0.2 },
  { id: 'eleven', text: 'Ей одиннадцать.', gap: 0.4 },
  { id: 'chalk', text: 'Он пометил банки *мелом*, уложил Вику спать и сел у склада с фонарём.', gap: 0.45 },
  { id: 'one_am', text: 'Час ночи. Тихо.', gap: 0.35 },
  { id: 'two_am', text: 'Два часа. Все спят.', gap: 0.4 },
  { id: 'creak', text: 'В три десять за ящиком что-то *скрипнуло*.', gap: 0.45 },
  { id: 'light', text: 'Илья посветил туда. В стене решётка вентиляции.', gap: 0.2 },
  { id: 'moved', text: 'И она *сдвинута*.', gap: 0.45 },
  { id: 'hand', text: 'Из темноты показалась *рука*.', gap: 0.2 },
  { id: 'took', text: 'Взяла банку.', gap: 0.2 },
  { id: 'gone', text: 'И *исчезла*.', gap: 0.5 },
  { id: 'ran', text: 'Илья подбежал к стене. За решёткой узкий коридор.', gap: 0.25 },
  { id: 'noplan', text: 'На плане его *нет*.', gap: 0.45 },
  { id: 'end', text: 'А в конце коридора железная дверь.', gap: 0.25 },
  { id: 'second', text: '*Вторая*.', gap: 0.5 },
  { id: 'knew', text: 'Илья узнал её. Такая же есть в зале, на *дальней стене*.', gap: 0.35 },
  { id: 'years', text: 'Двадцать лет он говорил детям, что за ней *кладовка*.', gap: 0.5 },
  { id: 'back', text: 'Он вернулся в зал и дёрнул ручку.', gap: 0.25 },
  { id: 'shut', text: 'Закрыто. *Изнутри*.', say: 'Закрыто. Изнутри́.', gap: 0.5 },
  { id: 'then', text: 'А потом из-за двери сказали:', gap: 0.55 },
  { id: 'last', text: '— Тише, Илья Сергеевич. *Вика спит*.' },
];

const U = Object.fromEntries(N.map((u, i) => [u.id, i]));
const CUE = { counted: ['list', 1], quiet: ['one_am', 1], sleep: ['two_am', 1], grate: ['light', 1], ranTo: ['ran', 1], there: ['knew', 1], closed: ['shut', 0], inside: ['shut', 1] };
const at = (c, key) => c.at(U[CUE[key][0]], CUE[key][1]);
const HATCH = 250;
const gordeev = (o) => person({ col: V.gordeev, seed: 2, k: 1.06, shoulders: 0.3, cap: true, ...o });
const KID = [{ col: V.crowd[0], k: 0.6, seed: 4 }, { col: V.crowd[2], k: 0.56, seed: 5 }];
const ROW = [[330, 0, { col: V.crowd[1], k: 1, seed: 7 }], [385, 1, { col: V.crowd[2], k: 0.98, seed: 11 }], [440, 0, { col: V.crowd[0], k: 0.94, seed: 8 }], [495, 1, KID[0]],
  [550, 0, { col: V.crowd[2], k: 1, seed: 10 }], [605, 1, { col: V.crowd[0], k: 1, seed: 12 }], [660, 0, { col: V.crowd[1], k: 0.9, wide: 1.18, seed: 9 }], [715, 1, KID[1]], [775, 0, { col: V.gordeev, k: 1.06, shoulders: 0.3, cap: true, seed: 2 }]];
const crowd = (c, up = () => 0, look = -0.6) => {
  const one = ([x, front, o], j) => person({ ...o, x, y: front ? FLOOR + 8 : FLOOR - 34, t: c.t, look, hop: up(j) });
  return ROW.map((r, j) => (r[1] ? '' : one(r, j))).join('') + ROW.map((r, j) => (r[1] ? one(r, j) : '')).join('');
};
// the store at night: dark room, the crate with the marked packs, the vent in the wall behind it
const CR = 420, VX = 800, VY = FLOOR - 250;

export default {
  series: 'Убежище',
  episode: 2,
  theme,
  gap: 0.25,
  tail: 1.1,
  endCardDur: 2.8,
  narration: N,
  shots: [
    {
      id: 'crowd', from: U.remind, // reminder: forty-three people under the lamp
      draw(p, t, c) {
        const scene = lamp() + wallDoor() + floor() + crowd(c, () => 0, 0.2)
          + vika({ x: 880, y: FLOOR + 8, t: c.t, look: -0.6, lookY: -0.2 }) + ilya({ x: 150, y: FLOOR + 12, t: c.t, look: 0.8 });
        return bg() + cam(scene, { s: lerp(1.1, 1, sine(p)) }) + tag({ text: '43 ЧЕЛОВЕКА', a: (t - 0.6) / 0.35 });
      },
    },
    {
      id: 'box', from: U.food, // the crate: food goes for forty-four
      draw(p, t, c) {
        const roll = ease((t - 0.55 * c.dur(U.food)) / 0.45);
        const scene = lamp() + floor() + crate({ x: 540, packs: 3 }) + rollTag({ x: 456, y: FLOOR - 172, values: ['43', '44'], pos: roll, size: 64, pad: 0.6, a: (t + 0.1) / 0.3 });
        return bg() + cam(scene, { s: lerp(1.3, 1.42, sine(p)) });
      },
    },
    {
      id: 'watch', from: U.night, // tonight: Ilya by the store with a flashlight, the room dark
      draw(p, t, c) {
        const scene = floor() + store({ x: CR }) + vent({ x: VX, y: VY })
          + ilya({ x: 160, y: FLOOR + 10, t: c.t, look: 0.7, lookY: -0.1 }) + torch({ x: 225, y: FLOOR - 150 });
        return bg(V.deep) + cam(scene, { s: lerp(1.15, 1.05, sine(p)), x: lerp(-30, 0, sine(p)) });
      },
    },
    {
      id: 'hatch', from: U.door, // the steel door, shut from the inside; by the plan it is the only one
      draw(p, t, c) {
        const scene = lamp() + hatch({ x: HATCH, turn: 140 }) + floor();
        return bg() + cam(scene, { s: lerp(1.4, 1.55, sine(p)), cx: HATCH, x: lerp(262, 240, sine(p)) })
          + tag({ x: 68, y: 330, text: 'ДВЕРЬ ОДНА', a: c.since(U.one) / 0.4 });
      },
    },
    {
      id: 'list', from: U.list, // the count by the list: forty-three heads
      draw(p, t, c) {
        const D = at(c, 'counted') - 0.1, n = t, g = n / Math.max(1, t - D);
        const scene = lamp() + wallDoor() + floor() + crowd(c, (j) => hop(n - (0.1 + 0.18 * j), 13))
          + vika({ x: 880, y: FLOOR + 8, t: c.t, look: -0.6, hop: hop(n - 1.85, 13) })
          + ilya({ x: 150, y: FLOOR + 12, t: c.t, look: lerp(0.3, 1, sine(t / 2.2)) });
        return bg() + cam(scene, { s: lerp(1, 1.05, sine(p)), x: lerp(16, -24, sine(p)) })
          + rollTag({ values: ['40', '41', '42', '43'], pos: 3 * ease((at(c, 'counted') + 0.05) / 0.5), size: 96, pad: 0.55, a: (t + 0.1) / 0.35 });
      },
    },
    {
      id: 'daughter', from: U.vika, // his daughter, last on the list; eleven
      draw(p, t, c) {
        const turn = ease(c.since(U.eleven) / 0.5);
        const scene = lamp() + floor() + ilya({ x: 400, y: FLOOR + 6, t: c.t, look: 0.8, lookY: 0.4 }) + vika({ x: 640, y: FLOOR + 6, t: c.t, look: lerp(0.5, -0.8, turn), lookY: -0.5 * turn });
        return bg() + cam(scene, { s: lerp(1.25, 1.45, sine(p)), cx: 560, x: 20 }) + tag({ text: 'ВИКА, 11', a: c.since(U.eleven) / 0.4 });
      },
    },
    {
      id: 'chalk', from: U.chalk, // he ticks the packs with chalk, puts her to bed, sits by the store
      draw(p, t, c) {
        const d = c.dur(U.chalk), m = ease(t / (0.33 * d)) * 3;
        const sl = ease((t - 0.36 * d) / (0.2 * d)), sit = ease((t - 0.62 * d) / (0.25 * d));
        const close = store({ x: 540, marks: m });
        const bed = bunk({ x: 540 }) + sleeper({ x: 520, t: c.t });
        const watch = floor() + store({ x: CR }) + vent({ x: VX, y: VY }) + ilya({ x: 160, y: FLOOR + 10, t: c.t, look: 0.7 }) + torch({ x: 225, y: FLOOR - 150 });
        const a = 1 - sl, b = sl * (1 - sit);
        return bg(sit > 0.5 ? V.deep : V.bg)
          + (a > 0 ? `<g opacity="${a.toFixed(3)}">${cam(close + floor(), { s: lerp(1.6, 1.7, sine(p)) })}</g>` : '')
          + (b > 0 ? `<g opacity="${b.toFixed(3)}">${bg()}${cam(lamp({ cone: false }) + bed + floor(), { s: 1.1 })}</g>` : '')
          + (sit > 0 ? `<g opacity="${sit.toFixed(3)}">${bg(V.deep)}${cam(watch, { s: 1.05 })}</g>` : '');
      },
    },
    {
      id: 'clock', from: U.one_am, // one o'clock, two o'clock: quiet; he keeps looking round
      draw(p, t, c) {
        const pos = ease(c.since(U.two_am) / 0.5);
        const look = Math.sin(t * 0.9) * 0.8;
        const scene = floor() + store({ x: CR }) + vent({ x: VX, y: VY }) + ilya({ x: 160, y: FLOOR + 10, t: c.t, look, lookY: -0.1 }) + torch({ x: 225, y: FLOOR - 150 });
        return bg(V.deep) + cam(scene, { s: lerp(1.05, 1.12, sine(p)) }) + rollTag({ values: ['1:00', '2:00'], pos, size: 96, pad: 0.55, a: (t + 0.1) / 0.35 });
      },
    },
    {
      id: 'creak', from: U.creak, // ten past three: something creaks behind the crate
      draw(p, t, c) {
        const turn = ease((t - 1.6) / 0.4);
        const scene = floor() + store({ x: CR }) + vent({ x: VX, y: VY, shift: 0.06 * ease((t - 1.3) / 0.3) })
          + ilya({ x: 160, y: FLOOR + 10, t: c.t, look: lerp(-0.6, 1, turn), lookY: -0.2, worry: turn, hop: hop(t - 1.5, 10) }) + torch({ x: 225, y: FLOOR - 150 });
        return bg(V.deep) + cam(scene, { s: lerp(1.05, 1.2, sine(p)), cx: 560 }) + tag({ text: '3:10', size: 64, a: (t + 0.1) / 0.35 });
      },
    },
    {
      id: 'vent', from: U.light, // the beam finds the grate in the wall; it has been moved
      draw(p, t, c) {
        const on = (t - 0.2) / 0.3, sh = ease(c.since(U.moved) / 0.6);
        const scene = floor() + beam({ x: 260, y: FLOOR - 150, tx: VX, ty: VY, spread: 140, a: on }) + store({ x: CR }) + vent({ x: VX, y: VY, shift: lerp(0.06, 0.4, sh) })
          + ilya({ x: 160, y: FLOOR + 10, t: c.t, look: 1, lookY: -0.3, worry: 1 }) + torch({ x: 225, y: FLOOR - 150 });
        return bg(V.deep) + cam(scene, { s: lerp(1.15, 1.6, sine(p)), cx: VX, x: lerp(-40, -200, sine(p)) });
      },
    },
    {
      id: 'arm', from: U.hand, // an arm out of the dark takes one pack and is gone
      draw(p, t, c) {
        const a = c.since(U.hand), tk = c.since(U.took), g = c.since(U.gone);
        const reach = g > 0 ? 300 * (1 - ease(g / 0.5)) : a > 0 ? 300 * ease(a / 1.0) : 0;
        const grab = tk > 0.3;
        const scene = floor() + beam({ x: 100, y: FLOOR - 150, tx: VX, ty: VY, spread: 160 }) + store({ x: 560, gone: grab ? 2 : -1 }) + vent({ x: VX + 60, y: VY, shift: 0.4 })
          + arm({ x: VX + 60 - 30, y: VY + 10, reach: grab ? reach : reach, hold: grab ? 1 : 0 });
        return bg(V.deep) + cam(scene, { s: 1.55, cx: 700, x: -140 + 6 * Math.sin(t * 1.3) });
      },
    },
    {
      id: 'tunnel', from: U.ran, enter: 'up', // behind the grate: a narrow corridor that is not on the plan
      draw(p, t, c) {
        const s = lerp(0.9, 1.05, sine(p));
        return `<g transform="translate(540 860) scale(${s.toFixed(5)}) translate(-540 -860)">${corridor({ door: 0 })}</g>`
          + tag({ text: 'НЕТ НА ПЛАНЕ', a: c.since(U.noplan) / 0.4 });
      },
    },
    {
      id: 'far', from: U.end, // at its end an iron door with a small lamp: the second one
      draw(p, t, c) {
        const s = lerp(1.05, 1.5, sine(p));
        return `<g transform="translate(540 860) scale(${s.toFixed(5)}) translate(-540 -860)">${corridor({ door: (t + 0.1) / 0.8 })}</g>`;
      },
    },
    {
      id: 'hall', from: U.knew, // the same door is in the hall, on the far wall
      draw(p, t, c) {
        const th = ease(at(c, 'there') / 1.2);
        const scene = lamp() + wallDoor() + floor() + ilya({ x: 640, y: FLOOR + 6, t: c.t, look: 1, lookY: -0.2, worry: 0.6 });
        const yrs = c.since(U.years);
        const kids = [420, 510].map((x, j) => appear(person({ ...KID[j], x, y: FLOOR + 6, t: c.t, look: 0.8 }), (yrs - 0.4 - 0.2 * j) / 0.4, 0)).join('');
        return bg() + cam(scene + kids, { s: lerp(1.05, 1.3, th), cx: 760, x: lerp(-180, -120, th) }) + tag({ text: 'КЛАДОВКА', a: (yrs - 1.6) / 0.4 });
      },
    },
    {
      id: 'handle', from: U.back, // he pulls the handle: shut, from the inside
      draw(p, t, c) {
        const pull = c.since(U.back) - 1.4, jig = pull > 0 && pull < 1.2 ? 10 * Math.sin(pull * 22) * (1 - pull / 1.2) : 0;
        const w = travel(t, 0, 1.3, 600, 845);
        const scene = lamp() + `<g transform="translate(${jig.toFixed(2)} 0)">${wallDoor()}</g>` + floor()
          + ilya({ x: w.x, y: FLOOR + 6, t: c.t, walk: w, look: 1, lookY: -0.1, worry: ease(at(c, 'closed') / 0.4) });
        return bg() + cam(scene, { s: lerp(1.45, 1.6, sine(p)), cx: 900, x: -40 });
      },
    },
    {
      id: 'voice', from: U.then, // then a voice from behind the door; he freezes
      draw(p, t, c) {
        const scene = lamp() + wallDoor() + floor() + ilya({ x: 845, y: FLOOR + 6, t: c.t, look: 1, lookY: -0.3, worry: 1, hop: hop(t - 1.3, 8) });
        return bg() + cam(scene, { s: lerp(1.6, 1.9, sine(p)), cx: 960, x: -60 });
      },
    },
    {
      id: 'sleep', from: U.last, caption: { y: 1420 }, // she sleeps, right by the far wall
      draw(p, t, c) {
        const scene = lamp({ cone: false }) + bunk({ x: 600 }) + sleeper({ x: 580, t: c.t }) + floor();
        return bg(V.deep) + cam(scene, { s: lerp(1.3, 1.45, sine(p)), cx: 600 });
      },
    },
  ],
  endCard: { line: 'Продолжение завтра', sub: 'Серия 3' },
  cover: {
    ep: 2,
    title: ['ВТОРАЯ', 'ДВЕРЬ'],
    hook: 'ПО ПЛАНУ ДВЕРЬ ОДНА',
    hookHi: 'ОДНА',
    art: lamp() + hatch({ x: 250 }) + wallDoor({ x: 860 }) + floor() + ilya({ x: 560, y: FLOOR + 6, look: 1, worry: 0.8 }),
  },
  post: `Дверь в убежище одна. Так было написано на плане. Этой ночью учитель Илья увидел, кто берёт лишнюю банку.

«Убежище», серия 2.

#убежище #выживание #минисериал #анимация #тайна`,
};
