/**
 * GlobalSources supplier listing page scraper.
 *
 * Supplier listing URLs are derived from product listing URLs by replacing the
 * path segment "-for-sale-price_" with "-manufacturer-supplier_":
 *
 *   https://www.globalsources.com/category/headphones-for-sale-price_18148/
 *   → https://www.globalsources.com/category/headphones-manufacturer-supplier_18148/
 *
 * Each card on the page represents one verified supplier with structured
 * meta fields extracted from DOM.
 *
 * Selectors (confirmed from live page audit):
 *   Card container : .card-box
 *   Name           : .mod-supp-info .right .tit (anchor textContent)
 *   Profile URL    : a.mod-supp-head[href] (on the card)
 *   Years          : .gs-tag.years .num
 *   Verifications  : .gs-tag-group img[alt]
 *   Field rows     : .txt-list .item .attr  → "Key:value, value2" format
 */
import type { Browser } from 'playwright'
import { newGsContext, gsNavigate } from '../browser'
import { log } from '../../../shared/logger'
import { sleep } from '../../../shared/utils'
import { GS_CONFIG } from '../config'

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface GsSupplierCard {
  /** Company display name from the card. */
  name: string
  /** Full profile URL (with scheme normalised to https). */
  profileUrl: string
  /** Numeric GS company ID extracted from profileUrl. */
  platformSupplierId: string | null
  /** Country derived from the subdomain (e.g. "ldnio" → null; flag/country text if present). */
  country: string | null
  /** Years listed on GlobalSources. */
  yearsOnGs: number | null
  /** Verification badge alt texts ("Premier Supplier", "Verified Supplier", …). */
  verifications: string[]
  mainProducts: string[]
  businessTypes: string[]
  /** Raw "No. of Employees" string from the supplier card (e.g. "51-100", "101-500"). */
  employeeCount: string | null
  exportMarkets: string[]
}

// ─── URL DERIVATION ───────────────────────────────────────────────────────────

/**
 * Derive the supplier listing URL from a product listing URL.
 *
 * "https://www.globalsources.com/category/headphones-for-sale-price_18148/"
 * → "https://www.globalsources.com/category/headphones-manufacturer-supplier_18148/"
 *
 * Returns null if the input URL doesn't match the expected pattern.
 */
export function toSupplierListingUrl(productListingUrl: string): string | null {
  const base = productListingUrl.split('?')[0].replace(/\/$/, '')

  const m = base.match(
    /^(https?:\/\/[^/]+\/category\/[^/]+)-(?:for-sale-price|for-sale|products-for-sale)_(\d+)/i
  )
  if (m) return `${m[1]}-manufacturer-supplier_${m[2]}/`

  const replaced = base.replace(
    /(-[a-z-]+-(?:for-sale-price|for-sale|products-for-sale))_(\d+)/i,
    '-manufacturer-supplier_$2'
  )
  return replaced !== base ? replaced + '/' : null
}

// ─── SCRAPER ─────────────────────────────────────────────────────────────────

/**
 * Scrape the supplier listing page for a given category.
 * Returns an empty array on block/error — supplier data is enrichment only.
 */
