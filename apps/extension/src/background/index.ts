/**
 * Background service worker entry point.
 *
 * Responsibilities:
 *  1. Maintain extension auth/session state
 *  2. Refresh Supabase tokens on a schedule
 *  3. Route external messages from the web app (auth sync)
 */
import { refreshSession } from '@/integrations/supabase/client'
import { setupMessageHandler } from './message-handler'

chrome.runtime.onInstalled.addListener(() => {
    // Schedule periodic token refresh — fires every 45 min so tokens never
    // expire mid-session (Supabase tokens last 60 min by default).
    chrome.alarms.create('puckora_token_refresh', { periodInMinutes: 45 })
})

// Refresh token on alarm
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== 'puckora_token_refresh') return
    await refreshSession()
})

setupMessageHandler()
