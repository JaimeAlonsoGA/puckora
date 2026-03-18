/**
 * GET /api/search/keyword-results?keyword=<keyword>&marketplace=<marketplace>
 *
 * Returns ProductFinancial[] for a keyword + marketplace pair.
 * Called by the client polling mechanism on /search/[query] when the SP-API
 * background task is still running and SSR returned an empty product list.
 *
 * Auth: cookie-based session (browser requests only).
 * Returns [] when no keyword row exists yet — the client retries via refetchInterval.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/integrations/supabase/server'
import { createFlyioDb } from '@/integrations/flyio/client'
import { getKeyword, getProductsForKeyword } from '@/services/keywords'

export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl
    const keyword = searchParams.get('keyword')
    const marketplace = searchParams.get('marketplace') ?? 'US'

    if (!keyword) {
        return NextResponse.json({ error: 'keyword is required' }, { status: 400 })
    }

    const supabase = await createServerClient()
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const db = createFlyioDb()
        const keywordRow = await getKeyword(db, keyword, marketplace)
        if (!keywordRow) return NextResponse.json([])

        const products = await getProductsForKeyword(db, keywordRow.id)
        return NextResponse.json(products)
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
