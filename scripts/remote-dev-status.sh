#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TAILSCALE_HELPER="${ROOT}/scripts/tailscale-local-vectors.sh"

echo "== Local databases =="
pg_isready -h 127.0.0.1 -p 5432 || true
pg_isready -h 127.0.0.1 -p 15432 || true

echo ""
echo "== Tailscale =="
bash "${TAILSCALE_HELPER}" status || true

echo ""
echo "== Vectors =="
npm --prefix "${ROOT}/packages/vectors" run status || true

echo ""
echo "== tmux =="
if command -v tmux >/dev/null 2>&1; then
	tmux list-windows -t puckora-executor || true
else
	echo "tmux not installed"
fi

echo ""
echo "== Live executor processes =="
ps -axo pid=,command= | grep -E 'scrapers/amazon/index.ts|scripts/backfill.ts' | grep -v grep || true

echo ""
echo "== Tracked jobs =="
bash "${ROOT}/scripts/remote-job.sh" status || true