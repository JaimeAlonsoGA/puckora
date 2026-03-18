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

const VIEWS = [
    {
        schemaExport: 'productFinancialsView',
        importAlias: 'flyProductFinancialsView',
        typeName: 'ProductFinancial',
        numericOverrides: [
            'total_amazon_fees',
            'amazon_fee_pct',
            'net_per_unit',
            'monthly_revenue',
            'monthly_net',
            'daily_velocity',
            'review_rate_per_month',
        ],
    },
] as const

function toConstKey(value: string): string {
    return value.toUpperCase().replace(/-/g, '_')
}

function generateCatalogTypes(): void {
    const importLines = [
        ...ENUMS.map((item) => `    ${item.schemaExport} as ${item.importAlias},`),
        ...TABLES.map((item) => `    ${item.schemaExport} as ${item.importAlias},`),
        ...VIEWS.map((item) => `    ${item.schemaExport} as ${item.importAlias},`),
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

    lines.push('// Views')

    VIEWS.forEach((item) => {
        if (item.numericOverrides.length === 0) {
            lines.push(`export type ${item.typeName} = typeof ${item.importAlias}.$inferSelect`)
            return
        }

        const baseTypeName = `${item.typeName}Base`
        lines.push(`type ${baseTypeName} = typeof ${item.importAlias}.$inferSelect`)
        lines.push(`export type ${item.typeName} = Omit<${baseTypeName}, ${item.numericOverrides.map((field) => `'${field}'`).join(' | ')}> & {`)
        item.numericOverrides.forEach((field) => {
            lines.push(`    ${field}: number | null`)
        })
        lines.push(`}`)
    })

    lines.push('', 'export const EnumNames = {')

    ENUMS.forEach((item) => {
        lines.push(`    ${item.enumNamesKey}: '${item.enumNamesValue}',`)
    })

    lines.push(`} as const`, '')

    writeFileSync(OUTPUT_FILE_PATH, lines.join('\n'), 'utf8')
    console.log(`✅ Generated catalog.types.ts with ${TABLES.length} table(s), ${VIEWS.length} view(s), and ${ENUMS.length} enum(s)`) 
}

generateCatalogTypes()