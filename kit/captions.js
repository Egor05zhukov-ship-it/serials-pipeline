// Splits narration into caption chunks (2-4 words, caps) and times them inside each narration unit:
// by letters between the pauses of the voice, and around the pauses themselves (see alignChunks).
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

const letters = (ws) => ws.reduce((s, x) => s + x.w.replace(/[^А-ЯЁA-Z0-9]/g, '').length, 0) + 1;

// When each chunk of one narration unit is really spoken: -> [{ a, b }] in seconds from the start of the unit.
// The voice does not run evenly: it stops after a sentence and sometimes after a comma. Timing chunks by letters
// alone puts every caption after such a stop too early. So the stops found in the voice file (pauses = [[from, to]],
// seconds from the start of the unit) are matched to chunk boundaries: sentence ends first, then commas and marked
// breaks. A chunk that follows a pause starts when the voice starts again; between pauses time goes by letters.
export function alignChunks(chunks, span, pauses = []) {
  const n = chunks.length, total = chunks.reduce((s, c) => s + weight(c), 0);
  let acc = 0;
  const exp = chunks.map((c) => { acc += weight(c); return (span * acc) / total; }); // where even timing puts the end of each chunk
  const kind = chunks.map((c) => { const l = c[c.length - 1]; return l.end ? 2 : l.soft ? 1 : 0; });
  const P = (pauses || []).filter(([a, b]) => b - a >= 0.16 && a > 0.06 && b < span - 0.06).map(([a, b]) => ({ a, b, d: b - a, mid: (a + b) / 2 }));
  const at = new Array(n).fill(null); // at[k] = the pause after chunk k
  const ends = [];
  for (let k = 0; k < n - 1; k++) if (kind[k] === 2) ends.push(k);
  // 1. sentence ends take the pauses that suit them best (long, and near the place even timing expects), keeping the order
  const E = ends.length, Q = P.length, memo = new Map();
  const go = (i, j, left) => {
    if (left === 0) return [0, []];
    if (E - i < left || Q - j < left) return [Infinity, []];
    const key = `${i} ${j} ${left}`;
    if (memo.has(key)) return memo.get(key);
    const rest = go(i + 1, j + 1, left - 1);
    const r = [[rest[0] + Math.abs(exp[ends[i]] - P[j].mid) - P[j].d, [[ends[i], P[j]], ...rest[1]]], go(i + 1, j, left), go(i, j + 1, left)].reduce((x, y) => (y[0] < x[0] ? y : x));
    memo.set(key, r);
    return r;
  };
  for (const [k, p] of go(0, 0, Math.min(E, Q))[1]) { at[k] = p; p.used = true; }
  // 2. a pause that is left goes to the nearest free boundary of its stretch of speech (a comma rather than nothing)
  for (const p of P.filter((x) => !x.used && x.d >= 0.2).sort((x, y) => y.d - x.d)) {
    let lo = 0, s = 0, hi = n - 1, e = span;
    for (let k = 0; k < n - 1; k++) {
      if (!at[k]) continue;
      if (at[k].b <= p.a) { lo = k + 1; s = at[k].b; } else if (hi === n - 1) { hi = k; e = at[k].a; }
    }
    const sum = chunks.slice(lo, hi + 1).reduce((x, c) => x + letters(c), 0);
    let cum = 0, best = -1, bd = 0.5;
    for (let k = lo; k < hi; k++) {
      cum += letters(chunks[k]);
      const d = Math.abs(s + ((e - s - p.d) * cum) / sum - p.a) - (kind[k] ? 0.15 : 0);
      if (!at[k] && d < bd) { bd = d; best = k; }
    }
    if (best >= 0) at[best] = p;
  }
  // 3. between the pauses the chunks share the time by letters
  const out = new Array(n);
  let k0 = 0, s = 0;
  for (let k = 0; k < n; k++) {
    if (!at[k] && k < n - 1) continue;
    const e = at[k] ? at[k].a : span, sum = chunks.slice(k0, k + 1).reduce((x, c) => x + letters(c), 0);
    let cum = 0;
    for (let j = k0; j <= k; j++) { const a = s + ((e - s) * cum) / sum; cum += letters(chunks[j]); out[j] = { a, b: s + ((e - s) * cum) / sum }; }
    k0 = k + 1; s = at[k] ? at[k].b : span;
  }
  return out;
}

