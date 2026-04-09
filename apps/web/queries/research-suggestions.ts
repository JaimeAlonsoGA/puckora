'use client'

import { queryOptions } from '@tanstack/react-query'
import { GraphNodeTypeEnum } from '@puckora/research-graph'
import type { SuggestionsResponse } from '@puckora/research-graph'
import { researchKeys } from './_keys'

async function fetchRelatedSuggestions(query: string): Promise<SuggestionsResponse> {
    const res = await fetch('/api/research/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nodeType: GraphNodeTypeEnum.KEYWORD,
            nodeMeta: { query },
            sessionId: `sidebar-${query}`,
            history: [],
        }),
    })
    if (!res.ok) return { suggestions: [] }
    return res.json() as Promise<SuggestionsResponse>
}

export const relatedSuggestionsQueryOptions = (query: string) =>
    queryOptions({
        queryKey: researchKeys.relatedSuggestions(query),
        queryFn: () => fetchRelatedSuggestions(query),
        staleTime: 5 * 60_000,
        retry: false,
    })
