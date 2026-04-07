/**
 * Zod schemas for scrape job form inputs.
 *
 * These are the user-facing form shapes. The server action transforms them
 * into the full ScrapeJobPayload (from @puckora/scraper-core) before persisting.
 */
import { DEFAULT_WEB_MARKETPLACE } from '@/constants/amazon-marketplace'
import { SCRAPE_VALIDATION_MESSAGES } from '@/constants/validation'
import {
    SCRAPE_JOB_TYPE,
    ScrapeJobPayloadSchema,
    ScrapedListingSchema,
    type ScrapeJobPayload,
    type ScrapedListing,
} from '@puckora/scraper-core'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Amazon search (the primary entry point)
// ---------------------------------------------------------------------------

export const AmazonSearchInputSchema = z.object({
    keyword: z
        .string()
        .min(1, { message: SCRAPE_VALIDATION_MESSAGES.KEYWORD_REQUIRED })
        .max(200, { message: SCRAPE_VALIDATION_MESSAGES.KEYWORD_TOO_LONG })
        .trim(),
    marketplace: z
        .string()
        .min(1, { message: SCRAPE_VALIDATION_MESSAGES.MARKETPLACE_REQUIRED })
        .default(DEFAULT_WEB_MARKETPLACE),
})

export type AmazonSearchInput = z.infer<typeof AmazonSearchInputSchema>

// ---------------------------------------------------------------------------
// Amazon product lookup by ASIN
// ---------------------------------------------------------------------------

export const AmazonProductInputSchema = z.object({
    asin: z
        .string()
        .regex(/^[A-Z0-9]{10}$/, { message: SCRAPE_VALIDATION_MESSAGES.ASIN_INVALID }),
    marketplace: z
        .string()
        .min(1, { message: SCRAPE_VALIDATION_MESSAGES.MARKETPLACE_REQUIRED })
        .default(DEFAULT_WEB_MARKETPLACE),
})

export type AmazonProductInput = z.infer<typeof AmazonProductInputSchema>

type AmazonSearchJobPayload = Extract<ScrapeJobPayload, { type: typeof SCRAPE_JOB_TYPE.AMAZON_SEARCH }>

const ScrapeJobListingsResultSchema = z.union([
    z.array(ScrapedListingSchema),
    z.object({ listings: z.array(ScrapedListingSchema) }),
])

export function parseAmazonSearchJobPayload(payload: unknown): AmazonSearchJobPayload | null {
    const parsed = ScrapeJobPayloadSchema.safeParse(payload)
    if (!parsed.success || parsed.data.type !== SCRAPE_JOB_TYPE.AMAZON_SEARCH) {
        return null
    }

    return parsed.data
}

export function parseScrapeJobListings(result: unknown): ScrapedListing[] {
    const parsed = ScrapeJobListingsResultSchema.safeParse(result)
    if (!parsed.success) {
        return []
    }

    return Array.isArray(parsed.data) ? parsed.data : parsed.data.listings
}
