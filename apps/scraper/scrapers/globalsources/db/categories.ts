/**
 * gs_categories DB operations.
 *
 * Two entry points:
 *  - bulkUpsertCategories()    Seed all ~778 GS leaf categories at scraper start.
 *                              Returns url → UUID map for FK lookups.
 *  - upsertGsCategorySignals() Persist PAS / trending / top-categories per-category.
 */
import type { DB } from '../../../shared/db'

interface CategoryEntry {
    url: string
    name?: string
}

// ─── URL parsing helpers ──────────────────────────────────────────────────────

function extractSlug(url: string): string | null {
    const m = url.match(/\/category\/([^/?]+)/)
    return m?.[1] ?? null
}

function extractGsCategoryId(slug: string | null): string | null {
    if (!slug) return null
    const m = slug.match(/_(\d+)$/)
    return m?.[1] ?? null
}

// ─── BULK UPSERT (startup) ────────────────────────────────────────────────────

/**
 * Upsert all categories from the loaded JSON list into gs_categories.
 * Safe to run on every scraper start. Returns Map<url, uuid>.
 */
export async function bulkUpsertCategories(
    db: DB,
    categories: CategoryEntry[],
): Promise<Map<string, string>> {
    const rows = categories.map(cat => {
        const slug = extractSlug(cat.url)
        return {
            url: cat.url,
            name: cat.name ?? null,
            slug,
            gs_category_id: extractGsCategoryId(slug),
        }
    })

    const BATCH = 200
    const allRows: { id: string; url: string }[] = []

    for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH)
        const { data, error } = await db
            .from('gs_categories')
            .upsert(batch, { onConflict: 'url' })
            .select('id, url')

        if (error) {
            console.error(`[db] gs_categories bulk upsert error (chunk ${i / BATCH + 1}):`, error.message)
        } else if (data) {
            allRows.push(...(data as { id: string; url: string }[]))
        }
    }

    const map = new Map<string, string>()
    for (const row of allRows) map.set(row.url, row.id)
    console.log(`[db] gs_categories: seeded ${map.size}/${categories.length} rows`)
    return map
}

// ─── SIGNALS UPSERT (per-category scrape) ────────────────────────────────────

export async function upsertGsCategorySignals(
    db: DB,
    payload: {
        url: string
        peopleAlsoSearch: string[]
        trending: string[]
        topCategories: string[]
    },
): Promise<void> {
    const { error } = await db
        .from('gs_categories')
        .upsert(
            {
                url: payload.url,
                people_also_search: payload.peopleAlsoSearch,
                trending: payload.trending,
                top_categories: payload.topCategories,
                scrape_status: 'scraped',
                last_scraped_at: new Date().toISOString(),
            },
            { onConflict: 'url' },
        )

    if (error) {
        console.error('[db] gs_categories signals upsert error:', error.message)
    }
}
