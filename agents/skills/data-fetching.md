# Agent Skill: Data Fetching

## TanStack Query Patterns

All server state goes through TanStack Query. **No `useEffect` for data fetching**.

## Reading Data (useQuery)

```tsx
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AmazonSearchResult } from '@repo/types'

function useProductSearch(query: string, marketplace = 'US') {
  return useQuery<AmazonSearchResult>({
    queryKey: ['products-search', query, marketplace],
    queryFn: () => api.get(`/products-search?q=${query}&marketplace=${marketplace}`),
    enabled: query.length > 0,
    staleTime: 1000 * 60 * 3, // 3 minutes
  })
}
```

## Mutating Data (useMutation)

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

function useSaveProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SaveProductInput) => api.post('/tracker-products', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracker-products'] })
    },
  })
}
```

## Rules

- ❌ No `useEffect` calling APIs
- ❌ No `useState` for server data
- ✅ `queryKey` must be an array — serialize all params that change the result
- ✅ `enabled` guards queries that depend on user input
- ✅ `invalidateQueries` after mutations to keep UI fresh
- ✅ Wrap query consumers in `<AsyncBoundary>` for error + loading states

## Query Key Conventions

```
['resource-name', param1, param2]
['products-search', query, marketplace]
['product-detail', asin, marketplace]
['tracker-products']
['supplier-search', query, page]
['categories-tree', marketplace]
['categories-search', query, marketplace]
['competitor-analysis', analysisId]
['profile', userId]
```

## Polling (Competitor Analysis)

```tsx
useQuery({
  queryKey: ['competitor-analysis', analysisId],
  queryFn: () => api.get(`/competitor-result?id=${analysisId}`),
  refetchInterval: (query) => {
    const status = query.state.data?.status
    return status === 'pending' || status === 'scraping' || status === 'analyzing'
      ? 3000  // poll every 3s
      : false // stop polling
  },
})
```

## AsyncBoundary Usage

```tsx
import { AsyncBoundary } from '@/components/shared/AsyncBoundary'

<AsyncBoundary>
  <ProductList />
</AsyncBoundary>
```

## api Client

Located at `apps/web/src/lib/api.ts`. Automatically attaches Supabase JWT.

```ts
api.get('/endpoint?param=value')
api.post('/endpoint', body)
api.patch('/endpoint?id=xxx', body)
api.delete('/endpoint?id=xxx')
```
