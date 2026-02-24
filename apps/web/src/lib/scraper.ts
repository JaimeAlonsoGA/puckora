/**
 * scraper.ts
 * ----------
 * Direct client for the Python scraper/SP-API backend.
 *
 * In development:  VITE_SCRAPER_URL=http://localhost:8000
 * In production:   VITE_SCRAPER_URL=https://silkflow-scraper.fly.dev
 *
 * Auth: forwards the Supabase JWT as a Bearer token. The Python backend
 * validates it directly against Supabase — no Edge Function in the middle.
 */
import { supabase } from './supabase'
import { ApiError } from './api'

const SCRAPER_BASE = import.meta.env.VITE_SCRAPER_URL ?? 'http://localhost:8000'

async function getAccessToken(forceRefresh = false): Promise<string> {
    if (forceRefresh) {
        const { data, error } = await supabase.auth.refreshSession()
        if (data.session?.access_token) return data.session.access_token
        window.location.href = '/auth/login'
        throw new ApiError(401, error?.message ?? 'Session expired')
    }
    const { data: { session }, error } = await supabase.auth.getSession()
    if (session?.access_token) return session.access_token
    throw new ApiError(401, error?.message ?? 'Not authenticated — please log in again.')
}

async function request<T>(method: string, path: string, body?: unknown, retry = true): Promise<T> {
    const token = await getAccessToken()

    const res = await fetch(`${SCRAPER_BASE}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    // On 401: refresh token once and retry
    if (res.status === 401 && retry) {
        await getAccessToken(true)
        return request<T>(method, path, body, false)
    }

    if (!res.ok) {
        const text = await res.text()
        let msg = res.statusText
        try {
            const parsed = JSON.parse(text) as { detail?: string; error?: string }
            msg = parsed.detail ?? parsed.error ?? msg
        } catch { /* noop */ }
        throw new ApiError(res.status, msg)
    }

    return res.json() as Promise<T>
}

export const scraper = {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
    patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
    delete: <T>(path: string) => request<T>('DELETE', path),
}
