/**
 * Puckora — structured terminal logger
 *
 * Design principles:
 *  - One meaningful line per event (no noise)
 *  - Critical data always visible (ASIN, price, fees, rank)
 *  - Color for signal, not decoration
 *  - Progress bar rewritten in-place (no scroll spam)
 */

import fs from 'fs'
import path from 'path'

// ─── FILE SINK (test / upload-test modes) ────────────────────────────────────

const IS_TEST = process.argv.includes('--test')
const IS_UPLOAD_TEST = process.argv.includes('--upload-test')

const LOG_FILE = IS_UPLOAD_TEST
  ? path.resolve(process.cwd(), 'upload-test.log')
  : path.resolve(process.cwd(), 'test-run.log')

let _fileStream: fs.WriteStream | null = null

if (IS_TEST || IS_UPLOAD_TEST) {
  _fileStream = fs.createWriteStream(LOG_FILE, { flags: 'w' })
  process.on('exit', () => _fileStream?.end())
  process.on('SIGINT', () => { _fileStream?.end(); process.exit(130) })
}

function fileWrite(line: string): void {
  if (!_fileStream) return
  // eslint-disable-next-line no-control-regex
  _fileStream.write(line.replace(/\x1b\[[0-9;]*m/g, '') + '\n')
}

// ─── COLOR PALETTE ───────────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function ts(): string {
  return C.gray + new Date().toISOString().replace('T', ' ').slice(0, 19) + C.reset
}

