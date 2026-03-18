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
import { Pool } from 'pg'
import * as schema from './schema'

export type PgDb = ReturnType<typeof drizzle<typeof schema>>

export function resolveCatalogDatabaseUrl(databaseUrl: string): string {
    const proxyUrl = process.env['DATABASE_PROXY_URL']?.trim()
    return proxyUrl || databaseUrl
}

export function createDb(databaseUrl: string): PgDb {
    const pool = new Pool({ connectionString: resolveCatalogDatabaseUrl(databaseUrl), ssl: false })
    return drizzle(pool, { schema })
}
