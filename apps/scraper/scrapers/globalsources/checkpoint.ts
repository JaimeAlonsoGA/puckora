/**
 * scrapers/globalsources/checkpoint.ts
 *
 * GlobalSources checkpoint shape + typed wrappers around shared helpers.
 * Uses checkpoint-gs.json — parallel-safe with the Amazon checkpoint.json.
 */
import {
    loadCheckpoint as _load,
    saveCheckpoint as _save,
    freshCheckpoint as _fresh,
} from '../../shared/checkpoint'
import { GS_CONFIG } from './config'

export interface GsCheckpoint {
    /** Category URLs fully processed (all products scraped or empty). */
    scraped_urls: string[]
    /** Category URLs where Phase 1 listing was blocked or errored. */
    failed_urls: string[]
    started_at: string
    updated_at: string
}

export const loadCheckpoint = (): GsCheckpoint | null =>
    _load<GsCheckpoint>(GS_CONFIG.checkpoint_file)

export const saveCheckpoint = (cp: GsCheckpoint): void =>
    _save(GS_CONFIG.checkpoint_file, cp)

export const freshCheckpoint = (): GsCheckpoint =>
    _fresh<GsCheckpoint>(GS_CONFIG.checkpoint_file, {
        scraped_urls: [],
        failed_urls: [],
    })
