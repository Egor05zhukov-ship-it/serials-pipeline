#!/usr/bin/env node
// Puts ready episodes on the air through Zernio and keeps state/queue.json in step. Zernio publishes at the slot time
// by itself, so nothing of ours has to be running then.
//   node publish/schedule.mjs plan                 what would be scheduled and when (no calls)
//   node publish/schedule.mjs run [--only <id>]    schedule every `ready` episode whose out/<id>/video.mp4 exists
//   node publish/schedule.mjs sync                 scheduled -> published / failed (asks Zernio)
//   node publish/schedule.mjs unschedule <id>      take a scheduled episode off the air plan (back to `ready`)
// Main line: one episode per account per day, in episode order, at accounts.<nick>.slots {weekday, weekend} (Moscow
// time) or at the episode's own `slot` (a time test of the writer; the value is checked in ci/apply-result.mjs).
// Remakes (epNNr.js: a first episode that flopped, cut anew): one per account per day at their own time (slot,
// accounts.<nick>.altSlot or 12:37), as a Trial Reel while the account may post them: Instagram shows a trial reel to
// non-followers only and puts it on the profile only if it does well. Series in queue.hold are built, never scheduled.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { api, postReel, upload } from './zernio.mjs';

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
const lineOf = (e) => (e.remake ? 'remake' : 'main');
const plusMin = (at, n) => new Date(Date.parse(at + ':00Z') + n * 60e3).toISOString().slice(0, 16);
const timeOf = (acc, e, ymd) => e.slot || (e.remake ? acc.altSlot || '12:37' : slotOf(acc, ymd));

// The next free day of the episode's line on its account: after the last scheduled or published episode of that line,
// not earlier than today, and today only if the time is still at least MARGIN_MIN minutes away.
function nextSlot(q, e, now = new Date()) {
  const acc = q.accounts[e.account];
  const used = q.episodes.filter((x) => x.account === e.account && lineOf(x) === lineOf(e) && ['scheduled', 'published'].includes(x.status)).map(dayOf).filter(Boolean).sort();
  let d = day(now);
  if (used.length && used.at(-1) >= d) d = addDays(used.at(-1), 1);
  if (d === day(now)) {
    const [h, m] = timeOf(acc, e, d).split(':').map(Number), t = msk(now), left = h * 60 + m - (t.getUTCHours() * 60 + t.getUTCMinutes());
    if (left < MARGIN_MIN) d = addDays(d, 1);
  }
  return `${d}T${timeOf(acc, e, d)}`;
}

// ready episodes in airing order; an episode waits until every earlier one of its series is on the plan
function due(q, only) {
  const done = (e) => ['scheduled', 'published'].includes(e.status), hold = new Set(q.hold || []);
  return q.episodes.filter((e) => e.status === 'ready' && !hold.has(e.series) && (!only || e.id === only)).sort((a, b) => a.number - b.number).filter((e) => {
    if (e.remake) return true;
    const earlier = q.episodes.filter((x) => !x.remake && x.series === e.series && x.number < e.number && !['deleted', 'shelved'].includes(x.status));
    return earlier.every((x) => done(x) || (x.status === 'ready' && !only));
  });
}

