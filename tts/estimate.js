// No voice at all: a quiet noise as long as the phrase would take a narrator (about 2.3 words a second).
// For looking at frames where the real voice is not installed (the cloud writer): node build.js <ep> --tts estimate --still shots
// Never use it for a video that goes out.
import { ff } from './util.js';

export const name = 'estimate';
export async function synth(text, outWav) {
  const words = text.split(/\s+/).filter(Boolean).length, stops = (text.match(/[.!?…:]\s/g) || []).length;
  const d = Math.max(0.7, words / 2.3 + 0.35 * stops + 0.2);
  ff(['-f', 'lavfi', '-i', `anoisesrc=d=${d.toFixed(2)}:c=brown:a=0.08`, '-ar', '48000', '-ac', '1', outWav]);
}
