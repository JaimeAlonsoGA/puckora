# puckora — Agent Reference

> Model: Claude Sonnet 4.6 · Stack: Next.js 16 · React 19 · TS 5.8 · Tailwind v4 · Supabase SSR · TanStack Query v5 · next-intl v4 · react-hook-form + Zod v3
> Monorepo (npm workspaces + Turbo): `apps/web` (main product), `apps/scraper` (Node), `apps/extension` (Chrome). `@/` → `apps/web/` root.

---

## Live references — fetch before working on relevant areas

- Design guidelines: `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`
- React best practices: `apps/web/.agents/skills/vercel-react-best-practices/AGENTS.md`
- Composition patterns (React 19 no-forwardRef etc.): `apps/web/.agents/skills/vercel-composition-patterns/AGENTS.md`
- Next.js App Router: https://nextjs.org/docs
- Supabase SSR: https://supabase.com/docs/guides/auth/server-side/nextjs

---

## Table of contents
- [File placement](#file-placement)
- [SSR-first](#ssr-first)
- [Query layer](#query-layer)
- [Forms & mutations](#forms--mutations)
- [Design system](#design-system)
- [Auth & middleware](#auth--middleware)
- [Adding things](#adding-things)

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

**Building-block components** (import from `components/building-blocks/`)

| Component  | Key props                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| `Button`   | `variant` (primary/secondary/ghost/danger/outline) · `size` (sm/md/lg) · `loading` · `fullWidth` · `href` |
| `Stack`    | `gap` (1–16 or none) · `direction` (column/row) · `align` · `justify`                                     |
| `Surface`  | `variant` (base/card/secondary) · `padding` (none/sm/md/lg/xl) · `border` (none/default/strong)           |
| `Badge`    | `variant` (default/brand/success/warning/error/info) · `size` (sm/md)                                     |
| `Alert`    | `variant` (success/warning/error/info) · `title?`                                                         |
| `TextLink` | `href` · `variant` · `underline` (always/hover/never) · `external`                                        |
| `Icon`     | `size` (xs/sm/md/lg/xl)                                                                                   |
| Typography | `Display` `Heading` `Subheading` `Body` `Caption` `Label` `Mono` — all accept `as` prop                   |

**Rules**
- No raw `<div>` with hardcoded colors or spacing — always a building-block.
- `<Alert>` for server-returned errors. `<Caption>` for inline helper/error text.
- `<Button href={...}>` instead of `<Link><Button>` — use the built-in href prop.
- Decorative icons must have `aria-hidden="true"`.

---

## Auth & middleware

**Server DAL (`server/auth.ts`)**
- `getAuthUser()` — requires authentication, redirects to login if not present.
- `getOptionalUser()` — returns `null` if unauthenticated, never redirects.
- Both wrapped in `React.cache()`. Call freely — deduplicated per request.

**Middleware (`proxy.ts`)**
- Uses `supabase.auth.getClaims()` — never `getUser()` (avoids a network call on every request).
- User ID: `claimsData?.claims?.sub`

---

## Adding things

Use the `/new-module` and `/new-query-domain` prompt files in `.github/prompts/` for scaffolding. The rules below encode what those prompts enforce.

### New app module (page + data + UI)

1. `server/{module}.ts` — `getCached{Module}()` with `React.cache()` + `import 'server-only'`
2. `queries/_keys.ts` — add `{module}Keys` factory
3. `queries/{module}.ts` — queryOptions + mutations + `useInvalidate{Module}()`, re-export from `queries/index.ts`
4. `schemas/{module}.ts` — Zod schema for any form inputs
5. Add action to `app/(app)/actions.ts` — typed input, `{ error }` | `redirect()`
6. `app/(app)/{module}/page.tsx` — Server Component, calls `getAuthUser()` + `getCached{Module}()`, passes to island
7. `app/(app)/{module}/_components/{module}-shell.tsx` — `'use client'`, receives server props

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

- [ ] No `useQueryClient` imported outside `queries/`
- [ ] No `queryKey` or `queryFn` defined inline in a component or hook
- [ ] No `'use client'` on a file that has no hooks or event handlers
- [ ] No raw `--sf-*` tokens in component CSS
- [ ] No raw `<div>` with hardcoded color or spacing
- [ ] Server data functions use `React.cache()` and `import 'server-only'`
- [ ] New query domain added to `_keys.ts` and re-exported from `queries/index.ts`
- [ ] Form errors rendered via `<Alert variant="error">`, not custom markup
- [ ] Decorative icons have `aria-hidden="true"`
- [ ] `Button href={...}` used instead of `<Link><Button>`
