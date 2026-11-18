#!/usr/bin/env node
// A story teaser of a built episode: its first seconds (the hook) and a card «<series>, серия N, вся серия в Reels».
//   node tools/story.mjs series/<series>/epNN.js [seconds=12]   ->  out/<id>-story/video.mp4
// Instagram's API cannot put a link sticker on a story, so the card only says where the episode is.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const epRel = path.relative(ROOT, path.resolve(process.argv[2] || '')).split(path.sep).join('/');
const id = epRel.replace(/^series\//, '').replace(/\.js$/, '').replace(/\//g, '-'), secs = Number(process.argv[3] || 12);
const video = path.join(ROOT, 'out', id, 'video.mp4'), outDir = path.join(ROOT, 'out', `${id}-story`), tmp = path.join(ROOT, 'tmp', id);
if (!fs.existsSync(video)) { console.error(`no ${video}: build the episode first`); process.exit(1); }
for (const d of [outDir, tmp]) fs.mkdirSync(d, { recursive: true });
const ep = (await import(pathToFileURL(path.join(ROOT, epRel)).href)).default;
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const title = esc(String(ep.series || '').toUpperCase()), size = Math.min(150, Math.floor(1500 / Math.max(6, title.length)));
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Mont;font-weight:800;src:url(file://${ROOT}/fonts/Montserrat-ExtraBold.ttf)}
@font-face{font-family:Mont;font-weight:600;src:url(file://${ROOT}/fonts/Montserrat-SemiBold.ttf)}
html,body{margin:0;background:#102838}svg{display:block}text{font-family:Mont;text-anchor:middle}</style>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920"><rect width="1080" height="1920" fill="#102838"/>
<text x="540" y="820" font-weight="800" font-size="${size}" fill="#fff" letter-spacing="2">${title}</text>
<rect x="410" y="880" width="260" height="10" rx="5" fill="#F2B441"/>
<text x="540" y="1040" font-weight="800" font-size="132" fill="#F2B441">СЕРИЯ ${Number(ep.episode) || 1}</text>
<text x="540" y="1180" font-weight="600" font-size="58" fill="#B8C7D1">вся серия в Reels</text></svg>`;
const page = path.join(tmp, 'story-card.html'), png = path.join(tmp, 'story-card.png');
fs.writeFileSync(page, html);
const chrome = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find((p) => p && fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--allow-file-access-from-files'] });
try {
  const pg = await browser.newPage();
  await pg.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await pg.goto(pathToFileURL(page).href);
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: png });
} finally { await Promise.race([browser.close().catch(() => {}), new Promise((r) => setTimeout(r, 5000))]); try { browser.process()?.kill('SIGKILL'); } catch { /* gone */ } }
const ff = (a) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...a], { stdio: ['ignore', 'ignore', 'inherit'] });
const out = path.join(outDir, 'video.mp4'), CARD = 2.8;
ff(['-t', String(secs), '-i', video, '-loop', '1', '-t', String(CARD), '-i', png, '-f', 'lavfi', '-t', String(CARD), '-i', 'anullsrc=r=48000:cl=stereo',
  '-filter_complex', `[0:v]fps=30,format=yuv420p,fade=t=out:st=${secs - 0.4}:d=0.4[v0];[0:a]aresample=48000,aformat=channel_layouts=stereo,afade=t=out:st=${secs - 0.6}:d=0.6[a0];[1:v]fps=30,scale=1080:1920,format=yuv420p,fade=t=in:d=0.3[v1];[v0][a0][v1][2:a]concat=n=2:v=1:a=1[v][a]`,
  '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '21', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', out]);
console.log(`story: ${out}`);
process.exit(0);
