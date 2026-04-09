import type { AmazonVectorSearchRow } from '@puckora/vectors'

const GENERIC_TERMS = new Set([
    'home', 'kitchen', 'garden', 'outdoor', 'indoor', 'sports', 'office', 'travel',
    'electronics', 'accessories', 'products', 'items', 'supplies', 'equipment',
    'tools', 'set', 'pack', 'kit', 'bundle',
])

function normalizeProductType(pt: string): string {
    return pt.toLowerCase().replace(/[_-]/g, ' ').replace(/\s*\(.*?\)\s*/g, '').trim()
}

function categoryLeaves(path: string): string[] {
    return path
        .split(/\s*[>|▸]\s*/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(-2)
        .map((s) => s.toLowerCase())
        .filter((s) => !GENERIC_TERMS.has(s) && s.length >= 3)
}

function isUsable(term: string, queryLower: string, seen: Set<string>): boolean {
    return (
        term.length >= 3 &&
        !seen.has(term) &&
        !queryLower.includes(term) &&
        !term.includes(queryLower)
    )
}

export function extractKeywords(rows: AmazonVectorSearchRow[], query: string): string[] {
    const queryLower = query.toLowerCase().trim()
    const brands = new Set(
        rows.map((r) => r.brand?.toLowerCase().trim()).filter((b): b is string => Boolean(b)),
    )

    const candidates: { term: string; score: number }[] = []
    const seen = new Set<string>()

    for (const row of rows) {
        // product_type is the best signal: clean Amazon taxonomy label (e.g. YOGA_MAT → "yoga mat")
        if (row.product_type) {
            const term = normalizeProductType(row.product_type)
            if (isUsable(term, queryLower, seen) && !brands.has(term)) {
                seen.add(term)
                candidates.push({ term, score: row.score * 1.3 })
            }
        }

        // category_path leaves: last 1-2 navigational segments
        if (row.category_path) {
            for (const leaf of categoryLeaves(row.category_path)) {
                if (isUsable(leaf, queryLower, seen) && !brands.has(leaf)) {
                    seen.add(leaf)
                    candidates.push({ term: leaf, score: row.score })
                }
            }
        }
    }

    return candidates
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map((c) => c.term)
}
