// Yandex SpeechKit, REST v1. Not tested yet: no key was available when this was written.
// YANDEX_API_KEY (service account API key), YANDEX_VOICE (filipp, ermil, zahar, madirus, alexander, kirill, anton),
// YANDEX_SPEED (0.1-3, default 1), YANDEX_EMOTION (optional, depends on the voice).
import fs from 'node:fs';
import { ff, need } from './util.js';

export const name = 'yandex';
export async function synth(text, outWav) {
  const body = new URLSearchParams({ text, lang: 'ru-RU', voice: process.env.YANDEX_VOICE || 'filipp', speed: process.env.YANDEX_SPEED || '1.0', format: 'lpcm', sampleRateHertz: '48000' });
  if (process.env.YANDEX_EMOTION) body.set('emotion', process.env.YANDEX_EMOTION);
  const r = await fetch('https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize', { method: 'POST', headers: { Authorization: `Api-Key ${need('YANDEX_API_KEY')}` }, body });
  if (!r.ok) throw new Error(`Yandex SpeechKit: ${r.status} ${(await r.text()).slice(0, 200)}`);
  const pcm = outWav + '.pcm';
  fs.writeFileSync(pcm, Buffer.from(await r.arrayBuffer()));
  ff(['-f', 's16le', '-ar', '48000', '-ac', '1', '-i', pcm, outWav]);
  fs.unlinkSync(pcm);
}
