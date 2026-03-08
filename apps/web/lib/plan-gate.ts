import type { PlanLimits } from '@puckora/types/domain'
import { PLAN_LIMITS } from '@puckora/types/domain'
import type { PlanType } from '@puckora/types'

/** i18n key segments under the `common.planGate` namespace */
export type PlanGateBlockReason = 'featureUnavailable' | 'limitReached'

export type PlanGateResult =
    | { allowed: true }
    | {
        allowed: false
        /** Key under `common.planGate.*` for the translated message */
        reason: PlanGateBlockReason
        /** For limitReached: the ceiling value shown in the message */
        limit?: number
        upgradeRequired: true
    }

/**
 * Check if a user's plan allows a specific action.
 * Returns a typed result — never raw English strings.
 * Components translate `reason` via `t(result.reason)`.
 */
export function enforcePlanLimit(
    planType: PlanType | string,
    resource: keyof PlanLimits,
    currentUsage?: number,
): PlanGateResult {
    const limits = PLAN_LIMITS[planType as PlanType] ?? PLAN_LIMITS.free
    const limit = limits[resource]

    // Boolean feature flags
    if (typeof limit === 'boolean') {
        if (!limit) {
            return { allowed: false, reason: 'featureUnavailable', upgradeRequired: true }
        }
        return { allowed: true }
    }

    // Numeric limits — -1 means unlimited
    if (limit === -1) return { allowed: true }

    if (currentUsage !== undefined && currentUsage >= limit) {
        return { allowed: false, reason: 'limitReached', limit, upgradeRequired: true }
    }

    return { allowed: true }
}
