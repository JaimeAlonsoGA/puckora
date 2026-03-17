#!/usr/bin/env bash
# scripts/new-scraper.sh <name>
#
# Scaffolds a new scraper under scrapers/<name>/ and tools/<name>/ with all
# required files pre-wired to the shared layer.
#
# Usage:
#   bash scripts/new-scraper.sh walmart
#   bash scripts/new-scraper.sh ali-express
#
# Conventions enforced:
#   - Name must be lowercase kebab-case (letters, digits, hyphens only)
#   - Const export:     WALMART_CONFIG  (upper-snake)
#   - Interface prefix: Walmart         (PascalCase)
#   - Runs output:      runs/<name>/
#   - Tools:            tools/<name>/
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

NAME="${1:-}"

# ── Validate input ────────────────────────────────────────────────────────────
if [[ -z "$NAME" ]]; then
  echo "Usage: bash scripts/new-scraper.sh <name>"
  echo "  e.g. bash scripts/new-scraper.sh walmart"
  exit 1
fi

if [[ ! "$NAME" =~ ^[a-z][a-z0-9-]*$ ]]; then
  echo "Error: name must be lowercase kebab-case (e.g. walmart, ali-express)"
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRAPER="$ROOT/scrapers/$NAME"
TOOLS="$ROOT/tools/$NAME"
RUNS="$ROOT/runs/$NAME"

if [[ -d "$SCRAPER" ]]; then
  echo "Error: scrapers/$NAME already exists"
  exit 1
fi

# ── Derive casing helpers ─────────────────────────────────────────────────────
UPPER="${NAME//-/_}"
UPPER="${UPPER^^}"            # WALMART  /  ALI_EXPRESS
PASCAL="$(echo "$NAME" | sed -E 's/(^|-)([a-z])/\u\2/g')"  # Walmart / AliExpress
CONFIG_CONST="${UPPER}_CONFIG"  # WALMART_CONFIG

echo "Scaffolding scraper: $NAME"
echo "  Config export : $CONFIG_CONST"
echo "  Interface prefix: $PASCAL"
echo ""

# ── Create directories ────────────────────────────────────────────────────────
mkdir -p "$SCRAPER/db" "$SCRAPER/pages" "$TOOLS/diag" "$RUNS"
touch "$RUNS/.gitkeep"

# ─────────────────────────────────────────────────────────────────────────────
# config.ts
# ─────────────────────────────────────────────────────────────────────────────
cat > "$SCRAPER/config.ts" << HEREDOC
/**
 * scrapers/$NAME/config.ts
 *
 * $PASCAL scraper configuration.
 * Extends BASE_CONFIG with scraper-specific tunables.
 *
 * Required env vars (add to apps/scraper/.env):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PROXY_URL (optional)
 *   TODO: add any scraper-specific vars here
 */
import { BASE_CONFIG } from '../../shared'

export const $CONFIG_CONST = {
  ...BASE_CONFIG,

  // ── Scraper behaviour ─────────────────────────────────────────────────────
  delay_min_ms: 2_000,
  delay_max_ms: 5_000,
  retry_max: 3,
  retry_delay_ms: 15_000,

  // ── Persistence ───────────────────────────────────────────────────────────
  checkpoint_file: './runs/$NAME/checkpoint.json',
  scrape_cache_file: './runs/$NAME/cache.ndjson',
  batch_size: 50,
} as const
HEREDOC

# ─────────────────────────────────────────────────────────────────────────────
# browser.ts
# ─────────────────────────────────────────────────────────────────────────────
cat > "$SCRAPER/browser.ts" << HEREDOC
/**
 * scrapers/$NAME/browser.ts
 *
 * Browser and page-context factory for $PASCAL.
 * Wraps the shared launchBrowser with scraper-specific stealth/anti-bot config.
 */
import type { Browser, Page, BrowserContext } from 'playwright'
import { launchBrowser as sharedLaunchBrowser } from '../../shared'
import { ${CONFIG_CONST} } from './config'

export { launchBrowser } from '../../shared'

/**
 * Create a fresh browser context + page for a single request.
 * Close both after use: await page.close(); await ctx.close()
 */
