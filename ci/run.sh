#!/usr/bin/env bash
# Entry point of .github/workflows/pipeline.yml. Two stages on two separate machines:
#   bash ci/run.sh build     runs episode code (voice, frames, mp4). NO secrets and a read-only token here: episode
#                            and kit files come from the writer's branch and are treated as untrusted code.
#   bash ci/run.sh publish   trusted code of main only: merges the writer's branch, takes the built files, puts
#                            episodes on the air plan through Zernio (secret ZERNIO_API_KEY), commits state to main.
# TASK: branch (a push to claude/**, BRANCH is set) | build (episodes of main: ARG or every "written") | selftest | sync | probe
# Voice settings of the cloud: ci/tts.env (QWEN_SIZE, QWEN_DTYPE).
set -euo pipefail
cd "$(dirname "$0")/.."
STAGE="${1:?stage: build or publish}"; TASK="${TASK:-sync}"
REPORT="ci-report-$STAGE.txt"; : > "$REPORT"
say() { echo "$*" | tee -a "$REPORT"; }
EP_RE='^series/[a-z0-9_-]+/ep[0-9]{2}\.js$'
# what a writer's or replier's branch may touch; anything else and the whole branch is refused
ALLOW_RE='^(series/[a-z0-9_-]+/(ep[0-9]{2}\.js|bible\.md|scenes\.js)|series/_ideas\.md|kit/[a-z0-9_-]+\.js|state/comments/outbox\.json)$'
DENY_RE='^kit/(v2|index|captions|trassa)\.js$'
BOT=(-c user.name=serials-bot -c user.email=serials-bot@users.noreply.github.com)

fetch_branch() { # sets CHANGED, or returns 1 with the reason in WHY
  WHY=""; CHANGED=""
  [[ "${BRANCH:-}" =~ ^claude/[A-Za-z0-9._/-]+$ ]] || { WHY="branch name is not claude/*"; return 1; }
  git fetch -q origin "$BRANCH" || { WHY="cannot fetch $BRANCH"; return 1; }
  CHANGED=$(git diff --name-only "HEAD...FETCH_HEAD")
  [ -n "$CHANGED" ] || { WHY="branch has nothing new"; return 1; }
  local bad
  bad="$(echo "$CHANGED" | grep -vE "$ALLOW_RE" || true)$(echo "$CHANGED" | grep -E "$DENY_RE" || true)"
  [ -z "$bad" ] || { WHY="branch touches files outside the writer's area: $(echo $bad | cut -c1-300)"; return 1; }
  if echo "$CHANGED" | grep -q '^state/comments/outbox\.json$' && [ "$(echo "$CHANGED" | wc -l)" -ne 1 ]; then WHY="a reply branch may change only state/comments/outbox.json"; return 1; fi
  return 0
}
merge_branch() { git "${BOT[@]}" merge -q --no-edit FETCH_HEAD || { git merge --abort 2>/dev/null || true; WHY="merge conflict with main"; return 1; }; }
push_main() {
  git add state
  git diff --cached --quiet || git "${BOT[@]}" commit -q -m "$1"
  for _ in 1 2 3; do git "${BOT[@]}" pull -q --rebase origin main && git push -q origin HEAD:main && return 0; sleep 5; done
  return 1
}