async function run(only, dry) {
  const q = read(QUEUE), z = read(ZERNIO), out = [];
  for (const e of due(q, only)) {
    const dir = path.join(ROOT, e.out || `out/${e.id}`), accountId = z.accounts[e.account]?.accountId, at = nextSlot(q, e);
    const video = path.join(dir, 'video.mp4'), cover = path.join(dir, 'cover.jpg'), cap = path.join(dir, 'caption.txt');
    if (!accountId) { out.push({ id: e.id, skipped: `account ${e.account} is not connected to Zernio` }); continue; }
    if (!fs.existsSync(video) || !fs.existsSync(cap)) { out.push({ id: e.id, skipped: `no ${path.relative(ROOT, video)} here: build it first` }); continue; }
    if (dry) { out.push({ id: e.id, account: e.account, at }); Object.assign(e, { status: 'scheduled', scheduledFor: at }); continue; }
    const trial = Boolean(e.remake) && q.accounts[e.account].trial !== false;
    // Our own first comment gives the viewers a place to vote and the comment section is not empty from minute one.
    // The docs promise firstComment for feed posts; if Zernio refuses it for a Reel (400), the reel goes out without it.
    const vote = e.choice && !trial && q.firstComment !== false ? `Голосуй здесь: А — ${e.choice.a.toLowerCase()}, Б — ${e.choice.b.toLowerCase()}. Ответь на этот комментарий буквой.` : null;
    const idem = `${e.id}:${at}:${fs.statSync(video).size}:${Math.round(fs.statSync(video).mtimeMs / 1000)}`; // a rebuilt video is a new post, not a replay of the old request
    const send = (withVote) => postReel({ accountId, video, cover: fs.existsSync(cover) ? cover : null, caption: fs.readFileSync(cap, 'utf8').trim(), at,
      idem: withVote ? idem : `${idem}:plain`,
      // audioName: the reel's sound is called after the series, so every episode is found by one tap on the sound
      extra: { ...(trial ? { trialParams: { graduationStrategy: 'SS_PERFORMANCE' } } : {}), ...(withVote ? { firstComment: vote } : {}), ...(withVote && e.title ? { audioName: `${e.title} · серия ${e.number}`.slice(0, 60) } : {}) } });
    let r;
    try { r = await send(Boolean(vote)); } catch (err) {
      if (!vote || err.status !== 400) throw err;
      log({ event: 'first-comment-refused', episode: e.id, why: JSON.stringify(err.body || '').slice(0, 200) });
      q.firstComment = false; // do not try again for the next episodes
      r = await send(false);
    }
    Object.assign(e, { status: 'scheduled', scheduledFor: at, zernioPostId: r.post._id, ...(trial ? { trial: true } : {}) });
    // the story teaser of the episode (tools/story.mjs) goes out four minutes after the reel; the owner or a Mac session
    // then files it under the series' highlight (the API can neither do that nor put a link on a story)
    const story = path.join(ROOT, 'out', `${e.id}-story`, 'video.mp4');
    if (!trial && q.stories !== false && fs.existsSync(story)) {
      try {
        const sv = await upload(story), sAt = plusMin(at, 4);
        const sr = await api('POST', '/posts', { body: { content: '', mediaItems: [{ type: 'video', url: sv.publicUrl }], platforms: [{ platform: 'instagram', accountId, platformSpecificData: { contentType: 'story' } }], scheduledFor: sAt, timezone: 'Europe/Moscow' }, idem: `story:${e.id}:${sAt}` });
        e.storyPostId = sr.post._id;
      } catch (err) { log({ event: 'story-failed', episode: e.id, why: err.message }); }
    }
    save(q);
    log({ event: 'scheduled', episode: e.id, account: e.account, for: at, post: r.post._id, ...(trial ? { trial: true } : {}) });
    out.push({ id: e.id, account: e.account, at, post: r.post._id, ...(trial ? { trial: true } : {}) });
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
      const why = String(pl.errorMessage || pl.error || post.status).slice(0, 300);
      if (e.trial && /trial/i.test(why)) { // the account may not post Trial Reels: the next run sends it as an ordinary reel
        q.accounts[e.account].trial = false;
        delete e.trial; delete e.scheduledFor; delete e.zernioPostId; e.status = 'ready';
        log({ event: 'trial-refused', episode: e.id, account: e.account, why });
      } else {
        Object.assign(e, { status: 'failed', failNote: `publication: ${why}` });
        log({ event: 'publish-failed', episode: e.id, account: e.account, why });
      }
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
  if (e.storyPostId) await api('DELETE', `/posts/${e.storyPostId}`).catch(() => {});
  log({ event: 'unscheduled', episode: id, was: e.scheduledFor });
  delete e.scheduledFor; delete e.zernioPostId; delete e.storyPostId; delete e.trial; e.status = 'ready';
  save(q);
  return { id, status: 'ready' };
}

const [cmd, ...rest] = process.argv.slice(2);
const only = rest.includes('--only') ? rest[rest.indexOf('--only') + 1] : null;
const job = { plan: () => run(only, true), run: () => run(only, false), sync, unschedule: () => unschedule(rest[0]) }[cmd];
if (!job) { console.error('commands: plan | run [--only <id>] | sync | unschedule <id>'); process.exit(1); }
job().then((r) => console.log(JSON.stringify(r, null, 1))).catch((e) => { console.log(JSON.stringify({ error: e.message, status: e.status, body: e.body }, null, 1)); process.exit(1); });
