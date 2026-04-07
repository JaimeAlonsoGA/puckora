'use client'

import { useTranslations } from 'next-intl'
import { Button, Stack } from '@puckora/ui'
import type { PriceBucket } from '@puckora/utils'

interface CtasProps {
    totalProducts: number
    newListingsCount: number
    sweetSpot?: PriceBucket
    onSeeAll: () => void
}

export function Ctas({ totalProducts, newListingsCount, sweetSpot, onSeeAll }: CtasProps) {
    const t = useTranslations('search')
    return (
        <Stack direction="row" wrap gap="2">
            <Button onClick={onSeeAll} variant="primary" size="sm">
                {t('overview.seeAll', { count: totalProducts })}
            </Button>
            {newListingsCount > 0 && (
                <Button onClick={onSeeAll} variant="ghost" size="sm">
                    {t('overview.newListingsOnly', { count: newListingsCount })}
                </Button>
            )}
            {sweetSpot && (
                <Button onClick={onSeeAll} variant="ghost" size="sm">
                    {t('overview.priceRangeOnly', { range: sweetSpot.range })}
                </Button>
            )}
        </Stack>
    )
}
