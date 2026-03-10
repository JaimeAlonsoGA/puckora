import { Browser, Page } from 'playwright'
import type { CategoryNode, ScrapedProduct } from '../types'
import { newContext, resetSharedContext } from '../browser'
import { isBlocked, isEmptyCategory, parseProducts, countBadges } from '@puckora/scraper-core'
import { CONFIG } from '../config'
import { log } from '../logger'

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

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
    attempt = 0,
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

        // Best Sellers pages always produce ranked items — rank is always non-null here.
        // ScrapedProduct is a narrowed alias of ScrapedListing with rank: number.
        const products = parseProducts(html1) as ScrapedProduct[]
        const badgesP1 = countBadges(html1)
            // Track total badges across both pages so index.ts can log parsed/total.
            ; (products as any)._totalBadges = badgesP1

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
                    const p2 = parseProducts(html2) as ScrapedProduct[]
                    const badgesP2 = countBadges(html2)
                    const fresh = p2.filter(p => !products.find(e => e.asin === p.asin))
                    // Ranks on page 2 are read directly from Amazon's #N badge (e.g. #51–#100),
                    // so no manual offset is needed here.
                    products.push(...fresh)
                        ; (products as any)._totalBadges = badgesP1 + badgesP2
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
