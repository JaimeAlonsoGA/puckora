#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# resume.sh — Auto-restart wrapper for the Puckora scraper
#
# Phase 1 scrapes categories in batches of MAX_CATS_PER_RUN (default 6 000).
# When a batch finishes it exits with code 42 to signal "restart needed".
# This script loops until it gets exit code 0 (Phase 1 + Phase 2 both done)
# or any other non-42 code (genuine error).
#
# Checkpoint and cache are preserved across restarts — safe to interrupt and
# re-run at any time.
#
# Usage:
#   bash resume.sh          # resume from existing checkpoint
# ---------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")"

echo ""
echo "🔁  Puckora auto-restart scraper"
echo "   Restarts automatically on batch boundary (exit 42)."
echo "   Press Ctrl+C to stop cleanly."
echo ""

RUN=0
while true; do
  RUN=$((RUN + 1))
  echo "━━━  Run #${RUN}  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  set +e
  npm run scrape:amazon:resume
  STATUS=$?
  set -e

  case "$STATUS" in
    0)
      echo ""
      echo "✅  Scrape complete (Phase 1 + Phase 2 finished)."
      break
      ;;
    42)
      echo ""
      echo "↩️   Batch done — restarting in 3 s..."
      sleep 3
      ;;
    *)
      echo ""
      echo "❌  Scraper exited with unexpected code $STATUS — stopping."
      exit "$STATUS"
      ;;
  esac
done
