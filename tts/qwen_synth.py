#!/usr/bin/env python3
"""Qwen3-TTS narrator for tts/qwen.js: local models (Apache-2.0), no network, no keys.

The voice is an original designed one, not a copy of a real person:
  1. once: the VoiceDesign model reads a fixed sentence in the voice described by QWEN_VOICE
     (take QWEN_VOICE_SEED); the clip is kept in tmp/voices/qwen-<hash>.wav and from then on it IS the voice;
  2. every phrase: the Base model continues that clip (the "voice design then clone" recipe of the
     qwen-tts README), so the timbre does not drift from phrase to phrase.
The seed is reset before every phrase: same text + same settings = same audio.

  qwen_synth.py --serve                      one JSON per stdin line {"text", "out"} -> one JSON per stdout line
  qwen_synth.py --text "..." --out x.wav     a single phrase (24 kHz mono wav)
Settings: QWEN_VOICE, QWEN_VOICE_SEED, QWEN_SEED, QWEN_MODELS, QWEN_DEVICE (see tts/qwen.js).
"""
import argparse
import gc
import hashlib
import json
import os
import random
import sys
import time
import traceback

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS = os.environ.get("QWEN_MODELS") or os.path.expanduser("~/.qwen3tts/models")
VOICE = os.environ.get("QWEN_VOICE") or (
    "Male narrator, about 40 years old. Low, deep baritone. Calm, restrained first-person storytelling with a slight unease, "
    "quiet and close to the microphone. Steady, fairly brisk pace, short sentences delivered matter-of-factly, crisp diction."
)
VOICE_SEED = int(os.environ.get("QWEN_VOICE_SEED") or 23)  # which take of the description becomes the voice
SEED = int(os.environ.get("QWEN_SEED") or 7)  # sampling seed of the phrases
REF_TEXT = "Той ночью я остался в пункте выдачи один. Свет мигнул, и за стеклом кто-то тихо постучал."
LANG = "Russian"
LEVEL_DB, PEAK_DB = -20.0, -1.0  # every phrase leaves at the same speech level
FRAMES_PER_S = 12.5  # the 12 Hz speech tokenizer


class Fail(Exception):
    """An error the user can fix; its text goes to the build log as is."""


def model_dir(kind):
    d = os.path.join(MODELS, f"Qwen3-TTS-12Hz-1.7B-{kind}")
    if not os.path.isfile(os.path.join(d, "model.safetensors")):
        raise Fail(f"нет модели {d} (папка с моделями задаётся в QWEN_MODELS)")
    return d


def load(kind):
    import torch
    from qwen_tts import Qwen3TTSModel

    path = model_dir(kind)
    dev = os.environ.get("QWEN_DEVICE") or ("cuda:0" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu")
    dtype = torch.bfloat16 if dev.startswith("cuda") else torch.float16 if dev.startswith("mps") else torch.float32
    return Qwen3TTSModel.from_pretrained(path, device_map=dev, dtype=dtype)


def reseed(seed):
    import numpy as np
    import torch

    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)


def frames_cap(text):
    """Several times the usual length of such a text: stops a generation that never ends."""
    return int(FRAMES_PER_S * (4 + len(text) / 4))


def reference():
    """The clip that defines the voice. Made once from the description, then reused."""
    import soundfile as sf
    import torch

    key = hashlib.sha1("\n".join([VOICE, str(VOICE_SEED), REF_TEXT]).encode()).hexdigest()[:12]
    kept = os.path.join(ROOT, "tts", "voices", f"qwen-{key}.wav")  # the narrator's clip, kept in git
    if os.path.exists(kept):
        return kept
    path = os.path.join(ROOT, "tmp", "voices", f"qwen-{key}.wav")
    if not os.path.exists(path):
        model = load("VoiceDesign")
        cap = frames_cap(REF_TEXT)
        reseed(VOICE_SEED)
        wavs, sr = model.generate_voice_design(text=REF_TEXT, instruct=VOICE, language=LANG, max_new_tokens=cap)
        if len(wavs[0]) / sr > cap / FRAMES_PER_S - 0.5:
            raise Fail("не получилась опорная запись голоса: поменяйте QWEN_VOICE_SEED или описание QWEN_VOICE")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        part = f"{path}.{os.getpid()}.part.wav"
        sf.write(part, wavs[0], sr, subtype="PCM_16")
        os.replace(part, path)
        del model
        gc.collect()
        if torch.backends.mps.is_available():
            torch.mps.empty_cache()
    return path


