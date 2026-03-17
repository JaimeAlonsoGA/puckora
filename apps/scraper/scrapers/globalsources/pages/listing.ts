/**
 * GlobalSources category listing page scraper.
 *
 * Navigates to a GS category URL, waits for Vue SPA to render product cards,
 * extracts card data via page.evaluate(), and returns parsed GlobalSourcesListingCard[].
 */
import type { Browser } from 'playwright'
import type { GlobalSourcesListingCard } from '@puckora/scraper-core'
import { parseGlobalSourcesListingCard } from '@puckora/scraper-core'
import { newGsContext, gsNavigate } from '../browser'
import { log } from '../../../shared/logger'
import { sleep } from '../../../shared/utils'
import { GS_CONFIG } from '../config'

export interface ListingScrapeResult {
  cards: GlobalSourcesListingCard[]
  /** true if the category page returned no products */
  empty: boolean
  /** true if the page was blocked / unreachable */
  blocked: boolean
  /** "People Also Search" tags on this listing page */
  peopleAlsoSearch: string[]
  /** "Trending" related tags on this listing page */
  trending: string[]
  /** "Top Categories" related links on this listing page */
  topCategories: string[]
}

export async function scrapeGsListing(
  browser: Browser,
  categoryUrl: string,
  attempt = 0,
): Promise<ListingScrapeResult> {
  const { page, ctx } = await newGsContext(browser)

  // Append Verified Manufacturer filter
  const filteredUrl = categoryUrl.includes('?')
    ? `${categoryUrl}&vbTypes=Manufacturer`
    : `${categoryUrl}?vbTypes=Manufacturer`

  try {
    const ok = await gsNavigate(page, filteredUrl)

    if (!ok) {
      await page.close(); await ctx.close()
      if (attempt < GS_CONFIG.retry_max) {
        log.warn(`GS listing blocked — retry ${attempt + 1}/${GS_CONFIG.retry_max}`)
        await sleep(GS_CONFIG.retry_delay_ms)
        return scrapeGsListing(browser, categoryUrl, attempt + 1)
      }
      return { cards: [], empty: false, blocked: true, peopleAlsoSearch: [], trending: [], topCategories: [] }
    }

    await page.waitForSelector('.product-list .item', { timeout: 15_000 }).catch(() => { })

    const { rawCards, peopleAlsoSearch, trending, topCategories } = await page.evaluate(() => {
      const items = document.querySelectorAll('.product-list .item')
      const cards = Array.from(items).map((item) => {
        const el = item as HTMLElement
        const linkEl = el.querySelector('a[href]') as HTMLAnchorElement | null
        const productUrl = linkEl?.href ?? ''
        const productName = el.querySelector('.product-name')?.textContent?.trim() ?? ''
        const priceText = el.querySelector('span.price')?.textContent?.trim() ?? ''
        const unit = el.querySelector('i.unit')?.textContent?.trim() ?? ''
        const moqText = el.querySelector('.txt')?.textContent?.trim().replace(/\s+/g, ' ') ?? ''
        const imgEl = el.querySelector('img.img') as HTMLImageElement | null
        const image = imgEl?.src ?? imgEl?.getAttribute('data-src') ?? ''
        const tagEls = el.querySelectorAll('[alt]')
        const tags = Array.from(tagEls)
          .map(t => t.getAttribute('alt') ?? '')
          .filter(t => t && ['Premier Supplier', 'Verified Supplier', 'Ready to Order', 'O2O Supported'].includes(t))
        const supplierName = el.querySelector('.name .link-el, .name')?.textContent?.trim() ?? ''
        return { productUrl, productName, priceText, unit, moqText, image, tags, supplierName }
      })

      const extractTexts = (sel: string) =>
        Array.from(document.querySelectorAll(sel))
          .map(el => (el as HTMLElement).textContent?.trim() ?? '')
          .filter(Boolean)

      return {
        rawCards: cards,
        peopleAlsoSearch: extractTexts('.seotp-category .tags-item'),
        trending: extractTexts('.seotcs-category .tags-item'),
        topCategories: extractTexts('.seokeyword-category .item-keyword'),
      }
    })

    if (rawCards.length === 0) {
      await page.close(); await ctx.close()
      return { cards: [], empty: true, blocked: false, peopleAlsoSearch: [], trending: [], topCategories: [] }
    }

    const cards = rawCards
      .map(raw => parseGlobalSourcesListingCard(raw, categoryUrl))
      .filter((c): c is GlobalSourcesListingCard => c !== null)

    await page.close(); await ctx.close()
    return { cards, empty: false, blocked: false, peopleAlsoSearch, trending, topCategories }
  } catch (err) {
    await page.close().catch(() => { })
    await ctx.close().catch(() => { })
    if (attempt < GS_CONFIG.retry_max) {
      log.warn(`GS listing error — retry ${attempt + 1}/${GS_CONFIG.retry_max}: ${(err as Error).message.slice(0, 80)}`)
      await sleep(GS_CONFIG.retry_delay_ms)
      return scrapeGsListing(browser, categoryUrl, attempt + 1)
    }
    throw err
  }
}
