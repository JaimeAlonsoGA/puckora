/**
 * @puckora/sp-api
 *
 * Amazon Selling Partner API (SP-API) client — shared across all Puckora apps.
 *
 * Consumers:
 *  - apps/scraper  — batch enrichment via getCatalogItemParsed + getFeesEstimatesBatch + enrichAsin
 *  - apps/web      — /api/scrape/enrich route, data-pipeline integrations
 *  - (future)      — Apify actors, other server-side workers
 *
 * The extension (apps/extension) never imports this package directly — it
 * always calls apps/web API routes. Credentials must not exist in the browser.
 */

// ─── Configuration ────────────────────────────────────────────────────────────
export { getSpApiConfig } from './config'
export type { SpApiConfig } from './config'

// ─── Types ────────────────────────────────────────────────────────────────────
export {
    SP_API_MARKETPLACE_ID,
    SP_API_REGION_ENDPOINT,
} from './types'
export type {
    // Marketplace
    SpApiMarketplace,
    // LWA
    LwaTokenCache,
    LwaTokenResponse,
    // Errors
    SpApiErrorDetail,
    SpApiErrorResponse,
    // Raw dimension primitives
    SpApiDimension,
    SpApiDimensions,
    SpApiImage,
    SpApiSalesRank,
    // Catalog request / raw response
    CatalogItemInclude,
    SearchCatalogItemsParams,
    GetCatalogItemParams,
    CatalogItemSummary,
    CatalogItemIdentifier,
    CatalogItemImage,
    CatalogItemSalesRank,
    CatalogItemDimension,
    CatalogItem,
    SearchCatalogItemsResponse,
    // Offers
    GetItemOffersParams,
    ItemOfferMoney,
    ItemOfferDetail,
    ItemOfferSummary,
    GetItemOffersResponse,
    // Fees (raw)
    FeeEstimateRequest,
    FeeDetail,
    SpApiFeeEstimateRecord,
    GetFeesEstimateResponse,
    // Parsed / normalised output shapes
    CatalogItemResult,
    ParsedFeeEstimate,
} from './types'

// Enrichment domain types
export type { ScrapedProduct, ProductRow, CategoryRankRow } from './enrichment-types'

// ─── Rate limiter ─────────────────────────────────────────────────────────────
export { acquireRateToken, getRateLimiterState } from './rate-limiter'

// ─── LWA token & HTTP client ──────────────────────────────────────────────────
export { getLwaAccessToken, invalidateLwaToken, spApiCall, sleep, toCm, toKg, parseDimensions } from './client'

// ─── Catalog ──────────────────────────────────────────────────────────────────
export {
    getCatalogItemParsed,
    getCatalogItem,
    searchCatalogItems,
    parseCatalogItem,
    extractCatalogTitle,
    extractCatalogBrand,
    extractCatalogImage,
    extractCatalogBsr,
    toSpApiMarketplaceId,
    trySpApiMarketplaceId,
    cleanSearchKeyword,
} from './catalog'

// ─── Fees ─────────────────────────────────────────────────────────────────────
export { getFeesEstimatesBatch, getFeesEstimate } from './fees'

// ─── Enrichment ───────────────────────────────────────────────────────────────
export { enrichAsin } from './enrich'
