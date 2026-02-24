import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useT } from '@/hooks/useT'
import { PageContainer } from '@/components/layout/PageContainer'
import { Heading, Mono } from '@/components/building-blocks/typography'

export const Route = createFileRoute('/competitor-intel/$asin')({
    component: CompetitorIntelResultPage,
})

function CompetitorIntelResultPage() {
    const { t } = useT('competitor')
    const { asin } = Route.useParams()

    return (
        <PageContainer>
            <Heading>{t('title')}</Heading>
            <Mono>{asin}</Mono>
        </PageContainer>
    )
}
