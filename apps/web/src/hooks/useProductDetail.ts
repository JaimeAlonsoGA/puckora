import { useMutation, useQuery } from '@tanstack/react-query'
import { scraper } from '@/lib/scraper'
import type { AmazonProductDetail, Marketplace } from '@repo/types'

export interface ProductDetailParams {
    asin: string
    marketplace?: Marketplace
}

/**
 * Fetch a single Amazon product's full detail.
 * Uses a mutation so the caller can trigger it imperatively (analyzer page).
 */
export function useProductDetail() {
    return useMutation<AmazonProductDetail, Error, ProductDetailParams>({
        mutationFn: ({ asin, marketplace = 'US' }) =>
            scraper.post<AmazonProductDetail>('/scrape/amazon/product', { asin, marketplace }),
        mutationKey: ['product-detail'],
    })
}

/**
 * Query variant — used when the ASIN is known up-front (e.g. from the URL).
 */
export function useProductDetailQuery(params: ProductDetailParams | null) {
    return useQuery<AmazonProductDetail>({
        queryKey: ['product-detail', params?.asin, params?.marketplace ?? 'US'],
        queryFn: () =>
            scraper.post<AmazonProductDetail>('/scrape/amazon/product', {
                asin: params!.asin,
                marketplace: params!.marketplace ?? 'US',
            }),
        enabled: params != null && params.asin.length >= 10,
        staleTime: 1000 * 60 * 10,
        retry: 1,
    })
}
