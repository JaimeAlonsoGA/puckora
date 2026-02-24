import type { Marketplace, ShippingMethod, WarningType, WarningSeverity } from './definitions'
import type { ProductDimensions } from './amazon'

export interface CostCalculatorInput {
    asin?: string
    productTitle?: string
    weightKg: number
    dimensionsCm: ProductDimensions
    category: string
    marketplace: Marketplace
    supplierPriceUSD: number
    moq: number
    shippingMethod: ShippingMethod
    shippingCostManualUSD?: number
    targetSellPrice?: number
}

export interface CostBreakdown {
    input: CostCalculatorInput
    supplierCostPerUnit: number
    shippingCostPerUnit: number
    fbaFulfillmentFee: number
    fbaReferralFee: number
    fbaStorageFeeMonthly: number
    importDutyEstimate?: number
    totalLandedCostPerUnit: number
    breakEvenPrice: number
    recommendedSellPrice: number
    projectedMarginPct: number
    projectedROIPct: number
    projectedMonthlyProfit?: number
    warnings: CostWarning[]
}

export interface CostWarning {
    type: WarningType
    message: string
    severity: WarningSeverity
}

/**
 * In-progress cost calculation stored in ProductContext.
 * Partial — the user may not have filled all fields yet.
 */
export interface CostCalculationDraft {
    productTitle?: string
    asin?: string
    category?: string
    marketplace?: Marketplace
    weightKg?: number
    lengthCm?: number
    widthCm?: number
    heightCm?: number
    supplierPriceUSD?: number
    moq?: number
    packagingCostPerUnit?: number
    shippingMethod?: ShippingMethod
    shippingDestination?: 'us_east' | 'us_west' | 'eu'
    hsCode?: string
    dutyRatePct?: number
    brokerFeeUSD?: number
    adSpendPerUnit?: number
    targetSellPrice?: number
    /** Currently selected MOQ tier for results display */
    selectedTier?: 100 | 300 | 500 | 1000
}
