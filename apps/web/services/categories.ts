/**
 * Supabase service layer — Amazon categories.
 *
 * Raw DB access. Called only from server/ RSC wrappers or API routes.
 */

import type { AmazonCategory } from '@puckora/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseInstance = any

/**
 * Returns the top-level (depth=1) Amazon categories for the given marketplace.
 * Ordered alphabetically by name.
 */
export async function getTopLevelCategories(
    supabase: SupabaseInstance,
    marketplace = 'US',
): Promise<AmazonCategory[]> {
    const { data, error } = await supabase
        .from('amazon_categories')
        .select('*')
        .eq('marketplace', marketplace)
        .eq('depth', 1)
        .order('name')

    if (error) throw new Error(`getTopLevelCategories failed: ${error.message}`)
    return (data ?? []) as AmazonCategory[]
}
