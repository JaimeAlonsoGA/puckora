# ASIN Product Page — Architecture & Agentic Fetching Strategy

> Case study: how the `/search/asin/[asin]` module achieves SSR-first rendering,
> background enrichment, and client-side polling without redundant network calls.

---

## 1. Data Systems Used

| Need                                            | System                   | Access path                                                                         |
| ----------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------- |
| Auth / user profile                             | Supabase                 | `getCachedUser()` → `server/users.ts`                                               |
| Product data (pricing, fees, velocity, revenue) | Fly.io Postgres          | `getCachedProductByAsin()` → `server/amazon-product.ts`                             |
| Enrichment trigger (BPM repair + SP-API)        | Fly.io Postgres + SP-API | `cachedGetProductByAsin()` → `server/products.ts` → `after()`                       |
| Related products (semantic similarity)          | pgvector                 | `searchAmazonProductsByAsin()` → `@puckora/vectors` → `/api/search/product/similar` |

---

## 2. Fetching Strategy

### Phase 1 — SSR (Server Component)

```
page.tsx (Server Component)
  └─ Suspense fallback=<SearchResultsSkeleton>
       └─ SearchAsinContent (async Server Component)
            ├─ getCachedUser()                          ← React.cache, reads cookie
            ├─ getCachedProductByAsin(asin, marketplace) ← ProductFinancial | null (Fly read)
            └─ cachedGetProductByAsin(asin)              ← AmazonProduct | null
                 └─ after() → background:
                      ├─ BPM repair if bought_past_month == null
                      └─ SP-API enrichment if scrape_status == 'scraped' | 'enrichment_failed'
```

- Both product fetches run in `Promise.all` — zero sequential latency.
- `after()` fires enrichment **after** the HTTP response is flushed — the user gets HTML immediately.
- `React.cache()` deduplicates identical calls within the same request.

### Phase 2 — Client Hydration (Shell)

```
ProductShell ('use client')
  ├─ useProductResearchGraph(title, asin, query)  ← tracks visit in research graph
  └─ useQuery({
         ...amazonProductQueryOptions(asin, marketplace),
         initialData: product,      ← seeds cache with SSR data (no loading flash)
         refetchInterval: (q) =>     ← polls while monthly_revenue or bought_past_month is null
             isEnriched(q.state.data) ? false : SEARCH_POLL_INTERVAL_MS.ENRICHMENT_RESULTS,
     })
```

- `initialData` seeds TanStack cache directly from the SSR prop — no extra fetch on mount.
- `refetchInterval` returns `false` when data is complete (enrichment done), halting the poll.
- If enrichment never completes (SP-API unavailable), polling continues but is cheap (DB read).

### Phase 3 — Related Products (Client-only, Non-blocking)

```
RelatedProducts ('use client')
  └─ useQuery(similarProductsQueryOptions(asin))   ← hits /api/search/product/similar
       └─ searchAmazonProductsByAsin(asin)          ← pgvector cosine similarity
```

- Rendered in sidebar — never blocks the critical path.
- Independent staleTime: 10 minutes (vectors rarely change).
- Shown as skeleton while loading, empty state if no results.

---

## 3. Component Hierarchy

```
page.tsx                     ← Server Component — data owner
└─ ProductShell              ← 'use client' — orchestrator, ≤70 lines, no markup
   ├─ ProductNotFound         ← 'use client' — fallback when product is null
   └─ ProductView             ← pure — layout layout layout
        ├─ toolbar            ←   back button + FBA badge + CTA buttons
        └─ OverviewLayout
             ├─ OverviewSidebar
             │    ├─ ProductResearch    ← 'use client' — mark state + notes (store)
             │    ├─ CertificationSignals ← pure — from certification-signals.tsx
             │    └─ RelatedProducts   ← 'use client' — vector search query
             └─ OverviewMain
                  └─ OverviewMainContent
                       ├─ ProductHeader      ← 'use client' — image + identity + mark badge
                       ├─ ProductKpis        ← pure — 6-KPI animated grid
                       ├─ (grid 2-col)
                       │    ├─ ProductEconomics  ← pure — fee waterfall
                       │    └─ ProductPosition   ← pure — market position
                       ├─ ProductLogistics   ← pure — dims + Package3D
                       └─ ProductBullets     ← pure — SP-API bullet points
```

---

## 4. Enrichment Lifecycle

```
User visits /search/asin/B0XXXXXXXX
  │
  ├─ (SSR) getCachedProductByAsin(asin)
  │         └─ after() fires → BPM repair or SP-API enrich
  │
  └─ (CLIENT) ProductShell mounts
              ├─ cache seeded with SSR data (initialData)
              ├─ monthly_revenue == null? → poll every 5 s
              └─ background enrichment writes to Fly DB
                   → next poll returns complete data
                   → refetchInterval → false → poll stops
                   → KPIs animate to new values (AnimatedMonoNumber)
```

**Key invariant:** The client never redundantly re-fetches data the server already computed.
The SSR pass is always authoritative. The client poll adds real-time enrichment updates only.

---

## 5. Agentic Implementation Rules for This Module

When extending the ASIN product page, follow these rules in order:

1. **New data field?** → Check `ProductFinancial` in `@puckora/types` first. If it's there, read it from the existing `product` prop. Never add a new server fetch for fields that already exist in `ProductFinancial`.

2. **New data source needed?** → Add to `server/products.ts` or `server/amazon-product.ts` using `React.cache()`. Run it in the `SearchAsinContent Promise.all` in `page.tsx`.

3. **New client-side query?** → Add to `queries/`, key to `queries/_keys.ts`, re-export from `queries/index.ts`. Never define queryKey/queryFn inline in a component.

4. **New API endpoint?** → Clone from `app/api/search/product/route.ts`. Auth check first, then DB call. Return `NextResponse.json(data, { headers: NO_STORE_HEADERS })`.

5. **New sub-component?** → Add to `_components/`. If it uses hooks → `'use client'`. Sub-component owns its own `useTranslations()` call. Never pass translated strings down as props.

6. **New i18n key?** → Add to both `i18n/messages/en/product.json` AND `i18n/messages/es/product.json` in the same commit.

7. **New constant?** → Add to `constants/search.ts` if it's search-related. Never hardcode a number in component logic.

8. **Store access?** → Use per-item selector: `useAppStore(s => s.markedProducts?.[asin]?.markState ?? null)`. Never subscribe to the full `markedProducts` object in any component that renders in a list.

9. **Performance invariant for list views** → Any component that renders multiple rows of product data must: `memo()` the row, use per-row store selectors, empty-dep `useCallback` + `Store.getState()` reads, and `useLayoutEffect` for transient ref sync.

---