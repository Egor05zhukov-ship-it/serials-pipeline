// Splits narration into caption chunks (2-4 words, caps) and times them
// proportionally to their length inside each narration unit.
// Markup: *слово* marks the keyword shown in the accent colour; a lone | forces a chunk break
// (a sentence with | is split only at those marks).

const STOP = new Set(['в', 'во', 'на', 'с', 'со', 'и', 'а', 'но', 'не', 'ни', 'без', 'по', 'к', 'ко', 'у', 'за', 'из', 'от', 'до', 'о', 'об', 'её', 'его', 'их', 'мой', 'моё', 'мою', 'как', 'что', 'же', 'ведь', 'уже', 'ещё', 'ты', 'я', 'она', 'он', 'мне']);
const MAX_WORDS = 3, MAX_CHARS = 19, LINE_CHARS = 14;

export const plain = (text) => text.replace(/[*|]/g, '').replace(/\s+/g, ' ').trim();

// -> [{ w: 'СЛОВО.', hi: bool, end: bool (sentence end), soft: bool (comma/dash after) }]
export function tokenize(text) {
  const out = []; let hi = false;
  for (let raw of text.trim().split(/\s+/)) {
    if (raw === '—' || raw === '-') { if (out.length) out[out.length - 1].soft = true; continue; }
    if (raw === '|') { if (out.length) out[out.length - 1].brk = true; continue; }
    // one * toggles the highlight (so *два слова* works), two in one word highlight just that word
    const stars = (raw.match(/\*/g) || []).length, on = hi || stars > 0;
    if (stars === 1) hi = !hi;
    raw = raw.replace(/\*/g, '');
    out.push({ w: raw.toUpperCase(), hi: on, end: /[.!?…]»?$/.test(raw), soft: /[,;:]$/.test(raw) });
  }
  return out;
}

const len = (ws) => ws.map((x) => x.w).join(' ').length;

// a short sentence (up to 4 words, 20 characters) stays in one chunk; longer ones are split greedily
export function chunkWords(words) {
  const out = []; let s = [];
  const close = () => {
    if (!s.length) return;
    if (s.some((w) => w.brk)) { let seg = []; for (const w of s) { seg.push(w); if (w.brk) { out.push(seg); seg = []; } } if (seg.length) out.push(seg); }
    else out.push(...(s.length <= 4 && len(s) <= 20 ? [s] : greedy(s)));
    s = [];
  };
  for (const w of words) { s.push(w); if (w.end) close(); }
  close();
  return out;
}

function greedy(words) {
  const chunks = []; let cur = [];
  const flush = () => { if (cur.length) { chunks.push(cur); cur = []; } };
  words.forEach((w, i) => {
    if (cur.length && (cur.length >= MAX_WORDS || len([...cur, w]) > MAX_CHARS)) {
      // do not leave a preposition or particle hanging at the end of a chunk
      const last = cur[cur.length - 1], bare = last.w.toLowerCase().replace(/[^а-яё]/g, '');
      if (cur.length > 1 && STOP.has(bare) && !last.end && !last.soft) { cur.pop(); flush(); cur.push(last); } else flush();
    }
    cur.push(w);
    if (w.end || (w.soft && cur.length >= 2)) flush();
    else if (i === words.length - 1) flush();
  });
  // merge a short orphan into the previous chunk of the same sentence
  for (let i = chunks.length - 1; i > 0; i--) {
    const c = chunks[i], prev = chunks[i - 1];
    if (c.length === 1 && c[0].w.length <= 6 && !prev[prev.length - 1].end && len([...prev, ...c]) <= MAX_CHARS + 4) { prev.push(...c); chunks.splice(i, 1); }
  }
  return chunks;
}

const toLines = (ws) => {
  if (ws.length < 2 || len(ws) <= LINE_CHARS) return [ws];
  let best = 1, bestDiff = Infinity;
  for (let k = 1; k < ws.length; k++) { const d = Math.abs(len(ws.slice(0, k)) - len(ws.slice(k))); if (d < bestDiff) { bestDiff = d; best = k; } }
  return [ws.slice(0, best), ws.slice(best)];
};

const weight = (ws) => ws.reduce((s, x) => s + x.w.replace(/[^А-ЯЁA-Z0-9]/g, '').length + (x.end ? 7 : x.soft ? 3 : 0), 0) + 1;

// units: [{text}], sent: [{start,end}] -> [{start,end,lines:[[{w,hi}]]}]
// lastHold: how long the very last chunk stays after the speech ends (the final line lingers)
export function planCaptions(units, sent, lastHold = 0.3) {
  const out = [];
  units.forEach((u, i) => {
    const chunks = chunkWords(tokenize(u.text));
    const total = chunks.reduce((s, c) => s + weight(c), 0), span = sent[i].end - sent[i].start;
    let t = sent[i].start;
    chunks.forEach((c) => {
      const d = (span * weight(c)) / total;
      out.push({ start: t, end: t + d, lines: toLines(c).map((ln) => ln.map(({ w, hi }) => ({ w, hi }))) });
      t += d;
    });
    // hold the last chunk through the pause, but not into the next unit
    out[out.length - 1].end = sent[i + 1] ? Math.min(sent[i + 1].start, sent[i].end + 0.3) : sent[i].end + lastHold;
  });
  return out;
}
