/**
 * Drizzle service layer — Amazon categories (Fly.io Postgres).
 *
 * Only amazon_categories exists in the current DB schema.
 * Other market data tables (trending_products, market_opportunities,
 * fba_fees_cache) are not yet implemented — add here when migrations land.
 */

import { eq, and, asc, ilike, sql } from 'drizzle-orm'
import { type PgDb, amazonCategories } from '@puckora/db'
import type {
    AmazonCategory,
    AmazonCategoryInsert,
    AmazonCategoryUpdate,
} from '@puckora/types'

// ---------------------------------------------------------------------------
// Amazon categories
// ---------------------------------------------------------------------------

export async function getCategoryById(
    db: PgDb,
    id: string,
): Promise<AmazonCategory | null> {
    const rows = await db
        .select()
        .from(amazonCategories)
        .where(eq(amazonCategories.id, id))
        .limit(1)
    return (rows[0] ?? null) as AmazonCategory | null
}

export async function getCategoriesByMarketplace(
    db: PgDb,
    marketplace: string,
    onlyLeaf = false,
): Promise<AmazonCategory[]> {
    const condition = onlyLeaf
        ? and(eq(amazonCategories.marketplace, marketplace), eq(amazonCategories.is_leaf, true))
        : eq(amazonCategories.marketplace, marketplace)

    const rows = await db
        .select()
        .from(amazonCategories)
        .where(condition)
        .orderBy(asc(amazonCategories.full_path))
    return rows as AmazonCategory[]
}

/**
 * Full-text search on category name or full_path.
 * Replaces the old Supabase RPC `search_categories` (which used pg_trgm).
 * This uses ILIKE for broad compatibility; a GIN-based setup can improve perf.
 */
export async function searchCategories(
    db: PgDb,
    query: string,
    marketplace: string,
    limit = 20,
): Promise<AmazonCategory[]> {
    const pattern = `%${query}%`
    const rows = await db
        .select()
        .from(amazonCategories)
        .where(
            and(
                eq(amazonCategories.marketplace, marketplace),
                ilike(amazonCategories.name, pattern),
            ),
        )
        .orderBy(asc(amazonCategories.full_path))
        .limit(limit)
    return rows as AmazonCategory[]
}

export async function upsertCategory(
    db: PgDb,
    category: AmazonCategoryInsert,
): Promise<AmazonCategory> {
    const rows = await db
        .insert(amazonCategories)
        .values(category as typeof amazonCategories.$inferInsert)
        .onConflictDoUpdate({
            target: amazonCategories.id,
            set: {
                name: sql`excluded.name`,
                full_path: sql`excluded.full_path`,
                depth: sql`excluded.depth`,
                breadcrumb: sql`excluded.breadcrumb`,
                is_leaf: sql`excluded.is_leaf`,
                marketplace: sql`excluded.marketplace`,
                parent_id: sql`excluded.parent_id`,
                bestsellers_url: sql`excluded.bestsellers_url`,
                scrape_status: sql`excluded.scrape_status`,
                last_scraped_at: sql`excluded.last_scraped_at`,
            },
        })
        .returning()
    return rows[0] as AmazonCategory
}

export async function updateCategoryStatus(
    db: PgDb,
    id: string,
    update: Pick<AmazonCategoryUpdate, 'scrape_status' | 'last_scraped_at'>,
): Promise<void> {
    await db
        .update(amazonCategories)
        .set(update as Partial<typeof amazonCategories.$inferInsert>)
        .where(eq(amazonCategories.id, id))
}
