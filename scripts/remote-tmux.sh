#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SESSION="${PUCKORA_TMUX_SESSION:-puckora-executor}"

ensure_session() {
  if tmux has-session -t "${SESSION}" 2>/dev/null; then
    return
  fi

  tmux new-session -d -s "${SESSION}" -n status "cd '${ROOT}' && exec zsh"
  tmux new-window -t "${SESSION}" -n scraper "cd '${ROOT}' && exec zsh"
  tmux new-window -t "${SESSION}" -n vectors "cd '${ROOT}' && exec zsh"
  tmux new-window -t "${SESSION}" -n jobs "cd '${ROOT}' && exec zsh"
}

usage() {
  cat <<EOF
Usage:
  $(basename "$0") up
  $(basename "$0") attach
  $(basename "$0") status
  $(basename "$0") run-scraper
  $(basename "$0") run-vectors-backfill
  $(basename "$0") run-remote-status

Session: ${SESSION}
EOF
}

cmd="${1:-status}"

case "${cmd}" in
  up)
    ensure_session
    echo "Created tmux session ${SESSION}"
    echo "Attach with: tmux attach -t ${SESSION}"
    ;;
  attach)
    ensure_session
    exec tmux attach -t "${SESSION}"
    ;;
  status)
    ensure_session
    exec tmux list-windows -t "${SESSION}"
    ;;
  run-scraper)
    ensure_session
    tmux send-keys -t "${SESSION}:scraper" C-c
    tmux send-keys -t "${SESSION}:scraper" "cd '${ROOT}' && npm --prefix apps/scraper run scrape:amazon:resume" C-m
    echo "Started scraper in tmux window ${SESSION}:scraper"
    ;;
  run-vectors-backfill)
    ensure_session
    tmux send-keys -t "${SESSION}:vectors" C-c
    tmux send-keys -t "${SESSION}:vectors" "cd '${ROOT}' && npm --prefix packages/vectors run backfill" C-m
    echo "Started vectors backfill in tmux window ${SESSION}:vectors"
    ;;
  run-remote-status)
    ensure_session
    tmux send-keys -t "${SESSION}:status" C-c
    tmux send-keys -t "${SESSION}:status" "cd '${ROOT}' && clear && npm run remote:status" C-m
    echo "Ran remote status in tmux window ${SESSION}:status"
    ;;
  *)
    usage
    exit 1
    ;;
esac