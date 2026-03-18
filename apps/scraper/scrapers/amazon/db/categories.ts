import { eq, inArray, and, asc } from 'drizzle-orm'
import type { InferInsertModel } from 'drizzle-orm'
import { amazonCategories } from '@puckora/db'
import type { AmazonCategoryInsert } from '@puckora/types'
import type { CategoryNode, CategoryRankRow } from '../types'
import { log } from '../../../shared/logger'
import { AMAZON_CONFIG } from '../config'
import { CATEGORY_SCRAPE_STATUS } from '@puckora/scraper-core'
import { categorySlugFromPath } from './slugs'
import type { DB } from '../../../shared/db'

type CategoryUpdate = Partial<InferInsertModel<typeof amazonCategories>>

function buildPlaceholderCategory(rank: CategoryRankRow): AmazonCategoryInsert {
    const name = rank.category_name?.trim() || `Amazon category ${rank.category_id}`

    return {
        id: rank.category_id,
        name,
        full_path: name,
        depth: 0,
        breadcrumb: [name],
        is_leaf: false,
        marketplace: AMAZON_CONFIG.marketplace,
        parent_id: null,
        bestsellers_url: null,
        scrape_status: CATEGORY_SCRAPE_STATUS.SCRAPED,
        last_scraped_at: null,
    }
}

export async function ensureRankCategoriesExist(db: DB, rows: CategoryRankRow[]): Promise<void> {
    const categoryMap = new Map<string, CategoryRankRow>()
    for (const row of rows) {
        if (!categoryMap.has(row.category_id)) categoryMap.set(row.category_id, row)
    }

    const categoryIds = [...categoryMap.keys()]
    if (categoryIds.length === 0) return

    const existing = await db
        .select({ id: amazonCategories.id })
        .from(amazonCategories)
        .where(and(
            eq(amazonCategories.marketplace, AMAZON_CONFIG.marketplace),
            inArray(amazonCategories.id, categoryIds),
        ))

    const existingIds = new Set(existing.map((row) => row.id))
    const placeholderRows = categoryIds
        .filter((categoryId) => !existingIds.has(categoryId))
        .map((categoryId) => buildPlaceholderCategory(categoryMap.get(categoryId)!))

    if (placeholderRows.length === 0) return

    log.warn(`Creating ${placeholderRows.length} placeholder Amazon categories for SP-API rank classifications`)

    try {
        await db
            .insert(amazonCategories)
            .values(placeholderRows as InferInsertModel<typeof amazonCategories>[])
            .onConflictDoNothing()
    } catch (err) {
        log.db.error('amazon_categories', 'ensureRankCategoriesExist', err as Error)
        throw err
    }
}

export async function markCategoryScraped(db: DB, categoryId: string): Promise<void> {
    try {
        await db
            .update(amazonCategories)
            .set({ scrape_status: CATEGORY_SCRAPE_STATUS.SCRAPED as 'scraped', last_scraped_at: new Date().toISOString() })
            .where(eq(amazonCategories.id, categoryId))
    } catch (err) {
        log.db.error('amazon_categories', 'markScraped', err as Error, categoryId)
    }
}

export async function markCategoryFailed(db: DB, categoryId: string): Promise<void> {
    try {
        await db
            .update(amazonCategories)
            .set({ scrape_status: CATEGORY_SCRAPE_STATUS.FAILED as 'failed' })
            .where(eq(amazonCategories.id, categoryId))
    } catch (err) {
        log.db.error('amazon_categories', 'markFailed', err as Error, categoryId)
    }
}

/** Load pending/failed categories from Fly.io Postgres. */
export async function loadCategories(
    db: DB,
    opts: { singleId?: string } = {},
): Promise<CategoryNode[]> {
    if (opts.singleId) {
        const rows = await db
            .select({
                id: amazonCategories.id,
                name: amazonCategories.name,
                full_path: amazonCategories.full_path,
                depth: amazonCategories.depth,
                bestsellers_url: amazonCategories.bestsellers_url,
            })
            .from(amazonCategories)
            .where(and(
                eq(amazonCategories.marketplace, AMAZON_CONFIG.marketplace),
                eq(amazonCategories.id, opts.singleId),
            ))

        if (!rows.length) throw new Error('No categories found — run the import script first')
        return rows.map(r => ({
            id: r.id,
            name: r.name,
            full_path: r.full_path,
            depth: r.depth,
            bestsellers_url: r.bestsellers_url ?? `https://www.amazon.com/gp/bestsellers/${categorySlugFromPath(r.full_path)}/${r.id}?pg=1`,
        }))
    }

    const rows = await db
        .select({
            id: amazonCategories.id,
            name: amazonCategories.name,
            full_path: amazonCategories.full_path,
            depth: amazonCategories.depth,
            bestsellers_url: amazonCategories.bestsellers_url,
        })
        .from(amazonCategories)
        .where(and(
            eq(amazonCategories.marketplace, AMAZON_CONFIG.marketplace),
            inArray(amazonCategories.scrape_status, [
                CATEGORY_SCRAPE_STATUS.PENDING as 'pending',
                CATEGORY_SCRAPE_STATUS.FAILED as 'failed',
            ]),
        ))
        .orderBy(asc(amazonCategories.depth))

    if (!rows.length) throw new Error('No categories found — run the import script first')

    return rows.map(r => ({
        id: r.id,
        name: r.name,
        full_path: r.full_path,
        depth: r.depth,
        bestsellers_url: r.bestsellers_url
            ?? `https://www.amazon.com/gp/bestsellers/${categorySlugFromPath(r.full_path)}/${r.id}?pg=1`,
    }))
}
