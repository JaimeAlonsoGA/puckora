---
applyTo: "apps/web/**"
---

# Web app file rules

## Data systems

- Supabase Postgres = auth, users, `scrape_jobs`, realtime features
- Fly.io Postgres = catalog/product/category/keyword data plus `product_financials`
- Local or tailnet `pgvector` Postgres = semantic-search index managed by `packages/vectors`
- Web code may read vectors via `@puckora/vectors`, but vector sync/backfill/status operations stay package-owned and out of route/page code

## Component files
- Server Components: no `'use client'`, no hooks, no browser APIs
- Client Components: `'use client'` at top, extract to `_components/` subdirectory
- Typography: use `<Display>`, `<Heading>`, `<Subheading>`, `<Body>`, `<Caption>`, `<Label>`, `<Mono>` — not raw `<h1>`, `<p>`, `<span>`
- Spacing/color: Tailwind utility tokens only (see **Token system** below) — never cockpit tokens (`--bg1`, `--green`, `--t1`) or `--sf-*` tokens in component className
- Spacing in className: always `gap-4`, `mb-5`, `mt-3` — never `[var(--space-*)]` arbitrary syntax

## Token system

The design token stack has three layers. Components only ever use the **Tailwind utility** layer.

| Layer | Examples | Rule |
| --- | --- | --- |
| **Cockpit raw** | `--bg1`, `--bg2`, `--t1`, `--green`, `--b2`, `--rad` | Source palette in `packages/ui/src/globals.css`. Never in component className. |
| **shadcn semantic** | `--background`, `--foreground`, `--primary`, `--muted`, `--card`, `--border`, `--ring` | Auto-remapped in dark mode. Never write these directly in JSX className. |
| **Tailwind utilities** | `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-card`, `border-border` | Exposed via `@theme inline`. This is the ONLY layer used in component JSX. |

**Available utility aliases (most common):**

| Token type | Utilities |
| --- | --- |
| Surfaces | `bg-background`, `bg-card`, `bg-muted`, `bg-surface-base`, `bg-surface-card`, `bg-surface-secondary`, `bg-brand-subtle` |
| Text | `text-foreground`, `text-muted-foreground`, `text-faint` (= t3, dimmest), `text-primary` |
| Borders | `border-border`, `border-border-subtle`, `border-border-strong`, `border-border-focus` |
| Status surfaces | `bg-success-surface`, `bg-warning-surface`, `bg-error-surface`, `bg-info-surface` |
| Status text | `text-success-fg`, `text-warning-fg`, `text-error-fg`, `text-info-fg` |

**Hairline borders** (0.5px cockpit-style lines) — use these utility classes instead of `style={{ border: '0.5px solid ...' }}`:
- `border-hairline` (all sides, subtle color), `border-t-hairline`, `border-r-hairline`, `border-b-hairline`
- `border-hairline-default`, `border-t-hairline-default`, `border-b-hairline-default` (border-default color)

**`--sf-*` tokens** (`packages/ui/tailwind.css`) are from the **old, deprecated design system** — never use in new code.

**Radius — semantic shape language (sharp = data, pill = action, card = content):**
- `Button` → `rounded-full` (pill) — all sizes
- `Alert` → `rounded-lg` (12px) — approachable feedback
- `Surface variant="card"` / `variant="important"` → `rounded-xl` (18px) — premium shells
- `DataCard`, `KpiCard` → `rounded-none` — data display, zero tolerance
- `Badge` → `rounded-sm` (4px) — inline label whisper
- `Surface variant="base"` / `variant="secondary"` → `rounded-none` — structural
- Scale available: `rounded-sm` (4px) · `rounded-md` (8px) · `rounded-lg` (12px) · `rounded-xl` (18px) · `rounded-full` (9999px).

## CSS globals (`styles/globals.css`)

The web app's CSS entry point order matters — never deviate:
```css
@import "tailwindcss";

@source "../app";
@source "../components";
@source "../hooks";
/* ... other @source paths ... */

@import "@puckora/ui/globals.css";   /* cockpit tokens + shadcn layer + @theme inline */
@import "shadcn/tailwind.css";        /* Radix keyframes + data-state variants */
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));
```
- `@import "@puckora/ui/globals.css"` works in the web app (Next.js resolves package exports); the extension must use a relative path instead.
- `@custom-variant dark` enables `dark:` Tailwind prefix — powered by the `.dark` class on `<html>`.

