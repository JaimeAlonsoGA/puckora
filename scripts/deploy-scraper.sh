#!/usr/bin/env bash
# scripts/deploy-scraper.sh
# Deploy the Python scraper service to Fly.io.
# Usage: bash scripts/deploy-scraper.sh

set -euo pipefail

SCRAPER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/apps/scraper"

echo "→ Building + deploying scraper to Fly.io..."
cd "$SCRAPER_DIR"
flyctl deploy --remote-only

echo ""
echo "✅ Scraper deployed."
echo "   URL: https://$(flyctl status --json | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["Hostname"])')"
