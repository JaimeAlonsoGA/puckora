/**
 * POST /api/scrape/enrich
 *
 * Endpoint called by browser overlays or external agents after they finish
 * scraping a page.
 *
 * Request:
 *   Authorization: Bearer <supabase_access_token>
 *   Content-Type: application/json
 *   Body: ScrapeResult (validated against ScrapeResultSchema)
 *
 * Response 200: { ok: true }
 * Response 400: { error: string }
 * Response 401: { error: 'Unauthorized' }
 * Response 500: { error: string }
 *
 * What this route does:
 *   1. Validates the JWT from the Authorization header (no cookie needed).
 *   2. Parses and validates the request body with ScrapeResultSchema.
 *   3. Upserts each ScrapedListing into amazon_products (raw scrape data).
 *   4. Marks the scrape_job as done (or failed when blocked=true).
 *   5. Fires SP-API enrichment in the background via after() for fresh ASINs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/integrations/supabase/admin'
import { ScrapeResultSchema } from '@puckora/scraper-core'
import { SCRAPE_JOB_STATUS, SCRAPE_PRODUCT_STATUS } from '@puckora/scraper-core'
import { API_ERROR_MESSAGES, API_STATUS } from '@/constants/api'
import { upsertAmazonProduct } from '@/services/products'
import { updateScrapeJob } from '@/services/scrape'
import { getKeywordForJob, upsertKeywordProduct } from '@/services/keywords'
import { createFlyioDb } from '@/integrations/flyio/client'
import type { AmazonProductInsert, Database, Json } from '@puckora/types'
import type { ScrapeResult, ScrapedListing } from '@puckora/scraper-core'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a Supabase client authenticated with the caller's access token.
 * This validates the JWT against the project and respects RLS.
 */
function createBearerClient(accessToken: string) {
    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            global: {
                headers: { Authorization: `Bearer ${accessToken}` },
            },
            auth: { persistSession: false },
        },
    )
}

function toScrapedListingJson(listing: ScrapedListing): Json {
    return {
        asin: listing.asin,
        rank: listing.rank,
        name: listing.name,
        price: listing.price,
        rating: listing.rating,
        review_count: listing.review_count,
        product_url: listing.product_url,
    }
}

function toScrapeResultJson(result: ScrapeResult): Json {
    return {
        job_id: result.job_id,
        executor: result.executor,
        listings: result.listings.map(toScrapedListingJson),
        blocked: result.blocked,
        page_count: result.page_count,
        scraped_at: result.scraped_at,
    }
}

/**
 * Map a ScrapedListing (scraper-core shape) to an AmazonProductInsert (DB shape).
 * Null values are preserved — existing enriched fields are NOT overwritten
 * because upsertAmazonProduct uses onConflict: 'asin' and the DB schema
 * keeps richer columns intact via coalesce in application logic.
 */