## Form controls — closed sizing rule
- `FormInput`, `FormSelect`, `FormNumberInput` all use `h-11 px-4 text-base` — no mixing `h-10/text-sm`
- A deliberate exception (e.g. hero input `h-14`) must override via `className` and is annotated as such
- Never introduce a new `h-10` or `text-sm` form control without aligning with this standard first

## Two layout density contexts — closed rule
Every component belongs to one of two density levels:

| Context | Where | Primary text floor | Secondary/meta floor |
| --- | --- | --- | --- |
| **Default UI** | Pages, settings, forms, nav | `text-sm` (14px) | `text-sm` |
| **Compact / data-dense** | Product tables, cockpit rows, overview cards | `text-sm` (14px) | `text-xs` (12px) |
| **SVG labels only** | Chart ticks, node labels, inline SVG text | `text-3xs` (10px) | `text-3xs` |

- `text-sm` (14px) is the universal minimum for any human-readable text — applies to both Default and Compact contexts
- `text-xs` (12px) is reserved for secondary sub-labels in data-dense contexts only (brand/ASIN line, stat sub-values, mark pills)
- `text-2xs` (11px) is banned everywhere outside SVG context
- `text-3xs` (10px) is banned outside SVG context — any non-SVG element using it is a violation
- Section headers, table column headers, nav items, breadcrumbs, and filter buttons must never drop below `text-sm`

## Shell / Orchestrator files (`_components/{module}-shell.tsx`)
- `'use client'`, ≤ 70 lines, return-statement dispatches to named sub-components only
- Zero UI markup, zero hardcoded strings, zero `useQueryClient`, zero inline `queryKey`/`queryFn`
- Owns realtime hooks (e.g. `useScrapeRealtime`) + gate/routing logic — nothing else
- Receives server-prefetched data as props; never re-fetches what the server already computed
- Sub-components: one concern per file, each owns its own `useTranslations()`

## Query files (`queries/*.ts`)
- Must be `'use client'` — queryOptions are consumed by client hooks
- Export `queryOptions()` factories, not raw objects
- Mutation hooks own `useQueryClient` + `invalidateQueries`
- Export `useInvalidate{Domain}()` for post-server-action cache busting
- `useQueryClient` forbidden outside `queries/` — sole exception: `hooks/use-scrape-realtime.ts`
- Every domain file **must** be re-exported from `queries/index.ts` — missing exports silently break all barrel consumers

## Hard rules — scalability constraints

### No hardcoded strings — ever
- Route paths → `AppRoute.{name}` from `constants/routes.ts`. Never `'/login'`, `'/settings'`, etc.
- Error messages → `API_ERROR_MESSAGES`, `QUERY_ERROR_MESSAGES`, `SERVICE_ERROR_PREFIXES` from `constants/api.ts`
- Validation messages → `AUTH_VALIDATION_MESSAGES` / `SCRAPE_VALIDATION_MESSAGES` from `constants/validation.ts`
- UI strings → `t('key')` from `next-intl`. No string literals in JSX or server components.
- Magic numbers → named const in `constants/`. No raw `400`, `8`, `45` in logic.

### Const-as-enum pattern (no TypeScript `enum`)
Never use `enum`. Use `as const` objects + derived union types instead:
```ts
// ✅ DO — constants/app-state.ts pattern
export const MARK_STATES = {
    INTERESTED: 'interested',
    COMPETITOR: 'competitor',
} as const

export const MARK_STATE_VALUES = [MARK_STATES.INTERESTED, MARK_STATES.COMPETITOR] as const
export type MarkState = (typeof MARK_STATE_VALUES)[number]  // 'interested' | 'competitor'

// ❌ NEVER
enum MarkState { Interested = 'interested', Competitor = 'competitor' }
```
The VALUES array enables runtime iteration (`.map`, `.includes`, Zod `.enum()`). The type is derived — no duplication.

### Derived types — never manually duplicate
```ts
// Type derived from const object (route paths, config keys)
export type AppRoutePath = (typeof AppRoute)[keyof typeof AppRoute]

// Type from Zod schema (single source — schema drives both runtime + type)
export type SearchInput = z.infer<typeof SearchSchema>
```
If a type can be derived, derive it. Never write `type X = 'a' | 'b' | 'c'` when a VALUES array exists.

