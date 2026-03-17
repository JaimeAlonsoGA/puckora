import 'server-only'

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@puckora/types'

/**
 * Cookie-free anon Supabase client.
 *
 * Use this inside `unstable_cache()` callbacks where calling `cookies()`
 * is forbidden. Only suitable for reading public (non-auth-gated) data.
 *
 * For authenticated server reads use `createServerClient` from `./server`.
 */
export function createAnonClient() {
    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
}
