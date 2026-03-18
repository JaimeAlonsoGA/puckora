#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TAILSCALE_HELPER="${ROOT}/scripts/tailscale-local-vectors.sh"
REMOTE_JOB_SCRIPT="${ROOT}/scripts/remote-job.sh"

ensure_port() {
  local host="$1"
  local port="$2"
  pg_isready -h "${host}" -p "${port}" >/dev/null 2>&1
}

echo "[remote-dev] installing persistent userspace Tailscale launch agent"
bash "${ROOT}/scripts/install-tailscale-userspace-launchagent.sh"

echo "[remote-dev] ensuring local vector Postgres is running"
if ! ensure_port 127.0.0.1 5432; then
  brew services start postgresql@17 >/dev/null
  sleep 2
fi
pg_isready -h 127.0.0.1 -p 5432

echo "[remote-dev] ensuring Fly proxy is running"
if ! ensure_port 127.0.0.1 15432; then
  bash "${REMOTE_JOB_SCRIPT}" start fly-db-proxy -- npm run db:proxy
  sleep 3
fi
pg_isready -h 127.0.0.1 -p 15432

echo "[remote-dev] ensuring tailnet access and TCP forward"
bash "${TAILSCALE_HELPER}" up >/dev/null
bash "${TAILSCALE_HELPER}" serve >/dev/null

TAILNET_IP="$(bash "${TAILSCALE_HELPER}" ip)"
echo "[remote-dev] vector endpoint: postgresql://${TAILNET_IP}:6543/puckora_vectors"
echo "[remote-dev] use 'npm run remote:status' to inspect services and tracked jobs"
echo "[remote-dev] use 'npm run remote:job -- start <name> -- <command...>' to launch scraper/vector jobs with logs"
echo "[remote-dev] note: do not run a separate vectors:watch while vectors:backfill is active; backfill already switches to watch when backlog is done"