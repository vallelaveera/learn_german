#!/bin/bash
set -euo pipefail
mkdir -p public/illustrations

download() {
  local file="$1"
  local url="$2"
  if curl -fsSL -o "public/illustrations/${file}" "${url}"; then
    echo "Downloaded ${file}"
  else
    echo "Failed ${file} — keep existing placeholder if present"
  fi
}

download conversation.svg \
  "https://undraw.co/api/illustrations/undraw_conversation_re_c26v.svg"
download learning.svg \
  "https://undraw.co/api/illustrations/undraw_online_learning_re_qw08.svg"
download progress.svg \
  "https://undraw.co/api/illustrations/undraw_progress_re_ivil.svg"
download welcome.svg \
  "https://undraw.co/api/illustrations/undraw_welcome_re_h3d9.svg"
download success.svg \
  "https://undraw.co/api/illustrations/undraw_celebration_re_kc9k.svg"

echo "Done. Replace placeholders manually if any download failed."
