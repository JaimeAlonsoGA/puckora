/**
 * Hard-cached Amazon category data.
 *
 * Categories (depth=1) are static — they never change in production.
 * unstable_cache persists the result across requests and deployments
 * (revalidate: false = infinite TTL). React.cache deduplicates within
 * a single render pass so the cache lookup only fires once per request.
 *
 * To manually bust: call revalidateTag('amazon-categories') from a
 * Server Action (e.g. after a scraper run that adds new categories).
 *
 * Only import this from Server Components / Server Actions.
 */
import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createAnonClient } from '@/integrations/supabase/anon'
import { getTopLevelCategories } from '@/services/categories'
import type { AmazonCategory } from '@puckora/types'

const _fetchTopCategories = unstable_cache(
    async (marketplace: string): Promise<AmazonCategory[]> => {
        return getTopLevelCategories(createAnonClient(), marketplace)
    },
    ['amazon-top-categories'],
    { revalidate: false, tags: ['amazon-categories'] },
)

/**
 * Returns depth=1 Amazon categories for the given marketplace.
 * Hard-cached forever (categories never change). Safe to call freely.
 */
export const getCachedTopCategories = cache(
    (marketplace = 'US') => _fetchTopCategories(marketplace),
)
