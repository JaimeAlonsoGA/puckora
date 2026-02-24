/**
 * Competitor intelligence types — snake_case matching DB schema.
 * PainPointCluster and OpportunityReport are exported as DB row types from index.ts
 * (Tables<"pain_point_clusters"> and Tables<"opportunity_reports">).
 * This file only defines AnalysisRequest (request shape) and CompetitorAnalysisResult
 * (joined query shape returned by useCompetitorResult).
 */
import type { Marketplace, AnalysisStatus } from './definitions'
import type { Database } from './database.types'

// Reference DB row shapes directly to avoid duplicating columns
type DbPainPointCluster = Database['public']['Tables']['pain_point_clusters']['Row']
type DbOpportunityReport = Database['public']['Tables']['opportunity_reports']['Row']

export interface AnalysisRequest {
    asin: string
    marketplace: Marketplace
    maxReviews?: number
}

/**
 * Full joined result from useCompetitorResult.
 * Returned by supabase.select('*, pain_point_clusters(*), opportunity_reports(*)').
 */
export interface CompetitorAnalysisResult {
    id: string
    asin: string
    marketplace: string
    status: AnalysisStatus
    reviews_scraped: number
    reviews_clustered: number
    error_message: string | null
    created_at: string
    completed_at: string | null
    pain_point_clusters: DbPainPointCluster[]
    opportunity_reports: DbOpportunityReport[]
}
