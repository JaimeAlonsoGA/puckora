import { NextRequest, NextResponse } from 'next/server'
import { SuggestionsRequestSchema, SuggestionsResponseSchema } from '@puckora/research-graph'
import { API_ERROR_MESSAGES, API_STATUS } from '@/constants/api'
import { buildSuggestionsResponse } from './_lib/suggestion-service'

export async function POST(req: NextRequest): Promise<NextResponse> {
    let body: unknown
    try {
        body = await req.json()
    } catch {
        return NextResponse.json(
            { error: API_ERROR_MESSAGES.INVALID_JSON_BODY },
            { status: API_STATUS.BAD_REQUEST },
        )
    }

    const parsed = SuggestionsRequestSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json(
            { error: API_ERROR_MESSAGES.VALIDATION_FAILED, details: parsed.error.flatten() },
            { status: API_STATUS.UNPROCESSABLE_ENTITY },
        )
    }

    let responseData
    try {
        responseData = await buildSuggestionsResponse(parsed.data)
    } catch (err) {
        console.error('[ResearchGraph API] Suggestions error:', err)
        return NextResponse.json(
            { error: API_ERROR_MESSAGES.INTERNAL_SERVER_ERROR },
            { status: API_STATUS.INTERNAL_SERVER_ERROR },
        )
    }

    const validated = SuggestionsResponseSchema.safeParse(responseData)
    if (!validated.success) {
        console.error('[ResearchGraph API] Invalid response shape:', validated.error)
        return NextResponse.json({ suggestions: [] })
    }

    return NextResponse.json(validated.data)
}
