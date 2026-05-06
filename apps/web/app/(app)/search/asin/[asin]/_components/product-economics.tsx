'use client'

import { useTranslations } from 'next-intl'
import { DataCard, Caption, Mono } from '@puckora/ui'
import { formatMoney, formatDeductMoney, formatScaledPercent, cn } from '@puckora/utils'
import type { ProductFinancial } from '@puckora/types'
import type { AmazonProduct } from '@puckora/types'

interface ProductEconomicsProps {
    product: ProductFinancial
    rawProduct: AmazonProduct | null
}

function EconRow({
    label,
    value,
    accent,
}: {
    label: string
    value: string | null | undefined
    accent?: string
}) {
    return (
        <div className="flex items-center justify-between gap-2 py-1">
            <Caption className="text-muted-foreground">{label}</Caption>
            <Mono className={cn('text-sm', accent)}>{value ?? '—'}</Mono>
        </div>
    )
}

export function ProductEconomics({ product, rawProduct }: ProductEconomicsProps) {
    const t = useTranslations('product')
    const netPositive = product.net_per_unit != null && product.net_per_unit > 0

    return (
        <DataCard title={t('economics.title')}>
            <EconRow label={t('economics.price')} value={formatMoney(product.price)} />
            <EconRow label={t('economics.fbaFee')} value={formatDeductMoney(product.fba_fee)} />
            <EconRow
                label={t('economics.referralFee')}
                value={formatDeductMoney(product.referral_fee)}
            />
            {product.amazon_fee_pct != null && (
                <EconRow
                    label={t('economics.amazonTakes')}
                    value={formatScaledPercent(product.amazon_fee_pct)}
                />
            )}
            <div className="my-1 border-b-hairline" />
            <EconRow
                label={t('economics.netPerUnit')}
                value={formatMoney(product.net_per_unit)}
                accent={
                    product.net_per_unit == null
                        ? ''
                        : netPositive
                            ? 'text-success-fg'
                            : 'text-error-fg'
                }
            />
            {rawProduct?.manufacturer && rawProduct.manufacturer !== product.brand && (
                <EconRow label={t('meta.manufacturer')} value={rawProduct.manufacturer} />
            )}
        </DataCard>
    )
}
