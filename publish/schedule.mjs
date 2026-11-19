#!/usr/bin/env node
// Puts ready episodes on the air through Zernio and keeps state/queue.json in step. Zernio publishes at the slot time
// by itself, so nothing of ours has to be running then.
//   node publish/schedule.mjs plan                 what would be scheduled and when (no calls)
//   node publish/schedule.mjs run [--only <id>]    schedule every `ready` episode whose out/<id>/video.mp4 exists
//   node publish/schedule.mjs sync                 scheduled -> published / failed (asks Zernio)
//   node publish/schedule.mjs unschedule <id>      take a scheduled episode off the air plan (back to `ready`)
//   node publish/schedule.mjs stage                upload the files of built episodes and keep the links in the queue
// The files of a built episode live only where it was built (the build run's machine, or the Mac). So at the first try
// they are uploaded to Zernio and the links are kept in the queue (episode.media, good for a week): if Instagram locks
// the account and the reel does not go out, any later run can put it on the plan again without the files.
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
const QUEUE = path.join(ROOT, 'state/queue.json'), ZERNIO = path.join(ROOT, 'state/zernio.json'), LOG = path.join(ROOT, 'state/log.jsonl'), HEALTH = path.join(ROOT, 'state/health.json');
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
// Instagram locked the account (a «confirm you are human» check, sessions reset after a password change): only the owner
// can clear that, so the episode is not failed but waits as `ready` and goes out at the next slot after he has.
const BLOCKED = /disconnect|reconnect|token|log ?in|security|session|checkpoint|password|\b190\b/i;
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

// Uploads the episode's files once and remembers the links (Zernio keeps an upload for 7 days; a post made from it
// keeps its own copy). False when there are neither files here nor fresh links.
const MEDIA_DAYS = 6;
const freshMedia = (e) => Boolean(e.media?.video && e.media.caption && Date.now() - Date.parse(e.media.uploadedAt) < MEDIA_DAYS * 864e5);
async function stage(q, e) {
  if (freshMedia(e)) return true;
  const dir = path.join(ROOT, e.out || `out/${e.id}`), video = path.join(dir, 'video.mp4'), cover = path.join(dir, 'cover.jpg'), cap = path.join(dir, 'caption.txt');
  const story = path.join(ROOT, 'out', `${e.id}-story`, 'video.mp4'); // the story teaser of the episode (tools/story.mjs)
  if (!fs.existsSync(video) || !fs.existsSync(cap)) return false;
  const v = await upload(video), c = fs.existsSync(cover) ? await upload(cover) : null, st = fs.existsSync(story) ? await upload(story).catch(() => null) : null;
  e.media = { video: v.publicUrl, ...(c ? { cover: c.publicUrl } : {}), ...(st ? { story: st.publicUrl } : {}), caption: fs.readFileSync(cap, 'utf8').trim(), uploadedAt: new Date().toISOString() };
  save(q);
  return true;
}

