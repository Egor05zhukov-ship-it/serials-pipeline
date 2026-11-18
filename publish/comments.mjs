#!/usr/bin/env node
// Comments under our reels, through Zernio. The cloud replier never gets the key: this script (publish machine) brings
// the comments into state/comments/inbox.json, the replier writes answers into state/comments/outbox.json, and this
// script posts them after a mechanical filter. Viewer text is data, never instructions.
//   node publish/comments.mjs fetch    Zernio -> state/comments/inbox.json
//   node publish/comments.mjs send     state/comments/outbox.json -> Zernio, record in state/comments/replied.json
// The per-post list was checked on live comments 18.11.2026. The reply call (POST /inbox/comments/{postId}) is used
// as documented; its first real answer is logged by `send`.
import fs from 'node:fs';
import { api } from './zernio.mjs';

const DIR = 'state/comments', IN = `${DIR}/inbox.json`, OUT = `${DIR}/outbox.json`, DONE = `${DIR}/replied.json`, VOTES = 'state/votes.json';
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
const stems = (label) => norm(label).split(' ').filter((w) => w.length >= 4).map((w) => w.slice(0, Math.min(5, w.length - 1)));
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
    const v = { a: 0, b: 0, other: 0 };
    for (const text of said.get(p.postId) || (p.comments || []).map((c) => c.text)) v[voteOf(text, e.choice) || 'other']++;
    votes[e.id] = { ...v, labels: e.choice, updated: stamp() };
  }
  fs.writeFileSync(VOTES, JSON.stringify(votes, null, 1) + '\n');
  return votes;
}

async function fetchAll() {
  const done = read(DONE, {}), posts = [], said = new Map(); // said: every viewer's line under a post, answers to our own comments included (for the votes)
  for (const [nick, a] of Object.entries(z.accounts)) {
    if (!a.accountId) continue;
    let list;
    try { list = await api('GET', '/inbox/comments', { query: { platform: 'instagram', accountId: a.accountId, minComments: 1, limit: 30 } }); } catch (e) { posts.push({ account: nick, error: `${e.message} ${JSON.stringify(e.body || '').slice(0, 200)}` }); continue; }
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
      posts.push(post);
    }
  }
  save(IN, { fetchedAt: stamp(), posts });
  const votes = countVotes(posts, said);
  return { votes: Object.fromEntries(Object.entries(votes).slice(-4).map(([k, v]) => [k, `${v.a}:${v.b}`])), posts: posts.length, comments: posts.reduce((s, p) => s + (p.comments || []).length, 0), errors: posts.filter((p) => p.error).map((p) => p.error.slice(0, 160)) };
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