### Zod schemas as validation SSOT
- Schemas live in `schemas/{domain}.ts` — no React, no server imports
- The same schema validates: form input (`zodResolver`), server action body, API route body
- Never duplicate validation logic: if the schema says min 8 chars, nothing else enforces that
- Validation error messages → come from `constants/validation.ts`, injected via `.min(8, VALIDATION_MESSAGES.PASSWORD_MIN_LENGTH)`

### Constants file rules
- `constants/{name}.ts` — zero imports from `server/`, `services/`, `queries/`, or React
- `as const` on all object literals that produce union types
- Exhaustive maps use `Record<TheUnionType, Value>` — TypeScript errors if a value is missing
- Group related constants in one file (e.g. all mark-state data in `app-state.ts`)

### One source, many consumers
This is the core scalability rule: **a value is defined once, derived everywhere.**
- Route string defined in `AppRoute`, used in `<Link href={AppRoute.settings}>`
- Mark state string defined in `MARK_STATES.INTERESTED`, used in Zod, UI, store, DB query
- Error message defined in `API_ERROR_MESSAGES`, thrown in service, asserted in test
When you find yourself writing the same string in two places, stop. Add a constant.

## Server files (`server/*.ts`)
- `import 'server-only'` at top
- All exported functions wrapped in `React.cache()`
- Never imported from client components
- `getCachedUser()` (`server/users.ts`) returns full `public.users` row — use when `display_name` or profile data is needed
- `getAuthUser()` (`server/auth.ts`) returns Supabase auth only (`id`, `email`) — never use for profile fields
- `getOptionalUser()` (`server/auth.ts`) returns `null` if unauthenticated, never redirects
- Fly-backed catalog reads belong in the Fly integration / service layer, not in Supabase DAL code

## Actions (`app/**/actions.ts`)
- `'use server'` at top
- Accept typed input (never raw `FormData`)
- Return `{ error: string }` | call `redirect()` — nothing else
- Cross-DB writes that are independent (Supabase + Fly.io) → `Promise.all([...])`, never sequential `await`

## Parallel async composition

**Server functions — parallelize all independent awaits.**
A sequential `await a; await b` when `b` does not use `a`'s result is a per-request latency tax. Treat every server function like a DAG: only await in order when there is a true data dependency.

```ts
// ✅ getCachedUser: createServerClient only reads cookies — independent of getAuthUser
const [authUser, supabase] = await Promise.all([getAuthUser(), createServerClient()])

// ✅ page with two independent data needs
const [user, catalog] = await Promise.all([getCachedUser(), getCachedCatalog()])
```

**Server Actions — parallelize cross-DB writes:**
```ts
// ✅ Supabase + Fly.io writes are independent
const [job, keyword] = await Promise.all([
    createScrapeJob(supabase, userId, input),
    upsertKeyword(db, input.query),
])
```

**API routes & background pipelines — `Promise.allSettled` for batch writes:**
When processing N independent rows, never `for...await`. One failure must never abort the others:
```ts
await Promise.allSettled(
    items.map(async (item) => Promise.all([upsertProductA(db, item), upsertProductB(db, item)]))
)
```
- DB write loops over independent rows → always `Promise.allSettled`
- SP-API / third-party catalog fetches → intentionally sequential (rate-limit protection)

**Non-urgent client updates — `startTransition`:**
Wrap event handlers that trigger navigation, search, or non-urgent state changes so the UI stays responsive:
```ts
import { startTransition } from 'react'
// in handler:
startTransition(() => onSearch(query))
```

## Re-render optimization

React re-renders an entire subtree by default. In data-dense lists (product tables, keyword rows) this taxes the main thread on every interaction. These patterns are **mandatory for any component that renders a list of rows**.

**1. `memo(RowComponent)` — wrap every list row:**
```tsx
const ProductRow = memo(function ProductRow({ ... }: ProductRowProps) { ... })
```
Without `memo`, `useCallback` on parent handlers is pointless.

**2. Per-row store selector — never a parent-level collection subscription:**
```ts
// ✅ only this row re-renders when ITS own slice changes
const markState = useAppStore(state => state.items[id]?.markState ?? null)

// ❌ subscribes to entire collection — parent re-renders on ANY item change
const { items } = useAppStore()
```

