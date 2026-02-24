# Silkflow — Architecture Overview

## Stack at a Glance

```
Browser (React PWA / Vite)
    │
    ├── TanStack Router v1 (file-based, type-safe)
    ├── TanStack Query     (server state cache + background refresh)
    └── Supabase JS client (auth + direct DB queries)
          │                              │
          │  lib/scraper.ts              │  lib/supabase.ts
          │                              │
          ▼                              ▼
  Python FastAPI (Fly.io :8000)    Supabase PostgreSQL
    Playwright pool + stealth        (RLS tables, product catalog)
    OpenAI embeddings
    SP-API via boto3
          │
          ▼
    Supabase DB
    (upsert product cache, analysis results)

  Supabase Edge Functions (Deno) — only 3 remain:
    ├── tracker-products   → CRUD on tracked_products / workspaces
    ├── on-user-created    → bootstraps profile + workspace + onboarding (DB trigger)
    └── stripe-webhook     → handle_stripe_plan_update() RPC

  Python FastAPI routes:
    /scrape/amazon/search         → Amazon SERP scrape + DB upsert
    /scrape/amazon/product        → Product detail scrape + SP-API enrichment
    /scrape/alibaba/search        → Alibaba supplier/product scrape
    /scrape/amazon/competitor-analyze → Background review NLP pipeline
    /sp-api/lookup                → SP-API catalog + pricing + fees
    /sp-api/bulk-lookup           → SP-API bulk (up to 20 ASINs)
    /sp-api/fees                  → FBA fee estimate
    /categories/search            → Semantic category search (embeddings)
```

  Playwright browser pool                ┌─ Global Catalog (service writes) ─┐
  httpx (Keepa / SP-API)                 │ products            (+ history)   │
  OpenAI embeddings                      │ product_details                    │
  Pydantic v2 models                     │ amazon_categories   (ltree)        │
                                         │ category_fba_fees                  │
  Routes:                                │ suppliers                          │
  /scrape/amazon/search                  │ supplier_products                  │
  /scrape/amazon/product                 │ product_supplier_matches  (bridge) │
  /scrape/alibaba/search                 │ fba_fees_cache                     │
  /sp-api/fees                           │ market_opportunities               │
  /categories/embed                      │ trend_signals                      │
  /suppliers/match                       └────────────────────────────────────┘
  /scrape/amazon/competitor-analyze      ┌─ Per-User (RLS: uid = auth.uid()) ─┐
                                         │ profiles + onboarding_steps        │
  Chrome Extension (MV3)                 │ usage_counters   (atomic limits)   │
  ───────────────                        │ workspaces → collections           │
  content script → background            │ tracked_products (alert thresholds)│
  → Supabase Edge Functions              │ tracked_keywords                   │
  (same API surface as web app)          │ saved_suppliers                    │
                                         │ supplier_inquiries  (CRM-lite)     │
                                         │ competitor_analyses + clusters      │
                                         │ opportunity_reports                 │
                                         │ cost_calculations + templates       │
                                         │ notifications + preferences         │
                                         │ search_history                     │
                                         └────────────────────────────────────┘
                                         ┌─ Embeddings (HNSW cosine) ─────────┐
                                         │ category_embeddings                 │
                                         │ product_embeddings                  │
                                         │ review_embeddings                   │
                                         │ supplier_embeddings                 │
                                         └────────────────────────────────────┘
```

---

## Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Global product catalog** | `products` is shared across users. First scrape writes it; subsequent users hit cache. Cuts scraper cost by orders of magnitude at scale. |
| **Atomic usage counters** | `usage_counters` table (one row per user/key/period), incremented via `SECURITY DEFINER` RPC `increment_usage_counter()`. No lost increments under concurrent edge function calls. Race condition in the old `profiles.searches_today` column eliminated. |
| **ltree for categories** | 25k-row `AmazonCategories.csv` loads into `amazon_categories` with computed `ltree_path`. Ancestor/descendant queries are a single indexed range scan. |
| **Partitioned product history** | `product_history` is range-partitioned by year (2025–2099). Old partitions can be detached and archived without touching the live table. |
| **Auto-snapshot trigger** | `trg_product_snapshot` fires on `UPDATE` of `products` and writes a new `product_history` row only when BSR, price, rating, or review count actually changes. BSR/price chart data is free. |
| **Amazon → Alibaba bridge** | `product_supplier_matches` pre-computes semantic similarity between Amazon products and Alibaba supplier listings. Supplier search becomes a simple indexed lookup instead of a live API call per user. |
| **DB-level notifications** | Price-drop and BSR-spike triggers fire on `UPDATE` of `products.price` / `products.bsr` and insert `notifications` rows for any user with a matching threshold. No polling needed. |
| **Onboarding state machine** | `onboarding_steps` (enum-typed, one row per step per user) created atomically in `handle_new_user()` trigger. Frontend reads completion map via `get_onboarding_status()` RPC. |
| **No Node.js middle layer** | Edge Functions call Python FastAPI directly — no extra hop, lower latency. |
| **Deno Edge Functions** | Globally distributed, low cold-start, Supabase-native. |
| **Playwright on Fly.io** | Full headless browser for JS-rendered Amazon scraping. |
| **TanStack Router/Query** | Type-safe routes + declarative server-state cache. Eliminates `useEffect`+`fetch` patterns entirely. |
| **Turborepo monorepo** | `@repo/types`, `@repo/ui`, `@repo/utils` shared across `web`, `extension`, edge functions. |

---

## Request Lifecycle — Product Search (with cache)

```
1. User types query → useAmazonSearch hook (TanStack Query, staleTime: 5min)
2. query fn calls api.get('/products-search?q=...')
3. Edge Function: products-search/index.ts
   a. validateAuth()   — verify JWT
   b. increment_usage_counter(userId, 'daily_searches') → compare to PLAN_LIMITS
   c. Check products table: SELECT * FROM products WHERE title ILIKE query AND needs_refresh_at > NOW()
      → Cache HIT:  return cached rows immediately
      → Cache MISS: scraperClient.post('/scrape/amazon/search', params)
                    Upsert results into products (triggers auto-snapshot)
   d. INSERT search_history
   e. ok(paginated results)
