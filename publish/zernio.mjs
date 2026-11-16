#!/usr/bin/env node
// Zernio (formerly Late) client: publishing reels and answering comments through Meta's official API without our own
// Meta app. Free for the first two connected accounts. Docs: https://docs.zernio.com (checked 16.11.2026).
//
// Key: env ZERNIO_API_KEY, or a line ZERNIO_API_KEY=... in ~/.config/serials/zernio.env (chmod 600, never in git).
//
//   node publish/zernio.mjs usage
//   node publish/zernio.mjs profiles | profile-create <name>
//   node publish/zernio.mjs connect <profileId>            -> authUrl: open it in Chrome logged into that Instagram account
//   node publish/zernio.mjs accounts                       -> accountId per Instagram username
//   node publish/zernio.mjs upload <file>                  -> publicUrl
//   node publish/zernio.mjs post --account <id> --dir out/<ep> --at 2026-11-17T18:07 [--tz Europe/Moscow]
//        (dir holds video.mp4, cover.jpg, caption.txt; without --at the reel goes out now)
//   node publish/zernio.mjs status <postId> | delete <postId>
//   node publish/zernio.mjs commented [--account <id>] [--since <iso>]   -> our posts that have comments
//   node publish/zernio.mjs comments <postId> --account <id>             -> the comments of one post
//   node publish/zernio.mjs reply <postId> --account <id> --comment <commentId> --text "..."
//
// Every command prints JSON. A non-2xx answer prints {error, status, body} and exits with code 1.
// Unverified until the first live call: the per-post comments list and the reply body (marked VERIFY below).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.ZERNIO_BASE || 'https://zernio.com/api/v1';

function apiKey() {
  if (process.env.ZERNIO_API_KEY) return process.env.ZERNIO_API_KEY.trim();
  const f = path.join(os.homedir(), '.config/serials/zernio.env');
  if (fs.existsSync(f)) {
    const m = fs.readFileSync(f, 'utf8').match(/^\s*ZERNIO_API_KEY\s*=\s*["']?([^"'\s]+)/m);
    if (m) return m[1];
  }
  throw new Error('No ZERNIO_API_KEY (env or ~/.config/serials/zernio.env)');
}

async function api(method, route, { body, query, idem } = {}) {
  const url = new URL(BASE + route);
  for (const [k, v] of Object.entries(query || {})) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  const headers = { Authorization: `Bearer ${apiKey()}` };
  if (body) headers['Content-Type'] = 'application/json';
  if (idem) headers['Idempotency-Key'] = idem;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 2000) }; }
  if (!res.ok) {
    const err = new Error(`${method} ${route} -> ${res.status}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return { status: res.status, ...data };
}

const TYPES = { '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };

// presign -> PUT the bytes (no Authorization header on the storage URL) -> the public URL a post can use
export async function upload(file) {
  const contentType = TYPES[path.extname(file).toLowerCase()];
  if (!contentType) throw new Error(`Unknown file type: ${file}`);
  const bytes = fs.readFileSync(file);
  const p = await api('POST', '/media/presign', { body: { filename: path.basename(file), contentType, size: bytes.length } });
  // From the Mac (VPN exit in Germany) a large PUT is sometimes reset mid-way (EPIPE / connection reset); a retry passes.
  // The signed URL lives an hour, so the same one is reused.
  for (let attempt = 1; ; attempt++) {
    try {
      const put = await fetch(p.uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: bytes });
      if (put.ok) return { publicUrl: p.publicUrl, key: p.key, bytes: bytes.length, attempts: attempt };
      if (put.status < 500 || attempt >= 4) throw Object.assign(new Error(`upload PUT -> ${put.status}`), { status: put.status, body: (await put.text()).slice(0, 500) });
    } catch (e) {
      if (e.status || attempt >= 4) throw e;
    }
    await new Promise((r) => setTimeout(r, [0, 2000, 5000, 10000][attempt]));
  }
}

// One video = a Reel (no content type field). scheduledFor without an offset is read in `timezone`.
export async function postReel({ accountId, video, cover, caption, at, tz = 'Europe/Moscow', idem }) {
  const v = await upload(video);
  const c = cover ? await upload(cover) : null;
  const platformSpecificData = { shareToFeed: true, ...(c ? { instagramThumbnail: c.publicUrl } : {}) };
  const body = {
    content: caption,
    mediaItems: [{ type: 'video', url: v.publicUrl }],
    platforms: [{ platform: 'instagram', accountId, platformSpecificData }],
    ...(at ? { scheduledFor: at, timezone: tz } : { publishNow: true }), // VERIFY publishNow; we normally schedule
  };
  return api('POST', '/posts', { body, idem });
}

function args(argv) {
  const o = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) o[a.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    else o._.push(a);
  }
  return o;
}

async function main() {
  const o = args(process.argv.slice(2));
  const [cmd, x] = o._;
  const need = (v, name) => { if (!v) throw new Error(`missing ${name}`); return v; };
  switch (cmd) {
    case 'usage': return api('GET', '/usage');
    case 'profiles': return api('GET', '/profiles');
    case 'profile-create': return api('POST', '/profiles', { body: { name: need(x, '<name>') } });
    case 'connect': return api('GET', '/connect/instagram', { query: { profileId: need(x, '<profileId>'), loginMethod: 'instagram_login', redirect_url: o.redirect } });
    case 'accounts': return api('GET', '/accounts', { query: { profileId: o.profile } });
    case 'upload': return upload(need(x, '<file>'));
    case 'post': {
      const dir = need(o.dir, '--dir');
      const caption = fs.readFileSync(path.join(dir, 'caption.txt'), 'utf8').trim();
      const cover = path.join(dir, 'cover.jpg');
      return postReel({ accountId: need(o.account, '--account'), video: path.join(dir, 'video.mp4'), cover: fs.existsSync(cover) ? cover : null,
        caption, at: o.at, tz: o.tz, idem: o.idem || `${path.basename(path.resolve(dir))}:${o.account}` });
    }
    case 'status': return api('GET', `/posts/${need(x, '<postId>')}`);
    case 'delete': return api('DELETE', `/posts/${need(x, '<postId>')}`);
    case 'commented': return api('GET', '/inbox/comments', { query: { platform: 'instagram', accountId: o.account, since: o.since, minComments: 1, limit: o.limit || 50 } });
    // VERIFY: per-post list and reply body were not on the pages read; adjust after the first live call.
    case 'comments': return api('GET', `/inbox/comments/${need(x, '<postId>')}`, { query: { accountId: need(o.account, '--account') } });
    case 'reply': return api('POST', `/inbox/comments/${need(x, '<postId>')}`, { body: { accountId: need(o.account, '--account'), commentId: need(o.comment, '--comment'), message: need(o.text, '--text') } });
    default: throw new Error('commands: usage profiles profile-create connect accounts upload post status delete commented comments reply');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) { // the folder name is Cyrillic: compare paths, not URLs
  main().then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => {
    console.log(JSON.stringify({ error: e.message, status: e.status, body: e.body }, null, 2));
    process.exit(1);
  });
}
