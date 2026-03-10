/**
 * Puckora — XLSX Category Importer
 * Reads the NarrowDown amazon-browse-nodes XLSX and populates amazon_categories.
 *
 * Run ONCE before the scraper:
 *   npx ts-node src/import-categories.ts ./amazon-browse-nodes.xlsx
 *   npx ts-node src/import-categories.ts ./amazon-browse-nodes.xlsx --dry-run
 *
 * XLSX format (from NarrowDown / Amazon BTG):
 *   Col 0: Browse Node ID (numeric)
 *   Col 1: MAIN_CATEGORY  (top-level department, e.g. "Electronics")
 *   Col 2: SUB-CATEGORY_1
 *   ...
 *   Col N: SUB-CATEGORY_N (empty = stop)
 *
 * Best Sellers URL format:
 *   https://www.amazon.com/gp/bestsellers/{slug}/{nodeId}?pg=1
 *   The slug is Amazon's private internal slug — NOT the category name.
 *   It is derived from MAIN_CATEGORY using CATEGORY_SLUG_MAP below.
 *   The node ID alone drives the actual page; the slug must be a valid ancestor.
 */

import * as XLSX from 'xlsx'
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { log } from './logger'
import { CATEGORY_SCRAPE_STATUS } from '@puckora/scraper-core'
import { categorySlug, buildUrl } from './categories/slugs'
dotenv.config()

const MARKETPLACE = 'US'
const BATCH_SIZE = 500

interface CategoryRow {
  id: string
  name: string
  full_path: string
  breadcrumb: string[]
  depth: number
  parent_id: string | null
  is_leaf: boolean
  marketplace: string
  bestsellers_url: string
  scrape_status: string
}

function parseXlsx(filePath: string): CategoryRow[] {
  log.info(`Reading ${filePath}`)
  const wb = XLSX.readFile(filePath)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' })

  // Find where data rows start (first row where col 0 is numeric node ID)
  let dataStart = 0
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    if (/^\d{6,12}$/.test(String(raw[i][0]).trim())) { dataStart = i; break }
    dataStart = i + 1
  }
  log.info(`Data starts at row ${dataStart}, total rows: ${raw.length - dataStart}`)

  const pathToId = new Map<string, string>()
  const rows: CategoryRow[] = []

  for (let i = dataStart; i < raw.length; i++) {
    const row = raw[i]
    const nodeId = String(row[0]).trim()
    if (!nodeId || !/^\d+$/.test(nodeId)) continue

    // Build breadcrumb from level columns until empty
    const breadcrumb: string[] = []
    for (let col = 1; col <= 15; col++) {
      const val = String(row[col] ?? '').trim()
      if (!val) break
      breadcrumb.push(val)
    }
    if (breadcrumb.length === 0) { log.warn(`Row ${i}: node ${nodeId} has no path — skipping`); continue }

    const name = breadcrumb[breadcrumb.length - 1]
    const full_path = breadcrumb.join(' > ')
    pathToId.set(full_path, nodeId)

    rows.push({
      id: nodeId,
      name,
      full_path,
      breadcrumb,
      depth: breadcrumb.length,
      parent_id: null,   // resolved below
      is_leaf: true,   // resolved below
      marketplace: MARKETPLACE,
      bestsellers_url: buildUrl(nodeId, breadcrumb[0] ?? ''),  // breadcrumb[0] = MAIN_CATEGORY
      scrape_status: CATEGORY_SCRAPE_STATUS.PENDING,
    })
  }

  // Resolve parent_id and is_leaf in one pass
  const idSet = new Set(rows.map(r => r.id))
  const parentIds = new Set<string>()

  for (const row of rows) {
    if (row.breadcrumb.length > 1) {
      const parentPath = row.breadcrumb.slice(0, -1).join(' > ')
      const pid = pathToId.get(parentPath)
      if (pid && idSet.has(pid)) { row.parent_id = pid; parentIds.add(pid) }
    }
  }
  for (const row of rows) {
    if (parentIds.has(row.id)) row.is_leaf = false
  }

  // Deduplicate by id — keep last occurrence (deeper rows tend to be more complete)
  const deduped = [...new Map(rows.map(r => [r.id, r])).values()]
  const dupeCount = rows.length - deduped.length
  if (dupeCount > 0) log.warn(`Removed ${dupeCount} duplicate node IDs`)

  // Null out any parent_id that isn't present in the final deduplicated set
  const finalIds = new Set(deduped.map(r => r.id))
  for (const row of deduped) {
    if (row.parent_id && !finalIds.has(row.parent_id)) row.parent_id = null
  }

  const leaves = deduped.filter(r => r.is_leaf).length
  log.success(`Parsed ${deduped.length} nodes — ${leaves} leaves, ${deduped.length - leaves} branches`)
  return deduped
}

async function importToDb(rows: CategoryRow[], dryRun: boolean): Promise<void> {
  if (dryRun) {
    log.warn('DRY-RUN — first 5 rows:')
    rows.slice(0, 5).forEach(r =>
      console.log(`  [depth ${r.depth}] ${r.full_path} | parent: ${r.parent_id ?? 'root'} | leaf: ${r.is_leaf}`)
    )
    console.log(`  Would insert ${rows.length} rows.`)
    return
  }

  if (!process.env['NEXT_PUBLIC_SUPABASE_URL'] || !process.env['SUPABASE_SERVICE_ROLE_KEY']) {
    log.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env')
    process.exit(1)
  }

  const db = createClient(process.env['NEXT_PUBLIC_SUPABASE_URL']!, process.env['SUPABASE_SERVICE_ROLE_KEY']!)

  // Must insert parents before children — sort by depth ascending
  const sorted = [...rows].sort((a, b) => a.depth - b.depth)

  let inserted = 0, failed = 0

  log.info(`Inserting ${sorted.length} rows in batches of ${BATCH_SIZE}...`)

  for (let i = 0; i < sorted.length; i += BATCH_SIZE) {
    const batch = sorted.slice(i, i + BATCH_SIZE)
    const { error } = await db
      .from('amazon_categories')
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: false })

    if (error) { log.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`); failed += batch.length }
    else { inserted += batch.length }

    process.stdout.write(`\r  Progress: ${Math.min(i + BATCH_SIZE, sorted.length)}/${sorted.length}   `)
  }

  console.log()
  log.success(`Done — inserted: ${inserted} | failed: ${failed}`)
}

async function main() {
  const args = process.argv.slice(2)
  const filePath = args.find(a => !a.startsWith('--')) ?? './amazon-browse-nodes.xlsx'
  const dryRun = args.includes('--dry-run')

  log.section('Puckora — Category Importer')
  const rows = parseXlsx(filePath)
  await importToDb(rows, dryRun)
}

if (require.main === module) {
  main().catch(err => { log.error(err.message); process.exit(1) })
}
