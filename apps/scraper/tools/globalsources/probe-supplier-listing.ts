/**
 * Quick probe: dump raw HTML of first supplier card's field-row area
 * to identify the correct selectors for Main Products, Business Type, etc.
 */
import { chromium } from 'playwright'
import { GS_CONFIG } from '../../scrapers/globalsources/config'
import { newGsContext, gsNavigate } from '../../scrapers/globalsources/browser'

const URL = 'https://www.globalsources.com/category/travel-bags-manufacturer-supplier_21037/?vbTypes=Manufacturer'

async function main() {
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        proxy: GS_CONFIG.proxy_url ? { server: GS_CONFIG.proxy_url } : undefined,
    })

    const { page, ctx } = await newGsContext(browser)
    const ok = await gsNavigate(page, URL)
    if (!ok) {
        console.log('BLOCKED or failed navigation')
        await page.close(); await ctx.close(); await browser.close()
        return
    }
    await page.waitForSelector('.card-box', { timeout: 15_000 }).catch(() => { })

    const result = await page.evaluate(() => {
        const cards = document.querySelectorAll('.card-box')
        if (cards.length === 0) return { error: 'no .card-box found', html: document.body.innerHTML.slice(0, 3000) }

        const card = cards[0] as HTMLElement

        const selectors = [
            '.txt-list .item .attr',
            '.txt-list .item',
            '.txt-list',
            '.field-list',
            '.detail-list',
            '.info-list',
            '.supp-detail',
            '.desc-list',
            '.pro-detail',
            '[class*="list"] [class*="item"]',
        ]

        const found: Record<string, string> = {}
        for (const sel of selectors) {
            const els = card.querySelectorAll(sel)
            if (els.length > 0) {
                found[sel] = Array.from(els).slice(0, 4).map(e => (e as HTMLElement).textContent?.trim() ?? '').join(' | ')
            }
        }

        const cardHtml = card.innerHTML.slice(0, 6000)

        return { cardCount: cards.length, found, cardHtml }
    })

    console.log(JSON.stringify(result, null, 2))

    await page.close(); await ctx.close()
    await browser.close()
}

main().catch(console.error)
