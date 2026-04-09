import { Suspense } from 'react'
import { getCachedUser } from '@/server/users'
import { getCachedKeyword, getCachedKeywordResults } from '@/server/keywords'
import { getCachedScrapeJob } from '@/server/scrape'
import { fromSearchSlug } from '@/constants/routes'
import { SearchView } from './_components/search-view'
import { SearchResultsSkeleton } from '@/app/(app)/search/_skeletons/search-results-skeleton'

interface SearchQueryPageProps {
    params: Promise<{ query: string }>
    searchParams: Promise<{ view?: string; job?: string }>
}

/**
 * /search/[query] — Search results page.
 *
 * Server Component. Fetches keyword results from the DB (pre-populated by the
 * SP-API background task + scraper enrichment) and passes them to SearchView.
 * The loading.tsx skeleton renders instantly while this data is fetched.
 */
export default async function SearchQueryPage({ params, searchParams }: SearchQueryPageProps) {
    const [{ query }, { view, job }] = await Promise.all([params, searchParams])
    const decodedQuery = fromSearchSlug(query)

    return (
        <Suspense fallback={<SearchResultsSkeleton view={view === 'products' ? 'products' : 'overview'} />}>
            <SearchQueryContent
                query={decodedQuery}
                jobId={job ?? null}
                view={view === 'products' ? 'products' : 'overview'}
            />
        </Suspense>
    )
}

async function SearchQueryContent({
    query,
    jobId,
    view,
}: {
    query: string
    jobId: string | null
    view: 'overview' | 'products'
}) {
    const user = await getCachedUser()
    const [products, initialJob, keyword] = await Promise.all([
        getCachedKeywordResults(query, user.marketplace),
        jobId ? getCachedScrapeJob(jobId) : Promise.resolve(null),
        getCachedKeyword(query, user.marketplace),
    ])

    return (
        <SearchView
            query={query}
            initialView={view}
            products={products}
            marketplace={user.marketplace}
            jobId={jobId}
            initialJob={initialJob}
            totalResults={keyword?.total_results ?? null}
        />
    )
}
