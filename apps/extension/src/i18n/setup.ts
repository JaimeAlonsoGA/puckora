/**
 * i18next configuration for the extension.
 *
 * Next-intl is Next.js-only. The extension uses i18next + react-i18next,
 * which works in any React context (popup, sidebar, content scripts).
 *
 * Locale priority:
 *   1. User's language preference stored in chrome.storage (synced from Supabase
 *      profile via the web app → extension postMessage handshake)
 *   2. Browser UI language (chrome.i18n.getUILanguage)
 *   3. 'en' hard fallback
 */
import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { AppLanguage } from '@puckora/types'
import { SUPPORTED_LOCALES, DEFAULT_LANGUAGE } from '@puckora/types'
import enCommon from './messages/en/common.json'
import enAuth from './messages/en/auth.json'
import enDashboard from './messages/en/dashboard.json'
import enSettings from './messages/en/settings.json'
import enSidebar from './messages/en/sidebar.json'
import enAnalysis from './messages/en/analysis.json'
import enSuppliers from './messages/en/suppliers.json'
import esCommon from './messages/es/common.json'
import esAuth from './messages/es/auth.json'
import esDashboard from './messages/es/dashboard.json'
import esSettings from './messages/es/settings.json'
import esSidebar from './messages/es/sidebar.json'
import esAnalysis from './messages/es/analysis.json'
import esSuppliers from './messages/es/suppliers.json'

const resources = {
    en: {
        translation: {
            common: enCommon,
            auth: enAuth,
            dashboard: enDashboard,
            settings: enSettings,
            sidebar: enSidebar,
            analysis: enAnalysis,
            suppliers: enSuppliers,
        },
    },
    es: {
        translation: {
            common: esCommon,
            auth: esAuth,
            dashboard: esDashboard,
            settings: esSettings,
            sidebar: esSidebar,
            analysis: esAnalysis,
            suppliers: esSuppliers,
        },
    },
}

/** Resolve a raw locale string to a supported AppLanguage. */
export function resolveLocale(raw?: string | null): AppLanguage {
    if (!raw) return DEFAULT_LANGUAGE
    const base = raw.split('-')[0].toLowerCase() as AppLanguage
    return (SUPPORTED_LOCALES as readonly string[]).includes(base)
        ? base
        : DEFAULT_LANGUAGE
}

/**
 * Detect locale from chrome.storage (user profile preference) or,
 * as a fallback, from the browser UI language.
 */
export async function detectLocale(): Promise<AppLanguage> {
    try {
        const result = await chrome.storage.local.get('puckora_locale')
        const stored = result['puckora_locale'] as string | undefined
        if (stored) return resolveLocale(stored)
    } catch {
        // chrome API unavailable (e.g. unit tests or non-extension context)
    }
    // Fallback: browser UI language
    const browserLang =
        typeof chrome !== 'undefined' && chrome.i18n
            ? chrome.i18n.getUILanguage()
            : navigator.language
    return resolveLocale(browserLang)
}

/** Initialise i18next. Must be called before React renders. */
export function setupI18n(locale: AppLanguage = DEFAULT_LANGUAGE) {
    if (i18next.isInitialized) {
        if (i18next.language !== locale) {
            i18next.changeLanguage(locale)
        }
        return
    }

    i18next.use(initReactI18next).init({
        lng: locale,
        fallbackLng: DEFAULT_LANGUAGE,
        resources,
        interpolation: {
            escapeValue: false, // React already escapes by default
        },
        react: {
            useSuspense: false, // extension contexts don't support Suspense boundaries
        },
    })
}
