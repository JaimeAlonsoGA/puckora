import { SCRAPE_JOB_STATUS } from '@puckora/scraper-core'
import type { ProductFinancial } from '@puckora/types'
import { buildAmazonProductUrl } from '@/constants/amazon-marketplace'

export interface SearchDataAvailability {
    hasListings: boolean
    hasSignals: boolean
    hasFinancials: boolean
    hasCategories: boolean
    hasImages: boolean
}

export const ACTIVE_JOB_STATUSES = new Set<string>([
    SCRAPE_JOB_STATUS.PENDING,
    SCRAPE_JOB_STATUS.CLAIMED,
    SCRAPE_JOB_STATUS.RUNNING,
])

export function getMarketplaceProductUrl(marketplace: string, asin: string | null | undefined): string {
    if (!asin) return '#'

    return buildAmazonProductUrl(marketplace, asin)
}

export function getDataAvailability(products: ProductFinancial[]): SearchDataAvailability {
    return {
        hasListings: products.some((product) => Boolean(product.title || product.asin)),
        hasSignals: products.some(
            (product) => product.price != null || product.rating != null || product.review_count != null,
        ),
        hasFinancials: products.some(
            (product) =>
                product.monthly_revenue != null
                || product.monthly_units != null
                || product.net_per_unit != null
                || product.fba_fee != null
                || product.referral_fee != null,
        ),
        hasCategories: products.some((product) => Boolean(product.category_path)),
        hasImages: products.some((product) => Boolean(product.main_image_url)),
    }
}