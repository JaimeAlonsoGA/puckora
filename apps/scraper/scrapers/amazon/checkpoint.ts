/**
 * scrapers/amazon/checkpoint.ts
 *
 * Amazon-specific checkpoint shape + typed wrappers around shared helpers.
 *
 * Two-phase run: Phase 1 scrapes Best Sellers pages (tracking category IDs),
 * Phase 2 enriches ASINs via SP-API (tracking enriched/failed ASINs).
 */
import {
    loadCheckpoint as _load,
    saveCheckpoint as _save,
    freshCheckpoint as _fresh,
} from '../../shared/checkpoint'
import { AMAZON_CONFIG } from './config'

export interface AmazonCheckpoint {
    phase: 'scraping' | 'enriching' | 'done'
    scraped_ids: string[]
    failed_scrapes: string[]
    enriched_asins: string[]
    failed_asins: string[]
    started_at: string
    updated_at: string
}

export const loadCheckpoint = (): AmazonCheckpoint | null =>
    _load<AmazonCheckpoint>(AMAZON_CONFIG.checkpoint_file)

export const saveCheckpoint = (cp: AmazonCheckpoint): void =>
    _save(AMAZON_CONFIG.checkpoint_file, cp)

export const freshCheckpoint = (): AmazonCheckpoint =>
    _fresh<AmazonCheckpoint>(AMAZON_CONFIG.checkpoint_file, {
        phase: 'scraping',
        scraped_ids: [],
        failed_scrapes: [],
        enriched_asins: [],
        failed_asins: [],
    })
