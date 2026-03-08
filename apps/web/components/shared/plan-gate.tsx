'use client'

import { useTranslations } from 'next-intl'
import { usePlan } from '@/hooks/use-plan'
import { enforcePlanLimit, type PlanGateResult } from '@/lib/plan-gate'
import type { PlanLimits } from '@puckora/types/domain'
import { Body } from '@/components/building-blocks/typography'
import { Button } from '@/components/building-blocks'

type PlanGateProps = {
    planType: string
    resource: keyof PlanLimits
    currentUsage?: number
    children: React.ReactNode
}

export function PlanGate({ planType, resource, currentUsage, children }: PlanGateProps) {
    const t = useTranslations('common.planGate')
    const result: PlanGateResult = enforcePlanLimit(planType, resource, currentUsage)

    if (result.allowed) {
        return <>{children}</>
    }

    return (
        <div className="flex flex-col items-center gap-[var(--space-4)] rounded-[var(--radius-lg)] border border-[color:var(--border-default)] bg-[color:var(--surface-card)] p-[var(--space-8)] text-center">
            <Body>
                {result.reason === 'limitReached'
                    ? t('limitReached', { limit: result.limit ?? 0 })
                    : t('featureUnavailable')}
            </Body>
            <Button variant="primary" size="sm">
                {t('upgrade')}
            </Button>
        </div>
    )
}
