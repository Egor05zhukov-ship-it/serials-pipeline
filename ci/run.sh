#!/usr/bin/env bash
# Entry point of .github/workflows/serials.yml: a GitHub runner (Ubuntu, CPU only). Nothing here needs the Mac.
#   TASK=probe  what the machine is (cores, memory, disk)
#   TASK=build  voice + frames + mp4, then the air plan through Zernio. ARG = episode files (space-separated);
#               empty = every episode with status "written" in state/queue.json. An episode named in ARG that is not
#               "written" is only built (the artifact of the run), its status does not change.
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
  command -v ffmpeg >/dev/null || { sudo apt-get update -qq >/dev/null; sudo apt-get install -y -qq ffmpeg >/dev/null; }
  sudo apt-get install -y -qq libsndfile1 sox >/dev/null 2>&1 || true
  npm ci --no-audit --no-fund --silent
  python -m pip install -q --upgrade pip
  python -m pip install -q torch==2.14.1 torchaudio==2.11.0 --index-url https://download.pytorch.org/whl/cpu
  python -m pip install -q -r ci/requirements.txt
  export QWEN_SIZE="${QWEN_SIZE:-1.7B}" QWEN_MODELS="$HOME/hf/models" QWEN_PYTHON="$(command -v python)" QWEN_DEVICE=cpu CHROME_PATH="$(command -v google-chrome)"
  M="$QWEN_MODELS/Qwen3-TTS-12Hz-$QWEN_SIZE-Base"
  [ -f "$M/model.safetensors" ] || python -c "from huggingface_hub import snapshot_download; snapshot_download('Qwen/Qwen3-TTS-12Hz-$QWEN_SIZE-Base', local_dir='$M')"
  say "machine: $(nproc) cores, $(free -m | awk 'NR==2{print $2}') MB; model $QWEN_SIZE; setup $((SECONDS - T0)) s"
  EPS="${ARG:-}"
  [ -n "$EPS" ] || EPS=$(node -e 'const q=require("./state/queue.json");console.log(q.episodes.filter(e=>e.status==="written").map(e=>`series/${e.series}/ep${String(e.number).padStart(2,"0")}.js`).join(" "))')
  [ -n "$EPS" ] || { say "nothing to build"; exit 0; }
  for ep in $EPS; do
    T1=$SECONDS
    if ! node build.js "$ep" --tts qwen > build.log 2>&1; then tail -30 build.log | tee -a "$REPORT"; say "$ep: BUILD FAILED after $((SECONDS - T1)) s"; continue; fi
    tail -12 build.log | tee -a "$REPORT"
    id="$(basename "$(dirname "$ep")")-$(basename "$ep" .js)"
    dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "out/$id/video.mp4")
    say "$ep: built in $((SECONDS - T1)) s, video ${dur} s, $(du -m "out/$id/video.mp4" | cut -f1) MB"
    ok=$(node -e 'const d=+process.argv[1];console.log(d>=50&&d<=80?1:0)' "$dur")
    node -e '
      const fs=require("fs"),[id,ok]=process.argv.slice(1),f="state/queue.json",q=JSON.parse(fs.readFileSync(f,"utf8"));
      const e=q.episodes.find(x=>x.id===id&&x.status==="written"); if(!e)process.exit(0);
      Object.assign(e, ok==="1" ? {status:"ready",out:"out/"+id,builtAt:new Date(Date.now()+3*3600e3).toISOString().slice(0,16).replace("T"," "),builtOn:"github"} : {status:"failed",failNote:"build check: duration out of 50-80 s"});
      fs.writeFileSync(f,JSON.stringify(q,null,2)+"\n");' "$id" "$ok"
  done
  if [ -n "${ZERNIO_API_KEY:-}" ]; then node publish/schedule.mjs run | tee -a "$REPORT"; else say "no ZERNIO_API_KEY secret: built only, nothing scheduled"; fi
  push_state "cloud build: $EPS"
  ;;
sync)
  [ -n "${ZERNIO_API_KEY:-}" ] || { say "no ZERNIO_API_KEY secret: nothing to sync"; exit 0; }
  node publish/schedule.mjs sync | tee -a "$REPORT"
  push_state "sync: publication statuses from Zernio"
  ;;
*) say "unknown TASK=${TASK}"; exit 1 ;;
esac
