# Agent Context

> **Navigation hub for agents:** [`/AGENTS.md`](/AGENTS.md) — read that first for the
> full project map, MVP status, and all mandatory rules condensed in one place.

This document is the primary reference for AI coding agents working on Silkflow.

## What is Silkflow?

Silkflow is an Amazon FBA product research SaaS — a competitor to Helium 10 and Jungle Scout.
It helps Amazon sellers discover products, analyse competitors, calculate costs, and source suppliers.

## Monorepo Structure

```
silkflow/
├── apps/
│   ├── web/          React+Vite PWA frontend
│   ├── scraper/      Python FastAPI scraper on Fly.io
│   └── extension/    Chrome MV3 extension
├── packages/
│   ├── types/        @repo/types        — shared TypeScript types
│   ├── zod-schemas/  @repo/zod-schemas  — Zod runtime validation
│   ├── ui/           @repo/ui           — shared React components
│   ├── utils/        @repo/utils        — shared utilities
│   ├── eslint-config/
│   └── typescript-config/
├── supabase/
│   ├── functions/    Deno Edge Functions (12 functions)
│   └── migrations/   SQL migrations (00001–00012)
└── agents/           You are here (PROJECT.md, API_CONTRACTS.md, DATA_MODELS.md, ARCHITECTURE.md, SCRAPER_STRATEGY.md, DEPLOYMENT.md, skills/)
```

## Agent Skills Docs

Detailed coding patterns live in:
- `apps/web/.agent/skills/design-system.md` — **read this first** — tokens, components, layout primitives, design constraints
- `apps/web/.agent/skills/component-patterns.md` — component architecture, mandatory coding rules, checklist
- `apps/web/.agent/skills/forms.md` — form patterns with Zod + useForm hook
- `apps/web/.agent/skills/data-fetching.md` — TanStack Query patterns
- `.agents/skills/` — React best practices, web design guidelines

---

## Key Conventions

### Frontend
- **Router**: TanStack Router v1, file-based at `apps/web/src/routes/`. Auto-generates `routeTree.gen.ts`.
- **Icons**: ONLY use `@tabler/icons-react`. No other icon libraries.
- **Styling**: Tailwind utility classes + CSS variables from `globals.css`. **Zero border-radius everywhere** — no exceptions. All colors via `--sf-*` tokens (see `design-system.md`). All layout via `Stack` / `Row` / `Grid` building blocks — no raw `style={{ display, gap, flex }}`.
- **Forms**: Use `useForm` hook from `src/hooks/useForm.ts` + Zod schemas from `@repo/zod-schemas`.
- **Data fetching**: Always `useQuery` / `useMutation` from `@tanstack/react-query`. Never `useEffect` + `fetch`.
- **i18n**: Use `useTranslation()` from `react-i18next`. All user-visible strings must be keyed in `locales/en.json`.
- **Type imports**: Import types from `@repo/types` — never redefine them locally.
- **Plan check**: Always use `plan_type` enum values `free | starter | pro | agency` (not `business`).

### Edge Functions (Deno)
- All functions follow the standard pattern in `supabase/functions/_shared/`.
- `validateAuth(supabase)` must be called before any data access.
- For metered operations: call `increment_usage_counter(userId, key, period)` RPC, then compare to `PLAN_LIMITS`.
  - **Do NOT** update `profiles.searches_today` or any counter column on `profiles` — those don't exist anymore.
  - Counter keys: `daily_searches`, `monthly_competitor_analyses`, `daily_cost_calcs`, `daily_supplier_searches`
- Return `ok(data)` or `err(e)` from `_shared/response.ts`.

### Python Scraper
- All request/response models use Pydantic v2 in `apps/scraper/app/models/`.
- Use `async with get_page() as page:` from `app/core/browser.py` for all Playwright work.
- Return typed Pydantic models from scraper functions (not raw dicts).
- When upserting to `products`: always use `ON CONFLICT (asin, marketplace) DO UPDATE` — never INSERT alone.
- After writing supplier products, queue embedding generation for the `supplier_embeddings` table.

### Database
- **Tracked products**: `tracked_products` (not `saved_products` — that table no longer exists).
- **Saved suppliers**: `saved_suppliers` links to global `suppliers` table via `supplier_id UUID`.
- **Product history**: `product_history` is a partitioned table — query with `WHERE snapshot_at BETWEEN ...` always.
- **Plan enforcement**: use `increment_usage_counter()` RPC — it is `SECURITY DEFINER` and safe under concurrency.
- **Notifications**: insert via service role into `notifications` — the DB triggers handle price/BSR alerts automatically.
- **Categories**: use `upsert_category()` function when loading CSV data. Never raw INSERT.

---

## Common Patterns

