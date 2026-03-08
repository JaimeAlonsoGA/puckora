'use client'

import { PLAN_LIMITS, type PlanLimits } from '@puckora/types/domain'
import type { PlanType } from '@puckora/types'

export function usePlan(planType: string) {
    const limits: PlanLimits = PLAN_LIMITS[planType as PlanType] ?? PLAN_LIMITS.free

    const isPaid = planType !== 'free'
    const planLabel = planType.charAt(0).toUpperCase() + planType.slice(1)

    return {
        planType,
        planLabel,
        limits,
        isPaid,
    }
}
