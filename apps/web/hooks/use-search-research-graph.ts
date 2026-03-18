'use client'

import { useEffect, useRef } from 'react'
import { useResearchGraph } from '@puckora/research-graph'
import { useAppStore } from '@/lib/store'

export function useSearchResearchGraph(query: string) {
    const { ensureSession, session, trackSearch } = useResearchGraph(useAppStore)
    const trackedQuery = useRef<string | null>(null)

    useEffect(() => {
        ensureSession()
    }, [ensureSession])

    useEffect(() => {
        if (!session || !query || trackedQuery.current === query) return
        trackSearch(query)
        trackedQuery.current = query
    }, [query, session, trackSearch])
}