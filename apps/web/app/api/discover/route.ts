/**
 * GET /api/discover?minPrice=&maxPrice=&minRating=&maxRating=&minReviews=&maxReviews=&categories=&limit=
 *
 * Development/test endpoint that runs `discoverProducts` and returns timing info.
 * Not exposed to the public; protected by the same middleware auth guard.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createFlyioDb } from '@/integrations/flyio/client'
import { discoverProducts } from '@/services/products'
import { DiscoverFiltersSchema } from '@/schemas/discover'
import { API_STATUS, API_ERROR_MESSAGES } from '@/constants/api'

export async function GET(req: NextRequest) {
    const sp = req.nextUrl.searchParams
    const raw = {
        minPrice: sp.get('minPrice') ?? undefined,
        maxPrice: sp.get('maxPrice') ?? undefined,
        minRating: sp.get('minRating') ?? undefined,
        maxRating: sp.get('maxRating') ?? undefined,
        minReviews: sp.get('minReviews') ?? undefined,
        maxReviews: sp.get('maxReviews') ?? undefined,
        categories: sp.get('categories') ?? undefined,
        limit: sp.get('limit') ?? undefined,
    }

    const parsed = DiscoverFiltersSchema.safeParse(raw)
    if (!parsed.success) {
        return NextResponse.json(
            { error: API_ERROR_MESSAGES.VALIDATION_FAILED, issues: parsed.error.flatten() },
            { status: API_STATUS.UNPROCESSABLE_ENTITY },
        )
    }

    const db = createFlyioDb()
    const products = await discoverProducts(db, parsed.data)

    return NextResponse.json(products)
}
