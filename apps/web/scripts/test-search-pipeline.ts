/**
 * Search pipeline integration test.
 *
 * Runs `runKeywordSearch` directly against real Fly.io + Supabase infrastructure,
 * concurrently polling the DB every 500 ms to measure:
 *   - Time-to-first-product (TTP)
 *   - Product count growth over time
 *   - Total wall-clock time
 *
 * Usage (from apps/web/):
 *   tsx --tsconfig tsconfig.json scripts/test-search-pipeline.ts [keyword]
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// DATABASE_PROXY_URL overrides DATABASE_URL when available (local fly proxy)
if (process.env['DATABASE_PROXY_URL']) {
    process.env['DATABASE_URL'] = process.env['DATABASE_PROXY_URL']
}

import { createClient } from '@supabase/supabase-js'
import { Pool } from 'pg'
import { createDb } from '@puckora/db'
import { createScrapeJob } from '@/services/scrape'
import { upsertKeyword } from '@/services/keywords'
import { runKeywordSearch } from '@/integrations/data-pipeline/keyword-search'
import { SCRAPE_JOB_TYPE, SCRAPE_JOB_STATUS, SCRAPE_EXECUTOR } from '@puckora/scraper-core'
import type { Database } from '@puckora/types'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TEST_USER_ID = '4035ea67-b265-46c5-a4a3-f5ffa72ba85f'
const KEYWORD = process.argv[2] ?? 'yoga mat'
const MARKETPLACE = 'US'
const POLL_INTERVAL_MS = 500

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(ms: number) {
    return `${(ms / 1000).toFixed(2)}s`
}

function pct(n: number, total: number): string {
    if (total === 0) return '0'
    return Math.round((n / total) * 100).toString()
}

// ---------------------------------------------------------------------------
// DB helpers — raw Pool with statement_timeout to avoid view hangs
// ---------------------------------------------------------------------------

let rawPool: Pool | null = null

function getRawPool(): Pool {
    if (!rawPool) {
        rawPool = new Pool({
            connectionString: process.env['DATABASE_URL']!,
            max: 3,
            connectionTimeoutMillis: 15000,
            // Prevent any single query from hanging indefinitely
            statement_timeout: 10000,
        })
    }
    return rawPool
}

/** Simple count — avoids any expensive derived-data JOIN during write load */
async function getPollCount(keywordId: string): Promise<number> {
    const res = await getRawPool().query(
        'SELECT count(*) FROM amazon_keyword_products WHERE keyword_id = $1',
        [keywordId],
    )
    return parseInt(res.rows[0].count as string, 10)
}