async function run(only, dry) {
  const q = read(QUEUE), z = read(ZERNIO), out = [];
  let health = {};
  try { health = read(HEALTH).accounts || {}; } catch { /* no check yet */ }
  for (const e of due(q, only)) {
    const accountId = z.accounts[e.account]?.accountId, at = nextSlot(q, e);
    if (!accountId) { out.push({ id: e.id, skipped: `account ${e.account} is not connected to Zernio` }); continue; }
    if (dry) { out.push({ id: e.id, account: e.account, at }); Object.assign(e, { status: 'scheduled', scheduledFor: at }); continue; }
    // an account Instagram has locked (publish/health.mjs) is not tried: the episode waits as `ready` for the owner
    if (health[e.account]?.ok === false) { out.push({ id: e.id, skipped: `account ${e.account} is locked by Instagram (${health[e.account].code})` }); continue; }
    if (e.retryAfter && Date.now() < Date.parse(e.retryAfter)) { out.push({ id: e.id, skipped: `waits until ${e.retryAfter} after a failed try` }); continue; }
    try {
      if (!(await stage(q, e))) { out.push({ id: e.id, skipped: `no out/${e.id}/video.mp4 here and no uploaded copy: build it first` }); continue; }
    } catch (err) { out.push({ id: e.id, error: `upload: ${err.message}` }); continue; }
    const trial = Boolean(e.remake) && q.accounts[e.account].trial !== false;
    // The account's own first comment («Голосуй здесь…») is posted by publish/comments.mjs once the reel is out:
    // Zernio's firstComment field is documented for feed posts and carousels only, so it is not sent with a Reel.
    // the same episode at the same time from two machines is one post; after it was taken off the plan (e.tries) it is a new one
    const idem = `${e.id}:${at}:${e.media.uploadedAt}:${e.tries || 0}`;
    const sound = e.seriesName || e.title; // the reel's sound is named after the series instead of «Оригинальная аудиодорожка»
    let r;
    try {
      r = await postReel({ accountId, videoUrl: e.media.video, coverUrl: e.media.cover || null, caption: e.media.caption, at, idem,
        extra: { ...(trial ? { trialParams: { graduationStrategy: 'SS_PERFORMANCE' } } : {}), ...(sound ? { audioName: `${sound} · серия ${e.number}`.slice(0, 60) } : {}) } });
    } catch (err) { // one account's trouble must not stop the other account's episode; the next try is in an hour
      const why = `${err.message} ${JSON.stringify(err.body || '').slice(0, 300)}`;
      e.retryAfter = new Date(Date.now() + 3600e3).toISOString();
      save(q);
      log({ event: BLOCKED.test(why) ? 'account-blocked' : 'schedule-failed', episode: e.id, account: e.account, why });
      out.push({ id: e.id, account: e.account, error: why.slice(0, 200) });
      continue;
    }
    delete e.retryAfter;
    Object.assign(e, { status: 'scheduled', scheduledFor: at, zernioPostId: r.post._id, ...(trial ? { trial: true } : {}) });
    // the story teaser goes out four minutes after the reel (the API can neither file it under a highlight nor put a link on it)
    if (!trial && q.stories !== false && e.media.story) {
      try {
        const sAt = plusMin(at, 4);
        const sr = await api('POST', '/posts', { body: { content: '', mediaItems: [{ type: 'video', url: e.media.story }], platforms: [{ platform: 'instagram', accountId, platformSpecificData: { contentType: 'story' } }], scheduledFor: sAt, timezone: 'Europe/Moscow' }, idem: `story:${e.id}:${sAt}:${e.tries || 0}` });
        e.storyPostId = sr.post._id;
      } catch (err) { log({ event: 'story-failed', episode: e.id, why: err.message }); }
    }
    save(q);
    log({ event: 'scheduled', episode: e.id, account: e.account, for: at, post: r.post._id, ...(trial ? { trial: true } : {}) });
    out.push({ id: e.id, account: e.account, at, post: r.post._id, ...(trial ? { trial: true } : {}) });
  }
  return out;
}

// uploads the files of every built episode that is still waiting or on the plan, so that another machine can (re)schedule it
async function stageAll() {
  const q = read(QUEUE), out = [];
  for (const e of q.episodes.filter((x) => ['ready', 'scheduled'].includes(x.status))) {
    const had = freshMedia(e);
    try { out.push({ id: e.id, media: had ? 'already uploaded' : (await stage(q, e)) ? 'uploaded' : 'no files here' }); } catch (err) { out.push({ id: e.id, error: err.message }); }
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
      delete e.media; delete e.retryAfter;
      log({ event: 'published', episode: e.id, account: e.account, url: e.postUrl });
    } else if (['failed', 'partial', 'cancelled'].includes(post.status)) {
      const why = String(pl.errorMessage || pl.error || post.status).slice(0, 300);
      if (e.trial && /trial/i.test(why)) { // the account may not post Trial Reels: the next run sends it as an ordinary reel
        q.accounts[e.account].trial = false;
        delete e.trial; delete e.scheduledFor; delete e.zernioPostId; e.status = 'ready';
        log({ event: 'trial-refused', episode: e.id, account: e.account, why });
      } else if (BLOCKED.test(why)) { // the account is locked by Instagram: back to `ready`, the reel itself is fine
        if (e.storyPostId) await api('DELETE', `/posts/${e.storyPostId}`).catch(() => {});
        delete e.scheduledFor; delete e.zernioPostId; delete e.storyPostId; e.status = 'ready'; e.tries = (e.tries || 0) + 1;
        log({ event: 'account-blocked', episode: e.id, account: e.account, why });
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
  delete e.scheduledFor; delete e.zernioPostId; delete e.storyPostId; delete e.trial; e.status = 'ready'; e.tries = (e.tries || 0) + 1;
  save(q);
  return { id, status: 'ready' };
}

const [cmd, ...rest] = process.argv.slice(2);
const only = rest.includes('--only') ? rest[rest.indexOf('--only') + 1] : null;
const job = { plan: () => run(only, true), run: () => run(only, false), sync, unschedule: () => unschedule(rest[0]), stage: stageAll }[cmd];
if (!job) { console.error('commands: plan | run [--only <id>] | sync | unschedule <id> | stage'); process.exit(1); }
job().then((r) => console.log(JSON.stringify(r, null, 1))).catch((e) => { console.log(JSON.stringify({ error: e.message, status: e.status, body: e.body }, null, 1)); process.exit(1); });
