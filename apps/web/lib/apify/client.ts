/**
 * Apify HTTP client — server-side only.
 *
 * Uses the synchronous run endpoint: the actor runs and returns the full
 * dataset in one HTTP response. Suitable for smaller datasets / on-demand
 * triggers from Route Handlers.
 *
 * Env var required: APIFY_API_TOKEN
 *
 * Usage:
 *   const result = await runApifyActor<AmazonReviewsInput, AmazonReviewOutput>(
 *     APIFY_ACTOR_ID.amazonReviews,
 *     { asin: 'B09B8V1LZ3', domainCode: 'com' },
 *   )
 */

import type { ApifyActorId } from '@puckora/web/lib/apify/types'

const APIFY_BASE_URL = 'https://api.apify.com/v2'

/** Timeout given to the actor run (ms). Default: 5 min. */
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000

export class ApifyError extends Error {
    constructor(
        message: string,
        public readonly status?: number,
        public readonly actorId?: string,
    ) {
        super(message)
        this.name = 'ApifyError'
    }
}

function getApiToken(): string {
    const token = process.env.APIFY_API_TOKEN
    if (!token) {
        throw new ApifyError('APIFY_API_TOKEN environment variable is not set')
    }
    return token
}

/**
 * Run an Apify actor synchronously and return the typed dataset items.
 *
 * @param actorId  Actor identifier, e.g. "axesso_data/amazon-reviews-scraper"
 * @param input    Typed input object for the actor
 * @param options  Optional overrides (timeout, memory)
 */
export async function runApifyActor<TInput, TOutput>(
    actorId: ApifyActorId | string,
    input: TInput,
    options: {
        /** Actor timeout in seconds. Defaults to 300s. */
        timeoutSecs?: number
        /** Memory in MB. Defaults to Apify platform default. */
        memory?: number
    } = {},
): Promise<TOutput[]> {
    const token = getApiToken()
    const timeoutSecs = options.timeoutSecs ?? DEFAULT_TIMEOUT_MS / 1000
    const encodedActorId = encodeURIComponent(actorId)

    const url = new URL(
        `${APIFY_BASE_URL}/acts/${encodedActorId}/run-sync-get-dataset-items`,
    )
    url.searchParams.set('token', token)
    url.searchParams.set('timeout', String(timeoutSecs))
    if (options.memory) {
        url.searchParams.set('memory', String(options.memory))
    }

    const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        // Give the HTTP request itself a generous timeout (actor timeout + 30s)
        signal: AbortSignal.timeout(timeoutSecs * 1000 + 30_000),
    })

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new ApifyError(
            `Apify actor ${actorId} failed: ${response.status} ${response.statusText} — ${text}`,
            response.status,
            actorId,
        )
    }

    const data: unknown = await response.json()
    if (!Array.isArray(data)) {
        throw new ApifyError(
            `Apify actor ${actorId} returned unexpected non-array response`,
            undefined,
            actorId,
        )
    }
    return data as TOutput[]
}

/**
 * Convenience: run actor and return the first item, or null.
 */
export async function runApifyActorOne<TInput, TOutput>(
    actorId: ApifyActorId | string,
    input: TInput,
    options?: Parameters<typeof runApifyActor>[2],
): Promise<TOutput | null> {
    const results = await runApifyActor<TInput, TOutput>(actorId, input, options)
    return results[0] ?? null
}
