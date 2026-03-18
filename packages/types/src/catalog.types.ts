// GENERATED — Do not hand-edit. Run `npm run gen:types` to regenerate.
// Fly.io catalog and view types derived from the Drizzle schema in @puckora/db.

import type {
    categoryScrapeStatusEnum as flyCategoryScrapeStatusEnum,
    productScrapeStatusEnum as flyProductScrapeStatusEnum,
    gsCategoryScrapeStatusEnum as flyGsCategoryScrapeStatusEnum,
    gsScrapeStatusEnum as flyGsScrapeStatusEnum,
    amazonCategories as flyAmazonCategories,
    amazonKeywordProducts as flyAmazonKeywordProducts,
    amazonKeywords as flyAmazonKeywords,
    amazonProducts as flyAmazonProducts,
    gsCategories as flyGsCategories,
    gsProducts as flyGsProducts,
    gsSuppliers as flyGsSuppliers,
    productCategoryRanks as flyProductCategoryRanks,
    productFinancialsView as flyProductFinancialsView,
} from '@puckora/db'

// Enum types
export type CategoryScrapeStatus = typeof flyCategoryScrapeStatusEnum.enumValues[number]
export type ProductScrapeStatus = typeof flyProductScrapeStatusEnum.enumValues[number]
export type GsCategoryScrapeStatus = typeof flyGsCategoryScrapeStatusEnum.enumValues[number]
export type GsScrapeStatus = typeof flyGsScrapeStatusEnum.enumValues[number]

// Enum const objects
export const CategoryScrapeStatusEnum = {
    PENDING: 'pending',
    SCRAPED: 'scraped',
    FAILED: 'failed',
} as const

export const ProductScrapeStatusEnum = {
    SCRAPED: 'scraped',
    ENRICHED: 'enriched',
    ENRICHMENT_FAILED: 'enrichment_failed',
} as const

export const GsCategoryScrapeStatusEnum = {
    PENDING: 'pending',
    SCRAPED: 'scraped',
    FAILED: 'failed',
} as const

export const GsScrapeStatusEnum = {
    SCRAPED: 'scraped',
    FAILED: 'failed',
} as const

// Tables
export type AmazonCategory = typeof flyAmazonCategories.$inferSelect
export type AmazonCategoryInsert = typeof flyAmazonCategories.$inferInsert
export type AmazonCategoryUpdate = Partial<AmazonCategoryInsert>

export type AmazonKeywordProduct = typeof flyAmazonKeywordProducts.$inferSelect
export type AmazonKeywordProductInsert = typeof flyAmazonKeywordProducts.$inferInsert
export type AmazonKeywordProductUpdate = Partial<AmazonKeywordProductInsert>

export type AmazonKeyword = typeof flyAmazonKeywords.$inferSelect
export type AmazonKeywordInsert = typeof flyAmazonKeywords.$inferInsert
export type AmazonKeywordUpdate = Partial<AmazonKeywordInsert>

export type AmazonProduct = typeof flyAmazonProducts.$inferSelect
export type AmazonProductInsert = typeof flyAmazonProducts.$inferInsert
export type AmazonProductUpdate = Partial<AmazonProductInsert>

export type GsCategory = typeof flyGsCategories.$inferSelect
export type GsCategoryInsert = typeof flyGsCategories.$inferInsert
export type GsCategoryUpdate = Partial<GsCategoryInsert>

export type GsProduct = typeof flyGsProducts.$inferSelect
export type GsProductInsert = typeof flyGsProducts.$inferInsert
export type GsProductUpdate = Partial<GsProductInsert>

export type GsSupplier = typeof flyGsSuppliers.$inferSelect
export type GsSupplierInsert = typeof flyGsSuppliers.$inferInsert
export type GsSupplierUpdate = Partial<GsSupplierInsert>

export type ProductCategoryRank = typeof flyProductCategoryRanks.$inferSelect
export type ProductCategoryRankInsert = typeof flyProductCategoryRanks.$inferInsert
export type ProductCategoryRankUpdate = Partial<ProductCategoryRankInsert>

// Views
type ProductFinancialBase = typeof flyProductFinancialsView.$inferSelect
export type ProductFinancial = Omit<ProductFinancialBase, 'total_amazon_fees' | 'amazon_fee_pct' | 'net_per_unit' | 'monthly_revenue' | 'monthly_net' | 'daily_velocity' | 'review_rate_per_month'> & {
    total_amazon_fees: number | null
    amazon_fee_pct: number | null
    net_per_unit: number | null
    monthly_revenue: number | null
    monthly_net: number | null
    daily_velocity: number | null
    review_rate_per_month: number | null
}

export const EnumNames = {
    CATEGORYSCRAPESTATUS: 'categoryScrapeStatus',
    PRODUCTSCRAPESTATUS: 'productScrapeStatus',
    GSCATEGORYSCRAPESTATUS: 'gsCategoryScrapeStatus',
    GSSCRAPESTATUS: 'gsScrapeStatus',
} as const
