// GENERATED — Do not hand-edit. Run `npm run gen:types` to regenerate.

import type { Database } from './database.types'
export type { Database }
export type { Json } from './database.types'
export * from './meta.types'

// Generic type helpers
type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]
type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"]
type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T]
type Views<T extends keyof Database["public"]["Views"]> = Database["public"]["Views"][T]["Row"]
export type { Tables, TablesInsert, TablesUpdate, Enums, Views }

// Tables
export type AmazonCategory = Tables<"amazon_categories">
export type AmazonCategoryInsert = TablesInsert<"amazon_categories">
export type AmazonCategoryUpdate = TablesUpdate<"amazon_categories">

export type AmazonKeywordProduct = Tables<"amazon_keyword_products">
export type AmazonKeywordProductInsert = TablesInsert<"amazon_keyword_products">
export type AmazonKeywordProductUpdate = TablesUpdate<"amazon_keyword_products">

export type AmazonKeyword = Tables<"amazon_keywords">
export type AmazonKeywordInsert = TablesInsert<"amazon_keywords">
export type AmazonKeywordUpdate = TablesUpdate<"amazon_keywords">

export type AmazonProduct = Tables<"amazon_products">
export type AmazonProductInsert = TablesInsert<"amazon_products">
export type AmazonProductUpdate = TablesUpdate<"amazon_products">

export type GsCategory = Tables<"gs_categories">
export type GsCategoryInsert = TablesInsert<"gs_categories">
export type GsCategoryUpdate = TablesUpdate<"gs_categories">

export type GsProduct = Tables<"gs_products">
export type GsProductInsert = TablesInsert<"gs_products">
export type GsProductUpdate = TablesUpdate<"gs_products">

export type GsSupplier = Tables<"gs_suppliers">
export type GsSupplierInsert = TablesInsert<"gs_suppliers">
export type GsSupplierUpdate = TablesUpdate<"gs_suppliers">

export type ProductCategoryRank = Tables<"product_category_ranks">
export type ProductCategoryRankInsert = TablesInsert<"product_category_ranks">
export type ProductCategoryRankUpdate = TablesUpdate<"product_category_ranks">

export type ScrapeJob = Tables<"scrape_jobs">
export type ScrapeJobInsert = TablesInsert<"scrape_jobs">
export type ScrapeJobUpdate = TablesUpdate<"scrape_jobs">

export type User = Tables<"users">
export type UserInsert = TablesInsert<"users">
export type UserUpdate = TablesUpdate<"users">

// Views
export type ProductFinancial = Views<"product_financials">
export type ScrapeProgress = Views<"scrape_progress">

// Enum types
export type CategoryScrapeStatus = Enums<"category_scrape_status">
export type GsCategoryScrapeStatus = Enums<"gs_category_scrape_status">
export type GsScrapeStatus = Enums<"gs_scrape_status">
export type ProductScrapeStatus = Enums<"product_scrape_status">
export type ScrapeExecutor = Enums<"scrape_executor">
export type ScrapeJobStatus = Enums<"scrape_job_status">
export type ScrapeJobType = Enums<"scrape_job_type">

// Enum const objects
export const CategoryScrapeStatusEnum = {
    PENDING: "pending",
    SCRAPED: "scraped",
    FAILED: "failed"
} as const

export const GsCategoryScrapeStatusEnum = {
    PENDING: "pending",
    SCRAPED: "scraped",
    FAILED: "failed"
} as const

export const GsScrapeStatusEnum = {
    SCRAPED: "scraped",
    FAILED: "failed"
} as const

export const ProductScrapeStatusEnum = {
    SCRAPED: "scraped",
    ENRICHED: "enriched",
    ENRICHMENT_FAILED: "enrichment_failed"
} as const

export const ScrapeExecutorEnum = {
    EXTENSION: "extension",
    AGENT: "agent"
} as const

export const ScrapeJobStatusEnum = {
    PENDING: "pending",
    CLAIMED: "claimed",
    RUNNING: "running",
    DONE: "done",
    FAILED: "failed"
} as const

export const ScrapeJobTypeEnum = {
    AMAZON_SEARCH: "amazon_search",
    AMAZON_PRODUCT: "amazon_product",
    ALIBABA_SEARCH: "alibaba_search"
} as const

export const EnumNames = {
    CATEGORYSCRAPESTATUS: "categoryScrapeStatus",
    GSCATEGORYSCRAPESTATUS: "gsCategoryScrapeStatus",
    GSSCRAPESTATUS: "gsScrapeStatus",
    PRODUCTSCRAPESTATUS: "productScrapeStatus",
    SCRAPEEXECUTOR: "scrapeExecutor",
    SCRAPEJOBSTATUS: "scrapeJobStatus",
    SCRAPEJOBTYPE: "scrapeJobType"
} as const
