#!/usr/bin/env node
// Words the voice is likely to stress wrongly. The pronunciation check (tools/phrase_check.py) recognises words, not
// stress: «го́рода» and «города́» look the same to it, and the owner hears the difference at once. So before an episode
// is voiced, this lists every word of its narration whose stress depends on the form or the meaning. Each one is
// to be replaced with a word that can be read one way only («огни городов» instead of «города», «отпечатки»
// instead of «следы»). A stress mark in `say` is no cure: the voice breaks the word («города́» came out «городаю»).
//   node tools/stress_risk.mjs series/<series>/epNN.js      exit code 1 when something is found
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// exact forms (lower case, ё kept): nouns whose stress moves between cases and numbers, homographs, past forms of
// verbs with a moving stress, short adjectives, verbs in -ит that people and voices stress both ways
const WORDS = `
города дома леса поезда берега острова голоса вечера номера цвета холода снега луга глаза края тела поля моря места дела слова права
окна стекла письма кольца пятна числа крыла села озера ведра зерна
руки ноги воды земли горы стены страны реки спины зимы души волны доски стороны головы бороды полосы щеки горе сестры семьи травы звезды грозы
следы следа следов огня шаги ряды часы сады мосты носы шары полы круги плоды долги враги узлы углы столы дворы
замок замка атлас мука муку орган хлопок белки стрелки пропасть парить дорог дорога большая большей больший стоит стоят трусы кружки пили
взяла брала дала спала ждала звала лгала рвала гнала жила плыла сняла поняла приняла заняла начала подняла отняла собрала убрала сорвала оборвала прорвала отдала продала создала прожила налила пролила
началась начался началось оборвалась оборвался родилась родился заперла заперся заперлась умерла занялась поднялась поднялся собралась собрался
начал понял принял занял прожил создал отдал продал задал поднял отнял прибыл отбыл
жива живы живо права правы темна темны полна полны видна видны слышна слышны нужна нужны близка близки больна больны сильна сильны верна верны мала малы светла светлы тепла теплы
крутит звонит звонят включит включат вручит облегчит сверлит кровоточит
подплыл уплыл приплыл доплыл отплыл
`.split(/\s+/).filter(Boolean);
// prepositions that can take the stress from the noun: «на́ пол», «за́ ночь», «и́з дому», «по́ лесу»
const PAIRS = /(?:^|\s)(на пол|на ночь|за ночь|за руку|на руки|на руку|под руку|под ноги|на ноги|за спину|на спину|на воду|из дому|из дома|до дому|по лесу|из лесу|на берег|за город|на гору|под гору|на зиму|за зиму|на год|за год|на день|по двое|по трое|на двоих)(?=\s|[.,!?:;]|$)/g;

const file = process.argv[2];
if (!file) { console.error('Usage: node tools/stress_risk.mjs series/<series>/epNN.js'); process.exit(2); }
const ep = (await import(pathToFileURL(path.resolve(file)).href)).default;
const set = new Set(WORDS);
let found = 0;
for (const [i, u] of ep.narration.entries()) {
  const text = String(typeof u === 'string' ? u : u.say || u.text).replace(/[*|«»"—–]/g, ' ').toLowerCase();
  const hits = [...new Set(text.split(/[^а-яё-]+/).filter((w) => set.has(w) || set.has(w.replace(/ё/g, 'е'))))];
  const pairs = [...text.matchAll(PAIRS)].map((m) => m[1]);
  if (hits.length || pairs.length) {
    found += hits.length + pairs.length;
    console.log(`${String(i).padStart(2, '0')} ${typeof u === 'string' ? u : u.text}\n   заменить: ${[...hits, ...pairs].join(', ')}`);
  }
}
console.log(found ? `${found} слов с опасным ударением: замени каждое словом, которое читается одним способом` : 'слов с опасным ударением нет');
process.exit(found ? 1 : 0);
