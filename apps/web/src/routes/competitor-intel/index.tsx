import React, { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useT } from '@/hooks/useT'
import { PageContainer } from '@/components/layout/PageContainer'
import { Heading, Body } from '@/components/building-blocks/typography'
import { Stack } from '@/components/building-blocks/layout'
import { AsyncBoundary } from '@/components/shared/AsyncBoundary'
import { AnalysisForm } from '@/pages/competitor-intel/components/AnalysisForm'
import { AnalysisStatusBar } from '@/pages/competitor-intel/components/AnalysisStatusBar'
import { PainPointList } from '@/pages/competitor-intel/components/PainPointList'
import { OpportunityReport } from '@/pages/competitor-intel/components/OpportunityReport'
import { useTriggerAnalysis, useCompetitorResult } from '@/hooks/useCompetitorIntel'
import { useProductContext } from '@/contexts/ProductContext'

export const Route = createFileRoute('/competitor-intel/')({
    component: CompetitorIntelPage,
})

function CompetitorIntelContent() {
    const { t } = useT('competitor')
    const { activeProduct } = useProductContext()
    const [analysisId, setAnalysisId] = useState<string | null>(null)

    const { mutate: trigger, isPending: triggering } = useTriggerAnalysis()
    const { data: result } = useCompetitorResult(analysisId)

    function handleSubmit(asin: string) {
        trigger({ asin, marketplace: 'US' }, {
            onSuccess: (res) => setAnalysisId(res.analysis_id),
        })
    }

    const isTerminal = result?.status === 'complete' || result?.status === 'failed'

    return (
        <Stack gap="xl">
            <Stack gap="xs">
                <Heading>{t('title')}</Heading>
                <Body className="text-text-muted">{t('subtitle')}</Body>
            </Stack>

            <AnalysisForm
                onSubmit={handleSubmit}
                loading={triggering || (!!result && !isTerminal)}
                initialAsin={activeProduct?.asin}
            />

            {result && !isTerminal && (
                <AnalysisStatusBar
                    status={result.status}
                    reviewsScraped={result.reviews_scraped}
                />
            )}

            {result?.status === 'failed' && (
                <Body className="text-error text-sm">
                    {result.error_message ?? t('status.failed')}
                </Body>
            )}

            {result?.status === 'complete' && result.pain_point_clusters?.length > 0 && (
                <PainPointList clusters={result.pain_point_clusters} />
            )}

            {result?.status === 'complete' && result.opportunity_reports?.[0] && (
                <OpportunityReport report={result.opportunity_reports[0]} />
            )}
        </Stack>
    )
}

function CompetitorIntelPage() {
    return (
        <PageContainer>
            <AsyncBoundary>
                <CompetitorIntelContent />
            </AsyncBoundary>
        </PageContainer>
    )
}
