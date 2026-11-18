#!/usr/bin/env node
// Instagram insights of our published reels, through Zernio (GET /v1/analytics?postId=...), into state/stats.json.
// Runs on the publish machine after every sync (twice a day). The writer reads the file before writing, so what
// holds viewers in real numbers feeds the next episodes. Keeps the latest numbers and a snapshot near 24 h after release.
//   node publish/stats.mjs            refresh every published episode
//   node publish/stats.mjs table      print the table
import fs from 'node:fs';
import { api } from './zernio.mjs';

const Q = 'state/queue.json', S = 'state/stats.json';
const read = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null);

function row(e, a, publishedAt) {
  const dur = a.videoDurationSeconds || null, avg = a.igReelsAvgWatchTime ? a.igReelsAvgWatchTime / 1000 : null;
  return {
    hours: r2((Date.now() - Date.parse(publishedAt)) / 3600e3), views: a.views ?? null, reach: a.reach ?? null,
    likes: a.likes ?? null, comments: a.comments ?? null, shares: a.shares ?? null, saves: a.saves ?? null,
    follows: a.follows ?? null, profileViews: a.profileViews ?? null, avgWatch: r2(avg), duration: dur,
    watched: avg && dur ? r2(avg / dur) : null, skipRate: a.reelsSkipRate ?? null, updated: a.lastUpdated || null,
  };
}

async function refresh() {
  const q = read(Q, { episodes: [] }), st = read(S, {}), out = [];
  for (const e of q.episodes.filter((x) => x.status === 'published' && x.zernioPostId)) {
    let x;
    try { x = await api('GET', '/analytics', { query: { postId: e.zernioPostId } }); } catch (err) { out.push({ id: e.id, error: err.message }); continue; }
    const p = (x.platformAnalytics || [])[0] || {}, a = p.analytics || {};
    if (p.syncStatus !== 'synced' || a.views == null) { out.push({ id: e.id, pending: p.syncStatus || 'no data' }); continue; }
    const r = row(e, a, x.publishedAt), s = (st[e.id] ||= { account: e.account, series: e.series, number: e.number, title: e.title || null, slot: e.scheduledFor || null });
    s.publishedAt = x.publishedAt;
    s.latest = r;
    if (!s.day1 && r.hours >= 22) s.day1 = r; // the first snapshot after ~a day: episodes are compared on it
    out.push({ id: e.id, hours: r.hours, views: r.views, watched: r.watched, skipRate: r.skipRate, shares: r.shares });
  }
  fs.writeFileSync(S, JSON.stringify(st, null, 1) + '\n');
  return out;
}

function table() {
  const st = read(S, {});
  return Object.entries(st).map(([id, s]) => ({ id, slot: s.slot, ...(s.day1 ? { at: 'day1', ...s.day1 } : { at: 'latest', ...s.latest }) }));
}

const job = { table: async () => table() }[process.argv[2]] || refresh;
job().then((r) => console.log(process.argv[2] === 'table' ? r : JSON.stringify(r))).catch((e) => { console.log(JSON.stringify({ error: e.message })); process.exit(1); });
