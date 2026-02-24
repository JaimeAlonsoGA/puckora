/**
 * Plan limit enforcement for Supabase Edge Functions.
 *
 * Uses `increment_usage_counter` Postgres SECURITY DEFINER RPC for
 * atomic, race-condition-safe counting.  Plan caps are mirrored from
 * @repo/types PlanLimits (kept in sync manually).
 *
 * Usage:
 *   await enforcePlanLimit(supabase, user.id, 'dailySearches')
 *   // Throws if the user has exceeded their plan's limit.
 */

import { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

// ── Plan types ────────────────────────────────────────────────────────────────

type PlanType = 'free' | 'starter' | 'pro' | 'agency'

/**
 * Limit keys that map to `usage_counters.counter_key`.
 * -1 = unlimited.  0 = blocked entirely.
 */
type CounterKey =
    | 'dailySearches'
    | 'costCalculations'
    | 'competitorAnalysesPerMonth'

/** Keys that enforce a max row-count rather than a time-windowed counter. */
type RowCountKey = 'savedProducts' | 'savedSuppliers'

export type LimitKey = CounterKey | RowCountKey

// ── Plan caps (mirror of packages/types/src/plan.ts) ─────────────────────────

const PLAN_LIMITS: Record<PlanType, Record<LimitKey, number>> = {
    free: {
        dailySearches: 5,
        costCalculations: 3,
        competitorAnalysesPerMonth: 0,
        savedProducts: 10,
        savedSuppliers: 5,
    },
    starter: {
        dailySearches: -1,
        costCalculations: -1,
        competitorAnalysesPerMonth: 5,
        savedProducts: 50,
        savedSuppliers: 20,
    },
    pro: {
        dailySearches: -1,
        costCalculations: -1,
        competitorAnalysesPerMonth: 30,
        savedProducts: 500,
        savedSuppliers: 100,
    },
    agency: {
        dailySearches: -1,
        costCalculations: -1,
        competitorAnalysesPerMonth: -1,
        savedProducts: -1,
        savedSuppliers: -1,
    },
}

const MONTHLY_KEYS = new Set<LimitKey>(['competitorAnalysesPerMonth'])
const ROW_COUNT_KEYS = new Set<LimitKey>(['savedProducts', 'savedSuppliers'])

/** Table + user_id column for row-count enforcement keys. */
const ROW_COUNT_TABLES: Record<RowCountKey, { table: string; column: string }> = {
    savedProducts: { table: 'tracked_products', column: 'user_id' },
    savedSuppliers: { table: 'tracked_products', column: 'user_id' }, // future: saved_suppliers
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Atomically increments the usage counter for `limitKey` and throws
 * `Error('PLAN_LIMIT_REACHED')` if the user is over their plan cap.
 *
 * For row-count keys (`savedProducts`, `savedSuppliers`) a COUNT query is
 * used instead of a time-windowed counter.
 */
export async function enforcePlanLimit(
    supabase: SupabaseClient,
    userId: string,
    limitKey: LimitKey,
): Promise<void> {
    // ── 1. Fetch user plan ────────────────────────────────────────────────────
    const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', userId)
        .single()

    if (profileErr || !profile) {
        console.error('enforcePlanLimit: profile fetch failed', profileErr?.message)
        return // fail open — don't block the user on a DB error
    }

    const plan = (profile.plan ?? 'free') as PlanType
    const limit: number = PLAN_LIMITS[plan]?.[limitKey] ?? -1

    if (limit === -1) return // unlimited

    // ── 2. Row-count keys ─────────────────────────────────────────────────────
    if (ROW_COUNT_KEYS.has(limitKey)) {
        const { table, column } = ROW_COUNT_TABLES[limitKey as RowCountKey]
        const { count, error: countErr } = await supabase
            .from(table)
            .select('id', { count: 'exact', head: true })
            .eq(column, userId)

        if (countErr) {
            console.error('enforcePlanLimit: row count failed', countErr.message)
            return // fail open
        }

        if ((count ?? 0) >= limit) {
            throw new Error(`PLAN_LIMIT_REACHED: ${limitKey} (${count}/${limit})`)
        }
        return
    }

    // ── 3. Time-windowed counter keys ─────────────────────────────────────────
    const period = MONTHLY_KEYS.has(limitKey) ? 'monthly' : 'daily'
    const { data: newCount, error: counterErr } = await supabase.rpc(
        'increment_usage_counter',
        { p_user_id: userId, p_key: limitKey, p_period: period },
    )

    if (counterErr) {
        console.error('enforcePlanLimit: counter increment failed', counterErr.message)
        return // fail open
    }

    if (limit > 0 && (newCount as number) > limit) {
        throw new Error(`PLAN_LIMIT_REACHED: ${limitKey} (${newCount}/${limit})`)
    }
}