### Add a new Edge Function
1. Create `supabase/functions/<name>/index.ts`
2. Copy the standard boilerplate from `products-search/index.ts`
3. Call `validateAuth()` + `increment_usage_counter()` if metered
4. Add the route call to `apps/web/src/lib/api.ts`
5. Add a corresponding `useQuery` / `useMutation` hook

### Add a new page/module
1. Create route at `apps/web/src/routes/<path>/index.tsx`
2. Add page components to `apps/web/src/pages/<module>/`
3. Add i18n keys to `locales/en.json` + `locales/es.json`
4. Add nav link to `apps/web/src/components/layout/Sidebar.tsx`

### Add a new type
1. Add to appropriate file in `packages/types/src/`
2. Add Zod schema to `packages/zod-schemas/src/`
3. Re-export from `packages/types/src/index.ts`

### Track a product for a user
```typescript
// Never duplicate product data — always point to the global products table
await supabase.from('tracked_products').upsert({
  user_id: userId,
  product_id: globalProductId,  // UUID from products table
  notes, tags, stage,
  price_alert_below, bsr_alert_above,
  tracked_price: product.price,  // snapshot at time of tracking
  tracked_bsr:   product.bsr,
}, { onConflict: 'user_id,product_id' })
```

### Check plan limit
```typescript
const { data: count } = await supabase.rpc('increment_usage_counter', {
  p_user_id: userId,
  p_key: 'daily_searches',
  p_period: 'daily',
})
if (count > PLAN_LIMITS[plan].dailySearches && PLAN_LIMITS[plan].dailySearches !== -1) {
  return err('PLAN_LIMIT_EXCEEDED')
}
```

---

## Design System — "The Seal" (v2)

> Full reference: `apps/web/.agent/skills/design-system.md`

**Theme**: light white base.

| Role | Token | Value |
|------|-------|-------|
| Page background | `--sf-bg` | `#FFFFFF` |
| Card surface | `--sf-surface` | `#F7F7F4` |
| Inset surface | `--sf-surface-alt` | `#F0EFE9` |
| Primary accent (gold) | `--sf-gold` | `#A67C00` |
| Secondary accent | `--sf-scarlet` | `#C0152A` |
| Tertiary accent | `--sf-purple` | `#6B1D8A` |
| Borders (ultramarine) | `--sf-border` | `rgba(55,48,163,0.15)` |
| Primary text | `--sf-text` | `#111111` |

**Hard constraints — never violate:**
- **Zero border-radius** on all elements, no exceptions
- **CSS variables only** — never hardcode hex in component code
- **Ultramarine borders only** — `--sf-border` / `--sf-border-strong` exclusively
- **Hover transitions only on action buttons** — never on containers, cards or badges
- **8px spacing grid** — all gaps/padding via Tailwind scale or named `Gap` presets

**Two-layer token system (Tailwind v4):**
- Layer 1 `--sf-*` in `:root` — source-of-truth values
- Layer 2 `--color-*` aliases in `@theme {}` — produce Tailwind utility classes:
  `text-text-primary`, `bg-surface-secondary`, `text-accent-primary`, `border-border`, etc.

**Building blocks to use in all app code:**

| Need | Import |
|------|--------|
| Text | `Display` `Heading` `Subheading` `Body` `Small` `Caption` `Label` `Mono` from `@/components/building-blocks/typography` |
| Button | `Button` from `@/components/building-blocks/Button` |
| Layout | `Stack` `Row` `Grid` from `@/components/building-blocks/layout` |
| UI components | `SilkCard` `SilkButton` `SilkBadge` `KPICard` `SilkInput` etc. from `@repo/ui` |

**Chart palette exception**: Recharts resolves `fill`/`stroke` before CSS vars are available. All 4 chart components (`SilkAreaChart`, `SilkBarChart`, `SilkRadarChart`, `SilkDonutChart`) use literal hex values in `CHART_PALETTE` inside `packages/ui/src/theme/tokens.ts`. This is the **only** permitted place for hardcoded hex — it mirrors `--sf-*` exactly. Do not add hardcoded hex anywhere else.

---

## Caveats & Gotchas

- `routeTree.gen.ts` is auto-generated by TanStack Router on `npm run dev`. Do not edit manually.
- `supabase/types.ts` is a stub — run `npm run gen:types` after any migration change.
- SP-API and Keepa integrations are stubs — see `agents/SCRAPER_STRATEGY.md` for production notes.
- `product_history` is partitioned — queries without a `snapshot_at` range will scan all partitions.
- `amazon_categories.ltree_path` requires the `ltree` extension (enabled in migration 00001).
- The `handle_new_user` trigger runs on `auth.users` insert. Do NOT manually insert into `profiles` without a matching `auth.users` row in production.
- `usage_counters` rows are created lazily by the `increment_usage_counter` RPC. Never assume a row exists.
