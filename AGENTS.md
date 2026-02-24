# Silkflow — Agent Entry Point

> **Start here.** This file is the navigation hub for every AI coding agent
> working in this repository. Read this first, then follow the links below.

---

## What is this project?

**Silkflow** is an Amazon FBA product research SaaS (competitor to Helium 10 /
Jungle Scout). It helps Amazon sellers discover products, analyse competitors,
calculate landed costs, and source from Alibaba suppliers.

---

## All Agent Files Live in `agents/`

| Document | Purpose |
|----------|---------|
| [`agents/PROJECT.md`](agents/PROJECT.md) | Conventions, patterns, gotchas — single source of truth for agents |
| [`agents/skills/design-system.md`](agents/skills/design-system.md) | Design tokens, layout primitives, **zero border-radius rule** |
| [`agents/skills/component-patterns.md`](agents/skills/component-patterns.md) | Mandatory component rules, file placement, atomic hierarchy |
| [`agents/skills/forms.md`](agents/skills/forms.md) | Form patterns with `useForm` + Zod |
| [`agents/skills/data-fetching.md`](agents/skills/data-fetching.md) | TanStack Query patterns |
| [`agents/skills/vercel-react-best-practices/SKILL.md`](agents/skills/vercel-react-best-practices/SKILL.md) | React/performance skill pack |
| [`agents/skills/vercel-composition-patterns/SKILL.md`](agents/skills/vercel-composition-patterns/SKILL.md) | React composition patterns |
| [`agents/skills/web-design-guidelines/SKILL.md`](agents/skills/web-design-guidelines/SKILL.md) | Web design + accessibility |

---

## Architecture at a Glance

```
Browser (React + Vite PWA)
  └─ TanStack Router v1 (file-based)  ·  TanStack Query  ·  Supabase JS
        │                                     │
        │  lib/scraper.ts                      │  lib/supabase.ts
        │  (direct HTTP to Python)             │  (direct DB queries)
        ▼                                      ▼
  Python FastAPI on Fly.io :8000         Supabase PostgreSQL
    Playwright pool + stealth              (RLS tables, product catalog)
    OpenAI embeddings
    SP-API via boto3
        │
  Supabase DB (upsert product cache, analysis results)
```

**3 remaining Supabase Edge Functions** (everything else goes direct):
- `tracker-products` — list / save / update / delete tracked products
- `on-user-created` — provision workspace + plan row on signup
- `stripe-webhook` — handle Stripe billing events

Full details → [`agents/ARCHITECTURE.md`](agents/ARCHITECTURE.md)

---

## Repository Structure

```
agents/           ALL agent reference docs and skills (THIS is your folder)
apps/
  web/            React+Vite PWA (primary frontend)
  scraper/        Python FastAPI on Fly.io
  extension/      Chrome MV3 extension (not started)
packages/
  types/          @repo/types        shared TypeScript types (snake_case, 1:1 Python)
  zod-schemas/    @repo/zod-schemas  Zod runtime schemas
  ui/             @repo/ui           shared React components
  utils/          @repo/utils        shared utilities
supabase/
  functions/      3 active Deno Edge Functions (tracker-products, on-user-created, stripe-webhook)
  migrations/     SQL migrations 00001–00012
```

---

## Critical Rules — Never Violate

1. **Zero border-radius** everywhere, no exceptions.
2. **CSS variables only** — never hardcode hex values in component code.
3. **`@tabler/icons-react` only** — no other icon libraries.
4. **All layout via `Stack` / `Row` / `Grid`** — no raw `style={{ display, flex, gap }}`.
5. **No `useEffect` + `fetch`** — always `useQuery` / `useMutation` from TanStack Query.
6. **All user-visible strings keyed in i18n** — `useT()`, never hardcoded strings.
7. **Plan limits via `increment_usage_counter()` RPC** — never update `profiles` counters directly.
8. **Import types from `@repo/types`** — never redefine locally.
9. **`tracked_products` not `saved_products`** — the old table no longer exists.
10. **Types are snake_case** — `@repo/types` matches Python backend field names exactly (e.g. `review_count`, `image_url`, `bsr_category`).
11. **Direct scraper calls** — use `lib/scraper.ts` for data. Do **not** create new edge functions for scraping.

