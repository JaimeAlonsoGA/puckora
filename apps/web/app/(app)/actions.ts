'use server'

/**
 * App Server Actions
 *
 * Mutations performed by authenticated users inside the (app) route group.
 * Each action returns { error } on failure and undefined on success
 * (caller handles router.refresh() via useFormAction onSuccess callback).
 */

import { after } from 'next/server'
import { createAdminClient } from '@/integrations/supabase/admin'
import { createServerClient } from '@/integrations/supabase/server'
import { createFlyioDb } from '@/integrations/flyio/client'
import { API_ERROR_MESSAGES } from '@/constants/api'
import { updateUser } from '@/services/settings'
import { createScrapeJob, updateScrapeJob } from '@/services/scrape'
import { upsertKeyword } from '@/services/keywords'
import { CookieName } from '@/constants/cookies'
import { cookies } from 'next/headers'
import type { ActionResult } from '@/hooks/use-form-action'
import { SettingsUpdateSchema, type SettingsUpdateInput } from '@puckora/types/schemas'
import { AmazonSearchInputSchema, type AmazonSearchInput } from '@/schemas/scrape'
import { getAuthUser } from '@/server/auth'
import { SCRAPE_JOB_TYPE, SCRAPE_JOB_STATUS, SCRAPE_EXECUTOR } from '@puckora/scraper-core'

type KeywordSearchLaunchResult = ActionResult | { jobId: string; keyword: string }

// ---------------------------------------------------------------------------
// Profile update
// ---------------------------------------------------------------------------

export async function updateProfileAction(data: SettingsUpdateInput): Promise<ActionResult> {
    // Validate again server-side even though client validated first
    const parsed = SettingsUpdateSchema.safeParse(data)
    if (!parsed.success) {
        return { error: API_ERROR_MESSAGES.INVALID_INPUT }
    }

    try {
        const user = await getAuthUser()
        const supabase = await createServerClient()
        await updateUser(supabase, user.id, parsed.data)

        // Keep NEXT_LOCALE cookie in sync when language changes
        if (parsed.data.language) {
            const cookieStore = await cookies()
            cookieStore.set(CookieName.locale, parsed.data.language, {
                path: '/',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 365,
            })
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : API_ERROR_MESSAGES.PROFILE_UPDATE_FAILED
        return { error: message }
    }
}

// ---------------------------------------------------------------------------
// Amazon search — create scrape job
// ---------------------------------------------------------------------------

/**
 * Create an amazon_search scrape job and return the launch payload for the
 * keyword results route. The client owns navigation so all search intents can
 * launch from the same entry surface without mixed redirect semantics.
 */
export async function createKeywordSearchJobAction(
    data: AmazonSearchInput,
): Promise<KeywordSearchLaunchResult> {
    const parsed = AmazonSearchInputSchema.safeParse(data)
    if (!parsed.success) {
        return { error: API_ERROR_MESSAGES.INVALID_SEARCH_INPUT }
    }

    try {
        const user = await getAuthUser()
        const supabase = await createServerClient()
        const db = createFlyioDb()

        // createScrapeJob (Supabase) and upsertKeyword (Fly.io) are fully
        // independent — run concurrently to eliminate the sequential round-trip.
        const [job, keywordRow] = await Promise.all([
            createScrapeJob(supabase, {
                user_id: user.id,
                type: SCRAPE_JOB_TYPE.AMAZON_SEARCH,
                status: SCRAPE_JOB_STATUS.PENDING,
                target_executor: SCRAPE_EXECUTOR.AGENT,
                payload: {
                    type: SCRAPE_JOB_TYPE.AMAZON_SEARCH,
                    keyword: parsed.data.keyword,
                    marketplace: parsed.data.marketplace,
                    max_pages: 1,
                },
            }),
            // Upsert keyword row (unique on keyword+marketplace) so the SP-API
            // background task has a canonical ID to write products under.
            upsertKeyword(db, {
                keyword: parsed.data.keyword,
                marketplace: parsed.data.marketplace,
            }),
        ])

        // Fire SP-API keyword search in the background after the redirect
        // response is sent. The admin client is required because after() runs
        // outside the request context (no cookies / user session available).
        const keywordId = keywordRow.id
        const { keyword, marketplace } = parsed.data
        const jobId = job.id
        after(async () => {
            const adminClient = createAdminClient()
            try {
                const { runKeywordSearch } = await import('@/integrations/data-pipeline/keyword-search')
                const { syncAmazonProductVectorsDownstream } = await import('@/integrations/data-pipeline/vector-sync')
                const flyDb = createFlyioDb()
                await runKeywordSearch(flyDb, adminClient, {
                    jobId,
                    keywordId,
                    keyword,
                    marketplace,
                })
                await syncAmazonProductVectorsDownstream()
            } catch (err) {
                console.error(`[createScrapeJobAction] ${API_ERROR_MESSAGES.KEYWORD_SEARCH_FAILED}:`, err)

                try {
                    await updateScrapeJob(adminClient, jobId, {
                        status: SCRAPE_JOB_STATUS.FAILED,
                        executor: SCRAPE_EXECUTOR.AGENT,
                        error: err instanceof Error ? err.message : API_ERROR_MESSAGES.KEYWORD_SEARCH_FAILED,
                        completed_at: new Date().toISOString(),
                    })
                } catch (jobErr) {
                    console.error('[createScrapeJobAction] failed to mark scrape job as failed:', jobErr)
                }
            }
        })

        return {
            jobId: job.id,
            keyword: parsed.data.keyword,
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : API_ERROR_MESSAGES.SEARCH_JOB_CREATE_FAILED
        return { error: message }
    }
}
