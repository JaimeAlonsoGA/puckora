/**
 * SP-API HTTP plumbing — token manager, request helper, unit converters.
 *
 * Design principles:
 *  - LWA tokens are cached in module-level state for the process lifetime;
 *    a 401 response forces an immediate invalidation + single retry.
 *  - Retry logic mirrors Amazon's documented behaviour: Retry-After is always
 *    honoured on 429; 503 backs off for a configurable period; all other errors
 *    retry up to retryMax times with a 5 s gap.
 *  - Unit converters produce metric values with consistent rounding.
 */

import { getSpApiConfig } from './config'
import { noteRateLimit } from './rate-limiter'
import type { LwaTokenCache, LwaTokenResponse, SpApiDimension, SpApiDimensions } from './types'

const LWA_TOKEN_URL = 'https://api.amazon.com/auth/o2/token'
/** Refresh this many seconds before expiry to avoid edge-race errors */
const EXPIRY_BUFFER_S = 60

// ─── LWA TOKEN MANAGER ───────────────────────────────────────────────────────

// Module-level cache — lives as long as the Node.js / Edge process
let _tokenCache: LwaTokenCache | null = null

async function fetchLwaToken(): Promise<LwaTokenCache> {
    const cfg = getSpApiConfig()

    const body = new URLSearchParams({
        grant_type: cfg.refreshToken ? 'refresh_token' : 'client_credentials',
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        ...(cfg.refreshToken ? { refresh_token: cfg.refreshToken } : {}),
        ...(!cfg.refreshToken ? { scope: 'sellingpartnerapi::migration' } : {}),
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
    return {
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in - EXPIRY_BUFFER_S) * 1000,
    }
}

/** Returns a valid LWA access token, re-fetching if the cached token is near expiry. */
export async function getLwaAccessToken(): Promise<string> {
    if (_tokenCache && Date.now() < _tokenCache.expiresAt) {
        return _tokenCache.accessToken
    }
    _tokenCache = await fetchLwaToken()
    return _tokenCache.accessToken
}

/** Force-invalidate the cached token (e.g. after receiving a 401 from SP-API). */
export function invalidateLwaToken(): void {
    _tokenCache = null
}

// ─── UTILITIES ────────────────────────────────────────────────────────────────

export function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms))
}

// ─── HTTP CLIENT ─────────────────────────────────────────────────────────────

/**
 * Core SP-API HTTP request helper.
 *
 * Features:
 *  - Attaches LWA access token automatically
 *  - Retries with Retry-After on 429
 *  - Retries with backoff on 503
 *  - Retries with token invalidation on 401 (once)
 *  - Returns null on 404 (product not found — not an error)
 *  - Returns null when retryMax is exhausted (caller decides how to handle)
 *
 * Pass `attempt` only when recursing internally.
 */
export async function spApiCall<T>(
    url: string,
    options: RequestInit = {},
    attempt = 0,
    operation = 'default',
): Promise<T | null> {
    const cfg = getSpApiConfig()
    const token = await getLwaAccessToken()

    const res = await fetch(url, {
        ...options,
        headers: {
            'x-amz-access-token': token,
            'Content-Type': 'application/json',
            ...(options.headers ?? {}),
        },
        signal: AbortSignal.timeout(30_000),
    })

    // 401 — token rejected; invalidate + retry once
    if (res.status === 401 && attempt === 0) {
        invalidateLwaToken()
        return spApiCall<T>(url, options, attempt + 1, operation)
    }

    // 429 — honour Retry-After when present; fall back to configured value
    if (res.status === 429) {
        if (attempt >= cfg.retryMax) {
            console.warn(`SP-API ${operation} 429 — max retries reached for ${url}`)
            return null
        }
        const retryAfterSec = parseFloat(res.headers.get('Retry-After') ?? '')
        const waitMs = Number.isFinite(retryAfterSec) && retryAfterSec > 0
            ? Math.ceil(retryAfterSec * 1_000) + 200   // Amazon's header + 200 ms buffer
            : cfg.retryOn429Ms                          // fallback
        noteRateLimit(operation, waitMs)
        console.warn(`SP-API ${operation} 429 — waiting ${(waitMs / 1_000).toFixed(1)}s (attempt ${attempt + 1})`)
        await sleep(waitMs)
        return spApiCall<T>(url, options, attempt + 1, operation)
    }

    // 503 — server error, back off
    if (res.status === 503) {
        if (attempt >= cfg.retryMax) {
            console.warn(`SP-API ${operation} 503 — max retries reached for ${url}`)
            return null
        }
        console.warn(`SP-API ${operation} 503 — waiting ${cfg.retryOn503Ms / 1000}s (attempt ${attempt + 1})`)
        await sleep(cfg.retryOn503Ms)
        return spApiCall<T>(url, options, attempt + 1, operation)
    }

    // 404 — product not found in marketplace; not an error
    if (res.status === 404) return null

    // Other non-OK: log + retry with short backoff
    if (!res.ok) {
        const body = await res.text()
        console.warn(`SP-API ${operation} ${res.status} for ${url}: ${body.slice(0, 200)}`)
        if (attempt < cfg.retryMax) {
            await sleep(5_000)
            return spApiCall<T>(url, options, attempt + 1, operation)
        }
        return null
    }

    return res.json() as Promise<T>
}

// ─── UNIT CONVERTERS ─────────────────────────────────────────────────────────

export function toCm(d: SpApiDimension | undefined): number | null {
    if (!d || d.value == null) return null
    const v = Number(d.value)
    if (!isFinite(v)) return null
    if (d.unit === 'inches') return Math.round(v * 2.54 * 100) / 100
    if (d.unit === 'centimeters') return Math.round(v * 100) / 100
    if (d.unit === 'feet') return Math.round(v * 30.48 * 100) / 100
    return Math.round(v * 100) / 100  // assume cm if unit unknown
}

export function toKg(d: SpApiDimension | undefined): number | null {
    if (!d || d.value == null) return null
    const v = Number(d.value)
    if (!isFinite(v)) return null
    if (d.unit === 'pounds') return Math.round(v * 0.453592 * 10000) / 10000
    if (d.unit === 'kilograms') return Math.round(v * 10000) / 10000
    if (d.unit === 'ounces') return Math.round(v * 0.0283495 * 10000) / 10000
    if (d.unit === 'grams') return Math.round(v / 1000 * 10000) / 10000
    return Math.round(v * 10000) / 10000  // assume kg
}

export function parseDimensions(dims: SpApiDimensions | undefined) {
    return {
        length_cm: toCm(dims?.length),
        width_cm: toCm(dims?.width),
        height_cm: toCm(dims?.height),
        weight_kg: toKg(dims?.weight),
    }
}
