import type { ProductFinancial } from '@puckora/types'
import type { AmazonProduct } from '@puckora/types'
import { OverviewSidebar } from '@/components/layout/overview-layout'
import { ProductResearch } from './product-research'
import { RelatedProducts } from './product-related'
import {
    getCertificationEntries,
    CertificationSignals,
} from '../../../_components/certification-signals'

interface ProductSidebarProps {
    product: ProductFinancial
    rawProduct: AmazonProduct | null
}

export function ProductSidebar({ product }: ProductSidebarProps) {
    const certEntries = getCertificationEntries([product.category_path])

    return (
        <OverviewSidebar>
            <ProductResearch product={product} />
            {certEntries.length > 0 && <CertificationSignals entries={certEntries} maxEntries={4} />}
            <RelatedProducts asin={product.asin ?? ''} />
        </OverviewSidebar>
    )
}
