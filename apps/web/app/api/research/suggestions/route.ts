import { NextRequest, NextResponse } from 'next/server'
import { SuggestionsRequestSchema, SuggestionsResponseSchema } from '@puckora/research-graph'
import type { SuggestionsRequest, SuggestionsApiResponse, SuggestedNode } from '@puckora/research-graph'
import type { AmazonVectorSearchRow } from '@puckora/vectors'
import { searchAmazonProductsByAsin, searchAmazonProductsByQuery } from '@puckora/vectors'

export async function POST(req: NextRequest): Promise<NextResponse> {
    let body: unknown
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = SuggestionsRequestSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Invalid request', details: parsed.error.flatten() },
            { status: 422 },
        )
    }

    let responseData: SuggestionsApiResponse
    try {
        responseData = await handleSuggestions(parsed.data)
    } catch (err) {
        console.error('[ResearchGraph API] Suggestions error:', err)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }

    const validated = SuggestionsResponseSchema.safeParse(responseData)
    if (!validated.success) {
        console.error('[ResearchGraph API] Invalid response shape:', validated.error)
        return NextResponse.json({ suggestions: [] })
    }

    return NextResponse.json(validated.data)
}

async function handleSuggestions(request: SuggestionsRequest): Promise<SuggestionsApiResponse> {
    try {
        const results = await resolveSuggestions(request)
        return { suggestions: results.map(mapSearchRowToSuggestion) }
    } catch (error) {
        console.error('[ResearchGraph API] Vector suggestions unavailable:', error)
        return { suggestions: [] }
    }
}

type SuggestionShape = Omit<SuggestedNode, 'id' | 'parentId'>

async function resolveSuggestions(request: SuggestionsRequest): Promise<AmazonVectorSearchRow[]> {
    const currentQuery = request.nodeMeta.query?.trim()
    const currentAsin = request.nodeMeta.asin?.trim()
    const historyQuery = [...request.history].reverse().find((item) => item.meta.query)?.meta.query?.trim()
    const historyAsin = [...request.history].reverse().find((item) => item.meta.asin)?.meta.asin?.trim()

    switch (request.nodeType) {
        case 'keyword':
            if (currentQuery) return searchAmazonProductsByQuery(currentQuery, 4)
            return historyQuery ? searchAmazonProductsByQuery(historyQuery, 4) : []
        case 'product':
            if (currentAsin) return searchAmazonProductsByAsin(currentAsin, 4)
            return historyQuery ? searchAmazonProductsByQuery(historyQuery, 4) : []
        case 'category':
        case 'supplier':
        case 'vector':
        case 'session':
            if (historyQuery) return searchAmazonProductsByQuery(historyQuery, 4)
            if (historyAsin) return searchAmazonProductsByAsin(historyAsin, 4)
            return []
        default:
            return []
    }
}

function mapSearchRowToSuggestion(row: AmazonVectorSearchRow): SuggestionShape {
    const label = truncate(row.title ?? row.asin, 60)
    const category = row.category_path ? ` in ${truncate(row.category_path, 90)}` : ''
    const similarity = `${Math.round(row.score * 100)}% similarity`

    return {
        type: 'product',
        label,
        reason: truncate(`Semantic match${category} • ${similarity}`, 200),
        score: clampScore(row.score),
        meta: { asin: row.asin },
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
