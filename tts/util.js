import { execFileSync } from 'node:child_process';

export const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'ignore', 'inherit'] });
// any audio file -> 48 kHz mono wav
export const toWav = (src, out, filters = []) => ff(['-i', src, ...(filters.length ? ['-af', filters.join(',')] : []), '-ar', '48000', '-ac', '1', out]);
export const need = (name) => { const v = process.env[name]; if (!v) throw new Error(`Не задана переменная окружения ${name}`); return v; };
