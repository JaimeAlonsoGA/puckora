/**
 * db-probe.ts — inspect the pending/failed category queue (Fly.io Postgres / Drizzle).
 *
 * Usage: npx tsx tools/amazon/db-probe.ts
 */
import * as dotenv from 'dotenv'
import { eq, and, inArray, asc, desc } from 'drizzle-orm'
import { createDb } from '../../shared/db'
import { amazonCategories } from '@puckora/db'
dotenv.config()

async function main() {
  const db = createDb()

  // 1. Count by scrape_status (leaf nodes)
  const counts = await db
    .select({ scrape_status: amazonCategories.scrape_status })
    .from(amazonCategories)
    .where(and(eq(amazonCategories.marketplace, 'US'), eq(amazonCategories.is_leaf, true)))

  const tally: Record<string, number> = {}
  for (const r of counts) tally[r.scrape_status] = (tally[r.scrape_status] ?? 0) + 1
  console.log('\n── Category status counts (leaf nodes) ──────────────────────')
  console.table(tally)

  // 2. 10 shallowest pending/failed
  const shallow = await db
    .select({ id: amazonCategories.id, name: amazonCategories.name, full_path: amazonCategories.full_path, depth: amazonCategories.depth, bestsellers_url: amazonCategories.bestsellers_url })
    .from(amazonCategories)
    .where(and(eq(amazonCategories.marketplace, 'US'), eq(amazonCategories.is_leaf, true), inArray(amazonCategories.scrape_status, ['pending', 'failed'])))
    .orderBy(asc(amazonCategories.depth))
    .limit(10)

  console.log('\n── 10 shallowest pending/failed categories ───────────────────')
  for (const r of shallow) {
    console.log(`  [d${r.depth}] ${r.id}  ${r.full_path}`)
    console.log(`        url: ${r.bestsellers_url}`)
  }

  // 3. 10 deepest
  const deep = await db
    .select({ id: amazonCategories.id, name: amazonCategories.name, full_path: amazonCategories.full_path, depth: amazonCategories.depth, bestsellers_url: amazonCategories.bestsellers_url })
    .from(amazonCategories)
    .where(and(eq(amazonCategories.marketplace, 'US'), eq(amazonCategories.is_leaf, true), inArray(amazonCategories.scrape_status, ['pending', 'failed'])))
    .orderBy(desc(amazonCategories.depth))
    .limit(10)

  console.log('\n── 10 deepest pending/failed categories ──────────────────────')
  for (const r of deep) {
    console.log(`  [d${r.depth}] ${r.id}  ${r.full_path}`)
    console.log(`        url: ${r.bestsellers_url}`)
  }

  // 4. 10 most recently scraped
  const scraped = await db
    .select({ id: amazonCategories.id, name: amazonCategories.name, full_path: amazonCategories.full_path, depth: amazonCategories.depth, bestsellers_url: amazonCategories.bestsellers_url, last_scraped_at: amazonCategories.last_scraped_at })
    .from(amazonCategories)
    .where(and(eq(amazonCategories.marketplace, 'US'), eq(amazonCategories.is_leaf, true), eq(amazonCategories.scrape_status, 'scraped')))
    .orderBy(desc(amazonCategories.last_scraped_at))
    .limit(10)

  console.log('\n── 10 most recently scraped categories ───────────────────────')
  for (const r of scraped) {
    console.log(`  [d${r.depth}] ${r.id}  ${r.full_path}`)
    console.log(`        url: ${r.bestsellers_url}  scraped: ${r.last_scraped_at}`)
  }

  // 5. Pending/failed depth distribution
  const allPending = await db
    .select({ id: amazonCategories.id, depth: amazonCategories.depth })
    .from(amazonCategories)
    .where(and(eq(amazonCategories.marketplace, 'US'), eq(amazonCategories.is_leaf, true), inArray(amazonCategories.scrape_status, ['pending', 'failed'])))
    .limit(5000)

  const byDepth: Record<number, number> = {}
  for (const r of allPending) byDepth[r.depth] = (byDepth[r.depth] ?? 0) + 1
  console.log('\n── Pending/failed depth distribution (first 5000) ───────────')
  for (const [depth, count] of Object.entries(byDepth).sort((a, b) => Number(a[0]) - Number(b[0]))) {
    console.log(`  depth ${depth}: ${count}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
