/**
 * Find the actual section headings and content containers on GS product pages.
 */
import { newGsContext, gsNavigate, launchBrowser } from '../../scrapers/globalsources/browser'

const url = process.argv[2] ??
  'https://www.globalsources.com/product/Compact-integrated-amp-1227760195p.htm'

async function main() {
  const browser = await launchBrowser()
  const { page, ctx } = await newGsContext(browser)
  await gsNavigate(page, url)

  const info = await page.evaluate(() => {
    const results: string[] = []
    const tags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', '[class*="title"]', '[class*="heading"]']
    for (const tag of tags) {
      const els = Array.from(document.querySelectorAll(tag))
      for (const el of els) {
        const text = el.textContent?.trim().slice(0, 60) ?? ''
        if (text.match(/(Payment|Export Market|Shipping|Product Info)/i)) {
          const p = el.parentElement
          const cls = `${el.tagName}.${el.className.slice(0, 50)}`
          const pcls = p?.className.slice(0, 60) ?? ''
          const gpCls = p?.parentElement?.className.slice(0, 60) ?? ''
          results.push(`${cls} | "${text}" | parent: ${pcls} | gp: ${gpCls}`)
        }
      }
    }

    const found = new Set<string>()
    for (const el of Array.from(document.querySelectorAll('*'))) {
      const cls = el.className ?? ''
      if (typeof cls === 'string' && cls.match(/(payment|export|market|shipping)/i)) {
        found.add(cls.trim().slice(0, 100))
      }
    }

    return { headingMatches: results, matchingClasses: Array.from(found).slice(0, 30) }
  })

  await page.close(); await ctx.close(); await browser.close()

  console.log('=== HEADING MATCHES ===')
  info.headingMatches.forEach(s => console.log(' ', s))
  console.log('\n=== CLASSES WITH payment/export/market/shipping ===')
  info.matchingClasses.forEach(s => console.log(' ', s))
}
main().catch(err => { console.error(err); process.exit(1) })
