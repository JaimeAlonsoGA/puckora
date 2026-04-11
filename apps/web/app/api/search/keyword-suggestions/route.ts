import { NextResponse } from 'next/server'
import { searchAmazonProductsByQuery } from '@puckora/vectors'
import { API_STATUS, API_ERROR_MESSAGES } from '@/constants/api'
import { KEYWORD_SUGGESTIONS_REQUEST } from '@/constants/search'
import { KeywordSuggestionsBodySchema } from '@/schemas/api'
import { extractKeywords } from './_lib/extractor'

export async function POST(req: Request) {
    const body = await req.json()
    const parse = KeywordSuggestionsBodySchema.safeParse(body)
    if (!parse.success) {
        return NextResponse.json(
            { error: API_ERROR_MESSAGES.VALIDATION_FAILED },
            { status: API_STATUS.UNPROCESSABLE_ENTITY },
        )
    }

    try {
        const rows = await searchAmazonProductsByQuery(
            parse.data.query,
            KEYWORD_SUGGESTIONS_REQUEST.FETCH_LIMIT,
            KEYWORD_SUGGESTIONS_REQUEST.SIMILARITY_THRESHOLD,
        )
        const keywords = extractKeywords(rows, parse.data.query)
        return NextResponse.json({ keywords })
    } catch {
        return NextResponse.json({ keywords: [] as string[] })
    }
}
