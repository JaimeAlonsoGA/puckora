#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${FLY_DB_APP_NAME:-puckora-db}"
LOCAL_PORT="${FLY_DB_LOCAL_PORT:-15432}"
REMOTE_PORT="${FLY_DB_REMOTE_PORT:-5432}"

# Kill any existing process holding the local port (stale flyctl proxy / wireguard restart)
if lsof -ti tcp:"${LOCAL_PORT}" &>/dev/null; then
    echo "▶ Releasing port ${LOCAL_PORT} (killing stale proxy)..."
    lsof -ti tcp:"${LOCAL_PORT}" | xargs kill -9 2>/dev/null || true
    sleep 1
fi

exec flyctl proxy "${LOCAL_PORT}:${REMOTE_PORT}" -a "${APP_NAME}"