import type { ProductDimensions } from '@repo/types'

export interface FeeEstimateInput {
    weightKg: number
    dimensionsCm: ProductDimensions
    category?: string
    marketplace?: string
}

/**
 * Client-side FBA fee estimates (approximations only — use SP-API for accurate values).
 * Based on US marketplace standard fee schedule (2024).
 */
export function estimateFbaFulfillmentFee(input: FeeEstimateInput): number {
    const { weightKg, dimensionsCm } = input
    const { lengthCm, widthCm, heightCm } = dimensionsCm

    // Determine size tier (simplified)
    const weightLb = weightKg * 2.20462
    const longestSide = Math.max(lengthCm, widthCm, heightCm) / 2.54 // to inches
    const medianSide = [lengthCm, widthCm, heightCm].sort((a, b) => a - b)[1]! / 2.54
    const shortestSide = Math.min(lengthCm, widthCm, heightCm) / 2.54
    const girthInches = (medianSide + shortestSide) * 2

    const isSmallStandard =
        weightLb <= 1 && longestSide <= 15 && medianSide <= 12 && shortestSide <= 0.75

    const isLargeStandard =
        !isSmallStandard &&
        weightLb <= 20 &&
        longestSide <= 18 &&
        medianSide <= 14 &&
        shortestSide <= 8

    if (isSmallStandard) {
        if (weightLb <= 0.25) return 3.22
        if (weightLb <= 0.5) return 3.4
        if (weightLb <= 0.75) return 3.58
        return 3.77
    }

    if (isLargeStandard) {
        if (weightLb <= 0.25) return 3.86
        if (weightLb <= 0.5) return 4.08
        if (weightLb <= 0.75) return 4.24
        if (weightLb <= 1.0) return 4.75
        if (weightLb <= 1.5) return 5.4
        if (weightLb <= 2.0) return 5.69
        // Up to 20lb: $5.69 + $0.16 per half lb over 2lb
        return 5.69 + Math.ceil((weightLb - 2) / 0.5) * 0.16
    }

    // Oversized: rough estimate
    if (weightLb <= 70 && longestSide + girthInches <= 130) {
        return 9.39 + (weightLb - 2) * 0.38
    }

    return 75 + (weightLb - 90) * 0.79 // special oversized
}

/**
 * Estimate FBA referral fee percentage by category.
 */
export function estimateReferralFeeRate(category: string): number {
    const rates: Record<string, number> = {
        'Electronics': 0.08,
        'Clothing': 0.17,
        'Beauty': 0.08,
        'Health': 0.08,
        'Sports': 0.15,
        'Home': 0.15,
        'Kitchen': 0.15,
        'Toys': 0.15,
        'Books': 0.15,
        'default': 0.15,
    }
    return rates[category] ?? rates['default']!
}

/**
 * Estimate monthly FBA storage fee.
 * Standard size, Jan–Sep: $0.87/cubic foot, Oct–Dec: $2.40/cubic foot.
 */
export function estimateStorageFeeMonthly(dimensionsCm: ProductDimensions, isPeakSeason = false): number {
    const { lengthCm, widthCm, heightCm } = dimensionsCm
    const cubicFeet = (lengthCm * widthCm * heightCm) / 28316.8
    const ratePerCubicFoot = isPeakSeason ? 2.4 : 0.87
    return Math.max(0.01, cubicFeet * ratePerCubicFoot)
}

/**
 * Calculate full landed cost per unit.
 */
export function calculateLandedCost(params: {
    supplierPriceUSD: number
    moq: number
    shippingCostUSD: number
    fbaFulfillmentFee: number
    fbaReferralFeeRate: number
    fbaStorageFeeMonthly: number
    sellPrice: number
    importDutyRate?: number
}): {
    totalLandedCost: number
    fbaReferralFee: number
    projectedMarginPct: number
    projectedROIPct: number
} {
    const {
        supplierPriceUSD,
        shippingCostUSD,
        fbaFulfillmentFee,
        fbaReferralFeeRate,
        fbaStorageFeeMonthly,
        sellPrice,
        importDutyRate = 0,
    } = params

    const fbaReferralFee = sellPrice * fbaReferralFeeRate
    const importDuty = supplierPriceUSD * importDutyRate
    const totalLandedCost =
        supplierPriceUSD + shippingCostUSD + fbaFulfillmentFee + fbaReferralFee + fbaStorageFeeMonthly + importDuty

    const profit = sellPrice - totalLandedCost
    const projectedMarginPct = sellPrice > 0 ? (profit / sellPrice) * 100 : 0
    const projectedROIPct = supplierPriceUSD > 0 ? (profit / supplierPriceUSD) * 100 : 0

    return { totalLandedCost, fbaReferralFee, projectedMarginPct, projectedROIPct }
}
