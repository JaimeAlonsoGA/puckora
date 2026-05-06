'use client'

import { useTranslations } from 'next-intl'
import { DataCard, Caption, Mono } from '@puckora/ui'
import { formatWeight } from '@puckora/utils'
import { Package3D } from './package-box-3d'
import type { ProductFinancial } from '@puckora/types'

interface ProductLogisticsProps {
    product: ProductFinancial
}

function LogisticsRow({
    label,
    value,
}: {
    label: string
    value: string | null | undefined
}) {
    if (value == null) return null
    return (
        <div className="flex items-center justify-between gap-2 py-1">
            <Caption className="text-muted-foreground">{label}</Caption>
            <Mono className="text-sm">{value}</Mono>
        </div>
    )
}

export function ProductLogistics({ product }: ProductLogisticsProps) {
    const t = useTranslations('product')
    const hasDims =
        product.pkg_length_cm != null &&
        product.pkg_width_cm != null &&
        product.pkg_height_cm != null

    return (
        <DataCard title={t('logistics.title')}>
            <div className="flex items-start gap-4">
                {hasDims && (
                    <Package3D
                        lengthCm={product.pkg_length_cm!}
                        widthCm={product.pkg_width_cm!}
                        heightCm={product.pkg_height_cm!}
                        className="shrink-0"
                    />
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                    <LogisticsRow
                        label={t('logistics.weight')}
                        value={
                            product.pkg_weight_kg != null
                                ? formatWeight(product.pkg_weight_kg)
                                : null
                        }
                    />
                    {hasDims && (
                        <LogisticsRow
                            label={t('logistics.dims')}
                            value={t('logistics.dimsValue', {
                                l: product.pkg_length_cm!.toFixed(1),
                                w: product.pkg_width_cm!.toFixed(1),
                                h: product.pkg_height_cm!.toFixed(1),
                            })}
                        />
                    )}
                    <LogisticsRow
                        label={t('logistics.fulfilment')}
                        value={
                            product.fba_fee != null && product.fba_fee > 0
                                ? t('logistics.fulfilmentFba')
                                : t('logistics.fulfilmentFbm')
                        }
                    />
                </div>
            </div>
        </DataCard>
    )
}
