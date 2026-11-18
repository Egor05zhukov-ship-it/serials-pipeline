// «Убежище», серия 3 «Записка». Аккаунт «Ты бы выжил?».
// Text: the ready text of bible.md, split into phrases. For the voice only: dashes that open dialogue are left out of
// say, and «Отсек Б» stays in one phrase with the sentence before it, so the letter is heard in context.
// The rule that breaks: the plan of the shelter (it hides a whole room). The break: a pencil line on the note.
// Silent clue: the lamp above the far door is lit at night (Vika says so; it plays in episode 5).
// Style 2 (kit/v2.js), the same hall, people and doors as ep01-ep02; new props are in ./scenes.js.
import { lerp } from '../../kit/index.js';
import { V, FLOOR, theme, sine, ease, hop, travel, cam, bg, floor, person, lamp, hatch, wallDoor, crate, tag, rollTag } from '../../kit/v2.js';
import { ilya, vika, planSheet, floorSheet, heldSheet, noteSheet } from './scenes.js';

const N = [
  { id: 'remind', text: 'Напомню. В убежище под школой *сорок три* человека, а еды уходит на *сорок четыре*.', gap: 0.45 },
  { id: 'behind', text: 'За железной дверью в стене *кто-то живёт*.', gap: 0.3 },
  { id: 'name', text: 'И он знает учителя Илью *по имени*.', gap: 0.5 },
  { id: 'plan', text: 'Утром Илья Сергеев достал старый *план* убежища.', gap: 0.35 },
  { id: 'stain', text: 'На месте этой двери *пятно краски*.', gap: 0.3 },
  { id: 'room', text: 'Кто-то закрасил *целую комнату*.', gap: 0.5 },
  { id: 'under', text: 'Под краской Илья разобрал два слова. «*Отсек Б*».', say: 'Под краской Илья разобрал два слова. «Отсек Бэ».', gap: 0.55 },
  { id: 'light', text: '— Там ночью горит *свет*, — сказала Вика.', say: 'Там ночью горит свет, — сказала Вика.', gap: 0.3 },
  { id: 'notices', text: 'Она всегда замечает то, чего не видят *взрослые*.', gap: 0.5 },
  { id: 'man', text: 'К двери подошёл мужчина *в форме*.', gap: 0.25 },
  { id: 'stranger', text: 'Тот, которого *никто не знал*.', gap: 0.45 },
  { id: 'break', text: '— *Ломаем*, — сказал он.', say: 'Ломаем, — сказал он.', gap: 0.25 },
  { id: 'crowbar', text: 'И пошёл за ломом.', gap: 0.5 },
  { id: 'knock', text: 'Илья постучал. *Три раза*.', gap: 0.35 },
  { id: 'quiet', text: 'За дверью было тихо.', gap: 0.55 },
  { id: 'rustle', text: 'А потом под дверью *зашуршало*.', gap: 0.35 },
  { id: 'slip', text: 'Из щели показался *листок* бумаги.', gap: 0.45 },
  { id: 'pick', text: 'Илья поднял его.', gap: 0.35 },
  { id: 'print', text: 'Печатные буквы. Ровные, как в *приказе*.', gap: 0.5 },
  { id: 'order', text: '«Наружную дверь *не открывать*».', gap: 0.55 },
  { id: 'below', text: 'И ниже, *карандашом*:', gap: 0.6 },
  { id: 'last', text: '«Наверху не то, | что вы *думаете*».', say: '«Наверху не то, что вы думаете».' },
];

const U = Object.fromEntries(N.map((u, i) => [u.id, i]));
// moments the picture reacts to: [phrase, number of the sentence in it]
const CUE = { word: ['under', 1], knocked: ['knock', 1], even: ['print', 1] };
const at = (c, key) => c.at(U[CUE[key][0]], CUE[key][1]);
const DX = 1000; // the far door in the hall
const gordeev = (o) => person({ col: V.gordeev, seed: 2, k: 1.06, shoulders: 0.3, cap: true, ...o });
const KID = [{ col: V.crowd[0], k: 0.6, seed: 4 }, { col: V.crowd[2], k: 0.56, seed: 5 }];
const ROW = [[330, 0, { col: V.crowd[1], k: 1, seed: 7 }], [385, 1, { col: V.crowd[2], k: 0.98, seed: 11 }], [440, 0, { col: V.crowd[0], k: 0.94, seed: 8 }], [495, 1, KID[0]],
  [550, 0, { col: V.crowd[2], k: 1, seed: 10 }], [605, 1, { col: V.crowd[0], k: 1, seed: 12 }], [660, 0, { col: V.crowd[1], k: 0.9, wide: 1.18, seed: 9 }], [715, 1, KID[1]], [775, 0, { col: V.gordeev, k: 1.06, shoulders: 0.3, cap: true, seed: 2 }]];
