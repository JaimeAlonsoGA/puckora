import { QueryClient } from '@tanstack/react-query'
import type { ApiError } from './api'

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 2,       // 2 minutes
            gcTime: 1000 * 60 * 10,          // 10 minutes
            // Never retry auth errors — they won't self-heal with the same token.
            // The request() helper in api.ts already does one token-refresh retry
            // internally before reaching here.
            retry: (failureCount, error) => {
                const status = (error as ApiError)?.status
                if (status === 401 || status === 403) return false
                return failureCount < 1
            },
            refetchOnWindowFocus: false,
        },
        mutations: {
            retry: 0,
        },
    },
})
