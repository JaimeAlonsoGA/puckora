/**
 * Amazon search results content script.
 *
 * Activates on amazon.com/s?* pages. Uses native DOM APIs (more robust than
 * regex on live pages) to extract listing data and post it to the service worker.
 *
 * Two modes:
 *  - JOB MODE: page was opened by the extension executor (URL contains ref=puckora).
 *    Parse and postMessage the result, then the service worker closes the tab.
 *  - OVERLAY MODE (future): user browsing amazon.com manually.
 *    Will inject the Puckora sidebar with financial data.
 */

import type { ScrapedListing, ContentScriptResult } from '../types/messages'
import { EXTENSION_MSG } from '../types/messages'

// ─── DOM PARSING ─────────────────────────────────────────────────────────────

/** Extract the ASIN from a product card element. */
function getAsin(el: Element): string | null {
    return el.getAttribute('data-asin') ?? null
}

/** Extract text from the first matching selector within an element. */
function getText(parent: Element, selector: string): string {
    return (parent.querySelector(selector)?.textContent ?? '').trim()
}

/** Parse dollar price from any text like "$18.99" or "18.99" */
function parsePrice(text: string): number | null {
    const m = text.match(/\$?([\d,]+(?:\.\d{2})?)/)
    if (!m) return null
    const v = parseFloat(m[1].replace(/,/g, ''))
    return isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null
}

/** Parse star rating from text like "4.5 out of 5 stars" */
function parseRating(text: string): number | null {
    const m = text.match(/(\d+\.\d+)\s+out of 5/)
    if (!m) return null
    const v = parseFloat(m[1])
    return isFinite(v) && v >= 1 && v <= 5 ? v : null
}

/** Parse review count from text like "(1,234)" or "1.2K ratings" */
function parseReviewCount(text: string): number | null {
    // Full number with commas inside parentheses
    const paren = text.match(/\(([\d,]+)\)/)
    if (paren) {
        const v = parseInt(paren[1].replace(/,/g, ''), 10)
        return isFinite(v) ? v : null
    }
    // Abbreviated: 1.2K, 2M
    const abbr = text.match(/([\d.]+)([KMk])\s+(?:ratings?|reviews?)/)
    if (abbr) {
        const n = parseFloat(abbr[1])
        const mult = abbr[2].toUpperCase() === 'K' ? 1_000 : 1_000_000
        return isFinite(n) ? Math.round(n * mult) : null
    }
    return null
}

function parseListings(): ScrapedListing[] {
    const listings: ScrapedListing[] = []
    const seen = new Set<string>()

    // Amazon search results use [data-asin] on the result container elements
    const cards = document.querySelectorAll('[data-asin][data-component-type="s-search-result"]')

    cards.forEach(card => {
        const asin = getAsin(card)
        if (!asin || asin.length !== 10 || seen.has(asin)) return
        seen.add(asin)

        // Title — multiple class patterns across Amazon page versions
        const name =
            getText(card, 'h2 [class*="a-size-"] span') ||
            getText(card, 'h2 span') ||
            getText(card, '[class*="s-title"]') ||
            ''

        if (!name) return

        // Price — .a-price .a-offscreen is the screen-reader price (most reliable)
        const priceText = getText(card, '.a-price .a-offscreen')
        const price = parsePrice(priceText)

        // Rating
        const ratingText = card.querySelector('[class*="a-star"]')?.getAttribute('aria-label') ?? ''
        const rating = parseRating(ratingText)

        // Review count
        const reviewEl = card.querySelector('[aria-label*="rating"]')
        const reviewText = reviewEl?.textContent ?? ''
        const review_count = parseReviewCount(reviewText)

        // ASIN-based URL (canonical, avoids tracking params)
        const product_url = `https://www.amazon.com/dp/${asin}`

        listings.push({ asin, rank: null, name, price, rating, review_count, product_url })
    })

    return listings
}

// ─── JOB MODE ─────────────────────────────────────────────────────────────────

function getJobId(): string | null {
    // Service worker injects job ID into the tab's storage before navigation
    const params = new URLSearchParams(window.location.search)
    if (!params.has('ref')) return null
    // Job ID stored by service worker before tab was opened
    return sessionStorage.getItem('puckora_job_id')
}

async function runJobMode(jobId: string): Promise<void> {
    // Wait for search results to render (Amazon lazy-loads cards)
    await waitForResults()

    const listings = parseListings()
    const blocked = listings.length === 0 && document.title.toLowerCase().includes('robot')

    const message: ContentScriptResult = {
        type: EXTENSION_MSG.SCRAPE_RESULT,
        jobId,
        listings,
        blocked,
        pageCount: 1,
    }

    chrome.runtime.sendMessage(message)
}

function waitForResults(): Promise<void> {
    return new Promise(resolve => {
        // If results already present, resolve immediately
        if (document.querySelector('[data-component-type="s-search-result"]')) {
            resolve()
            return
        }

        const observer = new MutationObserver(() => {
            if (document.querySelector('[data-component-type="s-search-result"]')) {
                observer.disconnect()
                resolve()
            }
        })
        observer.observe(document.body, { childList: true, subtree: true })

        // Timeout fallback — parse whatever is available
        setTimeout(() => { observer.disconnect(); resolve() }, 15_000)
    })
}

// ─── ENTRY POINT ──────────────────────────────────────────────────────────────

const jobId = getJobId()
if (jobId) {
    runJobMode(jobId)
}

// OVERLAY MODE: inject sidebar when user is browsing organically (future)
// TODO: detect manual browsing vs job tab, inject React sidebar iframe
