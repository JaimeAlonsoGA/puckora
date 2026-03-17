/**
 * Debug: dump raw DOM extraction strings (before parsing) for a GS product.
 * Tests exact logic used in product.ts scraper.
 */
import { newGsContext, gsNavigate, launchBrowser } from '../../scrapers/globalsources/browser'

const url = process.argv[2] ??
  'https://www.globalsources.com/product/Compact-integrated-amp-1227760195p.htm'

async function main() {
  const browser = await launchBrowser()
  const { page, ctx } = await newGsContext(browser)
  await gsNavigate(page, url)

  const raw = await page.evaluate(() => {
    const sectionH2s = Array.from(document.querySelectorAll('h2'))
      .filter(h => !h.closest('.ant-anchor-link'))

    const h2Texts = sectionH2s.map(h => h.textContent?.trim())

    // Payment
    const payH2 = sectionH2s.find(el => el.textContent?.includes('Payment'))
    let paymentText = ''
    if (payH2) {
      const c = payH2.closest('[class*="payment"]') as HTMLElement | null
      if (c) {
        const rows = c.querySelectorAll('.ant-descriptions-row')
        paymentText = Array.from(rows).map(row => {
          const lbl = (row.querySelector('.ant-descriptions-item-label') as HTMLElement | null)?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
          const val = (row.querySelector('.ant-descriptions-item-content') as HTMLElement | null)?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
          return lbl && val ? `${lbl}\t${val}` : ''
        }).filter(Boolean).join('\n')
        if (!paymentText) {
          paymentText = `CLOSEST_NO_ROWS class=${c.className.slice(0, 80)} text=${c.textContent?.trim().slice(0, 100)}`
        }
      } else {
        paymentText = `NO_CLOSEST parent=${payH2.parentElement?.className.slice(0, 80)}`
        const parent = payH2.parentElement
        if (parent) {
          let uncle: Element | null = parent.nextElementSibling
          for (let i = 0; i < 6 && uncle; i++) {
            const rows = uncle.querySelectorAll('.ant-descriptions-row')
            if (rows.length > 0) {
              paymentText = `UNCLE_ROWS: ${uncle.className.slice(0, 80)} text=${uncle.textContent?.trim().slice(0, 100)}`
              break
            }
            uncle = uncle.nextElementSibling
          }
        }
      }
    } else {
      paymentText = 'NO_PAYMENT_H2'
    }

    // Export markets
    const marketH2 = sectionH2s.find(el => el.textContent?.includes('Main Export Markets'))
    let exportText = ''
    if (marketH2) {
      let sib: Element | null = marketH2.nextElementSibling
      const sibs: string[] = []
      while (sib) {
        sibs.push(`SIB: ${sib.tagName}.${sib.className.slice(0, 40)}: "${(sib as HTMLElement).textContent?.trim().slice(0, 80)}"`)
        sib = sib.nextElementSibling
      }
      exportText = sibs.slice(0, 3).join('\n') || 'no h2 siblings'

      const parent = marketH2.parentElement
      if (parent) {
        let uncle: Element | null = parent.nextElementSibling
        const uncles: string[] = []
        while (uncle) {
          uncles.push(`UNCLE: ${uncle.tagName}.${uncle.className.slice(0, 40)}: "${(uncle as HTMLElement).textContent?.trim().slice(0, 80)}"`)
          uncle = uncle.nextElementSibling
        }
        exportText += '\n' + uncles.slice(0, 3).join('\n')
      }
    } else {
      exportText = 'NO_MARKET_H2'
    }

    return { h2Texts, paymentText, exportText }
  })

  await page.close(); await ctx.close(); await browser.close()

  console.log('=== SECTION H2s (non-anchor) ===\n', raw.h2Texts.map((t, i) => `[${i}] ${t}`).join('\n'))
  console.log('\n=== PAYMENT RAW ===\n', raw.paymentText || 'empty')
  console.log('\n=== EXPORT MARKETS RAW ===\n', raw.exportText || 'empty')
}
main().catch(err => { console.error(err); process.exit(1) })
