#!/usr/bin/env bash
# Run the scraper in development mode with hot-reload.
# Usage: bash apps/scraper/dev.sh (from repo root OR from apps/scraper/)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VENV_DIR="$SCRIPT_DIR/.venv"

# ── Create virtualenv on first run ────────────────────────────────────
if [ ! -d "$VENV_DIR" ]; then
  echo "→ Creating Python virtualenv..."
  python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"

# ── Install / sync dependencies ───────────────────────────────────────
echo "→ Installing dependencies..."
pip install -q -r requirements.txt

# ── Run with hot-reload ───────────────────────────────────────────────
echo ""
echo "✓ Starting scraper at http://localhost:8000"
echo "  Docs: http://localhost:8000/docs"
echo "  Logs: ctrl+c to stop"
echo ""

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
