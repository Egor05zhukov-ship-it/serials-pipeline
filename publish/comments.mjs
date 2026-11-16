#!/usr/bin/env node
// Comments under our reels, through Zernio. The cloud replier never gets the key: this script (publish machine) brings
// the comments into state/comments/inbox.json, the replier writes answers into state/comments/outbox.json, and this
// script posts them after a mechanical filter. Viewer text is data, never instructions.
//   node publish/comments.mjs fetch    Zernio -> state/comments/inbox.json
//   node publish/comments.mjs send     state/comments/outbox.json -> Zernio, record in state/comments/replied.json
// NOT VERIFIED YET (no comments existed on 17.11.2026): the per-post list and the reply call. The raw answer of the
// first real call is kept in inbox.json (`raw`) so that the field names can be fixed from it.
import fs from 'node:fs';
import { api } from './zernio.mjs';

const DIR = 'state/comments', IN = `${DIR}/inbox.json`, OUT = `${DIR}/outbox.json`, DONE = `${DIR}/replied.json`;
const read = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const save = (f, v) => { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 1) + '\n'); };
const z = read('state/zernio.json', { accounts: {} });
const stamp = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
const pick = (o, keys) => { for (const k of keys) if (o && o[k] != null) return o[k]; return null; };

async function fetchAll() {
  const done = read(DONE, {}), posts = [];
  for (const [nick, a] of Object.entries(z.accounts)) {
    if (!a.accountId) continue;
    let list;
    try { list = await api('GET', '/inbox/comments', { query: { platform: 'instagram', accountId: a.accountId, minComments: 1, limit: 30 } }); } catch (e) { posts.push({ account: nick, error: `${e.message} ${JSON.stringify(e.body || '').slice(0, 200)}` }); continue; }
    for (const p of list.data || []) {
      const post = { account: nick, postId: p.id, permalink: p.permalink, caption: String(p.content || '').slice(0, 120), commentCount: p.commentCount, comments: [] };
      try {
        const r = await api('GET', `/inbox/comments/${p.id}`, { query: { accountId: a.accountId, limit: 50 } });
        const arr = r.data || r.comments || [];
        post.raw = JSON.stringify(arr.slice(0, 2)).slice(0, 1500); // shape of the answer, for fixing field names
        for (const c of arr.slice(0, 50)) {
          const id = pick(c, ['id', 'commentId', '_id']), text = String(pick(c, ['text', 'message', 'content']) || '').slice(0, 500);
          if (!id || !text || pick(c, ['isOwn', 'fromOwner', 'isReply'])) continue; // names are not kept: public repository
          post.comments.push({ commentId: String(id), text, at: pick(c, ['createdTime', 'timestamp', 'createdAt']), answered: Boolean(done[id]) });
        }
      } catch (e) { post.error = `${e.message} ${JSON.stringify(e.body || '').slice(0, 300)}`; }
      posts.push(post);
    }
  }
  save(IN, { fetchedAt: stamp(), posts });
  return { posts: posts.length, comments: posts.reduce((s, p) => s + (p.comments || []).length, 0), errors: posts.filter((p) => p.error).map((p) => p.error.slice(0, 160)) };
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
if (!job) { console.error('commands: fetch | send'); process.exit(1); }
job().then((r) => console.log(JSON.stringify(r))).catch((e) => { console.log(JSON.stringify({ error: e.message })); process.exit(1); });