# ------------------------------------------------------------------ build: untrusted code, no secrets
if [ "$STAGE" = build ]; then
  echo '[]' > ci-result.json
  if [ "$TASK" = probe ]; then
    say "cores: $(nproc); ram MB: $(free -m | awk 'NR==2{print $2}'); disk free: $(df -h / | awk 'NR==2{print $4}'); cpu: $(lscpu | sed -n 's/^Model name: *//p'); bf16: $(grep -c -m1 avx512_bf16 /proc/cpuinfo || true)"
    exit 0
  fi
  T0=$SECONDS
  if [ "$TASK" = branch ]; then
    fetch_branch || { say "branch refused: $WHY"; exit 0; }
    merge_branch || { say "branch refused: $WHY"; exit 0; }
    EPS=$(echo "$CHANGED" | grep -E "$EP_RE" || true)
  else
    EPS="${ARG:-}"
    [ -n "$EPS" ] || EPS=$(node -e 'const q=require("./state/queue.json");console.log(q.episodes.filter(e=>e.status==="written").map(e=>`series/${e.series}/ep${String(e.number).padStart(2,"0")}.js`).join(" "))')
  fi
  [ -n "$EPS" ] || { say "nothing to build"; exit 0; }
  command -v ffmpeg >/dev/null || { sudo apt-get update -qq >/dev/null; sudo apt-get install -y -qq ffmpeg >/dev/null; }
  sudo apt-get install -y -qq libsndfile1 sox >/dev/null 2>&1 || true
  npm ci --no-audit --no-fund --silent
  python -m pip install -q --upgrade pip
  python -m pip install -q torch==2.14.1 torchaudio==2.11.0 --index-url https://download.pytorch.org/whl/cpu
  python -m pip install -q -r ci/requirements.txt
  set -a; . ci/tts.env; set +a
  export QWEN_MODELS="$HOME/hf/models" QWEN_PYTHON="$(command -v python)" QWEN_DEVICE=cpu CHROME_PATH="$(command -v google-chrome)"
  M="$QWEN_MODELS/Qwen3-TTS-12Hz-$QWEN_SIZE-Base"
  [ -f "$M/model.safetensors" ] || python -c "from huggingface_hub import snapshot_download; snapshot_download('Qwen/Qwen3-TTS-12Hz-$QWEN_SIZE-Base', local_dir='$M')"
  say "machine: $(nproc) cores, $(free -m | awk 'NR==2{print $2}') MB; model $QWEN_SIZE ${QWEN_DTYPE:-fp32}; setup $((SECONDS - T0)) s"
  for ep in $EPS; do
    if ! [[ "$ep" =~ $EP_RE ]] || [ ! -f "$ep" ]; then say "skip $ep"; continue; fi
    T1=$SECONDS; id="$(basename "$(dirname "$ep")")-$(basename "$ep" .js)"; ok=1; why=""; dur=0
    if ! node build.js "$ep" --tts qwen > build.log 2>&1; then
      tail -30 build.log | tee -a "$REPORT"; ok=0; why="build failed: $(grep -m1 -iE 'error' build.log | cut -c1-200)"
    else
      tail -6 build.log | tee -a "$REPORT"
      # what is written against what is heard, phrase by phrase; a phrase that came out wrong is voiced again, twice at most
      bad=0
      for try in 0 1 2; do
        python tools/phrase_check.py "$ep" > check.log 2>&1 || true
        tail -8 check.log | tee -a "$REPORT"
        grep -q '^MISMATCH_IDX=' check.log || { bad=99; break; }
        idx=$(sed -n 's/^MISMATCH_IDX=//p' check.log)
        [ -z "$idx" ] && { bad=0; break; }
        bad=$(echo "$idx" | tr ',' '\n' | wc -l)
        [ "$try" = 2 ] && break
        say "$ep: voicing phrases $idx again"
        QWEN_SEED=$((17 + try * 20)) node build.js "$ep" --tts qwen --redo "$idx" > build.log 2>&1 || { tail -20 build.log | tee -a "$REPORT"; bad=98; break; }
      done
      dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "out/$id/video.mp4" 2>/dev/null || echo 0)
      if [ "$bad" = 99 ] || [ "$bad" = 98 ]; then ok=0; why="pronunciation check did not run"
      elif [ "$bad" != 0 ]; then ok=0; why="pronunciation: these phrases were heard wrong, rewrite them in other words: $(grep 'НАПИСАНО' check.log | sed 's/^[0-9]* НАПИСАНО: //' | tr '\n' '|' | cut -c1-500)"
      elif [ "$(node -e 'const d=+process.argv[1];console.log(d>=55&&d<=115?1:0)' "$dur")" != 1 ]; then ok=0; why="length $dur s is outside 55-115 s"; fi
    fi
    say "$ep: $([ $ok = 1 ] && echo READY || echo "NOT READY ($why)"), $((SECONDS - T1)) s, video $dur s"
    node -e 'const fs=require("fs"),[id,ep,ok,why,dur]=process.argv.slice(1),r=JSON.parse(fs.readFileSync("ci-result.json","utf8"));r.push({id,ep,ok:ok==="1",why,dur:+dur});fs.writeFileSync("ci-result.json",JSON.stringify(r,null,1))' "$id" "$ep" "$ok" "$why" "$dur"
  done
  exit 0
