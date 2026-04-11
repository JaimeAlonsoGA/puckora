import { redirect } from 'next/navigation'
import { fromSearchSlug, searchProductRoute, searchQueryRoute } from '@/constants/routes'
import { parseAsin } from '@puckora/utils'

interface SearchQueryPageProps {
    params: Promise<{ query: string }>
    searchParams: Promise<{ job?: string }>
}

export default async function SearchQueryPage({ params, searchParams }: SearchQueryPageProps) {
    const [{ query }, { job }] = await Promise.all([params, searchParams])
    const asin = parseAsin(query)

    if (asin) {
        redirect(searchProductRoute(asin))
    }

    const decodedQuery = fromSearchSlug(query)

    redirect(job ? `${searchQueryRoute(decodedQuery)}?job=${job}` : searchQueryRoute(decodedQuery))
}
