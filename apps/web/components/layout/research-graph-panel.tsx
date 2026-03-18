'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { ResearchNode, ResearchSession, SuggestedNode } from '@puckora/research-graph'
import { ResearchGraph, useResearchGraph } from '@puckora/research-graph'
import { Caption } from '@puckora/ui'
import { MODULE_IDS } from '@/constants/app-state'
import { useAppStore } from '@/lib/store'
import { AppRoute } from '@/constants/routes'

function getNodeById(session: ResearchSession, nodeId: string | null | undefined): ResearchNode | null {
    if (!nodeId) return null
    return session.nodes.find((node) => node.id === nodeId) ?? null
}

function resolveNearestQuery(session: ResearchSession, nodeId: string | null | undefined): string | null {
    let cursor = getNodeById(session, nodeId)

    while (cursor) {
        if (cursor.meta.query) return cursor.meta.query
        cursor = getNodeById(session, cursor.parentId)
    }

    return null
}

function buildSearchProductsHref(query: string): Route {
    return `${AppRoute.search}/${encodeURIComponent(query)}?view=products` as Route
}

export function ResearchGraphPanel() {
    const t = useTranslations('nav')
    const slice = useAppStore()
    const router = useRouter()
    const { followSuggestion } = useResearchGraph(useAppStore)
    const { resetSession, setPuckiContext } = useAppStore()

    function navigateToNode(node: ResearchNode) {
        const session = slice.researchSession
        if (!session) return

        if (node.type === 'session') {
            resetSession()
            setPuckiContext({ currentAsin: undefined, currentQuery: undefined, currentModule: MODULE_IDS.SEARCH })
            router.push(AppRoute.home)
            return
        }

        if (node.type === 'keyword' && node.meta.query) {
            setPuckiContext({ currentAsin: undefined, currentQuery: node.meta.query, currentModule: MODULE_IDS.SEARCH })
            router.push(`${AppRoute.search}/${encodeURIComponent(node.meta.query)}` as Route)
            return
        }

        if (node.type === 'product' && node.meta.asin) {
            const query = node.meta.query ?? resolveNearestQuery(session, node.id)
            setPuckiContext({ currentAsin: node.meta.asin, currentQuery: query ?? undefined, currentModule: MODULE_IDS.SEARCH })
            if (query) {
                router.push(buildSearchProductsHref(query))
            }
        }
    }

    function navigateToSuggestion(suggestion: SuggestedNode) {
        const session = slice.researchSession
        const suggestionId = followSuggestion(suggestion)
        if (!session || !suggestionId) return

        if (suggestion.type === 'keyword' && suggestion.meta.query) {
            setPuckiContext({ currentAsin: undefined, currentQuery: suggestion.meta.query, currentModule: MODULE_IDS.SEARCH })
            router.push(`${AppRoute.search}/${encodeURIComponent(suggestion.meta.query)}` as Route)
            return
        }

        if (suggestion.type === 'product' && suggestion.meta.asin) {
            const query = suggestion.meta.query ?? resolveNearestQuery(session, suggestion.parentId)
            setPuckiContext({ currentAsin: suggestion.meta.asin, currentQuery: query ?? undefined, currentModule: MODULE_IDS.SEARCH })
            if (query) {
                router.push(buildSearchProductsHref(query))
            }
        }
    }

    if (!slice.researchSession) {
        return (
            <div className="flex flex-1 items-center justify-center px-3 text-center">
                <Caption as="p" className="leading-relaxed">{t('graphEmpty')}</Caption>
            </div>
        )
    }

    return (
        <div className="min-h-0 flex-1 px-2 pb-2 pt-1">
            <ResearchGraph
                slice={slice}
                height="100%"
                onNavigate={({ node }) => navigateToNode(node)}
                onFollowSuggestion={({ suggestion }) => navigateToSuggestion(suggestion)}
            />
        </div>
    )
}
