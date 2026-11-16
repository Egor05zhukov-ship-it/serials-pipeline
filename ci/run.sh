#!/usr/bin/env bash
# Entry point of .github/workflows/serials.yml: a GitHub runner (Ubuntu, CPU only). Nothing here needs the Mac.
#   TASK=probe  what the machine is (cores, memory, disk)
#   TASK=build  voice + frames + mp4, then the air plan through Zernio. ARG = episode files (space-separated);
#               empty = every episode with status "written" in state/queue.json. An episode named in ARG that is not
#               "written" is only built (the artifact of the run), its status does not change.
#   TASK=selftest  schedule a test clip a month ahead through Zernio and delete it (checks the secret)
#   TASK=sync   ask Zernio what went out, write it to state/queue.json
# QWEN_SIZE (repository variable): 1.7B (the approved voice model, needs ~11 GB of memory) or 0.6B.
set -euo pipefail
cd "$(dirname "$0")/.."
REPORT=ci-report.txt; : > "$REPORT"
say() { echo "$*" | tee -a "$REPORT"; }

push_state() {
  git config user.name "serials-bot"; git config user.email "serials-bot@users.noreply.github.com"
  git add state
  git diff --cached --quiet && return 0
  git commit -q -m "$1"
  for _ in 1 2 3; do git pull -q --rebase origin main && git push -q origin HEAD:main && return 0; sleep 5; done
  return 1
}

case "${TASK:-sync}" in
probe)
  say "cores: $(nproc)"; say "ram MB: $(free -m | awk 'NR==2{print "total " $2 ", available " $7}')"; say "disk free: $(df -h / | awk 'NR==2{print $4}')"
  say "cpu: $(lscpu | sed -n 's/^Model name: *//p')"; say "avx512_bf16: $(grep -c -m1 avx512_bf16 /proc/cpuinfo || true)"
  say "chrome: $(command -v google-chrome || echo none)"; say "ffmpeg: $(command -v ffmpeg || echo none)"; say "node: $(node -v)"
  ;;
build)
  T0=$SECONDS
  EPS="${ARG:-}"
  [ -n "$EPS" ] || EPS=$(node -e 'const q=require("./state/queue.json");console.log(q.episodes.filter(e=>e.status==="written").map(e=>`series/${e.series}/ep${String(e.number).padStart(2,"0")}.js`).join(" "))')
  [ -n "$EPS" ] || { say "nothing to build"; exit 0; }
  command -v ffmpeg >/dev/null || { sudo apt-get update -qq >/dev/null; sudo apt-get install -y -qq ffmpeg >/dev/null; }
  sudo apt-get install -y -qq libsndfile1 sox >/dev/null 2>&1 || true
  npm ci --no-audit --no-fund --silent
  python -m pip install -q --upgrade pip
  python -m pip install -q torch==2.14.1 torchaudio==2.11.0 --index-url https://download.pytorch.org/whl/cpu
  python -m pip install -q -r ci/requirements.txt
  set -a; . ci/tts.env; set +a  # QWEN_SIZE, QWEN_DTYPE: the voice model settings of the cloud build
  export QWEN_MODELS="$HOME/hf/models" QWEN_PYTHON="$(command -v python)" QWEN_DEVICE=cpu CHROME_PATH="$(command -v google-chrome)"
  M="$QWEN_MODELS/Qwen3-TTS-12Hz-$QWEN_SIZE-Base"
  [ -f "$M/model.safetensors" ] || python -c "from huggingface_hub import snapshot_download; snapshot_download('Qwen/Qwen3-TTS-12Hz-$QWEN_SIZE-Base', local_dir='$M')"
  say "machine: $(nproc) cores, $(free -m | awk 'NR==2{print $2}') MB, $(lscpu | sed -n 's/^Model name: *//p'), bf16 $(grep -c -m1 avx512_bf16 /proc/cpuinfo || true); model $QWEN_SIZE ${QWEN_DTYPE:-fp32}; setup $((SECONDS - T0)) s"
  # one phrase first: a machine too slow or too small for the voice is seen in a minute, not after two hours
  T1=$SECONDS
  /usr/bin/time -v python tts/qwen_synth.py --text "Ядерная тревога. У нас семь минут." --out /tmp/smoke.wav > smoke.log 2>&1 || { tail -25 smoke.log | tee -a "$REPORT"; say "VOICE SMOKE TEST FAILED"; exit 1; }
  say "voice smoke: $(grep -o '{"ok".*' smoke.log | tail -1), wall $((SECONDS - T1)) s, peak $(awk '/Maximum resident/{printf "%.1f GB", $6/1048576}' smoke.log)"
  for ep in $EPS; do
    T1=$SECONDS
    if ! node build.js "$ep" --tts qwen > build.log 2>&1; then tail -30 build.log | tee -a "$REPORT"; say "$ep: BUILD FAILED after $((SECONDS - T1)) s"; continue; fi
    tail -12 build.log | tee -a "$REPORT"
    id="$(basename "$(dirname "$ep")")-$(basename "$ep" .js)"
    # what is written against what is heard, phrase by phrase; a phrase that came out wrong is voiced again, twice at most
    bad=0
    for try in 0 1 2; do
      python tools/phrase_check.py "$ep" > check.log 2>&1 || true
      tail -8 check.log | tee -a "$REPORT"
      idx=$(sed -n 's/^MISMATCH_IDX=//p' check.log)
      grep -q '^MISMATCH_IDX=' check.log || { say "$ep: pronunciation check did not run"; bad=99; break; }
      [ -z "$idx" ] && { bad=0; break; }
      bad=$(echo "$idx" | tr ',' '\n' | wc -l)
      [ "$try" = 2 ] && break
      say "$ep: voicing phrases $idx again"
      QWEN_SEED=$((17 + try * 20)) node build.js "$ep" --tts qwen --redo "$idx" > build.log 2>&1 || { tail -20 build.log | tee -a "$REPORT"; break; }
    done
    dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "out/$id/video.mp4")
    say "$ep: built in $((SECONDS - T1)) s, video ${dur} s, $(du -m "out/$id/video.mp4" | cut -f1) MB"
    ok=$(node -e 'const d=+process.argv[1];console.log(d>=60&&d<=115?1:0)' "$dur")
    why="build check: duration out of 60-115 s"
    if [ "$bad" != 0 ]; then ok=0; why="pronunciation: $(grep -c НАПИСАНО check.log) phrases heard wrong: $(grep НАПИСАНО check.log | sed 's/^[0-9]* НАПИСАНО: //' | tr '\n' '|' | cut -c1-400)"; say "$ep: NOT READY, $why"; fi
    node -e '
      const fs=require("fs"),[id,ok]=process.argv.slice(1),f="state/queue.json",q=JSON.parse(fs.readFileSync(f,"utf8"));
      const e=q.episodes.find(x=>x.id===id&&x.status==="written"); if(!e)process.exit(0);
      Object.assign(e, ok==="1" ? {status:"ready",out:"out/"+id,builtAt:new Date(Date.now()+3*3600e3).toISOString().slice(0,16).replace("T"," "),builtOn:"github"} : {status:"failed",failNote:process.argv[3]});
      fs.writeFileSync(f,JSON.stringify(q,null,2)+"\n");' "$id" "$ok" "$why"
  done
  if [ -n "${ZERNIO_API_KEY:-}" ]; then node publish/schedule.mjs run | tee -a "$REPORT"; else say "no ZERNIO_API_KEY secret: built only, nothing scheduled"; fi
  push_state "cloud build: $EPS"
  ;;
