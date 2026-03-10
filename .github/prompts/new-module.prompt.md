---
mode: agent
description: Scaffold a new app module (page + client island + server data layer + query domain)
---

Scaffold a complete new module for: **${input:module}**

## Steps

1. **Server data** — `server/${module}.ts`
   - `import 'server-only'`
   - Export `getCached${Module}()` wrapped in `React.cache()`
   - Use `createServerClient()` from `@/integrations/supabase/server`

2. **Query keys** — add to `queries/_keys.ts`
   ```ts
   export const ${module}Keys = {
     all: ['${module}'] as const,
     // add specific key factories
   }
   ```

3. **Query layer** — `queries/${module}.ts`
   - `queryOptions()` factories (no inline queryFn in components)
   - `useMutation` hooks with internal `queryClient.invalidateQueries`
   - Export domain invalidation hook: `useInvalidate${Module}()`
   - Re-export from `queries/index.ts`

4. **Server Action** — add to `app/(app)/actions.ts`
   - Accept typed Zod-validated data
   - Return `{ error: string }` | call `redirect()`

5. **Page** — `app/(app)/${module}/page.tsx`
   - Server Component
   - Call `getAuthUser()` + `getCached${Module}()`
   - Pass data as props to client island

6. **Client island** — `app/(app)/${module}/_components/${module}-shell.tsx`
   - `'use client'`
   - Receives server-fetched data as props
   - Uses `useQuery(${module}QueryOptions(...))` for client-driven refreshes

7. **Thin hook wrapper** — `hooks/use-${module}.ts`
   - `useQuery(${module}QueryOptions(...))` wrapper only

## Checklist
- [ ] No `useQueryClient` imported in any component or page
- [ ] All tokens are semantic (`--surface-*`, not `--sf-*`)
- [ ] All interactive elements in `_components/`, pages are Server Components
- [ ] New query keys added to `_keys.ts`
- [ ] New queries re-exported from `queries/index.ts`
