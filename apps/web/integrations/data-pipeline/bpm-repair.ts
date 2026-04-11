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
import { KEYWORD_SEARCH_FETCH_HEADERS } from './keyword-search/contracts'
import { buildAmazonProductUrl } from '@/constants/amazon-marketplace'

const BPM_REPAIR_CONCURRENCY = 5
const BPM_REPAIR_BATCH_DELAY_MS = 300

async function fetchBpmFromProductPage(
    asin: string,
    marketplace = 'US',
): Promise<number | null> {
    try {
        const url = buildAmazonProductUrl(marketplace, asin)
        const res = await fetch(url, {
            headers: KEYWORD_SEARCH_FETCH_HEADERS,
            cache: 'no-store',
        })
        if (res.status === 429) {
            // Amazon rate-limited this product page fetch. Skip for now; the
            // repair can be re-run later when the rate window resets.
            console.warn(`[bpm-repair] ${asin}: rate limited (429) — skipping`)
            return null
        }
        if (!res.ok) {
            console.warn(`[bpm-repair] ${asin}: HTTP ${res.status} — skipping`)
            return null
        }
        const html = await res.text()
        return parseBoughtPastMonth(html)
    } catch {
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

    for (let i = 0; i < asins.length; i += BPM_REPAIR_CONCURRENCY) {
        const batch = asins.slice(i, i + BPM_REPAIR_CONCURRENCY)

        await Promise.allSettled(
            batch.map(async (asin) => {
                const bpm = await fetchBpmFromProductPage(asin, marketplace)
                if (bpm !== null && bpm > 0) {
                    await updateAmazonProduct(db, asin, { bought_past_month: bpm })
                    console.log(`[bpm-repair] ${asin}: ${bpm}/mo`)
                }
            }),
        )

        if (i + BPM_REPAIR_CONCURRENCY < asins.length) {
            await new Promise<void>((r) => setTimeout(r, BPM_REPAIR_BATCH_DELAY_MS))
        }
    }
}