def boot():
    try:
        import numpy  # noqa: F401
        import qwen_tts  # noqa: F401
    except ImportError as e:
        raise Fail(f"в окружении {sys.executable} нет пакета qwen-tts ({e})")
    model_dir("Base")  # fail early, before the voice is designed
    ref = reference()
    model = load("Base")
    return model, model.create_voice_clone_prompt(ref_audio=ref, ref_text=REF_TEXT)


def level(wav, sr):
    import numpy as np

    n = int(0.02 * sr)
    rms = np.sqrt((wav[: len(wav) // n * n].reshape(-1, n) ** 2).mean(1))
    loud = rms[rms > 10 ** (-45 / 20)]
    if not len(loud):
        return wav
    gain = 10 ** (LEVEL_DB / 20) / np.sqrt((loud ** 2).mean())
    return wav * min(gain, 10 ** (PEAK_DB / 20) / np.abs(wav).max())


def speak(state, text, out):
    import numpy as np
    import soundfile as sf

    model, prompt = state
    cap = frames_cap(text)
    for attempt in range(3):  # a take that runs into the cap is thrown away; the next seed is just as repeatable
        reseed(SEED + attempt)
        wavs, sr = model.generate_voice_clone(text=text, language=LANG, voice_clone_prompt=prompt, max_new_tokens=cap)
        wav = np.asarray(wavs[0], dtype=np.float32)
        if len(wav) / sr < cap / FRAMES_PER_S - 0.5:
            break
    else:
        raise Fail(f"модель не смогла закончить фразу «{text[:60]}»: поменяйте QWEN_SEED или разбейте фразу")
    sf.write(out, level(wav, sr), sr, subtype="PCM_16")
    return len(wav) / sr


def answer(state, req):
    try:
        text = " ".join(str(req["text"]).split())
        if not text:
            raise Fail("пустая фраза")
        state = state or boot()
        t0 = time.perf_counter()
        return state, {"ok": True, "audio_s": round(speak(state, text, req["out"]), 2), "took_s": round(time.perf_counter() - t0, 2)}
    except Fail as e:
        return state, {"ok": False, "error": str(e)}
    except Exception as e:  # noqa: BLE001
        traceback.print_exc(file=sys.stderr)
        return state, {"ok": False, "error": f"{type(e).__name__}: {e}"}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--serve", action="store_true")
    ap.add_argument("--text")
    ap.add_argument("--out")
    a = ap.parse_args()
    if not a.serve and not (a.text and a.out):
        ap.error("--text and --out, or --serve")
    os.environ.setdefault("HF_HUB_OFFLINE", "1")  # local folders only, nothing is fetched
    os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
    replies = os.fdopen(os.dup(1), "w", encoding="utf-8")
    os.dup2(2, 1)  # whatever the libraries print goes to stderr and cannot break the protocol
    if not a.serve:
        _, r = answer(None, {"text": a.text, "out": a.out})
        replies.write(json.dumps(r, ensure_ascii=False) + "\n")
        replies.flush()
        sys.exit(0 if r["ok"] else 1)
    state = None
    for line in sys.stdin:
        if not line.strip():
            continue
        try:
            req = json.loads(line)
        except ValueError as e:
            r = {"ok": False, "error": f"bad request: {e}"}
        else:
            state, r = answer(state, req)
        replies.write(json.dumps(r, ensure_ascii=False) + "\n")
        replies.flush()


if __name__ == "__main__":
    main()
