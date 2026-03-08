/**
 * GET /api/pulse/amazon-match
 *
 * Checks Amazon (via SP-API) for products matching a 1688 product title.
 * Designed for the demand overlay triggered on supplier card hover.
 *
 * Query params:
 *   q          — product title / keyword to search
 *   marketplace — puckora marketplace code (default: "US")
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { searchCatalogItems, toSpApiMarketplaceId } from '@/lib/sp-api/client'
import type { CatalogItem, CatalogItemSalesRank, CatalogItemSummary } from '@/lib/sp-api/types'
import type { AmazonMatchResult, AmazonMatchResponse } from '@/lib/pulse/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractTitle(item: CatalogItem, marketplaceId: string): string | null {
    const summary = item.summaries?.find((s) => s.marketplaceId === marketplaceId)
    return summary?.itemName ?? null
}

function extractBrand(item: CatalogItem, marketplaceId: string): string | null {
    const summary = item.summaries?.find((s: CatalogItemSummary) => s.marketplaceId === marketplaceId)
    return summary?.brand ?? null
}

function extractImage(item: CatalogItem, marketplaceId: string): string | null {
    const imageSet = item.images?.find((img) => img.marketplaceId === marketplaceId)
    if (!imageSet?.images?.length) return null
    // Prefer MAIN variant, fall back to first image
    const main = imageSet.images.find((img) => img.variant === 'MAIN') ?? imageSet.images[0]
    return main?.link ?? null
}

function extractBsr(
    item: CatalogItem,
    marketplaceId: string,
): { rank: number; category: string } | null {
    const rankSet = item.salesRanks?.find(
        (r: CatalogItemSalesRank) => r.marketplaceId === marketplaceId,
    )
    if (!rankSet) return null

    // Prefer classificationRanks (most specific), fall back to displayGroupRanks
    const classification = rankSet.classificationRanks?.[0]
    if (classification) {
        return { rank: classification.rank, category: classification.title }
    }
    const displayGroup = rankSet.displayGroupRanks?.[0]
    if (displayGroup) {
        return { rank: displayGroup.rank, category: displayGroup.title }
    }
    return null
}

function buildAmazonUrl(asin: string, marketplace: string): string {
    const DOMAIN_MAP: Record<string, string> = {
        US: 'amazon.com',
        CA: 'amazon.ca',
        UK: 'amazon.co.uk',
        DE: 'amazon.de',
        FR: 'amazon.fr',
        IT: 'amazon.it',
        ES: 'amazon.es',
        JP: 'amazon.co.jp',
        AU: 'amazon.com.au',
        MX: 'amazon.com.mx',
        IN: 'amazon.in',
        SG: 'amazon.com.sg',
        AE: 'amazon.ae',
        SA: 'amazon.sa',
        NL: 'amazon.nl',
        SE: 'amazon.se',
        PL: 'amazon.pl',
        TR: 'amazon.com.tr',
        BR: 'amazon.com.br',
    }
    const domain = DOMAIN_MAP[marketplace] ?? 'amazon.com'
    return `https://www.${domain}/dp/${asin}`
}

// Truncate a long product title to a meaningful search string for SP-API
function cleanKeyword(title: string): string {
    // Remove common supplier noise (brackets, specs strings, Chinese characters)
    const cleaned = title
        .replace(/[\u4e00-\u9fff]+/g, '') // strip Chinese
        .replace(/[[\](){}]/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim()

    // Keep max 7 words for a focused search
    const words = cleaned.split(' ').filter(Boolean).slice(0, 7)
    return words.join(' ')
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const supabase = await createServerClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const rawQ = searchParams.get('q') ?? ''
        const marketplace = searchParams.get('marketplace') ?? 'US'

        const keyword = cleanKeyword(rawQ)
        if (!keyword) {
            return NextResponse.json({ error: 'Missing query param "q"' }, { status: 400 })
        }

        const marketplaceId = toSpApiMarketplaceId(marketplace)
        if (!marketplaceId) {
            return NextResponse.json(
                { error: `Unsupported marketplace: ${marketplace}` },
                { status: 400 },
            )
        }

        const catalogResponse = await searchCatalogItems({
            marketplaceIds: [marketplaceId],
            keywords: [keyword],
            includedData: ['summaries', 'salesRanks', 'images'],
            pageSize: 3,
        })

        if (!catalogResponse.items?.length) {
            const empty: AmazonMatchResponse = { found: false, results: [], marketplace }
            return NextResponse.json(empty)
        }

        const results: AmazonMatchResult[] = catalogResponse.items.map((item) => {
            const bsrData = extractBsr(item, marketplaceId)
            return {
                asin: item.asin,
                title: extractTitle(item, marketplaceId),
                brand: extractBrand(item, marketplaceId),
                imageUrl: extractImage(item, marketplaceId),
                bsr: bsrData?.rank ?? null,
                bsrCategory: bsrData?.category ?? null,
                amazonUrl: buildAmazonUrl(item.asin, marketplace),
            }
        })

        const response: AmazonMatchResponse = { found: true, results, marketplace }
        return NextResponse.json(response)
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal server error'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