export async function scrapeGsSupplierListing(
  browser: Browser,
  categoryUrl: string,
  attempt = 0,
): Promise<GsSupplierCard[]> {
  const supplierUrl = toSupplierListingUrl(categoryUrl)
  if (!supplierUrl) {
    log.warn(`scrapeGsSupplierListing: cannot derive supplier URL from: ${categoryUrl}`)
    return []
  }

  const filteredSupplierUrl = supplierUrl.includes('?')
    ? `${supplierUrl}&vbTypes=Manufacturer`
    : `${supplierUrl}?vbTypes=Manufacturer`

  const { page, ctx } = await newGsContext(browser)
  try {
    const ok = await gsNavigate(page, filteredSupplierUrl)

    if (!ok) {
      await page.close(); await ctx.close()
      if (attempt < GS_CONFIG.retry_max) {
        log.warn(`GS supplier listing blocked — retry ${attempt + 1}/${GS_CONFIG.retry_max}: ${filteredSupplierUrl}`)
        await sleep(GS_CONFIG.retry_delay_ms)
        return scrapeGsSupplierListing(browser, categoryUrl, attempt + 1)
      }
      return []
    }

    await page.waitForSelector('.supplier-list .card-box', { timeout: 15_000 }).catch(() => { })

    const rawCards = await page.evaluate(() => {
      const KNOWN_FIELD_KEYS = ['Main Products', 'Business Type', 'No. of Employees', 'Export Market']

      return Array.from(document.querySelectorAll('.card-box')).map(card => {
        const el = card as HTMLElement

        const nameEl = el.querySelector('.mod-supp-info .right .tit') as HTMLElement | null
        const name = nameEl?.textContent?.trim() ?? ''

        const headAnchor = el.querySelector('a.mod-supp-head') as HTMLAnchorElement | null
        const rawHref = headAnchor?.getAttribute('href') ?? ''
        const profileUrl = rawHref.startsWith('//')
          ? `https:${rawHref}`
          : rawHref

        const yearsEl = el.querySelector('.gs-tag.years .num') as HTMLElement | null
        const yearsStr = yearsEl?.textContent?.trim() ?? ''
        const yearsOnGs = yearsStr ? parseInt(yearsStr, 10) : null

        const verifications: string[] = []
        el.querySelectorAll('.gs-tag-group img[alt]').forEach(img => {
          const alt = (img as HTMLImageElement).alt?.trim()
          if (alt) verifications.push(alt)
        })

        const countryEl = el.querySelector('.gs-tag.dot') as HTMLElement | null
        const country = countryEl?.textContent?.trim() || null

        const fields: Record<string, string> = {}
        el.querySelectorAll('.txt-list .item').forEach(itemEl => {
          const attrEl = itemEl.querySelector('.attr') as HTMLElement | null
          const key = attrEl?.textContent?.trim().replace(/:$/, '') ?? ''
          if (!key || !KNOWN_FIELD_KEYS.some(k => key.startsWith(k))) return
          const itemText = (itemEl as HTMLElement).textContent?.trim() ?? ''
          const val = itemText.length > key.length
            ? itemText.slice(key.length).replace(/^\s*:?\s*/, '').trim()
            : ''
          if (val) fields[key] = val
        })

        return {
          name,
          profileUrl,
          country,
          yearsOnGs: isNaN(yearsOnGs as number) ? null : yearsOnGs,
          verifications,
          mainProductsRaw: fields['Main Products'] ?? '',
          businessTypeRaw: fields['Business Type'] ?? '',
          employeeCountRaw: fields['No. of Employees'] ?? null,
          exportMarketRaw: fields['Export Market'] ?? '',
        }
      }).filter(c => c.name)
    })

    await page.close(); await ctx.close()

    const splitCsv = (s: string) =>
      s ? s.split(/[,;]+/).map(v => v.trim()).filter(Boolean) : []

    return rawCards.map(raw => ({
      name: raw.name,
      profileUrl: raw.profileUrl,
      platformSupplierId: extractGsSupplierId(raw.profileUrl),
      country: raw.country,
      yearsOnGs: raw.yearsOnGs,
      verifications: raw.verifications,
      mainProducts: splitCsv(raw.mainProductsRaw),
      businessTypes: splitCsv(raw.businessTypeRaw),
      employeeCount: raw.employeeCountRaw ?? null,
      exportMarkets: splitCsv(raw.exportMarketRaw),
    } satisfies GsSupplierCard))
  } catch (err) {
    await page.close().catch(() => { })
    await ctx.close().catch(() => { })
    if (attempt < GS_CONFIG.retry_max) {
      log.warn(`GS supplier listing error — retry ${attempt + 1}/${GS_CONFIG.retry_max}: ${(err as Error).message.slice(0, 80)}`)
      await sleep(GS_CONFIG.retry_delay_ms)
      return scrapeGsSupplierListing(browser, categoryUrl, attempt + 1)
    }
    log.warn(`GS supplier listing failed: ${supplierUrl?.slice(-60)} — ${(err as Error).message.slice(0, 60)}`)
    return []
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Extract numeric supplier ID from a GS profile URL.
 * "https://ldnio.manufacturer.globalsources.com/homepage_6008851380496.htm"
 * → "6008851380496"
 */
function extractGsSupplierId(profileUrl: string): string | null {
  const m = profileUrl.match(/homepage[_-](\d{8,})\.htm/)
  if (m) return m[1]
  const m2 = profileUrl.match(/[/_-](\d{8,})/)
  if (m2) return m2[1]
  return null
}
