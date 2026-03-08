import type { Profile, PlanType } from './index'
import type { AmazonMarketplace, AppLanguage } from './meta.types'
import { DEFAULT_MARKETPLACE, DEFAULT_LANGUAGE } from './meta.types'

// ─── Profile Preferences ──────────────────────────────────────────────────────

/**
 * Shape of the `preferences` JSONB column on the profiles table.
 * Add fields here as the app grows; all fields are optional since the DB
 * stores an empty object {} for new users.
 */
export type ProfilePreferences = {
    marketplace?: AmazonMarketplace
    language?: AppLanguage
}

/** Extract typed preferences from a Profile row. Falls back to sensible defaults. */
export function getProfilePreferences(profile: Profile): Required<ProfilePreferences> {
    const prefs = (profile.preferences ?? {}) as ProfilePreferences
    return {
        marketplace: prefs.marketplace ?? DEFAULT_MARKETPLACE,
        language: prefs.language ?? DEFAULT_LANGUAGE,
    }
}

// ─── Plan Limits ──────────────────────────────────────────────────────────────

/**
 * Resource limits for a subscription plan.
 * -1 means unlimited.
 */
export type PlanLimits = {
    /** Max saved products. */
    savedProducts: number
    /** Max collections. */
    collections: number
    /** Max tracked products. */
    trackedProducts: number
    /** Max tracked keywords. */
    trackedKeywords: number
    /** Max cost calculations stored. */
    costCalculations: number
    /** Number of marketplaces available for research. */
    marketplaces: number
    /** Access to competitor analysis module. */
    competitorAnalysis: boolean
    /** Access to trend signals module. */
    trendSignals: boolean
    /** CSV / spreadsheet export. */
    csvExport: boolean
    /** Alibaba / supplier scraping access. */
    supplierScraping: boolean
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
    free: {
        savedProducts: 10,
        collections: 2,
        trackedProducts: 3,
        trackedKeywords: 5,
        costCalculations: 5,
        marketplaces: 1,
        competitorAnalysis: false,
        trendSignals: false,
        csvExport: false,
        supplierScraping: false,
    },
    starter: {
        savedProducts: 100,
        collections: 10,
        trackedProducts: 25,
        trackedKeywords: 50,
        costCalculations: 50,
        marketplaces: 3,
        competitorAnalysis: true,
        trendSignals: false,
        csvExport: true,
        supplierScraping: true,
    },
    pro: {
        savedProducts: 500,
        collections: 50,
        trackedProducts: 100,
        trackedKeywords: 200,
        costCalculations: -1,
        marketplaces: 10,
        competitorAnalysis: true,
        trendSignals: true,
        csvExport: true,
        supplierScraping: true,
    },
    agency: {
        savedProducts: -1,
        collections: -1,
        trackedProducts: -1,
        trackedKeywords: -1,
        costCalculations: -1,
        marketplaces: -1,
        competitorAnalysis: true,
        trendSignals: true,
        csvExport: true,
        supplierScraping: true,
    },
} as const

// ─── Extended Profile types ───────────────────────────────────────────────────

/** Profile enriched with computed plan limits. */
export type ProfileWithLimits = Profile & {
    planLimits: PlanLimits
}
