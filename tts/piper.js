// Piper (local neural TTS). Placeholder voice for previews; needs a Python venv with piper-tts
// and a voice model. PIPER_PYTHON, PIPER_MODEL, PIPER_SPEED (length scale), PIPER_PITCH (1 = as is).
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toWav } from './util.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const name = 'piper';
export async function synth(text, outWav) {
  const py = process.env.PIPER_PYTHON || path.join(root, 'tmp/piper-venv/bin/python');
  const model = process.env.PIPER_MODEL || path.join(root, 'tmp/voices/ru_RU-dmitri-medium.onnx'); // the clearest of the two voices tried
  const raw = outWav + '.raw.wav';
  execFileSync(py, ['-m', 'piper', '-m', model, '-f', raw, '--length-scale', process.env.PIPER_SPEED || '1.0', '--sentence-silence', '0.28'], { input: text, stdio: ['pipe', 'ignore', 'ignore'] });
  const k = Number(process.env.PIPER_PITCH || 1);
  toWav(raw, outWav, k === 1 ? [] : [`asetrate=22050*${k}`, 'aresample=22050', `atempo=${1 / k}`]);
}
