/**
 * Amazon product content script entry point.
 *
 * Two modes — determined at runtime via message dispatch:
 *  - JOB MODE: page was opened by the executor. Parse product detail + report.
 *    Activated by a START_JOB message from the service worker after page load.
 *  - OVERLAY MODE: user browses a product page. Mount the financial sidebar.
 *
 * The overlay is always mounted. Job mode is triggered via START_JOB message.
 */
import { parseProductDetail } from './parsers'
import { mountOverlay } from './mount'
import { EXTENSION_MSG } from '@/types/messages'
import type { ContentScriptResult, StartJobMsg } from '@/types/messages'

function runJobMode(jobId: string): void {
    const listing = parseProductDetail()
    const message: ContentScriptResult = {
        type: EXTENSION_MSG.SCRAPE_RESULT,
        jobId,
        listings: listing ? [listing] : [],
        blocked: !listing,
        pageCount: 1,
    }
    chrome.runtime.sendMessage(message)
}

// ─── ENTRY POINT ──────────────────────────────────────────────────────────────

// Always mount the overlay for organic browsing — job mode is entered via message
mountOverlay()

// Listen for the executor dispatching a job to this tab
chrome.runtime.onMessage.addListener((message: StartJobMsg) => {
    if (message.type === EXTENSION_MSG.START_JOB) {
        runJobMode(message.jobId)
    }
})
