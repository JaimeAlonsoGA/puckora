/**
 * Shared helpers for data-pipeline normalisers.
 * No Apify / Supabase imports — pure transforms.
 */

/** Amazon domain code (e.g. "com", "co_uk") → puckora marketplace code */
export const DOMAIN_TO_MARKETPLACE: Record<string, string> = {
    com: 'US',
    ca: 'CA',
    com_mx: 'MX',
    co_uk: 'UK',
    de: 'DE',
    fr: 'FR',
    it: 'IT',
    es: 'ES',
    nl: 'NL',
    se: 'SE',
    pl: 'PL',
    com_tr: 'TR',
    ae: 'AE',
    sa: 'SA',
    in: 'IN',
    co_jp: 'JP',
    com_au: 'AU',
    com_sg: 'SG',
    com_br: 'BR',
}

/** Normalise an Amazon domain code to a puckora marketplace code. */
export function parseDomainToMarketplace(domainCode: string): string {
    return DOMAIN_TO_MARKETPLACE[domainCode] ?? 'US'
}

/**
 * Parse a rating string like "4.5 out of 5 stars" → 4.5.
 * Returns null if the string is falsy or unparseable.
 */
export function parseRatingNumber(ratingStr: string | null | undefined): number | null {
    if (!ratingStr) return null
    const match = ratingStr.match(/[\d.]+/)
    return match ? parseFloat(match[0]) : null
}
