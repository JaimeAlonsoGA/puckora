/**
 * GS deep diagnostic — scrapes 15–20 real product pages from 4 different
 * categories to map the actual DOM structure, field presence, and edge cases.
 *
 * Run: npx tsx tools/gs/deep-diag.ts
 * Output: data/gs-deep-diag.json + data/gs-deep-diag-summary.txt
 */
import { chromium, type Browser, type Page } from 'playwright'
import fs from 'fs'
import path from 'path'

const SLEEP = (ms: number) => new Promise(r => setTimeout(r, ms))
const OUT_DIR = path.join(__dirname, '../../data')
fs.mkdirSync(OUT_DIR, { recursive: true })

// Pick a variety of categories to expose edge-cases
const CATEGORIES = [
    'https://www.globalsources.com/category/headphones-for-sale-price_18148/',
    'https://www.globalsources.com/category/led-bulbs-for-sale-price_245800/',
    'https://www.globalsources.com/category/yoga-mats-for-sale-price_134064/',
    'https://www.globalsources.com/category/power-banks-for-sale-price_16956/',
]

// ─── BROWSER SETUP ───────────────────────────────────────────────────────────

async function makeBrowser(): Promise<Browser> {
    return chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
    })
}

async function makePage(browser: Browser): Promise<Page> {
    const ctx = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        viewport: { width: 1440, height: 900 },
        locale: 'en-US',
    })
    await ctx.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
        // @ts-ignore
        window.__name = window.__name || function (fn: unknown) { return fn }
    })
    return ctx.newPage()
}

// ─── LISTING CARD COLLECTOR ───────────────────────────────────────────────────

