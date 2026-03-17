/**
 * API configuration — origins and endpoint paths.
 *
 * Values come from build-time env vars (set in .env.local).
 * These are bundled into the extension at build time.
 */
export const WEB_APP_ORIGIN: string =
    import.meta.env.VITE_WEB_APP_ORIGIN ?? 'http://localhost:3000'

// Always accept localhost so the dev build works when VITE_WEB_APP_ORIGIN
// is set to the production URL. The manifest's externally_connectable already
// lists both, so this adds no new attack surface.
export const WEB_APP_ORIGINS: readonly string[] = Array.from(
    new Set([WEB_APP_ORIGIN, 'http://localhost:3000']),
)

export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? ''
export const SUPABASE_ANON_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const API = {
    SCRAPE_ENRICH: `${WEB_APP_ORIGIN}/api/scrape/enrich`,
} as const
