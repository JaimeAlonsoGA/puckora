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

**Radius** — `rounded-sm` (4px), `rounded-md` (8px), `rounded-lg` (12px), `rounded-full` (9999px). Prefer `rounded-md` as the default.

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
- Returns `{ isInstalled, isChecking }` — gate UI on `isChecking` to avoid flashing the "install" prompt

## i18n
- Every user-visible string lives in `i18n/messages/{en,es}/{namespace}.json` — never inline
- Client: `const t = useTranslations('namespace')` at top of every client component that renders strings
- Server: `const t = await getTranslations('namespace')` in Server Components and actions
- New keys go in both locale files in the same commit
