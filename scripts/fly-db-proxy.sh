#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${FLY_DB_APP_NAME:-puckora-db}"
LOCAL_PORT="${FLY_DB_LOCAL_PORT:-15432}"
REMOTE_PORT="${FLY_DB_REMOTE_PORT:-5432}"

exec flyctl proxy "${LOCAL_PORT}:${REMOTE_PORT}" -a "${APP_NAME}"