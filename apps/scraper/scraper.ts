import { Browser, Page, BrowserContext } from 'playwright'
import { CategoryNode, ScrapedProduct } from './types'
import { newContext, resetSharedContext } from './browser'
import { isBlocked, isEmptyCategory, parseProducts, countBadges } from './parser'
import { categorySlug } from './import-categories'
import { CONFIG } from './config'
import { log } from './logger'

/** Derive the Amazon Best Sellers slug from a stored full_path (e.g. "Electronics > Headphones"). */
function categorySlugFromPath(fullPath: string): string {
  const mainCategory = fullPath.split(' > ')[0]?.trim() ?? ''
  return categorySlug(mainCategory)
}

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
      const delay = 150 // ms between steps
      let stableCount = 0
      const timer = setInterval(() => {
        const max = document.body.scrollHeight  // re-read each step: lazy-loaded items extend the page
        window.scrollBy({ top: step, behavior: 'smooth' })
        const atBottom = (window.scrollY + window.innerHeight) >= max - step
        if (atBottom) {
          stableCount++
          if (stableCount >= 4) {  // stable height for 4 consecutive steps = fully loaded
            clearInterval(timer)
            resolve()
          }
        } else {
          stableCount = 0
        }
      }, delay)
    })
  })
  // Extra wait for price elements to render after scroll completes
  await sleep(1000)
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

    // Early bail-out: "no Best Sellers" text is server-rendered — no need to
    // burn the 15s waitForSelector + slowScroll on confirmed-empty pages.
    const earlyHtml1 = await page.content()
    if (isEmptyCategory(earlyHtml1)) {
      await page.close()
      log.warn(`${category.id} — no Best Sellers available in this category, skipping`)
      return []
    }

    // Wait for the product grid + lazy-loaded prices
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
    const badgesP1 = countBadges(html1)
    // Track total badges across both pages so index.ts can log parsed/total.
    // Default to page-1-only count here; updated below if page 2 loads.
    ;(products as any)._totalBadges = badgesP1

    // ── Page 2 (up to 100 products total) ───────────────────────────────────
    // Always attempt page 2 when the URL explicitly targets page 1.
    // For genuinely single-page categories the SSR HTML has no data-asin at all,
    // so isBlocked returns true and we skip the expensive wait. Categories with
    // a real page 2 always have some SSR data-asins (Amazon server-renders the
    // first ~30 items before JS lazy-loads the rest).
    const url2 = category.bestsellers_url.replace('?pg=1', '?pg=2')
    if (url2 !== category.bestsellers_url) {
      await page.goto(url2, { waitUntil: 'domcontentloaded', timeout: 30_000 })

      const earlyHtml2 = await page.content()
      if (!isBlocked(earlyHtml2)) {
        await page.waitForSelector('[data-asin]', { timeout: 10_000 }).catch(() => { })
        await slowScroll(page)

        const html2 = await page.content()
        if (!isBlocked(html2)) {
          const p2 = parseProducts(html2)
          const badgesP2 = countBadges(html2)
          const fresh = p2.filter(p => !products.find(e => e.asin === p.asin))
          // Ranks on page 2 are read directly from Amazon's #N badge (e.g. #51–#100),
          // so no manual offset is needed here.
          products.push(...fresh)
          // Log badge count: total ranked items Amazon says exist across both pages
          ;(products as any)._totalBadges = badgesP1 + badgesP2
        }
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
      // Include both leaf and branch nodes — branches have valid Best Sellers pages
      // aggregate data for their full subtree, giving broader coverage.
      .in('scrape_status', ['pending', 'failed'])
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`Failed to load categories: ${error.message}`)
    if (!data?.length) break
    all.push(...data)
    if (data.length < PAGE) break   // last page
    from += PAGE
  }

  if (!all.length) throw new Error('No categories found — run the import script first')

  // Sort shallowest first: broad categories (d2–d3) almost always have Best Sellers;
  // deep legacy/niche nodes (d7–d8) tend to be empty. This maximises early yield.
  all.sort((a, b) => a.depth - b.depth)

  return all.map(r => ({
    id: r.id,
    name: r.name,
    full_path: r.full_path,
    depth: r.depth,
    bestsellers_url: r.bestsellers_url
      // Fallback: derive slug from the first segment of full_path (= MAIN_CATEGORY)
      ?? `https://www.amazon.com/gp/bestsellers/${categorySlugFromPath(r.full_path)}/${r.id}?pg=1`,
  }))
}

export { jitter }
