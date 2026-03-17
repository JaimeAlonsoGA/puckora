/**
 * db-probe.ts — inspect the pending/failed category queue in Supabase.
 * Shows a spread sample of category names/paths so we can tell which ones
 * are genuinely valid vs "undefined" nodes.
 *
 * Usage: npx tsx db-probe.ts
 */
import * as dotenv from 'dotenv'
import { createDb } from '../../shared/db'
dotenv.config()

async function main() {
  const db = createDb()

  // 1. Count by scrape_status
  const { data: counts } = await db
    .from('amazon_categories')
    .select('scrape_status')
    .eq('marketplace', 'US')
    .eq('is_leaf', true)

  const tally: Record<string, number> = {}
  for (const r of counts ?? []) tally[r.scrape_status] = (tally[r.scrape_status] ?? 0) + 1
  console.log('\n── Category status counts (leaf nodes) ──────────────────────')
  console.table(tally)

  // 2. Sample 20 pending/failed — shallowest first (most likely to have BSR)
  const { data: shallow } = await db
    .from('amazon_categories')
    .select('id, name, full_path, depth, bestsellers_url')
    .eq('marketplace', 'US')
    .eq('is_leaf', true)
    .in('scrape_status', ['pending', 'failed'])
    .order('depth', { ascending: true })
    .limit(10)

  console.log('\n── 10 shallowest pending/failed categories ───────────────────')
  for (const r of shallow ?? []) {
    console.log(`  [d${r.depth}] ${r.id}  ${r.full_path}`)
    console.log(`        url: ${r.bestsellers_url}`)
  }

  // 3. Sample 10 deepest
  const { data: deep } = await db
    .from('amazon_categories')
    .select('id, name, full_path, depth, bestsellers_url')
    .eq('marketplace', 'US')
    .eq('is_leaf', true)
    .in('scrape_status', ['pending', 'failed'])
    .order('depth', { ascending: false })
    .limit(10)

  console.log('\n── 10 deepest pending/failed categories ──────────────────────')
  for (const r of deep ?? []) {
    console.log(`  [d${r.depth}] ${r.id}  ${r.full_path}`)
    console.log(`        url: ${r.bestsellers_url}`)
  }

  // 4. Show a sample of already-scraped categories to confirm they had products
  const { data: scraped } = await db
    .from('amazon_categories')
    .select('id, name, full_path, depth, bestsellers_url, last_scraped_at')
    .eq('marketplace', 'US')
    .eq('is_leaf', true)
    .eq('scrape_status', 'scraped')
    .order('last_scraped_at', { ascending: false })
    .limit(10)

  console.log('\n── 10 most recently scraped categories ───────────────────────')
  for (const r of scraped ?? []) {
    console.log(`  [d${r.depth}] ${r.id}  ${r.full_path}`)
    console.log(`        url: ${r.bestsellers_url}  scraped: ${r.last_scraped_at}`)
  }

  // 5. Count pending that have node IDs that look like valid Amazon browse nodes
  //    Amazon leaf BSR nodes are typically 9-11 digits
  const { data: allPending } = await db
    .from('amazon_categories')
    .select('id, depth')
    .eq('marketplace', 'US')
    .eq('is_leaf', true)
    .in('scrape_status', ['pending', 'failed'])
    .limit(5000)

  const byDepth: Record<number, number> = {}
  for (const r of allPending ?? []) {
    byDepth[r.depth] = (byDepth[r.depth] ?? 0) + 1
  }
  console.log('\n── Pending/failed depth distribution (first 5000) ───────────')
  for (const [depth, count] of Object.entries(byDepth).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    console.log(`  depth ${depth}: ${count}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
