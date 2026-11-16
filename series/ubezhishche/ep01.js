// «Убежище», серия 1 «Сорок четвёртый». Аккаунт «Ты бы выжил?».
// Style 2 (kit/v2.js): flat rooms, hand-drawn people, no cuts. The picture follows the words through c.at / c.since,
// never through seconds of the voice file. Every draw() must stand a little time before its first word and after its last:
// the neighbouring shots are drawn together while one dissolves or slides into the other.
// Silent clue: the second, closed door with a small lamp on the far wall of the hall (teacher, enter, breakfast, heads).
// Nobody mentions it; in «heads» only Vika looks at it. Episodes 2-3 pay it off.
import { lerp } from '../../kit/index.js';
import { V, FLOOR, theme, sine, ease, hop, travel, cam, bg, floor, appear, person, dog, lamp, hatch, wallDoor, bunks, crate, filterUnit, barrel, school, stairs, stairY, page, written, tag, rollTag } from '../../kit/v2.js';

// text = what the captions show; say = the same words for the voice, with the stress marked (an acute after the stressed
// vowel) in the words a synthesiser gets wrong: the recogniser in tools/phrase_check.py cannot hear a wrong stress.
// Mark only such words: with an acute in nearly every word the same text ran 85.9 s instead of 77.2 s (the voice slows down).
// The Qwen voice reads an acute cleanly only near the end of a word (изнутри́, журна́л, качну́лся, входя́щих); earlier in
// a word it turns into an extra sound («за Юперт», «пайорции»), which phrase_check catches. There the stressed vowel is
// written as a capital instead (зАперт, пОрции): the recogniser hears those takes clean.
// gap = the pause after the phrase: 0.3-0.45 s where a thought ends, shorter where the next phrase goes on with it.
// A phrase in which the voice stops for more than 0.8 s (build.js prints such stops) is split at that sentence:
// the voice left alone makes 0.8-1 s stops between short sentences, and the episode runs over 75 s.
// id = the name the shots know the phrase by, so a split does not shift any numbers.
const N = [
  { id: 'alarm', text: 'Ядерная тревога.', gap: 0.3 },
  { id: 'seven', text: 'У нас *семь минут*.', gap: 0.3 },
  { id: 'place', text: 'Убежище под школой — | самое безопасное | место в городе.', gap: 0.3 },
  { id: 'who', text: 'Если знать, | кто *заперт* | вместе с тобой.', say: 'Если знать, кто зАперт вместе с тобой.', gap: 0.45 },
  { id: 'teacher', text: 'Я школьный *учитель*. Двадцать лет | показывал детям | это убежище.', gap: 0.2 },
  { id: 'never', text: 'И не думал, | что однажды закрою | его дверь *сам*.', gap: 0.4 },
  { id: 'steel', text: 'Стальная дверь. Запирается | только *изнутри*.', say: 'Стальная дверь. Запирается только изнутри́.', gap: 0.25 },
  { id: 'stock', text: 'Фильтры. Вода. Еда на *тридцать* дней.', gap: 0.25 },
  { id: 'forty', text: 'Всё рассчитано | на *сорок* человек.', gap: 0.45 },
  { id: 'stood', text: 'Я встал у двери | и *считал* входящих.', say: 'Я встал у двери и считал входя́щих.', gap: 0.25 },
  { id: 'kids', text: 'Дети из продлёнки.', gap: 0.3 },
  { id: 'cleaner', text: 'Уборщица.', gap: 0.3 },
  { id: 'neighbour', text: 'Сосед с собакой.', gap: 0.3 },
  { id: 'stranger', text: 'Мужчина *в форме*, | которого я раньше | не видел.', gap: 0.4 },
  { id: 'count', text: 'Сорок один.', gap: 0.35 },
  { id: 'n42', text: 'Сорок два.', gap: 0.35 },
  { id: 'n43', text: '*Сорок три*.', gap: 0.35 },
  { id: 'shake', text: 'Потом пол *качнулся*. И я закрыл дверь.', say: 'Потом пол качну́лся. И я закрыл дверь.', gap: 0.45 },
  { id: 'wrote', text: 'Сорок три человека.', gap: 0.3 },
  { id: 'log', text: 'Я записал это | в *журнал*.', say: 'Я записал это в журна́л.', gap: 0.45 },
  { id: 'morning', text: 'Утром я раздал | завтрак.', gap: 0.3 },
  { id: 'each', text: 'По *одной* порции | в руки.', say: 'По одной пОрции в руки.', gap: 0.3 },
  { id: 'given', text: 'Сорок три.', gap: 0.3 },
  { id: 'crate', text: 'А из ящика пропало | *сорок четыре*.', say: 'А из ящика пропАло сорок четыре.', gap: 0.45 },
  { id: 'heads', text: 'Я пересчитал людей. Сорок три.', gap: 0.25 },
  { id: 'portions', text: 'Пересчитал порции.', say: 'Пересчитал пОрции.', gap: 0.3 },
  { id: 'pcount', text: '*Сорок четыре*.', gap: 0.45 },
  { id: 'opened', text: 'Тогда я открыл | *журнал*.', say: 'Тогда я открыл журна́л.', gap: 0.3 },
  { id: 'other', text: 'Под моей записью | стояла ещё одна. *Чужим почерком*.', say: 'Под моей записью стояла ещё одна. Чужим пОчерком.', gap: 0.45 },
  { id: 'last', text: '*«Сорок четыре».*' },
];

