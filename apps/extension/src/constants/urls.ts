/**
 * URL configuration — Amazon marketplace domains and URL builders.
 * Mirrors apps/web/integrations/sp-api patterns.
 */

/** Amazon marketplace → TLD mapping. */
export const AMAZON_DOMAIN_MAP: Record<string, string> = {
    US: 'com',
    GB: 'co.uk',
    DE: 'de',
    JP: 'co.jp',
    FR: 'fr',
    IT: 'it',
    ES: 'es',
    CA: 'ca',
    MX: 'com.mx',
    AU: 'com.au',
    IN: 'in',
    AE: 'ae',
    SG: 'sg',
    SA: 'sa',
    NL: 'nl',
    SE: 'se',
    PL: 'pl',
    TR: 'com.tr',
    BR: 'com.br',
}

export function buildAmazonSearchUrl(keyword: string, marketplace = 'US'): string {
    const domain = AMAZON_DOMAIN_MAP[marketplace] ?? 'com'
    return `https://www.amazon.${domain}/s?k=${encodeURIComponent(keyword)}&ref=puckora`
}

export function buildAmazonProductUrl(asin: string, marketplace = 'US'): string {
    const domain = AMAZON_DOMAIN_MAP[marketplace] ?? 'com'
    return `https://www.amazon.${domain}/dp/${asin}`
}

export function buildGlobalSourcesUrl(): string {
    return 'https://www.globalsources.com/'
}

/** Returns true if the URL is an Amazon search page. */
export function isAmazonSearchUrl(url: string): boolean {
    return /amazon\.[a-z.]+\/s[/?]/.test(url)
}

/** Returns true if the URL is an Amazon product page. */
export function isAmazonProductUrl(url: string): boolean {
    return /amazon\.[a-z.]+\/dp\//.test(url)
}

/** Returns true if the URL is a Global Sources page. */
export function isGlobalSourcesUrl(url: string): boolean {
    return /globalsources\.com\//.test(url)
}
