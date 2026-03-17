/**
 * Background service worker entry point.
 *
 * Responsibilities:
 *  1. Start Supabase Realtime subscription when authenticated
 *  2. Inject window.__puckora_ext detection flag into the web app
 *  3. Route external messages from the web app (auth sync)
 */
import { loadSession, isAuthenticated, refreshSession } from '@/integrations/supabase/client'
import { startRealtimeSubscription, stopRealtimeSubscription } from './realtime'
import { setupMessageHandler } from './message-handler'

// ─── STARTUP ──────────────────────────────────────────────────────────────────

async function init(): Promise<void> {
    const authed = await isAuthenticated()
    if (authed) {
        await startRealtimeSubscription()
    }
}

chrome.runtime.onStartup.addListener(init)
chrome.runtime.onInstalled.addListener(() => {
    init()
    // Schedule periodic token refresh — fires every 45 min so tokens never
    // expire mid-session (Supabase tokens last 60 min by default).
    chrome.alarms.create('puckora_token_refresh', { periodInMinutes: 45 })
})

// Refresh token on alarm
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== 'puckora_token_refresh') return
    await refreshSession()
})

setupMessageHandler({ startRealtimeSubscription, stopRealtimeSubscription })
