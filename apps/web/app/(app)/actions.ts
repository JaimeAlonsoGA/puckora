'use server'

/**
 * App Server Actions
 *
 * Mutations performed by authenticated users inside the (app) route group.
 * Each action returns { error } on failure and undefined on success
 * (caller handles router.refresh() via useFormAction onSuccess callback).
 */

import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/integrations/supabase/server'
import { updateUser } from '@/services/settings'
import { createScrapeJob } from '@/services/scrape'
import { upsertKeyword } from '@/services/keywords'
import { CookieName } from '@/constants/cookies'
import { cookies } from 'next/headers'
import type { ActionResult } from '@/hooks/use-form-action'
import { SettingsUpdateSchema, type SettingsUpdateInput } from '@puckora/types/schemas'
import { AmazonSearchInputSchema, type AmazonSearchInput } from '@/schemas/scrape'
import { getAuthUser } from '@/server/auth'
import { AppRoute } from '@/constants/routes'
import { SCRAPE_JOB_TYPE, SCRAPE_JOB_STATUS } from '@puckora/scraper-core'

// ---------------------------------------------------------------------------
// Profile update
// ---------------------------------------------------------------------------

export async function updateProfileAction(data: SettingsUpdateInput): Promise<ActionResult> {
    // Validate again server-side even though client validated first
    const parsed = SettingsUpdateSchema.safeParse(data)
    if (!parsed.success) {
        return { error: 'Invalid input' }
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
        const message = err instanceof Error ? err.message : 'Failed to update profile'
        return { error: message }
    }
}

// ---------------------------------------------------------------------------
// Amazon search — create scrape job
// ---------------------------------------------------------------------------

/**
 * Create an amazon_search scrape job and redirect to /search?job=<id>.
 *
 * The redirect re-renders the search page as a Server Component that reads
 * the job ID from searchParams and passes it to the SearchShell client island.
 * From there the shell subscribes to Realtime and polls until done.
 *
 * Never redirects on error — returns { error } so the form stays visible.
 */
export async function createScrapeJobAction(data: AmazonSearchInput): Promise<ActionResult> {
    const parsed = AmazonSearchInputSchema.safeParse(data)
    if (!parsed.success) {
        return { error: 'Invalid search input' }
    }

    try {
        const user = await getAuthUser()
        const supabase = await createServerClient()

        const job = await createScrapeJob(supabase, {
            user_id: user.id,
            type: SCRAPE_JOB_TYPE.AMAZON_SEARCH,
            status: SCRAPE_JOB_STATUS.PENDING,
            payload: {
                type: SCRAPE_JOB_TYPE.AMAZON_SEARCH,
                keyword: parsed.data.keyword,
                marketplace: parsed.data.marketplace,
                max_pages: 1,
            },
        })

        // Upsert keyword row (unique on keyword+marketplace) so the SP-API
        // background task has a canonical ID to write products under.
        const keywordRow = await upsertKeyword(supabase, {
            keyword: parsed.data.keyword,
            marketplace: parsed.data.marketplace,
        })

        // Fire SP-API keyword search in the background after the redirect
        // response is sent. The admin client is required because after() runs
        // outside the request context (no cookies / user session available).
        const keywordId = keywordRow.id
        const { keyword, marketplace } = parsed.data
        after(async () => {
            try {
                const adminClient = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY!,
                )
                const { runKeywordSearch } = await import('@/integrations/data-pipeline/keyword-search')
                await runKeywordSearch(adminClient, keywordId, keyword, marketplace)
            } catch (err) {
                console.error('[createScrapeJobAction] SP-API keyword search failed:', err)
            }
        })

        // Redirect drives a server render of the search page with the job ID
        // embedded in the URL — clean, bookmarkable, SSR-friendly.
        redirect(`${AppRoute.search}?job=${job.id}`)
    } catch (err) {
        // redirect() throws a special Next.js error — do NOT catch it
        if ((err as { digest?: string })?.digest?.startsWith('NEXT_REDIRECT')) throw err
        const message = err instanceof Error ? err.message : 'Failed to create search job'
        return { error: message }
    }
}
