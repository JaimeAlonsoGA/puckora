/**
 * Extension message types — single source of truth for all inter-context
 * communication:
 *  - Web app → extension  (chrome.runtime.sendMessageExternal)
 *  - Content scripts → service worker  (chrome.runtime.sendMessage)
 *  - Service worker → content scripts  (chrome.tabs.sendMessage)
 *  - Sidebar ↔ content-script host  (custom event bus over shadow DOM boundary)
 */

export type { ScrapedListing } from '@puckora/scraper-core'
import type { AnalysisResult } from './extension'

// ─── MESSAGE TYPE CONSTANTS ────────────────────────────────────────────────────

export const EXTENSION_MSG = {
    // Web app → extension (external)
    PING: 'PING',
    SET_SESSION: 'SET_SESSION',
    CLEAR_SESSION: 'CLEAR_SESSION',
    // Extension → web app (responses)
    PONG: 'PONG',
    OK: 'OK',
    // Content scripts → service worker
    SCRAPE_RESULT: 'SCRAPE_RESULT',
    // Service worker → content scripts (overlay control)
    REQUEST_ANALYSIS: 'REQUEST_ANALYSIS',
    ANALYSIS_RESULT: 'ANALYSIS_RESULT',
    OPEN_SIDEBAR: 'OPEN_SIDEBAR',
    CLOSE_SIDEBAR: 'CLOSE_SIDEBAR',
    // Service worker → content scripts (job dispatch)
    START_JOB: 'START_JOB',
} as const satisfies Record<string, string>

export type ExtensionMsgType = (typeof EXTENSION_MSG)[keyof typeof EXTENSION_MSG]

// ─── MESSAGE TYPE UNIONS ───────────────────────────────────────────────────────

/** Message sent from a content script to the service worker after scraping. */
export interface ContentScriptResult {
    type: typeof EXTENSION_MSG.SCRAPE_RESULT
    jobId: string
    listings: import('@puckora/scraper-core').ScrapedListing[]
    blocked: boolean
    pageCount: number
}

/** Service worker → content script: trigger product analysis for current page. */
export interface RequestAnalysisMsg {
    type: typeof EXTENSION_MSG.REQUEST_ANALYSIS
    asin?: string
    keyword?: string
    marketplace?: string
}

/** Service worker → content script: deliver analysis result to sidebar. */
export interface AnalysisResultMsg {
    type: typeof EXTENSION_MSG.ANALYSIS_RESULT
    result: AnalysisResult
}

/** Service worker → content script: toggle sidebar visibility. */
export interface OpenSidebarMsg {
    type: typeof EXTENSION_MSG.OPEN_SIDEBAR
}
export interface CloseSidebarMsg {
    type: typeof EXTENSION_MSG.CLOSE_SIDEBAR
}

/** Service worker → content script: tell the content script to enter job mode. */
export interface StartJobMsg {
    type: typeof EXTENSION_MSG.START_JOB
    jobId: string
}

/** All inbound messages a content script (React sidebar) might receive. */
export type SidebarInboundMsg =
    | RequestAnalysisMsg
    | AnalysisResultMsg
    | OpenSidebarMsg
    | CloseSidebarMsg
    | StartJobMsg
