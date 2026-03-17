---
agent: agent
description: Scaffold a new scraper (entry point + pages + browser + config + checkpoint + cache + db layer)
---

Scaffold a complete new scraper for: **${input:name}** (e.g. `alibaba`)

## Steps

### 1. Config — `scrapers/${name}/config.ts`
- Spread `BASE_CONFIG` from `../../shared/config`
- Include: `delay_min_ms`, `delay_max_ms`, `retry_max`, `retry_delay_ms`, `checkpoint_file`, `scrape_cache_file`, `batch_size`
- No `process.env` reads outside this file

### 2. Checkpoint — `scrapers/${name}/checkpoint.ts`
- Define `${Name}Checkpoint` interface with `scraped_*[]`, `failed_*[]`, `started_at`, `updated_at`
- Export `loadCheckpoint`, `saveCheckpoint`, `freshCheckpoint` as typed wrappers over `../../shared/checkpoint`

### 3. Cache — `scrapers/${name}/cache.ts`
- Define `${Name}CacheEntry` interface
- Export `initScrapeCache`, `appendScrapeCache`, `loadScrapeCache` as typed wrappers over `../../shared/cache`

### 4. Browser — `scrapers/${name}/browser.ts`
- `launchBrowser()` delegates to `../../shared/browser.launchBrowser(CONFIG.proxy_url)`
- Context factory `new${Name}Context(browser)` with UA rotation, locale, headers, `addInitScript` for anti-bot
- Navigation helper `${name}Navigate(page, url)` — returns `boolean` (false = blocked)

### 5. DB layer — `scrapers/${name}/db/{entity}.ts`
- One file per DB entity (e.g. `products.ts`, `categories.ts`)
- Accepts `SupabaseClient` + typed data, returns typed result
- Called only from `index.ts`

### 6. Page scrapers — `scrapers/${name}/pages/{page}.ts`
- One exported function per page type, signature: `(browser, url, attempt = 0)`
- Full retry on both nav block and exception (see scraper.instructions.md retry pattern)
- Returns typed result (`null` = hard failure, `[]` = empty, data = success)

### 7. Parser (if needed) — `packages/scraper-core/src/parsers/${name}/`
- Pure functions, no Node.js deps — safe for browser/extension
- Export from `packages/scraper-core/src/index.ts`

### 8. Entry point — `scrapers/${name}/index.ts`
Follow this structure exactly:
```
parseScraperArgs()
launchBrowser()
load source items (exit on failure)
resume filter
run-state counters + calcMedian (if needed)
printSummary(interrupted) closure → log.${name}Summary(...)
handleSigint = () => { printSummary(true); process.exit(130) }
process.on('SIGINT', handleSigint)

try {
  for (const item of items) {
    log.${name}Panel({ done, total, ...counters, etaStr, label })
    // phase 1: collect URLs
    // phase 2: scrape details (pooled())
    // db upserts guarded by if (!IS_TEST && db)
    saveCheckpoint(cp)
  }
} finally {
  process.off('SIGINT', handleSigint)
  await browser.close()
}

log.section('Run Complete')
printSummary(false)

main().catch(err => {
  log.error(`FATAL: ...`)
  log.warn('retry with: npm run scrape:${name}:resume')
  process.exit(1)
})
```

### 9. Logger methods — add to `shared/logger.ts`
- `log.${name}Panel(opts)` — 2-line in-place progress panel (copy `gsPanel` shape)
- `log.${name}Summary(stats, mode, interrupted)` — bordered summary box (copy `gsSummary` shape)
- Verbose per-item: `log.${name}Item(detail)` — called only when `IS_TEST || IS_UPLOAD_TEST`

### 10. npm scripts — add to `apps/scraper/package.json`
```json
"scrape:${name}": "NODE_OPTIONS=--max-old-space-size=8192 tsx scrapers/${name}/index.ts",
"scrape:${name}:test": "tsx scrapers/${name}/index.ts --test 3",
"scrape:${name}:upload-test": "tsx scrapers/${name}/index.ts --upload-test 5",
"scrape:${name}:resume": "NODE_OPTIONS=--max-old-space-size=8192 tsx scrapers/${name}/index.ts --resume"
```

## Checklist
- [ ] `chromium.launch()` never called directly — always `./browser.launchBrowser()`
- [ ] `parseScraperArgs()` used — no hand-rolled `ARGS` block
- [ ] All time config fields end in `_ms`
- [ ] SIGINT handler is inside `main()`, not at module level; exits 130
- [ ] Both nav-block and exception are retried in every page scraper
- [ ] `failed_*` checkpoint array is written on block (not just at end of run)
- [ ] DB calls guarded by `if (!IS_TEST && db)`
- [ ] Categories shuffled in `--test` and `--upload-test` modes
- [ ] Verbose logs (`log.${name}Item`) gated behind `IS_TEST || IS_UPLOAD_TEST`
- [ ] Parser logic in `packages/scraper-core/` if it has no Node.js deps
- [ ] `npx tsc --noEmit -p apps/scraper/tsconfig.json` passes
