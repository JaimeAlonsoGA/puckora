# Puckora Scraper — Agent Reference

> Stack: Node.js · TypeScript 5 · Playwright Chromium · Supabase · tsx
> Run from: `apps/scraper/`

---

## Directory layout

```
apps/scraper/
├── shared/                  # Cross-scraper infrastructure — import from '../../shared'
│   ├── index.ts             # Barrel — re-exports everything below
│   ├── config.ts            # requireEnv() + BASE_CONFIG
│   ├── db.ts                # createDb(), IS_DEBUG, type DB
│   ├── utils.ts             # sleep, jitter, eta, pooled, dedupeBy
│   ├── checkpoint.ts        # Generic load/save/fresh<T>
│   ├── cache.ts             # Generic NDJSON init/append/load<T>
│   ├── browser.ts           # launchBrowser, USER_AGENTS, VIEWPORTS
│   └── logger.ts            # log object — structured terminal output
│
├── scrapers/                # One sub-directory per scraper target
│   ├── amazon/
│   └── globalsources/
│
├── tools/                   # Developer utilities — never imported by scraper runtime
│   ├── amazon/
│   └── globalsources/
│
├── runs/                    # Runtime outputs — gitignored (*.json, *.ndjson)
│   ├── amazon/              # checkpoint.json, cache.ndjson
│   └── globalsources/       # checkpoint.json, cache.ndjson
│
├── data/                    # Static seed data (xlsx, json) — committed
├── scripts/
│   └── new-scraper.sh       # Scaffold a new scraper in one command
└── package.json
```

---

## Adding a new scraper

```bash
bash scripts/new-scraper.sh <name>
# e.g.: bash scripts/new-scraper.sh walmart
```

This creates all required files pre-wired to the shared layer. Then:

1. Fill in `scrapers/<name>/config.ts` — add env vars
2. Fill in `scrapers/<name>/browser.ts` — configure anti-bot strategy
3. Add page extractors in `scrapers/<name>/pages/`
4. Fill in `scrapers/<name>/db/` — match your Supabase schema
5. Wire the two-phase pipeline in `scrapers/<name>/index.ts`
6. Add `scrape:<name>` scripts to `package.json`

---

## Per-scraper layout (strict convention)

Every scraper **must** contain these files. No exceptions.

```
scrapers/{name}/
├── config.ts          # Spreads BASE_CONFIG, adds scraper-specific constants
├── browser.ts         # newContext(browser) → {page, ctx}; navigate(page, url) → bool
├── checkpoint.ts      # Typed wrappers: loadCheckpoint / saveCheckpoint / freshCheckpoint
├── cache.ts           # Typed wrappers: initScrapeCache / appendScrapeCache / loadScrapeCache
├── index.ts           # Entry point. Two-phase pipeline. CLI args: --test N --resume --upload-test N
├── db/
│   └── products.ts    # Minimum: upsertProducts(db, rows). Add more files per entity.
└── pages/
    └── listing.ts     # Minimum: one page extractor. Add one file per page type.
```

`types.ts` is optional — only add when you need local types not covered by `@puckora/types`.

---

## Shared layer

Import anything from the barrel: `import { createDb, log, sleep, jitter } from '../../shared'`

| Export                           | File            | Description                              |
| -------------------------------- | --------------- | ---------------------------------------- |
| `BASE_CONFIG`                    | `config.ts`     | Supabase URL/key, proxy URL              |
| `requireEnv(key)`                | `config.ts`     | Throws if env var missing                |
| `createDb()`                     | `db.ts`         | Returns typed `SupabaseClient<Database>` |
| `IS_DEBUG`                       | `db.ts`         | `true` when `NODE_ENV=development`       |
| `type DB`                        | `db.ts`         | Alias for the typed client               |
| `sleep(ms)`                      | `utils.ts`      | Awaitable delay                          |
| `jitter(min, max)`               | `utils.ts`      | Awaitable random delay in range          |
| `eta(done, total, start)`        | `utils.ts`      | Human-readable ETA string                |
| `pooled(items, n, fn)`           | `utils.ts`      | Run async fn with N concurrency          |
| `dedupeBy(items, key)`           | `utils.ts`      | Deduplicate array by key                 |
| `loadCheckpoint<T>(file)`        | `checkpoint.ts` | Returns `T \| null`                      |
| `saveCheckpoint<T>(file, cp)`    | `checkpoint.ts` | Writes JSON with updated_at              |
| `freshCheckpoint<T>(file, init)` | `checkpoint.ts` | Returns init value, does NOT write file  |
| `initCache(file)`                | `cache.ts`      | Creates or truncates the NDJSON file     |
| `appendCache<T>(file, entry)`    | `cache.ts`      | Appends one JSON line                    |
| `loadCache<T>(file)`             | `cache.ts`      | Returns `{ entries, corrupted }`         |
| `launchBrowser(proxyUrl?)`       | `browser.ts`    | Launches Chromium with stealth args      |
| `USER_AGENTS`                    | `browser.ts`    | Curated user-agent pool                  |
| `log`                            | `logger.ts`     | Structured terminal logger               |

---

## Two-phase pipeline pattern

