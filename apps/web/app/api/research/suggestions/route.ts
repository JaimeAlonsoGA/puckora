import { NextRequest, NextResponse } from 'next/server'
import { SuggestionsRequestSchema, SuggestionsResponseSchema } from '@puckora/research-graph'
import type { SuggestionsRequest, SuggestionsApiResponse, SuggestedNode } from '@puckora/research-graph'

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

// ── Business logic ────────────────────────────────────────────────────────────
//
// TODO: Replace stub with real pgvector queries against product_financials:
//
//   SELECT title, asin, category_path, 1 - (embedding <=> $query_embedding) AS score
//   FROM amazon_products
//   WHERE 1 - (embedding <=> $query_embedding) > 0.65
//   ORDER BY score DESC
//   LIMIT 4;
//
// Map results to SuggestedNode shape and return.

async function handleSuggestions(request: SuggestionsRequest): Promise<SuggestionsApiResponse> {
    return { suggestions: buildStubSuggestions(request.nodeType, request.nodeMeta) }
}

type SuggestionShape = Omit<SuggestedNode, 'id' | 'parentId'>

function buildStubSuggestions(
    nodeType: SuggestionsRequest['nodeType'],
    meta: SuggestionsRequest['nodeMeta'],
): SuggestionShape[] {
    switch (nodeType) {
        case 'keyword':
            return [
                { type: 'supplier', label: 'Check suppliers', reason: 'Suppliers on GlobalSources matching this keyword', score: 0.88, meta: { query: meta.query } },
                { type: 'keyword', label: `"${meta.query ?? ''} accessories"`, reason: 'Vector-similar search (84% similarity)', score: 0.84, meta: { query: `${meta.query ?? ''} accessories` } },
                { type: 'category', label: 'Related categories', reason: 'Adjacent category with margin overlap', score: 0.72, meta: {} },
            ]
        case 'product':
            return [
                { type: 'supplier', label: 'Find suppliers', reason: 'Manufacturers for this product type on GlobalSources', score: 0.91, meta: {} },
                { type: 'product', label: 'Similar products', reason: 'Vector-similar products (90% similarity)', score: 0.90, meta: {} },
                { type: 'vector', label: 'Pucki: run fee calc', reason: 'Based on dimensions and price, fee calc recommended', score: 0.80, meta: { asin: meta.asin } },
            ]
        case 'category':
            return [
                { type: 'keyword', label: 'Top search in category', reason: 'Most searched keyword in this category', score: 0.85, meta: {} },
                { type: 'category', label: 'Adjacent category', reason: 'High margin overlap with current category', score: 0.75, meta: {} },
            ]
        case 'supplier':
            return [
                { type: 'supplier', label: 'Similar supplier', reason: 'Similar MOQ, certifications, and product range', score: 0.82, meta: {} },
                { type: 'product', label: 'Back to product', reason: 'Return to the product you were investigating', score: 0.78, meta: { asin: meta.asin } },
            ]
        default:
            return []
    }
}
