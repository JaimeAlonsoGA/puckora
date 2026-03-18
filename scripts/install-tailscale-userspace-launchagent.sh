#!/usr/bin/env bash
set -euo pipefail

TAILSCALED_BIN="/opt/homebrew/opt/tailscale/bin/tailscaled"
TAILSCALE_DIR="${HOME}/.tailscale"
SOCKET="${TAILSCALE_SOCKET:-${TAILSCALE_DIR}/tailscaled.socket}"
STATE="${TAILSCALE_STATE:-${TAILSCALE_DIR}/tailscaled.state}"
LOG_FILE="${TAILSCALE_LOG_FILE:-${TAILSCALE_DIR}/tailscaled.log}"
PLIST_PATH="${HOME}/Library/LaunchAgents/com.puckora.tailscaled-userspace.plist"
LABEL="com.puckora.tailscaled-userspace"

mkdir -p "${HOME}/Library/LaunchAgents" "${TAILSCALE_DIR}"

if [[ ! -x "${TAILSCALED_BIN}" ]]; then
  echo "tailscaled not found at ${TAILSCALED_BIN}" >&2
  exit 1
fi

cat >"${PLIST_PATH}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ProgramArguments</key>
  <array>
    <string>${TAILSCALED_BIN}</string>
    <string>--tun=userspace-networking</string>
    <string>--socket=${SOCKET}</string>
    <string>--state=${STATE}</string>
    <string>--statedir=${TAILSCALE_DIR}</string>
  </array>
  <key>StandardOutPath</key>
  <string>${LOG_FILE}</string>
  <key>StandardErrorPath</key>
  <string>${LOG_FILE}</string>
</dict>
</plist>
EOF

brew services stop tailscale >/dev/null 2>&1 || true
pkill -f "tailscaled --tun=userspace-networking --socket=${SOCKET}" >/dev/null 2>&1 || true
launchctl bootout "gui/$(id -u)" "${PLIST_PATH}" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "${PLIST_PATH}"
launchctl enable "gui/$(id -u)/${LABEL}"
launchctl kickstart -k "gui/$(id -u)/${LABEL}"

echo "Installed persistent userspace Tailscale launch agent at ${PLIST_PATH}"
echo "Log file: ${LOG_FILE}"