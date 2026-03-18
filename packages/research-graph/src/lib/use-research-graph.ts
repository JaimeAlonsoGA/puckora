'use client'

// ─────────────────────────────────────────────────────────────────────────────
// @puckora/research-graph — useResearchGraph Hook
// The single public interface for all graph interactions.
// Components never touch the store directly — they use this hook.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useMemo } from 'react'
import type {
    ResearchSession,
    SuggestedNode,
    ResearchNode,
    UseResearchGraphReturn,
    SuggestionsRequest,
    ResearchGraphSlice,
} from '../types'
import { SuggestionsResponseSchema } from '../schemas'
import { GraphNodeType as NodeTypeEnum } from '../types'
import { buildNodeLabel, generateId } from '../utils'

// ── Store accessor type ───────────────────────────────────────────────────────

export type StoreSelector = () => ResearchGraphSlice

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useResearchGraph(
    useStore: StoreSelector,
    apiPath = '/api/research/suggestions',
): UseResearchGraphReturn {
    const store = useStore()

    const fetchSuggestions = useCallback(async (nodeId: string): Promise<void> => {
        const session = store.researchSession
        if (!session) return

        const node = session.nodes.find(n => n.id === nodeId)
        if (!node) return

        const requestBody: SuggestionsRequest = {
            nodeType: node.type,
            nodeMeta: node.meta,
            sessionId: session.id,
            history: session.nodes.map(n => ({ type: n.type, meta: n.meta })),
        }

        try {
            const res = await fetch(apiPath, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            })

            if (!res.ok) {
                console.error(`[ResearchGraph] Suggestions API error: ${res.status}`)
                return
            }

            const raw = await res.json() as unknown
            const parsed = SuggestionsResponseSchema.safeParse(raw)
            if (!parsed.success) {
                console.error('[ResearchGraph] Invalid suggestions response:', parsed.error.flatten())
                return
            }

            const suggestions: SuggestedNode[] = parsed.data.suggestions.map(s => ({
                ...s,
                id: generateId(),
                parentId: nodeId,
            }))

            store.setSuggestions(suggestions)
        } catch (err) {
            console.error('[ResearchGraph] Failed to fetch suggestions:', err)
        }
    }, [store, apiPath])

    const ensureSession = useCallback((): void => {
        store.startSession()
    }, [store])

    const trackSearch = useCallback((query: string, parentId?: string): string => {
        const resolvedParentId = parentId ?? store.researchSession?.nodes[0]?.id ?? null
        const id = store.addNode({
            type: NodeTypeEnum.KEYWORD,
            label: buildNodeLabel.keyword(query),
            parentId: resolvedParentId,
            meta: { query },
        })
        if (id) void fetchSuggestions(id)
        return id
    }, [store, fetchSuggestions])

    const trackCategory = useCallback((
        name: string,
        categoryId: string,
        parentId?: string,
    ): string => {
        const resolvedParentId = parentId ?? store.researchSession?.nodes[0]?.id ?? null
        const id = store.addNode({
            type: NodeTypeEnum.CATEGORY,
            label: buildNodeLabel.category(name),
            parentId: resolvedParentId,
            meta: { categoryId },
        })
        if (id) void fetchSuggestions(id)
        return id
    }, [store, fetchSuggestions])

    const trackProduct = useCallback((
        title: string,
        asin: string,
        parentId: string,
    ): string => {
        const id = store.addNode({
            type: NodeTypeEnum.PRODUCT,
            label: buildNodeLabel.product(title),
            parentId,
            meta: { asin },
        })
        if (id) void fetchSuggestions(id)
        return id
    }, [store, fetchSuggestions])

    const trackSupplier = useCallback((
        name: string,
        supplierId: string,
        parentId: string,
    ): string => {
        const id = store.addNode({
            type: NodeTypeEnum.SUPPLIER,
            label: buildNodeLabel.supplier(name),
            parentId,
            meta: { supplierId },
        })
        if (id) void fetchSuggestions(id)
        return id
    }, [store, fetchSuggestions])

    const trackVectorSuggestion = useCallback((
        label: string,
        parentId: string,
    ): string => {
        return store.addNode({
            type: NodeTypeEnum.VECTOR,
            label: buildNodeLabel.vector(label),
            parentId,
            meta: {},
        })
    }, [store])

    const followSuggestion = useCallback((suggestion: SuggestedNode): string => {
        const id = store.addNode({
            type: suggestion.type,
            label: suggestion.label,
            parentId: suggestion.parentId,
            meta: suggestion.meta,
        })
        if (id) {
            void fetchSuggestions(id)
        }
        return id
    }, [store, fetchSuggestions])

    const currentNode = useMemo((): ResearchNode | null => {
        const session = store.researchSession
        if (!session?.currentId) return null
        return session.nodes.find(n => n.id === session.currentId) ?? null
    }, [store.researchSession])

    return {
        session: store.researchSession,
        suggestions: store.suggestions,
        currentNode,
        ensureSession,
        trackSearch,
        trackCategory,
        trackProduct,
        trackSupplier,
        trackVectorSuggestion,
        followSuggestion,
    }
}
