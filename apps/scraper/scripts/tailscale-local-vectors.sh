#!/usr/bin/env bash
set -euo pipefail

TAILSCALE_BIN="/opt/homebrew/opt/tailscale/bin/tailscale"
TAILSCALED_BIN="/opt/homebrew/opt/tailscale/bin/tailscaled"
TAILSCALE_DIR="${HOME}/.tailscale"
SOCKET="${TAILSCALE_SOCKET:-${TAILSCALE_DIR}/tailscaled.socket}"
STATE="${TAILSCALE_STATE:-${TAILSCALE_DIR}/tailscaled.state}"
LOG_FILE="${TAILSCALE_LOG_FILE:-${TAILSCALE_DIR}/tailscaled.log}"
LOCAL_PORT="${LOCAL_VECTOR_LOCAL_PORT:-5432}"
TAILNET_PORT="${LOCAL_VECTOR_TAILNET_PORT:-6543}"

usage() {
  cat <<EOF
Usage:
  $(basename "$0") up
  $(basename "$0") serve
  $(basename "$0") status
  $(basename "$0") ip
  $(basename "$0") stop

Commands:
  up      Start userspace tailscaled if needed, then authenticate/login.
  serve   Publish local Postgres ${LOCAL_PORT} to tailnet port ${TAILNET_PORT}.
  status  Show tailnet status and current serve rules.
  ip      Print the tailnet IPv4 address for this Mac.
  stop    Disable the tailnet TCP forwarder on port ${TAILNET_PORT}.
EOF
}

ensure_daemon() {
  mkdir -p "${TAILSCALE_DIR}"
  if ! "${TAILSCALE_BIN}" --socket="${SOCKET}" status >/dev/null 2>&1; then
    nohup "${TAILSCALED_BIN}" \
      --tun=userspace-networking \
      --socket="${SOCKET}" \
      --state="${STATE}" \
      >"${LOG_FILE}" 2>&1 &
    sleep 2
  fi
}

cmd="${1:-status}"

case "${cmd}" in
  up)
    ensure_daemon
    exec "${TAILSCALE_BIN}" --socket="${SOCKET}" up --accept-dns=false --ssh
    ;;
  serve)
    ensure_daemon
    exec "${TAILSCALE_BIN}" --socket="${SOCKET}" serve --bg --tcp "${TAILNET_PORT}" "127.0.0.1:${LOCAL_PORT}"
    ;;
  status)
    ensure_daemon
    "${TAILSCALE_BIN}" --socket="${SOCKET}" status || true
    echo ""
    exec "${TAILSCALE_BIN}" --socket="${SOCKET}" serve status || true
    ;;
  ip)
    ensure_daemon
    exec "${TAILSCALE_BIN}" --socket="${SOCKET}" ip -4
    ;;
  stop)
    ensure_daemon
    exec "${TAILSCALE_BIN}" --socket="${SOCKET}" serve --tcp="${TAILNET_PORT}" off
    ;;
  *)
    usage
    exit 1
    ;;
esac