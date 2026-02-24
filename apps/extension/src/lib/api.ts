/**
 * Extension API client — thin wrapper around the Silkflow backend.
 * Retrieves the auth token from chrome.storage on every call.
 */

const API_BASE = 'https://your-project.supabase.co/functions/v1'

async function getToken(): Promise<string | null> {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_AUTH_TOKEN' }, (res) => {
            resolve(res?.token ?? null)
        })
    })
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await getToken()
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers ?? {}),
        },
    })
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }))
        throw new Error(err?.error ?? 'API request failed')
    }
    return res.json() as Promise<T>
}

export const silkflowApi = {
    searchProducts: (query: string, marketplace = 'US', page = 1) =>
        apiFetch(`/products-search?q=${encodeURIComponent(query)}&marketplace=${marketplace}&page=${page}`),

    getProductDetail: (asin: string, marketplace = 'US') =>
        apiFetch(`/product-detail?asin=${asin}&marketplace=${marketplace}`),
}
