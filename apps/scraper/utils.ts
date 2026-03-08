import { ScrapedProduct } from './types'

/**
 * Estimate time remaining as a human-readable string.
 * @param done  - number of items processed so far
 * @param total - total items
 * @param start - Date object when the run started
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

/**
 * Remove duplicate products by ASIN, keeping the first occurrence.
 */
export function dedupeByAsin(products: ScrapedProduct[]): ScrapedProduct[] {
    const seen = new Set<string>()
    return products.filter(p => {
        if (seen.has(p.asin)) return false
        seen.add(p.asin)
        return true
    })
}
