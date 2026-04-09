/**
 * Drizzle client factory.
 *
 * Usage in scraper:
 *   import { createDb } from '@puckora/db'
 *   const db = createDb(process.env.DATABASE_URL!)
 *
 * Usage in web app (server-only):
 *   import { createDb } from '@puckora/db'
 *   const db = createDb(process.env.DATABASE_URL!)
 *
 * `DATABASE_URL` must point to the Fly.io Postgres instance.
 */
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool, type PoolClient } from 'pg'
import * as schema from './schema'

export type PgDb = ReturnType<typeof drizzle<typeof schema>>

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1'])
const warnedFallbackUrls = new Set<string>()

export function resolveCatalogDatabaseUrl(databaseUrl: string): string {
    const proxyUrl = process.env['DATABASE_PROXY_URL']?.trim()
    return proxyUrl || databaseUrl
}

function isLoopbackUrl(value: string): boolean {
    try {
        return LOOPBACK_HOSTS.has(new URL(value).hostname)
    } catch {
        return false
    }
}

// ECONNREFUSED = proxy port not listening; ENETUNREACH = proxy up but WireGuard tunnel broken;
// ETIMEDOUT    = proxy accepted connection but tunnel timed out.
// All three mean "proxy is not forwarding" and should trigger the local-proxy fallback path.
function isProxyUnreachableError(error: unknown): error is NodeJS.ErrnoException {
    if (!error || typeof error !== 'object' || !('code' in error)) return false
    const code = (error as NodeJS.ErrnoException).code
    return code === 'ECONNREFUSED' || code === 'ENETUNREACH' || code === 'ETIMEDOUT'
}

function warnProxyFallback(proxyUrl: string, databaseUrl: string) {
    const warningKey = `${proxyUrl}=>${databaseUrl}`
    if (warnedFallbackUrls.has(warningKey)) return
    warnedFallbackUrls.add(warningKey)
    console.warn(
        `[db] DATABASE_PROXY_URL was unreachable; falling back to DATABASE_URL (${proxyUrl} -> ${databaseUrl})`,
    )
}

function normalizeConnectionUrl(url: string): string {
    try {
        const parsed = new URL(url)
        const mode = parsed.searchParams.get('sslmode')
        // These three modes generate a deprecation warning in pg-connection-string >= 2.7;
        // they are currently aliases for 'verify-full'. Replace them explicitly so the
        // warning is suppressed without changing the runtime SSL behaviour.
        if (mode === 'prefer' || mode === 'require' || mode === 'verify-ca') {
            parsed.searchParams.set('sslmode', 'verify-full')
        }
        return parsed.toString()
    } catch {
        return url
    }
}

function createPool(databaseUrl: string): Pool {
    return new Pool({
        connectionString: normalizeConnectionUrl(databaseUrl),
        ssl: false,
        max: 10,
        connectionTimeoutMillis: 10_000,
        options: '--statement_timeout=30000',
    })
}

function createDone(client: PoolClient) {
    return (release?: any) => client.release(release)
}

export function createDb(databaseUrl: string): PgDb {
    const resolvedUrl = resolveCatalogDatabaseUrl(databaseUrl)
    const shouldUseFallbackPool = resolvedUrl !== databaseUrl && isLoopbackUrl(resolvedUrl)

    const pool = createPool(resolvedUrl)

    if (shouldUseFallbackPool) {
        const fallbackPool = createPool(databaseUrl)
        const originalQuery = pool.query.bind(pool)
        const originalConnect = pool.connect.bind(pool)

        pool.query = (async (...args: Parameters<Pool['query']>) => {
            try {
                return await originalQuery(...args)
            } catch (error) {
                if (!isProxyUnreachableError(error)) throw error
                warnProxyFallback(resolvedUrl, databaseUrl)
                try {
                    return await fallbackPool.query(...args)
                } catch (fallbackError) {
                    if (isProxyUnreachableError(fallbackError)) {
                        throw new Error(
                            `[db] Catalog database is unreachable. ` +
                            `Ensure the Fly proxy is running: fly proxy --app puckora-db 15432:5432. ` +
                            `(proxy=${resolvedUrl}, direct=${databaseUrl})`,
                        )
                    }
                    throw fallbackError
                }
            }
        }) as Pool['query']

        function fallbackConnect(): Promise<PoolClient> {
            warnProxyFallback(resolvedUrl, databaseUrl)
            return fallbackPool.connect()
        }

        function connectWithFallback(): Promise<PoolClient>
        function connectWithFallback(
            callback: (err: Error | undefined, client: PoolClient | undefined, done: (release?: any) => void) => void,
        ): void
        function connectWithFallback(
            callback?: (err: Error | undefined, client: PoolClient | undefined, done: (release?: any) => void) => void,
        ): Promise<PoolClient> | void {
            if (callback) {
                originalConnect()
                    .then((client) => callback(undefined, client, createDone(client)))
                    .catch((error) => {
                        if (!isProxyUnreachableError(error)) {
                            callback(error as Error, undefined, () => undefined)
                            return
                        }

                        fallbackConnect()
                            .then((client) => callback(undefined, client, createDone(client)))
                            .catch((fallbackError) => callback(fallbackError as Error, undefined, () => undefined))
                    })
                return
            }

            return originalConnect().catch((error) => {
                if (!isProxyUnreachableError(error)) throw error
                return fallbackConnect()
            })
        }

        pool.connect = connectWithFallback
    }

    return drizzle(pool, { schema })
}