**3. Stable callbacks via `useCallback` + `Store.getState()`:**
Parent handlers have **empty deps** and read store state at call time — never as reactive subscriptions:
```ts
const cycleMark = useCallback((id: string, name: string) => {
    const { items, markItem, unmarkItem } = useAppStore.getState()
    // reads current state at call time — no stale closure, no dep
}, [])  // ← empty deps: never re-created, never busts memo
```

**4. Transient ref for local state reads in handlers:**
When a handler needs the current value of a `useState` variable, sync it via `useLayoutEffect` — never assign to `ref.current` during render (React Compiler enforcement):
```ts
const notesRef = useRef(notes)
useLayoutEffect(() => { notesRef.current = notes })  // handler reads notesRef.current
```

**5. Stable handler signatures — row passes its own id:**
```ts
// Row calls parent with its own id:
onCycleMark(asin, product.title)
// Parent def stays fully generic:
const cycleMark = useCallback((asin: string, title: string) => { ... }, [])
```

**Re-render scope guarantees this pattern must provide:**

| User action | What re-renders |
| --- | --- |
| Mark/unmark a product | Only that row (per-row store subscription) |
| Expand / collapse a row | Only rows whose `isExpanded` prop changed |
| Note input change | Only the row whose `note` prop differs |
| Any store change | Parent component: **never** |

## Error constants (SSOT)

All HTTP status codes, API error messages, and service error prefixes live in `constants/api.ts`. Never define local error string constants in route handlers, services, or background pipelines — they will diverge.

```ts
import { API_ERROR_MESSAGES, API_STATUS, SERVICE_ERROR_PREFIXES } from '@/constants/api'

// API routes:
return NextResponse.json(
    { error: API_ERROR_MESSAGES.INVALID_JSON_BODY },
    { status: API_STATUS.BAD_REQUEST }
)
return NextResponse.json(
    { error: API_ERROR_MESSAGES.VALIDATION_FAILED },
    { status: API_STATUS.UNPROCESSABLE_ENTITY }
)

// Service files:
throw new Error(`${SERVICE_ERROR_PREFIXES.UPDATE_AMAZON_PRODUCT_FAILED}: ${message}`)
```

- New error string → add to `constants/api.ts`, never inline
- New HTTP status code → add to `API_STATUS` object
- New service error prefix → add to `SERVICE_ERROR_PREFIXES`

## Theme
- `next-themes` manages dark/light — never hardcode `"dark"` class on `<html>`
- `<html>` must have `suppressHydrationWarning`
- Import `ThemeProvider` / `useTheme` from `@/components/shared/theme-provider` — not directly from `next-themes`
- Read/set theme: `const { resolvedTheme, setTheme } = useTheme()`
- Dark mode tokens are defined via both `@media (prefers-color-scheme: dark)` and `.dark {}` in `packages/ui/src/globals.css` — cockpit layer tokens (`--bg1`, `--t1`, etc.) remap automatically; shadcn tokens cascade through
- **Hydration guard required** for any UI that branches on `resolvedTheme`: render nothing until mounted
  ```tsx
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  // in JSX:
  {mounted && (resolvedTheme === 'dark' ? <Sun /> : <Moon />)}
  ```
  Skipping this causes a hydration mismatch — server renders with `resolvedTheme === undefined`.

## Extension sync (`hooks/use-extension-sync.ts`)
- Runs in authenticated app layout via `<ExtensionSync />` in `AppShell`
- Polls `window.__puckora_ext_id` every 150ms for up to 2s (service worker injection is async)
- On detection, calls `chrome.runtime.sendMessage(extId, { type: 'SET_SESSION', session })` with current Supabase session
- Extension must have `host_permissions` for `localhost:3000` + `app.puckora.com` AND `externally_connectable` for messaging to work
- Non-fatal — always wrapped in try/catch

## Extension detection (`hooks/use-extension.ts`)
- Polls `window.__puckora_ext` every 150ms for up to 2s — never a single delayed timeout
- Returns `{ isInstalled, isChecking }` — use it for optional companion UI only; never block core web workflows on extension detection

## i18n
- Every user-visible string lives in `i18n/messages/{en,es}/{namespace}.json` — never inline
- Client: `const t = useTranslations('namespace')` at top of every client component that renders strings
- Server: `const t = await getTranslations('namespace')` in Server Components and actions
- New keys go in both locale files in the same commit
