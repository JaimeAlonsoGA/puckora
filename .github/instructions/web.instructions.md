---
applyTo: "apps/web/**"
---

# Web app file rules

## Component files
- Server Components: no `'use client'`, no hooks, no browser APIs
- Client Components: `'use client'` at top, extract to `_components/` subdirectory
- Typography: use `<Heading>`, `<Body>`, `<Caption>` etc — not raw `<h1>`, `<p>`, `<span>`
- Spacing/color: CSS vars only — `var(--space-4)`, `var(--surface-card)` — never hardcoded values

## Query files (`queries/*.ts`)
- Must be `'use client'` — queryOptions are consumed by client hooks
- Export `queryOptions()` factories, not raw objects
- Mutation hooks own `useQueryClient` + `invalidateQueries`
- Export `useInvalidate{Domain}()` for post-server-action cache busting

## Server files (`server/*.ts`)
- `import 'server-only'` at top
- All exported functions wrapped in `React.cache()`
- Never imported from client components

## Actions (`app/**/actions.ts`)
- `'use server'` at top
- Accept typed input (never raw `FormData`)
- Return `{ error: string }` | call `redirect()` — nothing else
