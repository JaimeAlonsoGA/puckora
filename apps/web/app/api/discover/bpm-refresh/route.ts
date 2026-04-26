/**
 * GET /api/discover/bpm-refresh?asins=A,B,C
 *
 * Lightweight endpoint that returns the current bought_past_month values for
 * a fixed set of ASINs (primary-key lookups, very fast). Used by the client
 * polling loop to pick up BPM repair progress without re-running the full
 * discover query (which would cause the product set to oscillate).
 */
import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { createFlyioDb } from '@/integrations/flyio/client'
import { API_STATUS, API_ERROR_MESSAGES } from '@/constants/api'

// Amazon ASINs are 10 uppercase alphanumeric characters.
const ASIN_RE = /^[A-Z0-9]{10}$/i
const MAX_ASINS = 200

export async function GET(req: NextRequest) {
    const raw = req.nextUrl.searchParams.get('asins') ?? ''
    const asins = raw
        .split(',')
        .map((a) => a.trim())
        .filter((a) => ASIN_RE.test(a))
        .slice(0, MAX_ASINS)

    if (asins.length === 0) {
        return NextResponse.json(
            { error: API_ERROR_MESSAGES.VALIDATION_FAILED },
            { status: API_STATUS.UNPROCESSABLE_ENTITY },
        )
    }

    const db = createFlyioDb()
    const asinList = sql.join(asins.map((a) => sql`${a}`), sql`, `)
    const rows = await db.execute(
        sql`SELECT asin, bought_past_month FROM amazon_products WHERE asin IN (${asinList})`,
    )

    // Return a flat { [asin]: bought_past_month | null } map.
    const result: Record<string, number | null> = {}
    for (const row of rows.rows as { asin: string; bought_past_month: number | null }[]) {
        result[row.asin] = row.bought_past_month ?? null
    }

    return NextResponse.json(result)
}
