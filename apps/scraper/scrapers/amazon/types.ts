import type { AmazonCategory } from '@puckora/types'

// ─── SCRAPER DOMAIN TYPES ────────────────────────────────────────────────────

export type CategoryNode = Pick<AmazonCategory,
    'id' | 'name' | 'full_path' | 'depth'
> & {
    bestsellers_url: string   // narrowed: never null at runtime
}

// Enrichment pipeline types live in @puckora/sp-api — re-exported here for
// consumers within the amazon scraper that only want a single import path.
export type { ScrapedProduct, ProductRow, CategoryRankRow } from '@puckora/sp-api'
