import { getCachedUser } from '@/server/users'
import { getCachedDiscoverProducts } from '@/server/products'
import { DiscoverFiltersSchema } from '@/schemas/discover'
import { DiscoverShell } from './_components/discover-shell'

interface DiscoverPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
    const [raw] = await Promise.all([
        searchParams,
        getCachedUser(), // auth guard
    ])

    const filtersResult = DiscoverFiltersSchema.safeParse({
        minPrice: raw.minPrice,
        maxPrice: raw.maxPrice,
        minRating: raw.minRating,
        maxRating: raw.maxRating,
        minReviews: raw.minReviews,
        maxReviews: raw.maxReviews,
        categories: raw.categories,
        limit: raw.limit,
    })

    const filters = filtersResult.success ? filtersResult.data : DiscoverFiltersSchema.parse({})

    // Only fetch products when at least one explicit filter is active
    const hasFilters = filtersResult.success && (
        filters.minPrice != null ||
        filters.maxPrice != null ||
        filters.minRating != null ||
        filters.maxRating != null ||
        filters.minReviews != null ||
        filters.maxReviews != null ||
        filters.categories.length > 0
    )

    const products = hasFilters ? await getCachedDiscoverProducts(filters) : []

    return (
        <DiscoverShell
            key={[
                filters.minPrice ?? '',
                filters.maxPrice ?? '',
                filters.minRating ?? '',
                filters.maxRating ?? '',
                filters.minReviews ?? '',
                filters.maxReviews ?? '',
                filters.categories.join(','),
            ].join('|')}
            filters={filters}
            hasFilters={hasFilters}
            initialProducts={products}
        />
    )
}
