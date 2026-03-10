/**
 * Amazon product detail page content script.
 *
 * Activates on amazon.com/dp/* pages. Two modes:
 *  - JOB MODE: page opened by extension for product data collection
 *  - OVERLAY MODE: user browsing a product page — inject Puckora financial sidebar
 *
 * The sidebar shows: FBA fees, estimated profit margin, BSR trend,
 * and supplier matches (via Alibaba/1688 search tab).
 */

import type { ScrapedListing, ContentScriptResult } from '../types/messages'
import { EXTENSION_MSG } from '../types/messages'

// ─── DOM PARSING ─────────────────────────────────────────────────────────────

function parseProductDetail(): ScrapedListing | null {
    const asin = document.getElementById('ASIN')?.getAttribute('value')
        ?? (window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/)?.[1] ?? null)

    if (!asin) return null

    const name = document.getElementById('productTitle')?.textContent?.trim() ?? ''
    if (!name) return null

    const priceEl =
        document.querySelector('.a-price .a-offscreen') ??
        document.querySelector('#priceblock_ourprice') ??
        document.querySelector('#price_inside_buybox')
    const price = priceEl?.textContent
        ? parseFloat(priceEl.textContent.replace(/[^0-9.]/g, '') || '0') || null
        : null

    const ratingText = document.getElementById('acrPopover')?.getAttribute('title') ?? ''
    const ratingMatch = ratingText.match(/(\d+\.\d+)/)
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null

    const reviewCountText = document.getElementById('acrCustomerReviewText')?.textContent ?? ''
    const reviewMatch = reviewCountText.match(/([\d,]+)/)
    const review_count = reviewMatch
        ? parseInt(reviewMatch[1].replace(/,/g, ''), 10)
        : null

    return {
        asin,
        rank: null,
        name,
        price,
        rating,
        review_count,
        product_url: `https://www.amazon.com/dp/${asin}`,
    }
}

// ─── JOB MODE ─────────────────────────────────────────────────────────────────

function getJobId(): string | null {
    return sessionStorage.getItem('puckora_job_id')
}

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

// ─── OVERLAY MODE ─────────────────────────────────────────────────────────────

function runOverlayMode(): void {
    // TODO: Inject React sidebar iframe with Puckora financial panel.
    // The iframe loads sidebar/index.html from the extension package,
    // which is a full React app sharing @puckora/ui building blocks.
    //
    // Sidebar tabs:
    //  1. Financials — FBA fee, referral fee, margin estimate, BSR trend
    //  2. Suppliers  — Alibaba/1688 matches for the current product keyword
}

// ─── ENTRY POINT ──────────────────────────────────────────────────────────────

const jobId = getJobId()
if (jobId) {
    runJobMode(jobId)
} else {
    runOverlayMode()
}
