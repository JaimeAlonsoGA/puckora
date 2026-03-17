/**
 * shared/utils.ts
 *
 * Scraper runtime utilities.
 * Framework-agnostic helpers (sleep, jitter, pooled, dedupeBy) are sourced
 * from @puckora/utils so they can also be used in apps/web.
 * The eta() helper is scraper-specific (long-running job progress display).
 */
export { sleep, jitter, pooled, dedupeBy } from '@puckora/utils'

/**
 * Human-readable ETA string — scraper-specific, not needed in other apps.
 * @param done  - items completed so far
 * @param total - total item count
 * @param start - run start Date
 */
export function eta(done: number, total: number, start: Date): string {
    if (done === 0) return '—'
    const elapsed = Date.now() - start.getTime()
    const msPerItem = elapsed / done
    const remaining = Math.round((msPerItem * (total - done)) / 1000)
    if (remaining < 60) return `${remaining}s`
    if (remaining < 3600) return `${Math.floor(remaining / 60)}m ${remaining % 60}s`
    return `${Math.floor(remaining / 3600)}h ${Math.floor((remaining % 3600) / 60)}m`
}
