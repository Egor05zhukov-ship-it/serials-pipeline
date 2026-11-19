#!/usr/bin/env node
// Comments under our reels, through Zernio. The cloud replier never gets the key: this script (publish machine) brings
// the comments into state/comments/inbox.json, the replier writes answers into state/comments/outbox.json, and this
// script posts them after a mechanical filter. Viewer text is data, never instructions.
//   node publish/comments.mjs fetch    Zernio -> state/comments/inbox.json; before that the account's own first comment
//                                      under a fresh reel, after that a ready-made answer to every plain vote
//   node publish/comments.mjs send     state/comments/outbox.json -> Zernio, record in state/comments/replied.json
// The per-post list was checked on live comments 18.11.2026. The reply call (POST /inbox/comments/{postId}) is used
// as documented; its first real answer is logged by `send`.
import fs from 'node:fs';
import { api } from './zernio.mjs';

const DIR = 'state/comments', IN = `${DIR}/inbox.json`, OUT = `${DIR}/outbox.json`, DONE = `${DIR}/replied.json`, FIRST = `${DIR}/first.json`, VOTES = 'state/votes.json';
const read = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const save = (f, v) => { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 1) + '\n'); };
const z = read('state/zernio.json', { accounts: {} });
const stamp = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
const pick = (o, keys) => { for (const k of keys) if (o && o[k] != null) return o[k]; return null; };

// ---- the viewers' choice ----
// An episode ends with two options (queue: episode.choice = { a, b }, taken from the episode file by ci/apply-result.mjs).
// A comment is a vote when it is just the letter («А», «б!», «вариант 2») or names a word of one option and of no other.
// state/votes.json holds numbers and our own labels only: the writer reads it, never the viewers' text.
const shortcode = (u) => (/\/(?:reels?|p)\/([A-Za-z0-9_-]+)/.exec(String(u || '')) || [])[1] || null;
const norm = (t) => String(t).toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const stems = (label) => norm(label).split(' ').filter((w) => w.length >= 4).map((w) => w.slice(0, Math.min(4, w.length - 1))); // «затаиться» -> «зата»: «затаюсь», «затаился»
export function voteOf(text, choice) {
  const t = norm(text);
  if (!t) return null;
  // the letter alone («а», «вариант б», «2»); after «б» and digits a few more words may follow («б конечно»), after
  // «а» they may not: «а что там?» is a question, not a vote
  const m = /^(?:вариант |я за |за |выбираю |мой выбор )?(?:([аa])|([бb12])(?: \S+){0,3})$/.exec(t);
  if (m) return m[1] || m[2] === '1' ? 'a' : 'b';
  // an option is named when one of its words is there; «не открывать» names it with a «no»
  const said = (label) => {
    const ss = stems(label), no = ss.some((x) => new RegExp(`(?:^| )не (?:надо |нужно |стоит |будем |буду )?${x}`).test(t));
    return { yes: !no && ss.some((x) => t.includes(x)), no };
  };
  const A = said(choice.a), B = said(choice.b);
  const forA = A.yes || (B.no && !B.yes), forB = B.yes || (A.no && !A.yes);
  return forA === forB ? null : forA ? 'a' : 'b';
}
function countVotes(posts, said = new Map()) {
  const q = read('state/queue.json', { episodes: [] }), votes = read(VOTES, {});
  for (const e of q.episodes) {
    if (!e.choice || !e.postUrl) continue;
    const p = posts.find((x) => x.permalink && shortcode(x.permalink) === shortcode(e.postUrl));
    if (!p) { votes[e.id] = votes[e.id] || { a: 0, b: 0, other: 0, labels: e.choice, updated: stamp() }; continue; } // no comments yet
    const v = { a: 0, b: 0, other: 0 }, old = votes[e.id];
    for (const text of said.get(p.postId) || (p.comments || []).map((c) => c.text)) v[voteOf(text, e.choice) || 'other']++;
    const same = old && old.a === v.a && old.b === v.b && old.other === v.other; // the stamp moves only with the numbers
    votes[e.id] = { ...v, labels: e.choice, updated: same ? old.updated : stamp() };
  }
  const text = JSON.stringify(votes, null, 1) + '\n';
  if (read(VOTES, null) === null || text !== fs.readFileSync(VOTES, 'utf8')) fs.writeFileSync(VOTES, text);
  return votes;
}