const U = Object.fromEntries(N.map((u, i) => [u.id, i]));
// Moments the picture reacts to: [phrase, number of the sentence in it]. When a phrase is split, only this table changes.
const CUE = {
  we: ['seven', 0], who: ['who', 0], years: ['teacher', 1], lock: ['steel', 1], water: ['stock', 1], food: ['stock', 2],
  kids: ['kids', 0], cleaner: ['cleaner', 0], neighbour: ['neighbour', 0], stranger: ['stranger', 0],
  n41: ['count', 0], n42: ['n42', 0], n43: ['n43', 0], shake: ['shake', 0], shut: ['shake', 1],
  given: ['given', 0], counting: ['heads', 0], counted: ['heads', 1],
};
const at = (c, key) => c.at(U[CUE[key][0]], CUE[key][1]); // seconds since that moment (negative before it)
const TAU = Math.PI * 2;
const HATCH = 250; // the hall: the steel door on the left, the lamp in the middle, the second door on the right (kit default)
const ilya = (o) => person({ col: V.ilya, seed: 0, ...o });
const vika = (o) => person({ col: V.vika, seed: 1, k: 0.66, ...o });
const gordeev = (o) => person({ col: V.gordeev, seed: 2, k: 1.06, shoulders: 0.3, cap: true, ...o });
const KID = [{ col: V.crowd[0], k: 0.6, seed: 4 }, { col: V.crowd[2], k: 0.56, seed: 5 }, { col: V.crowd[1], k: 0.62, seed: 6 }];
const CLEANER = { col: V.crowd[1], k: 0.9, wide: 1.18, seed: 9 }, NEIGHBOUR = { col: V.crowd[2], k: 1, seed: 10 };

// Someone comes in through the steel door: appears in the dark opening, steps over the sill, walks into the hall.
// q = seconds since they stepped into the doorway; stop = where they halt (otherwise they walk out of the frame).
const SILL = { x0: 285, y0: 1018, x1: 410 };
const comer = (c, q, o, { stop = null, pet = false, look = 0.8 } = {}) => {
  if (q <= 0) return '';
  const k = o.k ?? 1, out = ease(q / 0.55), w = travel(q, 0.5, stop ? 2 : 3.1, SILL.x1, stop ?? 1280, pet ? 120 : 150 * k);
  const x = q < 0.5 ? lerp(SILL.x0, SILL.x1, out) : w.x, y = lerp(SILL.y0, FLOOR - 10, out), size = lerp(0.84, 1, out);
  const walk = q < 0.5 ? { ph: q * 1.7, amp: 0.7 } : { ph: w.ph + 0.85, amp: Math.max(w.amp, 0.7 * (1 - ease((q - 0.5) / 0.3))) };
  return pet ? dog({ x, y, s: size, t: c.t, walk, alpha: ease(q / 0.3) }) : person({ ...o, x, y, k: k * size, t: c.t, walk, alpha: ease(q / 0.3), look });
};

