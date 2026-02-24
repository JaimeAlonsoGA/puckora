/**
 * <Trans ns="research" i18nKey="filters.title" />
 *
 * Thin wrapper around react-i18next's <Trans> component that enforces
 * the namespace as a required prop and gives auto-complete for keys.
 *
 * Usage (JSX, no hook needed):
 *   <Trans ns="research" i18nKey="filters.title" />
 *   <Trans ns="plans" i18nKey="limit.reached" />
 *
 * For rich interpolation (embedded HTML / components) use the full
 * react-i18next <Trans> directly.
 */

export { Trans } from 'react-i18next'
