#!/usr/bin/env node
// Builds one episode: narration -> voice -> timeline -> frames -> mp4 + cover + caption.
//   node build.js series/nochnaya-smena/ep01.js --tts piper
//   --still 1.5,12,40   render only these moments as jpg (quick look, no video)
//   --no-video          audio and timeline only
import { execFileSync, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { planCaptions, plain } from './kit/captions.js';
import { bedArgs, SFX } from './audio/ambient.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const FPS = 30, LUFS = -14;
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i < 0 ? def : args[i + 1]; };
const epPath = args.find((a) => a.endsWith('.js'));
if (!epPath) { console.error('Usage: node build.js series/<series>/epNN.js --tts <piper|say|yandex|elevenlabs>'); process.exit(1); }
const epRel = path.relative(ROOT, path.resolve(epPath)).split(path.sep).join('/');
const id = epRel.replace(/^series\//, '').replace(/\.js$/, '').replace(/\//g, '-');
const OUT = path.join(ROOT, 'out', id), TMP = path.join(ROOT, 'tmp', id);
for (const d of [OUT, TMP, path.join(ROOT, 'tmp/tts-cache')]) fs.mkdirSync(d, { recursive: true });

const ff = (a, capture = false) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-y', ...(capture ? [] : ['-loglevel', 'error']), ...a], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`ffmpeg failed:\n${r.stderr.slice(-1500)}`);
  return r.stderr;
};
const durOf = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }));
const TRIM = 'silenceremove=start_periods=1:start_threshold=-50dB:detection=peak';

const ep = (await import(pathToFileURL(path.join(ROOT, epRel)).href)).default;
const units = ep.narration.map((u) => (typeof u === 'string' ? { text: u } : u));

// ---------- 1. voice, one file per narration unit (cached by provider and text) ----------
const ttsName = opt('tts', process.env.TTS || 'piper');
const tts = await import(`./tts/${ttsName}.js`);
const voiceTag = [ttsName, process.env.PIPER_MODEL, process.env.PIPER_PITCH, process.env.PIPER_SPEED, process.env.YANDEX_VOICE, process.env.ELEVENLABS_VOICE_ID, process.env.SAY_VOICE].join('|');
const sent = [];
let t = 0;
for (const [i, u] of units.entries()) {
  const say = u.say || plain(u.text);
  const wav = path.join(ROOT, 'tmp/tts-cache', createHash('sha1').update(voiceTag + say).digest('hex').slice(0, 16) + '.wav');
  if (!fs.existsSync(wav)) {
    const raw = wav.replace(/\.wav$/, '.src.wav');
    await tts.synth(say, raw);
    // cut silence on both ends so the first word lands exactly on its start time
    ff(['-i', raw, '-af', `${TRIM},afade=t=in:d=0.008,areverse,${TRIM},afade=t=in:d=0.03,areverse`, '-ar', '48000', '-ac', '1', wav]);
    fs.rmSync(raw, { force: true });
  }
  const d = durOf(wav);
  sent.push({ start: t, end: t + d, wav });
  t += d + (u.gap ?? ep.gap ?? 0.2);
  process.stdout.write(`\rvoice ${i + 1}/${units.length}`);
}
console.log('');

// ---------- 2. timeline ----------
const shots = ep.shots.map((s, i) => ({ i, id: s.id, start: sent[s.from].start, end: ep.shots[i + 1] ? sent[ep.shots[i + 1].from].start : sent[sent.length - 1].end + (ep.tail ?? 0.6) }));
const endCardStart = shots[shots.length - 1].end, total = endCardStart + (ep.endCardDur ?? 2.5);
const tl = { fps: FPS, total, endCardStart, sent: sent.map(({ start, end }) => ({ start, end })), shots, chunks: planCaptions(units, sent, ep.tail ?? 0.6) };
fs.writeFileSync(path.join(TMP, 'timeline.json'), JSON.stringify(tl));
console.log(`length ${total.toFixed(1)} s, ${shots.length} shots, ${tl.chunks.length} caption chunks`);
for (const s of shots) console.log(`  ${s.start.toFixed(1).padStart(5)}-${s.end.toFixed(1).padStart(5)}  ${s.id}`);

