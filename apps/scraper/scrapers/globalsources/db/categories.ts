/**
 * gs_categories DB operations — Drizzle/Fly.io version.
 */
import { eq, sql } from 'drizzle-orm'
import { gsCategories } from '@puckora/db'
import type { DB } from '../../../shared/db'

interface CategoryEntry {
    url: string
    name?: string
}

function extractSlug(url: string): string | null {
    const m = url.match(/\/category\/([^/?]+)/)
    return m?.[1] ?? null
}

function extractGsCategoryId(slug: string | null): string | null {
    if (!slug) return null
    const m = slug.match(/_(\d+)$/)
    return m?.[1] ?? null
}

/** Upsert all categories. Returns Map<url, uuid>. */
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
        try {
            const inserted = await db
                .insert(gsCategories)
                .values(batch)
                .onConflictDoUpdate({
                    target: gsCategories.url,
                    set: {
                        name: sql`excluded.name`,
                        slug: sql`excluded.slug`,
                        gs_category_id: sql`excluded.gs_category_id`,
                    },
                })
                .returning({ id: gsCategories.id, url: gsCategories.url })
            allRows.push(...inserted)
        } catch (err) {
            console.error(`[db] gs_categories bulk upsert error (chunk ${i / BATCH + 1}):`, (err as Error).message)
        }
    }

    const map = new Map<string, string>()
    for (const row of allRows) map.set(row.url, row.id)
    console.log(`[db] gs_categories: seeded ${map.size}/${categories.length} rows`)
    return map
}

export async function upsertGsCategorySignals(
    db: DB,
    payload: {
        url: string
        peopleAlsoSearch: string[]
        trending: string[]
        topCategories: string[]
    },
): Promise<void> {
    try {
        await db
            .insert(gsCategories)
            .values({
                url: payload.url,
                people_also_search: payload.peopleAlsoSearch,
                trending: payload.trending,
                top_categories: payload.topCategories,
                scrape_status: 'scraped',
                last_scraped_at: new Date().toISOString(),
            })
            .onConflictDoUpdate({
                target: gsCategories.url,
                set: {
                    people_also_search: sql`excluded.people_also_search`,
                    trending: sql`excluded.trending`,
                    top_categories: sql`excluded.top_categories`,
                    scrape_status: sql`excluded.scrape_status`,
                    last_scraped_at: sql`excluded.last_scraped_at`,
                },
            })
    } catch (err) {
        console.error('[db] gs_categories signals upsert error:', (err as Error).message)
    }
}

// ─── (end of file) ─────────────────────────────────────────────────────────
