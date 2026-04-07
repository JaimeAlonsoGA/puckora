'use client'

import { useEffect, useRef } from 'react'
import { useResearchGraph } from '@puckora/research-graph'
import { useAppStore } from '@/lib/store'

/**
 * Tracks a product page visit in the research graph.
 *
 * - First visit → standard `trackProduct` (forward movement)
 * - Return visit → `trackProductReturn` ("Back to <title>", still forward)
 *
 * Both cases are always-forward: a return visit produces a new node
 * with a context-sensitive label rather than navigating back.
 */
export function useProductResearchGraph(title: string, asin: string, query: string) {
    const { ensureSession, session, trackProduct, trackProductReturn } = useResearchGraph(useAppStore)
    const trackedRef = useRef(false)

    useEffect(() => {
        ensureSession()
    }, [ensureSession])

    useEffect(() => {
        if (!session || !asin || trackedRef.current) return
        trackedRef.current = true

        // Anchor to the most recent keyword node for this query
        const keywordNode = [...session.nodes]
            .reverse()
            .find((n) => n.type === 'keyword' && n.meta.query === query)
        const parentId = keywordNode?.id ?? session.currentId ?? session.nodes[0]?.id ?? null
        if (!parentId) return

        const wasVisited = session.nodes.some(
            (n) => n.type === 'product' && n.meta.asin === asin,
        )

        if (wasVisited) {
            trackProductReturn(title, asin, parentId)
        } else {
            trackProduct(title, asin, parentId)
        }
    }, [session, asin, query, title, trackProduct, trackProductReturn])
}
