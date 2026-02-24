import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { scraper } from '@/lib/scraper'
import { supabase } from '@/lib/supabase'
import type { CompetitorAnalysisResult, AnalysisRequest } from '@repo/types'

const POLLING_INTERVAL_MS = 3000
const TERMINAL_STATUSES = new Set(['complete', 'failed', 'cancelled'])

interface TriggerResponse { analysis_id: string; status: string }

// Trigger a new competitor analysis — calls the Python scraper directly.
export function useTriggerAnalysis() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (request: AnalysisRequest) =>
            scraper.post<TriggerResponse>('/scrape/amazon/competitor-analyze', {
                asin: request.asin,
                marketplace: request.marketplace,
                max_reviews: request.maxReviews ?? 200,
            }),
        onSuccess: (data) => {
            qc.setQueryData<CompetitorAnalysisResult>(['competitor-analysis', data.analysis_id], {
                id: data.analysis_id,
                asin: '',
                marketplace: 'US',
                status: data.status as CompetitorAnalysisResult['status'],
                reviews_scraped: 0,
                reviews_clustered: 0,
                error_message: null,
                created_at: new Date().toISOString(),
                completed_at: null,
                pain_point_clusters: [],
                opportunity_reports: [],
            })
        },
    })
}

// Poll a competitor analysis until it reaches a terminal status.
export function useCompetitorResult(analysisId: string | null) {
    return useQuery<CompetitorAnalysisResult>({
        queryKey: ['competitor-analysis', analysisId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('competitor_analyses')
                .select('*, pain_point_clusters(*), opportunity_reports(*)')
                .eq('id', analysisId!)
                .single()

            if (error) throw error
            return data as unknown as CompetitorAnalysisResult
        },
        enabled: !!analysisId,
        staleTime: 0,
        refetchInterval: (query) => {
            const status = query.state.data?.status
            if (!status || TERMINAL_STATUSES.has(status)) return false
            return POLLING_INTERVAL_MS
        },
    })
}
