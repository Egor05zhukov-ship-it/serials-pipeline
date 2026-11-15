#!/usr/bin/env bash
# One-time setup on a fresh Ubuntu machine (cloud VM). Node 20-22 and Chrome must already be there.
set -euo pipefail
command -v ffmpeg >/dev/null || { apt-get update -qq && apt-get install -y -qq ffmpeg; }
npm ci --no-audit --no-fund
echo "chrome: ${CHROME_PATH:-/usr/bin/google-chrome}"; ffmpeg -version | head -1; node -v
