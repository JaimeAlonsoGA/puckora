/**
 * Login With Amazon (LWA) — OAuth2 client-credentials token manager.
 *
 * Caches the access token in module-level state (server process lifetime).
 * Re-fetches 60 seconds before expiry to avoid using a stale token during
 * a window where multiple requests are in-flight.
 *
 * Required env vars:
 *   SP_API_CLIENT_ID
 *   SP_API_CLIENT_SECRET
 *   SP_API_REFRESH_TOKEN  (seller-specific operations need delegated scope)
 */

import type { LwaTokenCache, LwaTokenResponse } from './types'

const LWA_TOKEN_URL = 'https://api.amazon.com/auth/o2/token'
/** Refresh this many seconds before expiry to avoid edge-race errors */
const EXPIRY_BUFFER_S = 60

// Module-level cache — lives as long as the Node.js/Edge process
let tokenCache: LwaTokenCache | null = null

function getCredentials() {
    const clientId = process.env.SP_CLIENT_ID
    const clientSecret = process.env.SP_CLIENT_SECRET
    if (!clientId || !clientSecret) {
        throw new Error(
            'SP_CLIENT_ID and SP_CLIENT_SECRET environment variables are required for SP-API',
        )
    }
    return { clientId, clientSecret }
}

/**
 * Fetch a fresh LWA access token using client credentials.
 * Call this when no cache exists or the cached token has expired.
 */
async function fetchAccessToken(): Promise<LwaTokenCache> {
    const { clientId, clientSecret } = getCredentials()
    const refreshToken = process.env.SP_REFRESH_TOKEN

    const body = new URLSearchParams({
        grant_type: refreshToken ? 'refresh_token' : 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        ...(refreshToken ? { refresh_token: refreshToken } : {}),
        ...(!refreshToken ? { scope: 'sellingpartnerapi::migration' } : {}),
    })

    const response = await fetch(LWA_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(
            `LWA token fetch failed: ${response.status} ${response.statusText} — ${text}`,
        )
    }

    const data: LwaTokenResponse = await response.json()
    const expiresAt = Date.now() + (data.expires_in - EXPIRY_BUFFER_S) * 1000

    return {
        accessToken: data.access_token,
        expiresAt,
    }
}

/**
 * Returns a valid LWA access token, re-fetching if cached token is near expiry.
 */
export async function getLwaAccessToken(): Promise<string> {
    if (tokenCache && Date.now() < tokenCache.expiresAt) {
        return tokenCache.accessToken
    }
    tokenCache = await fetchAccessToken()
    return tokenCache.accessToken
}

/** Force-invalidate the cached token (e.g. after a 401 response from SP-API). */
export function invalidateLwaToken(): void {
    tokenCache = null
}