export async function newContext(
  browser: Browser,
): Promise<{ page: Page; ctx: BrowserContext }> {
  const ctx = await browser.newContext({
    // TODO: configure stealth settings (userAgent, viewport, locale, headers…)
    proxy: ${CONFIG_CONST}.proxy_url ? { server: ${CONFIG_CONST}.proxy_url } : undefined,
  })

  // TODO: add init scripts for anti-automation evasion if needed
  // await ctx.addInitScript(() => {
  //   Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  // })

  const page = await ctx.newPage()
  return { page, ctx }
}

/**
 * Navigate to a URL and detect any block/challenge pages.
 * Returns true if the page loaded successfully, false if blocked.
 */
export async function navigate(page: Page, url: string): Promise<boolean> {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    // TODO: detect block pages, CAPTCHA, etc. and return false
    return true
  } catch {
    return false
  }
}
HEREDOC

# ─────────────────────────────────────────────────────────────────────────────
# checkpoint.ts
# ─────────────────────────────────────────────────────────────────────────────
cat > "$SCRAPER/checkpoint.ts" << HEREDOC
/**
 * scrapers/$NAME/checkpoint.ts
 *
 * Typed checkpoint wrappers for $PASCAL.
 * Binds the generic shared helpers to the ${PASCAL}Checkpoint interface.
 */
import {
  loadCheckpoint as load,
  saveCheckpoint as save,
  freshCheckpoint as fresh,
} from '../../shared'
import { ${CONFIG_CONST} } from './config'

// ── Checkpoint shape — extend as needed ───────────────────────────────────────
export interface ${PASCAL}Checkpoint {
  /** IDs / URLs already processed — used for --resume deduplication. */
  scraped_ids: string[]
  /** ISO timestamp of first run start. */
  started_at: string
  /** ISO timestamp of last save. */
  updated_at: string
}

