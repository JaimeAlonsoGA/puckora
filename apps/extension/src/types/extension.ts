/**
 * Extension-specific domain types.
 *
 * These complement @puckora/types for extension-only concerns.
 */
import type { ScrapedListing } from '@puckora/scraper-core'
import type { AppLanguage } from '@puckora/types'

// ─── PAGE CONTEXT ──────────────────────────────────────────────────────────────

/** Which type of page the content script is currently running on. */
export type PageContext =
    | { type: 'amazon-search'; keyword: string; marketplace: string }
    | { type: 'amazon-product'; asin: string; marketplace: string }
    | { type: 'alibaba-search'; keyword: string }
    | { type: 'other' }

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────

export type SidebarTab = 'analysis' | 'suppliers'

/** Result of a Puckora analysis overlaid on the current page. */
export interface AnalysisResult {
    /** ASIN being analysed (product pages). */
    asin?: string
    /** Keyword being analysed (search pages). */
    keyword?: string
    marketplace?: string
    /** Parsed listings from the current page. */
    listings: ScrapedListing[]
    /** FBA fee estimate in USD cents (product pages only). */
    fba_fee?: number
    /** Referral fee percentage. */
    referral_fee_pct?: number
    /** Estimated profit margin percentage. */
    estimated_margin_pct?: number
    /** Best Sellers Rank. */
    bsr?: number
    /** ISO timestamp of when analysis was run. */
    analysed_at: string
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

/** Persisted session — synced from web app via postMessage. */
export interface ExtensionSession {
    access_token: string
    refresh_token: string
    /** Epoch ms — used for expiry check without a network round-trip. */
    expires_at: number
    user_id: string
    user_email: string
    /** User's preferred language 2014 synced from their web app profile. */
    language?: AppLanguage
}
