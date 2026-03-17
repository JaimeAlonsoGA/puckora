import { getCachedUser } from '@/server/users'
import { getCachedTopCategories } from '@/server/categories'
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
    const [{ job: jobId }, user, categories] = await Promise.all([
        searchParams,
        getCachedUser(),
        getCachedTopCategories('US'),
    ])

    if (jobId) {
        const job = await getCachedScrapeJob(jobId)
        return <SearchShell userId={user.id} initialJobId={jobId} initialJob={job} />
    }

    const displayName = user.display_name || (user.email ?? '').split('@')[0] || 'seller'
    return <SearchEntry displayName={displayName} categories={categories} marketplace={user.marketplace} />
}