// ---------- 3. audio ----------
const voice = path.join(TMP, 'voice.wav'), bed = path.join(TMP, 'bed.wav'), sfx = path.join(TMP, 'sfx.wav'), mix = path.join(TMP, 'mix.wav'), final = path.join(TMP, 'final.wav');
{
  const ins = sent.flatMap((s) => ['-i', s.wav]);
  const fc = sent.map((s, i) => `[${i}]adelay=${Math.round(s.start * 1000)}:all=1[a${i}]`).join(';') + ';' + sent.map((_, i) => `[a${i}]`).join('') +
    `amix=inputs=${sent.length}:normalize=0:dropout_transition=0,highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=90:makeup=3,apad=whole_dur=${total}[v]`;
  ff([...ins, '-filter_complex', fc, '-map', '[v]', '-ar', '48000', '-ac', '1', voice]);
  ff([...bedArgs(total), '-ar', '48000', '-ac', '1', bed]);
  const cues = (ep.sfx || []).map((c) => ({ src: SFX[c.type](), at: sent[c.sentence].start + (c.at ?? 0) * (sent[c.sentence].end - sent[c.sentence].start) + (c.offset ?? 0), vol: c.vol ?? 1 }));
  if (cues.length) {
    const ci = cues.flatMap((c) => ['-f', 'lavfi', '-i', c.src]);
    const cf = cues.map((c, i) => `[${i}]volume=${c.vol},adelay=${Math.round(c.at * 1000)}:all=1[s${i}]`).join(';') + ';' + cues.map((_, i) => `[s${i}]`).join('') + `amix=inputs=${cues.length}:normalize=0,apad=whole_dur=${total}[o]`;
    ff([...ci, '-filter_complex', cf, '-map', '[o]', '-ar', '48000', '-ac', '1', '-t', String(total), sfx]);
  } else ff(['-f', 'lavfi', '-i', `anullsrc=r=48000:cl=mono`, '-t', String(total), sfx]);
  ff(['-i', voice, '-i', bed, '-i', sfx, '-filter_complex', `[1]volume=${ep.bedVolume ?? 0.3}[b];[2]volume=${ep.sfxVolume ?? 0.8}[s];[0][b][s]amix=inputs=3:normalize=0`, '-t', String(total), mix]);
  // measure integrated loudness, then bring it to the target with plain gain and a limiter
  const loud = (f) => Number([...ff(['-i', f, '-af', 'ebur128', '-f', 'null', '-'], true).matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop()[1]);
  let gain = LUFS - loud(mix);
  for (let pass = 0; pass < 3; pass++) { // the limiter eats a little level, so correct until it lands
    ff(['-i', mix, '-af', `volume=${gain.toFixed(2)}dB,alimiter=limit=0.89:level=false`, '-ar', '48000', final]);
    const off = LUFS - loud(final);
    if (Math.abs(off) < 0.15) break;
    gain += off;
  }
  console.log(`audio: gain ${gain.toFixed(1)} dB -> ${loud(final).toFixed(1)} LUFS`);
}

// ---------- 4. picture ----------
const MIME = { '.js': 'text/javascript', '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.ttf': 'font/ttf', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/kit/stage.html?ep=/${epRel}&tl=/tmp/${id}/timeline.json`;
const chrome = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find((p) => p && fs.existsSync(p));
if (!chrome) throw new Error('Chrome не найден: задайте CHROME_PATH');
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const newPage = async () => {
  const pg = await browser.newPage();
  pg.on('pageerror', (e) => { console.error('page error:', e.message); });
  await pg.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await pg.goto(url);
  await pg.waitForFunction('window.ready === true', { timeout: 30000 });
  return pg;
};
const shoot = async (pg, time, file) => { await pg.evaluate((x) => window.seek(x), time); await pg.screenshot({ path: file, type: 'jpeg', quality: 92, optimizeForSpeed: true }); };

try {
  const still = opt('still');
  if (still) {
    const pg = await newPage();
    const times = still === 'shots' ? shots.flatMap((s) => [s.start + 0.3, (s.start + s.end) / 2, s.end - 0.15]) : still.split(',').map(Number);
    for (const [k, x] of times.entries()) await shoot(pg, x, path.join(OUT, `still_${String(k).padStart(2, '0')}_${x.toFixed(1)}.jpg`));
    console.log(`stills: ${times.length} in ${OUT}`);
  } else if (!args.includes('--no-video')) {
    const frames = Math.round(total * FPS), dir = path.join(TMP, 'frames');
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
    const pages = await Promise.all(Array.from({ length: Number(process.env.RENDER_WORKERS || 3) }, newPage));
    const t0 = Date.now(); let next = 0, done = 0;
    await Promise.all(pages.map(async (pg) => {
      for (;;) {
        const i = next++; if (i >= frames) break;
        await shoot(pg, i / FPS, path.join(dir, String(i).padStart(6, '0') + '.jpg'));
        if (++done % 150 === 0) process.stdout.write(`\rframes ${done}/${frames}`);
      }
    }));
    console.log(`\rframes ${frames}/${frames} in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    ff(['-framerate', String(FPS), '-i', path.join(dir, '%06d.jpg'), '-i', final, '-vf', 'scale=in_range=full:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18',
      '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', '-shortest', path.join(OUT, 'video.mp4')]);
    ff(['-i', path.join(OUT, 'video.mp4'), '-vf', 'fps=1/3,scale=216:-1,tile=8x3', '-frames:v', '1', '-q:v', '3', path.join(OUT, 'contact.jpg')]);
    fs.rmSync(dir, { recursive: true, force: true });
    const pg = pages[0];
    await pg.evaluate(() => window.cover());
    await pg.screenshot({ path: path.join(OUT, 'cover.jpg'), type: 'jpeg', quality: 92 });
    fs.writeFileSync(path.join(OUT, 'caption.txt'), ep.post.trim() + '\n');
    console.log(`done: ${path.join(OUT, 'video.mp4')}`);
  }
} finally {
  await browser.close(); server.close();
}
