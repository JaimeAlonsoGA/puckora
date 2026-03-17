/**
 * Amazon search content script entry point.
 *
 * Two modes — determined at runtime via message dispatch:
 *  - JOB MODE: this page was opened by the background executor to scrape data.
 *    Activated by a START_JOB message from the service worker after page load.
 *    Parse listings and report back to the service worker.
 *  - OVERLAY MODE: user is browsing organically.
 *    Mount the Puckora sidebar React app into a shadow root.
 *
 * The overlay is always mounted. When the executor sends START_JOB, the content
 * script runs job mode on top — the overlay stays hidden (isOpen: false).
 */
import { parseListings, waitForResults } from './parsers'
import { mountOverlay } from './mount'
import { EXTENSION_MSG } from '@/types/messages'
import type { ContentScriptResult, StartJobMsg } from '@/types/messages'

async function runJobMode(jobId: string): Promise<void> {
    await waitForResults()

    const listings = parseListings()
    const blocked =
        listings.length === 0 && document.title.toLowerCase().includes('robot')

    const message: ContentScriptResult = {
        type: EXTENSION_MSG.SCRAPE_RESULT,
        jobId,
        listings,
        blocked,
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
