import { resolveMarketplaceDomain } from '@/constants/amazon-marketplace'

/**
 * Extension-related constants.
 *
 * Update EXTENSION_INSTALL_URL to the Chrome Web Store listing URL once
 * the extension is published.
 */

/** Chrome Web Store install URL — update once published. */
export const EXTENSION_INSTALL_URL =
    'https://chromewebstore.google.com/detail/puckora'

export const EXTENSION_SITE_LABELS = {
    AMAZON: 'Amazon',
    GLOBAL_SOURCES: 'Global Sources',
} as const

export const GLOBAL_SOURCES_SITE_URL = 'https://www.globalsources.com'

export function buildAmazonMarketplaceSiteUrl(marketplace: string): string {
    return `https://${resolveMarketplaceDomain(marketplace)}`
}

export function buildSiteFaviconUrl(siteUrl: string): string {
    return `${siteUrl}/favicon.ico`
}
