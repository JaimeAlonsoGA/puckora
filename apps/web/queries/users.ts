'use client'

import { queryOptions, useQueryClient } from '@tanstack/react-query'
import type { AppUser } from '@/types/users'
import { userKeys } from './_keys'

// ---------------------------------------------------------------------------
// Query options
// ---------------------------------------------------------------------------

/** Full public.users row for the current authenticated user. */
export const userQueryOptions = () =>
    queryOptions({
        queryKey: userKeys.me(),
        queryFn: async (): Promise<AppUser> => {
            const res = await fetch('/api/settings')
            if (!res.ok) throw new Error('Failed to fetch user')
            return res.json() as Promise<AppUser>
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
