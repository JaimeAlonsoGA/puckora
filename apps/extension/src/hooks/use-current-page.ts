/**
 * useCurrentPage — detects which type of page the content script is running on.
 *
 * Call this in content scripts to determine which sidebar view to render.
 * Returns a discriminated union PageContext.
 */
import { useMemo } from 'react'
import type { PageContext } from '@/types/extension'
import {
    isAmazonSearchUrl,
    isAmazonProductUrl,
    isGlobalSourcesUrl,
    AMAZON_DOMAIN_MAP,
} from '@/constants/urls'

function detectPageContext(href: string): PageContext {
    if (isAmazonSearchUrl(href)) {
        const url = new URL(href)
        const keyword = url.searchParams.get('k') ?? ''
        // Detect marketplace from TLD
        const tldMatch = href.match(/amazon\.([a-z.]+)\//)
        const tld = tldMatch?.[1] ?? 'com'
        const marketplace =
            Object.entries(AMAZON_DOMAIN_MAP).find(([, v]) => v === tld)?.[0] ?? 'US'
        return { type: 'amazon-search', keyword, marketplace }
    }

    if (isAmazonProductUrl(href)) {
        const asinMatch = href.match(/\/dp\/([A-Z0-9]{10})/)
        const asin = asinMatch?.[1] ?? ''
        const tldMatch = href.match(/amazon\.([a-z.]+)\//)
        const tld = tldMatch?.[1] ?? 'com'
        const marketplace =
            Object.entries(AMAZON_DOMAIN_MAP).find(([, v]) => v === tld)?.[0] ?? 'US'
        return { type: 'amazon-product', asin, marketplace }
    }

    if (isGlobalSourcesUrl(href)) {
        const url = new URL(href)
        const keyword =
            url.searchParams.get('query') ??
            url.searchParams.get('keyword') ??
            url.searchParams.get('SearchText') ??
            ''
        return { type: 'globalsources-search', keyword }
    }

    return { type: 'other' }
}

/** Returns the detected PageContext for the current window.location. */
export function useCurrentPage(): PageContext {
    return useMemo(
        () => detectPageContext(window.location.href),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    )
}

/** Non-hook version for use outside React (e.g., content script entry). */
export { detectPageContext }