const INITIAL: ${PASCAL}Checkpoint = {
  scraped_ids: [],
  started_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const loadCheckpoint  = () => load<${PASCAL}Checkpoint>(${CONFIG_CONST}.checkpoint_file)
export const saveCheckpoint  = (cp: ${PASCAL}Checkpoint) => save(${CONFIG_CONST}.checkpoint_file, cp)
export const freshCheckpoint = () => fresh(${CONFIG_CONST}.checkpoint_file, INITIAL)
HEREDOC

# ─────────────────────────────────────────────────────────────────────────────
# cache.ts
# ─────────────────────────────────────────────────────────────────────────────
cat > "$SCRAPER/cache.ts" << HEREDOC
/**
 * scrapers/$NAME/cache.ts
 *
 * Typed NDJSON cache wrappers for $PASCAL.
 * The cache is an append-only file that accumulates Phase 1 scrape output.
 * It keeps memory usage flat on multi-day runs.
 */
import { initCache, appendCache, loadCache } from '../../shared'
import { ${CONFIG_CONST} } from './config'

// ── Cache entry shape — one record per scraped entity ────────────────────────
export interface ${PASCAL}CacheEntry {
  // TODO: define what one cache entry looks like
  // e.g. url: string; products: SomeType[]
  id: string
}

const FILE = () => ${CONFIG_CONST}.scrape_cache_file

export const initScrapeCache  = () => initCache(FILE())
export const appendScrapeCache = (entry: ${PASCAL}CacheEntry) => appendCache(FILE(), entry)
export const loadScrapeCache  = () => loadCache<${PASCAL}CacheEntry>(FILE())
HEREDOC

# ─────────────────────────────────────────────────────────────────────────────
# index.ts  (entry point — two-phase pipeline skeleton)
# ─────────────────────────────────────────────────────────────────────────────
cat > "$SCRAPER/index.ts" << HEREDOC
/**
 * scrapers/$NAME/index.ts
 *
 * $PASCAL Scraper — two-phase pipeline
 *
 * Phase 1 — Scrape source pages → NDJSON cache (heap-stable)
 * Phase 2 — Enrich / transform → upsert to Supabase
 *
 * Usage:
 *   npx tsx scrapers/$NAME/index.ts                  # full production run
 *   npx tsx scrapers/$NAME/index.ts --test 5         # 5 items, no DB writes
 *   npx tsx scrapers/$NAME/index.ts --resume         # skip already-done items
 */
import { chromium } from 'playwright'
import { ${CONFIG_CONST} } from './config'
import { log, createDb, sleep, jitter, pooled } from '../../shared'
import { loadCheckpoint, saveCheckpoint, freshCheckpoint } from './checkpoint'
import { initScrapeCache, appendScrapeCache } from './cache'
import { launchBrowser } from './browser'
// import { scrapeListingPage } from './pages/listing'   // TODO: add page extractors
// import { upsertProducts } from './db/products'        // TODO: add DB ops

// ─── ARGS ─────────────────────────────────────────────────────────────────────
const ARGS      = process.argv.slice(2)
const IS_TEST   = ARGS.includes('--test')
const IS_RESUME = ARGS.includes('--resume')
const TEST_LIMIT = IS_TEST ? parseInt(ARGS[ARGS.indexOf('--test') + 1] ?? '5', 10) : Infinity

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  log.section('Puckora — $PASCAL Scraper', IS_TEST ? 'TEST — no DB writes' : undefined)
  log.info(\`Proxy  : \${${CONFIG_CONST}.proxy_url ? ${CONFIG_CONST}.proxy_url.replace(/:[^:@]+@/, ':***@') : 'none'}\`)
  log.info(\`Resume : \${IS_RESUME}\`)

  // ── Phase 1: scrape ────────────────────────────────────────────────────────
  // TODO: load items to scrape (from DB, local file, or hardcoded seed)
  const items: string[] = [] // TODO: populate

  const cp = loadCheckpoint() ?? freshCheckpoint()
  const done = IS_RESUME ? new Set(cp.scraped_ids) : new Set<string>()
  const pending = items.filter(id => !done.has(id))

  if (pending.length === 0) {
    log.success('Nothing to scrape.')
    return
  }

  if (IS_TEST || IS_RESUME) initScrapeCache()
  const db = IS_TEST ? null : createDb()

  const browser = await launchBrowser()
  try {
    for (let i = 0; i < pending.length; i++) {
      const item = pending[i]
      log.info(\`[\${i + 1}/\${pending.length}] \${item}\`)

      // TODO: call your page extractor
      // const result = await scrapeListingPage(browser, item)
      // if (!result) { log.warn('  [fail]'); continue }

      // TODO: upsert to DB in non-test mode
      // if (!IS_TEST && db) await upsertProducts(db, [result])

      cp.scraped_ids.push(item)
      if (!IS_TEST) saveCheckpoint(cp)

      await jitter(${CONFIG_CONST}.delay_min_ms, ${CONFIG_CONST}.delay_max_ms)
    }
  } finally {
    await browser.close()
  }

  // ── Phase 2: enrich ────────────────────────────────────────────────────────
  // TODO: load from cache, call enrichment APIs, upsert final rows

  log.section('Run Complete')
  if (IS_TEST) log.warn(\`TEST mode — no data written to Supabase.\`)
}

main().catch(err => {
  console.error('[$NAME-scraper] FATAL:', err)
  process.exit(1)
})
HEREDOC

# ─────────────────────────────────────────────────────────────────────────────
# db/products.ts  (skeleton)
# ─────────────────────────────────────────────────────────────────────────────
cat > "$SCRAPER/db/products.ts" << HEREDOC
/**
 * scrapers/$NAME/db/products.ts
 *
 * DB operations for the $PASCAL products table.
 * Follow the pattern from scrapers/amazon/db/products.ts or
 * scrapers/globalsources/db/products.ts.
 */
import type { DB } from '../../../shared'

// TODO: define row shape matching the Supabase table schema
interface ${PASCAL}ProductRow {
  id: string
  // ...
}

export async function upsertProducts(
  db: DB,
  rows: ${PASCAL}ProductRow[],
): Promise<void> {
  // TODO: implement upsert
  const { error } = await db
    .from('TODO_table_name' as any)
    .upsert(rows as any, { onConflict: 'id', ignoreDuplicates: false })

  if (error) throw error
}
HEREDOC

# ─────────────────────────────────────────────────────────────────────────────
# pages/listing.ts  (skeleton)
# ─────────────────────────────────────────────────────────────────────────────
cat > "$SCRAPER/pages/listing.ts" << HEREDOC
/**
 * scrapers/$NAME/pages/listing.ts
 *
 * Page extractor for $PASCAL listing/search pages.
 * Returns a typed result from one page evaluation.
 *
 * Anti-bot notes: TODO (describe strategy — fresh context per request? session rotation?)
 */
import type { Browser } from 'playwright'
import { newContext, navigate } from '../browser'
import { log, sleep } from '../../../shared'
import { ${CONFIG_CONST} } from '../config'

export interface ListingResult {
  urls: string[]
  blocked: boolean
  empty: boolean
}

export async function scrapeListing(
  browser: Browser,
  pageUrl: string,
  attempt = 0,
): Promise<ListingResult> {
  const { page, ctx } = await newContext(browser)

  try {
    const ok = await navigate(page, pageUrl)

    if (!ok) {
      await page.close(); await ctx.close()
      if (attempt < ${CONFIG_CONST}.retry_max) {
        log.warn(\`Listing blocked — retry \${attempt + 1}/\${${CONFIG_CONST}.retry_max}: \${pageUrl}\`)
        await sleep(${CONFIG_CONST}.retry_delay_ms)
        return scrapeListing(browser, pageUrl, attempt + 1)
      }
      return { urls: [], blocked: true, empty: false }
    }

    const urls = await page.evaluate(() => {
      // TODO: extract product URLs from listing page DOM
      return [] as string[]
    })

    await page.close(); await ctx.close()
    return { urls, blocked: false, empty: urls.length === 0 }
  } catch (err) {
    await page.close().catch(() => {})
    await ctx.close().catch(() => {})
    log.error(\`Listing failed: \${pageUrl} — \${(err as Error).message}\`)
    return { urls: [], blocked: false, empty: true }
  }
}
HEREDOC

# ─────────────────────────────────────────────────────────────────────────────
# tools/
# ─────────────────────────────────────────────────────────────────────────────
cat > "$TOOLS/db-check.ts" << HEREDOC
/**
 * tools/$NAME/db-check.ts
 *
 * Quick row-count check for all $PASCAL DB tables.
 * Usage: npx tsx tools/$NAME/db-check.ts
 */
import { createDb } from '../../shared'

async function main() {
  const db = createDb()
  // TODO: add all table names for this scraper
  const tables: string[] = []
  for (const t of tables) {
    const { count, error } = await (db as any).from(t).select('*', { count: 'exact', head: true })
    console.log(error ? \`\${t}: ERROR — \${error.message}\` : \`\${t}: OK — \${count} rows\`)
  }
}
main().catch(console.error)
HEREDOC

cat > "$TOOLS/probe-listing.ts" << HEREDOC
/**
 * tools/$NAME/probe-listing.ts
 *
 * One-off probe: scrape a single listing page and dump the result.
 * Usage: npx tsx tools/$NAME/probe-listing.ts [url]
 */
import { chromium } from 'playwright'
import { scrapeListing } from '../../scrapers/$NAME/pages/listing'
import { ${CONFIG_CONST} } from '../../scrapers/$NAME/config'

const url = process.argv[2] ?? 'https://TODO-default-listing-url'

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const result = await scrapeListing(browser, url)
  await browser.close()

  console.log('blocked :', result.blocked)
  console.log('empty   :', result.empty)
  console.log('urls    :', result.urls.length, result.urls.slice(0, 5))
}
main().catch(err => { console.error(err); process.exit(1) })
HEREDOC

# ─────────────────────────────────────────────────────────────────────────────
# Finish
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "✅  Scaffold complete: scrapers/$NAME/"
echo ""
echo "Files created:"
find "$SCRAPER" "$TOOLS" -type f | sed "s|$ROOT/||" | sort
echo ""
echo "Next steps:"
echo "  1. Implement scrapers/$NAME/config.ts        — add any scraper-specific env vars"
echo "  2. Implement scrapers/$NAME/browser.ts       — configure stealth/anti-bot strategy"
echo "  3. Implement scrapers/$NAME/pages/listing.ts — add DOM extraction for listing pages"
echo "  4. Add more pages/ extractors as needed (product.ts, etc.)"
echo "  5. Implement scrapers/$NAME/db/products.ts   — match your Supabase schema"
echo "  6. Wire everything in scrapers/$NAME/index.ts"
echo "  7. Add to package.json:"
echo "       \"scrape:$NAME\":        \"tsx scrapers/$NAME/index.ts\","
echo "       \"scrape:$NAME:test\":   \"tsx scrapers/$NAME/index.ts --test 5\","
echo "       \"scrape:$NAME:resume\": \"NODE_OPTIONS=--max-old-space-size=8192 tsx scrapers/$NAME/index.ts --resume\""
echo ""
echo "Pattern reference: see AGENTS.md"
