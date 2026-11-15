// macOS built-in voice. Local preview only: it does not exist on the cloud VM.
import { execFileSync } from 'node:child_process';
import { toWav } from './util.js';

export const name = 'say';
export async function synth(text, outWav) {
  const tmp = outWav + '.aiff';
  execFileSync('say', ['-v', process.env.SAY_VOICE || 'Milena', '-r', process.env.SAY_RATE || '165', '-o', tmp, text]);
  toWav(tmp, outWav);
}
