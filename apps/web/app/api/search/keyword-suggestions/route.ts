import { NextResponse } from 'next/server'
import { z } from 'zod'
import { searchAmazonProductsByQuery } from '@puckora/vectors'
import { API_STATUS, API_ERROR_MESSAGES } from '@/constants/api'
import { extractKeywords } from './_lib/extractor'

const BodySchema = z.object({
    query: z.string().min(1).max(200),
})

const FETCH_LIMIT = 15

export async function POST(req: Request) {
    const body = await req.json()
    const parse = BodySchema.safeParse(body)
    if (!parse.success) {
        return NextResponse.json(
            { error: API_ERROR_MESSAGES.VALIDATION_FAILED },
            { status: API_STATUS.UNPROCESSABLE_ENTITY },
        )
    }

    try {
        const rows = await searchAmazonProductsByQuery(parse.data.query, FETCH_LIMIT, 0.3)
        const keywords = extractKeywords(rows, parse.data.query)
        return NextResponse.json({ keywords })
    } catch {
        return NextResponse.json({ keywords: [] as string[] })
    }
}
