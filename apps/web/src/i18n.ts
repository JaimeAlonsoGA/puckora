/**
 * i18n initialisation.
 *
 * Namespaces are loaded eagerly via Vite's import.meta.glob so they are
 * tree-shaken correctly and bundled per-namespace.  All locale files live
 * under src/locales/{lang}/{namespace}.json.
 *
 * TypeScript types are generated from the en/ locale files via
 * `npm run i18n:types`.  See src/locales/i18n.d.ts.
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { NAMESPACES, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, DEFAULT_NAMESPACE } from './locales/config'
import type { SupportedLanguage } from './locales/config'

// ── Import all locale JSON files in one glob (eager = bundle all namespaces) ──
type LocaleModule = Record<string, unknown>
const localeModules = import.meta.glob<LocaleModule>('./locales/**/*.json', {
    eager: true,
    import: 'default',
})

// ── Build the i18next `resources` object from the glob map ─────────────────
type Resources = Record<string, Record<string, LocaleModule>>
const resources: Resources = {}

for (const [path, translations] of Object.entries(localeModules)) {
    // path → './locales/en/common.json'
    const match = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/)
    if (!match) continue
    const [, lang, ns] = match
    if (lang === undefined || ns === undefined) continue
    if (!SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)) continue
    resources[lang] ??= {}
    resources[lang][ns] = translations as LocaleModule
}

// ── Persist language preference ────────────────────────────────────────────
const storedLang: string =
    (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) || DEFAULT_LANGUAGE

i18n.use(initReactI18next).init({
    resources,
    lng: storedLang,
    fallbackLng: DEFAULT_LANGUAGE,
    defaultNS: DEFAULT_NAMESPACE,
    ns: NAMESPACES,
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: {
        escapeValue: false, // React already escapes
    },
    react: {
        useSuspense: false, // avoids Suspense requirement on language switch
    },
})

i18n.on('languageChanged', (lang) => {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('lang', lang)
    }
    document.documentElement.lang = lang
})

export default i18n
