// «Вольер», серия 1 «Четыре дня». Аккаунт «Третье правило».
// Style 2 (kit/v2.js) with the details of this series from kit/volier.js. No cuts: the picture follows the words through
// c.at / c.since, never through seconds of the voice file. Every draw() must stand a little time before its first word
// and after its last: the neighbouring shots are drawn together while one dissolves or slides into the other.
// Four scenes, each in its own flat colour (format 3, item 11): the zoo by day, the night enclosure, the wall with the
// rules, the cold room; the last shot is almost black, only the eyes of the tiger are amber.
// Silent clue: nine strokes crossed out by one line on the wall beside the rules (nine people lived here before them).
// Nobody mentions it; it pays off in episode 3.
// Counters: «МЯСА НА 4 ДНЯ» (32 kg / 8 kg a day, all three in the frame), «10 ШАГОВ» -> «8 ШАГОВ», «ДЕНЬ 12».
import { lerp } from '../../kit/index.js';
import { V, FLOOR, sine, ease, hop, travel, cam, person, tag, rollTag } from '../../kit/v2.js';
import { P, theme, tiger, deadify, darkify, bars, partition, vault, zooDay, cageDay, cageDayFront, stepMarks, rulesWall, coldRoom, meat, tagW } from '../../kit/volier.js';

// text = what the captions show; say = the same words for the voice where it needs help (see series/ubezhishche/ep01.js).
// gap = the pause after the phrase. id = the name the shots know the phrase by.
const N = [
  { id: 'open', text: 'Зомби-апокалипсис. Мы живём в клетке *у тигра*.', gap: 0.3 },
  { id: 'fear', text: 'Мёртвые боятся *только его*.', gap: 0.3 },
  // «мяса для него осталось» was heard twice as «мясо …» (an ellipsis did not help): «осталось» fits both forms,
  // «хватит» only the genitive, so the word changed and the sense did not.
  { id: 'meat', text: 'Но мяса для него хватит *на четыре дня*.', gap: 0.5 },
  { id: 'ago', text: 'Двенадцать дней назад я бежал через *зоопарк*.', gap: 0.3 },
  { id: 'arms', text: 'На руках сестра. *Вера*. Ей шесть.', gap: 0.3 },
  { id: 'street', text: 'За нами шла *вся улица*.', gap: 0.4 },
  { id: 'stop', text: 'У вольера тигра они *встали*. Все сразу.', gap: 0.3 },
  { id: 'ten', text: 'Ближе *десяти шагов* не подошёл ни один.', gap: 0.45 },
  { id: 'keeper', text: 'Нас впустил *смотритель*.', gap: 0.3 },
  { id: 'two', text: 'Тигр за одной решёткой. Мы *за другой*.', gap: 0.45 },
  { id: 'rules', text: 'На стене *три правила*.', gap: 0.3 },
  { id: 'r1', text: 'Первое: тигр *ест первым*.', gap: 0.3 },
  { id: 'r2', text: 'Второе: к решётке *спиной* не стоять.', gap: 0.3 },
  { id: 'r3', text: 'Третье *замазано* краской.', gap: 0.4 },
  { id: 'early', text: '— Третье вам *рано*, — сказал смотритель.', say: 'Третье вам рано, — сказал смотритель.', gap: 0.5 },
  { id: 'six', text: 'Нас шестеро. Тигр съедает *восемь килограммов* в день.', gap: 0.3 },
  { id: 'fridge', text: 'В холодильнике *тридцать два*.', gap: 0.6 },
  { id: 'night', text: 'Ночью я не спал. И заметил *странное*.', gap: 0.45 },
  { id: 'eight', text: 'Мёртвые стояли уже не в десяти шагах. *В восьми*.', gap: 0.5 },
  { id: 'sleep', text: 'Тигр спал. *Сытый*.', gap: 0.45 },
  { id: 'growl', text: 'А под утро он *зарычал*.', gap: 0.45 },
  { id: 'fence', text: 'Не на ограду.', gap: 0.3 },
  { id: 'at', text: 'Он стоял у *нашей решётки*.', gap: 0.45 },
  { id: 'last', text: 'И смотрел *на Веру*.' },
];

const U = Object.fromEntries(N.map((u, i) => [u.id, i]));
const S = (c, id, k = 0) => c.at(U[id], k); // seconds since sentence k of a phrase began (negative before it)

