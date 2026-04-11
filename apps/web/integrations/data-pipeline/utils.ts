/**
 * Shared helpers for data-pipeline normalisers.
 * No Apify / Supabase imports — pure transforms.
 */

import { MARKETPLACES } from '@puckora/types'

/**
 * Amazon domain code (e.g. "com", "co_uk") → puckora marketplace code.
 *
 * Derived from the canonical MARKETPLACES list so it never drifts out of
 * sync when new marketplaces are added. Domain key format: strip "amazon."
 * prefix then replace dots with underscores (e.g. "amazon.co.uk" → "co_uk").
 */
export const DOMAIN_TO_MARKETPLACE: Record<string, string> = Object.fromEntries(
    MARKETPLACES.map((m) => [m.domain.replace('amazon.', '').replace(/\./g, '_'), m.id]),
)

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