4. React renders ResultsGrid with TanStack Query-cached data
```

## Request Lifecycle — Competitor Analysis (async job)

```
1. User submits ASIN form → useTriggerAnalysis mutation
2. POST /competitor-analyze → Edge Function:
   a. validateAuth() + increment_usage_counter(userId, 'monthly_competitor_analyses')
   b. INSERT competitor_analyses { status: 'queued' }
   c. scraperClient.post('/scrape/amazon/competitor-analyze', { asin, maxReviews })
      (fire-and-forget; scraper writes results back via DB)
3. Frontend polls GET /competitor-result?id=... every 3s
   (useQuery with refetchInterval until status = 'complete')
4. Scraper finishes:
   a. Upserts review_embeddings (per review body)
   b. Runs KMeans clustering, summarises with GPT-4o
   c. Inserts pain_point_clusters + opportunity_reports
   d. UPDATE competitor_analyses SET status = 'complete'
   e. DB trigger trg_analysis_complete_notify → INSERT notifications
5. Frontend receives status = 'complete', renders PainPointList + OpportunityReport
```

---

## Plan Enforcement

Plans: `free` → `starter` → `pro` → `agency`

Counter keys: `daily_searches`, `monthly_competitor_analyses`, `daily_cost_calcs`,
`daily_supplier_searches`, `daily_category_searches`

```typescript
// In every metered Edge Function:
const count = await supabase.rpc('increment_usage_counter', {
  p_user_id: userId,
  p_key: 'daily_searches',
  p_period: 'daily'
})
if (count > PLAN_LIMITS[profile.plan].dailySearches) {
  throw planLimitError('daily_searches')
}
```

The `increment_usage_counter` function is `SECURITY DEFINER` — it runs as the
Postgres superuser, so it can atomically INSERT…ON CONFLICT DO UPDATE regardless of RLS.

---

## Database Triggers (automatic, no edge function call needed)

| Trigger | Table | What it does |
|---------|-------|--------------|
| `handle_new_user` | `auth.users` INSERT | Creates profile, default workspace, all onboarding steps, notification prefs |
| `trg_product_snapshot` | `products` UPDATE | Writes `product_history` row when metrics change |
| `trg_price_alert` | `products.price` UPDATE | Inserts `notifications` for tracked users with threshold set |
| `trg_bsr_alert` | `products.bsr` UPDATE | Inserts `notifications` for BSR spike/drop thresholds |
| `trg_analysis_complete_notify` | `competitor_analyses.status` UPDATE | Inserts `notifications` when status → `complete` |
| `trg_onboarding_completion` | `onboarding_steps.completed_at` UPDATE | Marks profile `onboarding_completed_at` when all steps done |
| `update_updated_at` | All tables with `updated_at` | Auto-updates timestamp on every UPDATE |

---

## pg_cron Maintenance Schedule

Requires `pg_cron` enabled in Supabase dashboard (managed project setting).

| Job | Schedule | What it does |
|-----|----------|--------------|
| `purge-expired-opportunities` | Daily 06:00 UTC | DELETE expired market_opportunities |
| `purge-expired-trends` | Daily 06:30 UTC | DELETE expired trend_signals |
| `purge-expired-fba-fees` | Daily 07:00 UTC | DELETE expired fba_fees_cache |
| `archive-search-history` | Weekly Sunday 02:00 UTC | DELETE search_history > 90 days |
| `purge-old-usage-counters` | Monthly 1st 03:00 UTC | DELETE usage_counters > 6 months |
| `purge-old-notifications` | Weekly Sunday 03:00 UTC | DELETE notifications > 60 days |

Product refresh and embedding generation are handled by the Python scheduler
(HTTP cron hitting the `refresh-products` edge function) — they need network access.
