// Qwen3-TTS, local (Apache-2.0 models): no cloud, no keys. The narrator is an original designed voice: the VoiceDesign
// model reads one reference sentence from a text description (once, kept in tmp/voices/qwen-*.wav), then the Base model
// continues that clip for every phrase, so the voice does not drift between phrases. Same text + settings = same audio.
// QWEN_VOICE (voice description), QWEN_VOICE_SEED (which take of it becomes the voice), QWEN_SEED (phrase sampling),
// QWEN_PYTHON (venv with qwen-tts), QWEN_MODELS (folder with the Qwen3-TTS models), QWEN_DEVICE (cuda:0 / mps / cpu).
// The worker (qwen_synth.py) starts on the first phrase, keeps the model loaded and leaves when the phrases stop.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toWav } from './util.js';

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), 'qwen_synth.py');
const IDLE_MS = 5000, TIMEOUT_MS = 20 * 60 * 1000;
export const name = 'qwen';

let worker = null, idle = null, line = Promise.resolve();
const stop = () => { if (worker) { worker.child.kill(); worker = null; } };
process.on('exit', stop);
// an idle worker must not keep node alive; a busy one must
const hold = (w, on) => { for (const h of [w.child, w.child.stdin, w.child.stdout, w.child.stderr]) (on ? h.ref() : h.unref()); };

function start() {
  const py = process.env.QWEN_PYTHON || path.join(os.homedir(), '.qwen3tts/bin/python');
  if (!fs.existsSync(py)) throw new Error(`Qwen3-TTS: нет окружения Python (${py}). Укажите его в QWEN_PYTHON или возьмите другой голос: --tts piper`);
  const w = { child: spawn(py, [script, '--serve'], { stdio: ['pipe', 'pipe', 'pipe'] }), buf: '', log: '', wait: null };
  const fail = (why) => { if (worker === w) worker = null; w.wait?.reject(new Error(`Qwen3-TTS: ${why}\n${w.log.slice(-1500)}`)); };
  w.child.stdout.setEncoding('utf8').on('data', (d) => {
    w.buf += d;
    for (let i; (i = w.buf.indexOf('\n')) >= 0; w.buf = w.buf.slice(i + 1)) {
      let r;
      try { r = JSON.parse(w.buf.slice(0, i)); } catch { continue; } // not a reply
      w.wait?.resolve(r);
    }
  });
  w.child.stderr.setEncoding('utf8').on('data', (d) => { w.log = (w.log + d).slice(-4000); });
  w.child.stdin.on('error', () => {}); // a dead worker is reported by 'exit'
  w.child.on('error', (e) => fail(`не запустился ${py}: ${e.message}`));
  w.child.on('exit', (code, signal) => fail(`обработчик остановился (${signal || code})`));
  return w;
}

function ask(req) {
  return new Promise((resolve, reject) => {
    clearTimeout(idle);
    const w = worker ??= start();
    hold(w, true);
    const timer = setTimeout(() => w.child.kill('SIGKILL'), TIMEOUT_MS);
    const done = (f) => (x) => { clearTimeout(timer); w.wait = null; f(x); };
    w.wait = { resolve: done(resolve), reject: done(reject) };
    w.child.stdin.write(JSON.stringify(req) + '\n');
  }).finally(() => {
    if (!worker) return;
    hold(worker, false);
    idle = setTimeout(stop, IDLE_MS); // frees the memory before the frames are rendered
    idle.unref();
  });
}

export async function synth(text, outWav) {
  const job = line.then(async () => {
    const raw = outWav + '.raw.wav';
    const r = await ask({ text, out: raw });
    if (!r.ok) throw new Error(`Qwen3-TTS: ${r.error}`);
    toWav(raw, outWav);
    fs.rmSync(raw, { force: true });
  });
  line = job.catch(() => {});
  return job;
}
