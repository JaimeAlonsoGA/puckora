/**
 * App-local user types for the public.users table.
 *
 * These types are used until `@puckora/types` gains generated DB types
 * (run `npm run gen:types` after the migration to eliminate this file).
 */

import type { AmazonMarketplace, AppLanguage } from '@puckora/types'

/** Full row from public.users */
export interface AppUser {
    id: string
    email: string
    display_name: string | null
    avatar_url: string | null
    marketplace: AmazonMarketplace
    language: AppLanguage
    created_at: string
    updated_at: string
}

/** Writable subset — mirrors SettingsUpdateInput from @puckora/types/schemas */
export interface AppUserUpdate {
    display_name?: string | null
    avatar_url?: string | null
    marketplace?: AmazonMarketplace
    language?: AppLanguage
}
