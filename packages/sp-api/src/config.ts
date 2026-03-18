/**
 * SP-API runtime configuration — reads environment variables at call time.
 *
 * Reading at call time (not at module load) makes the package safe in both
 * Node.js (apps/scraper) and Next.js Edge/Node runtimes (apps/web) without
 * any wiring or provider setup.
 *
 * Required env vars:
 *   SP_CLIENT_ID       — LWA application client ID
 *   SP_CLIENT_SECRET   — LWA application client secret
 *
 * Optional env vars:
 *   SP_REFRESH_TOKEN         — seller-specific delegated access (most endpoints need this)
 *   SP_MARKETPLACE_ID        — SP-API marketplace ID, defaults to ATVPDKIKX0DER (US)
 *   SP_CATALOG_INTERVAL_MS   — min ms between getCatalogItem calls, default 700
 *   SP_RETRY_MAX             — max retry attempts on 429/503, default 3
 *   SP_RETRY_ON_429_MS       — fallback wait on 429 when no Retry-After header, default 60000
 *   SP_RETRY_ON_503_MS       — wait on 503, default 120000
 */

const DEFAULT_MARKETPLACE_ID = 'ATVPDKIKX0DER'  // US

function readEnvOrDefault(key: string, fallback: string): string {
    const value = process.env[key]?.trim()
    return value ? value : fallback
}

export interface SpApiConfig {
    clientId: string
    clientSecret: string
    /** Seller-specific refresh token — undefined when using client_credentials scope. */
    refreshToken: string | undefined
    marketplaceId: string
    catalogIntervalMs: number
    retryMax: number
    retryOn429Ms: number
    retryOn503Ms: number
    feesBatchIntervalMs: number
}

export function getSpApiConfig(): SpApiConfig {
    const clientId = process.env.SP_CLIENT_ID
    const clientSecret = process.env.SP_CLIENT_SECRET
    if (!clientId || !clientSecret) {
        throw new Error(
            'SP_CLIENT_ID and SP_CLIENT_SECRET environment variables are required for SP-API',
        )
    }
    return {
        clientId,
        clientSecret,
        refreshToken: process.env.SP_REFRESH_TOKEN,
        marketplaceId: readEnvOrDefault('SP_MARKETPLACE_ID', DEFAULT_MARKETPLACE_ID),
        catalogIntervalMs: Number(process.env.SP_CATALOG_INTERVAL_MS ?? '700'),
        retryMax: Number(process.env.SP_RETRY_MAX ?? '3'),
        retryOn429Ms: Number(process.env.SP_RETRY_ON_429_MS ?? '60000'),
        retryOn503Ms: Number(process.env.SP_RETRY_ON_503_MS ?? '120000'),
        feesBatchIntervalMs: Number(process.env.SP_FEES_BATCH_INTERVAL_MS ?? '2500'),
    }
}
