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
import { API_ERROR_MESSAGES, API_STATUS } from '@/constants/api'
import { createServerClient } from '@/integrations/supabase/server'
import { createFlyioDb } from '@/integrations/flyio/client'
import { KeywordResultsSearchParamsSchema } from '@/schemas/api'
import { getKeyword, getProductsForKeyword } from '@/services/keywords'

export async function GET(req: NextRequest) {
    const parsedParams = KeywordResultsSearchParamsSchema.safeParse({
        keyword: req.nextUrl.searchParams.get('keyword') ?? undefined,
        marketplace: req.nextUrl.searchParams.get('marketplace') ?? undefined,
    })

    if (!parsedParams.success) {
        const issue = parsedParams.error.issues[0]
        const message = issue?.path[0] === 'marketplace'
            ? API_ERROR_MESSAGES.INVALID_MARKETPLACE
            : API_ERROR_MESSAGES.KEYWORD_REQUIRED

        return NextResponse.json({ error: message }, { status: API_STATUS.BAD_REQUEST })
    }

    const { keyword, marketplace } = parsedParams.data

    const supabase = await createServerClient()
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        return NextResponse.json({ error: API_ERROR_MESSAGES.UNAUTHORIZED }, { status: API_STATUS.UNAUTHORIZED })
    }

    try {
        const db = createFlyioDb()
        const keywordRow = await getKeyword(db, keyword, marketplace)
        if (!keywordRow) return NextResponse.json([])

        const products = await getProductsForKeyword(db, keywordRow.id)
        return NextResponse.json(products)
    } catch (err) {
        const message = err instanceof Error ? err.message : API_ERROR_MESSAGES.INTERNAL_ERROR
        return NextResponse.json({ error: message }, { status: API_STATUS.INTERNAL_SERVER_ERROR })
    }
}
