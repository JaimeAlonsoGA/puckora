import { Suspense } from 'react'
import { getCachedUser } from '@/server/users'
import { getCachedProductByAsin } from '@/server/amazon-product'
import { cachedGetProductByAsin } from '@/server/products'
import { SearchResultsSkeleton } from '../../_skeletons/search-results-skeleton'
import { ProductShell } from '../../[asin]/_components/product-shell'

interface SearchAsinPageProps {
    params: Promise<{ asin: string }>
}

export default async function SearchAsinPage({ params }: SearchAsinPageProps) {
    const { asin } = await params

    return (
        <Suspense fallback={<SearchResultsSkeleton />}>
            <SearchAsinContent asin={asin} />
        </Suspense>
    )
}

async function SearchAsinContent({ asin }: { asin: string }) {
    const user = await getCachedUser()
    const [product, rawProduct] = await Promise.all([
        getCachedProductByAsin(asin, user.marketplace),
        cachedGetProductByAsin(asin),
    ])

    return (
        <ProductShell
            product={product}
            rawProduct={rawProduct}
            asin={asin}
            query={null}
            marketplace={user.marketplace}
        />
    )
}