// units: [{text}], sent: [{start,end,pauses}] -> [{start,end,unit,lines:[[{w,hi}]]}]
// pauses: silences inside the voice file of the unit (build.js finds them), see alignChunks().
// lastHold: how long the very last chunk stays after the speech ends (the final line lingers).
// minDur: no chunk is on screen for less than this, so nothing flashes.
// The result also carries .marks: for every unit, the moments its sentences begin (for pictures that follow the words).
export function planCaptions(units, sent, lastHold = 0.3, minDur = 0.45) {
  const out = [], marks = [];
  units.forEach((u, i) => {
    const chunks = chunkWords(tokenize(u.text)), t0 = sent[i].start, tm = alignChunks(chunks, sent[i].end - t0, sent[i].pauses), m = [t0];
    chunks.forEach((c, j) => {
      const nx = tm[j + 1];
      // a chunk stays until the next one starts, but not longer than 0.35 s into a pause
      out.push({ start: t0 + tm[j].a, end: t0 + (nx ? Math.min(nx.a, tm[j].b + 0.35) : tm[j].b), ws: c, unit: i });
      if (nx && c[c.length - 1].end) m.push(t0 + nx.a);
    });
    // hold the last chunk through the pause, but not into the next unit
    out[out.length - 1].end = sent[i + 1] ? Math.min(sent[i + 1].start, sent[i].end + 0.3) : sent[i].end + lastHold;
    marks.push(m);
  });
  const len = (x) => x.end - x.start, last = (x) => x.ws[x.ws.length - 1];
  for (let j = 0; j < out.length; j++) {
    const c = out[j], nx = out[j + 1], pv = out[j - 1], same = (x) => x && x.unit === c.unit;
    let need = minDur - len(c);
    if (need <= 1e-3) continue;
    const ext = Math.min(need, Math.max(0, (nx ? nx.start : Infinity) - c.end)); // stay through the pause that follows
    c.end += ext; need -= ext;
    if (need <= 1e-3) continue;
    if (need <= 0.2 && same(nx) && len(nx) - need >= minDur) { nx.start += need; c.end = nx.start; continue; } // the next one comes a moment later
    if (need <= 0.2 && same(pv) && len(pv) - need >= minDur && pv.end >= c.start - 1e-3) { c.start -= need; pv.end = c.start; continue; } // or this one a moment earlier
    // too short to save: join it to a neighbour of the same unit (inside its own sentence if possible)
    if (same(nx) && !(last(c).end && same(pv) && !last(pv).end)) { nx.start = c.start; nx.ws = [...c.ws, ...nx.ws]; out.splice(j, 1); j -= 1; }
    else if (same(pv)) { pv.end = c.end; pv.ws = [...pv.ws, ...c.ws]; out.splice(j, 1); j -= 2; }
  }
  const res = out.map(({ start, end, ws, unit }) => ({ start, end, unit, lines: toLines(ws).map((ln) => ln.map(({ w, hi }) => ({ w, hi }))) }));
  res.marks = marks;
  return res;
}

// Draws one caption chunk for an episode that has a theme (see kit/stage.html). The defaults repeat the
// look of caption() in kit/index.js, so a theme names only what differs: { hi: '#FF7A1A' }.
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const r2 = (x) => Math.round(x * 100) / 100;
export function drawCaption(ch, t, { y = 1340, size = 74, hi = '#FF4338', fill = '#FFFFFF', stroke = '#05080F' } = {}) {
  const a = Math.min(1, Math.max(0, (t - ch.start) / 0.09)), sc = 0.9 + 0.1 * (1 - Math.pow(1 - a, 3)), lh = size * 1.18;
  const y0 = y - ((ch.lines.length - 1) * lh) / 2;
  const lines = ch.lines.map((ln, i) => `<text x="540" y="${r2(y0 + i * lh)}" text-anchor="middle" font-family="Mont" font-weight="800" font-size="${size}" letter-spacing="1" paint-order="stroke" stroke="${stroke}" stroke-width="${r2(size * 0.24)}" stroke-linejoin="round">${ln.map((w) => `<tspan fill="${w.hi ? hi : fill}">${esc(w.w)}</tspan>`).join(' ')}</text>`).join('');
  return `<g transform="translate(540 ${y}) scale(${r2(sc)}) translate(-540 ${-y})" opacity="${r2(a)}">${lines}</g>`;
}
