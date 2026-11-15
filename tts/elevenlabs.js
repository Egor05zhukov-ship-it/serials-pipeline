// ElevenLabs. Not tested yet: no key was available when this was written.
// ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, ELEVENLABS_MODEL (default eleven_multilingual_v2).
import fs from 'node:fs';
import { toWav, need } from './util.js';

export const name = 'elevenlabs';
export async function synth(text, outWav) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${need('ELEVENLABS_VOICE_ID')}?output_format=mp3_44100_128`;
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': need('ELEVENLABS_API_KEY'), 'content-type': 'application/json' },
    body: JSON.stringify({ text, model_id: process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2', voice_settings: { stability: 0.45, similarity_boost: 0.8 } }),
  });
  if (!r.ok) throw new Error(`ElevenLabs: ${r.status} ${(await r.text()).slice(0, 200)}`);
  const mp3 = outWav + '.mp3';
  fs.writeFileSync(mp3, Buffer.from(await r.arrayBuffer()));
  toWav(mp3, outWav);
  fs.unlinkSync(mp3);
}
