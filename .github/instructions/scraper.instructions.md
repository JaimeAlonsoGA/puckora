---
applyTo: "apps/scraper/**"
---

# Scraper file rules

## File placement

| What | Where | Rule |
|---|---|---|
| Scraper entry point | `scrapers/{name}/index.ts` | Main orchestration loop only |
| Page scraper | `scrapers/{name}/pages/{page}.ts` | One function, one page type; retry via recursion |
| Context factory | `scrapers/{name}/browser.ts` | Extends `shared/browser.launchBrowser()` |
| Config | `scrapers/{name}/config.ts` | Spreads `BASE_CONFIG`, no env reads elsewhere |
| Checkpoint | `scrapers/{name}/checkpoint.ts` | Typed wrappers over `shared/checkpoint` helpers |
| Cache | `scrapers/{name}/cache.ts` | Typed wrappers over `shared/cache` helpers |
| DB layer | `scrapers/{name}/db/{entity}.ts` | Called only from `index.ts` or page scrapers |
| Shared primitive | `shared/{name}.ts` | No scraper-specific imports |
| Parsers / pure types | `packages/scraper-core/src/parsers/{name}/` | Zero Node.js deps — safe for browser/extension |
| Pure utils | `packages/utils/src/` | Framework-agnostic; no Playwright, no fs |

## Config

- Every scraper config spreads `BASE_CONFIG` from `shared/config.ts`
- All time fields use `_ms` suffix: `delay_min_ms`, `delay_max_ms`, `retry_delay_ms`
- Never read `process.env` outside config files

## CLI args

- Parse with `parseScraperArgs()` from `shared/cli.ts` — never duplicate the `ARGS` block
- Flags: `--test N`, `--upload-test N`, `--resume`, `--category <slug>`
- `TEST_LIMIT` / `UPLOAD_TEST_LIMIT` are `number | null` (null = flag absent)

## index.ts structure

```
1. parseScraperArgs()
2. launchBrowser()     ← from ./browser, not chromium directly
3. load categories / items  ← exit on failure
4. resume filter
5. run-state counters  ← declared before printSummary closure
6. printSummary(interrupted) closure  ← calls log.{name}Summary()
7. handleSigint = () => { printSummary(true); process.exit(130) }
8. process.on('SIGINT', handleSigint)
9. main loop with log.{name}Panel() progress
10. process.off('SIGINT', handleSigint) in finally
11. printSummary(false)
```

- No `chromium.launch()` directly — always go through `./browser.launchBrowser()` (picks up proxy + hardened args)
- SIGINT handler lives **inside** `main()`, not at module level
- `main().catch` prints fatal error + resume hint, exits 1

## Retry pattern

Every page scraper function must handle both nav blocks and exceptions:

```ts
export async function scrapeFoo(browser, url, attempt = 0) {
  const { page, ctx } = await newContext(browser)
  try {
    const ok = await navigate(page, url)
    if (!ok) {
      await page.close(); await ctx.close()
      if (attempt < CONFIG.retry_max) {
        log.warn(`blocked — retry ${attempt + 1}/${CONFIG.retry_max}`)
        await sleep(CONFIG.retry_delay_ms)
        return scrapeFoo(browser, url, attempt + 1)
      }
      return null // or [] for list scrapers
    }
    // ... scrape ...
    await page.close(); await ctx.close()
    return result
  } catch (err) {
    await page.close().catch(() => {})
    await ctx.close().catch(() => {})
    if (attempt < CONFIG.retry_max) {
      log.warn(`error — retry ${attempt + 1}/${CONFIG.retry_max}: ${(err as Error).message.slice(0, 80)}`)
      await sleep(CONFIG.retry_delay_ms)
      return scrapeFoo(browser, url, attempt + 1)
    }
    throw err // or return null/[] for non-fatal scrapers
  }
}
```

## Logger conventions

- Progress: `log.{name}Panel(opts)` — called before each item in the loop (in-place, no scroll)
- Verbose dump: `log.{name}Product(detail)` — **only** when `IS_TEST || IS_UPLOAD_TEST`
- End-of-run: `log.{name}Summary(stats, runMode, interrupted)` — matches `log.amazonSummary` / `log.gsSummary` shape
- `log.section()` only for phase boundaries, never per-item
- `log.scrape()` / `log.success()` for per-item completion lines

## Test modes

| Mode | DB writes | Cache | Verbose logs |
|---|---|---|---|
| `--test N` | ❌ | ✅ written | ✅ full per-item dumps |
| `--upload-test N` | ✅ | ✅ written | ✅ full per-item dumps |
| default / `--resume` | ✅ | depends | ❌ panels only |

- `IS_TEST` skips `createDb()` — pass `null` as db, guard every DB call with `if (!IS_TEST && db)`
- Categories shuffled randomly in test modes so you don't always hit the same ones

## Checkpoint

- `scraped_*` arrays → mark success
- `failed_*` arrays → mark blocked/errored (must be saved on block, not just at end)
- `saveCheckpoint(cp)` after every category in non-test mode
- `freshCheckpoint()` writes to disk immediately — never mutate a stale file in place

## Packages

- DOM parsing / type utils → `@puckora/scraper-core` (no Node.js deps)
- `sleep`, `jitter`, `pooled`, `dedupeBy` → `@puckora/utils`
- `launchBrowser`, `pickUserAgent`, `pickViewport` → `shared/browser.ts` (re-exports from `@puckora/scraper-core`)
- Never import from `shared/` inside `packages/`
