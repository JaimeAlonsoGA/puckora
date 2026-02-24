import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import type { AmazonProduct } from '@repo/types'
import { ProductCard } from '@repo/ui'
import { EmptyState } from '@/components/shared/EmptyState'
import { useT } from '@/hooks/useT'
import { useProductContext } from '@/contexts/ProductContext'
import { Button } from '@/components/building-blocks/Button'
import { Row } from '@/components/building-blocks/layout'
import { IconChartBar, IconTruck, IconCalculator, IconBookmark, IconSearch } from '@tabler/icons-react'

export interface ResultsGridProps {
    products: AmazonProduct[]
    onSave?: (product: AmazonProduct) => void
}

function ProductCardWithCTAs({ product, onSave }: { product: AmazonProduct; onSave?: (p: AmazonProduct) => void }) {
    const { t } = useT('research')
    const { setActiveProduct, markModuleUsed } = useProductContext()
    const navigate = useNavigate()

    function activate(module: string, to: string) {
        setActiveProduct(product)
        markModuleUsed(module)
        navigate({ to: to as never })
    }

    return (
        <div>
            <ProductCard product={product} onSave={onSave} />
            <Row gap="xs" className="mt-1 ml-1">
                <Button
                    variant="ghost"
                    size="sm"
                    icon={<IconChartBar size={12} />}
                    onClick={() => activate('analyzer', `/analyzer/${product.asin}`)}
                >
                    {t('cta.analyze')}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    icon={<IconTruck size={12} />}
                    onClick={() => activate('sourcing', '/sourcing')}
                >
                    {t('cta.source')}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    icon={<IconCalculator size={12} />}
                    onClick={() => activate('calculator', '/cost-calculator')}
                >
                    {t('cta.calculate')}
                </Button>
                {onSave && (
                    <Button
                        variant="ghost"
                        size="sm"
                        icon={<IconBookmark size={12} />}
                        onClick={() => onSave(product)}
                    >
                        {t('cta.save')}
                    </Button>
                )}
            </Row>
        </div>
    )
}

export function ResultsGrid({ products, onSave }: ResultsGridProps) {
    const { t } = useT('research')

    if (products.length === 0) {
        return (
            <EmptyState
                title={t('results.empty')}
                icon={<IconSearch size={32} />}
            />
        )
    }

    return (
        <div className="flex flex-col gap-3">
            {products.map(product => (
                <ProductCardWithCTAs key={product.asin} product={product} onSave={onSave} />
            ))}
        </div>
    )
}
