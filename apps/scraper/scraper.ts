import { Browser, Page, BrowserContext } from 'playwright'
import { CategoryNode, ScrapedProduct } from './types'
import { newContext, resetSharedContext } from './browser'
import { isBlocked, isEmptyCategory, parseProducts } from './parser'
import { CONFIG } from './config'
import { log } from './logger'

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

function jitter(): Promise<void> {
  const ms = CONFIG.delay_min + Math.random() * (CONFIG.delay_max - CONFIG.delay_min)
  return sleep(ms)
}

/** Slowly scroll the full page in 400px increments to trigger lazy-loaded prices. */
async function slowScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>(resolve => {
      const step = 400
      const delay = 120 // ms between steps
      let current = 0
      const max = document.body.scrollHeight
      const timer = setInterval(() => {
        current += step
        window.scrollBy({ top: step, behavior: 'smooth' })
        if (current >= max) {
          clearInterval(timer)
          resolve()
        }
      }, delay)
    })
  })
  // Extra wait for price elements to render after scroll completes
  await sleep(800)
}

export async function scrapeCategory(
  browser: Browser,
  category: CategoryNode,
  attempt = 0
): Promise<ScrapedProduct[] | null> {
  let page: Page | null = null

  try {
    const { page: p } = await newContext(browser)
    page = p

    // ── Page 1 ──────────────────────────────────────────────────────────────
    await page.goto(category.bestsellers_url, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })
    await page.waitForSelector('[data-asin]', { timeout: 15_000 }).catch(() => { })
    await slowScroll(page)

    const html1 = await page.content()

    if (isEmptyCategory(html1)) {
      await page.close()
      log.warn(`${category.id} — no Best Sellers available in this category, skipping`)
      return []
    }

    if (isBlocked(html1)) {
      await page.close()
      // Reset the shared context so next attempt gets a fresh session
      resetSharedContext()
      if (attempt < CONFIG.retry_max) {
        log.blocked(`${category.id} — blocked (attempt ${attempt + 1}/${CONFIG.retry_max}), waiting ${CONFIG.retry_delay / 1000}s`)
        await sleep(CONFIG.retry_delay)
        return scrapeCategory(browser, category, attempt + 1)
      }
      log.error(`${category.id} — blocked after ${CONFIG.retry_max} attempts, skipping`)
      return null
    }

    const products = parseProducts(html1)

    // ── Page 2 (up to 100 products total) ───────────────────────────────────
    if (products.length >= 48) {
      const url2 = category.bestsellers_url.replace('?pg=1', '?pg=2')
      await page.goto(url2, { waitUntil: 'domcontentloaded', timeout: 30_000 })
      await page.waitForSelector('[data-asin]', { timeout: 15_000 }).catch(() => { })
      await slowScroll(page)

      const html2 = await page.content()
      if (!isBlocked(html2)) {
        const p2 = parseProducts(html2)
        const fresh = p2.filter(p => !products.find(e => e.asin === p.asin))
        fresh.forEach((p, i) => { p.rank = products.length + i + 1 })
        products.push(...fresh)
      }
    }

    await page.close()
    return products.length > 0 ? products : null

  } catch (err) {
    if (page) await page.close().catch(() => { })
    log.error(`Scrape error (${category.id}): ${(err as Error).message}`)
    return null
  }
}

export async function loadCategoriesFromSupabase(
  supabase: import('./db').DB,
  opts: { singleId?: string } = {}
): Promise<CategoryNode[]> {
  if (opts.singleId) {
    const { data, error } = await supabase
      .from('amazon_categories')
      .select('id, name, full_path, depth, bestsellers_url')
      .eq('marketplace', CONFIG.marketplace)
      .eq('id', opts.singleId)
    if (error) throw new Error(`Failed to load categories: ${error.message}`)
    if (!data?.length) throw new Error('No categories found — run the import script first')
    return data.map(r => ({ id: r.id, name: r.name, full_path: r.full_path, depth: r.depth, bestsellers_url: r.bestsellers_url ?? '' }))
  }

  // Paginate in 1000-row pages — PostgREST default cap is 1000
  const PAGE = 1000
  const all: Array<{ id: string; name: string; full_path: string; depth: number; bestsellers_url: string | null }> = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('amazon_categories')
      .select('id, name, full_path, depth, bestsellers_url')
      .eq('marketplace', CONFIG.marketplace)
      .eq('is_leaf', true)
      .in('scrape_status', ['pending', 'failed'])
      .order('depth', { ascending: false })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`Failed to load categories: ${error.message}`)
    if (!data?.length) break
    all.push(...data)
    if (data.length < PAGE) break   // last page
    from += PAGE
  }

  if (!all.length) throw new Error('No categories found — run the import script first')

  return all.map(r => ({
    id: r.id,
    name: r.name,
    full_path: r.full_path,
    depth: r.depth,
    bestsellers_url: r.bestsellers_url
      ?? `https://www.amazon.com/gp/bestsellers/x/${r.id}?pg=1`,
  }))
}

export { jitter }
