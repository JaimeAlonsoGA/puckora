# Data Models

Canonical TypeScript types live in `packages/types/src/`.
Zod schemas (for runtime validation) live in `packages/zod-schemas/src/`.
PostgreSQL schema lives in `supabase/migrations/` (12 migration files).

---

## Core Types

### `AmazonProduct` / `AmazonProductDetail`
Key fields: `asin`, `title`, `brand`, `price`, `rating`, `reviewCount`, `bsr`, `bsrCategory`,
`monthlySalesEstimate`, `monthlyRevenueEstimate`, `dimensions`, `weightKg`,
`sellerCount`, `fbaSellerCount`, `imageUrls`, `reviewDistribution`,
`opportunityScore`, `demandScore`, `trendScore`, `isFBA`, `isHazmat`, `isOversized`

### `AlibabaSupplier` / `AlibabaProduct`
Key fields: `supplierId`, `name`, `country`, `isVerified`, `isTradeAssurance`,
`yearsOnPlatform`, `responseRate`, `priceTiers` (MOQ + unit price breakpoints), `moq`

### `CostCalculatorInput`
```typescript
{
  productCost: number        // per unit FOB (USD)
  quantity: number
  shippingMethod: ShippingMethod  // 'air' | 'sea' | 'express' | 'lcl'
  weightKg: number
  dimensionsCm: { l: number, w: number, h: number }
  marketplace: Marketplace
  targetSellingPrice: number
  vatRate?: number
  customsDutyRate?: number
  prepCostPerUnit?: number
  labelingCostPerUnit?: number
}
```

### `CostBreakdown`
```typescript
{
  supplierCostPerUnit: number
  shippingCostPerUnit: number
  fbaFulfillmentFee: number
  fbaReferralFee: number
  fbaStorageFeeMonthly: number
  importDutyEstimate?: number
  totalLandedCostPerUnit: number
  breakEvenPrice: number
  recommendedSellPrice: number
  projectedMarginPct: number
  projectedROIPct: number
  projectedMonthlyProfit?: number
  warnings: CostWarning[]
}
```

### `CompetitorAnalysis`
```typescript
{
  id: string
  asin: string
  marketplace: Marketplace
  status: JobStatus   // 'pending' | 'queued' | 'processing' | 'complete' | 'failed' | 'cancelled'
  reviewsScraped: number
  painPointClusters: PainPointCluster[]
  opportunityReport: OpportunityReport
  createdAt: string
  completedAt?: string
}
```

### `UserProfile` + Plan Limits
Plans: `free | starter | pro | agency`

Limit keys (from `packages/types/src/user.ts`):
- `dailySearches` (-1 = unlimited)
- `savedProductsTotal`
- `costCalculations`
- `savedSuppliers`
- `competitorAnalysesPerMonth`

Plan enforcement uses the `increment_usage_counter(userId, key, period)` RPC which
atomically increments a row in `usage_counters` and returns the new count.
Edge functions compare the count against `PLAN_LIMITS[plan][key]`.

---

## Database Schema

See `supabase/migrations/` for full SQL. Migrations run in strict dependency order.

### Global Catalog Tables (shared across all users, written by service role)

| Table | Purpose |
|-------|---------|
| `amazon_categories` | 25k+ category tree with `ltree` path, trigram indexes, FBA fee reference, opportunity scores |
| `category_fba_fees` | Versioned referral fee + size tier data per category/marketplace |
| `products` | Global ASIN cache — one row per (asin, marketplace). Includes BSR, price, signals, physical dims. Auto-snapshot trigger on metric changes. Partitioned-history via `product_history` |
| `product_details` | Heavy on-demand detail: description, bullets, variations, seller breakdown |
| `product_history` | Time-series BSR/price/rating snapshots — range-partitioned by year (2025–∞) |
| `suppliers` | Global Alibaba supplier profiles |
| `supplier_products` | Individual Alibaba product listings with MOQ price tiers |
| `product_supplier_matches` | Amazon→Alibaba bridge rows computed by the semantic matching pipeline |
| `fba_fees_cache` | Cached SP-API fee responses (30-day TTL) |
| `market_opportunities` | Global opportunity signals (expiring, refreshed by cron) |
| `trend_signals` | BSR/review velocity signals (24-hour TTL) |

### User-Owned Tables (RLS: `user_id = auth.uid()`)

| Table | Purpose |
|-------|---------|
| `profiles` | Extends `auth.users` — plan, Stripe IDs, preferences JSONB, onboarding status |
| `usage_counters` | Atomic plan limit counters — one row per (user, key, period_start) |
| `onboarding_steps` | Wizard state machine — one row per (user, step enum) |
| `workspaces` | Named research boards (Free: 1, Paid: unlimited) |
| `collections` | Product groupings within a workspace |
| `tracked_products` | User → global `products` link. Includes alert thresholds, stage, notes, tags |
| `tracked_keywords` | Saved keyword searches with marketplace scope |
| `saved_suppliers` | User → global `suppliers` link with notes/tags/linked product |
| `supplier_inquiries` | CRM-lite negotiation log per supplier |
| `cost_calculations` | Stored calculator runs with full JSONB input+result + denormalised summary fields |
| `calculation_templates` | Reusable input presets (e.g. "Standard Air Freight from China") |
| `competitor_analyses` | Async job rows with progress counters and status enum |
| `pain_point_clusters` | NLP review clusters attached to a competitor_analysis |
| `opportunity_reports` | Structured report generated on analysis completion |
| `notifications` | In-app notification centre (price alerts, BSR spikes, analysis done) |
| `notification_preferences` | Per-user channel + type preferences |
| `search_history` | Append-only query log for suggestions and analytics |

### Embedding Tables (service writes, authenticated reads)

| Table | Source text | Use case |
|-------|-------------|----------|
| `category_embeddings` | `name + full_path` | Semantic category search |
| `product_embeddings` | `title + brand + bullet_points` | Semantic product search, "find similar" |
| `review_embeddings` | Individual review bodies | Competitor NLP clustering |
| `supplier_embeddings` | `title + categories + keywords` | Amazon→Alibaba supplier matching |

All HNSW indexes use cosine distance (`vector_cosine_ops`, m=16, ef_construction=64).

---

## Key Enums

| Enum | Values |
|------|--------|
| `marketplace` | `US CA MX BR UK DE FR IT ES NL SE PL TR AE SA IN JP AU SG` |
| `plan_type` | `free starter pro agency` |
| `job_status` | `pending queued processing complete failed cancelled` |
| `shipping_method` | `air sea express lcl` |
| `competition_level` | `low medium high very_high` |
| `opportunity_type` | `pain_gap price_gap review_gap bsr_trend niche_entry seasonal` |
| `notification_type` | `price_drop bsr_spike bsr_drop analysis_complete plan_limit system opportunity supplier_match` |
| `onboarding_step` | `marketplace niche business_model goals first_search save_product run_calculator complete` |
| `match_method` | `semantic keyword manual sp_api` |
