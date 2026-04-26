/**
 * BPM repair: fetch individual Amazon product pages to recover
 * `bought_past_month` values that weren't visible on the search results page.
 *
 * Amazon only shows the "bought in past month" badge on search pages for the
 * most popular products. For the rest, the badge is still present on the
 * individual product page (/dp/ASIN). This module fetches those pages in
 * small concurrent batches and writes the value back to the DB.
 *
 * Intended to run after the main keyword-search pipeline has marked the job
 * DONE, so it never blocks the user-facing result.
 */
import 'server-only'

import { parseBoughtPastMonth } from '@puckora/scraper-core'
import { updateAmazonProduct } from '@/services/products'
import type { PgDb } from '@puckora/db'
import { fetchAmazonPage, AmazonFetchError } from './amazon-fetch'
import { buildAmazonProductUrl } from '@/constants/amazon-marketplace'

const BPM_REPAIR_CONCURRENCY = 5
const BPM_REPAIR_BATCH_DELAY_MS = 300

async function fetchBpmFromProductPage(
    asin: string,
    marketplace = 'US',
): Promise<number | null> {
    try {
        const url = buildAmazonProductUrl(marketplace, asin)
        const html = await fetchAmazonPage(url)
        // parseBoughtPastMonth returns null when the badge isn't in the HTML.
        // null could mean "badge truly absent" OR "bot-filtered page with no badge text".
        // We cannot tell these apart with a plain fetch(), so we never write 0 to DB.
        // Writing 0 would corrupt the revenue signal with a false "no demand" reading.
        // Return null → caller skips the DB write → ASIN is available for retry later.
        return parseBoughtPastMonth(html)
    } catch (err) {
        if (err instanceof AmazonFetchError && err.isRateLimit) {
            console.warn(`[bpm-repair] ${asin}: rate-limited or bot-filtered (${err.status}) — will retry on next run`)
        } else {
            console.warn(`[bpm-repair] ${asin}: fetch error — ${err instanceof Error ? err.message : String(err)}`)
        }
        return null
    }
}

/**
 * For each ASIN in the list, fetch the Amazon product page and attempt to
 * parse + persist `bought_past_month`. Skips ASINs where parsing returns null
 * (product doesn't have the badge). Uses bounded concurrency to avoid
 * overwhelming Amazon or the Fly.io PG pool.
 */
export async function repairBpmBatch(
    db: PgDb,
    asins: string[],
    marketplace = 'US',
): Promise<void> {
    if (asins.length === 0) return
    console.log(`[bpm-repair] starting: ${asins.length} ASINs`)

    for (let i = 0; i < asins.length; i += BPM_REPAIR_CONCURRENCY) {
        const batch = asins.slice(i, i + BPM_REPAIR_CONCURRENCY)

        await Promise.allSettled(
            batch.map(async (asin) => {
                const bpm = await fetchBpmFromProductPage(asin, marketplace)
                if (bpm == null || bpm <= 0) {
                    // null  → fetch failed (rate-limit, bot-filtered HTML, network error)
                    //         leave DB untouched so the ASIN is retried on a future pass.
                    // 0/neg → parseBoughtPastMonth returned a nonsense value; ignore it.
                    // NEVER write 0 or null — it corrupts the revenue signal.
                    console.log(`[bpm-repair] ${asin}: no badge found in page (not writing)`)
                    return
                }
                await updateAmazonProduct(db, asin, { bought_past_month: bpm })
                console.log(`[bpm-repair] ${asin}: ✓ ${bpm}/mo`)
            }),
        )

        if (i + BPM_REPAIR_CONCURRENCY < asins.length) {
            await new Promise<void>((r) => setTimeout(r, BPM_REPAIR_BATCH_DELAY_MS))
        }
    }
    console.log(`[bpm-repair] done: ${asins.length} ASINs processed`)
}
