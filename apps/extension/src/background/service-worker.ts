/**
 * Extension service worker — persistent background orchestrator.
 *
 * Responsibilities:
 *  1. Subscribes to Supabase Realtime for pending scrape_jobs
 *  2. Executes jobs via the job-executor (one at a time per user session)
 *  3. Handles auth sync messages from the web app
 *  4. Signals to web pages that the extension is installed (detection flag)
 */

import { loadSession, saveSession, clearSession, isAuthenticated, getSupabaseClient, WEB_APP_ORIGIN, type ExtensionSession } from './supabase-client'
import { executeJob, type ScrapeJob } from './job-executor'
import type { ScrapeJobPayload } from '@puckora/scraper-core'
import { SCRAPE_JOB_STATUS } from '@puckora/scraper-core'
import { EXTENSION_MSG } from '../types/messages'

// ─── TYPES ────────────────────────────────────────────────────────────────────

type WebAppMessage =
    | { type: typeof EXTENSION_MSG.SET_SESSION; session: ExtensionSession }
    | { type: typeof EXTENSION_MSG.CLEAR_SESSION }
    | { type: typeof EXTENSION_MSG.PING }

type WebAppResponse =
    | { type: typeof EXTENSION_MSG.PONG; authenticated: boolean }
    | { type: typeof EXTENSION_MSG.OK }

// ─── REALTIME SUBSCRIPTION ────────────────────────────────────────────────────

let _realtimeActive = false

async function startRealtimeSubscription(): Promise<void> {
    if (_realtimeActive) return
    const authenticated = await isAuthenticated()
    if (!authenticated) return

    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
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

                // Only execute pending jobs (Realtime can deliver replays)
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

function stopRealtimeSubscription(): void {
    if (!_realtimeActive) return
    const supabase = getSupabaseClient()
    supabase.removeAllChannels()
    _realtimeActive = false
}

// ─── MESSAGE HANDLER ──────────────────────────────────────────────────────────
// Handles messages from the web app's content scripts or popup.

chrome.runtime.onMessageExternal.addListener(
    (message: WebAppMessage, sender, sendResponse: (r: WebAppResponse) => void) => {
        // Only accept messages from the Puckora web app
        if (!sender.origin || sender.origin !== WEB_APP_ORIGIN) return

        switch (message.type) {
            case EXTENSION_MSG.PING: {
                isAuthenticated().then(authenticated => {
                    sendResponse({ type: EXTENSION_MSG.PONG, authenticated })
                })
                return true  // keep channel open for async response

            }
            case EXTENSION_MSG.SET_SESSION: {
                saveSession(message.session).then(() => {
                    startRealtimeSubscription()
                    sendResponse({ type: EXTENSION_MSG.OK })
                })
                return true
            }
            case EXTENSION_MSG.CLEAR_SESSION: {
                clearSession().then(() => {
                    stopRealtimeSubscription()
                    sendResponse({ type: EXTENSION_MSG.OK })
                })
                return true
            }
        }
    },
)

// ─── STARTUP ──────────────────────────────────────────────────────────────────

chrome.runtime.onStartup.addListener(() => {
    startRealtimeSubscription()
})

chrome.runtime.onInstalled.addListener(() => {
    startRealtimeSubscription()
})

// Inject the detection flag into all Puckora web app pages so the web app
// can detect whether the extension is installed.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') return
    if (!tab.url?.startsWith(WEB_APP_ORIGIN)) return
    chrome.scripting.executeScript({
        target: { tabId },
        func: () => { (window as any).__puckora_ext = true },
    }).catch(() => { })  // non-fatal if page doesn't accept injection
})
