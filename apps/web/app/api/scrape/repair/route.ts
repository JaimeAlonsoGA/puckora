/**
 * GET /api/scrape/repair
 *
 * Background repair job for data quality gaps in keyword search results.
 *
 * Repairs two problems for ALL existing keyword-linked products:
 *
 *  1. enrichment_failed products with no category ranks (positions 21-60)
 *     → runs full per-ASIN SP-API enrichment to get brand, listing_date,
 *       dimensions, category ranks, and FBA fees.
 *
 *  2. Products with null bought_past_month
 *     → fetches individual Amazon product pages and parses the badge.
 *
 * Both repairs run as background tasks via after() to avoid Vercel timeout.
 * The response returns immediately with counts of what will be repaired.
 *
 * Auth: REPAIR_API_SECRET header must match REPAIR_API_SECRET env var.
 * This keeps the endpoint safe while allowing cron calls without Supabase tokens.
 */

import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { API_ERROR_MESSAGES, API_STATUS } from '@/constants/api'
import { createFlyioDb } from '@/integrations/flyio/client'
import {
    getKeywordProductsNeedingEnrichmentRepair,
    getKeywordProductsNeedingBpmRepair,
} from '@/services/products'

/**
 * Timing-safe secret comparison. Returns false for any length mismatch to
 * avoid leaking length information via a fast short-circuit.
 */
function isAuthorized(req: NextRequest): boolean {
    const secret = process.env.REPAIR_API_SECRET
    if (!secret) return false
    const provided = req.headers.get('x-repair-secret') ?? req.nextUrl.searchParams.get('secret')
    if (!provided) return false
    try {
        const a = Buffer.from(provided)
        const b = Buffer.from(secret)
        // timingSafeEqual requires identical lengths — pad to max so both buffers
        // are the same size, then gate the result on an explicit length check.
        const len = Math.max(a.length, b.length)
        const aPadded = Buffer.concat([a, Buffer.alloc(len - a.length)])
        const bPadded = Buffer.concat([b, Buffer.alloc(len - b.length)])
        return timingSafeEqual(aPadded, bPadded) && a.length === b.length
    } catch {
        return false
    }
}

/**
 * Simple in-process concurrency lock: prevents two simultaneous repair runs
 * from firing the same SP-API calls and exhausting rate limits.
 * Note: in a multi-instance deployment each instance has its own flag.
 * For the current single-instance Fly.io setup this is perfectly sufficient.
 */
let repairRunning = false

export async function GET(req: NextRequest): Promise<NextResponse> {
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: API_ERROR_MESSAGES.UNAUTHORIZED }, { status: API_STATUS.UNAUTHORIZED })
    }

    if (repairRunning) {
        return NextResponse.json(
            { error: API_ERROR_MESSAGES.REPAIR_ALREADY_RUNNING },
            { status: API_STATUS.CONFLICT },
        )
    }

    const db = createFlyioDb()

    const [enrichRepairProducts, bpmRepairProducts] = await Promise.all([
        getKeywordProductsNeedingEnrichmentRepair(db, 200),
        getKeywordProductsNeedingBpmRepair(db, 500),
    ])

    const response = {
        queued: {
            enrichment_repair: enrichRepairProducts.length,
            bpm_repair: bpmRepairProducts.length,
        },
        message: 'Repair jobs queued in background',
    }

    const hasWork = enrichRepairProducts.length > 0 || bpmRepairProducts.length > 0

    if (hasWork) {
        // Mark running BEFORE scheduling the after() callback to close the window
        // where a second request could read repairRunning = false.
        repairRunning = true

        after(async () => {
            try {
            // ── 1. SP-API enrichment for enrichment_failed products ─────────────
            // Sequential to respect rate limits inside getCatalogItemParsed.
            if (enrichRepairProducts.length > 0) {
                console.log(`[repair] Starting SP-API enrichment for ${enrichRepairProducts.length} enrichment_failed products`)
                try {
                    const { repairKeywordProductBatch } = await import(
                        '@/integrations/data-pipeline/enrich'
                    )
                    await repairKeywordProductBatch(db, enrichRepairProducts)
                    console.log(`[repair] SP-API enrichment done: ${enrichRepairProducts.length} products`)
                } catch (err) {
                    console.error('[repair] SP-API enrichment batch failed:', err)
                }
            }

            // ── 2. BPM repair via product page scraping ─────────────────────────
            // Concurrent in batches of 5, 300ms delay between batches.
            if (bpmRepairProducts.length > 0) {
                console.log(`[repair] Starting BPM repair for ${bpmRepairProducts.length} products`)
                try {
                    const { repairBpmBatch } = await import('@/integrations/data-pipeline/bpm-repair')
                    await repairBpmBatch(
                        db,
                        bpmRepairProducts.map((r) => r.asin),
                    )
                    console.log(`[repair] BPM repair done`)
                } catch (err) {
                    console.error('[repair] BPM scrape batch failed:', err)
                }
            }
            } finally {
                repairRunning = false
            }
        })
    }

    return NextResponse.json(response)
}