Every scraper follows the same two-phase structure. Never deviate.

```
Phase 1 — Scrape  : hit source pages → extract data → appendScrapeCache()
Phase 2 — Persist : loadScrapeCache() → transform → upsertProducts(db, rows)
```

Why two phases? Phase 1 runs Playwright (memory-intensive). Writing to NDJSON keeps
the heap flat on multi-day runs. Phase 2 can be re-run from cache without re-scraping.

### Checkpoint pattern

```ts
const cp = loadCheckpoint() ?? freshCheckpoint()
const done = IS_RESUME ? new Set(cp.scraped_ids) : new Set<string>()

// After processing each item:
cp.scraped_ids.push(item.id)
saveCheckpoint(cp)
```

---

## Browser / anti-bot patterns

Two strategies exist in this codebase — choose based on the target:

| Strategy                      | Used by       | When to use                                                                                                             |
| ----------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Session rotation**          | Amazon        | Sites with session-state tracking. Rotate context every N requests. Warm up with innocuous pages. Store `storageState`. |
| **Fresh context per request** | GlobalSources | Sites with Incapsula/challenge pages. Create and discard context per request. Longer delay.                             |

Always:
- Use `USER_AGENTS` pool from `shared/browser.ts`
- Set `--disable-blink-features=AutomationControlled`
- Remove `navigator.webdriver` via `addInitScript`

---

## Tools layout

```
tools/{name}/
├── db-check.ts         # Row count per table — quick health check
├── import-categories.ts # Seed categories from local data file → Supabase
├── scrape-categories.ts # (if applicable) Scrape category tree from the website
├── probe-*.ts          # One-off page probes: develop/debug selectors
└── diag/               # Deeper diagnostic scripts — standalone, no shared imports
```

**Naming rules:**
- `db-check.ts` — always this exact name
- `import-*.ts` — import static data into DB
- `scrape-*.ts` — scrape live data and write locally
- `probe-*.ts` — one-off inspection of a single URL
- `diag/` — diagnostic scripts that were useful during development; not run in production

---

## Naming conventions

| Concern               | Convention                           | Example                  |
| --------------------- | ------------------------------------ | ------------------------ |
| Scraper directory     | lowercase kebab                      | `scrapers/ali-express/`  |
| Config export         | `UPPER_SNAKE_CONFIG`                 | `ALIEXPRESS_CONFIG`      |
| Checkpoint interface  | `{Pascal}Checkpoint`                 | `AliExpressCheckpoint`   |
| Cache entry interface | `{Pascal}CacheEntry`                 | `AliExpressCacheEntry`   |
| Page extractor fn     | `scrape{Pascal}{Page}(browser, url)` | `scrapeAliListingPage()` |
| DB upsert fn          | `upsert{PluralEntity}(db, rows)`     | `upsertProducts()`       |
| DB mark fn            | `mark{Entity}Failed(db, id, reason)` | —                        |
| Run outputs           | `runs/{name}/checkpoint.json`        | —                        |
| Run outputs           | `runs/{name}/cache.ndjson`           | —                        |

---

## Runtime outputs

All runtime output is gitignored. Tracked only: the `data/` static files.

```
runs/{name}/
  checkpoint.json   # resumable scrape progress
  cache.ndjson      # Phase 1 output buffer (append-only, heap-stable)
```

Checkpoints and caches are stored under `runs/{name}/` so two scrapers can run
simultaneously without clashing. The path comes from `config.ts` — never hardcode it.

---

## Environment variables

All vars live in `apps/scraper/.env`. Add scraper-specific vars to that file
and declare them in your `config.ts` via `requireEnv()`.

```
# Required by all scrapers (BASE_CONFIG)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PROXY_URL=                  # optional — omit to scrape without proxy

# Amazon-specific
SP_CLIENT_ID=
SP_CLIENT_SECRET=
SP_REFRESH_TOKEN=
SP_MARKETPLACE_ID=          # default: ATVPDKIKX0DER (US)
```

---

## npm scripts

```
scrape:{name}             full production run (with NODE_OPTIONS heap)
scrape:{name}:test        N categories, no DB writes
scrape:{name}:upload-test N categories, writes to DB
scrape:{name}:resume      skip already-checkpointed items
scrape:{name}:cats        scrape category tree (if applicable)
import:{name}             seed categories from local data file
import:{name}:dry         dry-run of category import
```

---

## Pre-flight checklist

Before submitting any scraper change:

- [ ] All runtime output paths use `runs/{name}/` (from config, not hardcoded)
- [ ] `checkpoint_file` and `scrape_cache_file` in config point to `./runs/{name}/`
- [ ] No `useQueryClient`-equivalent anti-patterns (no shared mutable state between page extractors)
- [ ] Page extractors close `page` and `ctx` in both success and catch paths
- [ ] `--resume` mode reads checkpoint before filtering pending items
- [ ] `IS_TEST` mode never writes to Supabase
- [ ] New scraper re-exports config const, checkpoint helpers, and cache helpers from its own files
- [ ] `package.json` has `scrape:{name}`, `scrape:{name}:test`, `scrape:{name}:resume`
