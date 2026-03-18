/**
 * Drizzle service layer — Amazon categories (Fly.io Postgres).
 *
 * Raw DB access. Called only from server/ RSC wrappers or API routes.
 */

import { eq, asc, and } from 'drizzle-orm'
import { type PgDb, amazonCategories } from '@puckora/db'
import type { AmazonCategory } from '@puckora/types'
import { DEFAULT_WEB_MARKETPLACE, type WebMarketplaceId } from '@/constants/amazon-marketplace'

/**
 * Returns the top-level (depth=1) Amazon categories for the given marketplace.
 * Ordered alphabetically by name.
 */
export async function getTopLevelCategories(
    db: PgDb,
    marketplace: WebMarketplaceId = DEFAULT_WEB_MARKETPLACE,
): Promise<AmazonCategory[]> {
    const rows = await db
        .select()
        .from(amazonCategories)
        .where(and(eq(amazonCategories.marketplace, marketplace), eq(amazonCategories.depth, 1)))
        .orderBy(asc(amazonCategories.name))
    return rows as AmazonCategory[]
}