async function collectProductUrls(page: Page, categoryUrl: string): Promise<string[]> {
    console.log(`\n[listing] ${categoryUrl}`)
    await page.goto(categoryUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await SLEEP(5000)
    await page.waitForLoadState('networkidle').catch(() => { })
    await SLEEP(2000)

    return page.evaluate(() => {
        const urls: string[] = []
        document.querySelectorAll('.product-list .item a[href]').forEach(a => {
            const href = (a as HTMLAnchorElement).href
            if (href && href.includes('globalsources.com') && href.endsWith('p.htm') && !urls.includes(href)) {
                urls.push(href)
            }
        })
        return urls.slice(0, 5) // max 5 per category
    })
}

// ─── PRODUCT PAGE DEEP EXTRACTOR ─────────────────────────────────────────────

async function extractProductPage(page: Page, url: string): Promise<Record<string, unknown>> {
    console.log(`  [product] ${url.slice(url.indexOf('//', 8) + 2, url.indexOf('//', 8) + 60)}…`)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await SLEEP(5000)
    await page.waitForLoadState('networkidle').catch(() => { })
    await SLEEP(1500)

    return page.evaluate(() => {
        const d: Record<string, unknown> = { url: window.location.href, title: document.title }

        // ── JSON-LD ───────────────────────────────────────────────────────────────
        d.jsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
            .map(s => { try { return JSON.parse(s.textContent ?? '{}') } catch { return null } })
            .filter(Boolean)

        // ── h1 ────────────────────────────────────────────────────────────────────
        d.h1 = document.querySelector('h1')?.textContent?.trim()

        // ── All headings ──────────────────────────────────────────────────────────
        d.headings = Array.from(document.querySelectorAll('h1,h2,h3,h4'))
            .map(h => ({ tag: h.tagName, text: h.textContent?.trim().slice(0, 200) }))
            .filter(h => (h.text?.length ?? 0) > 1)

        // ── Price elements — every class containing "price" ───────────────────────
        d.priceElements = Array.from(document.querySelectorAll('[class*="price"]'))
            .map(el => ({ cls: el.className, text: el.textContent?.trim().replace(/\s+/g, ' ').slice(0, 300) }))
            .filter(p => (p.text?.length ?? 0) > 0 && (p.text?.length ?? 0) < 300)
            .slice(0, 15)

        // ── MOQ ───────────────────────────────────────────────────────────────────
        d.moqTexts = Array.from(document.querySelectorAll('*'))
            .filter(el => el.children.length === 0 && /min\.?\s*order|moq/i.test(el.textContent ?? ''))
            .map(el => el.textContent?.trim().replace(/\s+/g, ' ').slice(0, 200))
            .filter(Boolean)
            .slice(0, 5)

        // ── Full spec table: every dt→dd or th→td pair ────────────────────────────
        const specRows: [string, string][] = []
        // DL approach
        document.querySelectorAll('dt').forEach(dt => {
            const dd = dt.nextElementSibling
            const label = dt.textContent?.trim().replace(/[:\s]+$/, '') ?? ''
            const value = (dd as HTMLElement)?.textContent?.trim() ?? ''
            if (label && value) specRows.push([label, value])
        })
        // Table approach (if no DL)
        if (specRows.length === 0) {
            document.querySelectorAll('tr').forEach(tr => {
                const cells = tr.querySelectorAll('th, td')
                if (cells.length >= 2) {
                    const label = cells[0].textContent?.trim().replace(/[:\s]+$/, '') ?? ''
                    const value = cells[1].textContent?.trim() ?? ''
                    if (label && value) specRows.push([label, value])
                }
            })
        }
        d.specRows = specRows

        // ── Supplier / company block ──────────────────────────────────────────────
        const supplierSelectors = [
            '[class*="supplier-info"]', '[class*="company-info"]',
            '[class*="supplier"]', '[class*="company"]',
            '[class*="seller"]', '.store-info',
        ]
        for (const sel of supplierSelectors) {
            const el = document.querySelector(sel)
            if (el) {
                const text = el.textContent?.trim().replace(/\s+/g, ' ')
                if (text && text.length > 10) {
                    d.supplierBlock = { selector: sel, text: text.slice(0, 1000) }
                    d.supplierHtml = (el as HTMLElement).innerHTML.slice(0, 3000)
                    break
                }
            }
        }

        // ── Key/special features section ─────────────────────────────────────────
        // Look for sections with "feature", "highlight", "key spec"
        const featureSels = [
            '[class*="feature"]', '[class*="highlight"]', '[class*="key-spec"]',
            '[class*="selling-point"]', '[class*="main-feature"]',
        ]
        const features: string[] = []
        for (const sel of featureSels) {
            document.querySelectorAll(sel).forEach(el => {
                const text = el.textContent?.trim().replace(/\s+/g, ' ')
                if (text && text.length > 5 && text.length < 500) features.push(text)
            })
        }
        d.featureSections = features.slice(0, 10)

        // ── Q&A section ───────────────────────────────────────────────────────────
        const qaSels = ['[class*="qa"]', '[class*="q-a"]', '[class*="question"]', '[class*="faq"]']
        const qaTexts: string[] = []
        for (const sel of qaSels) {
            document.querySelectorAll(sel).forEach(el => {
                const text = el.textContent?.trim().replace(/\s+/g, ' ')
                if (text && text.length > 10) qaTexts.push(text.slice(0, 300))
            })
        }
        d.qaSection = qaTexts.slice(0, 5)

        // ── Certifications ────────────────────────────────────────────────────────
        const certSels = ['[class*="cert"]', '[class*="certif"]', '[alt*="CE"]', '[alt*="RoHS"]', '[alt*="FCC"]', '[alt*="ISO"]']
        const certTexts: Set<string> = new Set()
        for (const sel of certSels) {
            document.querySelectorAll(sel).forEach(el => {
                const text = el.getAttribute('alt') ?? el.textContent?.trim() ?? ''
                if (text) certTexts.add(text)
            })
        }
        d.certifications = [...certTexts].slice(0, 20)

        // ── Images ───────────────────────────────────────────────────────────────
        d.images = Array.from(document.querySelectorAll('img'))
            .filter(img => img.src && (img.src.includes('globalsources') || img.src.includes('globalso')))
            .map(img => ({ src: (img as HTMLImageElement).src.split('?')[0], alt: img.alt }))
            .slice(0, 10)

        // ── Shipping / logistics section ─────────────────────────────────────────
        const shipSels = ['[class*="ship"]', '[class*="logistic"]', '[class*="delivery"]', '[class*="freight"]']
        const shipTexts: string[] = []
        for (const sel of shipSels) {
            document.querySelectorAll(sel).forEach(el => {
                const text = el.textContent?.trim().replace(/\s+/g, ' ')
                if (text && text.length > 5) shipTexts.push(text.slice(0, 300))
            })
        }
        d.shippingSection = shipTexts.slice(0, 5)

        // ── Rating / review count ─────────────────────────────────────────────────
        const ratingEls = Array.from(document.querySelectorAll('[class*="rating"], [class*="review"], [class*="star"]'))
            .map(el => ({ cls: el.className, text: el.textContent?.trim().replace(/\s+/g, ' ').slice(0, 100) }))
            .filter(e => e.text && e.text.length > 0)
        d.ratingElements = ratingEls.slice(0, 5)

        // ── Breadcrumb ────────────────────────────────────────────────────────────
        d.breadcrumb = Array.from(document.querySelectorAll('[class*="breadcrumb"] a, nav ol li a'))
            .map(a => ({ text: a.textContent?.trim(), href: (a as HTMLAnchorElement).href }))
            .filter(b => b.text)

        // ── Lead time prominence ──────────────────────────────────────────────────
        const leadTimeTexts = Array.from(document.querySelectorAll('*'))
            .filter(el => el.children.length === 0 && /lead\s*time|sample.*day|production.*day/i.test(el.textContent ?? ''))
            .map(el => el.textContent?.trim().replace(/\s+/g, ' ').slice(0, 200))
            .filter(Boolean)
        d.leadTimeTexts = leadTimeTexts.slice(0, 5)

        // ── Meta tags ─────────────────────────────────────────────────────────────
        const metas: Record<string, string> = {}
        document.querySelectorAll('meta[name], meta[property]').forEach(m => {
            const key = m.getAttribute('name') ?? m.getAttribute('property') ?? ''
            const val = m.getAttribute('content') ?? ''
            if (key && val && key.length < 50) metas[key] = val.slice(0, 300)
        })
        d.metaTags = metas

        // ── All top-level CSS classes (fingerprint) ────────────────────────────────
        const allClasses = new Set<string>()
        document.querySelectorAll('[class]').forEach(el => {
            el.className?.toString().split(/\s+/).forEach(c => { if (c && !c.match(/^data-v-/)) allClasses.add(c) })
        })
        d.allClasses = [...allClasses].slice(0, 80)

        return d
    })
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
    const browser = await makeBrowser()
    const allResults: Record<string, unknown>[] = []
    const categoryMap: Record<string, string[]> = {}

    try {
        // ── Step 1: collect product URLs from each category ───────────────────────
        const listingPage = await makePage(browser)
        for (const catUrl of CATEGORIES) {
            const urls = await collectProductUrls(listingPage, catUrl)
            categoryMap[catUrl] = urls
            console.log(`  → found ${urls.length} product URLs`)
        }
        await listingPage.close()

        const allUrls = Object.entries(categoryMap).flatMap(([cat, urls]) =>
            urls.map(u => ({ cat, url: u }))
        )
        console.log(`\nTotal product URLs to scrape: ${allUrls.length}`)

        // ── Step 2: scrape each product page ─────────────────────────────────────
        const productPage = await makePage(browser)
        for (const { cat, url } of allUrls) {
            try {
                const data = await extractProductPage(productPage, url)
                allResults.push({ ...data, _category: cat })
                await SLEEP(2000)
            } catch (err) {
                console.error(`  [error] ${url}: ${(err as Error).message}`)
                allResults.push({ url, _error: (err as Error).message, _category: cat })
            }
        }
        await productPage.close()

    } finally {
        await browser.close()
    }

    // ── Step 3: write JSON output ─────────────────────────────────────────────
    const jsonPath = path.join(OUT_DIR, 'gs-deep-diag.json')
    fs.writeFileSync(jsonPath, JSON.stringify(allResults, null, 2), 'utf-8')
    console.log(`\nFull results → ${jsonPath}`)

    // ── Step 4: write a concise text summary ─────────────────────────────────
    const lines: string[] = []
    lines.push(`GS DEEP DIAGNOSTIC — ${new Date().toISOString()}`)
    lines.push(`Products scraped: ${allResults.length}\n`)

    for (const [i, r] of allResults.entries()) {
        const res = r as any
        lines.push(`\n${'─'.repeat(80)}`)
        lines.push(`[${i + 1}] ${res.url}`)
        lines.push(`CATEGORY: ${res._category}`)

        // JSON-LD summary
        const productLd = (res.jsonLd ?? []).find((ld: any) => ld?.['@type'] === 'Product')
        const breadcrumbLd = (res.jsonLd ?? []).find((ld: any) => ld?.['@type'] === 'BreadcrumbList')
        lines.push(`JSON-LD Product present: ${!!productLd}`)
        if (productLd) {
            lines.push(`  name       : ${productLd.name?.slice(0, 80)}`)
            lines.push(`  description: ${productLd.description?.slice(0, 120) ?? 'null'}`)
            lines.push(`  price_low  : ${productLd.offers?.lowPrice ?? productLd.offers?.price ?? 'null'}`)
            lines.push(`  price_high : ${productLd.offers?.highPrice ?? 'null'}`)
            lines.push(`  currency   : ${productLd.offers?.priceCurrency ?? 'null'}`)
            lines.push(`  images     : ${Array.isArray(productLd.image) ? productLd.image.length : (productLd.image ? 1 : 0)}`)
            lines.push(`  sku/model  : ${productLd.sku ?? productLd.mpn ?? 'null'}`)
            lines.push(`  brand      : ${typeof productLd.brand === 'object' ? productLd.brand?.name : (productLd.brand ?? 'null')}`)
        }
        lines.push(`JSON-LD BreadcrumbList: ${breadcrumbLd ? JSON.stringify(breadcrumbLd.itemListElement?.map((i: any) => i.item?.name ?? i.name)) : 'null'}`)

        // Spec rows summary
        const specRows = (res.specRows ?? []) as [string, string][]
        lines.push(`Spec rows (${specRows.length}):`)
        specRows.slice(0, 30).forEach(([k, v]) => lines.push(`  ${k.padEnd(35)} → ${v.slice(0, 80)}`))

        // MOQ
        lines.push(`MOQ texts: ${JSON.stringify(res.moqTexts)}`)

        // Price elements
        lines.push(`Price elements (${(res.priceElements as any[] ?? []).length}):`)
            ; (res.priceElements as any[] ?? []).slice(0, 6).forEach((p: any) =>
                lines.push(`  .${p.cls?.split(' ')[0].slice(0, 30).padEnd(30)} → "${p.text?.slice(0, 60)}"`)
            )

        // Supplier
        if (res.supplierBlock) {
            lines.push(`Supplier selector: ${(res.supplierBlock as any).selector}`)
            lines.push(`Supplier text    : ${(res.supplierBlock as any).text?.slice(0, 300)}`)
        }

        // Features / Q&A / certs
        lines.push(`Feature sections: ${res.featureSections ? (res.featureSections as string[]).length : 0}`)
        lines.push(`Q&A section     : ${res.qaSection ? (res.qaSection as string[]).length : 0} items`)
        lines.push(`Certifications  : ${JSON.stringify(res.certifications)}`)
        lines.push(`Lead time texts : ${JSON.stringify(res.leadTimeTexts)}`)
        lines.push(`Rating elements : ${JSON.stringify((res.ratingElements as any[] ?? []).map((e: any) => e.text))}`)
        lines.push(`Images found    : ${(res.images as any[] ?? []).length}`)

        // Meta tags
        const og = res.metaTags as Record<string, string> ?? {}
        lines.push(`og:title         : ${og['og:title']?.slice(0, 100) ?? 'null'}`)
        lines.push(`description      : ${og['description']?.slice(0, 100) ?? 'null'}`)
        lines.push(`keywords         : ${og['keywords']?.slice(0, 100) ?? 'null'}`)
    }

    const summaryPath = path.join(OUT_DIR, 'gs-deep-diag-summary.txt')
    fs.writeFileSync(summaryPath, lines.join('\n'), 'utf-8')
    console.log(`Summary → ${summaryPath}`)
    console.log('\nDone ✓')
}

main().catch(err => {
    console.error('FATAL:', err)
    process.exit(1)
})
