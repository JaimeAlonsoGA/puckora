import { z } from 'zod'

const MarketplaceSchema = z.enum(['US', 'UK', 'DE', 'FR', 'IT', 'ES', 'CA', 'JP'])
const ShippingMethodSchema = z.enum(['air', 'sea', 'express'])

const ProductDimensionsSchema = z.object({
    lengthCm: z.number().positive(),
    widthCm: z.number().positive(),
    heightCm: z.number().positive(),
})

export const CostCalculatorInputSchema = z.object({
    asin: z.string().regex(/^[A-Z0-9]{10}$/).optional(),
    productTitle: z.string().max(500).optional(),
    weightKg: z.number().positive().max(30),
    dimensionsCm: ProductDimensionsSchema,
    category: z.string().min(1),
    marketplace: MarketplaceSchema.default('US'),
    supplierPriceUSD: z.number().positive(),
    moq: z.number().int().positive().default(1),
    shippingMethod: ShippingMethodSchema.default('sea'),
    shippingCostManualUSD: z.number().min(0).optional(),
    targetSellPrice: z.number().positive().optional(),
})

export type CostCalculatorInputData = z.infer<typeof CostCalculatorInputSchema>
