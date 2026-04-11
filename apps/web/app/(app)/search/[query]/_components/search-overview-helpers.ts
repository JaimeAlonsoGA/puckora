import type { ProductFinancial } from '@puckora/types'
import {
    SEARCH_FINANCIAL_AVAILABILITY_FIELDS,
    SEARCH_POLL_INTERVAL_MS,
} from '@/constants/search'
import type { SearchDataAvailability } from '@/types/search'

/**
 * Fallback polling cutoff for SP-API enrichment.
 * If a completed job has no `enriched_at` after this window (e.g. the after()
 * background task failed silently), polling stops automatically.
 */
export const ENRICHMENT_TIMEOUT_MS = SEARCH_POLL_INTERVAL_MS.ENRICHMENT_TIMEOUT

export function getSearchProductRowKey(product: Pick<ProductFinancial, 'asin' | 'title'>, index: number): string {
    return product.asin ?? `${product.title ?? 'product'}-${index}`
}

export function getDataAvailability(products: ProductFinancial[]): SearchDataAvailability {
    return {
        hasListings: products.some((product) => Boolean(product.title || product.asin)),
        hasSignals: products.some(
            (product) => product.price != null || product.rating != null || product.review_count != null,
        ),
        hasFinancials: products.some((product) =>
            SEARCH_FINANCIAL_AVAILABILITY_FIELDS.some((field) => product[field] != null),
        ),
        hasCategories: products.some((product) => Boolean(product.category_path)),
        hasImages: products.some((product) => Boolean(product.main_image_url)),
    }
}