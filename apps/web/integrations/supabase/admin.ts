import { createClient } from '@supabase/supabase-js'
import type { Database } from '@puckora/types'

/**
 * Admin Supabase client — uses the service role key.
 * ONLY use this in webhook handlers and admin operations.
 * Never expose to the browser.
 */
export function createAdminClient() {
    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        },
    )
}
