/**
 * GET /api/search/product/similar?asin=<ASIN>
 *
 * Returns semantically similar products by ASIN using pgvector cosine similarity.
 * Used by the client-side similarProductsQueryOptions for the product detail page sidebar.
 *
 * Auth: cookie-based session (browser requests only).
 */

import { NextRequest, NextResponse } from 'next/server'
import { API_ERROR_MESSAGES, API_STATUS } from '@/constants/api'
import { SIMILAR_PRODUCTS_REQUEST } from '@/constants/search'
import { createServerClient } from '@/integrations/supabase/server'
import { ProductSearchParamsSchema } from '@/schemas/api'
import { searchAmazonProductsByAsin } from '@puckora/vectors'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE_HEADERS = {
    'Cache-Control': 'no-store, max-age=0, must-revalidate',
}

const AsinOnlySchema = ProductSearchParamsSchema.pick({ asin: true })

export async function GET(req: NextRequest) {
    const parsedParams = AsinOnlySchema.safeParse({
        asin: req.nextUrl.searchParams.get('asin') ?? undefined,
    })

    if (!parsedParams.success) {
        return NextResponse.json(
            { error: API_ERROR_MESSAGES.ASIN_INVALID },
            { status: API_STATUS.BAD_REQUEST },
        )
    }

    const { asin } = parsedParams.data

    const supabase = await createServerClient()
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        return NextResponse.json(
            { error: API_ERROR_MESSAGES.UNAUTHORIZED },
            { status: API_STATUS.UNAUTHORIZED },
        )
    }

    try {
        const results = await searchAmazonProductsByAsin(
            asin,
            SIMILAR_PRODUCTS_REQUEST.FETCH_LIMIT,
            SIMILAR_PRODUCTS_REQUEST.MIN_SCORE,
        )

        return NextResponse.json(results, { headers: NO_STORE_HEADERS })
    } catch (err) {
        const message = err instanceof Error ? err.message : API_ERROR_MESSAGES.INTERNAL_SERVER_ERROR
        return NextResponse.json(
            { error: message },
            { status: API_STATUS.INTERNAL_SERVER_ERROR },
        )
    }
}
