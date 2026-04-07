'use client'

import { useEffect, useRef } from 'react'
import { buildNodeLabel, useResearchGraph } from '@puckora/research-graph'
import { useAppStore } from '@/lib/store'

/**
 * Tracks search query pages in the research graph.
 *
 * - New query while job is active    → pending node ("Searching "keyword"…")
 * - Job completes                    → node resolved ("keyword")
 * - Return to already-searched query → return node ("Back to "keyword"")
 *
 * `isJobActive` drives the pending → resolved transition.
 */
export function useSearchResearchGraph(query: string, isJobActive: boolean) {
    const { ensureSession, session, trackSearch, trackSearchPending, trackSearchReturn, updateNode } = useResearchGraph(useAppStore)
    const trackedQuery = useRef<string | null>(null)
    const pendingNodeId = useRef<string | null>(null)

    useEffect(() => {
        ensureSession()
    }, [ensureSession])

    // Track query on first visit
    useEffect(() => {
        if (!session || !query || trackedQuery.current === query) return
        trackedQuery.current = query

        const wasVisited = session.nodes.some(
            (n) => n.type === 'keyword' && n.meta.query === query,
        )

        if (wasVisited) {
            trackSearchReturn(query)
        } else if (isJobActive) {
            const id = trackSearchPending(query)
            pendingNodeId.current = id
        } else {
            trackSearch(query)
        }
    }, [query, session, trackSearch, trackSearchPending, trackSearchReturn, isJobActive])

    // Resolve pending node when job finishes
    useEffect(() => {
        if (isJobActive || !pendingNodeId.current) return
        updateNode(pendingNodeId.current, {
            label: buildNodeLabel.keyword(query),
            meta: { query, pending: false },
        })
        pendingNodeId.current = null
    }, [isJobActive, query, updateNode])
}