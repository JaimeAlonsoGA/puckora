import { NextRequest, NextResponse } from 'next/server'
import { SuggestionsRequestSchema, SuggestionsResponseSchema } from '@puckora/research-graph'
import { buildSuggestionsResponse } from './_lib/suggestion-service'

const ROUTE_ERROR_MESSAGE = {
    INVALID_JSON: 'Invalid JSON',
    INVALID_REQUEST: 'Invalid request',
    INTERNAL_ERROR: 'Internal error',
} as const

export async function POST(req: NextRequest): Promise<NextResponse> {
    let body: unknown
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: ROUTE_ERROR_MESSAGE.INVALID_JSON }, { status: 400 })
    }

    const parsed = SuggestionsRequestSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json(
            { error: ROUTE_ERROR_MESSAGE.INVALID_REQUEST, details: parsed.error.flatten() },
            { status: 422 },
        )
    }

    let responseData
    try {
        responseData = await buildSuggestionsResponse(parsed.data)
    } catch (err) {
        console.error('[ResearchGraph API] Suggestions error:', err)
        return NextResponse.json({ error: ROUTE_ERROR_MESSAGE.INTERNAL_ERROR }, { status: 500 })
    }

    const validated = SuggestionsResponseSchema.safeParse(responseData)
    if (!validated.success) {
        console.error('[ResearchGraph API] Invalid response shape:', validated.error)
        return NextResponse.json({ suggestions: [] })
    }

    return NextResponse.json(validated.data)
}
