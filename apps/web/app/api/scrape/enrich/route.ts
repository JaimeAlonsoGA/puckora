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
import { ScrapeResultSchema } from '@puckora/scraper-core'
import { SCRAPE_JOB_STATUS, SCRAPE_PRODUCT_STATUS } from '@puckora/scraper-core'
import { API_ERROR_MESSAGES, API_STATUS } from '@/constants/api'
import { upsertAmazonProduct } from '@/services/products'
import { updateScrapeJob } from '@/services/scrape'
import { getKeywordForJob, upsertKeywordProduct } from '@/services/keywords'
import { createFlyioDb } from '@/integrations/flyio/client'
import type { AmazonProductInsert } from '@puckora/types'
import type { ScrapedListing } from '@puckora/scraper-core'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a Supabase client authenticated with the caller's access token.
 * This validates the JWT against the project and respects RLS.
 */
function createBearerClient(accessToken: string) {
    return createClient(
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

/**
 * Create an admin client that bypasses RLS.
 * Used only for the job update (the executor user_id is verified via the JWT).
 */
function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
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
    // Use the admin client so we don't hit RLS on amazon_products.
    const upsertErrors: string[] = []
    for (const listing of result.listings) {
        try {
            await upsertAmazonProduct(db, normaliseListing(listing))
        } catch (err) {
            upsertErrors.push(
                `${listing.asin}: ${err instanceof Error ? err.message : API_ERROR_MESSAGES.UPSERT_FAILED}`,
            )
        }
    }

    // 5. Mark the job done (or failed if blocked) ----------------------------
    try {
        const now = new Date().toISOString()
        await updateScrapeJob(adminClient, result.job_id, {
            status: result.blocked ? SCRAPE_JOB_STATUS.FAILED : SCRAPE_JOB_STATUS.DONE,
            error: result.blocked
                ? API_ERROR_MESSAGES.SCRAPER_BLOCKED
                : upsertErrors.length > 0
                    ? `${upsertErrors.length} upsert error(s): ${upsertErrors.slice(0, 3).join('; ')}`
                    : null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            result: result as any,
            executor: result.executor,
            completed_at: now,
        })
    } catch (err) {
        // Log but don't fail the response — listings were already saved
        console.error('[scrape/enrich] updateScrapeJob failed:', err)
    }

    // 6. Link listings to keyword context -------------------------------------
    // If this scrape was triggered by a keyword search, link each ASIN to the
    // keyword via amazon_keyword_products. Conflicts are silently ignored.
    if (!result.blocked && result.listings.length > 0) {
        try {
            const keywordRow = await getKeywordForJob(db, adminClient, result.job_id)
            if (keywordRow) {
                for (const listing of result.listings) {
                    try {
                        await upsertKeywordProduct(db, {
                            keyword_id: keywordRow.id,
                            asin: listing.asin,
                        })
                    } catch (err) {
                        console.error(`[scrape/enrich] upsertKeywordProduct failed for ${listing.asin}:`, err)
                    }
                }
            }
        } catch (err) {
            console.error('[scrape/enrich] getKeywordByScrapeJob failed:', err)
        }
    }

    // 7. Background SP-API enrichment ----------------------------------------
    // Fire-and-forget: enrich fresh ASINs without blocking the response.
    // Pass the full listings so the pipeline has rank + price data for fees.
    if (!result.blocked && result.listings.length > 0) {
        const listings = result.listings
        after(async () => {
            try {
                const { enrichAsinBatch } = await import('@/integrations/data-pipeline/enrich')
                const { syncAmazonProductVectorsDownstream } = await import('@/integrations/data-pipeline/vector-sync')
                await enrichAsinBatch(db, listings)
                await syncAmazonProductVectorsDownstream()
            } catch (err) {
                console.error('[scrape/enrich] SP-API enrichment failed:', err)
            }
        })
    }

    return NextResponse.json({ ok: true })
}
