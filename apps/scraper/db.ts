// Re-exports from the db/ subfolder — kept for backward-compat import paths.
// Prefer importing from the specific module (e.g. './db/client') in new code.
export { createDb, IS_DEBUG } from './db/client'
export type { DB } from './db/client'
export { upsertProducts, upsertRanks } from './db/products'
export { loadCategoriesFromSupabase, markCategoryScraped, markCategoryFailed } from './db/categories'
