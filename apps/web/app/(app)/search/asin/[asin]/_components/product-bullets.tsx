'use client'

import { useTranslations } from 'next-intl'
import { DataCard, Body } from '@puckora/ui'
import type { AmazonProduct } from '@puckora/types'

interface ProductBulletsProps {
    rawProduct: AmazonProduct | null
}

export function ProductBullets({ rawProduct }: ProductBulletsProps) {
    const t = useTranslations('product')
    const bullets = rawProduct?.bullet_points

    if (!bullets || bullets.length === 0) return null

    return (
        <DataCard title={t('bullets.title')}>
            <ul className="flex flex-col gap-2">
                {bullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2">
                        <span
                            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground"
                            aria-hidden="true"
                        />
                        <Body className="text-sm leading-relaxed">{bullet}</Body>
                    </li>
                ))}
            </ul>
        </DataCard>
    )
}
