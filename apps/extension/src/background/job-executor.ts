/**
 * Job executor — claims a scrape job, opens an offscreen tab, waits for the
 * content script to deliver the result, then posts it to the web app API.
 *
 * Flow:
 *  1. Claim job (UPDATE status → 'running')
 *  2. Build target URL from job payload
 *  3. Open tab (user's IP, user's session)
 *  4. Content script parses DOM, sends SCRAPE_RESULT message
 *  5. POST result to /api/scrape/enrich
 *  6. UPDATE job status → 'done' | 'failed'
 */

import { getSupabaseClient, WEB_APP_ORIGIN } from './supabase-client'
import type { ScrapeJobPayload, ScrapeResult } from '@puckora/scraper-core'
import { SCRAPE_JOB_STATUS, SCRAPE_EXECUTOR, SCRAPE_JOB_TYPE } from '@puckora/scraper-core'
import { EXTENSION_MSG } from '../types/messages'
import type { ContentScriptResult } from '../types/messages'

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface ScrapeJob {
    id: string
    type: string
    payload: ScrapeJobPayload
    user_id: string
}

// ─── URL BUILDERS ─────────────────────────────────────────────────────────────

const DOMAIN_MAP: Record<string, string> = {
    US: 'com',
    GB: 'co.uk',
    DE: 'de',
    JP: 'co.jp',
    FR: 'fr',
    IT: 'it',
    ES: 'es',
    CA: 'ca',
}

function buildAmazonSearchUrl(keyword: string, marketplace = 'US'): string {
    const domain = DOMAIN_MAP[marketplace] ?? 'com'
    return `https://www.amazon.${domain}/s?k=${encodeURIComponent(keyword)}&ref=puckora`
}

function buildAmazonProductUrl(asin: string, marketplace = 'US'): string {
    const domain = DOMAIN_MAP[marketplace] ?? 'com'
    return `https://www.amazon.${domain}/dp/${asin}`
}

function buildTargetUrl(payload: ScrapeJobPayload): string {
    switch (payload.type) {
        case SCRAPE_JOB_TYPE.AMAZON_SEARCH:
            return buildAmazonSearchUrl(payload.keyword, payload.marketplace)
        case SCRAPE_JOB_TYPE.AMAZON_PRODUCT:
            return buildAmazonProductUrl(payload.asin, payload.marketplace)
        case SCRAPE_JOB_TYPE.ALIBABA_SEARCH:
            return `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(payload.keyword)}`
    }
}

// ─── JOB LIFECYCLE ────────────────────────────────────────────────────────────

const TIMEOUT_MS = 60_000  // 60s max per job

async function claimJob(jobId: string): Promise<boolean> {
    const supabase = getSupabaseClient()
    const { error } = await supabase
        .from('scrape_jobs')
        .update({ status: SCRAPE_JOB_STATUS.RUNNING, claimed_at: new Date().toISOString(), executor: SCRAPE_EXECUTOR.EXTENSION })
        .eq('id', jobId)
        .eq('status', SCRAPE_JOB_STATUS.PENDING)  // only claim if still pending (guards against double-claim)
    return !error
}

async function markJobDone(jobId: string): Promise<void> {
    const supabase = getSupabaseClient()
    await supabase
        .from('scrape_jobs')
        .update({ status: SCRAPE_JOB_STATUS.DONE, completed_at: new Date().toISOString() })
        .eq('id', jobId)
}

async function markJobFailed(jobId: string, error: string): Promise<void> {
    const supabase = getSupabaseClient()
    await supabase
        .from('scrape_jobs')
        .update({ status: SCRAPE_JOB_STATUS.FAILED, error, completed_at: new Date().toISOString() })
        .eq('id', jobId)
}

/** Wait for the content script to post a SCRAPE_RESULT message for this job. */
function waitForContentResult(jobId: string): Promise<ContentScriptResult> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            chrome.runtime.onMessage.removeListener(listener)
            reject(new Error(`Job ${jobId} timed out after ${TIMEOUT_MS / 1000}s`))
        }, TIMEOUT_MS)

        function listener(message: ContentScriptResult) {
            if (message.type !== EXTENSION_MSG.SCRAPE_RESULT || message.jobId !== jobId) return
            clearTimeout(timeout)
            chrome.runtime.onMessage.removeListener(listener)
            resolve(message)
        }

        chrome.runtime.onMessage.addListener(listener)
    })
}

/** POST the raw result to the web app API for SP-API enrichment. */
async function postResultToApi(
    jobId: string,
    result: ContentScriptResult,
    accessToken: string,
): Promise<void> {
    const payload: ScrapeResult = {
        job_id: jobId,
        executor: SCRAPE_EXECUTOR.EXTENSION,
        listings: result.listings,
        blocked: result.blocked,
        page_count: result.pageCount,
        scraped_at: new Date().toISOString(),
    }

    const res = await fetch(`${WEB_APP_ORIGIN}/api/scrape/enrich`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Enrich API error ${res.status}: ${text}`)
    }
}

// ─── MAIN EXECUTOR ────────────────────────────────────────────────────────────

export async function executeJob(job: ScrapeJob, accessToken: string): Promise<void> {
    const claimed = await claimJob(job.id)
    if (!claimed) return  // another executor got it

    let tab: chrome.tabs.Tab | null = null

    try {
        const url = buildTargetUrl(job.payload)

        // Open a background tab (not active — user won't see it unless they look)
        tab = await chrome.tabs.create({ url, active: false })

        // Wait for the content script to parse the page and postMessage
        const result = await waitForContentResult(job.id)

        if (result.blocked) {
            await markJobFailed(job.id, 'Amazon returned a CAPTCHA or block page')
            return
        }

        // Ship raw results to the web app for SP-API enrichment
        await postResultToApi(job.id, result, accessToken)
        await markJobDone(job.id)
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown executor error'
        await markJobFailed(job.id, message)
    } finally {
        if (tab?.id) {
            chrome.tabs.remove(tab.id).catch(() => { })  // close background tab
        }
    }
}
