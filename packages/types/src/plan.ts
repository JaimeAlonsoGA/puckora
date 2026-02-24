import type { PlanType } from './definitions'

export interface PlanLimits {
    dailySearches: number
    savedProducts: number
    savedSuppliers: number
    costCalculations: number
    hasExtension: boolean
    hasBSRHistory: boolean
    hasSupplierBridge: boolean
    hasCategoryNavigator: boolean
    competitorAnalysesPerMonth: number
    maxReviewsPerAnalysis: number
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
    free: {
        dailySearches: 5,
        savedProducts: 10,
        savedSuppliers: 5,
        costCalculations: 3,
        hasExtension: false,
        hasBSRHistory: false,
        hasSupplierBridge: false,
        hasCategoryNavigator: true,
        competitorAnalysesPerMonth: 0,
        maxReviewsPerAnalysis: 0,
    },
    starter: {
        dailySearches: -1,
        savedProducts: 50,
        savedSuppliers: 20,
        costCalculations: -1,
        hasExtension: true,
        hasBSRHistory: false,
        hasSupplierBridge: false,
        hasCategoryNavigator: true,
        competitorAnalysesPerMonth: 5,
        maxReviewsPerAnalysis: 100,
    },
    pro: {
        dailySearches: -1,
        savedProducts: 500,
        savedSuppliers: 100,
        costCalculations: -1,
        hasExtension: true,
        hasBSRHistory: true,
        hasSupplierBridge: true,
        hasCategoryNavigator: true,
        competitorAnalysesPerMonth: 30,
        maxReviewsPerAnalysis: 500,
    },
    agency: {
        dailySearches: -1,
        savedProducts: -1,
        savedSuppliers: -1,
        costCalculations: -1,
        hasExtension: true,
        hasBSRHistory: true,
        hasSupplierBridge: true,
        hasCategoryNavigator: true,
        competitorAnalysesPerMonth: -1,
        maxReviewsPerAnalysis: 500,
    },
}
