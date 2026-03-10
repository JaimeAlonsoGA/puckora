/**
 * diagnose.ts — dumps raw Playwright HTML for a known-good Best Sellers category.
 *
 * Usage: npx tsx diagnose.ts
 *
 * Outputs key fingerprint info and saves fullHTML to /tmp/amazon-debug.html
 */
import * as dotenv from 'dotenv'
import { launchBrowser, getSharedContext } from './browser'
import { isBlocked, isEmptyCategory } from '@puckora/scraper-core'
import { writeFileSync } from 'fs'
dotenv.config()

const TARGETS = [
  // Known-good: Headphones & Earbuds
  { label: 'Headphones (electronics/172541)', url: 'https://www.amazon.com/gp/bestsellers/electronics/172541?pg=1' },
  // Actual failing IDs from the live DB queue
  { label: '10111026011', url: 'https://www.amazon.com/gp/bestsellers/x/10111026011?pg=1' },
  { label: '10111130011', url: 'https://www.amazon.com/gp/bestsellers/x/10111130011?pg=1' },
  { label: '10111131011', url: 'https://www.amazon.com/gp/bestsellers/x/10111131011?pg=1' },
]

async function probe(url: string, label: string, browser: Awaited<ReturnType<typeof launchBrowser>>) {
  console.log(`\n─────────────────────────────────────────────────────────────`)
  console.log(`  ${label}`)
  console.log(`  ${url}`)
  console.log(`─────────────────────────────────────────────────────────────`)

  const ctx = await getSharedContext(browser)
  const page = await ctx.newPage()

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })

    // Check immediately (same as earlyHtml1 in scraper)
    const earlyHtml = await page.content()
    const title = (earlyHtml.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? 'no title').trim()

    console.log(`  title             : ${title}`)
    console.log(`  isEmptyCategory   : ${isEmptyCategory(earlyHtml)}`)
    console.log(`  isBlocked (early) : ${isBlocked(earlyHtml)}`)
    console.log(`  data-asin count   : ${(earlyHtml.match(/data-asin="[A-Z0-9]{10}"/g) ?? []).length}`)
    console.log(`  zg_bs product URLs: ${(earlyHtml.match(/\/dp\/[A-Z0-9]{10}\/ref=zg_bs/g) ?? []).length}`)
    console.log(`  has "no Best Sell": ${earlyHtml.includes('no Best Sellers available')}`)

    // Now wait for products (same as scraper)
    await page.waitForSelector('[data-asin]', { timeout: 15_000 }).catch(() => { })

    const fullHtml = await page.content()
    console.log(`  (after wait) data-asin count   : ${(fullHtml.match(/data-asin="[A-Z0-9]{10}"/g) ?? []).length}`)
    console.log(`  (after wait) zg_bs product URLs: ${(fullHtml.match(/\/dp\/[A-Z0-9]{10}\/ref=zg_bs/g) ?? []).length}`)
    console.log(`  isBlocked (full)  : ${isBlocked(fullHtml)}`)

    // First 500 chars of body content (after stripping <head>)
    const bodyStart = fullHtml.indexOf('<body')
    const excerpt = fullHtml.substring(bodyStart, bodyStart + 600).replace(/\s+/g, ' ')
    console.log(`  HTML body excerpt : ${excerpt}`)

    const fname = `/tmp/amazon-debug-${label.replace(/[^a-z0-9]+/gi, '-')}.html`
    writeFileSync(fname, fullHtml)
    console.log(`  Saved full HTML → ${fname}`)

  } catch (e) {
    console.error(`  ERROR: ${(e as Error).message}`)
  } finally {
    await page.close().catch(() => { })
  }
}

async function main() {
  console.log('Amazon Best Sellers — Playwright diagnostic')
  console.log('===========================================')

  const browser = await launchBrowser()
  try {
    for (const t of TARGETS) {
      await probe(t.url, t.label, browser)
    }
  } finally {
    await browser.close()
  }
  console.log('\nDone.')
}

main().catch(e => { console.error(e); process.exit(1) })
