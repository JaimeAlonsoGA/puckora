/**
 * Category types — snake_case matching amazon_categories DB table columns.
 * Single source of truth: supabase/migrations (amazon_categories table).
 */
import type { Marketplace, CompetitionLevel } from './definitions'

/** Maps to amazon_categories DB row */
export interface CategoryNode {
    id: string
    name: string
    slug: string
    parent_id?: string | null
    depth: number
    marketplace: Marketplace
    is_leaf: boolean
    full_path: string
    breadcrumb: string[]
    referral_fee_pct?: number | null
    competition_level?: CompetitionLevel | null
    opportunity_score?: number | null
    avg_bsr?: number | null
    avg_price?: number | null
    avg_rating?: number | null
    product_count_est?: number | null
    children?: CategoryNode[]
}

export interface CategorySearchResult {
    category: CategoryNode
    similarity_score: number
    related_categories?: CategoryNode[]
}