function trunc(s: string | null | undefined, max: number): string {
  if (!s) return C.gray + 'n/a' + C.reset
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

function emit(line: string): void {
  console.log(line)
  fileWrite(line)
}

// ─── PROGRESS BAR STATE ──────────────────────────────────────────────────────

/** Number of lines currently held by the in-place panel (0 = none). */
let _progressLines = 0

/**
 * Clear all in-place panel lines before printing a normal log line.
 * Walks up from the bottom line, clearing each one.
 */
function clearProgress(): void {
  if (_progressLines === 0) return
  process.stdout.write('\r\x1b[2K')
  for (let i = 1; i < _progressLines; i++) {
    process.stdout.write('\x1b[1A\r\x1b[2K')
  }
  _progressLines = 0
}

// ─── PUBLIC API ──────────────────────────────────────────────────────────────

export const log = {

  // ── Standard levels ────────────────────────────────────────────────────────

  info: (msg: string) => {
    clearProgress()
    emit(`${ts()} ${C.cyan}ℹ${C.reset}  ${msg}`)
  },

  success: (msg: string) => {
    clearProgress()
    emit(`${ts()} ${C.green}✓${C.reset}  ${msg}`)
  },

  warn: (msg: string) => {
    clearProgress()
    emit(`${ts()} ${C.yellow}⚠${C.reset}  ${msg}`)
  },

  error: (msg: string) => {
    clearProgress()
    emit(`${ts()} ${C.red}✗${C.reset}  ${msg}`)
  },

  blocked: (msg: string) => {
    clearProgress()
    emit(`${ts()} ${C.red}🚫${C.reset} ${msg}`)
  },

  api: (msg: string) => {
    clearProgress()
    emit(`${ts()} ${C.blue}⬡${C.reset}  ${msg}`)
  },

  /** Plain line — no timestamp or prefix. */
  raw: (line: string) => {
    clearProgress()
    emit(line)
  },

  // ── Section header ─────────────────────────────────────────────────────────

  section: (title: string, badge?: string) => {
    clearProgress()
    const badgeStr = badge ? ` ${C.yellow}[${badge}]${C.reset}` : ''
    emit('')
    emit(`${C.bold}${C.white}${'─'.repeat(60)}${C.reset}`)
    emit(`${C.bold}${C.white}  ${title}${C.reset}${badgeStr}`)
    emit(`${C.bold}${C.white}${'─'.repeat(60)}${C.reset}`)
    emit('')
  },

  // ── Progress bar (in-place, no newline) ────────────────────────────────────

  /**
   * Renders an in-place progress bar. Normal log methods call clearProgress()
   * automatically so the bar is replaced by the log line cleanly.
   *
   * @param done    Items completed so far
   * @param total   Total items
   * @param ok      Successful items
   * @param fail    Failed items
   * @param etaStr  Formatted ETA, e.g. "1h 23m"
   * @param label   Current item name (category / ASIN), truncated to fit
   */
  progress: (done: number, total: number, ok: number, fail: number, etaStr: string, label = '') => {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0
    const filled = Math.floor(pct / 5)
    const bar = C.green + '█'.repeat(filled) + C.reset + C.gray + '░'.repeat(20 - filled) + C.reset
    const pctStr = String(pct).padStart(3) + '%'
    const stats = `${C.green}✓${ok}${C.reset} ${C.red}✗${fail}${C.reset}`
    const lbl = label ? `  ${C.dim}${trunc(label, 35)}${C.reset}` : ''

    process.stdout.write(
      `\r[${bar}] ${C.bold}${pctStr}${C.reset}  ${stats}  ${C.gray}ETA ${etaStr}${C.reset}${lbl}   `
    )
    fileWrite(`[${pctStr}] ✓${ok} ✗${fail}  ETA ${etaStr}${label ? '  ' + label : ''}`)
    _progressLines = 1
  },

  // ── Phase 1 panel ──────────────────────────────────────────────────────────

  /**
   * Two-line in-place stats panel for Phase 1 (scraping).
   *  Line 1: progress bar + ETA + current category name
   *  Line 2: ✓ scraped  ⊘ empty  ✗ failed  ⬜ remaining  〜 median products/cat
   */
  scrapePanel: (opts: {
    done: number
    total: number
    ok: number
    empty: number
    fail: number
    etaStr: string
    medianProducts: number | null
    label?: string
  }) => {
    const pct = opts.total > 0 ? Math.round((opts.done / opts.total) * 100) : 0
    const filled = Math.floor(pct / 5)
    const bar = C.green + '█'.repeat(filled) + C.reset + C.gray + '░'.repeat(20 - filled) + C.reset
    const pctStr = String(pct).padStart(3) + '%'
    const remaining = opts.total - opts.done
    const medStr = opts.medianProducts !== null
      ? `  ${C.dim}〜${opts.medianProducts} products/cat${C.reset}`
      : ''

    const line1 = (
      `\r[${bar}] ${C.bold}${pctStr}${C.reset}` +
      `  ${C.gray}ETA ${opts.etaStr}${C.reset}` +
      (opts.label ? `  ${C.dim}▸ ${trunc(opts.label, 40)}${C.reset}` : '') +
      '   '
    )
    const line2 = (
      `\r${C.green}✓ ${opts.ok}${C.reset}` +
      `  ${C.yellow}⊘ ${opts.empty}${C.reset}` +
      `  ${C.red}✗ ${opts.fail}${C.reset}` +
      `  ${C.gray}⬜ ${remaining} remaining${C.reset}` +
      medStr +
      '   '
    )
    process.stdout.write(line1 + '\n' + line2)
    fileWrite(`[${pctStr}] ✓${opts.ok} ⊘${opts.empty} ✗${opts.fail} ⬜${remaining}${opts.medianProducts !== null ? ` ~${opts.medianProducts}p/cat` : ''}  ETA ${opts.etaStr}${opts.label ? '  ' + opts.label : ''}`)
    _progressLines = 2
  },

  // ── Phase 2 panel ──────────────────────────────────────────────────────────

  /**
   * Two-line in-place stats panel for Phase 2 (SP-API enrichment).
   *  Line 1: progress bar + ETA + current ASIN
   *  Line 2: ✓ enriched  ✗ failed  ⬜ remaining
   */
  enrichPanel: (opts: {
    done: number
    total: number
    ok: number
    fail: number
    etaStr: string
    label?: string
  }) => {
    const pct = opts.total > 0 ? Math.round((opts.done / opts.total) * 100) : 0
    const filled = Math.floor(pct / 5)
    const bar = C.green + '█'.repeat(filled) + C.reset + C.gray + '░'.repeat(20 - filled) + C.reset
    const pctStr = String(pct).padStart(3) + '%'
    const remaining = opts.total - opts.done

    const line1 = (
      `\r[${bar}] ${C.bold}${pctStr}${C.reset}` +
      `  ${C.gray}ETA ${opts.etaStr}${C.reset}` +
      (opts.label ? `  ${C.dim}▸ ${trunc(opts.label, 40)}${C.reset}` : '') +
      '   '
    )
    const line2 = (
      `\r${C.green}✓ ${opts.ok} enriched${C.reset}` +
      `  ${C.red}✗ ${opts.fail} failed${C.reset}` +
      `  ${C.gray}⬜ ${remaining} remaining${C.reset}` +
      '   '
    )
    process.stdout.write(line1 + '\n' + line2)
    fileWrite(`[${pctStr}] ✓${opts.ok} ✗${opts.fail} ⬜${remaining}  ETA ${opts.etaStr}${opts.label ? '  ' + opts.label : ''}`)
    _progressLines = 2
  },

  // ── Scraper events ─────────────────────────────────────────────────────────

  /**
   * One-liner per successfully scraped category.
   * Example:
   *   ✓  Electronics › Headphones  [404809011]  48 products
   */
  scrape: (categoryId: string, name: string, fullPath: string, count: number, totalBadges?: number) => {
    clearProgress()
    const label = trunc(fullPath || name, 45)
    // Show "count/totalBadges" when we know how many ranked items Amazon has on the page.
    // e.g. "92/100 products" means 92 parsed out of 100 real ranked items.
    // "38 products" means Amazon listed exactly 38 ranked items (no parse failures).
    const countStr = totalBadges && totalBadges > count
      ? `${C.cyan}${count}${C.reset}${C.gray}/${totalBadges}${C.reset}`
      : `${C.cyan}${count}${C.reset}`
    emit(
      `${ts()} ${C.green}✓${C.reset}  ${C.white}${label}${C.reset}  ` +
      `${C.gray}[${categoryId}]${C.reset}  ${countStr} products`
    )
  },

  // ── Enrichment card (test / upload-test modes) ─────────────────────────────

  /**
   * Compact card — critical data only, scannable at a glance.
   *
   * Example:
   *   ┌─ B09B8V1LZ3  #3 in 404809011
   *   │  Sony WH-1000XM5 Wireless Noise Cancelling Headphones
   *   │  $279.99  ★4.4 (28.4k)  FBA $12.60  Ref $39.90  ✓ enriched
   *   │  25×20×8 cm  0.25 kg
   *   └─ Brand: Sony  │  Type: HEADPHONES  │  5 organic ranks
   */
  enrichCard: (
    asin: string,
    bsRank: number,
    categoryId: string,
    title: string | null,
    brand: string | null,
    price: number | null,
    rating: number | null,
    reviewCount: number | null,
    fbaFee: number | null,
    referralFee: number | null,
    productType: string | null,
    itemDims: { l: number | null; w: number | null; h: number | null; wt: number | null },
    status: string,
    organicRanksCount: number,
  ) => {
    clearProgress()

    const fmt$ = (v: number | null) =>
      v !== null ? `$${v.toFixed(2)}` : `${C.gray}n/a${C.reset}`
    const fmtRating = (r: number | null) =>
      r !== null ? `★${r.toFixed(1)}` : `${C.gray}n/a${C.reset}`
    const fmtReviews = (n: number | null) => {
      if (n === null) return `${C.gray}n/a${C.reset}`
      return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
    }
    const fmtDims = () => {
      const { l, w, h, wt } = itemDims
      if (l === null) return `${C.gray}dims n/a${C.reset}`
      return `${l}×${w}×${h} cm  ${wt ?? '?'} kg`
    }
    const statusColor = status === 'enriched' ? C.green : C.yellow

    emit(`  ${C.bold}${C.cyan}┌─${C.reset} ${C.bold}${C.white}${asin}${C.reset}  ${C.gray}#${bsRank} in ${categoryId}${C.reset}`)
    emit(`  ${C.cyan}│${C.reset}  ${trunc(title, 70)}`)
    emit(
      `  ${C.cyan}│${C.reset}  ${C.bold}${fmt$(price)}${C.reset}` +
      `  ${C.yellow}${fmtRating(rating)}${C.reset} (${fmtReviews(reviewCount)})` +
      `  FBA ${C.magenta}${fmt$(fbaFee)}${C.reset}  Ref ${C.magenta}${fmt$(referralFee)}${C.reset}` +
      `  ${statusColor}${status}${C.reset}`
    )
    emit(`  ${C.cyan}│${C.reset}  ${C.dim}${fmtDims()}${C.reset}`)
    emit(
      `  ${C.cyan}└─${C.reset} ${C.dim}Brand: ${brand ?? 'n/a'}` +
      `  │  Type: ${productType ?? 'n/a'}` +
      `  │  ${organicRanksCount} organic rank${organicRanksCount !== 1 ? 's' : ''}${C.reset}`
    )
    emit('')
  },

  // ── Verbose enrichment card (test / upload-test modes) ────────────────────

  /**
   * Full debug card — every field, all organic ranks, scraped-vs-SP-API diff.
   *
   * ┌─ B09B8V1LZ3  #3 in 23709663011  Sports › Water Sports › Tops
   * ├─ IDENTITY ────────────────────────────────────────────────
   * │  Title      Made in USA Girls Bikini Top UPF50+ …
   * │  Brand      City Threads  │  Mfr: City Threads  │  Model: n/a
   * │  Color      Red  │  Pkg Qty: 1  │  Type: SWIMWEAR
   * │  Browse     1234567890  │  Listed: 2021-06-10
   * ├─ PRICING ─────────────────────────────────────────────────
   * │  Scraped $22.99  →  SP-API $22.99      (match)
   * │  FBA $3.51    Referral $3.91    Total est. $7.42
   * ├─ DIMENSIONS ──────────────────────────────────────────────
   * │  Item     3.0 × 2.0 × 1.0 cm    0.05 kg
   * │  Package  5.0 × 4.0 × 2.0 cm    0.08 kg
   * ├─ BULLETS ─────────────────────────────────────────────────
   * │  • UPF 50+ sun protection fabric…
   * │  • Made in USA with premium materials…
   * ├─ ORGANIC RANKS ───────────────────────────────────────────
   * │  #3   23709663011
   * │  #41  12345678901
   * └─ ✓ enriched
   */
  enrichCardVerbose: (opts: {
    asin: string
    bsRank: number
    categoryId: string
    categoryPath: string
    // scraped
    scrapedName: string
    scrapedPrice: number | null
    rating: number | null
    reviewCount: number | null
    productUrl: string
    // SP-API catalog
    title: string | null
    brand: string | null
    manufacturer: string | null
    modelNumber: string | null
    color: string | null
    packageQuantity: number | null
    productType: string | null
    browseNodeId: string | null
    listingDate: string | null
    bulletPoints: string[]
    // dims
    itemL: number | null; itemW: number | null; itemH: number | null; itemWt: number | null
    pkgL: number | null; pkgW: number | null; pkgH: number | null; pkgWt: number | null
    // fees
    spApiPrice: number | null
    fbaFee: number | null
    referralFee: number | null
    // ranks
    organicRanks: Array<{ category_id: string; rank: number }>
    // status
    status: string
  }) => {
    clearProgress()

    const fmt$ = (v: number | null) =>
      v !== null ? `$${v.toFixed(2)}` : `${C.gray}n/a${C.reset}`
    const val = (v: string | number | null | undefined) =>
      (v == null || v === '') ? `${C.gray}n/a${C.reset}` : String(v)

    const divider = (label: string) => {
      const pad = 48 - label.length - 3
      return `  ${C.cyan}├─${C.reset} ${C.dim}${C.bold}${label}${C.reset} ${C.gray}${'─'.repeat(Math.max(0, pad))}${C.reset}`
    }
    const row = (label: string, content: string) =>
      `  ${C.cyan}│${C.reset}  ${C.gray}${label.padEnd(13)}${C.reset}${content}`

    // header
    emit(`  ${C.bold}${C.cyan}┌─${C.reset} ${C.bold}${C.white}${opts.asin}${C.reset}  ${C.gray}#${opts.bsRank} in ${opts.categoryId}${C.reset}  ${C.dim}${trunc(opts.categoryPath, 40)}${C.reset}`)

    // identity
    emit(divider('IDENTITY'))
    emit(row('Title', trunc(opts.title ?? opts.scrapedName, 60)))
    emit(row('Brand', `${val(opts.brand)}  ${C.gray}│  Mfr: ${C.reset}${val(opts.manufacturer)}  ${C.gray}│  Model: ${C.reset}${val(opts.modelNumber)}`))
    emit(row('Color', `${val(opts.color)}  ${C.gray}│  Pkg Qty: ${C.reset}${val(opts.packageQuantity)}  ${C.gray}│  Type: ${C.reset}${val(opts.productType)}`))
    emit(row('Browse Node', `${val(opts.browseNodeId)}  ${C.gray}│  Listed: ${C.reset}${val(opts.listingDate)}`))

    // pricing
    emit(divider('PRICING'))
    const priceMatch = opts.scrapedPrice !== null && opts.spApiPrice !== null
      ? Math.abs(opts.scrapedPrice - opts.spApiPrice) < 0.02
        ? `  ${C.green}(match)${C.reset}`
        : `  ${C.yellow}(diff)${C.reset}`
      : ''
    emit(row('Scraped', `${fmt$(opts.scrapedPrice)}  ${C.gray}→  SP-API ${C.reset}${fmt$(opts.spApiPrice)}${priceMatch}`))
    const totalFees = (opts.fbaFee ?? 0) + (opts.referralFee ?? 0)
    emit(row('Fees', `FBA ${C.magenta}${fmt$(opts.fbaFee)}${C.reset}  Referral ${C.magenta}${fmt$(opts.referralFee)}${C.reset}  ${C.gray}Total: ${C.reset}${C.bold}${fmt$(totalFees > 0 ? totalFees : null)}${C.reset}`))

    // dimensions
    emit(divider('DIMENSIONS'))
    const fmtDims = (l: number | null, w: number | null, h: number | null, wt: number | null) =>
      l !== null ? `${l} × ${w} × ${h} cm   ${C.gray}${wt ?? '?'} kg${C.reset}` : `${C.gray}n/a${C.reset}`
    emit(row('Item', fmtDims(opts.itemL, opts.itemW, opts.itemH, opts.itemWt)))
    emit(row('Package', fmtDims(opts.pkgL, opts.pkgW, opts.pkgH, opts.pkgWt)))

    // bullets
    if (opts.bulletPoints.length > 0) {
      emit(divider('BULLETS'))
      opts.bulletPoints.slice(0, 3).forEach(b =>
        emit(`  ${C.cyan}│${C.reset}  ${C.dim}• ${trunc(b, 72)}${C.reset}`)
      )
      if (opts.bulletPoints.length > 3)
        emit(`  ${C.cyan}│${C.reset}  ${C.gray}  … ${opts.bulletPoints.length - 3} more${C.reset}`)
    }

    // organic ranks
    emit(divider('ORGANIC RANKS'))
    if (opts.organicRanks.length === 0) {
      emit(`  ${C.cyan}│${C.reset}  ${C.gray}none returned${C.reset}`)
    } else {
      opts.organicRanks.forEach(r =>
        emit(`  ${C.cyan}│${C.reset}  ${C.yellow}#${String(r.rank).padEnd(6)}${C.reset} ${C.gray}${r.category_id}${C.reset}`)
      )
    }

    // footer
    const statusColor = opts.status === 'enriched' ? C.green : C.yellow
    emit(`  ${C.cyan}└─${C.reset} ${statusColor}${opts.status}${C.reset}  ${C.dim}${opts.productUrl}${C.reset}`)
    emit('')
  },

  // ── Database upload logging ───────────────────────────────────────────────

  /**
   * Log each row being upserted in debug mode, plus timing and errors.
   * Only active when IS_UPLOAD_TEST is set.
   */
  db: {
    /** Called just before an upsert batch fires. */
    uploadStart: (table: string, count: number) => {
      clearProgress()
      emit(
        `${ts()} ${C.blue}↑${C.reset}  ` +
        `${C.bold}${table}${C.reset} — upserting ${C.cyan}${count}${C.reset} rows`
      )
    },

    /** Called after a successful upsert batch with elapsed ms. */
    uploadDone: (table: string, count: number, ms: number) => {
      clearProgress()
      emit(
        `${ts()} ${C.green}✓${C.reset}  ` +
        `${C.bold}${table}${C.reset} — ${C.green}${count} written${C.reset}  ${C.gray}(${ms}ms)${C.reset}`
      )
    },

    /**
     * Log a Supabase error with full context (code, hint, details).
     * Always active (not just debug mode).
     */
    error: (table: string, operation: string, error: { message: string; code?: string; hint?: string; details?: string }, context?: string) => {
      clearProgress()
      emit(`${ts()} ${C.red}✗${C.reset}  ${C.bold}${table}${C.reset}.${operation} failed${context ? `  ${C.gray}(${context})${C.reset}` : ''}`)
      emit(`  ${C.gray}message:${C.reset} ${error.message}`)
      if (error.code) emit(`  ${C.gray}code:   ${C.reset} ${error.code}`)
      if (error.hint) emit(`  ${C.gray}hint:   ${C.reset} ${error.hint}`)
      if (error.details) emit(`  ${C.gray}details:${C.reset} ${error.details}`)
    },

    /**
     * Log a compact preview of a product row.
     * Only called in debug mode, once per row.
     */
    productRow: (row: {
      asin: string
      title?: string | null
      brand?: string | null
      price?: number | null
      fba_fee?: number | null
      referral_fee?: number | null
      scrape_status?: string | null
      rating?: number | null
      review_count?: number | null
    }) => {
      const fmt$ = (v: number | null | undefined) =>
        v != null ? `$${v.toFixed(2)}` : `${C.gray}—${C.reset}`
      emit(
        `  ${C.gray}│${C.reset}  ${C.yellow}${row.asin}${C.reset}` +
        `  ${trunc(row.title, 44)}` +
        `  ${C.dim}${fmt$(row.price)}  FBA ${fmt$(row.fba_fee)}  Ref ${fmt$(row.referral_fee)}` +
        `  ${row.scrape_status ?? '?'}${C.reset}`
      )
    },

    /**
     * Log a compact preview of a rank row.
     * Only called in debug mode.
     */
    rankRow: (row: { asin: string; category_id: string; rank: number; rank_type: string }) => {
      emit(
        `  ${C.gray}│${C.reset}  ${C.yellow}${row.asin}${C.reset}` +
        `  ${C.gray}#${String(row.rank).padEnd(5)}${C.reset}` +
        `  cat ${C.cyan}${row.category_id}${C.reset}` +
        `  ${C.dim}(${row.rank_type})${C.reset}`
      )
    },
  },

  // ── DB flush ───────────────────────────────────────────────────────────────

  flush: (enrichedOk: number, enrichedFail: number) => {
    clearProgress()
    emit(
      `${ts()} ${C.blue}↑${C.reset}  ` +
      `Flushed to DB — ${C.green}${enrichedOk} enriched${C.reset}` +
      (enrichedFail > 0 ? ` / ${C.yellow}${enrichedFail} failed${C.reset}` : '')
    )
  },

  // ── Summary box ────────────────────────────────────────────────────────────

  amazonSummary: (stats: {
    scrapedOk: number
    scrapedEmpty: number
    scrapedFail: number
    uniqueAsins: number
    enrichedOk: number
    enrichedFail: number
    bestSellerEdges: number
    organicEdges: number
    elapsedMs: number
    medianProducts: number | null
  }, mode: 'full' | 'test' | 'upload-test', interrupted = false) => {
    clearProgress()

    const ms = stats.elapsedMs
    const elapsedStr = ms < 60_000
      ? `${Math.round(ms / 1000)}s`
      : ms < 3_600_000
        ? `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`
        : `${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m`

    const modeNote = mode === 'test' ? 'no DB writes' : mode === 'upload-test' ? 'DB writes ON' : ''
    const rows: [string, string][] = [
      ['Categories', `${stats.scrapedOk} scraped / ${stats.scrapedEmpty} empty / ${stats.scrapedFail} failed`],
      ['Median products', stats.medianProducts !== null ? `${stats.medianProducts} per category` : 'n/a'],
      ['Unique ASINs', String(stats.uniqueAsins)],
      ['Enriched', `${stats.enrichedOk} ok / ${stats.enrichedFail} failed`],
      ['Best seller edges', String(stats.bestSellerEdges)],
      ['Organic edges', String(stats.organicEdges)],
      ['Elapsed', elapsedStr],
    ]

    const W = 47
    emit(`  ${C.bold}${C.white}┌${'─'.repeat(W)}┐${C.reset}`)
    const statusLine = interrupted
      ? `  ${C.yellow}⚠ Interrupted — checkpoint saved${C.reset}`
      : `  ${C.green}✓ Run complete${C.reset}`
    const statusPad = W - (interrupted ? 34 : 16)
    emit(`  ${C.bold}${C.white}│${C.reset}${statusLine}${' '.repeat(Math.max(0, statusPad))}${C.bold}${C.white}│${C.reset}`)
    emit(`  ${C.bold}${C.white}│${'─'.repeat(W)}│${C.reset}`)
    for (const [label, value] of rows) {
      const pad = W - 2 - label.length - value.length
      emit(
        `  ${C.bold}${C.white}│${C.reset} ${C.cyan}${label}${C.reset}` +
        `${' '.repeat(Math.max(1, pad))}${C.bold}${value}${C.reset} ${C.bold}${C.white}│${C.reset}`
      )
    }
    if (modeNote) {
      const pad = W - 1 - modeNote.length
      emit(`  ${C.bold}${C.white}│${C.reset}${' '.repeat(Math.max(0, pad))}${C.dim}${modeNote}${C.reset} ${C.bold}${C.white}│${C.reset}`)
    }
    if (interrupted || stats.scrapedFail > 0 || stats.enrichedFail > 0) {
      emit(`  ${C.bold}${C.white}│${'─'.repeat(W)}│${C.reset}`)
      const hint = interrupted
        ? 'npm run scrape:amazon:resume'
        : `run --resume to retry ${stats.scrapedFail + stats.enrichedFail} failed`
      const pad = W - 2 - hint.length
      emit(`  ${C.bold}${C.white}│${C.reset} ${C.yellow}${hint}${C.reset}${' '.repeat(Math.max(0, pad))} ${C.bold}${C.white}│${C.reset}`)
    }
    emit(`  ${C.bold}${C.white}└${'─'.repeat(W)}┘${C.reset}`)
    emit('')
  },

  // ── GS product detail summary ─────────────────────────────────────────────

  /**
   * Emit a full debug summary of a scraped GsProductDetail.
   * Every field that goes into the DB is shown — null fields rendered as "—"
   * so gaps are immediately visible during a test run.
   */
  gsProduct: (detail: {
    id: string
    url: string
    name: string
    description: string | null
    price_low: number | null
    price_high: number | null
    price_unit: string | null
    price_tiers: { min_qty: number; max_qty: number | null; price_usd: number }[]
    moq_quantity: number | null
    moq_unit: string | null
    item_length_cm: number | null
    item_width_cm: number | null
    item_height_cm: number | null
    item_weight_kg: number | null
    carton_length_cm: number | null
    carton_width_cm: number | null
    carton_height_cm: number | null
    carton_weight_kg: number | null
    units_per_carton: number | null
    fob_port: string | null
    lead_time_days_min: number | null
    lead_time_days_max: number | null
    hts_code: string | null
    logistics_type: string | null
    model_number: string | null
    brand_name: string | null
    certifications: string[]
    image_primary: string | null
    images: string[]
    category_breadcrumb: string[]
    supplier_name: string | null
    supplier_url: string | null
    supplier_country: string | null
    supplier_years_gs: number | null
    supplier_business_types: string[]
    supplier_trade_shows_count: number | null
    supplier_verifications?: string[]
    key_specifications: string | null
    export_markets: string[]
    payment_methods: string[]
    people_also_search: string[]
    product_info_text: string | null
  }) => {
    clearProgress()

    // helpers
    const nil = `${C.gray}—${C.reset}`
    const dim = (s: string) => `${C.dim}${s}${C.reset}`
    const bold = (s: string) => `${C.bold}${s}${C.reset}`
    const lbl = (s: string) => `${C.gray}${s.padEnd(7)}${C.reset} `
    const sep = `  ${C.gray}·${C.reset}  `
    const ind = '  '

    // ── Header: name + id ──────────────────────────────────────────────────
    const name = detail.name.length > 90 ? detail.name.slice(0, 89) + '…' : detail.name
    emit(`${ts()} ${C.green}✓${C.reset}  ${bold(name)}  ${C.gray}[${detail.id}]${C.reset}`)

    // ── URL ────────────────────────────────────────────────────────────────
    emit(`${ind}${lbl('url')}${dim(detail.url)}`)

    // ── Price + MOQ ────────────────────────────────────────────────────────
    const priceStr = detail.price_low != null
      ? (detail.price_high != null && detail.price_high !== detail.price_low
        ? `${C.yellow}$${detail.price_low}–$${detail.price_high}${C.reset}`
        : `${C.yellow}$${detail.price_low}${C.reset}`)
      : nil
    const unitStr = detail.price_unit ? ` / ${detail.price_unit}` : ''
    const moqStr = detail.moq_quantity != null
      ? `  MOQ ${bold(String(detail.moq_quantity))}${detail.moq_unit ? ' ' + detail.moq_unit : ''}`
      : `  MOQ ${nil}`
    emit(`${ind}${lbl('price')}${priceStr}${dim(unitStr)}${moqStr}`)

    // ── Price tiers (if present) ───────────────────────────────────────────
    if (detail.price_tiers.length > 0) {
      const tierStr = detail.price_tiers.map(t =>
        `$${t.price_usd} (${t.min_qty}${t.max_qty != null ? '–' + t.max_qty : '+'})`
      ).join('  ')
      emit(`${ind}${lbl('tiers')}${dim(tierStr)}`)
    }

    // ── Supplier ───────────────────────────────────────────────────────────
    const supName = detail.supplier_name ? `${C.cyan}${detail.supplier_name}${C.reset}` : nil
    const supMeta: string[] = []
    if (detail.supplier_country) supMeta.push(detail.supplier_country)
    if (detail.supplier_years_gs != null) supMeta.push(`${detail.supplier_years_gs} yrs`)
    if (detail.supplier_verifications?.length) supMeta.push(`[${detail.supplier_verifications.join(', ')}]`)
    emit(`${ind}${lbl('sup')}${supName}${supMeta.length ? sep + dim(supMeta.join(' · ')) : ''}`)

    if (detail.supplier_url) {
      emit(`${ind}${lbl('')}${dim(detail.supplier_url)}`)
    }

    const supExtra: string[] = []
    if (detail.supplier_business_types.length) supExtra.push(detail.supplier_business_types.join(', '))
    if (detail.supplier_trade_shows_count != null) supExtra.push(`shows: ${detail.supplier_trade_shows_count}`)
    if (supExtra.length) {
      emit(`${ind}${lbl('')}${dim(supExtra.join(sep.trim() + ' '))}`)
    }

    // ── Item dimensions ────────────────────────────────────────────────────
    const hasItemDims = detail.item_length_cm != null || detail.item_weight_kg != null
    const hasCartonDims = detail.carton_length_cm != null || detail.carton_weight_kg != null
    if (hasItemDims || hasCartonDims) {
      const itemDim = detail.item_length_cm != null
        ? `${detail.item_length_cm}×${detail.item_width_cm}×${detail.item_height_cm} cm`
        : nil
      const itemWt = detail.item_weight_kg != null
        ? (detail.item_weight_kg < 1
          ? `${Math.round(detail.item_weight_kg * 1000)}g`
          : `${detail.item_weight_kg}kg`)
        : nil
      const cartonDim = detail.carton_length_cm != null
        ? `${detail.carton_length_cm}×${detail.carton_width_cm}×${detail.carton_height_cm} cm`
        : nil
      const cartonWt = detail.carton_weight_kg != null ? `${detail.carton_weight_kg}kg` : nil
      const ctnPcs = detail.units_per_carton != null ? `${detail.units_per_carton} pcs` : nil
      emit(
        `${ind}${lbl('dims')}item ${dim(itemDim)}  wt ${dim(itemWt)}` +
        `    carton ${dim(cartonDim)}  wt ${dim(cartonWt)}  ${dim(ctnPcs)}`
      )
    }

    // ── Shipping ───────────────────────────────────────────────────────────
    const shipParts: string[] = [
      `FOB: ${detail.fob_port ?? '—'}`,
      `lead: ${detail.lead_time_days_min != null ? detail.lead_time_days_min + (detail.lead_time_days_max != null && detail.lead_time_days_max !== detail.lead_time_days_min ? '–' + detail.lead_time_days_max : '') + 'd' : '—'}`,
      `HTS: ${detail.hts_code ?? '—'}`,
      `logistics: ${detail.logistics_type ?? '—'}`,
    ]
    emit(`${ind}${lbl('ship')}${dim(shipParts.join('  ·  '))}`)

    // ── Identifiers ────────────────────────────────────────────────────────
    emit(`${ind}${lbl('label')}${dim(`model: ${detail.model_number ?? '—'}  ·  brand: ${detail.brand_name ?? '—'}  ·  certs: ${detail.certifications.length ? detail.certifications.join(', ') : '—'}`)}`)

    // ── Category ───────────────────────────────────────────────────────────
    emit(`${ind}${lbl('cat')}${dim(detail.category_breadcrumb.length ? detail.category_breadcrumb.join(' › ') : '—')}`)

    // ── Key specifications ─────────────────────────────────────────────────
    if (detail.key_specifications) {
      const s = detail.key_specifications.slice(0, 250)
      emit(`${ind}${lbl('specs')}${dim(s)}${s.length < detail.key_specifications.length ? C.gray + '…' + C.reset : ''}`)
    } else {
      emit(`${ind}${lbl('specs')}${nil}`)
    }

    // ── Export markets + payment ───────────────────────────────────────────
    emit(`${ind}${lbl('mkts')}${detail.export_markets.length ? dim(detail.export_markets.join(' · ')) : nil}`)
    emit(`${ind}${lbl('pay')}${detail.payment_methods.length ? dim(detail.payment_methods.join(' · ')) : nil}`)

    // ── Product info ───────────────────────────────────────────────────────
    if (detail.product_info_text) {
      const s = detail.product_info_text.slice(0, 250)
      emit(`${ind}${lbl('info')}${dim(s)}${s.length < detail.product_info_text.length ? C.gray + '…' + C.reset : ''}`)
    } else {
      emit(`${ind}${lbl('info')}${nil}`)
    }

    // ── People also search ────────────────────────────────────────────────
    emit(`${ind}${lbl('pas')}${detail.people_also_search.length ? dim(detail.people_also_search.join(' · ')) : nil}`)

    // ── Description ───────────────────────────────────────────────────────
    if (detail.description) {
      const s = detail.description.slice(0, 180)
      emit(`${ind}${lbl('desc')}${dim(s)}${s.length < detail.description.length ? C.gray + '…' + C.reset : ''}`)
    } else {
      emit(`${ind}${lbl('desc')}${nil}`)
    }

    // ── Media ─────────────────────────────────────────────────────────────
    const imgExtra = detail.images.length > 1 ? `  ${C.gray}(+${detail.images.length - 1} more)${C.reset}` : ''
    emit(`${ind}${lbl('img')}${detail.image_primary ? dim(detail.image_primary) + imgExtra : nil}`)

    emit('')
  },

  /**
   * Emit a full debug summary of a GsSupplierCard (Phase 1b).
   * All enriched supplier fields shown — null/empty shown as "—".
   */
  gsSupplierCard: (card: {
    name: string
    profileUrl: string
    platformSupplierId: string | null
    country: string | null
    yearsOnGs: number | null
    verifications: string[]
    mainProducts: string[]
    businessTypes: string[]
    employeeCount: string | null
    exportMarkets: string[]
  }) => {
    clearProgress()

    const nil = `${C.gray}—${C.reset}`
    const dim = (s: string) => `${C.dim}${s}${C.reset}`
    const bold = (s: string) => `${C.bold}${s}${C.reset}`
    const lbl = (s: string) => `${C.gray}${s.padEnd(7)}${C.reset} `
    const sep = `  ${C.gray}·${C.reset}  `
    const ind = '  '

    // Header
    const meta: string[] = []
    if (card.country) meta.push(card.country)
    if (card.yearsOnGs != null) meta.push(`${card.yearsOnGs} yrs`)
    if (card.verifications.length) meta.push(`[${card.verifications.join(', ')}]`)
    emit(
      `${ts()} ${C.blue}◈${C.reset}  ${bold(card.name)}` +
      (meta.length ? `  ${C.gray}${meta.join(' · ')}${C.reset}` : '')
    )

    // Profile + ID
    emit(`${ind}${lbl('url')}${dim(card.profileUrl || '—')}  ${C.gray}id:${C.reset} ${dim(card.platformSupplierId ?? '—')}`)

    // Business
    const bizParts: string[] = []
    if (card.businessTypes.length) bizParts.push(card.businessTypes.join(', '))
    if (card.employeeCount) bizParts.push(`employees: ${card.employeeCount}`)
    emit(`${ind}${lbl('biz')}${bizParts.length ? dim(bizParts.join(sep.trim() + ' ')) : nil}`)

    // Main products
    emit(`${ind}${lbl('prods')}${card.mainProducts.length ? dim(card.mainProducts.join(' · ')) : nil}`)

    // Export markets
    emit(`${ind}${lbl('mkts')}${card.exportMarkets.length ? dim(card.exportMarkets.join(' · ')) : nil}`)

    emit('')
  },

  // ── GS in-place progress panel ────────────────────────────────────────────

  /**
   * Two-line in-place stats panel for the GlobalSources category loop.
   *  Line 1: progress bar + ETA + current category name
   *  Line 2: ✓ ok  ⊘ empty  ✗ blocked  ⬜ remaining  │  N products  N suppliers  N failed
   */
  gsPanel: (opts: {
    done: number
    total: number
    ok: number
    empty: number
    blocked: number
    products: number
    supplierCards: number
    failed: number
    etaStr: string
    label?: string
  }) => {
    const pct = opts.total > 0 ? Math.round((opts.done / opts.total) * 100) : 0
    const filled = Math.floor(pct / 5)
    const bar = C.green + '█'.repeat(filled) + C.reset + C.gray + '░'.repeat(20 - filled) + C.reset
    const pctStr = String(pct).padStart(3) + '%'
    const remaining = opts.total - opts.done

    const line1 = (
      `\r[${bar}] ${C.bold}${pctStr}${C.reset}` +
      `  ${C.gray}ETA ${opts.etaStr}${C.reset}` +
      (opts.label ? `  ${C.dim}▸ ${trunc(opts.label, 40)}${C.reset}` : '') +
      '   '
    )
    const line2 = (
      `\r${C.green}✓ ${opts.ok}${C.reset}` +
      `  ${C.yellow}⊘ ${opts.empty}${C.reset}` +
      `  ${C.red}✗ ${opts.blocked}${C.reset}` +
      `  ${C.gray}⬜ ${remaining}${C.reset}` +
      `  ${C.cyan}${opts.products} products${C.reset}` +
      (opts.supplierCards > 0 ? `  ${C.blue}${opts.supplierCards} suppliers${C.reset}` : '') +
      (opts.failed > 0 ? `  ${C.red}${opts.failed} prod-failed${C.reset}` : '') +
      '   '
    )
    process.stdout.write(line1 + '\n' + line2)
    fileWrite(
      `[${pctStr}] ✓${opts.ok} ⊘${opts.empty} ✗${opts.blocked} ⬜${remaining}` +
      `  ${opts.products}p ${opts.supplierCards}s  ETA ${opts.etaStr}` +
      (opts.label ? '  ' + opts.label : '')
    )
    _progressLines = 2
  },

  // ── GS summary box ────────────────────────────────────────────────────────

  /**
   * Bordered summary box printed at end of a GlobalSources run (or on interrupt).
   * Shows categories/products/suppliers/elapsed and a resume hint when relevant.
   */
  gsSummary: (stats: {
    catsOk: number
    catsEmpty: number
    catsBlocked: number
    totalProducts: number
    totalFailed: number
    totalSuppliers: number
    elapsedMs: number
  }, mode: 'full' | 'test' | 'upload-test', interrupted = false) => {
    clearProgress()

    const ms = stats.elapsedMs
    const elapsedStr = ms < 60_000
      ? `${Math.round(ms / 1000)}s`
      : ms < 3_600_000
        ? `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`
        : `${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m`

    const modeNote = mode === 'test' ? 'no DB writes' : mode === 'upload-test' ? 'DB writes ON' : ''
    const W = 50
    const rows: [string, string][] = [
      ['Categories', `${stats.catsOk} ok  /  ${stats.catsEmpty} empty  /  ${stats.catsBlocked} blocked`],
      ['Products', `${stats.totalProducts} scraped  /  ${stats.totalFailed} failed`],
      ['Suppliers', `${stats.totalSuppliers} cards`],
      ['Elapsed', elapsedStr],
    ]

    emit(`  ${C.bold}${C.white}┌${'─'.repeat(W)}┐${C.reset}`)
    const statusLine = interrupted
      ? `  ${C.yellow}⚠ Interrupted — checkpoint saved${C.reset}`
      : `  ${C.green}✓ Run complete${C.reset}`
    const statusPad = W - (interrupted ? 34 : 16)
    emit(`  ${C.bold}${C.white}│${C.reset}${statusLine}${' '.repeat(Math.max(0, statusPad))}${C.bold}${C.white}│${C.reset}`)
    emit(`  ${C.bold}${C.white}│${'─'.repeat(W)}│${C.reset}`)

    for (const [label, value] of rows) {
      const pad = W - 2 - label.length - value.length
      emit(
        `  ${C.bold}${C.white}│${C.reset} ${C.cyan}${label}${C.reset}` +
        `${' '.repeat(Math.max(1, pad))}${C.bold}${value}${C.reset} ${C.bold}${C.white}│${C.reset}`
      )
    }

    if (modeNote) {
      const pad = W - 1 - modeNote.length
      emit(`  ${C.bold}${C.white}│${C.reset}${' '.repeat(Math.max(0, pad))}${C.dim}${modeNote}${C.reset} ${C.bold}${C.white}│${C.reset}`)
    }

    if (interrupted || stats.catsBlocked > 0 || stats.totalFailed > 0) {
      emit(`  ${C.bold}${C.white}│${'─'.repeat(W)}│${C.reset}`)
      const hint = 'npm run scrape:globalsources:resume'
      const hintPad = W - 2 - hint.length
      emit(`  ${C.bold}${C.white}│${C.reset} ${C.yellow}${hint}${C.reset}${' '.repeat(Math.max(0, hintPad))} ${C.bold}${C.white}│${C.reset}`)
    }

    emit(`  ${C.bold}${C.white}└${'─'.repeat(W)}┘${C.reset}`)
    emit('')
  },
}