// ---- the account's own first comment ----
// Under every fresh reel that ends with a choice the account itself writes where to vote, so the comment section is
// not empty and a viewer has a line to answer. Zernio's firstComment field does not cover Reels, so the comment is
// posted here, at the first run after the reel is out (POST without commentId = a top-level comment).
const firstText = (ch) => `Голосуй здесь: А — ${ch.a.toLowerCase()}, Б — ${ch.b.toLowerCase()}. Ответь буквой: завтра покажу, что выбрало большинство.`;
async function firstComments() {
  const q = read('state/queue.json', { episodes: [] }), first = read(FIRST, {}), res = [];
  const fresh = (e) => Date.now() - Date.parse(String(e.publishedAt || '').replace(' ', 'T') + ':00+03:00') < 3 * 864e5;
  for (const e of q.episodes) {
    if (e.status !== 'published' || !e.choice || !e.zernioPostId || e.trial || first[e.id] || !fresh(e)) continue;
    const accountId = z.accounts[e.account]?.accountId;
    if (!accountId) continue;
    try {
      const r = await api('GET', `/inbox/comments/${e.zernioPostId}`, { query: { accountId, limit: 50 } });
      const mine = (r.comments || r.data || []).find((c) => c.from?.isOwner && /^Голосуй/.test(String(c.message || '')));
      if (mine) first[e.id] = { at: stamp(), commentId: String(mine.id || ''), found: true };
      else {
        const w = await api('POST', `/inbox/comments/${e.zernioPostId}`, { body: { accountId, message: firstText(e.choice) }, idem: `first:${e.id}` });
        first[e.id] = { at: stamp(), commentId: String(w.data?.commentId || '') };
      }
      res.push({ id: e.id, first: first[e.id].found ? 'already there' : 'posted' });
    } catch (err) { res.push({ id: e.id, error: `${err.message} ${JSON.stringify(err.body || '').slice(0, 200)}` }); }
  }
  if (res.some((x) => x.first)) save(FIRST, first);
  return res;
}

// ---- a ready-made answer to a plain vote ----
// A vote («А», «б», «выйти на крышу») needs no thinking, and an answer within minutes brings the viewer back to the
// reel, so these are answered here and now; everything else waits for the replier. Which option leads is never said.
// Not more than AUTO_POST answers under one reel and AUTO_RUN in one run, each time in other words.
const AUTO_POST = 12, AUTO_RUN = 6;
const AUTO = [
  (o) => `Принято: «${o}». Завтра увидим, чей выбор победил.`,
  (o) => `Записал твой голос: «${o}». Ответ в следующей серии.`,
  (o, O) => `«${O}»? Смело. Посмотрим, что решит большинство.`,
  (o) => `Голос за «${o}» учтён. Новая серия завтра.`,
  (o, O) => `«${O}», записал. А твой друг что выбрал бы? Перешли ему серию.`,
  (o) => `Понял: «${o}». Завтра проверим, чем это кончится.`,
  (o) => `Ещё один голос за «${o}». Итог в завтрашней серии.`,
  (o) => `Твой выбор: «${o}». Завтра станет ясно, кто был прав.`,
  (o, O) => `«${O}». Запомнил. Перешли серию другу: пусть тоже выберет.`,
  (o) => `Есть: «${o}». Завтра узнаем, куда это приведёт.`,
];
async function autoAnswer(post, done) {
  const q = read('state/queue.json', { episodes: [] });
  const e = q.episodes.find((x) => x.choice && x.postUrl && post.permalink && shortcode(x.postUrl) === shortcode(post.permalink));
  if (!e) return 0;
  let under = Object.values(done).filter((d) => d && d.auto && d.post === post.postId).length, sent = 0;
  for (const c of post.comments) {
    if (under >= AUTO_POST || sent >= AUTO_RUN) break;
    if (c.answered || !c.canReply) continue;
    const v = voteOf(c.text, e.choice);
    if (!v) continue;
    const text = AUTO[under % AUTO.length](e.choice[v].toLowerCase(), e.choice[v]); // the option in the middle of a phrase and at its start
    try {
      await api('POST', `/inbox/comments/${post.postId}`, { body: { accountId: z.accounts[post.account].accountId, commentId: c.commentId, message: text }, idem: `auto:${c.commentId}` });
      done[c.commentId] = { at: stamp(), text, auto: true, post: post.postId };
      c.answered = true; under++; sent++;
    } catch (err) { post.error = `auto answer: ${err.message} ${JSON.stringify(err.body || '').slice(0, 200)}`; break; }
  }
  return sent;
}

