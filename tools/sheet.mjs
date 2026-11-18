#!/usr/bin/env node
// A sheet of frames in one picture, for looking at drawings without a build:
//   node tools/sheet.mjs tmp/style/test.js out.jpg [cols=4] [cellWidth=360]
// The module exports default [{ label, svg, h }]: svg is the inside of a 1080 x h stage (h = 1920 unless given).
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [mod, out, cols = '4', w = '360'] = process.argv.slice(2);
if (!mod || !out) { console.error('Usage: node tools/sheet.mjs <module.js> <out.jpg> [cols] [cellWidth]'); process.exit(1); }
const MIME = { '.js': 'text/javascript', '.html': 'text/html; charset=utf-8', '.ttf': 'font/ttf' };
const server = createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const chrome = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find((p) => p && fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-color-profile=srgb'] });
try {
  const pg = await browser.newPage();
  pg.on('pageerror', (e) => console.error('page error:', e.message));
  pg.on('console', (m) => { if (m.type() === 'error') console.error('page console:', m.text()); });
  await pg.setViewport({ width: 1200, height: 900, deviceScaleFactor: 1 });
  const rel = '/' + path.relative(ROOT, path.resolve(mod)).split(path.sep).join('/');
  await pg.goto(`http://127.0.0.1:${server.address().port}/kit/sheet.html?m=${encodeURIComponent(rel)}&cols=${cols}&w=${w}`);
  await pg.waitForFunction('window.ready === true', { timeout: 60000, polling: 250 });
  const el = await pg.$('#grid');
  await el.screenshot({ path: path.resolve(out), type: 'jpeg', quality: 90 });
  console.log('sheet:', path.resolve(out));
} finally {
  await Promise.race([browser.close().catch(() => {}), new Promise((r) => setTimeout(r, 6000))]);
  try { browser.process()?.kill('SIGKILL'); } catch { /* gone */ }
  server.close();
}
process.exit(0);
