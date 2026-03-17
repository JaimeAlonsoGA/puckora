/**
 * Scrape job schemas — the contract between the web app (job creator),
 * the extension/agent (job executor), and the enrichment API (job consumer).
 *
 * Enum VALUES come from @puckora/types, which is generated from the DB schema
 * via `npm run gen:types`. The DB migration (0003_scrape_enums.sql) is the
 * single source of truth — never hardcode enum strings here.
 *
 * Adding a new scrape target (e.g. Alibaba):
 *  1. Add the new value to the DB enum in a new migration
 *  2. Run `npm run gen:types` to regenerate @puckora/types
 *  3. Add the new literal to ScrapeJobPayloadSchema
 *  4. Add a new parser in parsers/
 *  5. Add the content script in apps/extension
 */

import { z } from 'zod'
import type { ScrapedListing } from '../parsers/amazon/search'

import {
    ScrapeJobTypeEnum,
    ScrapeJobStatusEnum,
    ScrapeExecutorEnum,
    ProductScrapeStatusEnum,
    CategoryScrapeStatusEnum,
} from '@puckora/types'

import type {
    ScrapeJobType,
    ScrapeJobStatus,
    ScrapeExecutor,
    ProductScrapeStatus,
    CategoryScrapeStatus,
} from '@puckora/types'

// ─── RE-EXPORT ENUM CONSTS (legacy SCREAMING_SNAKE_CASE names) ────────────────
// All consumers import these names from '@puckora/scraper-core'.
// The values are sourced from @puckora/types → generated from the DB schema.

export const SCRAPE_JOB_TYPE = ScrapeJobTypeEnum
export const SCRAPE_JOB_STATUS = ScrapeJobStatusEnum
export const SCRAPE_EXECUTOR = ScrapeExecutorEnum
export const SCRAPE_PRODUCT_STATUS = ProductScrapeStatusEnum
export const CATEGORY_SCRAPE_STATUS = CategoryScrapeStatusEnum

// ─── RE-EXPORT ENUM TYPES ─────────────────────────────────────────────────────
export type { ScrapeJobType, ScrapeJobStatus, ScrapeExecutor, CategoryScrapeStatus }
export type ScrapeProductStatus = ProductScrapeStatus  // legacy alias

/** Tuple form required by Zod's z.enum() — derived from SCRAPE_JOB_STATUS. */
export const SCRAPE_JOB_STATUSES = Object.values(SCRAPE_JOB_STATUS) as
    [ScrapeJobStatus, ...ScrapeJobStatus[]]

// ─── JOB PAYLOAD ─────────────────────────────────────────────────────────────
// Discriminated union so each job type carries exactly the fields it needs.

export const AmazonSearchPayloadSchema = z.object({
    type: z.literal(SCRAPE_JOB_TYPE.AMAZON_SEARCH),
    keyword: z.string().min(1),
    marketplace: z.string().default('US'),
    max_pages: z.number().int().min(1).max(5).default(1),
})

export const AmazonProductPayloadSchema = z.object({
    type: z.literal(SCRAPE_JOB_TYPE.AMAZON_PRODUCT),
    asin: z.string().length(10),
    marketplace: z.string().default('US'),
})

export const AlibabaSearchPayloadSchema = z.object({
    type: z.literal(SCRAPE_JOB_TYPE.ALIBABA_SEARCH),
    keyword: z.string().min(1),
    max_pages: z.number().int().min(1).max(5).default(1),
})

export const ScrapeJobPayloadSchema = z.discriminatedUnion('type', [
    AmazonSearchPayloadSchema,
    AmazonProductPayloadSchema,
    AlibabaSearchPayloadSchema,
])

export type ScrapeJobPayload = z.infer<typeof ScrapeJobPayloadSchema>

// ─── SCRAPE RESULT ────────────────────────────────────────────────────────────
// What the executor (extension or agent) posts back to /api/scrape/enrich.

export const ScrapedListingSchema = z.object({
    asin: z.string(),
    rank: z.number().int().nullable(),
    name: z.string(),
    price: z.number().nullable(),
    rating: z.number().min(1).max(5).nullable(),
    review_count: z.number().int().nullable(),
    product_url: z.string(),
})

export const ScrapeResultSchema = z.object({
    job_id: z.string().uuid(),
    executor: z.enum([SCRAPE_EXECUTOR.EXTENSION, SCRAPE_EXECUTOR.AGENT]),
    listings: z.array(ScrapedListingSchema),
    blocked: z.boolean().default(false),
    page_count: z.number().int().min(0),
    scraped_at: z.string().datetime(),
})

export type ScrapeResult = z.infer<typeof ScrapeResultSchema>

// ─── RE-EXPORT ScrapedListing ─────────────────────────────────────────────────
// The interface lives in the parser that produces it; re-export here for consumers
// who only import from schemas (e.g. the web app enrichment route).
export type { ScrapedListing }
