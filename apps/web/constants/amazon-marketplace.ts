import {
    DEFAULT_MARKETPLACE,
    MARKETPLACES,
    type AmazonMarketplace,
} from '@puckora/types'

export const WEB_MARKETPLACE_IDS = ['US', 'UK', 'DE', 'ES'] as const satisfies readonly AmazonMarketplace[]

export type WebMarketplaceId = (typeof WEB_MARKETPLACE_IDS)[number]

export const DEFAULT_WEB_MARKETPLACE = DEFAULT_MARKETPLACE

const MARKETPLACE_DOMAIN_ENTRIES = MARKETPLACES.map((marketplace) => [marketplace.id, marketplace.domain])

export const AMAZON_MARKETPLACE_DOMAINS = Object.fromEntries(
    MARKETPLACE_DOMAIN_ENTRIES,
) as Record<AmazonMarketplace, string>

export const AMAZON_SEARCH_PATH = '/s'
export const AMAZON_PRODUCT_PATH_PREFIX = '/dp/'

export function resolveMarketplaceId(marketplace?: string | null): AmazonMarketplace {
    if (!marketplace) return DEFAULT_MARKETPLACE

    const normalizedMarketplace = marketplace.toUpperCase() as AmazonMarketplace
    if (normalizedMarketplace in AMAZON_MARKETPLACE_DOMAINS) {
        return normalizedMarketplace
    }

    return DEFAULT_MARKETPLACE
}

export function resolveMarketplaceDomain(marketplace?: string | null): string {
    return AMAZON_MARKETPLACE_DOMAINS[resolveMarketplaceId(marketplace)]
}

export function buildAmazonProductUrl(marketplace: string | null | undefined, asin: string): string {
    return `https://${resolveMarketplaceDomain(marketplace)}${AMAZON_PRODUCT_PATH_PREFIX}${asin}`
}

export function buildAmazonSearchUrl(keyword: string, marketplace?: string | null): string {
    const url = new URL(`https://${resolveMarketplaceDomain(marketplace)}${AMAZON_SEARCH_PATH}`)
    url.searchParams.set('k', keyword)
    return url.toString()
}