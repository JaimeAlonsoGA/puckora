---
agent: agent
description: Add a new TanStack Query domain to queries/
---

Add a new query domain for: **${input:domain}**

## Files to create/edit

### 1. `queries/_keys.ts` — add key factory
```ts
export const ${domain}Keys = {
  all: ['${domain}'] as const,
  list: (params: ...) => [...${domain}Keys.all, 'list', params] as const,
}
```

### 2. `queries/${domain}.ts` — new file
```ts
'use client'
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { ${domain}Keys } from './_keys'

// queryOptions factories
export const ${domain}QueryOptions = (param: string) =>
  queryOptions({
    queryKey: ${domain}Keys.list(param),
    queryFn: async () => { ... },
    staleTime: 60_000,
  })

// mutation hooks (useQueryClient lives here, not in components)
export function useCreate${Domain}() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: ...) => { ... },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ${domain}Keys.all })
    },
  })
}

// invalidation helper for server action forms
export function useInvalidate${Domain}() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ${domain}Keys.all })
}
```

### 3. `queries/index.ts` — add re-export
```ts
export * from './${domain}'
```

## Rules
- No `queryKey` or `queryFn` defined anywhere outside `queries/`
- `useQueryClient` only inside `queries/` files, never in components
