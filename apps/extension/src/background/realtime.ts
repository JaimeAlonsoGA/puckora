/**
 * Realtime subscription — listens for new scrape_jobs assigned to the user
 * and dispatches them to the job executor.
 */
import { getSupabaseClient, loadSession, isAuthenticated } from '@/integrations/supabase/client'
import { executeJob } from './job-executor'
import type { ScrapeJobPayload } from '@puckora/scraper-core'
import { SCRAPE_JOB_STATUS } from '@puckora/scraper-core'

let _realtimeActive = false

export async function startRealtimeSubscription(): Promise<void> {
    if (_realtimeActive) return

    const authed = await isAuthenticated()
    if (!authed) return

    const supabase = getSupabaseClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    _realtimeActive = true

    supabase
        .channel('scrape_jobs')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'scrape_jobs',
                filter: `user_id=eq.${user.id}`,
            },
            async (payload) => {
                const job = payload.new as {
                    id: string
                    type: string
                    status: string
                    payload: ScrapeJobPayload
                    user_id: string
                }

                // Only execute pending jobs (Realtime may replay on reconnect)
                if (job.status !== SCRAPE_JOB_STATUS.PENDING) return

                const session = await loadSession()
                if (!session) return

                await executeJob(
                    { id: job.id, type: job.type, payload: job.payload, user_id: job.user_id },
                    session.access_token,
                )
            },
        )
        .subscribe()
}

export function stopRealtimeSubscription(): void {
    if (!_realtimeActive) return
    const supabase = getSupabaseClient()
    supabase.removeAllChannels()
    _realtimeActive = false
}