export default {
  series: 'Убежище',
  episode: 1,
  theme,
  gap: 0.25,
  tail: 1.1,
  endCardDur: 2.8,
  narration: N,
  shots: [
    {
      id: 'school', from: U.alarm, // dusk, the siren, seven minutes on the clock
      draw(p, t, c) {
        const up = ease((t - 0.1) / 0.5), we = ease(at(c, 'we') / 0.5), go = at(c, 'we');
        const i = travel(go, 0.75, 1.7, 150, 300), v = travel(go, 0.6, 1.7, 296, 424, 110);
        const scene = school() + floor()
          + ilya({ x: i.x, y: FLOOR + 8, t: c.t, walk: i, look: 0.9 * we, lookY: -0.9 * up * (1 - we), worry: 0.9 * up })
          + vika({ x: v.x, y: FLOOR + 8, t: c.t, walk: v, look: -0.9 * we * (1 - sine(v.p)) + 0.8 * sine(v.p), lookY: -0.9 * up * (1 - we) - 0.5 * we * (1 - sine(v.p)), worry: 0.9 * up });
        const tick = [0.8, 1.8, 2.8, 3.8, 4.8].reduce((s, x) => s + ease((c.t - x) / 0.32), 0);
        return bg() + cam(scene, { s: lerp(1, 1.07, sine(p)) }) + rollTag({ values: ['7:00', '6:59', '6:58', '6:57', '6:56', '6:55'], pos: tick, size: 96, pad: 0.55 });
      },
    },
    {
      id: 'stairs', from: U.place, enter: 'up', // down under the school, to the steel door
      draw(p, t, c) {
        const v = travel(t, -0.2, 3.3, -30, 520, 110), i = travel(t, -0.1, 3.9, -215, 320, 150);
        const there = ease((t - 3.5) / 0.6), who = ease(at(c, 'who') / 0.5); // «Если знать, кто заперт вместе с тобой»: she looks up at him
        const scene = lamp() + hatch({ x: 836 }) + stairs()
          + ilya({ x: i.x, y: stairY(i.x), t: c.t, walk: i, look: lerp(0.7, 1, there), lookY: lerp(0.5, -0.1, there) })
          + vika({ x: v.x, y: stairY(v.x), t: c.t, walk: v, look: lerp(0.8, lerp(1, -0.9, who), there), lookY: lerp(0.4, lerp(-0.2, -0.8, who), there) });
        return bg() + cam(scene, { s: lerp(1.1, 1, sine(p)), x: lerp(230, 0, sine(p)) });
      },
    },
    {
      id: 'teacher', from: U.teacher, // twenty years of school trips down here
      draw(p, t, c) {
        const show = at(c, 'years') - 0.9, turn = ease(show / 0.5); // «…показывал детям это убежище»: everyone turns to the steel door
        const kids = [672, 772, 872].map((x, j) => person({ ...KID[j], x, t: c.t, look: lerp(-0.7, -1, ease((show - 0.15 * j) / 0.5)), lookY: -0.5, hop: hop(show - 0.3 - 0.2 * j) })).join('');
        const scene = lamp() + hatch({ x: HATCH }) + wallDoor() + floor() + ilya({ x: 540, t: c.t, look: lerp(0.8, -0.8, turn), lookY: 0.2 * (1 - turn) }) + kids;
        return bg() + cam(scene, { s: lerp(1, 1.06, sine(p)) });
      },
    },
    {
      id: 'door', from: U.never, // the door he will shut himself; the wheel is on the inside
      draw(p, t, c) {
        const turn = 150 * ease(at(c, 'lock') / 1.4), down = ease((c.since(U.never) - 0.55 * c.dur(U.never)) / 0.5) * (1 - ease(c.since(U.steel) / 0.5));
        const scene = lamp() + hatch({ x: HATCH, turn }) + floor() + ilya({ x: 505, t: c.t, look: -0.9, lookY: lerp(-0.25, 0.7, down), worry: 0.7 * down });
        return bg() + cam(scene, { s: lerp(1.45, 1.6, sine(p)), cx: HATCH, x: lerp(262, 240, sine(p)) });
      },
    },
    {
      id: 'stock', from: U.stock, // filters, water, food: three things, one after another
      draw(p, t, c) {
        const w = ease(at(c, 'water') / 0.45), f = ease(at(c, 'food') / 0.45);
        const scene = appear(filterUnit({ x: 170 }), (t + 0.1) / 0.45) + appear(barrel({ x: 560 }), at(c, 'water') / 0.45) + appear(crate({ x: 880, w: 300 }), at(c, 'food') / 0.45)
          + floor() + vika({ x: 348, t: c.t, look: lerp(lerp(-0.9, 0.8, w), 1, f), lookY: -0.3 }) + tag({ x: 686, y: 836, text: '30 ДНЕЙ', a: (at(c, 'food') - 0.45) / 0.35 });
        return bg() + cam(scene, { s: lerp(1, 1.04, sine(p)), x: lerp(16, -16, sine(p)) });
      },
    },
    {
      id: 'bunks', from: U.forty, enter: 'left', // forty places; the picture slides on along the wall
      draw(p, t) {
        return bg() + cam(lamp() + bunks() + floor(), { s: lerp(1, 1.05, sine(p)), x: lerp(14, -14, sine(p)) }) + tag({ text: '40 МЕСТ', a: (t + 0.05) / 0.35 });
      },
    },
    {
      id: 'enter', from: U.stood, // he stands at the door and counts; the man in uniform stops apart
      draw(p, t, c) {
        const u = c.since(U.stood), k0 = at(c, 'kids'), k1 = at(c, 'cleaner'), k2 = at(c, 'neighbour'), k3 = at(c, 'stranger'), g = k3 - 0.1;
        const eye = lerp(-0.9, 0.9, ease((g - 1) / 1.1)); // the girl watches the stranger walk past
        const scene = lamp() + hatch({ x: HATCH, open: 1 }) + wallDoor() + floor()
          + comer(c, u - 0.05, { col: V.crowd[1], k: 0.96, seed: 7 }) + comer(c, u - 1.2, { col: V.crowd[0], k: 1.02, wide: 1.06, seed: 8 })
          + comer(c, k0 + 0.1, KID[0]) + comer(c, k0 - 0.3, KID[1]) + comer(c, k0 - 0.7, KID[2])
          + comer(c, k1 + 0.1, CLEANER) + comer(c, k2 + 0.1, NEIGHBOUR) + comer(c, k2 - 0.42, {}, { pet: true })
          + (g > 0 ? comer(c, g, { col: V.gordeev, k: 1.06, shoulders: 0.3, cap: true, seed: 2 }, { stop: 800, look: lerp(0.8, -0.7, ease((g - 2.7) / 0.6)) }) : '')
          + ilya({ x: 95, y: FLOOR + 12, t: c.t, look: 0.9 }) + vika({ x: 520, y: FLOOR + 12, t: c.t, look: eye, lookY: -0.4 });
        return bg() + cam(scene, { s: lerp(1.15, 1, sine(p)), cx: HATCH, x: lerp(130, 0, sine(p)) });
      },
    },
    {
      id: 'count', from: U.count, // the last three; then the ground moves and he shuts the door
      draw(p, t, c) {
        const a = [at(c, 'n41'), at(c, 'n42'), at(c, 'n43')], pos = a.reduce((s, x) => s + ease((x - 0.05) / 0.42), 0);
        const q = at(c, 'shake') - 0.05, env = ease(q / 0.3) * Math.exp(-Math.max(0, q - 0.3) * 2.1); // the shock: a soft sway that dies out
        const sx = 20 * env * Math.sin(TAU * 2.3 * q), sy = 8 * env * Math.sin(TAU * 3.1 * q + 1);
        const swing = 4 * ease(q / 0.4) * Math.exp(-Math.max(0, q - 0.4) * 0.8) * Math.sin(TAU * 0.85 * q);
        const cl = at(c, 'shut') - 0.05, shut = ease(cl / 1.0), lock = 140 * ease((cl - 0.8) / 0.9), fear = ease(q / 0.3);
        const last = [{ col: V.crowd[2], k: 0.98, seed: 11 }, { col: V.crowd[0], k: 0.92, wide: 1.1, seed: 12 }, { col: V.crowd[1], k: 1.02, seed: 13 }];
        const scene = lamp({ swing }) + hatch({ x: HATCH, open: 1 - shut, turn: lock }) + floor()
          + last.map((o, j) => comer(c, a[j] + 0.4, o)).join('')
          + ilya({ x: 95, y: FLOOR + 12, t: c.t, look: 0.9, lookY: -0.6 * fear * (1 - shut), worry: fear, tilt: 5 * Math.sin(Math.PI * shut) })
          + vika({ x: 520, y: FLOOR + 12, t: c.t, look: -0.9, lookY: -0.6 * fear * (1 - shut) - 0.3, worry: fear });
        return bg() + cam(scene, { s: lerp(1.36, 1.44, sine(p)), cx: HATCH, x: 290 + sx, y: sy })
          + rollTag({ values: ['40', '41', '42', '43'], pos, size: 110, pad: 0.6, a: (t + 0.1) / 0.35 });
      },
    },
    {
      id: 'log', from: U.wrote, // forty-three goes into the logbook
      draw(p, t) {
        const scene = page() + written({ x: 330, y: 968, glyphs: ['four', 'three'], a: (t - 0.25) / 1.5 });
        return bg() + cam(scene, { s: lerp(1, 1.05, sine(p)), cy: 860 }) + floor();
      },
    },
    {
      id: 'breakfast', from: U.morning, // one ration each; then the crate says forty-four
      draw(p, t, c) {
        const CR = 540, m = c.since(U.crate), f = Math.min(1, Math.max(0.78, (t - m) / 6.06)); // the hand-out is paced to end as «А из ящика…» begins
        const give = (T, o, pet) => {
          const q = t / f - T, k = o.k ?? 1, A = travel(q, 0, 0.95, -150, 330, 150 * k), B = travel(q, 1.45, 2.3, 330, 1280, 150 * k), w = q < 1.45 ? A : B, got = (q - 0.85) / 0.5;
          const D = q < 1.5 ? travel(q, 0.2, 0.95, -330, 172, 120) : travel(q, 1.5, 2.3, 172, 1300, 120); // the dog keeps at its master's heel
          return (pet ? dog({ x: D.x, y: FLOOR - 8, t: c.t, walk: D }) : '')
            + person({ ...o, x: w.x, y: FLOOR - 8, t: c.t, walk: w, look: 0.8, pack: got >= 1 ? 1 : got > 0 ? { u: got, fx: CR - 110 - w.x, fy: -224 } : 0 });
        };
        const said = (at(c, 'given') - 0.1) / 0.35, roll = ease((m - 0.5 * c.dur(U.crate)) / 0.45), see = ease((m - 0.2) / 0.6);
        const scene = lamp() + wallDoor() + floor() + give(0, CLEANER) + give(1.3, NEIGHBOUR, true) + give(2.6, { col: V.crowd[0], k: 1, seed: 12 })
          + crate({ x: CR, packs: 3 }) + ilya({ x: 830, y: FLOOR + 12, t: c.t, look: -0.8, lookY: 0.8 * see, worry: see })
          + rollTag({ x: CR - 84, y: FLOOR - 172, values: ['43', '44'], pos: roll, size: 64, pad: 0.6, a: said });
        return bg() + cam(scene, { s: lerp(1, 1.03, sine(p)) + 0.36 * sine((m + 0.1) / 2.2) });
      },
    },
    {
      id: 'heads', from: U.heads, // he counts heads: forty-three. One child looks at the far door
      draw(p, t, c) {
        const n = at(c, 'counting'), D = n - at(c, 'counted'), g = n / D, think = ease(c.since(U.portions) / 0.6); // the count runs while «Я пересчитал людей» is said
        const row = [[330, 0, { col: V.crowd[1], k: 1, seed: 7 }], [385, 1, { col: V.crowd[2], k: 0.98, seed: 11 }], [440, 0, { col: V.crowd[0], k: 0.94, seed: 8 }], [495, 1, KID[0]],
          [550, 0, NEIGHBOUR], [605, 1, { col: V.crowd[0], k: 1, seed: 12 }], [660, 0, CLEANER], [715, 1, KID[1]], [775, 0, { col: V.gordeev, k: 1.06, shoulders: 0.3, cap: true, seed: 2 }]];
        const one = ([x, front, o], j) => person({ ...o, x, y: front ? FLOOR + 8 : FLOOR - 34, t: c.t, look: -0.6, hop: hop(n - D * (0.1 + (0.8 * j) / 8), 13) });
        const people = row.map((r, j) => (r[1] ? '' : one(r, j))).join('') + row.map((r, j) => (r[1] ? one(r, j) : '')).join('');
        const scene = lamp() + wallDoor() + floor() + people
          + vika({ x: 880, y: FLOOR + 8, t: c.t, look: 1, lookY: -0.2 })
          + ilya({ x: 150, y: FLOOR + 12, t: c.t, look: lerp(0.3, 1, sine(g)), lookY: 0.7 * think, worry: think });
        return bg() + cam(scene, { s: lerp(1, 1.05, sine(p)), x: lerp(16, -24, sine(p)) }) + tag({ text: 'ДЕНЬ 1', a: (t + 0.1) / 0.35 });
      },
    },
    {
      id: 'journal', from: U.opened, // under his line there is one more, in another hand
      draw(p, t) {
        const scene = page() + written({ x: 330, y: 968, glyphs: ['four', 'three'] }) + written({ x: 372, y: 1438, glyphs: ['open4', 'open4'], s: 1.5, gap: 104, sw: 13, skew: -18 });
        return bg() + cam(scene, { s: lerp(1, 1.06, sine(p)), cy: 860, y: -540 * sine((t - 1) / 2.6) }) + floor(); // far enough for the printed head to leave the frame whole
      },
    },
    {
      id: 'black', from: U.last, caption: { y: 960, size: 118, max: 900, push: 0.05 }, // the last line alone
      draw() { return bg(V.deep); },
    },
  ],
  endCard: { line: 'Продолжение завтра', sub: 'Серия 2' },
  cover: {
    ep: 1,
    title: ['СОРОК', 'ЧЕТВЁРТЫЙ'],
    hook: 'НАС СОРОК ТРИ',
    hookHi: 'СОРОК ТРИ',
    art: lamp() + hatch({ x: 836 }) + floor() + ilya({ x: 300, y: FLOOR + 6 }) + vika({ x: 500, y: FLOOR + 6, worry: 0.9 }),
  },
  post: `Убежище под школой рассчитано на сорок человек. Учитель сам считал входящих и сам закрыл дверь. Утром счёт не сошёлся.

«Убежище», серия 1.

#убежище #выживание #минисериал #анимация #тайна`,
};
