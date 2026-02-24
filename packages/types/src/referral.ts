/**
 * Referral & affiliate types — mirrors supabase tables exactly (snake_case).
 * Created for MVP Phase 1 (2026-02-24).
 */

export type ReferralEventType = 'signup' | 'first_payment' | 'renewal'
export type AffiliateStatus = 'pending' | 'approved' | 'suspended'
export type ExperienceLevel = 'beginner' | 'researching' | 'launched'
export type BudgetRange = 'under_1k' | '1k_3k' | '3k_10k' | 'over_10k'

/** Onboarding profile answers stored on the user's profile row */
export interface OnboardingAnswers {
    experience_level: ExperienceLevel
    budget_range: BudgetRange
}

/** A user's referral code row */
export interface ReferralCode {
    id: string
    user_id: string
    code: string
    created_at: string
}

/** Tracks referral conversion events */
export interface ReferralEvent {
    id: string
    referrer_user_id: string | null
    referred_user_id: string | null
    event_type: ReferralEventType
    revenue_amount: number | null
    created_at: string
}

/** Affiliate programme profile */
export interface AffiliateProfile {
    id: string
    user_id: string
    commission_rate: number
    payout_email: string | null
    total_earned: number
    status: AffiliateStatus
    created_at: string
}
