'use client'

import { queryOptions } from '@tanstack/react-query'
import { keywordSuggestionKeys } from './_keys'

export const keywordSuggestionsQueryOptions = (query: string) =>
    queryOptions({
        queryKey: keywordSuggestionKeys.list(query),
        queryFn: async (): Promise<{ keywords: string[] }> => {
            const res = await fetch('/api/search/keyword-suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            })
            if (!res.ok) return { keywords: [] }
            return res.json()
        },
        staleTime: 10 * 60 * 1_000,
    })
