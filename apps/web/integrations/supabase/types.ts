import { createClient } from '@supabase/supabase-js'
import type { Database } from '@puckora/types'
import type { createAdminClient } from './admin'
import type { createAnonClient } from './anon'
import type { createServerClient } from './server'

export type SupabaseServerClient = Awaited<ReturnType<typeof createServerClient>>
export type SupabaseAdminClient = ReturnType<typeof createAdminClient>
export type SupabaseAnonClient = ReturnType<typeof createAnonClient>
type SupabaseQueryClient = ReturnType<typeof createClient<Database>>

export type SupabaseDatabaseClient = Pick<SupabaseQueryClient, 'from'>