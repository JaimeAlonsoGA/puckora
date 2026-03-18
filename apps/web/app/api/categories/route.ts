import { NextRequest, NextResponse } from 'next/server'
import { API_ERROR_MESSAGES, API_STATUS } from '@/constants/api'
import { MarketplaceSearchParamsSchema } from '@/schemas/api'
import { getCachedTopCategories } from '@/server/categories'

export async function GET(req: NextRequest) {
    const parsedParams = MarketplaceSearchParamsSchema.safeParse({
        marketplace: req.nextUrl.searchParams.get('marketplace') ?? undefined,
    })

    if (!parsedParams.success) {
        return NextResponse.json({ error: API_ERROR_MESSAGES.INVALID_MARKETPLACE }, { status: API_STATUS.BAD_REQUEST })
    }

    const { marketplace } = parsedParams.data
    const categories = await getCachedTopCategories(marketplace)
    return NextResponse.json(categories)
}
