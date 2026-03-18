/**
 * Postgres enum definitions for all tables that live on Fly.io.
 * These must be declared before the table definitions that reference them.
 */
import { pgEnum } from 'drizzle-orm/pg-core'

export const categoryScrapeStatusEnum = pgEnum('category_scrape_status', [
    'pending',
    'scraped',
    'failed',
])

export const productScrapeStatusEnum = pgEnum('product_scrape_status', [
    'scraped',
    'enriched',
    'enrichment_failed',
])

export const gsCategoryScrapeStatusEnum = pgEnum('gs_category_scrape_status', [
    'pending',
    'scraped',
    'failed',
])

export const gsScrapeStatusEnum = pgEnum('gs_scrape_status', [
    'scraped',
    'failed',
])
