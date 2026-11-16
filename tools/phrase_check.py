#!/usr/bin/env python3
"""Проверка произношения по фразам: что написано в серии и что реально слышно в озвучке.

Запускать после сборки серии (нужны tmp/<серия>-epNN/voice.wav и timeline.json):

  ../инструменты/.venv/bin/python tools/phrase_check.py series/trassa/ep01.js

Каждая фраза вырезается из чистой дорожки голоса и распознаётся отдельно. Числа не сравниваются
(диктор говорит «тридцать восемь», распознаватель пишет «38»). Выход с кодом 1, если есть расхождения.
Расхождение чаще всего значит неверное ударение или невнятное слово. Лечится перефразированием
(надёжнее) или полем `say:` с ударной гласной под акутом.
"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NUM = set(
    "ноль один одна одно одну два две три четыре пять шесть семь восемь девять десять одиннадцать двенадцать "
    "тринадцать четырнадцать пятнадцать шестнадцать семнадцать восемнадцать девятнадцать двадцать тридцать сорок "
    "пятьдесят шестьдесят семьдесят восемьдесят девяносто сто двести триста четыреста пятьсот тысяча тысячи тысяч "
    "первое второе третье четвёртое первая вторая третья первый второй третий".replace("ё", "е").split()
)


def norm(s):
    s = re.sub(r"[*|—–-]", " ", s).lower().replace("ё", "е")
    s = re.sub(r"[̀́]", "", s)  # знаки ударения
    s = s.replace("á", "а").replace("é", "е").replace("ó", "о").replace("ý", "у")
    words = re.sub(r"[^а-яa-z0-9 ]", " ", s).split()
    return [w for w in words if w not in NUM and not any(c.isdigit() for c in w)]


def main():
    ep = sys.argv[1]
    m = re.search(r"series/([^/]+)/ep(\d+)\.js$", ep)
    name = f"{m.group(1)}-ep{m.group(2)}"
    work = os.path.join(ROOT, "tmp", name)
    timeline = json.load(open(os.path.join(work, "timeline.json")))["sent"]
    js = (
        "import(process.argv[1]).then(m=>{const e=m.default;"
        "console.log(JSON.stringify(e.narration.map(x=>typeof x==='string'?x:x.text)))})"
    )
    texts = json.loads(subprocess.run(["node", "-e", js, os.path.join(ROOT, ep)], capture_output=True, text=True, check=True).stdout)
    if len(texts) != len(timeline):
        print(f"фраз в серии {len(texts)}, в сборке {len(timeline)}: серию нужно пересобрать")
        return 2
    # the Mac has mlx-whisper; a Linux runner (GitHub) has faster-whisper on the CPU. There the big model takes about
    # 15 s a phrase, so a small one listens first and the big one is asked only where the small one disagrees.
    hear2 = None
    try:
        import mlx_whisper

        def hear(wav):
            return mlx_whisper.transcribe(wav, path_or_hf_repo="mlx-community/whisper-large-v3-turbo", language="ru")["text"].strip()
    except ImportError:
        import soundfile as sf
        from faster_whisper import WhisperModel

        models = {}

        def listen(name, wav):
            if name not in models:
                models[name] = WhisperModel(name, device="cpu", compute_type="int8")
            mono = wav + ".16k.wav"  # samples are read here and handed over as an array: the library's own file reader broke on the runner
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-ar", "16000", "-ac", "1", mono], check=True)
            audio, _ = sf.read(mono, dtype="float32")
            return " ".join(seg.text for seg in models[name].transcribe(audio, language="ru", beam_size=5)[0]).strip()

        def hear(wav):
            return listen(os.environ.get("WHISPER_FAST", "small"), wav)

        def hear2(wav):
            return listen(os.environ.get("WHISPER_MODEL", "large-v3-turbo"), wav)

    only = None
    if "--only" in sys.argv:  # after some phrases were voiced again, only they are listened to
        only = {int(x) for x in sys.argv[sys.argv.index("--only") + 1].split(",") if x.strip()}
    out_dir = os.path.join(work, "phrases")
    os.makedirs(out_dir, exist_ok=True)
    bad = 0
    idx = []
    for i, (u, text) in enumerate(zip(timeline, texts)):
        if only is not None and i not in only:
            continue
        wav = os.path.join(out_dir, f"p{i:02d}.wav")
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-i", os.path.join(work, "voice.wav"), "-ss", str(max(0, u["start"] - 0.05)), "-to", str(u["end"] + 0.15), wav],
            check=True,
        )
        heard = hear(wav)
        if norm(text) != norm(heard) and hear2:
            heard = hear2(wav)
        if norm(text) != norm(heard):
            bad += 1
            idx.append(i)
            print(f"{i:02d} НАПИСАНО: {re.sub(r'[*|]', '', text)}\n   СЛЫШНО:   {heard}")
    print(f"{name}: фраз {len(texts)}, расхождений {bad}")
    print("MISMATCH_IDX=" + ",".join(map(str, idx)))  # for ci/run.sh: these phrases are voiced again with another seed
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
