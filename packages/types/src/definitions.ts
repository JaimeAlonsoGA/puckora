// Application definitions, they are not relative to the Database 
export type JobStatus = 'pending' | 'queued' | 'processing' | 'complete' | 'failed' | 'cancelled'
export const JOB_STATUSES: JobStatus[] = ['pending', 'queued', 'processing', 'complete', 'failed', 'cancelled']

export type Marketplace = 'US' | 'CA' | 'MX' | 'BR' | 'UK' | 'DE' | 'FR' | 'IT' | 'ES' | 'NL' | 'SE' | 'PL' | 'TR' | 'AE' | 'SA' | 'IN' | 'JP' | 'AU' | 'SG'
export const MARKETPLACES: Marketplace[] = ['US', 'CA', 'MX', 'BR', 'UK', 'DE', 'FR', 'IT', 'ES', 'NL', 'SE', 'PL', 'TR', 'AE', 'SA', 'IN', 'JP', 'AU', 'SG']

export type NotificationType = 'price_drop' | 'bsr_spike' | 'bsr_drop' | 'analysis_complete' | 'plan_limit' | 'system' | 'opportunity' | 'supplier_match'
export const NOTIFICATION_TYPES: NotificationType[] = ['price_drop', 'bsr_spike', 'bsr_drop', 'analysis_complete', 'plan_limit', 'system', 'opportunity', 'supplier_match']

export type OnboardingStep = 'marketplace' | 'niche' | 'business_model' | 'goals' | 'first_search' | 'save_product' | 'run_calculator' | 'complete'
export const ONBOARDING_STEPS: OnboardingStep[] = ['marketplace', 'niche', 'business_model', 'goals', 'first_search', 'save_product', 'run_calculator', 'complete']

export type OpportunityType = 'pain_gap' | 'price_gap' | 'review_gap' | 'bsr_trend' | 'niche_entry' | 'seasonal'
export const OPPORTUNITY_TYPES: OpportunityType[] = ['pain_gap', 'price_gap', 'review_gap', 'bsr_trend', 'niche_entry', 'seasonal']

export type AnalysisStatus = 'pending' | 'scraping' | 'analyzing' | 'complete' | 'failed'
export const ANALYSIS_STATUSES: AnalysisStatus[] = ['pending', 'scraping', 'analyzing', 'complete', 'failed']

export type WarningType = 'low_margin' | 'high_weight_cost' | 'high_competition' | 'oversized_fee'
export const WARNING_TYPES: WarningType[] = ['low_margin', 'high_weight_cost', 'high_competition', 'oversized_fee']

// These match DB enum values (Enums in database.types.ts)
export type CompetitionLevel = 'low' | 'medium' | 'high' | 'very_high'
export const COMPETITION_LEVELS: CompetitionLevel[] = ['low', 'medium', 'high', 'very_high']

export type PlanType = 'free' | 'starter' | 'pro' | 'agency'
export const PLAN_TYPES: PlanType[] = ['free', 'starter', 'pro', 'agency']

export type SearchType = 'keyword' | 'asin' | 'category' | 'brand' | 'supplier'
export const SEARCH_TYPES: SearchType[] = ['keyword', 'asin', 'category', 'brand', 'supplier']

export type ShippingMethod = 'air' | 'sea' | 'express' | 'lcl'
export const SHIPPING_METHODS: ShippingMethod[] = ['air', 'sea', 'express', 'lcl']

export type WarningSeverity = 'info' | 'warning' | 'critical'
export const WARNING_SEVERITIES: WarningSeverity[] = ['info', 'warning', 'critical']