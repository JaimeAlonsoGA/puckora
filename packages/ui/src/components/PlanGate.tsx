import React from 'react'
import type { PlanType } from '@repo/types'
import { PLAN_LIMITS } from '@repo/types'

type PlanFeature = keyof typeof PLAN_LIMITS[PlanType]

export interface PlanGateProps {
    userPlan: PlanType
    requiredFeature: PlanFeature
    children: React.ReactNode
    fallback?: React.ReactNode
}

export function PlanGate({ userPlan, requiredFeature, children, fallback }: PlanGateProps) {
    const limits = PLAN_LIMITS[userPlan]
    const hasAccess = limits != null && Boolean(limits[requiredFeature])

    if (!hasAccess) {
        return (
            fallback ? <>{fallback}</> : (
                <div className="rounded border border-border bg-surface-tertiary p-6 text-center">
                    <p className="text-text-secondary text-sm">
                        This feature requires a higher plan.
                    </p>
                </div>
            )
        )
    }

    return <>{children}</>
}
