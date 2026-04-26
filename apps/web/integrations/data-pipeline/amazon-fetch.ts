/**
 * Reusable Amazon HTML fetch utility.
 *
 * Single source of truth for all Amazon page fetches across every pipeline mode:
 *  - Keyword search results  (keyword-search/amazon-html-source.ts)
 *  - BPM repair              (bpm-repair.ts)
 *  - Any future scraping consumer
 *
 * Handles:
 *  - Shared browser-like headers (no cookies/session needed for search/product pages)
 *  - Automatic 429 retry with back-off
 *  - Consistent error surface: throws `AmazonFetchError` so callers can distinguish
 *    rate-limit, bot-filter, and hard failures without parsing error messages.
 */
import 'server-only'

// ---------------------------------------------------------------------------
// Headers — shared across all Amazon page fetches
// ---------------------------------------------------------------------------

export const AMAZON_FETCH_HEADERS = {
    'accept-language': 'en-US,en;q=0.9',
    'cache-control': 'no-cache',
    pragma: 'no-cache',
    'user-agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
} as const

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class AmazonFetchError extends Error {
    constructor(
        message: string,
        public readonly status: number | null,
        public readonly isRateLimit: boolean,
    ) {
        super(message)
        this.name = 'AmazonFetchError'
    }
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

const RETRY_DELAY_MS = 2_000
// Two retries: handles both transient 429 rate-limits and 503 bot-filter
// responses that Amazon occasionally returns on the first attempt.
const MAX_RETRIES = 2

// ---------------------------------------------------------------------------
// Core fetch helper
// ---------------------------------------------------------------------------

/**
 * Fetch a single Amazon page and return its raw HTML.
 *
 * - Retries once on HTTP 429 (rate limit) with a 2-second back-off.
 * - Throws `AmazonFetchError` on failure so callers can handle rate-limits
 *   (skip + retry later) vs hard failures (log + alert) differently.
 *
 * @param url - Full Amazon URL (search results, product page, etc.)
 */
export async function fetchAmazonPage(url: string): Promise<string> {
    let lastError: AmazonFetchError | null = null

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) {
            await new Promise<void>((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
        }

        const response = await fetch(url, {
            headers: AMAZON_FETCH_HEADERS,
            cache: 'no-store',
        })

        if (response.ok) {
            return response.text()
        }

        const isRateLimit = response.status === 429 || response.status === 503
        lastError = new AmazonFetchError(
            `Amazon fetch failed: HTTP ${response.status} (${url})`,
            response.status,
            isRateLimit,
        )

        // Retry on rate-limit (429) or bot-filter (503); all other statuses fail immediately.
        if (!isRateLimit) break
    }

    throw lastError!
}
