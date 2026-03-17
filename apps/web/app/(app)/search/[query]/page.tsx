import { getCachedUser } from '@/server/users'
import { getCachedKeywordResults } from '@/server/keywords'
import { SearchView } from './_components/search-view'

interface SearchQueryPageProps {
    params: Promise<{ query: string }>
    searchParams: Promise<{ view?: string }>
}

/**
 * /search/[query] — Search results page.
 *
 * Server Component. Fetches keyword results from the DB (pre-populated by the
 * SP-API background task + scraper enrichment) and passes them to SearchView.
 * The loading.tsx skeleton renders instantly while this data is fetched.
 */
export default async function SearchQueryPage({ params, searchParams }: SearchQueryPageProps) {
    const [{ query }, { view }, user] = await Promise.all([params, searchParams, getCachedUser()])
    const decodedQuery = decodeURIComponent(query)

    const products = await getCachedKeywordResults(decodedQuery, user.marketplace)

    return (
        <SearchView
            query={decodedQuery}
            initialView={view === 'products' ? 'products' : 'overview'}
            products={products}
            marketplace={user.marketplace}
        />
    )
}
