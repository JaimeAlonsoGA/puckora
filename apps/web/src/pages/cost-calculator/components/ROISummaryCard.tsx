import React from 'react'
import type { CostBreakdown } from '@repo/types'
import { ScoreRing, SilkCard, KPICard } from '@repo/ui'
import { Grid, Stack, Row } from '@/components/building-blocks/layout'
import { Heading, Caption } from '@/components/building-blocks/typography'
import { formatCurrency, formatPercent } from '@repo/utils'
import { useT } from '@/hooks/useT'

export interface ROISummaryCardProps {
    breakdown: CostBreakdown
}

export function ROISummaryCard({ breakdown: b }: ROISummaryCardProps) {
    const { t } = useT('calculator')

    const marginScore = Math.min(100, Math.max(0, b.projectedMarginPct * 2))
    const roiScore = Math.min(100, Math.max(0, b.projectedROIPct))

    return (
        <SilkCard className="p-6">
            <Stack gap="lg">
                <Heading className="text-sm">{t('result.title')}</Heading>

                <Row gap="xl" className="items-center flex-wrap">
                    {/* Margin ring */}
                    <Stack gap="xs" className="items-center">
                        <ScoreRing
                            score={marginScore}
                            size={80}
                            strokeWidth={7}
                            label={`${b.projectedMarginPct.toFixed(1)}%`}
                        />
                        <Caption className="text-text-muted text-[10px] uppercase tracking-wider">Margin</Caption>
                    </Stack>

                    {/* ROI ring */}
                    <Stack gap="xs" className="items-center">
                        <ScoreRing
                            score={roiScore}
                            size={80}
                            strokeWidth={7}
                            label={`${b.projectedROIPct.toFixed(0)}%`}
                        />
                        <Caption className="text-text-muted text-[10px] uppercase tracking-wider">ROI</Caption>
                    </Stack>

                    {/* Key metrics */}
                    <Grid cols={2} gap="sm" className="flex-1">
                        <KPICard label={t('result.totalLandedCost')} value={formatCurrency(b.totalLandedCostPerUnit)} />
                        <KPICard label={t('result.netProfit')} value={formatCurrency(b.recommendedSellPrice - b.totalLandedCostPerUnit)} />
                        <KPICard label="Break-even" value={formatCurrency(b.breakEvenPrice)} />
                        {b.projectedMonthlyProfit != null && (
                            <KPICard label="Monthly Profit (est.)" value={formatCurrency(b.projectedMonthlyProfit)} accent="success" />
                        )}
                    </Grid>
                </Row>

                {/* Rating label */}
                <Caption className={`text-center text-xs font-medium ${
                    b.projectedMarginPct >= 30 ? 'text-success'
                    : b.projectedMarginPct >= 15 ? 'text-warning'
                    : 'text-error'
                }`}>
                    {b.projectedMarginPct >= 30
                        ? 'Excellent margin — strong opportunity'
                        : b.projectedMarginPct >= 15
                            ? 'Fair margin — consider price or cost optimisation'
                            : 'Low margin — review costs before investing'
                    }
                </Caption>
            </Stack>
        </SilkCard>
    )
}
