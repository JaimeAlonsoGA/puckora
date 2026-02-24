import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useT } from '@/hooks/useT'
import { PageContainer } from '@/components/layout/PageContainer'
import { Heading, Body } from '@/components/building-blocks/typography'
import { Stack } from '@/components/building-blocks/layout'
import { AsyncBoundary } from '@/components/shared/AsyncBoundary'
import { CostPanel } from '@/pages/cost-calculator/components/CostPanel'

export const Route = createFileRoute('/cost-calculator/')({
    component: CostCalculatorPage,
})

function CostCalculatorPage() {
    const { t } = useT('calculator')

    return (
        <PageContainer>
            <AsyncBoundary>
                <Stack gap="xl">
                    <Stack gap="xs">
                        <Heading>{t('title')}</Heading>
                        <Body className="text-text-muted">{t('subtitle')}</Body>
                    </Stack>
                    <CostPanel />
                </Stack>
            </AsyncBoundary>
        </PageContainer>
    )
}
