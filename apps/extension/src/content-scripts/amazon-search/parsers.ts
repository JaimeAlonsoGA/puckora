/**
 * Amazon search page DOM parsers.
 *
 * These are pure functions — no React, no side effects, no Chrome APIs.
 * Kept isolated so they can be unit-tested outside of the browser.
 */
import type { ScrapedListing } from '@puckora/scraper-core'

/** Extract the ASIN from a product card element. */
export function getAsin(el: Element): string | null {
    return el.getAttribute('data-asin') ?? null
}

/** Extract trimmed text from the first matching selector within an element. */
export function getText(parent: Element, selector: string): string {
    return (parent.querySelector(selector)?.textContent ?? '').trim()
}

/** Parse dollar price from text like "$18.99" or "18.99". */
export function parsePrice(text: string): number | null {
    const m = text.match(/\$?([\d,]+(?:\.\d{2})?)/)
    if (!m) return null
    const v = parseFloat(m[1].replace(/,/g, ''))
    return isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null
}

/** Parse star rating from text like "4.5 out of 5 stars". */
export function parseRating(text: string): number | null {
    const m = text.match(/(\d+\.\d+)\s+out of 5/)
    if (!m) return null
    const v = parseFloat(m[1])
    return isFinite(v) && v >= 1 && v <= 5 ? v : null
}

/** Parse review count from "(1,234)" or "1.2K ratings". */
export function parseReviewCount(text: string): number | null {
    const paren = text.match(/\(([\d,]+)\)/)
    if (paren) {
        const v = parseInt(paren[1].replace(/,/g, ''), 10)
        return isFinite(v) ? v : null
    }
    const abbr = text.match(/([\d.]+)([KMk])\s+(?:ratings?|reviews?)/)
    if (abbr) {
        const n = parseFloat(abbr[1])
        const mult = abbr[2].toUpperCase() === 'K' ? 1_000 : 1_000_000
        return isFinite(n) ? Math.round(n * mult) : null
    }
    return null
}

/** Parse all listings from the current Amazon search result page. */
export function parseListings(): ScrapedListing[] {
    const listings: ScrapedListing[] = []
    const seen = new Set<string>()

    const cards = document.querySelectorAll(
        '[data-asin][data-component-type="s-search-result"]',
    )

    cards.forEach((card) => {
        const asin = getAsin(card)
        if (!asin || asin.length !== 10 || seen.has(asin)) return
        seen.add(asin)

        const name =
            getText(card, 'h2 [class*="a-size-"] span') ||
            getText(card, 'h2 span') ||
            getText(card, '[class*="s-title"]') ||
            ''
        if (!name) return

        const priceText = getText(card, '.a-price .a-offscreen')
        const price = parsePrice(priceText)

        const ratingText =
            card.querySelector('[class*="a-star"]')?.getAttribute('aria-label') ?? ''
        const rating = parseRating(ratingText)

        const reviewEl = card.querySelector('[aria-label*="rating"]')
        const reviewText = reviewEl?.textContent ?? ''
        const review_count = parseReviewCount(reviewText)

        const product_url = `https://www.amazon.com/dp/${asin}`

        listings.push({ asin, rank: null, name, price, rating, review_count, product_url })
    })

    return listings
}

/** Waits until Amazon has rendered at least one result card, or 15s passes. */
export function waitForResults(): Promise<void> {
    return new Promise((resolve) => {
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
        setTimeout(() => {
            observer.disconnect()
            resolve()
        }, 15_000)
    })
}
