/**
 * shared/cache.ts
 *
 * Generic append-only NDJSON cache helpers for the scraper suite.
 *
 * Each scraper defines its own entry type and uses these typed wrappers for
 * its own file (configured in its config.ts). Both scrapers can run
 * concurrently without conflict because they write to different files.
 *
 * Design:
 *  - initCache()     — truncate file at start of a fresh (non-resume) run
 *  - appendCache()   — append one entry; appendFileSync is atomic at OS level
 *  - loadCache()     — stream-read all entries; corrupted lines silently skipped
 */
import { appendFileSync, createReadStream, existsSync, writeFileSync } from 'fs'
import { createInterface } from 'readline'
import { log } from './logger'

export function initCache(file: string): void {
    writeFileSync(file, '', 'utf-8')
    log.info(`Cache cleared: ${file}`)
}

export function appendCache<T>(file: string, entry: T): void {
    appendFileSync(file, JSON.stringify(entry) + '\n', 'utf-8')
}

export async function loadCache<T>(file: string): Promise<{ entries: T[]; corrupted: number }> {
    const entries: T[] = []
    let corrupted = 0

    if (!existsSync(file)) {
        log.warn(`Cache file not found: ${file}`)
        return { entries, corrupted }
    }

    log.info(`Loading cache from ${file} …`)

    const rl = createInterface({
        input: createReadStream(file, { encoding: 'utf-8' }),
        crlfDelay: Infinity,
    })

    for await (const line of rl) {
        if (!line.trim()) continue
        try {
            entries.push(JSON.parse(line) as T)
        } catch {
            corrupted++
        }
    }

    if (corrupted > 0) log.warn(`Cache: ${corrupted} corrupted line(s) skipped`)
    return { entries, corrupted }
}
