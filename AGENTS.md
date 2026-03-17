# puckora — Agent Reference

> Model: Claude Sonnet 4.6 · Stack: Next.js 16 · React 19 · TS 5.8 · Tailwind v4 · Supabase SSR · TanStack Query v5 · next-intl v4 · react-hook-form + Zod v3
> Monorepo (npm workspaces + Turbo): `apps/web` (main product), `apps/scraper` (Node), `apps/extension` (Chrome). `@/` → `apps/web/` root.
>
> **Three mottos: Use design patterns · NO redundancy · Scalability**
> Every architectural decision is evaluated against these. SSOT, separation of concerns, hierarchical composition — not optional, not "nice to have".

---

## Live references — fetch before working on relevant areas

- Design guidelines: `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`
- React best practices: `apps/web/.agents/skills/vercel-react-best-practices/AGENTS.md`
- Composition patterns (React 19 no-forwardRef etc.): `.github/skills/vercel-composition-patterns/AGENTS.md`
- Next.js App Router: https://nextjs.org/docs
- Supabase SSR: https://supabase.com/docs/guides/auth/server-side/nextjs

---

## Table of contents
- [puckora — Agent Reference](#puckora--agent-reference)
  - [Live references — fetch before working on relevant areas](#live-references--fetch-before-working-on-relevant-areas)
  - [Table of contents](#table-of-contents)
  - [File placement](#file-placement)
  - [SSR-first](#ssr-first)
  - [Shell / Orchestrator pattern](#shell--orchestrator-pattern)
  - [Query layer](#query-layer)
  - [Realtime + cache seeding](#realtime--cache-seeding)
  - [Forms \& mutations](#forms--mutations)
  - [Design system](#design-system)
  - [Theme (dark/light)](#theme-darklight)
  - [Auth \& middleware](#auth--middleware)
  - [i18n](#i18n)
  - [Adding things](#adding-things)
    - [New app module (page + data + UI)](#new-app-module-page--data--ui)
    - [New query domain only](#new-query-domain-only)
    - [New integration (vendor API)](#new-integration-vendor-api)
    - [New schema](#new-schema)
    - [New constant](#new-constant)
  - [Pre-flight checklist](#pre-flight-checklist)

---

## File placement

`@/` resolves to `apps/web/`. Never create a `lib/` folder — each concern has a dedicated home.

| What you're creating             | Where it lives                             | Rules                                                   |
| -------------------------------- | ------------------------------------------ | ------------------------------------------------------- |
| Route / page                     | `app/(app)/{module}/page.tsx`              | Server Component, no `'use client'`                     |
| Interactive UI for a page        | `app/(app)/{module}/_components/*.tsx`     | `'use client'`, receives server data as props           |
| Server data fetch                | `server/{domain}.ts`                       | `import 'server-only'`, `React.cache()` on every export |
| DB CRUD                          | `services/{domain}.ts`                     | Called by `server/` and API routes only                 |
| Query keys + options + mutations | `queries/{domain}.ts` + `queries/_keys.ts` | `'use client'`, re-export from `queries/index.ts`       |
| Zod schema                       | `schemas/{domain}.ts`                      | No React imports                                        |
| Reusable client hook             | `hooks/use-{name}.ts`                      | Thin wrapper over `useQuery(domainQueryOptions(...))`   |
| Vendor API client                | `integrations/{vendor}/client.ts`          | Isolated — no app business logic                        |
| App-wide constant (no deps)      | `constants/{name}.ts`                      | No imports from `server/`, `services/`, `queries/`      |
| App-local type                   | `types/{domain}.ts`                        | Used when `@puckora/types` doesn't yet have it          |
| Reusable UI primitive            | `components/building-blocks/`              | Token-based, no hardcoded colors/spacing                |
| Shared non-primitive component   | `components/shared/`                       | May use building-blocks, no page logic                  |

**Import rules**
- Internal web app: `@/`
- Monorepo packages: `@puckora/types`, `@puckora/utils`, `@puckora/ui`
- Never cross-import between `server/` and client code. `import 'server-only'` enforces this at runtime.

---

## SSR-first

**Default**: every file is a Server Component. Add `'use client'` only when you need browser APIs, hooks, or event handlers.

**Decision rule — should this be a client component?**
1. Does it use `useState`, `useEffect`, `useRef`, or any custom hook? → `'use client'`
2. Does it attach event handlers (`onClick`, `onChange`, etc.)? → `'use client'`
3. Does it read from TanStack Query? → `'use client'`
4. Otherwise → Server Component, no `'use client'`

**Server → Client handoff pattern**
```tsx
// page.tsx (Server Component)
export default async function Page() {
  const user = await getAuthUser()         // React.cache() — no duplicate calls
  const data = await getCachedDomain()
  return <DomainShell user={user} data={data} />
}

// _components/domain-shell.tsx ('use client')
export function DomainShell({ user, data }: Props) {
  // server data arrives as props — never re-fetch what the server already has
  const { data: live } = useQuery(domainQueryOptions())  // client-driven updates only
}
```

**Anti-patterns**
- ❌ `useQuery` in a Server Component
- ❌ `fetch()` inside a client component for data the server already has
- ❌ `'use client'` on a layout or page that has no interactive surface
- ❌ `getSession()` or `getUser()` in middleware — use `getClaims()` (no network round-trip)

---

## Shell / Orchestrator pattern

A "shell" (`{module}-shell.tsx`) is the single `'use client'` boundary that wires state to views. It contains **zero UI markup and zero hardcoded strings**. It routes to pure display components.

**Contract:**
- ≤ 70 lines
- No JSX beyond return-statement dispatching to named sub-components
- No inline `queryKey`/`queryFn`
- No `useQueryClient` — use `useInvalidate{Domain}()` or domain hooks
- No i18n strings — those live in sub-components
- No direct Supabase calls — use `use-scrape-realtime` or similar hooks

**Canonical pattern (search-shell):**
```tsx
'use client'
export function SearchShell({ userId: _userId, initialJobId, initialJob }: SearchShellProps) {
    const { isInstalled, isChecking } = useExtension()
    useScrapeRealtime(initialJobId, initialJob)          // cache seed + Realtime
    const { data: job } = useQuery(scrapeJobQueryOptions(initialJobId))

    if (isChecking) return <ExtensionChecking />         // loading state
    if (!isInstalled) return <ExtensionGate />           // gate state
    if (initialJobId) return <JobProgress job={job ?? initialJob} /> // active job
    return <SearchForm />                                // idle state
}
```

**Sub-component rules:**
- One concern per file: `extension-gate.tsx`, `job-progress.tsx`, `search-form.tsx`
- Each sub-component owns its own `useTranslations('namespace')`
- Each sub-component owns its own form state if it has a form
- Sub-components receive only the props they actually render — no pass-through

---

## Query layer

All TanStack Query logic lives in `queries/`. Components and hooks are consumers only.

**Structure of every domain file (`queries/{domain}.ts`)**
```ts
'use client'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { domainKeys } from './_keys'

// 1. Query options factory — used by hooks and prefetch
export const domainQueryOptions = (param: string) =>
  queryOptions({
    queryKey: domainKeys.list(param),
    queryFn: () => fetchDomain(param),
    staleTime: 60_000,
  })

// 2. Mutation hook — owns useQueryClient, invalidates internally
export function useCreateDomain() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Input) => createDomain(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: domainKeys.all }),
  })
}

// 3. Invalidation helper — for post-server-action cache busting
export function useInvalidateDomain() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: domainKeys.all })
}
```

**Rules**
- `queryKey` and `queryFn` are never defined inline in a component or hook.
- `useQueryClient` is never imported outside `queries/`.
- Components call `useInvalidate{Domain}()` after a server action — not `useQueryClient` directly.
- All key factories live in `queries/_keys.ts`. Never hardcode a key string anywhere else.
- Every new domain must be re-exported from `queries/index.ts`.

**Hook wrappers (`hooks/`)**
```ts
// hooks/use-domain.ts — nothing more than this
export function useDomain(param: string) {
  return useQuery(domainQueryOptions(param))
}
```

---

## Realtime + cache seeding

**Pattern:** Server Component pre-fetches a row → passes as `initialJob` prop → client shell calls `useScrapeRealtime(jobId, initialJob)` → hook seeds cache once + subscribes to `postgres_changes`.

**`useScrapeRealtime` — canonical implementation (`hooks/use-scrape-realtime.ts`)**
```ts
'use client'
export function useScrapeRealtime(jobId: string | null, initialJob: ScrapeJob | null) {
    const queryClient = useQueryClient()

    // One-time cache seed — eliminates loading flash on first render
    useEffect(() => {
        if (jobId && initialJob) {
            queryClient.setQueryData(scrapeKeys.detail(jobId), initialJob)
        }
    }, [jobId])                              // ← intentionally omit queryClient/initialJob

    // Realtime subscription — merges UPDATE payload directly into cache (no re-fetch)
    useEffect(() => {
        if (!jobId) return
        const supabase = createClient()
        const channel = supabase
            .channel(`scrape_job:${jobId}`)
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'scrape_jobs', filter: `id=eq.${jobId}` },
                (payload) => queryClient.setQueryData(scrapeKeys.detail(jobId), payload.new as ScrapeJob),
            )
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [jobId])
}
```

**Rules:**
- `queryClient.setQueryData` with `payload.new` — never `invalidateQueries` in a Realtime handler (avoids extra round-trip)
- The polling `queryOptions.refetchInterval` on `scrapeJobQueryOptions` acts as safety-net alongside Realtime
- Every domain with a live row follows this dual-track pattern
- `useQueryClient` inside this hook is the only exception to the "no useQueryClient outside queries/" rule — it's a data-layer hook, not a component

---

## Forms & mutations

**Form flow** (client form → server action → cache invalidation)
```
schemas/{domain}.ts  →  useFormAction(Schema, action, opts)  →  app/**/actions.ts
                                                                       ↓ success
                                                             useInvalidate{Domain}() + router.refresh()
```

**`useFormAction` signature**
```ts
const { form, onSubmit, serverError, isPending } = useFormAction(Schema, serverAction, {
  defaultValues?: Partial<z.infer<typeof Schema>>,
  onSuccess?: () => void,
})
```
- `isPending` → pass as `loading` to `<Button>`
- `serverError` → render as `<Alert variant="error">{serverError}</Alert>`
- `zodResolver(schema as any)` — required cast, do not remove

**Server Action contract**
```ts
'use server'
export async function doSomething(data: z.infer<typeof Schema>): Promise<{ error: string } | void> {
  // validate → mutate → redirect() on success, return { error } on failure
}
```

**Form components** (`components/form/`)
- `FormField` wraps label + error. Always use it — never a bare `<label>`.
- React 19 style: `ref` as plain prop, no `forwardRef`.

---

## Design system

**Token contract — two layers, never skip semantic**

| Layer    | Prefix                                                                                      | Usage                                            |
| -------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Raw      | `--sf-*`                                                                                    | Source palette. **Never used in component CSS.** |
| Semantic | `--surface-*` `--text-*` `--border-*` `--brand-*` `--space-*` `--radius-*` `--transition-*` | The only layer components may reference.         |

**Spacing** — 4px base: `--space-1` = 4px, `--space-2` = 8px … `--space-24` = 96px.
**Radius** — zero policy: `--radius-sm/md/lg` = 0px. Only `--radius-full` = 9999px (pills, avatars).
**Typography** — `--text-xs` (12px) through `--text-5xl` (48px).

**Building-block components** (import from `@puckora/ui`)

**Primitive building blocks:**

| Component  | Key props                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| `Button`   | `variant` (primary/secondary/ghost/danger/outline) · `size` (sm/md/lg) · `loading` · `fullWidth` · `href` |
| `Stack`    | `gap` (1–16 or none) · `direction` (column/row) · `align` · `justify`                                     |
| `Surface`  | `variant` (base/card/secondary) · `padding` (none/sm/md/lg/xl) · `border` (none/default/strong)           |
| `Badge`    | `variant` (default/brand/success/warning/error/info) · `size` (sm/md)                                     |
| `Alert`    | `variant` (success/warning/error/info) · `title?`                                                         |
| `TextLink` | `href` · `variant` · `underline` (always/hover/never) · `external`                                        |
| `Icon`     | `size` (xs/sm/md/lg/xl)                                                                                   |
| Typography | `Display` `Heading` `Subheading` `Body` `Caption` `Label` `Mono` — all accept `as` prop                  |

**Composite building blocks — own their complete spatial contract:**

| Component        | Spatial contract (never repeat in consumer)                              | Key props                                              |
| ---------------- | ------------------------------------------------------------------------ | ------------------------------------------------------ |
| `DataCard`       | `border-hairline rounded-lg px-3.5 py-3 bg-background flex flex-col`    | `title?` (renders section label), `className?`         |
| `KpiCard`        | `bg-card rounded-md px-3 py-2.5 flex flex-col` + label/value/sub layout | `label` `value` `sub?` `accent?` `valueClassName?`     |
| `StatItem`       | `flex flex-col gap-px` + label(Caption)/value(Mono sm)/sub(Caption xs)  | `label` `value` `sub?` `accent?` `valueClassName?`     |
| `CardHeader`     | `mb-5 flex flex-col gap-1` + Subheading + Body sm                       | `title` `description?` `className?`                    |
| `ListToolbar`    | `flex shrink-0 flex-wrap items-center gap-2 border-b-hairline bg-background px-4 py-2` | `className?` + all div attrs     |
| `TableHeader`    | `grid shrink-0 gap-1.5 border-b-hairline-default bg-background px-4 py-1.75` | `gridClassName?` for CSS grid template          |
| `TableHeaderCell`| `flex cursor-pointer select-none items-center gap-0.5 text-sm font-medium text-faint whitespace-nowrap` | `className?` + all div attrs |

**Sizing discipline — the closed rule:**
Building blocks own all their spacing. Consumers pass content and variant only — never size/spacing classes unless it's a deliberate contextual exception. Inline `px-*`, `py-*`, `gap-*`, `mb-*` on a raw `<div>` indicates a missing building block.

**Current scale (bumped 2025-03):**

| Token / Component | Value                 |
| ----------------- | --------------------- |
| `Heading`         | `text-3xl` (30px)     |
| `Subheading`      | `text-xl` (20px)      |
| `Caption`         | `text-sm` (14px)      |
| `Button sm`       | `h-9 px-3.5 text-sm`  |
| `Button md`       | `h-11 px-5 text-base` |
| `Button lg`       | `h-13 px-7 text-base` |
| `Icon xs`         | `h-4 w-4`             |
| `Icon sm`         | `h-5 w-5`             |
| `FormInput`       | `h-11 px-4 text-base` |
| `FormSelect`      | `h-11 px-4 text-base` |
| `FormNumberInput` | `h-11 px-4 text-base` |

**Form control SSOT — closed rule:**
All form controls (`FormInput`, `FormSelect`, `FormNumberInput`) share one height+scale: `h-11 px-4 text-base`. No deviation. A hero-sized input that intentionally differs (e.g. `h-14` in keyword search) must override via `className` and is an explicit exception. Default is always `h-11`.

**Two layout density contexts — closed rule:**

Every component belongs to one of two density levels. Mixing levels within a single module is forbidden.

| Context | Where | Primary text floor | Secondary/meta floor |
| --- | --- | --- | --- |
| **Default UI** | Pages, settings, forms, nav | `text-sm` (14px) | `text-sm` |
| **Compact / data-dense** | Product tables, cockpit rows, overview cards | `text-sm` (14px) | `text-xs` (12px) |
| **SVG labels only** | Chart ticks, node labels, inline SVG text | `text-3xs` (10px) | `text-3xs` |

Rules:
- `text-sm` (14px) is the universal minimum for any readable text — in both Default and Compact contexts.
- `text-xs` (12px) is reserved exclusively for secondary sub-labels in data-dense contexts (brand line, ASIN, stat sub-values, mark-state pills).
- `text-2xs` (11px) is banned everywhere except SVG label context.
- `text-3xs` (10px) is banned outside SVG context.
- Section headers, table column headers, nav items, breadcrumbs, filter buttons, and product titles must never drop below `text-sm`.

**Navigation chrome text minimum:**
Sidebar nav items and any human-readable UI chrome must use `text-sm` (14px) as the floor. `text-xs` (12px) is valid only for dense data sub-labels: secondary metadata under a primary value, ASIN/brand lines, mark-state pills. Never for nav links, section headers, or product names.

**Spacing in JSX — `[var(--space-*)]` is forbidden:**
The `--space-*` scale is 1:1 with Tailwind's default spacer (`--space-4` = 16px = `gap-4`). Always write `gap-4`, `mb-5`, `mt-3`. Arbitrary `[var(--space-*)]` in className bypasses the Tailwind system and is banned.

**Rules**
- No raw `<div>` with hardcoded colors or spacing — always a building-block.
- Inline `px-*`, `py-*`, `gap-*`, `mb-*` on a `<div>` signals a missing composite building block — extract it.
- `<Alert>` for server-returned errors. `<Caption>` for inline helper/error text.
- `<Button href={...}>` instead of `<Link><Button>` — use the built-in href prop.
- Decorative icons must have `aria-hidden="true"`.

---

## Theme (dark/light)

**Provider:** `next-themes` (`ThemeProvider`) wraps the entire tree in `components/providers.tsx`. Config: `attribute="class"` `defaultTheme="dark"` `disableTransitionOnChange`.

**`<html>` element:** No hardcoded `"dark"` class. Always `suppressHydrationWarning`. `next-themes` manages the class.

**Reading/setting theme:**
```ts
import { useTheme } from 'next-themes'
const { resolvedTheme, setTheme } = useTheme()
// toggle: setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
```

**Re-export:** `components/shared/theme-provider.tsx` re-exports `ThemeProvider` and `useTheme` from `next-themes` — always import from there in app code, not directly from `next-themes`.

**CSS layer:** Dark mode defined in `packages/ui/src/globals.css` via `.dark` selector + `@media (prefers-color-scheme: dark)`. Token remaps in `.dark {}` cover all `--bg*`, `--t*`, `--b*` variables. Never add raw color overrides in component files.

---

## Auth & middleware

**Server DAL (`server/auth.ts`)**
- `getAuthUser()` — Supabase auth user only (`id`, `email`). Redirects to login if unauthenticated. No `public.users` data.
- `getOptionalUser()` — returns `null` if unauthenticated, never redirects.
- `getCachedUser()` — full `public.users` row (`display_name`, preferences, plan, etc.). Use this when you need profile data. Calls `getAuthUser()` internally then queries `public.users`.
- All three wrapped in `React.cache()`. Call freely — deduplicated per request.

**Critical distinction:** `getAuthUser()` ≠ `getCachedUser()`. `display_name` and all profile fields live in `public.users`, not in Supabase auth. If a page shows the user's name or any profile setting, it must call `getCachedUser()`, not `getAuthUser()`.

**Middleware (`proxy.ts`)**
- Uses `supabase.auth.getClaims()` — never `getUser()` (avoids a network call on every request).
- User ID: `claimsData?.claims?.sub`

---

## i18n

**Runtime:** `next-intl` v4. Messages split by locale + namespace under `apps/web/i18n/messages/{en,es}/{namespace}.json`.

**Server:** `const t = await getTranslations('namespace')` — call in Server Components and actions.
**Client:** `const t = useTranslations('namespace')` — call at top of every client component that renders strings. Each sub-component owns its own `useTranslations` call.

**Rules:**
- Every user-visible string must be in both `en/` and `es/` files. Never hardcode strings in components.
- Namespace matches the route module: `search`, `settings`, `auth`, `common`.
- `common.json` holds global strings (nav labels, generic actions). Module namespaces hold domain strings.
- Interpolation: `t('key', { param: value })` — keys with params use `{param}` placeholder in JSON.
- New keys: add to both locale files in the same PR/commit.

**Adding strings workflow:**
1. Add key to `i18n/messages/en/{namespace}.json`
2. Add translated key to `i18n/messages/es/{namespace}.json`
3. Call `t('key')` in component — TypeScript auto-completes from the EN file

---

## Adding things

Use the `/new-module` and `/new-query-domain` prompt files in `.github/prompts/` for scaffolding. The rules below encode what those prompts enforce.

### New app module (page + data + UI)

1. `server/{module}.ts` — `getCached{Module}()` with `React.cache()` + `import 'server-only'`
2. `queries/_keys.ts` — add `{module}Keys` factory
3. `queries/{module}.ts` — queryOptions + mutations + `useInvalidate{Module}()`, re-export from `queries/index.ts`
4. `schemas/{module}.ts` — Zod schema for any form inputs
5. Add action to `app/(app)/actions.ts` — typed input, `{ error }` | `redirect()`
6. `app/(app)/{module}/page.tsx` — Server Component, calls `getCachedUser()` (not `getAuthUser()`) + `getCached{Module}()`, passes to island
7. `app/(app)/{module}/_components/{module}-shell.tsx` — `'use client'`, ≤ 70 lines, routing-only, receives server props
8. `app/(app)/{module}/_components/*.tsx` — sub-components, one concern each, own their `useTranslations()`
9. `i18n/messages/en/{module}.json` + `i18n/messages/es/{module}.json` — all user-visible strings

### New query domain only

1. `queries/_keys.ts` — add key factory
2. `queries/{domain}.ts` — queryOptions + mutations + invalidation hook
3. `queries/index.ts` — re-export

### New integration (vendor API)

1. `integrations/{vendor}/client.ts` — isolated API client, no app imports
2. `integrations/{vendor}/types.ts` — vendor-specific types (if not in `@puckora/types`)
3. Reference from `services/` or `app/api/` — never directly from components

### New schema

- `schemas/{domain}.ts` — Zod, no React. Cross-field validation via `.refine()`.

### New constant

- `constants/{name}.ts` — no imports from `server/`, `services/`, or `queries/`. Pure values only.

---

## Pre-flight checklist

Before submitting any change, verify:

- [ ] No `useQueryClient` imported outside `queries/` (exception: `hooks/use-scrape-realtime.ts`)
- [ ] No `queryKey` or `queryFn` defined inline in a component or hook
- [ ] No `'use client'` on a file that has no hooks or event handlers
- [ ] No raw `--sf-*` tokens in component CSS
- [ ] No raw `<div>` with hardcoded color or spacing
- [ ] No `[var(--space-*)]` in className — use Tailwind spacing utilities (`gap-4`, `mb-5`, `mt-3`)
- [ ] All form controls use `h-11 px-4 text-base` — FormInput, FormSelect, FormNumberInput must match
- [ ] No `text-2xs` on nav links, product names, or section headers — minimum `text-xs`
- [ ] Server data functions use `React.cache()` and `import 'server-only'`
- [ ] New query domain added to `_keys.ts` and re-exported from `queries/index.ts`
- [ ] Form errors rendered via `<Alert variant="error">`, not custom markup
- [ ] Decorative icons have `aria-hidden="true"`
- [ ] `Button href={...}` used instead of `<Link><Button>`
- [ ] Shell components: ≤ 70 lines, routing-only, no JSX markup, no hardcoded strings
- [ ] Every new user-visible string added to both `en/{namespace}.json` and `es/{namespace}.json`
- [ ] `getCachedUser()` used (not `getAuthUser()`) when `display_name` or profile data is needed
- [ ] `<html>` has `suppressHydrationWarning`, no hardcoded `"dark"` class
