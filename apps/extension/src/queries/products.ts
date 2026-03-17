/**
 * Product queries — TanStack Query options for Amazon product data.
 *
 * Fetches enriched product data from the Puckora web app API.
 * Used by the sidebar analysis view.
 */
import { queryOptions } from '@tanstack/react-query'
import { productKeys } from './_keys'
import { API, WEB_APP_ORIGIN } from '@/constants/api'
import type { AmazonProduct } from '@puckora/types'

async function fetchProduct(
    asin: string,
    marketplace: string,
    accessToken: string,
): Promise<AmazonProduct | null> {
    const url = new URL(`${WEB_APP_ORIGIN}/api/products/${asin}`)
    url.searchParams.set('marketplace', marketplace)

    const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Product fetch failed: ${res.status}`)

    return res.json() as Promise<AmazonProduct>
}

export const productQueryOptions = (
    asin: string,
    marketplace: string,
    accessToken: string,
) =>
    queryOptions({
        queryKey: productKeys.detail(asin, marketplace),
        queryFn: () => fetchProduct(asin, marketplace, accessToken),
        staleTime: 5 * 60_000, // 5 min — product data doesn't change fast
        enabled: Boolean(asin && accessToken),
    })