// people
const bro = (o) => person({ col: P.brother, seed: 0, ...o });
const vera = (o) => person({ col: P.vera, seed: 1, k: 0.58, ...o });
const keeper = (o) => person({ col: P.keeper, seed: 2, cap: true, shoulders: 0.08, ...o });
const other = (i, o) => person({ col: P.others[i], seed: 3 + i, ...o });
// brother with Vera on his arms: she sits at his chest, her legs hang over his body
const carry = ({ x, y = FLOOR, k = 1, t, walk, look = 0.8, lookY = 0, vLook = 0.8, worry = 0.5 }) =>
  bro({ x, y, k, t, walk, look, lookY, worry }) + vera({ x: x + 72 * k, y: y - 195 * k + (walk ? -6 * walk.amp * Math.abs(Math.sin(Math.PI * 2 * walk.ph)) : 0), k: 0.56 * k, t, look: vLook, lookY: -0.3, worry: 0.6 });
// a dead one: the same little person in grey-green, a little bent forward towards the enclosure
const deadOne = (o) => deadify(person({ col: P.dead, tilt: (o.dir ?? 1) * 4, look: (o.dir ?? 1) * 0.6, lookY: 0.1, ...o }));
// a crowd of the dead seen from the side: a back row smaller and higher, a front row
const crowd = ({ x, t, dir = 1, walk = null, k = 0.62, count = 4, gap = 92, alpha = 1 }) => {
  let s = '';
  for (let i = 0; i < count + 1; i++) s += deadOne({ x: x - dir * (i * gap + 40), y: FLOOR - 46, k: k * 0.8, t, seed: 11 + i, walk, dir, alpha: 0.88 * alpha });
  for (let i = 0; i < count; i++) s += deadOne({ x: x - dir * i * gap, y: FLOOR + 8, k, t, seed: 21 + i, walk, dir, alpha });
  return s;
};
// a big counter tag in the middle of the top of the frame
const bigTag = (text, a, { y = 210, size = 92, pad = 0.5 } = {}) => tag({ x: 540 - tagW(text, size, pad) / 2, y, text, size, pad, a });
const bigRoll = (values, pos, a, { y = 210, size = 92, pad = 0.5 } = {}) => {
  const i = Math.min(values.length - 1, Math.max(0, Math.round(pos)));
  return rollTag({ x: 540 - tagW(values[i], size, pad) / 2, y, values, pos, size, pad, a });
};

// the night enclosure cut open: the tiger's cell on the left, the corridor of the people right of SPLIT
const SPLIT = 600;
const frontRods = (to = 330) => bars({ x0: -330, x1: to, top: 400, gap: 200, off: 30 }); // rare rods of the tiger's cell
const peopleRods = () => bars({ x0: 720, x1: 1060, top: 400, gap: 340, rail: false });
// the night outside: dark sky, the enclosure as a block, the ground
const outside = ({ x0 = 330, x1 = 750 } = {}) => {
  const c = P.night;
  return `<rect width="1080" height="1920" fill="${c.sky}"/><rect x="-3000" y="${FLOOR}" width="7080" height="3000" fill="${c.ground}"/>`
    + `<rect x="${x0}" y="680" width="${x1 - x0}" height="${FLOOR - 680}" fill="${c.wall}"/><rect x="${x0 + 30}" y="740" width="${x1 - x0 - 60}" height="${FLOOR - 740}" fill="${c.bg}"/>`;
};
const outsideFront = ({ x0 = 330, x1 = 750 } = {}) => bars({ x0: x0 + 30, x1: x1 - 30, top: 740, bottom: FLOOR + 8, gap: 120, w: 14 });

// the opening picture and the cover: a big tiger behind the rods, the little people behind the second ones, the counter
const HS = 730; // the partition stands further right in the opening picture, so the rods do not cross the tiger's face
const hookScene = (t = 0) => vault({ split: HS })
  + tiger({ x: 275, s: 0.9, t, look: 0.6, lookY: 0.2 }) + frontRods(250)
  + keeper({ x: 1020, k: 0.64, t, look: -0.7 }) + bro({ x: 850, k: 0.68, t, look: -0.8, worry: 0.6 }) + vera({ x: 940, k: 0.43, t, look: -0.8, lookY: -0.2, worry: 0.7 })
  + partition({ x: HS }) + bars({ x0: 1066, x1: 1066, top: 400, rail: false });

