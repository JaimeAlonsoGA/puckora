/**
 * Diagnostic v2: Extract full listing card data + navigate to real product detail page.
 * Run: npx tsx tools/_gs-diag-product.ts
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

  // ── 1. Extract all card data from listing page ─────────────────────────────
  const cards = await page.evaluate(() => {
    const items = document.querySelectorAll('.product-list .item')
    return Array.from(items).slice(0, 5).map((item) => {
      const el = item as HTMLElement

      // Product URL + name
      const linkEl = el.querySelector('a[href]') as HTMLAnchorElement | null
      const productUrl = linkEl?.href ?? ''

      const nameEl = el.querySelector('.product-name, [class*="product-name"]')
      const productName = nameEl?.textContent?.trim() ?? ''

      // Price
      const priceEl = el.querySelector('.price, [class*="price-box"] .price, span.price')
      const priceText = priceEl?.textContent?.trim() ?? ''

      // MOQ
      const moqEl = el.querySelector('.txt, [class*="moq"]')
      const moqText = moqEl?.textContent?.trim().replace(/\s+/g, ' ') ?? ''

      // Unit
      const unitEl = el.querySelector('.unit, i.unit')
      const unit = unitEl?.textContent?.trim() ?? ''

      // Image
      const imgEl = el.querySelector('img.img, img[data-src]') as HTMLImageElement | null
      const image = imgEl?.src ?? imgEl?.getAttribute('data-src') ?? ''

      // Tags / badges (Premier Supplier, Verified, etc.)
      const tagEls = el.querySelectorAll('[class*="gs-tag"], [class*="tag"]')
      const tags = Array.from(tagEls)
        .map(t => t.getAttribute('alt') ?? t.textContent?.trim() ?? '')
        .filter(Boolean)

      // Supplier info (usually in a separate block below the card)
      const supplierEl = el.querySelector('[class*="supplier"], [class*="company"]')
      const supplierText = supplierEl?.textContent?.trim().slice(0, 200) ?? ''

      // Full innerHTML for deeper inspection
      const html = el.innerHTML.slice(0, 3000)

      return { productUrl, productName, priceText, moqText, unit, image, tags, supplierText, html }
    })
  })

  console.log('\n[diag] === LISTING CARDS (first 5) ===')
  for (const [i, c] of cards.entries()) {
    console.log(`\n--- Card ${i + 1} ---`)
    console.log('url  :', c.productUrl)
    console.log('name :', c.productName)
    console.log('price:', c.priceText)
    console.log('moq  :', c.moqText)
    console.log('unit :', c.unit)
    console.log('img  :', c.image)
    console.log('tags :', c.tags)
    console.log('supplier:', c.supplierText)
  }

  // Save full HTML
  const html = await page.content()
  fs.writeFileSync(path.join(OUT_DIR, '_diag-listing2.html'), html, 'utf-8')

  // Save first card full HTML
  if (cards[0]) {
    console.log('\n\n--- FIRST CARD FULL HTML ---')
    console.log(cards[0].html)
  }

  // ── 2. Navigate to the first real product detail page ─────────────────────
  // Product URLs look like: /Wired-earphone/Wired-Earbuds-1233123763p.htm
  const firstProductUrl = cards.find(c => c.productUrl.endsWith('p.htm') || c.productUrl.includes('globalsources.com/') && !c.productUrl.includes('category') && !c.productUrl.includes('manufacturers') && !c.productUrl.includes('links'))?.productUrl

  console.log('\n\n[diag] Navigating to product detail:', firstProductUrl)
  if (!firstProductUrl) {
    console.log('[diag] No product URL found in cards — check first card HTML above')
    await browser.close()
    return
  }

  await page.goto(firstProductUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await SLEEP(5000)
  await page.waitForLoadState('networkidle').catch(() => { })
  await SLEEP(2000)

  console.log('[diag] Product page title:', await page.title())
  console.log('[diag] Product page URL:', page.url())

  const productData = await page.evaluate(() => {
    const data: any = {
      url: window.location.href,
      title: document.title,
    }

    // ── Product name ──────────────────────────────────────────────────────────
    const h1 = document.querySelector('h1')
    data.h1 = h1?.textContent?.trim()

    // ── Prices ────────────────────────────────────────────────────────────────
    const allPrices = Array.from(document.querySelectorAll('[class*="price"]'))
      .map(el => ({ sel: el.className, text: el.textContent?.trim().replace(/\s+/g, ' ').slice(0, 200) }))
      .filter(p => p.text && p.text.length < 200 && /[\d$]/.test(p.text))
      .slice(0, 10)
    data.priceElements = allPrices

    // ── MOQ ────────────────────────────────────────────────────────────────────
    const moqPattern = /(?:Min\.?\s*Order|MOQ)[:\s]*/i
    const allText = Array.from(document.querySelectorAll('*'))
      .filter(el => el.children.length === 0 && moqPattern.test(el.textContent ?? ''))
      .map(el => el.textContent?.trim().replace(/\s+/g, ' ').slice(0, 200))
      .filter(Boolean)
    data.moqTexts = allText.slice(0, 5)

    // ── Supplier block ────────────────────────────────────────────────────────
    const supplierSels = ['[class*="supplier"]', '[class*="company"]', '[class*="seller"]', '.store-info', '.vendor']
    const supplierBlocks: any[] = []
    for (const sel of supplierSels) {
      document.querySelectorAll(sel).forEach(el => {
        const text = el.textContent?.trim().replace(/\s+/g, ' ').slice(0, 500)
        if (text) supplierBlocks.push({ sel, text })
      })
    }
    data.supplierBlocks = supplierBlocks.slice(0, 5)

    // ── Specification table ───────────────────────────────────────────────────
    // Find all tables or definition lists
    const tables = Array.from(document.querySelectorAll('table, dl, [class*="spec"]'))
      .map(el => ({ tag: el.tagName, cls: el.className, html: el.outerHTML.slice(0, 2000) }))
      .slice(0, 5)
    data.specElements = tables

    // ── Product images ────────────────────────────────────────────────────────
    const images = Array.from(document.querySelectorAll('img[src*="globalsources"], img[src*="p.globalso"]'))
      .map(img => (img as HTMLImageElement).src)
      .filter(Boolean)
      .slice(0, 10)
    data.images = images

    // ── JSON-LD ────────────────────────────────────────────────────────────────
    const jsonLds = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .map(s => { try { return JSON.parse(s.textContent ?? '{}') } catch { return null } })
      .filter(Boolean)
    data.jsonLd = jsonLds

    // ── Meta tags ─────────────────────────────────────────────────────────────
    const metas: Record<string, string> = {}
    document.querySelectorAll('meta[name], meta[property]').forEach(m => {
      const key = m.getAttribute('name') ?? m.getAttribute('property') ?? ''
      const val = m.getAttribute('content') ?? ''
      if (key && val) metas[key] = val.slice(0, 300)
    })
    data.metaTags = metas

    // ── Category breadcrumb ───────────────────────────────────────────────────
    const breadcrumb = Array.from(document.querySelectorAll('[class*="breadcrumb"] a, nav[aria-label*="breadcrumb"] a, ol li a'))
      .map(a => ({ text: a.textContent?.trim(), href: (a as HTMLAnchorElement).href }))
      .filter(b => b.text)
    data.breadcrumb = breadcrumb

    // ── All headings to map structure ─────────────────────────────────────────
    data.headings = Array.from(document.querySelectorAll('h1,h2,h3,h4'))
      .map(h => ({ tag: h.tagName, text: h.textContent?.trim().slice(0, 200) }))
      .filter(h => h.text)

    // ── All section labels / dt elements ─────────────────────────────────────
    data.dtElements = Array.from(document.querySelectorAll('dt, [class*="label"], th'))
      .map(el => el.textContent?.trim().replace(/\s+/g, ' ').slice(0, 100))
      .filter(Boolean)
      .slice(0, 50)

    return data
  })

  console.log('\n[diag] === PRODUCT DETAIL PAGE ===')
  console.log('URL:', productData.url)
  console.log('H1:', productData.h1)
  console.log('\nPrice elements:', JSON.stringify(productData.priceElements, null, 2))
  console.log('\nMOQ texts:', productData.moqTexts)
  console.log('\nBreadcrumb:', JSON.stringify(productData.breadcrumb, null, 2))
  console.log('\nHeadings:', JSON.stringify(productData.headings, null, 2))
  console.log('\nDT/label elements (first 30):', productData.dtElements?.slice(0, 30))
  console.log('\nSupplier blocks:', JSON.stringify(productData.supplierBlocks, null, 2))
  console.log('\nJSON-LD:', JSON.stringify(productData.jsonLd, null, 2))
  console.log('\nMeta tags:', JSON.stringify(productData.metaTags, null, 2))
  console.log('\nImages (first 5):', productData.images?.slice(0, 5))
  console.log('\nSpec elements sample:', JSON.stringify(productData.specElements?.slice(0, 2), null, 2))

  const productHtml = await page.content()
  const productHtmlPath = path.join(OUT_DIR, '_diag-product2.html')
  fs.writeFileSync(productHtmlPath, productHtml, 'utf-8')
  console.log(`\n[diag] Product page HTML saved to: ${productHtmlPath}`)

  await browser.close()
  console.log('\n[diag] Done.')
}

main().catch(err => {
  console.error('[diag] FATAL:', err)
  process.exit(1)
})
