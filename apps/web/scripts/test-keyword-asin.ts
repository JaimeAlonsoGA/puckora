/**
 * Quick smoke test for keyword + ASIN financial services.
 * Usage: tsx --tsconfig tsconfig.json scripts/test-keyword-asin.ts [keyword] [marketplace]
 */
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

if (process.env['DATABASE_PROXY_URL']) {
    process.env['DATABASE_URL'] = process.env['DATABASE_PROXY_URL']
}

import { createDb } from '@puckora/db'
import { getKeyword, getProductsForKeyword } from '@/services/keywords'
import { getProductByAsin } from '@/services/amazon-product'

const KEYWORD = process.argv[2] ?? 'yoga mat'
const MARKETPLACE = process.argv[3] ?? 'US'

async function run() {
    const db = createDb(process.env['DATABASE_URL'] as string)

    const keywordRow = await getKeyword(db, KEYWORD, MARKETPLACE)
    if (!keywordRow) {
        console.log(`keyword row: missing for ${KEYWORD} (${MARKETPLACE})`)
        process.exit(0)
    }

    console.log(`keyword row: ${keywordRow.id}`)

    const products = await getProductsForKeyword(db, keywordRow.id)
    console.log(`keyword products: ${products.length}`)

    const first = products[0] ?? null
    console.log('first keyword product:', first ? {
        asin: first.asin,
        rank: first.rank,
        monthly_revenue: first.monthly_revenue,
        confidence: first.confidence,
    } : null)

    if (!first?.asin) {
        process.exit(0)
    }

    const product = await getProductByAsin(db, first.asin)
    console.log('asin product:', product ? {
        asin: product.asin,
        rank: product.rank,
        monthly_revenue: product.monthly_revenue,
        confidence: product.confidence,
        category_path: product.category_path,
    } : null)
}

run().catch((error) => {
    console.error(error)
    process.exit(1)
})