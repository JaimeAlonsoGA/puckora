/**
 * Retroactive data repair for ALL existing keywords in Fly Postgres.
 *
 * Fixes two gaps identified in the 10-keyword audit:
 *
 * 1. bought_past_month  — 0% for most keywords (bpm-repair only fires for NEW searches).
 *    Fetches individual /dp/ASIN pages for all null-bpm products.
 *
 * 2. enrichment_failed / scraped — products missing brand, listing_date, category ranks.
 *    Calls per-ASIN getCatalogItemParsed for all enrichment_failed + scraped products.
 *
 * Run: DATABASE_PROXY_URL=... npx tsx apps/web/scripts/retroactive-repair.ts [--dry-run]
 *
 * Flags:
 *   --dry-run / --status  Print counts only, no API calls.
 *   --bpm-only            Only run bpm repair (skip SP-API enrichment).
 *   --enrich-only         Only run SP-API enrichment (skip bpm repair).
 *   --keyword [kw]        Scope repair to one keyword.
 */
import 'dotenv/config'
import { Pool } from 'pg'
import { repairBpmBatch } from '@/integrations/data-pipeline/bpm-repair'
import { enrichAsinBatch } from '@/integrations/data-pipeline/enrich'
import { createFlyioDb } from '@/integrations/flyio/client'

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run') || args.includes('--status')
const BPM_ONLY = args.includes('--bpm-only')
const ENRICH_ONLY = args.includes('--enrich-only')
const KEYWORD_FILTER = (() => {
    const idx = args.indexOf('--keyword')
    return idx !== -1 ? args[idx + 1] : null
})()

const MARKETPLACE = 'US'

// ---------------------------------------------------------------------------
// DB connection
// ---------------------------------------------------------------------------

function getPool(): Pool {
    const url = process.env.DATABASE_PROXY_URL
    if (!url) throw new Error('DATABASE_PROXY_URL is not set')
    return new Pool({ connectionString: url, max: 3, connectionTimeoutMillis: 10_000 })
}

// ---------------------------------------------------------------------------
// Audit helpers
// ---------------------------------------------------------------------------

async function fetchNullBpmAsins(pool: Pool, keyword: string | null): Promise<string[]> {
    const result = await pool.query<{ asin: string }>(
        `
        SELECT DISTINCT ap.asin
        FROM amazon_keyword_products akp
        JOIN amazon_keywords ak ON ak.id = akp.keyword_id
        JOIN amazon_products ap ON ap.asin = akp.asin
        WHERE ap.bought_past_month IS NULL
          AND ap.price IS NOT NULL
          ${keyword ? 'AND ak.keyword ILIKE $1' : ''}
        ORDER BY ap.asin
        `,
        keyword ? [keyword] : [],
    )
    return result.rows.map((r) => r.asin)
}

async function fetchEnrichmentFailedListings(
    pool: Pool,
    keyword: string | null,
): Promise<Array<{ asin: string; price: number | null; title: string | null; rating: number | null; review_count: number | null }>> {
    const result = await pool.query<{ asin: string; price: number | null; title: string | null; rating: number | null; review_count: number | null }>(
        `
        SELECT DISTINCT ap.asin, ap.price, ap.title, ap.rating, ap.review_count
        FROM amazon_keyword_products akp
        JOIN amazon_keywords ak ON ak.id = akp.keyword_id
        JOIN amazon_products ap ON ap.asin = akp.asin
        WHERE ap.scrape_status IN ('enrichment_failed', 'scraped')
          ${keyword ? 'AND ak.keyword ILIKE $1' : ''}
        ORDER BY ap.asin
        `,
        keyword ? [keyword] : [],
    )
    return result.rows
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    const pool = getPool()

    try {
        console.log('=== Retroactive Repair ===')
        if (DRY_RUN) console.log('[DRY RUN — no changes will be made]')
        if (KEYWORD_FILTER) console.log(`[Scoped to keyword: "${KEYWORD_FILTER}"]`)
        console.log()

        // ── BPM Repair ──────────────────────────────────────────────────────
        if (!ENRICH_ONLY) {
            const nullBpmAsins = await fetchNullBpmAsins(pool, KEYWORD_FILTER)
            console.log(`bpm-repair: ${nullBpmAsins.length} products with null bought_past_month`)

            if (!DRY_RUN && nullBpmAsins.length > 0) {
                console.log('  Fetching product pages (batches of 5, 300ms delay)...')
                const db = createFlyioDb()
                await repairBpmBatch(db, nullBpmAsins, MARKETPLACE)
                console.log('  ✓ bpm-repair complete')
            }
        }

        // ── SP-API Enrichment Repair ─────────────────────────────────────────
        if (!BPM_ONLY) {
            const failedListings = await fetchEnrichmentFailedListings(pool, KEYWORD_FILTER)
            console.log(
                `\nenrich-repair: ${failedListings.length} products with scrape_status=enrichment_failed`,
            )

            if (!DRY_RUN && failedListings.length > 0) {
                console.log(
                    '  Calling getCatalogItemParsed per-ASIN (sequential, rate-limit-safe)...',
                )
                const db = createFlyioDb()
                const listings = failedListings.map((p) => ({
                    asin: p.asin,
                    rank: null,
                    name: p.title ?? p.asin,
                    price: p.price,
                    rating: p.rating,
                    review_count: p.review_count,
                    product_url: `https://www.amazon.com/dp/${p.asin}`,
                    bought_past_month: null,
                }))
                const results = await enrichAsinBatch(db, listings, MARKETPLACE)
                const ok = results.filter((r) => r.status === 'enriched').length
                const err = results.filter((r) => r.status === 'error').length
                const notFound = results.filter((r) => r.status === 'not_found').length
                console.log(`  ✓ enrichment done — ok: ${ok}, not_found: ${notFound}, error: ${err}`)
            }
        }

        console.log('\n=== Done ===')
    } finally {
        await pool.end()
    }
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
