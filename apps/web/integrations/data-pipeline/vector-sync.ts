import { syncAmazonProductVectorsOnce } from '@puckora/vectors'

const VECTOR_DB_ENV_KEYS = ['VECTOR_DATABASE_URL', 'LOCAL_VECTOR_DATABASE_URL'] as const
const SOURCE_DB_ENV_KEYS = ['DATABASE_PROXY_URL', 'DATABASE_URL'] as const
const VECTOR_SYNC_IGNORED_ERROR_CODES = new Set(['ECONNREFUSED', 'ENETUNREACH', 'ECONNRESET'])

let warnedUnavailableVectorSync = false

function hasConfiguredEnv(keys: readonly string[]): boolean {
    return keys.some((key) => Boolean(process.env[key]?.trim()))
}

function getErrorCode(error: unknown): string | null {
    if (!error || typeof error !== 'object') return null
    if ('code' in error && typeof error.code === 'string') return error.code
    if ('cause' in error) return getErrorCode(error.cause)
    return null
}

function isUnavailableVectorDatabaseError(error: unknown): boolean {
    const code = getErrorCode(error)
    return code != null && VECTOR_SYNC_IGNORED_ERROR_CODES.has(code)
}

function warnUnavailableVectorSync(error: unknown) {
    if (warnedUnavailableVectorSync) return
    warnedUnavailableVectorSync = true
    const code = getErrorCode(error) ?? 'UNKNOWN'
    console.warn(`[vector-sync] local vector database unavailable; skipping downstream sync (${code})`)
}

export async function syncAmazonProductVectorsDownstream(): Promise<void> {
    if (!hasConfiguredEnv(VECTOR_DB_ENV_KEYS) || !hasConfiguredEnv(SOURCE_DB_ENV_KEYS)) {
        return
    }

    try {
        await syncAmazonProductVectorsOnce()
    } catch (err) {
        if (isUnavailableVectorDatabaseError(err)) {
            warnUnavailableVectorSync(err)
            return
        }
        console.error('[vector-sync] downstream amazon product sync failed:', err)
    }
}