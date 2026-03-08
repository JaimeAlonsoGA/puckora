// Minimal structured logger — no deps, just clean terminal output

import fs from 'fs'
import path from 'path'

// ─── FILE SINK (test mode only) ──────────────────────────────────────────────

const IS_TEST = process.argv.includes('--test')
const IS_UPLOAD_TEST = process.argv.includes('--upload-test')

const LOG_FILE = IS_UPLOAD_TEST
  ? path.resolve(__dirname, 'upload-test.log')
  : path.resolve(__dirname, 'test-run.log')

let _fileStream: fs.WriteStream | null = null

if (IS_TEST || IS_UPLOAD_TEST) {
  _fileStream = fs.createWriteStream(LOG_FILE, { flags: 'w' })
  console.log(`\x1b[2mLog → ${LOG_FILE}\x1b[0m`)
  process.on('exit', () => _fileStream?.end())
  process.on('SIGINT', () => { _fileStream?.end(); process.exit(130) })
}

/** Strip ANSI escape codes and write a line to the log file. */
function fileWrite(line: string): void {
  if (!_fileStream) return
  // eslint-disable-next-line no-control-regex
  const plain = line.replace(/\x1b\[[0-9;]*m/g, '')
  _fileStream.write(plain + '\n')
}

const C = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
}

function ts(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

function emit(line: string): void {
  console.log(line)
  fileWrite(line)
}

export const log = {
  info: (msg: string) => emit(`${C.gray}${ts()}${C.reset} ${C.cyan}ℹ${C.reset}  ${msg}`),
  success: (msg: string) => emit(`${C.gray}${ts()}${C.reset} ${C.green}✓${C.reset}  ${msg}`),
  warn: (msg: string) => emit(`${C.gray}${ts()}${C.reset} ${C.yellow}⚠${C.reset}  ${msg}`),
  error: (msg: string) => emit(`${C.gray}${ts()}${C.reset} ${C.red}✗${C.reset}  ${msg}`),
  blocked: (msg: string) => emit(`${C.gray}${ts()}${C.reset} ${C.red}🚫${C.reset} ${msg}`),
  api: (msg: string) => emit(`${C.gray}${ts()}${C.reset} ${C.blue}⬡${C.reset}  ${msg}`),
  dim: (msg: string) => emit(`${C.gray}${ts()} ${msg}${C.reset}`),

  section: (title: string) => {
    emit(`\n${C.bold}${C.white}${'─'.repeat(60)}${C.reset}`)
    emit(`${C.bold}${C.white}  ${title}${C.reset}`)
    emit(`${C.bold}${C.white}${'─'.repeat(60)}${C.reset}\n`)
  },

  product: (label: string, data: Record<string, unknown>) => {
    emit(`\n  ${C.bold}${C.magenta}▸ ${label}${C.reset}`)
    for (const [k, v] of Object.entries(data)) {
      if (v === null || v === undefined) {
        emit(`    ${C.gray}${k.padEnd(22)} null${C.reset}`)
      } else if (Array.isArray(v)) {
        emit(`    ${C.cyan}${k.padEnd(22)}${C.reset} [${(v as unknown[]).length} items]`)
          ; (v as unknown[]).slice(0, 2).forEach(item =>
            emit(`    ${C.gray}${''.padEnd(22)}  • ${String(item).slice(0, 80)}${C.reset}`)
          )
      } else {
        const str = String(v)
        const display = str.length > 90 ? str.slice(0, 87) + '...' : str
        emit(`    ${C.cyan}${k.padEnd(22)}${C.reset} ${display}`)
      }
    }
  },

  edge: (asin: string, categoryId: string, rank: number, type: string) => {
    emit(`    ${C.gray}→${C.reset} ${C.yellow}${asin}${C.reset} in ${C.cyan}${categoryId}${C.reset} rank ${C.bold}#${rank}${C.reset} ${C.dim}(${type})${C.reset}`)
  },

  /** Write a plain line to both stdout and the log file (no timestamp/prefix). */
  raw: (line: string) => emit(line),

  progress: (done: number, total: number, ok: number, fail: number, etaStr: string) => {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0
    const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5))
    const line = `[${bar}] ${String(pct).padStart(3)}%  ✓${done} ✗${fail}  ETA ${etaStr}`
    process.stdout.write(
      `\r${C.gray}[${bar}] ${String(pct).padStart(3)}%${C.reset}  ` +
      `${C.green}✓${done}${C.reset} ${C.red}✗${fail}${C.reset}  ETA ${etaStr}   `
    )
    fileWrite(line)
  },
}
