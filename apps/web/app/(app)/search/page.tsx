import { getTranslations } from 'next-intl/server'
import { DEFAULT_WEB_MARKETPLACE, WEB_MARKETPLACE_IDS, type WebMarketplaceId } from '@/constants/amazon-marketplace'
import { getCachedUser } from '@/server/users'
import { SearchEntry } from './_components/search-entry'

/**
 * /search — Shared launcher for keyword, ASIN, and future discover intents.
 */
export default async function SearchPage() {
    const user = await getCachedUser()
    const marketplace = WEB_MARKETPLACE_IDS.includes(user.marketplace as WebMarketplaceId)
        ? (user.marketplace as WebMarketplaceId)
        : DEFAULT_WEB_MARKETPLACE
    const t = await getTranslations('search')

    const displayName = user.display_name || (user.email ?? '').split('@')[0] || t('entry.fallbackDisplayName')
    return <SearchEntry displayName={displayName} marketplace={marketplace} />
}

