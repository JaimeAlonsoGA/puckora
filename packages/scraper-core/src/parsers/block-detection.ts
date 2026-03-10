/**
 * Amazon HTML block & state detection.
 *
 * Works on raw HTML strings — compatible with both Playwright server-side
 * scraping and any future fetch-based approach.
 */

const HARD_BLOCK_SIGNALS = [
    'action="/errors/validateCaptcha"',
    'action="/ap/cvf/verify"',
    'api-services-support@amazon.com',
    'This service is currently unavailable.',
]

const BLOCKED_TITLES = [
    'robot check',
    'amazon sign-in',
    'amazon sign in',
    '503 - service unavailable error',
]

/**
 * Returns true if the HTML indicates Amazon has blocked the request
 * (CAPTCHA, login wall, 503, or no product grid at all).
 */
export function isBlocked(html: string): boolean {
    if (HARD_BLOCK_SIGNALS.some(s => html.includes(s))) return true

    const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '')
        .toLowerCase()
        .trim()

    if (BLOCKED_TITLES.includes(title)) return true

    // No product grid → blocked or genuinely empty
    return !html.includes('data-asin="')
}

/**
 * Returns true if the page explicitly states there are no Best Sellers
 * available. Distinct from isBlocked — this is a valid (non-error) state.
 */
export function isEmptyCategory(html: string): boolean {
    return (
        html.includes('there are no Best Sellers available in this category') ||
        html.includes('no Best Sellers available')
    )
}
