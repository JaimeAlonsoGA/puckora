/**
 * GlobalSources individual product detail page scraper.
 *
 * Navigates to a GS product URL, extracts DOM data into a RawGlobalSourcesProductPage
 * snapshot, then calls parseGlobalSourcesProductDetail() to get the typed result.
 */
import type { Browser } from 'playwright'
import type { GlobalSourcesProductDetail } from '@puckora/scraper-core'
import { parseGlobalSourcesProductDetail } from '@puckora/scraper-core'
import { newGsContext, gsNavigate } from '../browser'
import { log } from '../../../shared/logger'
import { sleep } from '../../../shared/utils'
import { GS_CONFIG } from '../config'

export async function scrapeGsProduct(
  browser: Browser,
  productUrl: string,
  attempt = 0,
): Promise<GlobalSourcesProductDetail | null> {
  const { page, ctx } = await newGsContext(browser)

  try {
    const ok = await gsNavigate(page, productUrl)

    if (!ok) {
      await page.close(); await ctx.close()
      if (attempt < GS_CONFIG.retry_max) {
        log.warn(`GS product blocked — retry ${attempt + 1}/${GS_CONFIG.retry_max}: ${productUrl}`)
        await sleep(GS_CONFIG.retry_delay_ms)
        return scrapeGsProduct(browser, productUrl, attempt + 1)
      }
      return null
    }

    const raw = await page.evaluate(() => {
      // ── JSON-LD ──────────────────────────────────────────────────────────────
      const jsonLd = Array.from(
        document.querySelectorAll('script[type="application/ld+json"]')
      ).map(s => {
        try { return JSON.parse(s.textContent ?? '{}') } catch { return null }
      }).filter(Boolean) as object[]

      // ── Price elements ───────────────────────────────────────────────────────
      const priceRangeText = (
        document.querySelector('.price-range, [class*="price-range"]') as HTMLElement | null
      )?.textContent?.trim().replace(/\s+/g, ' ') ?? ''

      const priceMainText = (
        document.querySelector('.price-main, [class*="price-main"]') as HTMLElement | null
      )?.textContent?.trim().replace(/\s+/g, ' ') ?? ''

      // ── Shipping Information blob ────────────────────────────────────────────
      let shippingText = ''
      const allEls = Array.from(document.querySelectorAll('*'))
      for (const el of allEls) {
        if (
          el.children.length < 8 &&
          el.textContent?.includes('FOB Port') &&
          el.textContent?.includes('Lead Time')
        ) {
          shippingText = el.textContent.replace(/\s+/g, ' ').trim()
          break
        }
      }
      if (!shippingText) {
        const shipContainers = document.querySelectorAll('.certifications')
        for (const c of Array.from(shipContainers)) {
          const t = c.textContent?.replace(/\s+/g, ' ').trim() ?? ''
          if (t.includes('FOB Port') || t.includes('Lead Time')) {
            shippingText = t; break
          }
        }
      }

      // ── Supplier ─────────────────────────────────────────────────────────────
      const supplierNameEl = document.querySelector(
        '.company-info-box .supplier-name .name, .company-info-box .max-row .name'
      ) as HTMLElement | null
      const supplierName = supplierNameEl?.textContent?.trim() ?? ''

      const supplierAnchor = document.querySelector(
        '.company-info-box .supplier-name a, .company-info-box .max-row a'
      ) as HTMLAnchorElement | null
      const supplierUrl = supplierAnchor?.href ?? ''

      const yearsEl = document.querySelector(
        '.gs-tag.years .num, .gs-tag.back-up-years .num, [class*="years"] .num'
      ) as HTMLElement | null
      const supplierYears = parseInt(yearsEl?.textContent?.trim() ?? '-1', 10)

      const companyBlock = document.querySelector(
        '.company-info-box, [class*="company-info"]'
      ) as HTMLElement | null
      const supplierBlockText = companyBlock?.textContent?.trim().replace(/\s+/g, ' ') ?? ''

      // ── Certifications ───────────────────────────────────────────────────────
      const certTexts: string[] = []
      const certSelectors = [
        '[class*="product-cert"]', '[class*="certification"]',
        '[class*="cert-box"]', '[class*="certif"]',
      ]
      for (const sel of certSelectors) {
        document.querySelectorAll(sel).forEach(el => {
          const t = el.textContent?.trim().replace(/\s+/g, ' ')
          if (t && t.length > 5) certTexts.push(t)
        })
      }
      document.querySelectorAll('img[alt]').forEach(img => {
        const alt = (img as HTMLImageElement).alt?.trim()
        if (alt && alt.length <= 10) certTexts.push(alt)
      })
      allEls.forEach(el => {
        if (el.children.length < 4 && el.textContent?.includes('Certificate Standard')) {
          certTexts.push(el.textContent.replace(/\s+/g, ' ').trim())
        }
      })

      // ── Images ───────────────────────────────────────────────────────────────
      const images: string[] = []
      document.querySelectorAll('img').forEach(img => {
        const src = (img as HTMLImageElement).src
        if (
          src &&
          (src.includes('globalsources.com') || src.includes('globalso')) &&
          !src.includes('supplier') &&
          !src.includes('supplierTag') &&
          !src.includes('website/image') &&
          !src.includes('logo')
        ) {
          const clean = src.split('?')[0]
          if (!images.includes(clean)) images.push(clean)
        }
      })

      return {
        url: window.location.href,
        jsonLd,
        priceRangeText,
        priceMainText,
        shippingText,
        supplierName,
        supplierUrl,
        supplierYears,
        supplierBlockText,
        certTexts,
        images,

        specificationsText: (
          document.querySelector('.specifications') as HTMLElement | null
        )?.textContent?.replace(/\s+/g, ' ').trim() ?? '',

        exportMarketsText: (() => {
          const container = document.querySelector('.markets') as HTMLElement | null
          if (container) {
            const content = container.querySelector('.markets-content') as HTMLElement | null
            if (content) return content.textContent?.replace(/\s+/g, ' ').trim() ?? ''
            return container.textContent?.replace(/\s+/g, ' ').trim()
              .replace(/^Main Export Markets\s*/i, '').trim() ?? ''
          }
          const alt = document.querySelector('[class*="market"]') as HTMLElement | null
          return alt?.textContent?.replace(/\s+/g, ' ').trim()
            .replace(/^Main Export Markets\s*/i, '').trim() ?? ''
        })(),

        paymentText: (() => {
          const container = document.querySelector('.payment-details') as HTMLElement | null
          if (!container) return ''

          const extractRows = (root: Element): string => {
            const rows = root.querySelectorAll('.ant-descriptions-row')
            return Array.from(rows).map(row => {
              const label = (row.querySelector('.ant-descriptions-item-label') as HTMLElement | null)
                ?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
              const value = (row.querySelector('.ant-descriptions-item-content') as HTMLElement | null)
                ?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
              return label && value ? `${label}\t${value}` : ''
            }).filter(Boolean).join('\n')
          }

          const rows = extractRows(container)
          if (rows) return rows

          return container.textContent?.replace(/\s+/g, ' ').trim()
            .replace(/^Payment[^:]*:?\s*/i, '').trim() ?? ''
        })(),

        productInfoText: (() => {
          const container = document.querySelector('.descriptions') as HTMLElement | null
          if (container) {
            return container.textContent?.replace(/\s+/g, ' ').trim()
              .replace(/^Product Information\s*/i, '').trim() ?? ''
          }
          const attr = document.querySelector(
            '.productAttributes, [class*="productAttr"]'
          ) as HTMLElement | null
          return attr?.textContent?.replace(/\s+/g, ' ').trim()
            .replace(/^Product Information\s*/i, '').trim() ?? ''
        })(),

        productPageRelated: Array.from(
          document.querySelectorAll('.seotp-category .tags-item')
        ).map(el => (el as HTMLElement).textContent?.trim() ?? '').filter(Boolean),

        supplierVerifications: (() => {
          const known = new Set(['Premier Supplier', 'Verified Supplier', 'Ready to Order', 'O2O Supported'])
          const found: string[] = []
          document.querySelectorAll('.company-info-box img[alt]').forEach(img => {
            const alt = (img as HTMLImageElement).alt?.trim()
            if (alt && known.has(alt) && !found.includes(alt)) found.push(alt)
          })
          return found
        })(),
      }
    })

    await page.close(); await ctx.close()
    return parseGlobalSourcesProductDetail(raw)
  } catch (err) {
    await page.close().catch(() => { })
    await ctx.close().catch(() => { })
    if (attempt < GS_CONFIG.retry_max) {
      log.warn(`GS product error — retry ${attempt + 1}/${GS_CONFIG.retry_max}: ${(err as Error).message.slice(0, 80)}`)
      await sleep(GS_CONFIG.retry_delay_ms)
      return scrapeGsProduct(browser, productUrl, attempt + 1)
    }
    log.error(`GS product failed after ${attempt + 1} attempts: ${productUrl.slice(-60)} — ${(err as Error).message.slice(0, 60)}`)
    return null
  }
}
