/**
 * Diagnostic: GlobalSources category listing page + one product detail page.
 * Dumps raw field structure so we can design the schema.
 * Run: npx tsx tools/_gs-diag-listing.ts
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'

const CATEGORY_URL = 'https://www.globalsources.com/category/headphones-for-sale-price_18148/'
const SLEEP = (ms: number) => new Promise(r => setTimeout(r, ms))
const OUT_DIR = path.join(__dirname, '../..', 'data')

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
  })

  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
  })
  await ctx.addInitScript('window.__name = window.__name || function(fn){ return fn; }')
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  })

  const page = await ctx.newPage()

  console.log(`\n[diag] Loading category: ${CATEGORY_URL}`)
  await page.goto(CATEGORY_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await SLEEP(5000)
  await page.waitForLoadState('networkidle').catch(() => { })
  await SLEEP(2000)

  console.log('[diag] Page title:', await page.title())

  // ── 1. What is the product listing card structure? ─────────────────────────
  const listingAnalysis = await page.evaluate(() => {
    const results: any = {
      url: window.location.href,
      title: document.title,
    }

    // Try common GS product card selectors
    const selectors = [
      '.product-box', '.product-item', '.item-info', '[data-product-id]',
      '.srp-list .item', '.product-list .item', '.item-box',
      'article', '.prd-box', '.prd-item', '.supplier-info',
      '.product-card', '.result-item', '[class*="product-box"]',
      '[class*="item-list"]', '.listings-box',
    ]

    const selectorCounts: Record<string, number> = {}
    for (const sel of selectors) {
      const count = document.querySelectorAll(sel).length
      if (count > 0) selectorCounts[sel] = count
    }
    results.selectorCounts = selectorCounts

    // Extract first matching card's full HTML
    const hitSel = Object.keys(selectorCounts)[0]
    if (hitSel) {
      const first = document.querySelector(hitSel)
      results.firstCardHtml = first?.outerHTML?.slice(0, 4000)
      results.firstCardSelector = hitSel
    }

    // Dump all unique class names from child elements of body (first 2 levels)
    const bodyClasses = new Set<string>()
    document.querySelectorAll('body > * > * > *').forEach(el => {
      el.className?.toString().split(' ').filter(Boolean).forEach(c => bodyClasses.add(c))
    })
    results.topLevelClasses = [...bodyClasses].slice(0, 100)

    // Look for any links to individual product pages
    const productLinks = Array.from(document.querySelectorAll('a[href]'))
      .map(a => (a as HTMLAnchorElement).href)
      .filter(h => h.includes('/product/') || h.includes('/ProItem/') || h.includes('/product-details/') || h.includes('.html') && h.includes('globalsources'))
      .slice(0, 10)
    results.productLinkSamples = productLinks

    // All links containing "product" in href
    const allProductLinks = Array.from(document.querySelectorAll('a[href*="product"]'))
      .map(a => ({ href: (a as HTMLAnchorElement).href, text: (a as HTMLAnchorElement).textContent?.trim().slice(0, 60) }))
      .filter(l => l.href.includes('globalsources'))
      .slice(0, 15)
    results.allProductLinkSamples = allProductLinks

    return results
  })

  console.log('\n[diag] === LISTING PAGE ANALYSIS ===')
  console.log('Matching selectors:', JSON.stringify(listingAnalysis.selectorCounts, null, 2))
  console.log('\nProduct link samples:', JSON.stringify(listingAnalysis.productLinkSamples, null, 2))
  console.log('\nAll product-href links:', JSON.stringify(listingAnalysis.allProductLinkSamples, null, 2))
  if (listingAnalysis.firstCardSelector) {
    console.log(`\nFirst card selector: ${listingAnalysis.firstCardSelector}`)
    console.log('First card HTML (first 2000 chars):')
    console.log(listingAnalysis.firstCardHtml?.slice(0, 2000))
  }
  console.log('\nTop-level CSS classes sample:', listingAnalysis.topLevelClasses?.slice(0, 40).join(', '))

  // Save raw HTML for offline inspection
  const html = await page.content()
  const htmlPath = path.join(OUT_DIR, '_diag-listing.html')
  fs.writeFileSync(htmlPath, html, 'utf-8')
  console.log(`\n[diag] Full HTML saved to: ${htmlPath}`)

  // ── 2. Find a real product detail page URL ──────────────────────────────
  const productDetailUrl = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll('a[href]'))
      .map(a => (a as HTMLAnchorElement).href)
      .filter(h =>
        h.includes('globalsources.com') &&
        (h.includes('/product/') || h.includes('ProItem') || h.match(/\/[A-Za-z0-9-]+-\d+\.html/) || h.includes('/p/'))
      )
    return candidates[0] ?? null
  })

  console.log('\n[diag] Found product detail URL candidate:', productDetailUrl)

  // ── 3. Navigate to product detail page ────────────────────────────────────
  if (productDetailUrl) {
    console.log(`\n[diag] Loading product detail: ${productDetailUrl}`)
    await page.goto(productDetailUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await SLEEP(5000)
    await page.waitForLoadState('networkidle').catch(() => { })
    await SLEEP(2000)

    console.log('[diag] Product page title:', await page.title())
    console.log('[diag] Product page URL:', page.url())

    const productAnalysis = await page.evaluate(() => {
      const results: any = {
        url: window.location.href,
        title: document.title,
      }

      const selectors = [
        '.product-detail', '.product-info', '.pro-detail',
        '[class*="product-detail"]', '[class*="pro-info"]',
        '.item-detail', '.specification', '.spec-box',
        'table.spec', '.product-spec', '[class*="spec"]',
        '.price-box', '.price-info', '[class*="price"]',
        '.supplier-card', '.company-card', '[class*="supplier"]',
      ]
      const selectorCounts: Record<string, number> = {}
      for (const sel of selectors) {
        const count = document.querySelectorAll(sel).length
        if (count > 0) selectorCounts[sel] = count
      }
      results.selectorCounts = selectorCounts

      // Get product name
      const nameSelectors = ['h1', '.pro-name', '.product-name', '#productName', '[class*="product-name"]']
      for (const s of nameSelectors) {
        const el = document.querySelector(s)
        if (el?.textContent?.trim()) {
          results.productName = { selector: s, text: el.textContent.trim().slice(0, 200) }
          break
        }
      }

      // Look for price, MOQ, etc.
      const pageText = document.body.innerText
      const priceMatch = pageText.match(/(?:US\s?\$|USD)\s?[\d,.]+/i)
      const moqMatch = pageText.match(/(?:Min\.?\s*Order|MOQ)[:\s]+[\d,]+ ?(?:pieces?|units?|pcs?|sets?)/i)
      results.priceFound = priceMatch?.[0]
      results.moqFound = moqMatch?.[0]

      // Headings
      results.headings = Array.from(document.querySelectorAll('h1, h2, h3'))
        .map(h => ({ tag: h.tagName, text: h.textContent?.trim().slice(0, 120) }))
        .filter(h => h.text)
        .slice(0, 15)

      // Look for specification table
      const specTable = document.querySelector('table')
      results.firstTableHtml = specTable?.outerHTML?.slice(0, 3000)

      // Look for JSON-LD structured data
      const jsonLds = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
        .map(s => s.textContent?.slice(0, 2000))
        .filter(Boolean)
      results.jsonLd = jsonLds

      // Key meta tags
      const metas: Record<string, string> = {}
      document.querySelectorAll('meta[name], meta[property]').forEach(m => {
        const key = m.getAttribute('name') ?? m.getAttribute('property') ?? ''
        const val = m.getAttribute('content') ?? ''
        if (key && val && ['description', 'og:title', 'og:description', 'keywords'].includes(key)) {
          metas[key] = val.slice(0, 200)
        }
      })
      results.metaTags = metas

      return results
    })

    console.log('\n[diag] === PRODUCT DETAIL PAGE ANALYSIS ===')
    console.log('Matching selectors:', JSON.stringify(productAnalysis.selectorCounts, null, 2))
    console.log('Product name:', JSON.stringify(productAnalysis.productName))
    console.log('Price found:', productAnalysis.priceFound)
    console.log('MOQ found:', productAnalysis.moqFound)
    console.log('Headings:', JSON.stringify(productAnalysis.headings, null, 2))
    console.log('JSON-LD:', JSON.stringify(productAnalysis.jsonLd, null, 2))
    console.log('Meta tags:', JSON.stringify(productAnalysis.metaTags, null, 2))
    if (productAnalysis.firstTableHtml) {
      console.log('\nFirst table HTML (2000 chars):')
      console.log(productAnalysis.firstTableHtml.slice(0, 2000))
    }

    const productHtml = await page.content()
    const productHtmlPath = path.join(OUT_DIR, '_diag-product.html')
    fs.writeFileSync(productHtmlPath, productHtml, 'utf-8')
    console.log(`\n[diag] Product page HTML saved to: ${productHtmlPath}`)
  }

  await browser.close()
  console.log('\n[diag] Done.')
}

main().catch(err => {
  console.error('[diag] FATAL:', err)
  process.exit(1)
})
