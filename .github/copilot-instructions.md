# puckora — Copilot Instructions

Monorepo: `apps/web` (Next.js 16), `apps/scraper` (Node), `apps/extension` (Chrome), shared packages including `packages/db`, `packages/sp-api`, and `packages/vectors`. Work only in scope.

## Stack (web)
Next.js 16 · React 19 · TypeScript 5.8 · Tailwind v4 · Supabase SSR · TanStack Query v5 · next-intl v4 · react-hook-form + Zod v3

## Data architecture

- Supabase Postgres = auth, users, scrape jobs, realtime-driven app state
- Fly.io Postgres = canonical catalog data (`amazon_*`, `gs_*`, `product_category_ranks`, `product_financials`)
- Local / tailnet Postgres + `pgvector` = derived semantic-search index owned by `packages/vectors`
- `DATABASE_PROXY_URL` is the preferred local-dev override for Fly access when a local `fly proxy` tunnel is running
- Vector operations are package-owned: use root `vectors:*` scripts or `packages/vectors/scripts/*`, never scraper-local wrappers

## Non-negotiable rules

**SSR-first.** Server Components by default. `'use client'` only for the minimal interactive surface. Pass server data as props down to client islands — never re-fetch on client what the server already computed.

**No hardcoded strings.** Route paths → `AppRoute.{name}` (`constants/routes.ts`). Error messages → `API_ERROR_MESSAGES` / `SERVICE_ERROR_PREFIXES` (`constants/api.ts`). Validation messages → `AUTH_VALIDATION_MESSAGES` / `SCRAPE_VALIDATION_MESSAGES` (`constants/validation.ts`). UI strings → `t('key')` from `next-intl`. Magic numbers → named const in `constants/`. Never inline.

**Const-as-enum (no TypeScript `enum`).** Always: `as const` object + `_VALUES` array + derived union type. Example: `MARK_STATES` object → `MARK_STATE_VALUES` array → `type MarkState = (typeof MARK_STATE_VALUES)[number]`. Values array enables `.map()`, `.includes()`, `z.enum()`. Exhaustive maps use `Record<TheUnionType, Value>` — TypeScript errors on missing key.

**Derived types — never manually mirror.** `type AppRoutePath = (typeof AppRoute)[keyof typeof AppRoute]`. `type SearchInput = z.infer<typeof SearchSchema>`. If derivable, derive it.

**Zod schemas as validation SSOT.** `schemas/{domain}.ts` — no React, no server imports. Same schema for: form `zodResolver`, server action body, API route body. Error messages injected from `constants/validation.ts`.

**One source, many consumers.** Any value defined in more than one place is a violation. Route → `AppRoute`. Error → `API_ERROR_MESSAGES`. Mark state → `MARK_STATES`. Stop and add a constant when you spot duplication.

**Query layer.** All TanStack Query definitions live in `queries/`. Never define `queryKey` or `queryFn` inline. Never import `useQueryClient` in a component — use domain invalidation hooks (e.g. `useInvalidateProfile()`). Every new `queries/{domain}.ts` must be re-exported in `queries/index.ts` — missing re-exports silently break all barrel consumers.

**Token system.** Only semantic tailwind syntax utility tokens (`surface-*`, `text-*`, `border-*`, `brand-*`, `space-*`). Never raw `--sf-*` or `var(--*)` in components.

**Building blocks only.** Use `Surface`, `Button`, `Stack`, `Alert`, `Badge` etc. from `packages/ui/src/`. No raw `<div>`, `<p>`, `<span>`, `<input>` etc. with hardcoded colors or spacing.

**Server Actions over fetch.** For mutations: Server Action + `useFormAction` hook. Not manual `fetch` + `useState`.

**Forms.** Schema in `schemas/`. Hook: `useFormAction(Schema, action, { defaultValues?, onSuccess? })`. Error: `<Alert variant="error">`.

**Parallel async.** Independent `await` calls in server functions → `Promise.all`. Cross-DB server actions (Supabase + Fly.io) → `Promise.all`. Batch DB writes in API routes / background pipelines → `Promise.allSettled`, never `for...await`. SP-API / third-party catalog fetches remain sequential (rate limits). Non-urgent UI updates (search, navigation) → `startTransition`.

**Re-render optimization.** List row components → `memo(Row)`. Per-row store selectors only — never subscribe to the full collection at parent level for per-item fields. Parent handler callbacks → `useCallback` with empty deps + `Store.getState()` reads (not reactive subscription). Transient local-state reads in handlers → `useLayoutEffect` ref sync (never `ref.current = x` during render).

**Error constants SSOT.** All HTTP status codes, API error messages, and service error prefixes live in `constants/api.ts`. Never define local error string constants in route handlers, services, or background pipelines.

**File placement:**
- Page = `app/(app)/{module}/page.tsx` — Server Component
- Client island = `app/(app)/{module}/_components/*.tsx` — `'use client'`
- Server data = `server/{domain}.ts` — `React.cache()` wrapped
- DB CRUD = `services/{domain}.ts`
- Mutations = `queries/{domain}.ts` — `useMutation` + internal `invalidateQueries`
- Constants = `constants/routes.ts`, `constants/plans.ts`, `constants/cookies.ts`
- External APIs = `integrations/{vendor}/`
- App types = `types/{domain}.ts`

**imports:** `@/` for web-app internal, `@puckora/types`, `@puckora/utils`, `@puckora/ui` for packages.

**Vector boundary:** `packages/vectors` owns sync, watch, batch, backfill, status, and query tooling. `apps/scraper` produces source data in Fly; it does not own vector CLIs.

## Full reference
See `AGENTS.md` at repo root.
