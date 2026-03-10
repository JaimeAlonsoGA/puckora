/**
 * @puckora/scraper-core
 *
 * Shared contract and parsing primitives for the Puckora scraping system.
 *
 * Consumers:
 *  - apps/scraper    — batch best-sellers crawler (server-side Playwright)
 *  - apps/extension  — user-facing Chrome extension (content scripts use DOM APIs,
 *                      service worker uses schemas for job orchestration)
 *  - apps/web        — job orchestration, enrichment API, UI
 */

// ─── SCHEMAS (job contract) ───────────────────────────────────────────────────
export {
    // Domain string constants (single source of truth — sync with DB enums)
    SCRAPE_JOB_TYPE,
    SCRAPE_JOB_STATUS,
    SCRAPE_JOB_STATUSES,
    SCRAPE_EXECUTOR,
    SCRAPE_PRODUCT_STATUS,
    CATEGORY_SCRAPE_STATUS,
    // Payload schemas
    AmazonSearchPayloadSchema,
    AmazonProductPayloadSchema,
    AlibabaSearchPayloadSchema,
    ScrapeJobPayloadSchema,
    // Result schemas
    ScrapedListingSchema,
    ScrapeResultSchema,
} from './schemas/job'

export type {
    ScrapeJobType,
    ScrapeJobStatus,
    ScrapeExecutor,
    ScrapeProductStatus,
    CategoryScrapeStatus,
    ScrapeJobPayload,
    ScrapeResult,
    ScrapedListing,
} from './schemas/job'

// ─── PARSERS (HTML string-based) ──────────────────────────────────────────────
export {
    parseProducts,
    countBadges,
    parsePrice,
    parseRating,
    parseReviewCount,
} from './parsers/amazon-search'

export {
    isBlocked,
    isEmptyCategory,
} from './parsers/block-detection'
