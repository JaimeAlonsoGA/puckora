import { MARKETPLACES } from '@puckora/types'

/**
 * Build a canonical Amazon product URL from an ASIN and a marketplace code.
 *
 * @example buildAmazonUrl('B09XXX', 'UK') // 'https://www.amazon.co.uk/dp/B09XXX'
 */
export function buildAmazonUrl(asin: string, marketplace: string): string {
    const info = MARKETPLACES.find((m) => m.id === marketplace.toUpperCase())
    const domain = info?.domain ?? 'amazon.com'
    return `https://www.${domain}/dp/${asin}`
}

/**
 * Extract the marketplace code from a full Amazon product URL.
 * Resolves via the canonical MARKETPLACES list — no static map needed.
 *
 * @example parseDomainFromUrl('https://www.amazon.co.uk/dp/B09XXX') // 'UK'
 */
export function parseDomainFromUrl(url: string): string {
    try {
        const host = new URL(url).hostname.replace(/^www\./, '')
        return MARKETPLACES.find((m) => m.domain === host)?.id ?? 'US'
    } catch {
        return 'US'
    }
}
