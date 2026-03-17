/**
 * shared/checkpoint.ts
 *
 * Generic checkpoint helpers for the scraper suite.
 * Each scraper defines its own checkpoint shape and uses these typed wrappers.
 *
 * Thread-safe in the sense that two scrapers with different checkpoint_file
 * paths never touch each other's state.
 */
import * as fs from 'fs'

export function loadCheckpoint<T>(file: string): T | null {
    if (!fs.existsSync(file)) return null
    try {
        return JSON.parse(fs.readFileSync(file, 'utf-8')) as T
    } catch {
        return null
    }
}

export function saveCheckpoint<T extends { updated_at: string }>(file: string, cp: T): void {
    cp.updated_at = new Date().toISOString()
    fs.writeFileSync(file, JSON.stringify(cp, null, 2), 'utf-8')
}

/**
 * Write a fresh checkpoint to disk immediately (overwrites any stale file)
 * and return it. Prevents confusion when inspecting state mid-run.
 */
export function freshCheckpoint<T extends { started_at: string; updated_at: string }>(
    file: string,
    initial: Omit<T, 'started_at' | 'updated_at'>,
): T {
    const now = new Date().toISOString()
    const cp = { ...initial, started_at: now, updated_at: now } as T
    fs.writeFileSync(file, JSON.stringify(cp, null, 2), 'utf-8')
    return cp
}
