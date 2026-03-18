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

function isConnectionRefusedError(error: unknown): error is NodeJS.ErrnoException {
    return !!error && typeof error === 'object' && 'code' in error && error.code === 'ECONNREFUSED'
}

function warnProxyFallback(proxyUrl: string, databaseUrl: string) {
    const warningKey = `${proxyUrl}=>${databaseUrl}`
    if (warnedFallbackUrls.has(warningKey)) return
    warnedFallbackUrls.add(warningKey)
    console.warn(
        `[db] DATABASE_PROXY_URL was unreachable; falling back to DATABASE_URL (${proxyUrl} -> ${databaseUrl})`,
    )
}

function createPool(databaseUrl: string): Pool {
    return new Pool({ connectionString: databaseUrl, ssl: false })
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
                if (!isConnectionRefusedError(error)) throw error
                warnProxyFallback(resolvedUrl, databaseUrl)
                return fallbackPool.query(...args)
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
                        if (!isConnectionRefusedError(error)) {
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
                if (!isConnectionRefusedError(error)) throw error
                return fallbackConnect()
            })
        }

        pool.connect = connectWithFallback
    }

    return drizzle(pool, { schema })
}
