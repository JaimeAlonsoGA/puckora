import { useMutation } from '@tanstack/react-query'
import { scraper } from '@/lib/scraper'
import type {
    SpApiTableRow,
    SpApiLookupResult,
    SpApiBulkLookupResult,
} from '@repo/types'

// ---------------------------------------------------------------------------
// Single-ASIN lookup
// ---------------------------------------------------------------------------

export interface SpApiSingleResult {
    row: SpApiTableRow
    raw: SpApiLookupResult
}

export interface SpApiSingleParams {
    asin: string
    marketplace?: string
    price?: number
}

/**
 * Mutation hook for a single-ASIN SP-API lookup.
 *
 * @example
 * const { mutate, data, isPending, isError, error } = useSpApiLookup()
 * mutate({ asin: 'B08XYZ12345', marketplace: 'US', price: 29.99 })
 */
export function useSpApiLookup() {
    return useMutation<SpApiSingleResult, Error, SpApiSingleParams>({
        mutationFn: ({ asin, marketplace = 'US', price }) =>
            scraper.post<SpApiSingleResult>('/sp-api/lookup', { asin, marketplace, price }),
        mutationKey: ['sp-api-lookup'],
    })
}

// ---------------------------------------------------------------------------
// Bulk lookup (up to 20 ASINs)
// ---------------------------------------------------------------------------

export interface SpApiBulkResult {
    rows: SpApiTableRow[]
    marketplace: string
    _raw?: SpApiBulkLookupResult
}

export interface SpApiBulkParams {
    asins: string[]
    marketplace?: string
    price?: number
}

/**
 * Mutation hook for a bulk SP-API lookup (up to 20 ASINs).
 *
 * @example
 * const { mutate, data, isPending } = useSpApiBulkLookup()
 * mutate({ asins: ['B08XYZ12345', 'B09ABC67890'], marketplace: 'US' })
 */
export function useSpApiBulkLookup() {
    return useMutation<SpApiBulkResult, Error, SpApiBulkParams>({
        mutationFn: ({ asins, marketplace = 'US', price }) =>
            scraper.post<SpApiBulkResult>('/sp-api/bulk-lookup', {
                asins,
                marketplace,
                price,
            }),
        mutationKey: ['sp-api-bulk-lookup'],
    })
}
