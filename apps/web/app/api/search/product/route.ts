/**
 * GET /api/search/product?asin=<ASIN>&marketplace=<marketplace>
 *
 * Returns a single ProductFinancial by ASIN, or null if not found.
 * Used by the client-side amazon product query for live data access.
 *
 * Auth: cookie-based session (browser requests only).
 */

import { NextRequest, NextResponse } from 'next/server'
import { API_ERROR_MESSAGES, API_STATUS } from '@/constants/api'
import { createServerClient } from '@/integrations/supabase/server'
import { createFlyioDb } from '@/integrations/flyio/client'
import { ProductSearchParamsSchema } from '@/schemas/api'
import { getProductByAsin } from '@/services/amazon-product'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE_HEADERS = {
    'Cache-Control': 'no-store, max-age=0, must-revalidate',
}

export async function GET(req: NextRequest) {
    const parsedParams = ProductSearchParamsSchema.safeParse({
        asin: req.nextUrl.searchParams.get('asin') ?? undefined,
        marketplace: req.nextUrl.searchParams.get('marketplace') ?? undefined,
    })

    if (!parsedParams.success) {
        const issue = parsedParams.error.issues[0]
        const message = issue?.path[0] === 'marketplace'
            ? API_ERROR_MESSAGES.INVALID_MARKETPLACE
            : API_ERROR_MESSAGES.ASIN_INVALID

        return NextResponse.json(
            { error: message },
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
        const db = createFlyioDb()
        const product = await getProductByAsin(db, asin)

        if (!product) {
            return NextResponse.json(null, { headers: NO_STORE_HEADERS })
        }

        return NextResponse.json(product, { headers: NO_STORE_HEADERS })
    } catch (err) {
        const message = err instanceof Error ? err.message : API_ERROR_MESSAGES.INTERNAL_ERROR
        return NextResponse.json(
            { error: message },
            { status: API_STATUS.INTERNAL_SERVER_ERROR },
        )
    }
}
