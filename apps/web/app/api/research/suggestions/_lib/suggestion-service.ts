import {
    GraphNodeTypeEnum,
    type SuggestionsApiResponse,
    type SuggestionsRequest,
    type SuggestedNode,
} from '@puckora/research-graph'
import type { AmazonVectorSearchRow } from '@puckora/vectors'
import { searchAmazonProductsByAsin, searchAmazonProductsByQuery } from '@puckora/vectors'
import type { ProductFinancial } from '@puckora/types'
import { WEB_MARKETPLACE_IDS } from '@/constants/amazon-marketplace'
import { createFlyioDb } from '@/integrations/flyio/client'
import { getKeyword, getProductsForKeyword } from '@/services/keywords'

const SUGGESTION_LIMIT = 4
const SUGGESTION_LABEL_MAX_LENGTH = 60
const SUGGESTION_REASON_MAX_LENGTH = 200
const FALLBACK_SUGGESTION_SCORE = 0.45

const SUGGESTION_REASON_TEXT = {
    SEMANTIC_MATCH: 'Semantic match',
    KEYWORD_RESULT: 'Keyword result',
    SAVED_SEARCH_RESULT: 'saved search result',
    SIMILARITY: 'similarity',
    CATEGORY_PREFIX: ' in ',
} as const

type SuggestionShape = Omit<SuggestedNode, 'id' | 'parentId'>

interface SuggestionContext {
    request: SuggestionsRequest
    currentQuery?: string
    currentAsin?: string
    historyQuery?: string
    historyAsin?: string
    fallbackQuery: string | null
}

type VectorSuggestionResolver = (context: SuggestionContext) => Promise<AmazonVectorSearchRow[]>

const vectorSuggestionResolvers: Record<SuggestionsRequest['nodeType'], VectorSuggestionResolver> = {
    [GraphNodeTypeEnum.KEYWORD]: async ({ currentQuery, historyQuery }) => {
        if (currentQuery) return searchAmazonProductsByQuery(currentQuery, SUGGESTION_LIMIT)
        return historyQuery ? searchAmazonProductsByQuery(historyQuery, SUGGESTION_LIMIT) : []
    },
    [GraphNodeTypeEnum.PRODUCT]: async ({ currentAsin, historyQuery }) => {
        if (currentAsin) return searchAmazonProductsByAsin(currentAsin, SUGGESTION_LIMIT)
        return historyQuery ? searchAmazonProductsByQuery(historyQuery, SUGGESTION_LIMIT) : []
    },
    [GraphNodeTypeEnum.CATEGORY]: resolveHistorySuggestions,
    [GraphNodeTypeEnum.SUPPLIER]: resolveHistorySuggestions,
    [GraphNodeTypeEnum.VECTOR]: resolveHistorySuggestions,
    [GraphNodeTypeEnum.SESSION]: resolveHistorySuggestions,
}

export async function buildSuggestionsResponse(
    request: SuggestionsRequest,
): Promise<SuggestionsApiResponse> {
    return { suggestions: await resolveSuggestions(request) }
}

async function resolveSuggestions(request: SuggestionsRequest): Promise<SuggestionShape[]> {
    const context = buildSuggestionContext(request)

    let vectorResults: AmazonVectorSearchRow[] = []
    try {
        vectorResults = await resolveVectorSuggestions(context)
    } catch (error) {
        console.error('[ResearchGraph API] Vector suggestions unavailable:', error)
    }

    if (vectorResults.length > 0) {
        return vectorResults.map((row) => mapSearchRowToSuggestion(row, context.fallbackQuery))
    }

    return resolveKeywordFallbackSuggestions(context.fallbackQuery)
}

function buildSuggestionContext(request: SuggestionsRequest): SuggestionContext {
    const currentQuery = request.nodeMeta.query?.trim()
    const currentAsin = request.nodeMeta.asin?.trim()
    const historyQuery = [...request.history].reverse().find((item) => item.meta.query)?.meta.query?.trim()
    const historyAsin = [...request.history].reverse().find((item) => item.meta.asin)?.meta.asin?.trim()

    return {
        request,
        currentQuery,
        currentAsin,
        historyQuery,
        historyAsin,
        fallbackQuery: currentQuery ?? historyQuery ?? null,
    }
}

async function resolveVectorSuggestions(context: SuggestionContext): Promise<AmazonVectorSearchRow[]> {
    return vectorSuggestionResolvers[context.request.nodeType](context)
}

async function resolveHistorySuggestions({ historyQuery, historyAsin }: SuggestionContext) {
    if (historyQuery) return searchAmazonProductsByQuery(historyQuery, SUGGESTION_LIMIT)
    if (historyAsin) return searchAmazonProductsByAsin(historyAsin, SUGGESTION_LIMIT)
    return []
}

async function resolveKeywordFallbackSuggestions(query: string | null): Promise<SuggestionShape[]> {
    if (!query) return []

    const db = createFlyioDb()

    for (const marketplace of WEB_MARKETPLACE_IDS) {
        const keywordRow = await getKeyword(db, query, marketplace)
        if (!keywordRow) continue

        const products = await getProductsForKeyword(db, keywordRow.id)
        return products
            .filter((product) => Boolean(product.asin && product.title))
            .slice(0, SUGGESTION_LIMIT)
            .map((product) => mapFallbackProductToSuggestion(product, query))
    }

    return []
}

function mapSearchRowToSuggestion(row: AmazonVectorSearchRow, query: string | null): SuggestionShape {
    const label = truncate(row.title ?? row.asin, SUGGESTION_LABEL_MAX_LENGTH)
    const category = row.category_path
        ? `${SUGGESTION_REASON_TEXT.CATEGORY_PREFIX}${truncate(row.category_path, 90)}`
        : ''
    const similarity = `${Math.round(row.score * 100)}% ${SUGGESTION_REASON_TEXT.SIMILARITY}`

    return {
        type: GraphNodeTypeEnum.PRODUCT,
        label,
        reason: truncate(
            `${SUGGESTION_REASON_TEXT.SEMANTIC_MATCH}${category} • ${similarity}`,
            SUGGESTION_REASON_MAX_LENGTH,
        ),
        score: clampScore(row.score),
        meta: { asin: row.asin, query: query ?? undefined },
    }
}

function mapFallbackProductToSuggestion(product: ProductFinancial, query: string): SuggestionShape {
    const label = truncate(product.title ?? product.asin ?? 'Unknown product', SUGGESTION_LABEL_MAX_LENGTH)
    const category = product.category_path
        ? `${SUGGESTION_REASON_TEXT.CATEGORY_PREFIX}${truncate(product.category_path, 90)}`
        : ''
    const rank = product.rank != null
        ? `BSR #${product.rank.toLocaleString()}`
        : SUGGESTION_REASON_TEXT.SAVED_SEARCH_RESULT

    return {
        type: GraphNodeTypeEnum.PRODUCT,
        label,
        reason: truncate(
            `${SUGGESTION_REASON_TEXT.KEYWORD_RESULT}${category} • ${rank}`,
            SUGGESTION_REASON_MAX_LENGTH,
        ),
        score: FALLBACK_SUGGESTION_SCORE,
        meta: { asin: product.asin ?? undefined, query },
    }
}

function truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) return value
    return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

function clampScore(value: number): number {
    if (!Number.isFinite(value)) return 0
    return Math.max(0, Math.min(1, value))
}