---

## API Routing Rules

| Data needed | How to get it |
|-------------|---------------|
| Amazon search results | `scraper.post('/scrape/amazon/search', ...)` |
| Amazon product detail | `scraper.post('/scrape/amazon/product', ...)` |
| Alibaba supplier search | `scraper.post('/scrape/alibaba/search', ...)` |
| SP-API lookup / fees | `scraper.post('/sp-api/lookup', ...)` |
| Competitor analysis | `scraper.post('/scrape/amazon/competitor-analyze', ...)` |
| Category tree / search | direct `supabase` client query on `amazon_categories` |
| Tracked products | `api` (edge fn) → `/tracker-products` |
| User / plan data | direct `supabase` client |

---

## MVP Implementation Status

### ✅ Implemented / Working
- Auth flows (login, signup, OAuth, forgot/reset password)
- App shell (AppShell, Sidebar, Topbar, PageContainer)
- Research page — SP-API lookup tab + search tab scaffold
- Product Analyzer routes
- Design system tokens, building blocks (typography, layout, Button)
- Python scraper: Amazon search/detail, Alibaba search, competitor analysis, categories, SP-API
- Auth middleware (`auth.py`) + plan enforcement (`plan_gate.py`) in Python
- All 12 DB migrations (schema complete)
- Shared packages: `@repo/types`, `@repo/zod-schemas`, `@repo/ui`, `@repo/utils`
- i18n namespace files for all modules (en + es)
- All hooks: `useAmazonSearch`, `useSuppliersSearch`, `useCostEstimate`, `useCompetitorIntel`, `useCategoriesTree`, `useSpApiLookup`, `useTrackerProducts`
- `browser.py` stealth patches (playwright-stealth + randomised UA/viewport/delays)

### 🔶 Route Exists, Components Are Stubs
- **Tracker** — `ProductList`, `ProductComparator`, `SnapshotChart` exist
- **Cost Calculator** — `CostWizard`, `CostBreakdownPanel`, `ROISummaryCard` exist
- **Competitor Intel** — `AnalysisForm`, `AnalysisStatusBar`, `PainPointList`, `OpportunityReport` exist
- **Sourcing** — `SupplierList`, `SupplierCard` exist
- **Categories** — `CategoryTree`, `NicheCard`, `CategoryNodeItem` exist
- **Settings** — heading placeholder only
- **Dashboard (`/`)** — heading placeholder only

### ❌ Not Yet Started
- Onboarding wizard
- Notifications centre UI
- Chrome extension UI
- Stripe billing UI

---

## How to Add/Extend Things

### New page module
1. Route: `apps/web/src/routes/<path>/index.tsx`
2. Page components: `apps/web/src/pages/<module>/components/`
3. Hook: `apps/web/src/hooks/use<ModuleName>.ts`
4. i18n: add keys to `apps/web/src/locales/en/<namespace>.json` + `es/`
5. Nav: add to `apps/web/src/components/layout/Sidebar.tsx`

### New Python endpoint
1. `apps/scraper/app/routers/<name>.py` — FastAPI router
2. Add Pydantic model in `apps/scraper/app/models/`
3. Register in `apps/scraper/app/main.py`
4. Wire hook in `apps/web/src/hooks/`

### New shared type
1. Add **snake_case** interface to `packages/types/src/<file>.ts` matching Python model exactly
2. Re-export from `packages/types/src/index.ts` (auto via `export *`)

---

## Useful References

| Topic | File |
|-------|------|
| API endpoint shapes | [`agents/API_CONTRACTS.md`](agents/API_CONTRACTS.md) |
| DB tables & TypeScript types | [`agents/DATA_MODELS.md`](agents/DATA_MODELS.md) |
| DB triggers & cron jobs | [`agents/ARCHITECTURE.md`](agents/ARCHITECTURE.md) |
| Scraper strategy | [`agents/SCRAPER_STRATEGY.md`](agents/SCRAPER_STRATEGY.md) |
| Deployment | [`agents/DEPLOYMENT.md`](agents/DEPLOYMENT.md) |