/** Quality stats — called once after the pipeline has finished (DB settled) */
async function getFinalStats(keywordId: string) {
    const res = await getRawPool().query<{
        total: string
        has_brand: string
        has_price: string
        has_rating: string
        has_image: string
        has_fba_fee: string
    }>(
        `SELECT
            count(*)                   AS total,
            count(ap.brand)            AS has_brand,
            count(ap.price)            AS has_price,
            count(ap.rating)           AS has_rating,
            count(ap.main_image_url)   AS has_image,
            count(ap.fba_fee)          AS has_fba_fee
         FROM amazon_keyword_products akp
         LEFT JOIN amazon_products ap ON ap.asin = akp.asin
         WHERE akp.keyword_id = $1`,
        [keywordId],
    )
    return res.rows[0]!
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    console.log(`\n${'━'.repeat(70)}`)
    console.log(`  SEARCH PIPELINE TEST — "${KEYWORD}" (${MARKETPLACE})`)
    console.log(`${'━'.repeat(70)}\n`)

    // Init clients
    const supabase = createClient<Database>(
        process.env['NEXT_PUBLIC_SUPABASE_URL']!,
        process.env['SUPABASE_SERVICE_ROLE_KEY']!,
        { auth: { autoRefreshToken: false, persistSession: false } },
    )
    const db = createDb(process.env['DATABASE_URL']!)

    // Create job + keyword
    console.log('▶ Creating scrape job in Supabase...')
    const job = await createScrapeJob(supabase, {
        user_id: TEST_USER_ID,
        type: SCRAPE_JOB_TYPE.AMAZON_SEARCH,
        status: SCRAPE_JOB_STATUS.PENDING,
        target_executor: SCRAPE_EXECUTOR.AGENT,
        payload: {
            type: SCRAPE_JOB_TYPE.AMAZON_SEARCH,
            keyword: KEYWORD,
            marketplace: MARKETPLACE,
            max_pages: 1,
        },
    })
    console.log(`  Job ID: ${job.id}`)

    console.log('▶ Upserting keyword in Fly.io DB...')
    const keywordRow = await upsertKeyword(db, { keyword: KEYWORD, marketplace: MARKETPLACE })
    console.log(`  Keyword ID: ${keywordRow.id}`)

    // Check prior state
    const priorCount = await getPollCount(keywordRow.id)
    if (priorCount > 0) {
        console.log(`  ⚠ ${priorCount} existing products — left intact to test stale-delete`)
    }

    const t0 = Date.now()
    const timeline: Array<{ elapsedMs: number; count: number }> = []
    let firstProductMs: number | null = null
    let prevCount = -1
    let pollActive = true
    let pollCount = 0

    // Background poll loop
    const pollPromise = (async () => {
        while (pollActive) {
            await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
            pollCount++
            const elapsed = Date.now() - t0
            try {
                const count = await getPollCount(keywordRow.id)
                if (firstProductMs === null && count > 0) {
                    firstProductMs = elapsed
                    console.log(`\n  ✅ FIRST PRODUCT at +${fmt(elapsed)} (${count} products)\n`)
                }
                if (count !== prevCount) {
                    timeline.push({ elapsedMs: elapsed, count })
                    console.log(`  [poll#${String(pollCount).padStart(3)}] +${fmt(elapsed).padStart(7)} │ ${count} products`)
                    prevCount = count
                }
            } catch {
                // transient errors are non-fatal during write load
            }
        }
    })()

    // Run pipeline
    console.log(`\n▶ Running pipeline...\n`)
    const pipelineStart = Date.now()

    try {
        await runKeywordSearch(db, supabase, {
            jobId: job.id,
            keywordId: keywordRow.id,
            keyword: KEYWORD,
            marketplace: MARKETPLACE,
        })
        console.log(`\n▶ Pipeline returned in ${fmt(Date.now() - pipelineStart)}`)
    } catch (err) {
        console.error(`\n  ✖ Pipeline threw: ${(err as Error).message}`)
    } finally {
        await new Promise((r) => setTimeout(r, 1500))
        pollActive = false
        await pollPromise
    }

    // Final report — simple query (no view) avoids hanging on write-loaded DB
    console.log(`\n${'━'.repeat(70)}`)
    console.log('  FINAL RESULTS')
    console.log(`${'━'.repeat(70)}\n`)

    let stats: Awaited<ReturnType<typeof getFinalStats>> | null = null
    try {
        stats = await getFinalStats(keywordRow.id)
    } catch (err) {
        console.error(`  ⚠ Quality query failed: ${(err as Error).message}`)
    }

    const total = stats ? parseInt(stats.total, 10) : prevCount

    console.log(`  Keyword:               "${KEYWORD}" (${MARKETPLACE})`)
    console.log(`  Total wall-clock:       ${fmt(Date.now() - t0)}`)
    console.log(`  Time-to-first-product:  ${firstProductMs !== null ? fmt(firstProductMs) : 'never'}`)
    console.log(`  Final product count:    ${total}`)

    if (stats) {
        console.log(`\n  Product quality (${total} total):`)
        console.log(`    brand:    ${stats.has_brand.padStart(3)}  (${pct(parseInt(stats.has_brand), total)}%)`)
        console.log(`    price:    ${stats.has_price.padStart(3)}  (${pct(parseInt(stats.has_price), total)}%)`)
        console.log(`    rating:   ${stats.has_rating.padStart(3)}  (${pct(parseInt(stats.has_rating), total)}%)`)
        console.log(`    image:    ${stats.has_image.padStart(3)}  (${pct(parseInt(stats.has_image), total)}%)`)
        console.log(`    fba_fee:  ${stats.has_fba_fee.padStart(3)}  (${pct(parseInt(stats.has_fba_fee), total)}%)`)
    }

    console.log(`\n  Timeline (${timeline.length} count-change events in ${pollCount} polls):`)
    for (const { elapsedMs, count } of timeline) {
        console.log(`    +${fmt(elapsedMs)} — ${count} products`)
    }

    console.log(`\n${'━'.repeat(70)}\n`)

    // Clean shutdown — close pool before exit to avoid hanging
    if (rawPool) await rawPool.end()
    process.exit(0)
}

main().catch((err) => {
    console.error('Test failed:', err)
    process.exit(1)
})
