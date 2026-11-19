#!/usr/bin/env node
// Can each account still be posted to? Instagram may lock an account at any moment (a «confirm you are human» check,
// sessions reset after a password change): the token dies, reels stop going out and nothing else says so. This asks
// Zernio for a live check of every account and keeps the verdict in state/health.json, where ci/watchdog.mjs reads
// it and fails the scheduled run on purpose, so that GitHub mails the owner. Only he can clear such a lock.
//   node publish/health.mjs
import fs from 'node:fs';
import { api, userHash } from './zernio.mjs';

const FILE = 'state/health.json';
const read = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const z = read('state/zernio.json', { accounts: {} }), was = read(FILE, { accounts: {} });
const stamp = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
// the verdict is a short code; what the owner has to do is spelled out by ci/watchdog.mjs (Meta's wording is not kept)
const verdict = (h) => {
  const text = [h.disconnectReason, ...(h.issues || [])].filter(Boolean).join(' | ');
  if (/log in to www\.instagram\.com|security check|follow the instructions/i.test(text)) return { ok: false, code: 'check' };
  if (/invalidated|changed their password|no longer valid|rejected the stored credentials/i.test(text) || h.tokenStatus?.valid === false || h.needsReconnect) return { ok: false, code: 'reconnect' };
  if (h.status === 'error') return { ok: false, code: 'error' };
  return { ok: true };
};
// After the owner connects or reconnects an account, Zernio gives it an id: the live one under the same username is
// taken, so that publishing starts by itself. An account entered with a neutral key carries userHash instead of the
// username (state/zernio.json is public).
try {
  const live = (await api('GET', '/accounts')).accounts || [];
  let moved = false;
  for (const [nick, a] of Object.entries(z.accounts)) {
    const best = live.filter((x) => x.platform === 'instagram' && (a.userHash ? userHash(x.username) === a.userHash : x.username === nick)).sort((x, y) => Number(y.isActive) - Number(x.isActive) || String(y.updatedAt).localeCompare(String(x.updatedAt)))[0];
    if (best && best._id && best._id !== a.accountId && (best.isActive || !a.accountId)) { console.log(`health: ${nick} has a new account id`); a.accountId = best._id; a.connectedAt = new Date().toISOString().slice(0, 19) + 'Z'; moved = true; }
  }
  if (moved) fs.writeFileSync('state/zernio.json', JSON.stringify(z, null, 2) + '\n');
} catch (e) { console.log(`health: account list: ${e.message}`); }

const accounts = {};
for (const [nick, a] of Object.entries(z.accounts)) {
  if (!a.accountId) continue;
  try { accounts[nick] = verdict(await api('GET', `/accounts/${a.accountId}/health`)); } catch (e) {
    accounts[nick] = was.accounts?.[nick] || { ok: true }; // the check itself failed: keep the last verdict, do not cry wolf
    console.log(`health: ${nick}: ${e.message}`);
  }
  if (!accounts[nick].ok) accounts[nick].since = was.accounts?.[nick]?.ok === false ? was.accounts[nick].since : stamp();
}
// the file changes only with the verdict, so a healthy day leaves no commits
if (JSON.stringify(accounts) !== JSON.stringify(was.accounts || {})) fs.writeFileSync(FILE, JSON.stringify({ changedAt: stamp(), accounts }, null, 1) + '\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(accounts).map(([n, v]) => [n, v.ok ? 'ok' : v.code]))));