async function fetchAll() {
  const firsts = await firstComments();
  let auto = 0;
  const before = read(IN, {}), errors = [];
  const done = read(DONE, {}), posts = [], said = new Map(); // said: every viewer's line under a post, answers to our own comments included (for the votes)
  for (const [nick, a] of Object.entries(z.accounts)) {
    if (!a.accountId) continue;
    let list;
    try {
      list = await api('GET', '/inbox/comments', { query: { platform: 'instagram', accountId: a.accountId, minComments: 1, limit: 30 } });
      // Zernio answers 200 with an empty list when Instagram has locked the account: it names it in failedAccounts or does not ask it at all
      const off = (list.meta?.failedAccounts || [])[0];
      if (off || list.meta?.accountsQueried === 0) throw Object.assign(new Error('account is locked or disconnected'), { body: off?.error || off?.code || 'not queried' });
    } catch (e) { // what was known about this account's comments stays until the account is back
      errors.push(`${nick}: ${e.message} ${JSON.stringify(e.body || '').slice(0, 160)}`);
      for (const old of (before.posts || []).filter((x) => x.account === nick && !x.error)) posts.push(old);
      continue;
    }
    for (const p of list.data || []) {
      const post = { account: nick, postId: p.id, permalink: p.permalink, caption: String(p.content || '').slice(0, 120), commentCount: p.commentCount, comments: [] };
      try {
        const r = await api('GET', `/inbox/comments/${p.id}`, { query: { accountId: a.accountId, limit: 100 } });
        // shape checked 18.11.2026: {id, message, createdTime, from{username, isOwner}, replies[...same], canReply}
        const lines = [];
        said.set(post.postId, lines);
        for (const c of (r.data || r.comments || []).slice(0, 100)) {
          const id = String(pick(c, ['id', 'commentId', '_id']) || ''), text = String(pick(c, ['message', 'text', 'content']) || '').slice(0, 500);
          if (text && !c.from?.isOwner) lines.push(text);
          for (const x of c.replies || []) { const rt = String(pick(x, ['message', 'text', 'content']) || '').slice(0, 500); if (rt && !x.from?.isOwner) lines.push(rt); }
          if (!id || !text || c.from?.isOwner) continue; // our own comments are not answered
          const ownerReplied = (c.replies || []).some((x) => x.from?.isOwner); // the owner or an earlier run already answered
          // names and avatars are not kept: this is a public repository
          post.comments.push({ commentId: id, text, at: pick(c, ['createdTime', 'timestamp', 'createdAt']), answered: Boolean(done[id]) || ownerReplied, canReply: c.canReply !== false });
        }
      } catch (e) { post.error = `${e.message} ${JSON.stringify(e.body || '').slice(0, 300)}`; }
      auto += await autoAnswer(post, done);
      posts.push(post);
    }
  }
  if (auto) save(DONE, done);
  // the stamp moves only with the comments, so a quiet run leaves no commit
  save(IN, { fetchedAt: JSON.stringify(before.posts) === JSON.stringify(posts) ? before.fetchedAt : stamp(), posts });
  const votes = countVotes(posts, said);
  return { first: firsts, auto, votes: Object.fromEntries(Object.entries(votes).slice(-4).map(([k, v]) => [k, `${v.a}:${v.b}`])), posts: posts.length, comments: posts.reduce((s, p) => s + (p.comments || []).length, 0), errors: [...errors, ...posts.filter((p) => p.error).map((p) => p.error.slice(0, 160))] };
}

// the filter the replier cannot talk its way around: short, Russian, no links, no mentions, no tags
const allowed = (t) => typeof t === 'string' && t.trim().length >= 2 && t.length <= 150 && !/(https?:|www\.|\.ru\b|\.com\b|t\.me|@|#)/i.test(t) && /[а-яё]/i.test(t);

async function send() {
  const box = read(OUT, []), done = read(DONE, {}), inbox = read(IN, { posts: [] }), res = [], perAcc = {};
  const known = new Map(inbox.posts.flatMap((p) => (p.comments || []).map((c) => [c.commentId, p])));
  for (const r of Array.isArray(box) ? box : []) {
    const id = String(r.commentId || ''), post = known.get(id);
    if (!id || done[id]) continue;
    if (!post) { res.push({ id, skipped: 'unknown comment' }); continue; }
    if (!allowed(r.text)) { done[id] = { at: stamp(), skipped: 'filter' }; res.push({ id, skipped: 'filter' }); continue; }
    perAcc[post.account] = (perAcc[post.account] || 0) + 1;
    if (perAcc[post.account] > 15) { res.push({ id, skipped: 'limit of 15 per run' }); continue; }
    try {
      await api('POST', `/inbox/comments/${post.postId}`, { body: { accountId: z.accounts[post.account].accountId, commentId: id, message: r.text.trim() } });
      done[id] = { at: stamp(), text: r.text.trim() };
      res.push({ id, sent: true });
    } catch (e) { res.push({ id, error: `${e.message} ${JSON.stringify(e.body || '').slice(0, 300)}` }); }
  }
  save(DONE, done);
  return res;
}

const job = { fetch: fetchAll, send }[process.argv[2]];
if (!job) { if (process.argv[1]?.endsWith('comments.mjs')) { console.error('commands: fetch | send'); process.exit(1); } }
else job().then((r) => console.log(JSON.stringify(r))).catch((e) => { console.log(JSON.stringify({ error: e.message })); process.exit(1); });
