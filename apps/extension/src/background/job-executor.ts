/**
 * Job executor — claims a scrape job, opens a background tab, waits for the
 * content script to deliver the result, then POSTs it to the web app API.
 *
 * Flow:
 *  1. Claim job  (UPDATE status → 'running' with optimistic lock on 'pending')
 *  2. Build target URL from job payload
 *  3. Open tab (uses user's IP, user's browser session)
 *  4. Content script parses the DOM, sends SCRAPE_RESULT message
 *  5. POST raw result to /api/scrape/enrich for SP-API enrichment
 *  6. UPDATE job status → 'done' | 'failed'
 */
import { getSupabaseClient } from '@/integrations/supabase/client'
import { API } from '@/constants/api'
import { buildAmazonSearchUrl, buildAmazonProductUrl, buildAlibabaSearchUrl } from '@/constants/urls'
import type { ScrapeJobPayload, ScrapeResult } from '@puckora/scraper-core'
import { SCRAPE_JOB_STATUS, SCRAPE_EXECUTOR, SCRAPE_JOB_TYPE } from '@puckora/scraper-core'
import { EXTENSION_MSG } from '@/types/messages'
import type { ContentScriptResult, StartJobMsg } from '@/types/messages'

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface ScrapeJob {
    id: string
    type: string
    payload: ScrapeJobPayload
    user_id: string
}

// ─── URL BUILDER ──────────────────────────────────────────────────────────────

function buildTargetUrl(payload: ScrapeJobPayload): string {
    switch (payload.type) {
        case SCRAPE_JOB_TYPE.AMAZON_SEARCH:
            return buildAmazonSearchUrl(payload.keyword, payload.marketplace)
        case SCRAPE_JOB_TYPE.AMAZON_PRODUCT:
            return buildAmazonProductUrl(payload.asin, payload.marketplace)
        case SCRAPE_JOB_TYPE.ALIBABA_SEARCH:
            return buildAlibabaSearchUrl(payload.keyword)
    }
}

// ─── JOB LIFECYCLE ────────────────────────────────────────────────────────────

const TIMEOUT_MS = 60_000 // 60s max per job

async function claimJob(jobId: string): Promise<boolean> {
    const supabase = getSupabaseClient()
    const { error } = await supabase
        .from('scrape_jobs')
        .update({
            status: SCRAPE_JOB_STATUS.RUNNING,
            claimed_at: new Date().toISOString(),
            executor: SCRAPE_EXECUTOR.EXTENSION,
        })
        .eq('id', jobId)
        .eq('status', SCRAPE_JOB_STATUS.PENDING) // optimistic lock — only claim if still pending
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

/** Wait for a tab to fully finish loading. */
function waitForTabLoad(tabId: number): Promise<void> {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            chrome.tabs.onUpdated.removeListener(listener)
            reject(new Error(`Tab ${tabId} never reached 'complete' status`))
        }, TIMEOUT_MS)

        function listener(updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) {
            if (updatedTabId !== tabId || changeInfo.status !== 'complete') return
            chrome.tabs.onUpdated.removeListener(listener)
            clearTimeout(timeout)
            resolve()
        }

        chrome.tabs.onUpdated.addListener(listener)
    })
}

/** Wait for the content script to send a SCRAPE_RESULT for this job. */
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

/** POST the raw scrape result to the web app API for SP-API enrichment. */
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

    const res = await fetch(API.SCRAPE_ENRICH, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
    })

    if (!res.ok) {
        const text = await res.text()
        throw new Error(`Enrich API ${res.status}: ${text}`)
    }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export async function executeJob(job: ScrapeJob, accessToken: string): Promise<void> {
    const claimed = await claimJob(job.id)
    if (!claimed) return // another executor or race condition

    let tab: chrome.tabs.Tab | null = null

    try {
        const url = buildTargetUrl(job.payload)

        // Open a non-active background tab — user won't see it
        tab = await chrome.tabs.create({ url, active: false })

        // Wait for the page to fully load before dispatching the job
        await waitForTabLoad(tab.id!)

        // Tell the content script which job to run (message-based, no sessionStorage)
        await chrome.tabs.sendMessage(tab.id!, {
            type: EXTENSION_MSG.START_JOB,
            jobId: job.id,
        } satisfies StartJobMsg)

        const result = await waitForContentResult(job.id)

        if (result.blocked) {
            await markJobFailed(job.id, 'Page returned a CAPTCHA or block response')
            return
        }

        await postResultToApi(job.id, result, accessToken)
        await markJobDone(job.id)
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown executor error'
        await markJobFailed(job.id, message)
    } finally {
        if (tab?.id) {
            chrome.tabs.remove(tab.id).catch(() => { })
        }
    }
}
