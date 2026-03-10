/**
 * Extension-internal message types.
 *
 * ScrapedListing is the output shape shared with @puckora/scraper-core.
 * ContentScriptResult is the internal message protocol between content
 * scripts and the service worker.
 */

export type { ScrapedListing } from '@puckora/scraper-core'

// ─── MESSAGE TYPE CONSTANTS ───────────────────────────────────────────────────
// Single source of truth for all message type identifiers exchanged between:
//  - Web app → extension (via chrome.runtime.sendMessageExternal)
//  - Content scripts → service worker (via chrome.runtime.sendMessage)
//  - Service worker → caller (response types)

export const EXTENSION_MSG = {
    // Web app → extension
    PING: 'PING',
    SET_SESSION: 'SET_SESSION',
    CLEAR_SESSION: 'CLEAR_SESSION',
    // Extension → web app (responses)
    PONG: 'PONG',
    OK: 'OK',
    // Content scripts → service worker
    SCRAPE_RESULT: 'SCRAPE_RESULT',
} as const satisfies Record<string, string>

export type ExtensionMsgType = typeof EXTENSION_MSG[keyof typeof EXTENSION_MSG]

/** Message sent from a content script to the service worker. */
export interface ContentScriptResult {
    type: typeof EXTENSION_MSG.SCRAPE_RESULT
    jobId: string
    listings: import('@puckora/scraper-core').ScrapedListing[]
    blocked: boolean
    pageCount: number
}
