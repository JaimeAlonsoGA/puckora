import { Suspense } from 'react'
import { getCachedUser } from '@/server/users'
import { getCachedKeyword, getCachedKeywordResults } from '@/server/keywords'
import { getCachedScrapeJob } from '@/server/scrape'
import { fromSearchSlug } from '@/constants/routes'
import { SearchOverviewShell } from './_components/search-overview-shell'
import { SearchResultsSkeleton } from '../../_skeletons/search-results-skeleton'

interface SearchKeywordPageProps {
    params: Promise<{ query: string }>
    searchParams: Promise<{ job?: string }>
}

export default async function SearchKeywordPage({ params, searchParams }: SearchKeywordPageProps) {
    const [{ query }, { job }] = await Promise.all([params, searchParams])
    const decodedQuery = fromSearchSlug(query)

    return (
        <Suspense fallback={<SearchResultsSkeleton />}>
            <SearchKeywordContent
                query={decodedQuery}
                jobId={job ?? null}
            />
        </Suspense>
    )
}

async function SearchKeywordContent({
    query,
    jobId,
}: {
    query: string
    jobId: string | null
}) {
    const user = await getCachedUser()
    const [products, initialJob, keyword] = await Promise.all([
        getCachedKeywordResults(query, user.marketplace),
        jobId ? getCachedScrapeJob(jobId) : Promise.resolve(null),
        getCachedKeyword(query, user.marketplace),
    ])

    return (
        <SearchOverviewShell
            query={query}
            products={products}
            marketplace={user.marketplace}
            jobId={jobId}
            initialJob={initialJob}
            totalResults={keyword?.total_results ?? null}
        />
    )
}