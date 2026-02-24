/**
 * useLanguage — manages the active language and exposes a switcher.
 *
 * Usage:
 *   const { language, changeLanguage, languages } = useLanguage()
 */

import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, LANGUAGE_LABELS } from '../locales/config'
import type { SupportedLanguage } from '../locales/config'

export function useLanguage() {
    const { i18n } = useTranslation()

    const language = i18n.language as SupportedLanguage

    const changeLanguage = (lang: SupportedLanguage) => {
        i18n.changeLanguage(lang)
    }

    const languages = SUPPORTED_LANGUAGES.map((code) => ({
        code,
        label: LANGUAGE_LABELS[code],
        active: code === language,
    }))

    return { language, changeLanguage, languages }
}
