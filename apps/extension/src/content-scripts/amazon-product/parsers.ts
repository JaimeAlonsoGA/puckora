/**
 * Amazon product page DOM parsers.
 *
 * Pure functions — no React, no side effects, no Chrome APIs.
 */
import type { ScrapedListing } from '@puckora/scraper-core'

/** Parse the product detail from the current Amazon product page. */
export function parseProductDetail(): ScrapedListing | null {
    const asin =
        document.getElementById('ASIN')?.getAttribute('value') ??
        (window.location.pathname.match(/\/dp\/([A-Z0-9]{10})/)?.[1] ?? null)

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

    const ratingText =
        document.getElementById('acrPopover')?.getAttribute('title') ?? ''
    const ratingMatch = ratingText.match(/(\d+\.\d+)/)
    const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null

    const reviewCountText =
        document.getElementById('acrCustomerReviewText')?.textContent ?? ''
    const reviewMatch = reviewCountText.match(/([\d,]+)/)
    const review_count = reviewMatch
        ? parseInt(reviewMatch[1].replace(/,/g, ''), 10)
        : null

    // Best Sellers Rank — optional
    const bsrEl = document.querySelector('#SalesRank, #productDetails_db_sections')
    const bsrMatch = bsrEl?.textContent?.match(/#([\d,]+)\s+in/)
    const rank = bsrMatch ? parseInt(bsrMatch[1].replace(/,/g, ''), 10) : null

    return {
        asin,
        rank,
        name,
        price,
        rating,
        review_count,
        product_url: `https://www.amazon.com/dp/${asin}`,
    }
}
