import { type Browser, type Page } from 'playwright'
import type { CategoryNode, ScrapedProduct } from '../types'
import { newContext, resetSharedContext } from '../browser'
import { isBlocked, isEmptyCategory, parseProducts, countBadges } from '@puckora/scraper-core'
import { AMAZON_CONFIG } from '../config'
import { log } from '../../../shared/logger'
import { sleep } from '../../../shared/utils'

/** Slowly scroll the full page in 400px increments to trigger lazy-loaded prices. */
async function slowScroll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>(resolve => {
      const step = 400
      const delay = 150
      let stableCount = 0
      const timer = setInterval(() => {
        const max = document.body.scrollHeight
        window.scrollBy({ top: step, behavior: 'smooth' })
        const atBottom = (window.scrollY + window.innerHeight) >= max - step
        if (atBottom) {
          stableCount++
          if (stableCount >= 4) { clearInterval(timer); resolve() }
        } else {
          stableCount = 0
        }
      }, delay)
    })
  })
  await sleep(1000)
}

/** Returns true if the current page shows no Best Sellers (scoped frame — html freed on return). */
async function isPageEmpty(page: Page): Promise<boolean> {
  const html = await page.content()
  return isEmptyCategory(html)
}

/** Returns true if the current page is a block/CAPTCHA page (scoped frame — html freed on return). */
async function isPageBlocked(page: Page): Promise<boolean> {
  const html = await page.content()
  return isBlocked(html)
}

interface ParsedPage { products: ScrapedProduct[]; badges: number }

/**
 * Wait for products, slow-scroll, then parse.
 * html is scoped to THIS frame — V8 frees it as soon as this function returns.
 * This is the OOM fix: scrapeCategory never holds any html string across an await.
 */
async function scrollAndParse(page: Page, selectorTimeout = 15_000): Promise<ParsedPage | 'empty' | 'blocked'> {
  await page.waitForSelector('[data-asin]', { timeout: selectorTimeout }).catch(() => { })
  await slowScroll(page)
  const html = await page.content()
  if (isEmptyCategory(html)) return 'empty'
  if (isBlocked(html)) return 'blocked'
  return { products: parseProducts(html) as ScrapedProduct[], badges: countBadges(html) }
}

export async function scrapeCategory(
  browser: Browser,
  category: CategoryNode,
  attempt = 0,
): Promise<ScrapedProduct[] | null> {
  let page: Page | null = null

  try {
    const { page: p } = await newContext(browser)
    page = p

    // ── Page 1 ────────────────────────────────────────────────────────────────
    await page.goto(category.bestsellers_url, { waitUntil: 'domcontentloaded', timeout: 30_000 })

    if (await isPageEmpty(page)) {
      await page.close()
      log.warn(`${category.id} — no Best Sellers available in this category, skipping`)
      return []
    }

    const p1 = await scrollAndParse(page, 15_000)

    if (p1 === 'empty') {
      await page.close()
      log.warn(`${category.id} — no Best Sellers available in this category, skipping`)
      return []
    }

    if (p1 === 'blocked') {
      await page.close()
      resetSharedContext()
      if (attempt < AMAZON_CONFIG.retry_max) {
        log.blocked(`${category.id} — blocked (attempt ${attempt + 1}/${AMAZON_CONFIG.retry_max}), waiting ${AMAZON_CONFIG.retry_delay_ms / 1000}s`)
        await sleep(AMAZON_CONFIG.retry_delay_ms)
        return scrapeCategory(browser, category, attempt + 1)
      }
      log.error(`${category.id} — blocked after ${AMAZON_CONFIG.retry_max} attempts, skipping`)
      return null
    }

    const products = p1.products
    let totalBadges = p1.badges
    ;(products as any)._totalBadges = totalBadges

    // ── Page 2 (up to 100 products total) ─────────────────────────────────────
    const url2 = category.bestsellers_url.replace('?pg=1', '?pg=2')
    if (url2 !== category.bestsellers_url) {
      await page.goto(url2, { waitUntil: 'domcontentloaded', timeout: 30_000 })

      if (!await isPageBlocked(page)) {
        const p2 = await scrollAndParse(page, 10_000)
        if (p2 !== 'blocked' && p2 !== 'empty') {
          const fresh = p2.products.filter(prod => !products.find(e => e.asin === prod.asin))
          products.push(...fresh)
          totalBadges += p2.badges
          ;(products as any)._totalBadges = totalBadges
        }
      }
    }

    await page.close()
    return products.length > 0 ? products : null

  } catch (err) {
    if (page) await page.close().catch(() => { })
    if (attempt < AMAZON_CONFIG.retry_max) {
      log.warn(`Amazon category error — retry ${attempt + 1}/${AMAZON_CONFIG.retry_max}: ${(err as Error).message.slice(0, 80)}`)
      await sleep(AMAZON_CONFIG.retry_delay_ms)
      return scrapeCategory(browser, category, attempt + 1)
    }
    log.error(`Scrape failed after ${attempt + 1} attempts (${category.id}): ${(err as Error).message}`)
    return null
  }
}
