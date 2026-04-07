import { getTranslations } from 'next-intl/server'
import { DEFAULT_WEB_MARKETPLACE, WEB_MARKETPLACE_IDS, type WebMarketplaceId } from '@/constants/amazon-marketplace'
import { getCachedUser } from '@/server/users'
import { getCachedScrapeJob } from '@/server/scrape'
import { SearchEntry } from './_components/search-entry'
import { SearchShell } from './_components/search-shell'

interface SearchPageProps {
    searchParams: Promise<{ job?: string }>
}

/**
 * /search — Entry screen.
 *
 * When ?job=<id> is present (post-redirect from createScrapeJobAction),
 * renders SearchShell which shows job progress and auto-navigates to
 * /search/[query] when the job completes.
 * Otherwise renders SearchEntry (the keyword search form).
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
    const [{ job: jobId }, user] = await Promise.all([
        searchParams,
        getCachedUser(),
    ])

    if (jobId) {
        const job = await getCachedScrapeJob(jobId)
        return <SearchShell initialJobId={jobId} initialJob={job} />
    }

    const marketplace = WEB_MARKETPLACE_IDS.includes(user.marketplace as WebMarketplaceId)
        ? (user.marketplace as WebMarketplaceId)
        : DEFAULT_WEB_MARKETPLACE
    const t = await getTranslations('search')

    const displayName = user.display_name || (user.email ?? '').split('@')[0] || t('entry.fallbackDisplayName')
    return <SearchEntry displayName={displayName} marketplace={marketplace} />
}

