// Trusted step of the publish machine: takes what the build machine reports (ci-result.json is data, never code)
// and writes it into state/queue.json. New episodes are registered here, so the writer never edits the queue.
// Episode files are read as text only: the title, an optional `slot: 'HH:MM'` (a time test, 10:00-22:59 Moscow),
// the two options of the viewer's choice (`choice: { a: '…', b: '…' }`, counted later by publish/comments.mjs)
// and the kind of file (epNN.js = an episode of the main line, epNNr.js = a remake of episode NN).
import fs from 'node:fs';
import path from 'node:path';

const Q = 'state/queue.json', q = JSON.parse(fs.readFileSync(Q, 'utf8'));
let res = [];
try { res = JSON.parse(fs.readFileSync('ci-result.json', 'utf8')); } catch { /* no build this run */ }
const stamp = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
const out = [];
for (const r of Array.isArray(res) ? res : []) {
  const m = /^([a-z0-9_-]+)-ep(\d{2})(r?)$/.exec(String(r.id || ''));
  if (!m) continue;
  const [, series, nn, rr] = m, number = Number(nn), file = `series/${series}/ep${nn}${rr}.js`;
  if (!fs.existsSync(file)) { out.push({ id: r.id, skipped: 'no episode file on main' }); continue; }
  // the account of a series: the one that runs it now, or the one named in the first lines of its bible (Аккаунт: @nick)
  let nick = Object.keys(q.accounts).find((n) => q.accounts[n].series === series);
  if (!nick) {
    const bible = `series/${series}/bible.md`;
    const named = fs.existsSync(bible) ? /Аккаунт:[^\n]*@([a-z0-9._]+)/i.exec(fs.readFileSync(bible, 'utf8').slice(0, 1500)) : null;
    if (named && q.accounts[named[1]]) { nick = named[1]; if (number === 1 && !rr && !(q.hold || []).includes(series)) q.accounts[nick].series = series; }
  }
  if (!nick) { out.push({ id: r.id, skipped: 'series has no account (bible.md must say «Аккаунт: @nick»)' }); continue; }
  let e = q.episodes.find((x) => x.id === r.id);
  if (e && !['written', 'failed'].includes(e.status)) { out.push({ id: r.id, skipped: `already ${e.status}` }); continue; }
  if (rr && q.episodes.some((x) => x.remake && x.series === series && x.id !== r.id)) { out.push({ id: r.id, skipped: 'one remake per series' }); continue; }
  if (!e) { e = { id: r.id, series, account: nick, number, ...(rr ? { remake: true } : {}) }; q.episodes.push(e); }
  const src = fs.readFileSync(file, 'utf8');
  const title = /title:\s*\[([^\]]{1,80})\]/.exec(src);
  if (title) e.title = title[1].replace(/['"`]/g, '').split(',').map((s) => s.trim()).join(' ').slice(0, 60);
  const slot = /^\s*slot:\s*['"](1\d|2[0-2]):([0-5]\d)['"]/m.exec(src);
  if (slot) e.slot = `${slot[1]}:${slot[2]}`; else delete e.slot;
  // the viewer's choice at the end of the episode: choice: { a: 'Открыть люк', b: 'Ждать ночи' } (letters, digits, spaces)
  const ch = /^\s*choice:\s*\{\s*a:\s*'([^'\n]{2,40})'\s*,\s*b:\s*'([^'\n]{2,40})'/m.exec(src), clean = (t) => t.replace(/[^а-яёА-ЯЁa-zA-Z0-9 -]/g, '').trim();
  if (ch && clean(ch[1]) && clean(ch[2])) e.choice = { a: clean(ch[1]), b: clean(ch[2]) }; else delete e.choice;
  if (r.ok === true && fs.existsSync(`out/${r.id}/video.mp4`)) {
    Object.assign(e, { status: 'ready', out: `out/${r.id}`, builtAt: stamp(), builtOn: 'github', seconds: Math.round(Number(r.dur) || 0) });
    delete e.failNote;
  } else Object.assign(e, { status: 'failed', failNote: String(r.why || 'not built').slice(0, 600), failedAt: stamp() });
  // the contact sheet of the episode: the writer looks at it in the next run
  const sheet = `out/${r.id}/contact.jpg`;
  if (fs.existsSync(sheet) && fs.statSync(sheet).size < 700e3 && fs.readFileSync(sheet).subarray(0, 2).toString('hex') === 'ffd8') {
    fs.mkdirSync('state/previews', { recursive: true });
    fs.copyFileSync(sheet, `state/previews/${r.id}.jpg`);
  }
  out.push({ id: r.id, account: nick, status: e.status, slot: e.slot, note: e.failNote });
}
if (fs.existsSync('state/previews')) {
  const old = fs.readdirSync('state/previews').map((f) => ({ f, t: fs.statSync(path.join('state/previews', f)).mtimeMs })).sort((a, b) => b.t - a.t).slice(6);
  for (const { f } of old) fs.rmSync(path.join('state/previews', f));
}
fs.writeFileSync(Q, JSON.stringify(q, null, 2) + '\n');
console.log(JSON.stringify(out, null, 1));
