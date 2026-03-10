// Re-exports from the sp-api/ subfolder — kept for backward-compat import paths.
// Prefer importing from the specific module (e.g. './sp-api/catalog') in new code.
export { getCatalogItem } from './sp-api/catalog'
export { getFeesEstimatesBatch } from './sp-api/fees'
export type { SpApiDimension, SpApiDimensions, SpApiImage, SpApiSalesRank, CatalogItemResult, FeeEstimateResult } from './sp-api/types'