function normaliseListing(listing: ScrapedListing): AmazonProductInsert {
    return {
        asin: listing.asin,
        title: listing.name ?? null,
        // price from scraper arrives as a formatted string ('$24.99') or null
        price: typeof listing.price === 'number'
            ? listing.price
            : parseFloat(String(listing.price ?? '').replace(/[^0-9.]/g, '')) || null,
        rating: listing.rating ?? null,
        review_count: listing.review_count ?? null,
        product_url: listing.product_url ?? null,
        // Mark as 'scraped' — SP-API enrichment upgrades this to 'enriched'
        scrape_status: SCRAPE_PRODUCT_STATUS.SCRAPED,
        updated_at: new Date().toISOString(),
    }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
    // 1. Extract Bearer token ------------------------------------------------
    const authHeader = req.headers.get('Authorization') ?? ''
    const accessToken = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : null

    if (!accessToken) {
        return NextResponse.json({ error: API_ERROR_MESSAGES.UNAUTHORIZED }, { status: API_STATUS.UNAUTHORIZED })
    }

    // 2. Validate JWT — confirms the token belongs to a real user ------------
    const userClient = createBearerClient(accessToken)
    const {
        data: { user },
        error: authError,
    } = await userClient.auth.getUser()

    if (authError || !user) {
        return NextResponse.json({ error: API_ERROR_MESSAGES.UNAUTHORIZED }, { status: API_STATUS.UNAUTHORIZED })
    }

    // 3. Parse + validate body -----------------------------------------------
    let body: unknown
    try {
        body = await req.json()
    } catch {
        return NextResponse.json({ error: API_ERROR_MESSAGES.INVALID_JSON_BODY }, { status: API_STATUS.BAD_REQUEST })
    }

    const parsed = ScrapeResultSchema.safeParse(body)
    if (!parsed.success) {
        return NextResponse.json(
            { error: API_ERROR_MESSAGES.VALIDATION_FAILED, details: parsed.error.flatten() },
            { status: API_STATUS.BAD_REQUEST },
        )
    }

    const result = parsed.data
    const adminClient = createAdminClient()
    const db = createFlyioDb()

    // 4. Upsert each listing into amazon_products ----------------------------
    // All writes are independent (each ASIN is its own row) — run concurrently.
    const upsertSettled = await Promise.allSettled(
        result.listings.map((listing) => upsertAmazonProduct(db, normaliseListing(listing))),
    )
    const upsertErrors = upsertSettled
        .map((r, i) =>
            r.status === 'rejected'
                ? `${result.listings[i].asin}: ${r.reason instanceof Error ? r.reason.message : API_ERROR_MESSAGES.UPSERT_FAILED}`
                : null,
        )
        .filter((e): e is string => e !== null)

    // 5. Link listings to keyword context -------------------------------------
    // Must happen BEFORE marking the job done so that when the Realtime UPDATE
    // fires on the client the keyword–product associations already exist.
    if (!result.blocked && result.listings.length > 0) {
        try {
            const keywordRow = await getKeywordForJob(db, adminClient, result.job_id)
            if (keywordRow) {
                const linkSettled = await Promise.allSettled(
                    result.listings.map((listing) =>
                        upsertKeywordProduct(db, { keyword_id: keywordRow.id, asin: listing.asin }),
                    ),
                )
                linkSettled.forEach((r, i) => {
                    if (r.status === 'rejected') {
                        console.error(
                            `[scrape/enrich] upsertKeywordProduct failed for ${result.listings[i].asin}:`,
                            r.reason,
                        )
                    }
                })
            }
        } catch (err) {
            console.error('[scrape/enrich] getKeywordByScrapeJob failed:', err)
        }
    }

    // 6. Mark the job done (or failed if blocked) ----------------------------
    // Fires the Supabase Realtime UPDATE that triggers the client to refetch
    // products — keyword links are already in place from the step above.
    try {
        const now = new Date().toISOString()
        await updateScrapeJob(adminClient, result.job_id, {
            status: result.blocked ? SCRAPE_JOB_STATUS.FAILED : SCRAPE_JOB_STATUS.DONE,
            error: result.blocked
                ? API_ERROR_MESSAGES.SCRAPER_BLOCKED
                : upsertErrors.length > 0
                    ? `${upsertErrors.length} upsert error(s): ${upsertErrors.slice(0, 3).join('; ')}`
                    : null,
            result: toScrapeResultJson(result),
            executor: result.executor,
            completed_at: now,
        })
    } catch (err) {
        // Log but don't fail the response — listings were already saved
        console.error('[scrape/enrich] updateScrapeJob failed:', err)
    }

    // 7. Background SP-API enrichment ----------------------------------------
    // Fire-and-forget: enrich fresh ASINs without blocking the response.
    // When enrichment finishes, update the job result with `enriched_at` so
    // the client Realtime subscription fires one final product refetch and can
    // stop polling.
    if (!result.blocked && result.listings.length > 0) {
        const listings = result.listings
        const jobId = result.job_id
        const baseResult = toScrapeResultJson(result)
        after(async () => {
            // SP-API enrichment — adds fees, weights, and financials to each ASIN.
            try {
                const { enrichAsinBatch } = await import('@/integrations/data-pipeline/enrich')
                await enrichAsinBatch(db, listings)
            } catch (err) {
                console.error('[scrape/enrich] SP-API enrichment failed:', err)
            }

            // Always write enriched_at so the client can stop polling, regardless
            // of whether SP-API enrichment or vector sync succeeded.
            try {
                await updateScrapeJob(adminClient, jobId, {
                    result: { ...(baseResult as object), enriched_at: new Date().toISOString() },
                })
            } catch (err) {
                console.error('[scrape/enrich] Failed to set enriched_at on job:', err)
            }

            // Vector index update is best-effort — must not block the enriched_at signal.
            try {
                const { syncAmazonProductVectorsDownstream } = await import('@/integrations/data-pipeline/vector-sync')
                await syncAmazonProductVectorsDownstream()
            } catch (err) {
                console.error('[scrape/enrich] Vector sync failed:', err)
            }
        })
    }

    return NextResponse.json({ ok: true })
}