fi

# ------------------------------------------------------------------ publish: trusted code of main, has the secret
[ "$STAGE" = publish ] || { echo "unknown stage $STAGE"; exit 1; }
[ "$TASK" = probe ] && exit 0
[ -n "${ZERNIO_API_KEY:-}" ] || { say "no ZERNIO_API_KEY secret"; exit 1; }

if [ "$TASK" = selftest ]; then
  # proves the cloud reaches Zernio with the secret: a 4-second black clip is scheduled a month ahead and deleted at once
  command -v ffmpeg >/dev/null || { sudo apt-get update -qq >/dev/null; sudo apt-get install -y -qq ffmpeg >/dev/null; }
  mkdir -p /tmp/st && ffmpeg -loglevel error -y -f lavfi -i color=c=black:s=1080x1920:d=4:r=30 -f lavfi -i anullsrc=r=48000:cl=stereo -shortest -pix_fmt yuv420p -c:a aac /tmp/st/video.mp4
  echo "selftest, never published" > /tmp/st/caption.txt
  acc=$(node -e 'console.log(require("./state/zernio.json").accounts["tretye.pravilo"].accountId)')
  at=$(date -u -d "+30 days" +%Y-%m-%dT12:00)
  node publish/zernio.mjs post --account "$acc" --dir /tmp/st --at "$at" --idem "selftest-$GITHUB_RUN_ID" > /tmp/st/post.json || { tee -a "$REPORT" < /tmp/st/post.json; say "SELFTEST FAILED: schedule"; exit 1; }
  pid=$(node -e 'const r=require("/tmp/st/post.json");console.log(r.post._id)')
  say "scheduled a test post $pid for $at"
  node publish/zernio.mjs delete "$pid" | tee -a "$REPORT"
  sleep 6; node publish/zernio.mjs status "$pid" > /tmp/st/after.json || true
  grep -q '"status": 404' /tmp/st/after.json && say "SELFTEST OK: scheduled and deleted from the cloud" || { say "SELFTEST FAILED: the test post is still there, delete $pid by hand"; exit 1; }
  exit 0
fi

MERGED=""
if [ "$TASK" = branch ]; then
  if fetch_branch && merge_branch; then MERGED=1; say "merged $BRANCH: $(echo $CHANGED | cut -c1-300)"
  else say "branch refused: $WHY"; node -e 'require("fs").appendFileSync("state/log.jsonl",JSON.stringify({at:new Date(Date.now()+3*3600e3).toISOString().slice(0,16).replace("T"," "),event:"branch-refused",branch:process.argv[1],why:process.argv[2]})+"\n")' "$BRANCH" "$WHY"; echo '[]' > ci-result.json; fi
fi
node ci/apply-result.mjs | tee -a "$REPORT"
node publish/schedule.mjs run | tee -a "$REPORT" || say "schedule: failed, see above"
node publish/schedule.mjs sync | tee -a "$REPORT" || say "sync: failed, see above"
node publish/comments.mjs fetch | tee -a "$REPORT" || say "comments fetch: failed (does not stop publishing)"
node publish/comments.mjs send | tee -a "$REPORT" || say "comments send: failed (does not stop publishing)"
push_main "pipeline: ${TASK}${BRANCH:+ $BRANCH}" || { say "could not push state to main"; exit 1; }
[ -n "$MERGED" ] && git push -q origin --delete "$BRANCH" 2>/dev/null || true
