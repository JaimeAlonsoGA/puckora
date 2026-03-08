import * as fs from 'fs'
import { CONFIG } from './config'
import { Checkpoint } from './types'

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
    phase:          'scraping',
    scraped_ids:    [],
    failed_scrapes: [],
    enriched_asins: [],
    failed_asins:   [],
    started_at:     new Date().toISOString(),
    updated_at:     new Date().toISOString(),
  }
}
