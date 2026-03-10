/**
 * SP-API internal HTTP plumbing — token manager, HTTP client, unit converters.
 * Not part of the public surface; consumed only by catalog.ts and fees.ts.
 */
import { CONFIG } from '../config'
import { log } from '../logger'
import type { SpApiDimension, SpApiDimensions } from './types'

// ─── TOKEN MANAGER ───────────────────────────────────────────────────────────

interface AccessToken {
    value: string
    expires_at: number  // epoch ms
}

let _token: AccessToken | null = null

export async function getAccessToken(): Promise<string> {
    const now = Date.now()
    if (_token && _token.expires_at - now > 60_000) return _token.value

    const res = await fetch('https://api.amazon.com/auth/o2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: CONFIG.sp_refresh_token,
            client_id: CONFIG.sp_client_id,
            client_secret: CONFIG.sp_client_secret,
        }),
    })

    if (!res.ok) {
        const body = await res.text()
        throw new Error(`SP-API token refresh failed: ${res.status} ${body}`)
    }

    const data = await res.json() as { access_token: string; expires_in: number }
    _token = {
        value: data.access_token,
        expires_at: now + data.expires_in * 1_000,
    }

    log.api('Access token refreshed')
    return _token.value
}

// ─── HTTP CLIENT ─────────────────────────────────────────────────────────────

export async function sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms))
}

export async function spApiCall<T>(
    url: string,
    options: RequestInit = {},
    attempt = 0,
): Promise<T | null> {
    const token = await getAccessToken()

    const res = await fetch(url, {
        ...options,
        headers: {
            'x-amz-access-token': token,
            'Content-Type': 'application/json',
            ...(options.headers ?? {}),
        },
    })

    // Rate throttled
    if (res.status === 429) {
        if (attempt >= CONFIG.spapi_retry_max) {
            log.warn(`SP-API 429 — max retries reached for ${url}`)
            return null
        }
        log.warn(`SP-API 429 — waiting ${CONFIG.spapi_retry_on_429_ms / 1000}s (attempt ${attempt + 1})`)
        await sleep(CONFIG.spapi_retry_on_429_ms)
        return spApiCall<T>(url, options, attempt + 1)
    }

    // Server error
    if (res.status === 503) {
        if (attempt >= CONFIG.spapi_retry_max) {
            log.warn(`SP-API 503 — max retries reached`)
            return null
        }
        log.warn(`SP-API 503 — waiting ${CONFIG.spapi_retry_on_503_ms / 1000}s (attempt ${attempt + 1})`)
        await sleep(CONFIG.spapi_retry_on_503_ms)
        return spApiCall<T>(url, options, attempt + 1)
    }

    // Product not found — not an error, just no data
    if (res.status === 404) return null

    if (!res.ok) {
        const body = await res.text()
        log.warn(`SP-API ${res.status} for ${url}: ${body.slice(0, 200)}`)
        if (attempt < CONFIG.spapi_retry_max) {
            await sleep(5_000)
            return spApiCall<T>(url, options, attempt + 1)
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
    return Math.round(v * 100) / 100  // assume cm if unknown unit
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
