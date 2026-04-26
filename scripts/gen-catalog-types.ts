import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const OUTPUT_FILE_PATH = resolve('packages/types/src/catalog.types.ts')

const ENUMS = [
    {
        schemaExport: 'categoryScrapeStatusEnum',
        importAlias: 'flyCategoryScrapeStatusEnum',
        typeName: 'CategoryScrapeStatus',
        constName: 'CategoryScrapeStatusEnum',
        enumNamesKey: 'CATEGORYSCRAPESTATUS',
        enumNamesValue: 'categoryScrapeStatus',
        values: ['pending', 'scraped', 'failed'],
    },
    {
        schemaExport: 'productScrapeStatusEnum',
        importAlias: 'flyProductScrapeStatusEnum',
        typeName: 'ProductScrapeStatus',
        constName: 'ProductScrapeStatusEnum',
        enumNamesKey: 'PRODUCTSCRAPESTATUS',
        enumNamesValue: 'productScrapeStatus',
        values: ['scraped', 'enriched', 'enrichment_failed'],
    },
    {
        schemaExport: 'gsCategoryScrapeStatusEnum',
        importAlias: 'flyGsCategoryScrapeStatusEnum',
        typeName: 'GsCategoryScrapeStatus',
        constName: 'GsCategoryScrapeStatusEnum',
        enumNamesKey: 'GSCATEGORYSCRAPESTATUS',
        enumNamesValue: 'gsCategoryScrapeStatus',
        values: ['pending', 'scraped', 'failed'],
    },
    {
        schemaExport: 'gsScrapeStatusEnum',
        importAlias: 'flyGsScrapeStatusEnum',
        typeName: 'GsScrapeStatus',
        constName: 'GsScrapeStatusEnum',
        enumNamesKey: 'GSSCRAPESTATUS',
        enumNamesValue: 'gsScrapeStatus',
        values: ['scraped', 'failed'],
    },
] as const

const TABLES = [
    { schemaExport: 'amazonCategories', importAlias: 'flyAmazonCategories', typeName: 'AmazonCategory' },
    { schemaExport: 'amazonKeywordProducts', importAlias: 'flyAmazonKeywordProducts', typeName: 'AmazonKeywordProduct' },
    { schemaExport: 'amazonKeywords', importAlias: 'flyAmazonKeywords', typeName: 'AmazonKeyword' },
    { schemaExport: 'amazonProducts', importAlias: 'flyAmazonProducts', typeName: 'AmazonProduct' },
    { schemaExport: 'gsCategories', importAlias: 'flyGsCategories', typeName: 'GsCategory' },
    { schemaExport: 'gsProducts', importAlias: 'flyGsProducts', typeName: 'GsProduct' },
    { schemaExport: 'gsSuppliers', importAlias: 'flyGsSuppliers', typeName: 'GsSupplier' },
    { schemaExport: 'productCategoryRanks', importAlias: 'flyProductCategoryRanks', typeName: 'ProductCategoryRank' },
] as const

// ProductFinancial interface is handwritten (no longer view-derived).
// Update this block manually when the financial shape changes.
const PRODUCT_FINANCIAL_INTERFACE = `// ProductFinancial \u2014 application-computed shape (bought_past_month primary, BSR fallback)
export interface ProductFinancial {
    // Identity
    asin: string | null
    category_id: string | null
    rank: number | null
    rank_type: string | null
    category_depth: number | null
    category_path: string | null
    observed_at: string | null
    // Product snapshot
    title: string | null
    brand: string | null
    product_type: string | null
    main_image_url: string | null
    price: number | null
    rating: number | null
    review_count: number | null
    // Fees
    fba_fee: number | null
    referral_fee: number | null
    total_amazon_fees: number | null
    amazon_fee_pct: number | null
    net_per_unit: number | null
    // Unit estimates
    monthly_units_bsr: number | null
    monthly_units_review: number | null
    monthly_units: number | null
    // Demand signals
    bought_past_month: number | null
    // Revenue
    monthly_revenue: number | null
    monthly_net: number | null
    daily_velocity: number | null
    // Blend weights (null \u2014 blending removed)
    w_bsr: number | null
    w_review: number | null
    // Confidence
    confidence: string | null
    // Data quality
    product_type_mismatch: boolean | null
    // Meta
    product_age_months: number | null
    listing_date: string | null
    review_rate_per_month: number | null
    // Dimensions
    pkg_weight_kg: number | null
    pkg_length_cm: number | null
    pkg_width_cm: number | null
    pkg_height_cm: number | null
}` as const

function toConstKey(value: string): string {
    return value.toUpperCase().replace(/-/g, '_')
}

function generateCatalogTypes(): void {
    const importLines = [
        ...ENUMS.map((item) => `    ${item.schemaExport} as ${item.importAlias},`),
        ...TABLES.map((item) => `    ${item.schemaExport} as ${item.importAlias},`),
    ]

    const lines: string[] = [
        `// GENERATED — Do not hand-edit. Run \`npm run gen:types\` to regenerate.`,
        `// Fly.io catalog and view types derived from the Drizzle schema in @puckora/db.`,
        '',
        `import type {`,
        ...importLines,
        `} from '@puckora/db'`,
        '',
        '// Enum types',
    ]

    ENUMS.forEach((item) => {
        lines.push(`export type ${item.typeName} = typeof ${item.importAlias}.enumValues[number]`)
    })

    lines.push('', '// Enum const objects')

    ENUMS.forEach((item) => {
        lines.push(`export const ${item.constName} = {`)
        item.values.forEach((value) => {
            lines.push(`    ${toConstKey(value)}: '${value}',`)
        })
        lines.push(`} as const`, '')
    })

    lines.push('// Tables')

    TABLES.forEach((item) => {
        lines.push(`export type ${item.typeName} = typeof ${item.importAlias}.$inferSelect`)
        lines.push(`export type ${item.typeName}Insert = typeof ${item.importAlias}.$inferInsert`)
        lines.push(`export type ${item.typeName}Update = Partial<${item.typeName}Insert>`, '')
    })

    lines.push('// ProductFinancial')
    lines.push(PRODUCT_FINANCIAL_INTERFACE)

    lines.push('', 'export const EnumNames = {')

    ENUMS.forEach((item) => {
        lines.push(`    ${item.enumNamesKey}: '${item.enumNamesValue}',`)
    })

    lines.push(`} as const`, '')

    writeFileSync(OUTPUT_FILE_PATH, lines.join('\n'), 'utf8')
    console.log(`✅ Generated catalog.types.ts with ${TABLES.length} table(s) and ${ENUMS.length} enum(s)`)
}

generateCatalogTypes()