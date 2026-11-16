// Real recordings for the sounds code cannot fake (knocks, doors, steps, engines, wind).
// All CC0, sources and what was cut from each are in sfx/CREDITS.json.
// Every file is 48 kHz mono 16-bit wav. Accents (4 s or less) peak at -3 dBFS and start on the sound.
// Beds (wind-howl, wind-storm, car-idle; 12-15 s) sit at -20 LUFS and are cut so the end runs into the start.
// car-pass is a 12 s one-shot.
//
// Intended wiring in build.js, next to the procedural cues from ambient.js (not done yet):
//   import { SFX as REC, sfxInput } from './audio/sfx.js';          // ambient.js also exports SFX, hence the alias
//   const at = sent[c.sentence].start + ...;                         // seconds on the episode timeline, as now
//   const cue = sfxInput(c.type, { at, gain: c.vol ?? 1 });          // c.type is a name from REC, e.g. 'knock-glass'
//   ci.push(...cue.args);                                            // ['-i', '/abs/path/audio/sfx/knock-glass.wav']
//   cf.push(`[${i}]${cue.filter}[s${i}]`);                           // 'volume=1,adelay=12400:all=1'
// A bed under a scene: sfxInput('wind-howl', { at: shot.start, gain: 0.25, loop: true, dur: shot.end - shot.start })
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'sfx');

// length in seconds from the wav header: size of the data chunk over the byte rate
const wavDuration = (file) => {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size, head = Buffer.alloc(Math.min(size, 65536));
    fs.readSync(fd, head, 0, head.length, 0);
    if (head.toString('latin1', 0, 4) !== 'RIFF' || head.toString('latin1', 8, 12) !== 'WAVE') throw new Error(`not a wav file: ${file}`);
    let byteRate = 0;
    for (let p = 12; p + 8 <= head.length;) {
      const id = head.toString('latin1', p, p + 4), len = head.readUInt32LE(p + 4);
      if (id === 'fmt ') byteRate = head.readUInt32LE(p + 16);
      if (id === 'data') {
        if (!byteRate) break;
        return Math.min(len, size - p - 8) / byteRate;
      }
      p += 8 + len + (len & 1);
    }
    throw new Error(`no fmt/data chunk in ${file}`);
  } finally { fs.closeSync(fd); }
};

// name -> { file: absolute path, duration: seconds }, read once when the module loads
export const SFX = Object.fromEntries(fs.readdirSync(DIR).filter((f) => f.endsWith('.wav')).sort().map((f) => {
  const file = path.join(DIR, f);
  return [f.slice(0, -4), { file, duration: wavDuration(file) }];
}));

// What ffmpeg needs to play one recording at `at` seconds with linear gain `gain`:
//   args    input arguments, put them among the other inputs
//   filter  chain for that input inside -filter_complex: `[N:a]${filter}[label]`
//   end     where the sound stops on the timeline
// dur   cut the sound to this many seconds (with a short fade so it does not click)
// loop  repeat the file until `dur` runs out; for the beds, needs dur
// fade  fade-in (looped beds only) and fade-out length in seconds when dur or loop is used
export const sfxInput = (name, { at = 0, gain = 1, dur, loop = false, fade = loop ? 0.5 : 0.05 } = {}) => {
  const s = SFX[name];
  if (!s) throw new Error(`Unknown sfx "${name}". Available: ${Object.keys(SFX).join(', ')}`);
  if (loop && !(dur > 0)) throw new Error(`sfxInput('${name}'): loop needs dur (seconds)`);
  const len = loop ? dur : Math.min(dur ?? s.duration, s.duration), cut = loop || len < s.duration;
  const f = Math.min(fade, len / 2), n = (x) => String(Number(x.toFixed(3)));
  const chain = [
    ...(cut ? [`atrim=duration=${n(len)}`, ...(loop && f > 0 ? [`afade=t=in:d=${n(f)}`] : []), ...(f > 0 ? [`afade=t=out:st=${n(len - f)}:d=${n(f)}`] : [])] : []),
    `volume=${n(gain)}`,
    `adelay=${Math.round(at * 1000)}:all=1`,
  ];
  return { name, file: s.file, duration: len, at, end: at + len, args: [...(loop ? ['-stream_loop', '-1'] : []), '-i', s.file], filter: chain.join(',') };
};
