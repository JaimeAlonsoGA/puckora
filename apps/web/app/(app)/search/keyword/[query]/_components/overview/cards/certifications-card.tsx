'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { DataCard } from '@puckora/ui'
import type { ProductFinancial } from '@puckora/types'
import type { SearchDataAvailability } from '@/types/search'
import { useHoverTutorial } from '@/hooks/use-hover-tutorial'
import { TUTORIAL_KEYS } from '@/constants/tutorial'
import {
    CertificationSignals,
    getCertificationEntries,
} from '@/app/(app)/search/_components/certification-signals'

interface CertificationsCardProps {
    products: ProductFinancial[]
    availability: SearchDataAvailability
}

export function CertificationsCard({ products, availability }: CertificationsCardProps) {
    const t = useTranslations('search')
    const tutorial = useHoverTutorial(TUTORIAL_KEYS.CERTIFICATIONS)
    const certificationEntries = useMemo(() => {
        if (!availability.hasCategories) return []
        return getCertificationEntries(products.map((product) => product.category_path))
    }, [products, availability.hasCategories])

    if (!availability.hasCategories || certificationEntries.length === 0) return null

    return (
        <DataCard
            title={t('certs.card')}
            {...tutorial}
        >
            <CertificationSignals entries={certificationEntries} />
        </DataCard>
    )
}

