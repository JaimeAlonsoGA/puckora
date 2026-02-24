/**
 * useT — type-safe, namespace-scoped translation hook.
 *
 * Usage:
 *   const { t } = useT('research')
 *   t('filters.title')          // ✅ autocomplete + type error on wrong key
 *   t('filters.title', { ns })  // ❌ ESLint will warn — use useT(ns) instead
 *
 * The hook is a thin wrapper around `useTranslation` from react-i18next.
 * Thanks to the type augmentation in `src/locales/i18n.d.ts`, TypeScript
 * knows exactly which keys exist in every namespace.
 */

import { useTranslation } from 'react-i18next'
import type { Namespace } from '../locales/config'

export function useT<N extends Namespace>(ns: N) {
    return useTranslation(ns)
}

/**
 * useCommonT — shorthand for the `common` namespace (most frequently used).
 *
 * Usage:
 *   const { t } = useCommonT()
 *   t('save')   // → "Save"
 */
export function useCommonT() {
    return useTranslation('common')
}
