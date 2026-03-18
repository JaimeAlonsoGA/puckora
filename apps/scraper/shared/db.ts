/**
 * shared/db.ts
 *
 * Drizzle client factory for all scrapers.
 * Connects to Fly.io Postgres via DATABASE_URL.
 */
import { createDb as _createDb, type PgDb } from '@puckora/db'

export type DB = PgDb

export const IS_DEBUG =
    process.argv.includes('--upload-test') || process.argv.includes('--test')

export function createDb(): DB {
    const url = process.env['DATABASE_URL']
    if (!url) throw new Error('DATABASE_URL is not set — required for DB writes')
    return _createDb(url)
}
