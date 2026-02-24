import type { CompetitionLevel, PlanType, SearchType, ShippingMethod, AnalysisStatus, WarningSeverity } from '@repo/types'

export const competitionLevelLabels: Record<CompetitionLevel, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    very_high: 'Very High',
}

export const planTypeLabels: Record<PlanType, string> = {
    free: 'Free',
    starter: 'Starter',
    pro: 'Pro',
    agency: 'Agency',
}

export const searchTypeLabels: Record<SearchType, string> = {
    keyword: 'Keyword',
    asin: 'ASIN',
    category: 'Category',
    brand: 'Brand',
    supplier: 'Supplier',
}

export const shippingMethodLabels: Record<ShippingMethod, string> = {
    air: 'Air',
    sea: 'Sea Freight',
    express: 'Express',
    lcl: 'LCL',
}

export const analysisStatusLabels: Record<AnalysisStatus, string> = {
    pending: 'Pending',
    scraping: 'Scraping Reviews',
    analyzing: 'Analyzing',
    complete: 'Complete',
    failed: 'Failed',
}

export const warningSeverityLabels: Record<WarningSeverity, string> = {
    info: 'Info',
    warning: 'Warning',
    critical: 'Critical',
}
