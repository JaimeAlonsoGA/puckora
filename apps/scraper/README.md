# Puckora Scraper

Amazon Best Sellers scraper + SP-API enrichment engine.

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env
# fill in all values in .env
```

## Exact run sequence

**1. Run migration** in Supabase SQL editor → paste `migration.sql`

**2. Import category tree**
```bash
npm run import:dry -- ./amazon-browse-nodes.xlsx   # verify parsing
npm run import     -- ./amazon-browse-nodes.xlsx   # ~34k rows, ~2 min
```

**3. Test run** (no DB writes, logs full output for 5 categories + all ASINs)
```bash
npm run scrape:test
```
Review the console output. Send it back for validation before the full run.

**4. Full run**
```bash
npm run scrape           # runs everything
npm run scrape:resume    # continue after interruption
```

## Monitor progress

At any point during a run, query Supabase:
```sql
select * from scrape_progress;
```

## Architecture

```
Phase 1 — Playwright scrapes every category's Best Sellers page
  → amazon_products (asin, price, rating, review_count, image_url)
  → product_category_ranks (asin, category_id, rank, rank_type='best_seller')

Phase 2 — SP-API enriches every unique ASIN (sequential, 1.2s between calls)
  getCatalogItem:
    → amazon_products (title, brand, dims, images, bullet_points, etc.)
    → product_category_ranks (all organic ranks from salesRanks response)
  getMyFeesEstimateForASIN:
    → amazon_products.fba_fee_estimate
```

## Rate limits

| Endpoint                  | Amazon limit | Our rate     |
|---------------------------|--------------|--------------|
| getCatalogItem            | 5 req/s      | ~0.83 req/s  |
| getMyFeesEstimateForASIN  | 10 req/s     | ~0.83 req/s  |

We run both at 1200ms intervals — well under limits, never throttled.

## Time estimates

| Phase      | Categories/ASINs | Time     |
|------------|-----------------|----------|
| Scrape     | ~34,000 cats    | ~58h     |
| Enrich     | ~600k ASINs     | ~200h    |
| Total      |                 | ~10 days |

The Mac Mini runs unattended. Checkpoint saves every 100 ASINs.
Ctrl+C is safe — resume with `npm run scrape:resume`.