selftest)
  # proves the cloud can reach Zernio with the secret: a 4-second black clip is scheduled a month ahead and deleted at once
  [ -n "${ZERNIO_API_KEY:-}" ] || { say "SELFTEST FAILED: no ZERNIO_API_KEY secret"; exit 1; }
  command -v ffmpeg >/dev/null || { sudo apt-get update -qq >/dev/null; sudo apt-get install -y -qq ffmpeg >/dev/null; }
  mkdir -p /tmp/st && ffmpeg -loglevel error -y -f lavfi -i color=c=black:s=1080x1920:d=4:r=30 -f lavfi -i anullsrc=r=48000:cl=stereo -shortest -pix_fmt yuv420p -c:a aac /tmp/st/video.mp4
  echo "selftest, never published" > /tmp/st/caption.txt
  acc=$(node -e 'console.log(require("./state/zernio.json").accounts["tretye.pravilo"].accountId)')
  at=$(date -u -d "+30 days" +%Y-%m-%dT12:00)
  node publish/zernio.mjs post --account "$acc" --dir /tmp/st --at "$at" --idem "selftest-$GITHUB_RUN_ID" > /tmp/st/post.json || { cat /tmp/st/post.json | tee -a "$REPORT"; say "SELFTEST FAILED: schedule"; exit 1; }
  pid=$(node -e 'const r=require("/tmp/st/post.json");console.log(r.post._id+" "+r.post.status)')
  say "scheduled test post: $pid for $at"
  node publish/zernio.mjs delete "${pid%% *}" | tee -a "$REPORT"
  node publish/zernio.mjs status "${pid%% *}" > /tmp/st/after.json || true
  grep -q '"status": 404' /tmp/st/after.json && say "SELFTEST OK: scheduled and deleted from the cloud" || { say "SELFTEST FAILED: the test post is still there, delete ${pid%% *} by hand"; exit 1; }
  node publish/schedule.mjs sync | tee -a "$REPORT"
  ;;
sync)
  [ -n "${ZERNIO_API_KEY:-}" ] || { say "no ZERNIO_API_KEY secret: nothing to sync"; exit 0; }
  node publish/schedule.mjs sync | tee -a "$REPORT"
  push_state "sync: publication statuses from Zernio"
  ;;
*) say "unknown TASK=${TASK}"; exit 1 ;;
esac
