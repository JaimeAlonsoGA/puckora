/**
 * SP-API per-endpoint rate limiter using a token-bucket algorithm.
 *
 * Amazon publishes burst and restore rates per operation:
 * https://developer-docs.amazon.com/sp-api/docs/usage-plans-and-rate-limits-in-the-sp-api
 *
 * When a request would exceed the rate, the limiter waits (with jitter) until
 * a token is available rather than failing immediately — this prevents cascading
 * retries that could compound throttling.
 *
 * Usage:
 *   await rateLimiter.acquire('searchCatalogItems')
 *   // ... make the API call
 */

interface BucketConfig {
    /** Max tokens (burst capacity) */
    burst: number
    /** Tokens restored per second */
    restoreRate: number
}

interface Bucket {
    tokens: number
    lastRefill: number // ms since epoch
}

const OPERATION_LIMITS: Record<string, BucketConfig> = {
    searchCatalogItems: { burst: 2, restoreRate: 2 },
    getCatalogItem: { burst: 2, restoreRate: 2 },
    getItemOffers: { burst: 10, restoreRate: 5 },
    getItemOffersBatch: { burst: 0.1, restoreRate: 0.1 },
    getFeesEstimate: { burst: 10, restoreRate: 5 },
    // Fallback for unknown operations
    default: { burst: 1, restoreRate: 0.5 },
}

const buckets = new Map<string, Bucket>()

function getBucketConfig(operation: string): BucketConfig {
    return OPERATION_LIMITS[operation] ?? OPERATION_LIMITS.default
}

function refillBucket(bucket: Bucket, config: BucketConfig, now: number): void {
    const elapsed = (now - bucket.lastRefill) / 1000 // seconds
    bucket.tokens = Math.min(config.burst, bucket.tokens + elapsed * config.restoreRate)
    bucket.lastRefill = now
}

function getOrCreateBucket(operation: string): Bucket {
    if (!buckets.has(operation)) {
        const config = getBucketConfig(operation)
        buckets.set(operation, { tokens: config.burst, lastRefill: Date.now() })
    }
    return buckets.get(operation)!
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Acquire one token for the given SP-API operation.
 * If no token is available, waits until one is restored, then resolves.
 */
export async function acquireRateToken(operation: string): Promise<void> {
    const config = getBucketConfig(operation)
    const bucket = getOrCreateBucket(operation)

    let attempts = 0
    while (true) {
        const now = Date.now()
        refillBucket(bucket, config, now)

        if (bucket.tokens >= 1) {
            bucket.tokens -= 1
            return
        }

        // Calculate wait time to restore 1 token, plus small jitter to de-sync
        // concurrent waiters
        const tokensNeeded = 1 - bucket.tokens
        const waitMs = (tokensNeeded / config.restoreRate) * 1000
        const jitterMs = Math.random() * 200 // 0-200ms jitter
        const totalWait = Math.ceil(waitMs + jitterMs)

        if (attempts > 10) {
            // Safety valve: abort after 10 waits (~30s worst case)
            throw new Error(
                `SP-API rate limiter: too many retries for operation "${operation}"`,
            )
        }

        attempts++
        await sleep(totalWait)
    }
}

/** Returns a snapshot of the current token counts (useful for debugging). */
export function getRateLimiterState(): Record<string, { tokens: number; config: BucketConfig }> {
    const state: Record<string, { tokens: number; config: BucketConfig }> = {}
    for (const [op, bucket] of buckets.entries()) {
        refillBucket(bucket, getBucketConfig(op), Date.now())
        state[op] = { tokens: bucket.tokens, config: getBucketConfig(op) }
    }
    return state
}
