import type { AmazonMarketplace, AppLanguage } from './meta.types'
import { DEFAULT_MARKETPLACE, DEFAULT_LANGUAGE } from './meta.types'

// ─── User Preferences ─────────────────────────────────────────────────────────

/**
 * Marketplace and language preference shape.
 * Used for defaults and helpers across the app.
 * Both fields are now direct columns on public.users — no JSONB needed.
 */
export type UserPreferences = {
    marketplace: AmazonMarketplace
    language: AppLanguage
}

/** Returns sane default preferences. */
export function defaultUserPreferences(): UserPreferences {
    return {
        marketplace: DEFAULT_MARKETPLACE,
        language: DEFAULT_LANGUAGE,
    }
}
