import { NextRequest, NextResponse } from 'next/server'
import { getCachedTopCategories } from '@/server/categories'

export async function GET(req: NextRequest) {
    const marketplace = req.nextUrl.searchParams.get('marketplace') ?? 'US'
    const categories = await getCachedTopCategories(marketplace)
    return NextResponse.json(categories)
}
