/**
 * Supabase service layer — Reviews, competitor analyses, pain-point clusters.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseInstance = any

import type {
    CompetitorAnalyse,
    CompetitorAnalyseInsert,
    CompetitorAnalyseUpdate,
    PainPointCluster,
    PainPointClusterInsert,
    OpportunityReport,
    OpportunityReportInsert,
    Marketplace,
} from '@puckora/types'

// ---------------------------------------------------------------------------
// Competitor analyses (the parent job record)
// ---------------------------------------------------------------------------

export async function createCompetitorAnalyse(
    supabase: SupabaseInstance,
    input: CompetitorAnalyseInsert,
): Promise<CompetitorAnalyse> {
    const { data, error } = await supabase
        .from('competitor_analyses')
        .insert(input)
        .select('*')
        .single()

    if (error) throw new Error(`createCompetitorAnalyse failed: ${error.message}`)
    return data as CompetitorAnalyse
}

export async function updateCompetitorAnalyse(
    supabase: SupabaseInstance,
    id: string,
    update: CompetitorAnalyseUpdate,
): Promise<CompetitorAnalyse> {
    const { data, error } = await supabase
        .from('competitor_analyses')
        .update({ ...update, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single()

    if (error) throw new Error(`updateCompetitorAnalyse failed: ${error.message}`)
    return data as CompetitorAnalyse
}

export async function getCompetitorAnalyse(
    supabase: SupabaseInstance,
    id: string,
): Promise<CompetitorAnalyse | null> {
    const { data, error } = await supabase
        .from('competitor_analyses')
        .select('*')
        .eq('id', id)
        .maybeSingle()

    if (error) throw new Error(`getCompetitorAnalyse failed: ${error.message}`)
    return data as CompetitorAnalyse | null
}

export async function getCompetitorAnalysesByAsin(
    supabase: SupabaseInstance,
    asin: string,
    marketplace: Marketplace,
): Promise<CompetitorAnalyse[]> {
    const { data, error } = await supabase
        .from('competitor_analyses')
        .select('*')
        .eq('asin', asin)
        .eq('marketplace', marketplace)
        .order('created_at', { ascending: false })

    if (error) throw new Error(`getCompetitorAnalysesByAsin failed: ${error.message}`)
    return data as CompetitorAnalyse[]
}

export async function getCompetitorAnalysesByUser(
    supabase: SupabaseInstance,
    userId: string,
    limit = 20,
): Promise<CompetitorAnalyse[]> {
    const { data, error } = await supabase
        .from('competitor_analyses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) throw new Error(`getCompetitorAnalysesByUser failed: ${error.message}`)
    return data as CompetitorAnalyse[]
}

// ---------------------------------------------------------------------------
// Pain-point clusters (belong to a competitor analysis)
// ---------------------------------------------------------------------------

export async function getPainPointClusters(
    supabase: SupabaseInstance,
    analysisId: string,
): Promise<PainPointCluster[]> {
    const { data, error } = await supabase
        .from('pain_point_clusters')
        .select('*')
        .eq('analysis_id', analysisId)
        .order('severity_score', { ascending: false })

    if (error) throw new Error(`getPainPointClusters failed: ${error.message}`)
    return data as PainPointCluster[]
}

export async function insertPainPointClusters(
    supabase: SupabaseInstance,
    clusters: PainPointClusterInsert[],
): Promise<PainPointCluster[]> {
    if (clusters.length === 0) return []
    const { data, error } = await supabase
        .from('pain_point_clusters')
        .insert(clusters)
        .select('*')

    if (error) throw new Error(`insertPainPointClusters failed: ${error.message}`)
    return data as PainPointCluster[]
}

// ---------------------------------------------------------------------------
// Opportunity reports (1:1 with competitor_analyses)
// ---------------------------------------------------------------------------

export async function getOpportunityReport(
    supabase: SupabaseInstance,
    analysisId: string,
): Promise<OpportunityReport | null> {
    const { data, error } = await supabase
        .from('opportunity_reports')
        .select('*')
        .eq('analysis_id', analysisId)
        .maybeSingle()

    if (error) throw new Error(`getOpportunityReport failed: ${error.message}`)
    return data as OpportunityReport | null
}

export async function upsertOpportunityReport(
    supabase: SupabaseInstance,
    report: OpportunityReportInsert,
): Promise<OpportunityReport> {
    const { data, error } = await supabase
        .from('opportunity_reports')
        .upsert(report, { onConflict: 'analysis_id' })
        .select('*')
        .single()

    if (error) throw new Error(`upsertOpportunityReport failed: ${error.message}`)
    return data as OpportunityReport
}

// ---------------------------------------------------------------------------
// Full analysis result (convenience — joins clusters + report)
// ---------------------------------------------------------------------------

export async function getFullAnalysisResult(
    supabase: SupabaseInstance,
    analysisId: string,
): Promise<{
    analysis: CompetitorAnalyse
    clusters: PainPointCluster[]
    report: OpportunityReport | null
} | null> {
    const [analysisResult, clustersResult, reportResult] = await Promise.all([
        supabase
            .from('competitor_analyses')
            .select('*')
            .eq('id', analysisId)
            .maybeSingle(),
        supabase
            .from('pain_point_clusters')
            .select('*')
            .eq('analysis_id', analysisId)
            .order('severity_score', { ascending: false }),
        supabase
            .from('opportunity_reports')
            .select('*')
            .eq('analysis_id', analysisId)
            .maybeSingle(),
    ])

    if (analysisResult.error) throw new Error(`getFullAnalysisResult failed: ${analysisResult.error.message}`)
    if (!analysisResult.data) return null

    return {
        analysis: analysisResult.data as CompetitorAnalyse,
        clusters: (clustersResult.data ?? []) as PainPointCluster[],
        report: (reportResult.data ?? null) as OpportunityReport | null,
    }
}
