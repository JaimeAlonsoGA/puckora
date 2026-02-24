import { supabase } from './supabase'

const EDGE_FUNCTIONS_BASE = import.meta.env.VITE_SUPABASE_URL + '/functions/v1'

/** Carries the HTTP status code so callers and the query client can act on it. */
export class ApiError extends Error {
    constructor(public readonly status: number, message: string) {
        super(message)
        this.name = 'ApiError'
    }
}

/**
 * Returns a fresh Bearer token.
 *
 * Strategy:
 * 1. Try getSession() — the Supabase client auto-refreshes before expiry, so
 *    this is almost always sufficient.
 * 2. On a genuine 401 from the server (expired token that wasn't auto-refreshed)
 *    we call refreshSession() once.  We do NOT call refreshSession() proactively
 *    on every request because if no refresh token exists yet it clears the session.
 */
async function getAccessToken(forceRefresh = false): Promise<string> {
    if (forceRefresh) {
        const { data, error } = await supabase.auth.refreshSession()
        if (data.session?.access_token) return data.session.access_token
        // Refresh failed — session is truly gone, send to login
        window.location.href = '/auth/login'
        throw new ApiError(401, error?.message ?? 'Session expired')
    }

    const { data: { session }, error } = await supabase.auth.getSession()
    if (session?.access_token) return session.access_token
    throw new ApiError(401, error?.message ?? 'Not authenticated — please log in again.')
}

async function request<T>(method: string, path: string, body?: unknown, retry = true): Promise<T> {
    const token = await getAccessToken()

    const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
    }

    console.debug('[API] Request:', { method, path, headerKeys: Object.keys(headers) })

    const res = await fetch(`${EDGE_FUNCTIONS_BASE}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    // On 401: refresh the token once and retry the request
    if (res.status === 401 && retry) {
        await getAccessToken(true)   // throws + redirects if refresh fails
        return request<T>(method, path, body, false)
    }

    if (!res.ok) {
        const text = await res.text()
        let errorData: { message?: string; code?: number } = { message: res.statusText }
        try { errorData = JSON.parse(text) } catch { errorData = { message: text || res.statusText } }
        console.error('[API] Error response:', { status: res.status, error: errorData })
        throw new ApiError(res.status, errorData.message ?? `Request failed with ${res.status}`)
    }

    return res.json() as Promise<T>
}

export const api = {
    get: <T>(path: string) => request<T>('GET', path),
    post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
    patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
    delete: <T>(path: string) => request<T>('DELETE', path),
}
