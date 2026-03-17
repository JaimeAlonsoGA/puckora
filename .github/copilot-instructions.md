# puckora — Copilot Instructions

Monorepo: `apps/web` (Next.js 16), `apps/scraper` (Node), `apps/extension` (Chrome). Work only in scope.

## Stack (web)
Next.js 16 · React 19 · TypeScript 5.8 · Tailwind v4 · Supabase SSR · TanStack Query v5 · next-intl v4 · react-hook-form + Zod v3

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

## Full reference
See `AGENTS.md` at repo root.
