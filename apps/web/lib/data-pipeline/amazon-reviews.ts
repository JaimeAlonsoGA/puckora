/**
 * Data pipeline: Amazon product reviews.
 *
 * Fetches reviews from Apify (axesso_data/amazon-reviews-scraper) and
 * creates / updates a CompetitorAnalyse job record in Supabase.
 * The actual review embeddings + clustering is a background AI job
 * (handled separately) — this pipeline only fetches and persists raw data.
 */

import { runApifyActor } from '@/lib/apify/client'
import { APIFY_ACTOR_ID } from '@/lib/apify/types'
import type { AmazonReviewsInput, AmazonReviewOutput } from '@/lib/apify/types'
import {
    createCompetitorAnalyse,
    updateCompetitorAnalyse,
} from '@/lib/services/reviews'
import type { CompetitorAnalyseInsert } from '@puckora/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseInstance = any

export interface FetchAmazonReviewsOptions {
    asin: string
    /** puckora marketplace code, e.g. "US", "DE" */
    marketplace: string
    /** Amazon domain code for the actor, e.g. "com", "de" */
    domainCode: string
    userId: string
    productId?: string
    maxPages?: number
    sortBy?: AmazonReviewsInput['sortBy']
    filterByStar?: AmazonReviewsInput['filterByStar']
    maxReviews?: number
}

export interface FetchAmazonReviewsResult {
    analysisId: string
    reviewsScraped: number
    status: 'complete' | 'pending' | 'error'
    error?: string
}

/**
 * Fetch reviews for a product, create a CompetitorAnalyse record with
 * the raw review data and return it for downstream processing.
 */
export async function fetchAndPersistAmazonReviews(
    supabase: SupabaseInstance,
    options: FetchAmazonReviewsOptions,
): Promise<FetchAmazonReviewsResult> {
    const analysisInput: CompetitorAnalyseInsert = {
        asin: options.asin,
        marketplace: options.marketplace as CompetitorAnalyseInsert['marketplace'],
        user_id: options.userId,
        product_id: options.productId ?? null,
        status: 'processing',
        max_reviews: options.maxReviews ?? 100,
        queued_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        reviews_scraped: 0,
        reviews_clustered: 0,
    }

    let analysis = await createCompetitorAnalyse(supabase, analysisInput)

    let reviews: AmazonReviewOutput[] = []
    try {
        reviews = await runApifyActor<AmazonReviewsInput, AmazonReviewOutput>(
            APIFY_ACTOR_ID.amazonReviews,
            {
                asin: options.asin,
                domainCode: options.domainCode,
                maxPages: options.maxPages ?? 1,
                sortBy: options.sortBy ?? 'recent',
                ...(options.filterByStar ? { filterByStar: options.filterByStar } : {}),
            },
        )
    } catch (err) {
        await updateCompetitorAnalyse(supabase, analysis.id, {
            status: 'failed',
            error_message: String(err),
            completed_at: new Date().toISOString(),
        })
        return { analysisId: analysis.id, reviewsScraped: 0, status: 'error', error: String(err) }
    }

    // Update the analysis with scraped count + raw data stored in error_message
    // (actual embedding / clustering is a separate background step)
    analysis = await updateCompetitorAnalyse(supabase, analysis.id, {
        status: 'complete',
        reviews_scraped: reviews.length,
        completed_at: new Date().toISOString(),
        // We store minimal rating distribution here; deep analysis is a separate job
        min_rating: reviews.reduce((min, r) => {
            const n = parseFloat(r.rating)
            return isNaN(n) ? min : Math.min(min, n)
        }, 5),
        max_rating: reviews.reduce((max, r) => {
            const n = parseFloat(r.rating)
            return isNaN(n) ? max : Math.max(max, n)
        }, 0),
    })

    return {
        analysisId: analysis.id,
        reviewsScraped: reviews.length,
        status: 'complete',
    }
}