const crowd = (c, look = -0.6) => {
  const one = ([x, front, o]) => person({ ...o, x, y: front ? FLOOR + 8 : FLOOR - 34, t: c.t, look });
  return ROW.map((r) => (r[1] ? '' : one(r))).join('') + ROW.map((r) => (r[1] ? one(r) : '')).join('');
};
// the far door close up: the door in the middle of the frame, the floor line where it always is
const DOOR = { s: 2.1, cx: DX, x: 540 - DX };
const knockAt = (k) => [0.15, 0.55, 0.95].reduce((s, x) => { const u = k - x; return s + (u > 0 && u < 0.3 ? 7 * Math.sin((u / 0.3) * Math.PI) : 0); }, 0);

export default {
  series: 'Убежище',
  episode: 3,
  theme,
  gap: 0.25,
  tail: 1.1,
  endCardDur: 2.8,
  narration: N,
  shots: [
    {
      id: 'crowd', from: U.remind, // reminder: forty-three under the lamp, the count rolls to forty-four
      draw(p, t, c) {
        const roll = ease((t - 0.55 * c.dur(U.remind)) / 0.45);
        const scene = lamp() + wallDoor() + floor() + crowd(c, 0.2)
          + vika({ x: 880, y: FLOOR + 8, t: c.t, look: -0.6, lookY: -0.2 }) + ilya({ x: 150, y: FLOOR + 12, t: c.t, look: 0.8 });
        return bg() + cam(scene, { s: lerp(1.1, 1, sine(p)) }) + rollTag({ values: ['43', '44'], pos: roll, size: 96, pad: 0.55, a: (t + 0.1) / 0.35 });
      },
    },
    {
      id: 'door', from: U.behind, // the far door with its small lamp; Ilya stands before it, someone lives behind it
      draw(p, t, c) {
        const scene = lamp({ cone: false }) + wallDoor() + floor() + ilya({ x: 780, y: FLOOR + 6, t: c.t, look: 1, lookY: -0.2, worry: ease(c.since(U.name) / 0.5) });
        return bg() + cam(scene, { s: lerp(1.35, 1.6, sine(p)), cx: 900, x: lerp(-20, -60, sine(p)) });
      },
    },
    {
      id: 'plan', from: U.plan, // the old plan; a blot of paint where the door is: a whole room painted over
      draw(p, t, c) {
        const st = ease((c.since(U.stain) + 0.1) / 0.6);
        return bg() + cam(planSheet({ stain: st }), { s: lerp(1, 1.06, sine(p)), cy: 740 }) + floor();
      },
    },
    {
      id: 'word', from: U.under, // under the paint two words come through
      draw(p, t, c) {
        return bg() + cam(planSheet({ stain: 1, word: (at(c, 'word') + 0.1) / 0.6 }), { s: lerp(1.5, 1.75, sine(p)), cx: 770, cy: 930, x: -230, y: -60 }) + floor();
      },
    },
    {
      id: 'vika', from: U.light, // night: the lamp over the far door is lit; Vika points it out, she sees what grown-ups miss
      draw(p, t, c) {
        const turn = ease(c.since(U.notices) / 0.5);
        const scene = wallDoor() + floor()
          + ilya({ x: 560, y: FLOOR + 6, t: c.t, look: lerp(0.9, 0.6, turn), lookY: lerp(-0.4, 0.4, turn) })
          + vika({ x: 720, y: FLOOR + 6, t: c.t, look: lerp(0.9, -0.7, turn), lookY: -0.4, hop: hop(t - 0.2, 12) });
        return bg(V.deep) + cam(scene, { s: lerp(1.3, 1.45, sine(p)), cx: 800, x: -40 });
      },
    },
    {
      id: 'man', from: U.man, // the man in uniform walks up to the door; nobody knew him
      draw(p, t, c) {
        const w = travel(t, -0.2, 2, 160, 760);
        const scene = lamp() + wallDoor() + floor()
          + ilya({ x: 470, y: FLOOR + 6, t: c.t, look: lerp(-0.6, 0.8, sine((t - 0.6) / 1.5)), worry: 0.5 })
          + gordeev({ x: w.x, y: FLOOR + 6, t: c.t, walk: w, look: 1, lookY: -0.1 });
        return bg() + cam(scene, { s: lerp(1.15, 1.25, sine(p)), cx: 700 }) + tag({ text: 'ЧУЖОЙ', a: c.since(U.stranger) / 0.4 });
      },
    },
    {
      id: 'crowbar', from: U.break, // «Break it»: he turns and goes off for a crowbar; Ilya is left at the door
      draw(p, t, c) {
        const go = c.since(U.crowbar), w = travel(go, 0, 2.2, 760, 100);
        const scene = lamp() + wallDoor() + floor()
          + ilya({ x: 470, y: FLOOR + 6, t: c.t, look: go > 0.3 ? -0.8 : 0.8, worry: 0.8 })
          + gordeev({ x: w.x, y: FLOOR + 6, t: c.t, walk: w, look: go > 0.1 ? -1 : 0.9, lookY: 0.1 });
        return bg() + cam(scene, { s: lerp(1.25, 1.15, sine(p)), cx: 620 });
      },
    },
    {
      id: 'knock', from: U.knock, // he knocks three times; the door shivers each time
      draw(p, t, c) {
        const k = at(c, 'knocked'), j = knockAt(k);
        const scene = lamp({ cone: false }) + `<g transform="translate(${j.toFixed(2)} 0)">${wallDoor()}</g>` + floor()
          + ilya({ x: 860, y: FLOOR + 6, t: c.t, look: 1, lookY: -0.1, tilt: 4, worry: 0.6 });
        return bg() + cam(scene, { s: lerp(1.6, 1.75, sine(p)), cx: 930, x: -60 })
          + rollTag({ values: ['1', '2', '3'], pos: ease((k - 0.55) / 0.2) + ease((k - 0.95) / 0.2), size: 64, a: (k - 0.1) / 0.3 });
      },
    },
    {
      id: 'quiet', from: U.quiet, // silence behind the door: the door alone, close
      draw(p) {
        return bg() + cam(wallDoor() + floor(), { s: lerp(1.9, 2.1, sine(p)), cx: DX, x: 540 - DX });
      },
    },
    {
      id: 'rustle', from: U.rustle, // a rustle low down: the camera goes down to the gap under the door
      draw(p) {
        return bg() + cam(wallDoor() + floor(), { s: lerp(2.1, 3, sine(p)), cx: DX, x: 540 - DX, y: lerp(0, -60, sine(p)) });
      },
    },
    {
      id: 'slip', from: U.slip, // a sheet of paper slides out of the gap onto the floor
      draw(p, t) {
        return bg() + cam(wallDoor() + floor() + floorSheet({ doorX: DX, out: (t - 0.3) / 1.4 }), { s: lerp(3, 3.1, sine(p)), cx: DX - 60, x: 600 - DX, y: -60 });
      },
    },
    {
      id: 'pick', from: U.pick, // Ilya picks it up
      draw(p, t, c) {
        const lift = ease((t - 0.3) / 0.9);
        const scene = lamp({ cone: false }) + wallDoor() + floor() + (lift < 0.05 ? floorSheet({ doorX: DX }) : '')
          + ilya({ x: 800, y: FLOOR + 6, t: c.t, look: 0.6, lookY: lerp(0.8, 0.3, lift) }) + heldSheet({ x: 880, y: FLOOR - 230, lift });
        return bg() + cam(scene, { s: lerp(1.6, 1.7, sine(p)), cx: 860, x: -40 });
      },
    },
    {
      id: 'print', from: U.print, // the note close up: printed letters, even as in an order
      draw(p, t, c) {
        return bg() + cam(noteSheet({ lines: (t - 0.2) / 1.2 }), { s: lerp(1, 1.06, sine(p)), cy: 760 }) + floor()
          + tag({ text: 'КАК В ПРИКАЗЕ', a: (at(c, 'even') + 0.1) / 0.4 });
      },
    },
    {
      id: 'hatch', from: U.order, // «Do not open the outer door»: the steel door with its wheel
      draw(p, t) {
        const scene = lamp() + hatch({ x: 250, turn: 140 }) + floor();
        return bg() + cam(scene, { s: lerp(1.4, 1.55, sine(p)), cx: 250, x: lerp(262, 240, sine(p)) }) + tag({ x: 68, y: 330, text: 'НЕ ОТКРЫВАТЬ', a: (t - 0.3) / 0.4 });
      },
    },
    {
      id: 'pencil', from: U.below, // below it, in pencil, a line is written by hand
      draw(p, t) {
        return bg() + cam(noteSheet({ lines: 1, pencil: (t - 0.2) / 1.6 }), { s: lerp(1.1, 1.3, sine(p)), cx: 540, cy: 860, y: -60 }) + floor();
      },
    },
    {
      id: 'black', from: U.last, caption: { y: 960, size: 108, max: 940, push: 0.05 }, // the last line alone
      draw() { return bg(V.deep); },
    },
  ],
  endCard: { line: 'Продолжение завтра', sub: 'Серия 4' },
  cover: {
    ep: 3,
    title: ['ЗАПИСКА'],
    hook: 'ПЛАН ПРЯЧЕТ КОМНАТУ',
    hookHi: 'КОМНАТУ',
    art: lamp({ cone: false }) + wallDoor({ x: 700 }) + floor() + floorSheet({ doorX: 700 }) + ilya({ x: 450, y: FLOOR + 6, look: 1, lookY: 0.4, worry: 0.8 }),
  },
  post: `На старом плане убежища кто-то закрасил целую комнату. А ночью из-под железной двери выполз листок.

«Убежище», серия 3.

#убежище #выживание #минисериал #анимация #тайна`,
};
