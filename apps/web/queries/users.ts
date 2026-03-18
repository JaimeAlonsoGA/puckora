'use client'

import { queryOptions, useQueryClient } from '@tanstack/react-query'
import type { User } from '@puckora/types'
import { QUERY_ERROR_MESSAGES } from '@/constants/api'
import { fetchJson } from './fetch'
import { userKeys } from './_keys'

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

/** Full public.users row for the current authenticated user. */
export const userQueryOptions = () =>
    queryOptions({
        queryKey: userKeys.me(),
        queryFn: async (): Promise<User> => {
            return fetchJson<User>('/api/settings', undefined, QUERY_ERROR_MESSAGES.USER_FETCH_FAILED)
        },
        staleTime: 30_000,
    })

// ---------------------------------------------------------------------------
// Invalidation helper — keeps useQueryClient out of components
// ---------------------------------------------------------------------------

export function useInvalidateUser() {
    const queryClient = useQueryClient()
    return () => queryClient.invalidateQueries({ queryKey: userKeys.all })
}
