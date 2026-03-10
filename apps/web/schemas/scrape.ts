/**
 * Zod schemas for scrape job form inputs.
 *
 * These are the user-facing form shapes. The server action transforms them
 * into the full ScrapeJobPayload (from @puckora/scraper-core) before persisting.
 */
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Amazon search (the primary entry point)
// ---------------------------------------------------------------------------

export const AmazonSearchInputSchema = z.object({
    keyword: z
        .string()
        .min(1, { message: 'Search term is required' })
        .max(200, { message: 'Search term is too long' })
        .trim(),
    marketplace: z
        .string()
        .min(1, { message: 'Marketplace is required' })
        .default('US'),
})

export type AmazonSearchInput = z.infer<typeof AmazonSearchInputSchema>

// ---------------------------------------------------------------------------
// Amazon product lookup by ASIN
// ---------------------------------------------------------------------------

export const AmazonProductInputSchema = z.object({
    asin: z
        .string()
        .regex(/^[A-Z0-9]{10}$/, { message: 'Enter a valid 10-character ASIN' }),
    marketplace: z
        .string()
        .min(1, { message: 'Marketplace is required' })
        .default('US'),
})

export type AmazonProductInput = z.infer<typeof AmazonProductInputSchema>
