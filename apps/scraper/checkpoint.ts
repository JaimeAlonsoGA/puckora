import * as fs from 'fs'
import { CONFIG } from './config'

// ─── CHECKPOINT ──────────────────────────────────────────────────────────────

export interface Checkpoint {
  phase: 'scraping' | 'enriching' | 'done'
  scraped_ids: string[]      // category IDs fully scraped
  failed_scrapes: string[]   // category IDs that failed
  enriched_asins: string[]   // ASINs fully enriched
  failed_asins: string[]     // ASINs that failed enrichment
  started_at: string
  updated_at: string
}

export function loadCheckpoint(): Checkpoint | null {
  if (!fs.existsSync(CONFIG.checkpoint_file)) return null
  try {
    return JSON.parse(fs.readFileSync(CONFIG.checkpoint_file, 'utf8')) as Checkpoint
  } catch {
    return null
  }
}

export function saveCheckpoint(cp: Checkpoint): void {
  cp.updated_at = new Date().toISOString()
  fs.writeFileSync(CONFIG.checkpoint_file, JSON.stringify(cp, null, 2))
}

export function freshCheckpoint(): Checkpoint {
  return {
    phase: 'scraping',
    scraped_ids: [],
    failed_scrapes: [],
    enriched_asins: [],
    failed_asins: [],
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}
