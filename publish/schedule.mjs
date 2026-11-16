#!/usr/bin/env node
// Puts ready episodes on the air through Zernio and keeps state/queue.json in step. Zernio publishes at the slot time
// by itself, so nothing of ours has to be running then.
//   node publish/schedule.mjs plan                 what would be scheduled and when (no calls)
//   node publish/schedule.mjs run [--only <id>]    schedule every `ready` episode whose out/<id>/video.mp4 exists
//   node publish/schedule.mjs sync                 scheduled -> published / failed (asks Zernio)
//   node publish/schedule.mjs unschedule <id>      take a scheduled episode off the air plan (back to `ready`)
// Slots: accounts.<nick>.slots {weekday, weekend}, Moscow time; one episode per account per day, in episode order.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { api, postReel } from './zernio.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const QUEUE = path.join(ROOT, 'state/queue.json'), ZERNIO = path.join(ROOT, 'state/zernio.json'), LOG = path.join(ROOT, 'state/log.jsonl');
const MSK = 3 * 3600e3, MARGIN_MIN = 20;
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const save = (q) => fs.writeFileSync(QUEUE, JSON.stringify(q, null, 2) + '\n');
const log = (o) => fs.appendFileSync(LOG, JSON.stringify({ at: stamp(new Date()), ...o }) + '\n');
const msk = (d) => new Date(d.getTime() + MSK); // read its UTC fields as Moscow wall-clock time
const day = (d) => msk(d).toISOString().slice(0, 10);
const stamp = (d) => msk(d).toISOString().slice(0, 16).replace('T', ' ');
const addDays = (ymd, n) => new Date(Date.parse(ymd + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const slotOf = (acc, ymd) => ([0, 6].includes(new Date(ymd + 'T00:00:00Z').getUTCDay()) ? acc.slots.weekend : acc.slots.weekday);
const dayOf = (e) => (e.scheduledFor || e.publishedAt || '').slice(0, 10);

// The next free day for the account: after its last scheduled or published episode, not earlier than today,
// and today only if the slot is still at least MARGIN_MIN minutes away.
function nextSlot(q, nick, now = new Date()) {
  const acc = q.accounts[nick], used = q.episodes.filter((e) => e.account === nick && ['scheduled', 'published'].includes(e.status)).map(dayOf).filter(Boolean).sort();
  let d = day(now);
  if (used.length && used.at(-1) >= d) d = addDays(used.at(-1), 1);
  if (d === day(now)) {
    const [h, m] = slotOf(acc, d).split(':').map(Number), t = msk(now), left = h * 60 + m - (t.getUTCHours() * 60 + t.getUTCMinutes());
    if (left < MARGIN_MIN) d = addDays(d, 1);
  }
  return `${d}T${slotOf(acc, d)}`;
}

// ready episodes in airing order; an episode waits until every earlier one of its series is on the plan
function due(q, only) {
  const done = (e) => ['scheduled', 'published'].includes(e.status);
  return q.episodes.filter((e) => e.status === 'ready' && (!only || e.id === only)).sort((a, b) => a.number - b.number).filter((e) => {
    const earlier = q.episodes.filter((x) => x.series === e.series && x.number < e.number && !['deleted', 'shelved'].includes(x.status));
    return earlier.every((x) => done(x) || (x.status === 'ready' && !only));
  });
}

async function run(only, dry) {
  const q = read(QUEUE), z = read(ZERNIO), out = [];
  for (const e of due(q, only)) {
    const dir = path.join(ROOT, e.out || `out/${e.id}`), accountId = z.accounts[e.account]?.accountId, at = nextSlot(q, e.account);
    const video = path.join(dir, 'video.mp4'), cover = path.join(dir, 'cover.jpg'), cap = path.join(dir, 'caption.txt');
    if (!accountId) { out.push({ id: e.id, skipped: `account ${e.account} is not connected to Zernio` }); continue; }
    if (!fs.existsSync(video) || !fs.existsSync(cap)) { out.push({ id: e.id, skipped: `no ${path.relative(ROOT, video)} here: build it first` }); continue; }
    if (dry) { out.push({ id: e.id, account: e.account, at }); Object.assign(e, { status: 'scheduled', scheduledFor: at }); continue; }
    const r = await postReel({ accountId, video, cover: fs.existsSync(cover) ? cover : null, caption: fs.readFileSync(cap, 'utf8').trim(), at, idem: `${e.id}:${at}:${fs.statSync(video).size}:${Math.round(fs.statSync(video).mtimeMs / 1000)}` }); // a rebuilt video is a new post, not a replay of the old request
    Object.assign(e, { status: 'scheduled', scheduledFor: at, zernioPostId: r.post._id });
    save(q);
    log({ event: 'scheduled', episode: e.id, account: e.account, for: at, post: r.post._id });
    out.push({ id: e.id, account: e.account, at, post: r.post._id });
  }
  return out;
}

async function sync() {
  const q = read(QUEUE), out = [];
  for (const e of q.episodes.filter((x) => x.status === 'scheduled' && x.zernioPostId)) {
    let post;
    try { ({ post } = await api('GET', `/posts/${e.zernioPostId}`)); } catch (err) {
      if (err.status !== 404) throw err;
      Object.assign(e, { status: 'failed', failNote: 'Zernio no longer has this post' });
      out.push({ id: e.id, status: 'failed', why: 'post not found' });
      continue;
    }
    const pl = (post.platforms || [])[0] || {};
    if (post.status === 'published') {
      Object.assign(e, { status: 'published', publishedAt: stamp(new Date(pl.publishedAt || post.publishedAt || Date.now())), postUrl: pl.platformPostUrl || null });
      log({ event: 'published', episode: e.id, account: e.account, url: e.postUrl });
    } else if (['failed', 'partial', 'cancelled'].includes(post.status)) {
      Object.assign(e, { status: 'failed', failNote: String(pl.errorMessage || pl.error || post.status).slice(0, 300) });
      log({ event: 'publish-failed', episode: e.id, account: e.account, why: e.failNote });
    }
    out.push({ id: e.id, zernio: post.status, status: e.status, url: e.postUrl });
  }
  save(q);
  return out;
}

async function unschedule(id) {
  const q = read(QUEUE), e = q.episodes.find((x) => x.id === id && x.status === 'scheduled');
  if (!e) throw new Error(`no scheduled episode ${id}`);
  await api('DELETE', `/posts/${e.zernioPostId}`);
  log({ event: 'unscheduled', episode: id, was: e.scheduledFor });
  delete e.scheduledFor; delete e.zernioPostId; e.status = 'ready';
  save(q);
  return { id, status: 'ready' };
}

const [cmd, ...rest] = process.argv.slice(2);
const only = rest.includes('--only') ? rest[rest.indexOf('--only') + 1] : null;
const job = { plan: () => run(only, true), run: () => run(only, false), sync, unschedule: () => unschedule(rest[0]) }[cmd];
if (!job) { console.error('commands: plan | run [--only <id>] | sync | unschedule <id>'); process.exit(1); }
job().then((r) => console.log(JSON.stringify(r, null, 1))).catch((e) => { console.log(JSON.stringify({ error: e.message, status: e.status, body: e.body }, null, 1)); process.exit(1); });
