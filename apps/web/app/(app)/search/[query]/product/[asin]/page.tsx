import { Suspense } from 'react'
import { getCachedUser } from '@/server/users'
import { getCachedProductByAsin } from '@/server/amazon-product'
import { ProductShell } from './_components/product-shell'

interface ProductPageProps {
    params: Promise<{ query: string; asin: string }>
}

/**
 * /search/[query]/product/[asin] — Single product detail page.
 *
 * Server Component. Fetches the product row from Fly.io Postgres and passes
 * it down to the ProductShell client island as initial props.
 */
export default async function ProductPage({ params }: ProductPageProps) {
    const { query, asin } = await params
    const decodedQuery = decodeURIComponent(query)

    return (
        <Suspense fallback={<div className="flex-1 animate-pulse bg-muted/30" />}>
            <ProductContent query={decodedQuery} asin={asin} />
        </Suspense>
    )
}

async function ProductContent({ query, asin }: { query: string; asin: string }) {
    const user = await getCachedUser()
    const product = await getCachedProductByAsin(asin, user.marketplace)

    return (
        <ProductShell
            product={product}
            query={query}
            asin={asin}
            marketplace={user.marketplace}
        />
    )
}
