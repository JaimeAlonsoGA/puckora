#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="${ROOT}/runs/remote-jobs"
mkdir -p "${RUN_DIR}"

usage() {
  cat <<EOF
Usage:
  $(basename "$0") start <name> -- <command...>
  $(basename "$0") status [name]
  $(basename "$0") logs <name>
  $(basename "$0") stop <name>

Examples:
  $(basename "$0") start scraper-amazon -- npm --prefix apps/scraper run scrape:amazon:resume
  $(basename "$0") start vectors-backfill -- npm --prefix packages/vectors run backfill
EOF
}

job_pid_file() {
  echo "${RUN_DIR}/$1.pid"
}

job_log_file() {
  echo "${RUN_DIR}/$1.log"
}

job_cmd_file() {
  echo "${RUN_DIR}/$1.command"
}

is_running() {
  local name="$1"
  local pid_file
  pid_file="$(job_pid_file "${name}")"
  [[ -f "${pid_file}" ]] || return 1
  local pid
  pid="$(cat "${pid_file}")"
  kill -0 "${pid}" >/dev/null 2>&1
}

cmd="${1:-status}"

case "${cmd}" in
  start)
    name="${2:-}"
    shift 2 || true
    if [[ -z "${name}" || "${1:-}" != "--" ]]; then
      usage
      exit 1
    fi
    shift
    if [[ $# -eq 0 ]]; then
      usage
      exit 1
    fi
    if is_running "${name}"; then
      echo "Job ${name} is already running (pid $(cat "$(job_pid_file "${name}")"))"
      exit 1
    fi
    log_file="$(job_log_file "${name}")"
    pid_file="$(job_pid_file "${name}")"
    cmd_file="$(job_cmd_file "${name}")"
    printf '%q ' "$@" >"${cmd_file}"
    printf '\n' >>"${cmd_file}"
    nohup "$@" >>"${log_file}" 2>&1 &
    echo $! >"${pid_file}"
    echo "Started ${name} (pid $(cat "${pid_file}"))"
    echo "Log: ${log_file}"
    ;;
  status)
    name="${2:-}"
    if [[ -n "${name}" ]]; then
      if is_running "${name}"; then
        echo "${name}: running (pid $(cat "$(job_pid_file "${name}")"))"
      else
        echo "${name}: stopped"
      fi
      [[ -f "$(job_log_file "${name}")" ]] && echo "log=$(job_log_file "${name}")"
      [[ -f "$(job_cmd_file "${name}")" ]] && echo "cmd=$(cat "$(job_cmd_file "${name}")")"
      exit 0
    fi
    shopt -s nullglob
    pid_files=("${RUN_DIR}"/*.pid)
    if [[ ${#pid_files[@]} -eq 0 ]]; then
      echo "No tracked remote jobs"
      exit 0
    fi
    for file in "${pid_files[@]}"; do
      job_name="$(basename "${file}" .pid)"
      if is_running "${job_name}"; then
        echo "${job_name}: running (pid $(cat "${file}"))"
      else
        echo "${job_name}: stopped"
      fi
      [[ -f "$(job_log_file "${job_name}")" ]] && echo "  log=$(job_log_file "${job_name}")"
    done
    ;;
  logs)
    name="${2:-}"
    if [[ -z "${name}" ]]; then
      usage
      exit 1
    fi
    exec tail -n 80 -f "$(job_log_file "${name}")"
    ;;
  stop)
    name="${2:-}"
    if [[ -z "${name}" ]]; then
      usage
      exit 1
    fi
    if is_running "${name}"; then
      kill "$(cat "$(job_pid_file "${name}")")"
      echo "Stopped ${name}"
    else
      echo "${name} is not running"
    fi
    ;;
  *)
    usage
    exit 1
    ;;
esac