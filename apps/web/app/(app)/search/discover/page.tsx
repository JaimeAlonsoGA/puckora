import { getTranslations } from 'next-intl/server'
import { getCachedUser } from '@/server/users'
import { getCachedDiscoverProducts } from '@/server/products'
import { DiscoverFiltersSchema } from '@/schemas/discover'
import { DiscoverShell } from './_components/discover-shell'

interface DiscoverPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
    const [raw, user, t] = await Promise.all([
        searchParams,
        getCachedUser(),
        getTranslations('search'),
    ])

    const filtersResult = DiscoverFiltersSchema.safeParse({
        minPrice: raw.minPrice,
        maxPrice: raw.maxPrice,
        minRating: raw.minRating,
        minRevenue: raw.minRevenue,
        minReviews: raw.minReviews,
        limit: raw.limit,
    })

    const filters = filtersResult.success ? filtersResult.data : DiscoverFiltersSchema.parse({})

    // Only fetch products when at least one explicit filter is active
    const hasFilters = filtersResult.success && (
        filters.minPrice != null ||
        filters.maxPrice != null ||
        filters.minRating != null ||
        filters.minRevenue != null ||
        filters.minReviews != null
    )

    const products = hasFilters ? await getCachedDiscoverProducts(filters) : []

    return (
        <DiscoverShell
            user={user}
            filters={filters}
            hasFilters={hasFilters}
            initialProducts={products}
        />
    )
}
