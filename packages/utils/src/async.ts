/**
 * @puckora/utils — async & collection helpers
 *
 * Framework-agnostic utilities safe to use in any app: web, scraper, extension.
 * No Node.js builtins, no browser APIs — pure JS.
 */

// ─── TIMING ──────────────────────────────────────────────────────────────────

export const sleep = (ms: number): Promise<void> =>
    new Promise(r => setTimeout(r, ms))

/** Awaitable random delay in [min, max] ms — polite crawl / retry delay. */
export const jitter = (min: number, max: number): Promise<void> =>
    sleep(min + Math.random() * (max - min))

// ─── CONCURRENCY ─────────────────────────────────────────────────────────────

/**
 * Run at most `concurrency` async tasks simultaneously over an array.
 * Results are returned in input order.
 */
export async function pooled<T, R>(
    items: T[],
    concurrency: number,
    fn: (item: T) => Promise<R>,
): Promise<R[]> {
    const results: R[] = []
    let idx = 0
    async function worker() {
        while (idx < items.length) {
            const i = idx++
            results[i] = await fn(items[i])
        }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
    return results
}

// ─── COLLECTION ──────────────────────────────────────────────────────────────

/** Remove duplicates by a string key, keeping the first occurrence. */
export function dedupeBy<T>(items: T[], key: (item: T) => string): T[] {
    const seen = new Set<string>()
    return items.filter(item => {
        const k = key(item)
        if (seen.has(k)) return false
        seen.add(k)
        return true
    })
}
