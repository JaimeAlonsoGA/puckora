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

**Query layer.** All TanStack Query definitions live in `queries/`. Never define `queryKey` or `queryFn` inline. Never import `useQueryClient` in a component — use domain invalidation hooks (e.g. `useInvalidateProfile()`).

**Token system.** Only semantic tailwind syntax utility tokens (`surface-*`, `text-*`, `border-*`, `brand-*`, `space-*`). Never raw `--sf-*` or `var(--*)` in components.

**Building blocks only.** Use `Surface`, `Button`, `Stack`, `Alert`, `Badge` etc. from `packages/ui/src/`. No raw `<div>`, `<p>`, `<span>`, `<input>` etc. with hardcoded colors or spacing.

**Server Actions over fetch.** For mutations: Server Action + `useFormAction` hook. Not manual `fetch` + `useState`.

**Forms.** Schema in `schemas/`. Hook: `useFormAction(Schema, action, { defaultValues?, onSuccess? })`. Error: `<Alert variant="error">`.

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
