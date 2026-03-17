import type { CategoryNode } from '../types'
import { log } from '../../../shared/logger'
import { AMAZON_CONFIG } from '../config'
import { CATEGORY_SCRAPE_STATUS } from '@puckora/scraper-core'
import { categorySlugFromPath } from './slugs'
import type { DB } from '../../../shared/db'

export async function markCategoryScraped(db: DB, categoryId: string): Promise<void> {
    const { error } = await db
        .from('amazon_categories')
        .update({ scrape_status: CATEGORY_SCRAPE_STATUS.SCRAPED, last_scraped_at: new Date().toISOString() })
        .eq('id', categoryId)
    if (error) log.db.error('amazon_categories', 'markScraped', error, categoryId)
}

export async function markCategoryFailed(db: DB, categoryId: string): Promise<void> {
    const { error } = await db
        .from('amazon_categories')
        .update({ scrape_status: CATEGORY_SCRAPE_STATUS.FAILED })
        .eq('id', categoryId)
    if (error) log.db.error('amazon_categories', 'markFailed', error, categoryId)
}

export async function loadCategoriesFromSupabase(
    supabase: DB,
    opts: { singleId?: string } = {},
): Promise<CategoryNode[]> {
    if (opts.singleId) {
        const { data, error } = await supabase
            .from('amazon_categories')
            .select('id, name, full_path, depth, bestsellers_url')
            .eq('marketplace', AMAZON_CONFIG.marketplace)
            .eq('id', opts.singleId)
        if (error) throw new Error(`Failed to load categories: ${error.message}`)
        if (!data?.length) throw new Error('No categories found — run the import script first')
        return data.map(r => ({
            id: r.id,
            name: r.name,
            full_path: r.full_path,
            depth: r.depth,
            bestsellers_url: r.bestsellers_url ?? '',
        }))
    }

    // Paginate in 1000-row pages — PostgREST default cap is 1000
    const PAGE = 1000
    const all: Array<{ id: string; name: string; full_path: string; depth: number; bestsellers_url: string | null }> = []
    let from = 0
    while (true) {
        const { data, error } = await supabase
            .from('amazon_categories')
            .select('id, name, full_path, depth, bestsellers_url')
            .eq('marketplace', AMAZON_CONFIG.marketplace)
            .in('scrape_status', [CATEGORY_SCRAPE_STATUS.PENDING, CATEGORY_SCRAPE_STATUS.FAILED])
            .range(from, from + PAGE - 1)
        if (error) throw new Error(`Failed to load categories: ${error.message}`)
        if (!data?.length) break
        all.push(...data)
        if (data.length < PAGE) break
        from += PAGE
    }

    if (!all.length) throw new Error('No categories found — run the import script first')

    // Sort shallowest first: broad categories (d2–d3) almost always have Best Sellers;
    // deep legacy/niche nodes (d7–d8) tend to be empty.
    all.sort((a, b) => a.depth - b.depth)

    return all.map(r => ({
        id: r.id,
        name: r.name,
        full_path: r.full_path,
        depth: r.depth,
        bestsellers_url: r.bestsellers_url
            ?? `https://www.amazon.com/gp/bestsellers/${categorySlugFromPath(r.full_path)}/${r.id}?pg=1`,
    }))
}