export default {
  series: 'Вольер',
  episode: 1,
  theme,
  gap: 0.25,
  tail: 1.1,
  endCardDur: 2.8,
  narration: N,
  shots: [
    {
      id: 'hook', from: U.open, // full from the first frame: the tiger, the people, «МЯСА НА 4 ДНЯ»
      draw(p, t, c) {
        return cam(hookScene(c.t), { s: lerp(1, 1.05, sine(p)), cx: 540, x: lerp(0, -10, sine(p)) }) + bigTag('МЯСА НА 4 ДНЯ', 1);
      },
    },
    {
      id: 'ring', from: U.fear, // the night outside: the enclosure in the middle, the dead stand around it and do not come in
      draw(p, t, c) {
        const scene = outside() + tiger({ x: 520, s: 0.42, t: c.t, look: 0.5 }) + outsideFront()
          + crowd({ x: 230, t: c.t, dir: 1, k: 0.5, count: 3, gap: 70 }) + crowd({ x: 850, t: c.t, dir: -1, k: 0.5, count: 3, gap: 70 });
        return cam(scene, { s: lerp(1, 1.1, sine(p)) });
      },
    },
    {
      id: 'meat', from: U.meat, // the cold room: four blocks of meat, «4 ДНЯ»
      draw(p, t) {
        return cam(coldRoom({ blocks: 4 }), { s: lerp(1.04, 1.12, sine(p)), cy: 960 }) + bigTag('4 ДНЯ', (t + 0.1) / 0.35, { size: 110, y: 240 });
      },
    },
    {
      id: 'run', from: U.ago, // twelve days earlier, the zoo by day: he runs along the path with his sister in his arms
      draw(p, t, c) {
        const w = travel(t, -0.3, 3.4, 120, 560, 170);
        const scene = zooDay() + carry({ x: w.x, t: c.t, walk: w, k: 0.9, worry: 0.6 });
        return cam(scene, { s: lerp(1, 1.05, sine(p)), x: lerp(30, -40, sine(p)) }) + tag({ text: '12 ДНЕЙ НАЗАД', size: 64, x: 60, y: 230, a: (t - 0.2) / 0.35 });
      },
    },
    {
      id: 'vera', from: U.arms, // close: the two of them, her name
      draw(p, t, c) {
        const named = S(c, 'arms', 1);
        const scene = zooDay() + carry({ x: 540, t: c.t, look: 0.4, lookY: 0.1, vLook: -0.6, worry: 0.4 });
        return cam(scene, { s: lerp(1.45, 1.6, sine(p)), cx: 560, cy: 1250, x: -20 }) + bigTag('ВЕРА, 6 ЛЕТ', (named - 0.05) / 0.35, { size: 80 });
      },
    },
    {
      id: 'street', from: U.street, enter: 'left', // the whole street behind them: the dead walk in from the left
      draw(p, t, c) {
        const d = travel(t, -0.4, 4, -380, 120, 150), h = travel(t, -0.4, 3.6, 640, 900, 170);
        const scene = zooDay({ trees: [[-80, 260], [420, 320], [960, 240]] }) + crowd({ x: d.x + 360, t: c.t, walk: d, count: 5, gap: 88, k: 0.66 })
          + carry({ x: h.x, t: c.t, walk: h, k: 0.72, look: -0.8, vLook: -0.8, worry: 0.9 });
        return cam(scene, { s: lerp(1, 1.04, sine(p)) });
      },
    },
    {
      id: 'stop', from: U.stop, // by the tiger's house they stop, all at once; the tiger stands behind the rods
      draw(p, t, c) {
        const halt = S(c, 'stop', 0) + 0.2 * c.dur(U.stop), d = travel(t, -0.5, halt + 0.5, -260, 60, 150);
        const scene = zooDay({ trees: [[-80, 260], [330, 300]] }) + cageDay({ x0: 560 }) + tiger({ x: 900, s: 0.66, dir: -1, t: c.t, look: 0.4 }) + cageDayFront({ x0: 560 })
          + crowd({ x: d.x + 210, t: c.t, walk: d, count: 3, gap: 80, k: 0.6 }) + carry({ x: 480, k: 0.72, t: c.t, look: -0.8, vLook: -0.8, worry: 0.8 });
        return cam(scene, { s: lerp(1, 1.06, sine(p)), cx: 500 });
      },
    },
    {
      id: 'ten', from: U.ten, // ten steps marked on the sand; no one comes over the first mark
      draw(p, t, c) {
        const scene = zooDay({ trees: [[-80, 260], [330, 300]] }) + cageDay({ x0: 640 }) + tiger({ x: 980, s: 0.66, dir: -1, t: c.t }) + cageDayFront({ x0: 640, plate: false })
          + stepMarks({ x1: 620, count: 10, step: 44, col: '#8E6F3E' })
          + crowd({ x: 150, t: c.t, count: 3, gap: 76, k: 0.56 }) + carry({ x: 610, k: 0.62, t: c.t, look: -0.8, vLook: -0.8, worry: 0.7 });
        return cam(scene, { s: lerp(1.12, 1.2, sine(p)), cx: 420, cy: FLOOR, x: 120 }) + bigTag('10 ШАГОВ', (t - 0.3) / 0.35);
      },
    },
    {
      id: 'keeper', from: U.keeper, enter: 'left', // the side door of the tiger's house opens, a man in a cap lets them in
      draw(p, t, c) {
        const o = ease((t + 0.1) / 0.8), w = travel(t, 0.5, 2, 150, 520, 170), c0 = P.day;
        const door = `<rect x="640" y="${FLOOR - 340}" width="190" height="340" fill="${P.night.floor}"/><rect x="${640 + 190 * o * 0.85}" y="${FLOOR - 340}" width="${190 * (1 - 0.85 * o)}" height="340" fill="#6D604F"/>`;
        const scene = zooDay({ trees: [[-80, 280], [260, 240]] }) + `<rect x="480" y="560" width="1400" height="${FLOOR - 560 + 60}" fill="${c0.wall}"/>` + door
          + keeper({ x: 735, t: c.t, look: -0.8, alpha: ease((t + 0.1) / 0.6) }) + carry({ x: w.x, t: c.t, walk: w, k: 0.9, look: 0.8, vLook: 0.8, worry: 0.4 });
        return cam(scene, { s: lerp(1.04, 1, sine(p)), cx: 540 });
      },
    },
    {
      id: 'two', from: U.two, // the enclosure at night, cut open: the tiger's cell, then the camera goes on to the people
      draw(p, t, c) {
        const to = sine((S(c, 'two', 1) + 0.2) / 1.2), w = travel(t, -0.4, 3, 40, 300, 160);
        const scene = vault({ split: SPLIT }) + tiger({ x: w.x, s: 0.86, t: c.t, walk: w }) + frontRods()
          + bro({ x: 780, k: 0.72, t: c.t, look: -0.8, worry: 0.4 }) + vera({ x: 880, k: 0.46, t: c.t, look: -0.8 }) + keeper({ x: 990, k: 0.7, t: c.t, look: -0.6 })
          + partition({ x: SPLIT }) + peopleRods();
        return cam(scene, { s: 1.35, cx: 540, x: lerp(260, -230, to) });
      },
    },
    {
      id: 'rules', from: U.rules, // the wall with the rules, held for the two first lines
      draw(p) {
        return cam(rulesWall(), { s: lerp(1, 1.05, sine(p)), cy: 760 });
      },
    },
    {
      id: 'back', from: U.r2, // rule two: Vera stands with her back to the rods, the brother pulls her away; the tiger watches
      draw(p, t, c) {
        const pull = travel(c.since(U.r2), 0.6 * c.dur(U.r2) - 0.3, 1.1, 680, 840, 110), b = travel(c.since(U.r2), 0.3, 1, 960, 900);
        const scene = vault({ split: SPLIT }) + tiger({ x: 230, pose: 'lie', up: 1, s: 0.86, t: c.t, look: 0.6, lookY: 0.3 }) + frontRods(100)
          + partition({ x: SPLIT }) + vera({ x: pull.x, k: 0.5, t: c.t, walk: pull, look: 0.7, hop: 0 }) + bro({ x: b.x, k: 0.74, t: c.t, walk: b, look: -0.9, worry: 0.9 });
        return cam(scene, { s: lerp(1.3, 1.4, sine(p)), cx: 600, x: -60 });
      },
    },
    {
      id: 'third', from: U.r3, // close on the third line under a smear of paint; the nine strokes are in the frame, unnamed
      draw(p) {
        return cam(rulesWall(), { s: lerp(1.2, 1.26, sine(p)), cx: 470, cy: FLOOR });
      },
    },
    {
      id: 'early', from: U.early, // the keeper by the wall says it is too early for the third
      draw(p, t, c) {
        const scene = vault({ split: 200 }) + keeper({ x: 640, t: c.t, look: 0.8, lookY: 0.1 }) + bro({ x: 860, k: 0.92, t: c.t, look: -0.8, worry: 0.5 }) + vera({ x: 960, k: 0.55, t: c.t, look: -0.8, lookY: -0.4 });
        return cam(scene, { s: lerp(1.12, 1.24, sine(p)), cx: 780, x: -200 });
      },
    },
    {
      id: 'six', from: U.six, // six people in the corridor, the tiger eats behind its rods: «НАС 6», then «8 КГ В ДЕНЬ»
      draw(p, t, c) {
        const sw = ease((S(c, 'six', 1) - 0.1) / 0.45), sp = 420;
        const ppl = [[620, 'k', 0.6], [700, 'b', 0.64], [770, 'v', 0.4], [850, 0, 0.62], [930, 1, 0.6], [1010, 2, 0.62]].map(([x, who, k], i) =>
          who === 'k' ? keeper({ x, k, t: c.t, look: -0.5 }) : who === 'b' ? bro({ x, k, t: c.t, look: -0.6 }) : who === 'v' ? vera({ x, k, t: c.t, look: -0.6 }) : other(who, { x, k, t: c.t, seed: 5 + i, look: -0.5 })).join('');
        const scene = vault({ split: sp }) + meat({ x: 300, y: FLOOR + 4, s: 0.8 }) + tiger({ x: 80, pose: 'lie', up: 0.35, s: 0.8, t: c.t, look: 0.3, lookY: 0.6 }) + bars({ x0: -330, x1: 120, top: 400, gap: 200, off: 30 })
          + partition({ x: sp }) + ppl;
        return cam(scene, { s: lerp(1, 1.05, sine(p)), cx: 540 }) + bigRoll(['НАС 6', '8 КГ В ДЕНЬ'], sw, (t + 0.1) / 0.35);
      },
    },
    {
      id: 'fridge', from: U.fridge, // the cold room again: 32 kg, 8 kg a day, 4 days: the sum adds up on screen
      draw(p, t) {
        const a = (k) => (t - 0.05 - 0.45 * k) / 0.35;
        return cam(coldRoom({ blocks: 4 }), { s: lerp(1.1, 1.18, sine(p)), cy: 1000 })
          + tag({ x: 70, y: 170, text: '32 КГ', size: 96, pad: 0.5, a: a(0) })
          + tag({ x: 70, y: 370, text: ': 8 КГ В ДЕНЬ', size: 80, pad: 0.5, a: a(1) })
          + tag({ x: 70, y: 550, text: '= 4 ДНЯ', size: 96, pad: 0.5, a: a(2) });
      },
    },
    {
      id: 'night', from: U.night, // day twelve, at night: he stands awake by the outer rods and looks out
      draw(p, t, c) {
        const odd = S(c, 'night', 1), look = ease((odd + 0.1) / 0.5);
        const scene = vault({ split: -400 }) + `<rect x="760" y="520" width="280" height="420" fill="${P.night.sky}"/>` + bars({ x0: 790, x1: 1010, top: 520, bottom: 940, gap: 110, w: 14, rail: false })
          + vera({ x: 430, k: 0.5, t: c.t, look: 0.4, lookY: 0.4 }) + bro({ x: 640, t: c.t, look: lerp(0.4, 1, look), lookY: lerp(0.2, -0.2, look), worry: 0.3 + 0.6 * look });
        return cam(scene, { s: lerp(1, 1.14, sine(p)), cx: 760, x: -60 }) + tag({ text: 'ДЕНЬ 12', size: 80, pad: 0.6, x: 60, y: 210, a: (t - 0.2) / 0.35 });
      },
    },
    {
      id: 'eight', from: U.eight, // the dead outside at night: ten marks to the rods, then they stand two marks closer
      draw(p, t, c) {
        const k = ease((S(c, 'eight', 1) - 0.05) / 0.6), x = 300 + 2 * 46 * k;
        const scene = outside({ x0: 760, x1: 1300 }) + tiger({ x: 1000, s: 0.5, pose: 'lie', up: 0, sleep: 1, t: c.t }) + outsideFront({ x0: 760, x1: 1300 })
          + stepMarks({ x1: 760, count: 10, step: 46, col: '#2E4656', hi: k > 0.5 ? 8 : -1 })
          + crowd({ x, t: c.t, count: 4, gap: 76, k: 0.56 });
        return cam(scene, { s: lerp(1.06, 1.14, sine(p)), cx: 560 }) + bigRoll(['10 ШАГОВ', '8 ШАГОВ'], k, (t + 0.1) / 0.35);
      },
    },
    {
      id: 'sleep', from: U.sleep, // close: the tiger sleeps, full; slow breath
      draw(p, t, c) {
        const scene = vault({ split: 1400 }) + tiger({ x: 470, pose: 'lie', up: 0, sleep: 1, s: 1.05, t: c.t }) + frontRods(-60);
        return cam(scene, { s: lerp(1.06, 1.16, sine(p)), cx: 600 });
      },
    },
    {
      id: 'growl', from: U.growl, // towards morning: the head goes up, the eyes open, the mouth opens
      draw(p, t, c) {
        const g = c.since(U.growl), u = ease((g - 0.2) / 0.9), r = ease((g - 0.5 * c.dur(U.growl)) / 0.4) * (1 - ease((g - c.dur(U.growl) - 0.6) / 0.6));
        const scene = vault({ split: 1400 }) + tiger({ x: 470, pose: 'lie', up: u, sleep: 1 - ease((g - 0.1) / 0.4), roar: r, s: 1.05, t: c.t, look: 0.5, lookY: 0.2 }) + frontRods(-60);
        return cam(scene, { s: lerp(1.16, 1.32, sine(p)), cx: 760, cy: 1000, x: -120 });
      },
    },
    {
      id: 'turn', from: U.fence, // not at the fence: the camera passes the empty outer rods and finds him at the partition
      draw(p, t, c) {
        const to = sine((c.since(U.at) + 0.3) / 1.3);
        const scene = vault({ split: SPLIT }) + frontRods() + tiger({ x: 395, s: 0.86, t: c.t, look: 0.9, lookY: 0.4 })
          + partition({ x: SPLIT }) + bro({ x: 790, k: 0.72, t: c.t, look: -0.9, worry: 0.9 }) + vera({ x: 700, k: 0.46, t: c.t, look: -0.9, worry: 0.6 }) + keeper({ x: 980, k: 0.7, t: c.t, look: -0.8, worry: 0.7 }) + peopleRods();
        return cam(scene, { s: 1.4, cx: 540, x: lerp(420, -40, to) });
      },
    },
    {
      id: 'last', from: U.last, caption: { y: 1500, size: 104, max: 940, push: 0.04 }, // dark: only his eyes are amber; Vera small across the rods
      draw(p, t, c) {
        const d = P.dark;
        const scene = `<rect width="1080" height="1920" fill="${d.bg}"/><rect x="-3000" y="${FLOOR}" width="7080" height="3000" fill="${d.floor}"/>`
          + tiger({ x: 250, s: 1, dark: 1, t: c.t, look: 1, lookY: 0.5 })
          + partition({ x: 640, col: '#000203' }) + darkify(vera({ x: 820, k: 0.5, t: c.t, look: -0.9, col: d.vera }));
        return cam(scene, { s: lerp(1.06, 1.2, sine(p)), cx: 600, x: -40 });
      },
    },
  ],
  sfx: [
    { type: 'impact-low', phrase: 'open', vol: 0.5 },
    { type: 'door-latch', phrase: 'keeper', at: 0.1, vol: 0.7 },
    { type: 'impact-low', phrase: 'eight', at: 0.72, vol: 0.6 },
    { type: 'growl', phrase: 'growl', at: 0.4, vol: 0.55 },
    { type: 'impact-low', phrase: 'last', offset: -0.1, vol: 0.75 },
  ],
  experiment: 'первая серия по формату 3: жанр и место в первой фразе, срок в третьей, неожиданное место; жду skipRate ниже 30 %',
  endCard: { line: 'Продолжение завтра', sub: 'Серия 2' },
  cover: {
    ep: 1,
    title: ['ВОЛЬЕР'],
    hook: 'МЯСА НА ЧЕТЫРЕ ДНЯ',
    hookHi: 'ЧЕТЫРЕ ДНЯ',
    art: hookScene(0) + bigTag('МЯСА НА 4 ДНЯ', 1, { y: 470 }),
  },
  post: `Зомби-апокалипсис. Шестеро живут в клетке у тигра, и мяса для него осталось на четыре дня.

«Вольер», серия 1.

#вольер #зомбиапокалипсис #минисериал #анимация #тайна`,
};
