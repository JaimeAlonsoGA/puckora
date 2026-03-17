/**
 * GlobalSources Category Scraper
 * ─────────────────────────────────────────────────────────────────────────────
 * Scrapes every top-level category and all hover-revealed subcategories from
 * https://www.globalsources.com and writes the result to:
 *   apps/scraper/data/globalsources-categories.json
 *
 * Run from apps/scraper/:
 *   npx tsx tools/scrape-globalsources-categories.ts
 *
 * Flags:
 *   --headful        Launch browser with a visible window (useful for debugging)
 *   --timeout <ms>   Per-navigation timeout in ms (default: 60000)
 *   --out <path>     Override output file path
 */

import fs from 'fs'
import path from 'path'
import { chromium, type Browser, type Page } from 'playwright'

// ─── CLI FLAGS ───────────────────────────────────────────────────────────────

const argv = process.argv.slice(2)
const HEADFUL = argv.includes('--headful')
const TIMEOUT = (() => {
    const idx = argv.indexOf('--timeout')
    return idx !== -1 ? parseInt(argv[idx + 1], 10) : 60_000
})()
const OUT_PATH = (() => {
    const idx = argv.indexOf('--out')
    return idx !== -1
        ? argv[idx + 1]
        : path.resolve(process.cwd(), 'data', 'globalsources-categories.json')
})()

const GS_URL = 'https://www.globalsources.com'

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface SubCategory {
    name: string
    url: string
    /** Deeper nesting if the mega-menu has grouped sections */
    children?: SubCategory[]
}

interface Category {
    name: string
    url: string
    subcategories: SubCategory[]
}

interface ScrapeResult {
    scrapedAt: string
    source: string
    totalCategories: number
    totalSubcategories: number
    categories: Category[]
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms))
}

function log(msg: string): void {
    console.log(`[gs-scraper] ${new Date().toISOString().substring(11, 19)} ${msg}`)
}

/** Resolve a possibly-relative URL against the GS origin. */
function resolveUrl(href: string | null): string {
    if (!href) return GS_URL
    if (href.startsWith('http')) return href
    if (href.startsWith('//')) return `https:${href}`
    return `${GS_URL}${href.startsWith('/') ? '' : '/'}${href}`
}

// ─── BROWSER SETUP ───────────────────────────────────────────────────────────

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
]

async function launchBrowser(): Promise<Browser> {
    return chromium.launch({
        headless: !HEADFUL,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--disable-infobars',
            '--window-size=1920,1080',
            '--disable-features=IsolateOrigins,site-per-process',
        ],
    })
}

async function createStealthPage(browser: Browser): Promise<Page> {
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]

    const ctx = await browser.newContext({
        userAgent: ua,
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
        extraHTTPHeaders: {
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'sec-ch-ua': '"Chromium";v="133", "Google Chrome";v="133", "Not-A.Brand";v="8"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'Upgrade-Insecure-Requests': '1',
        },
    })

    // Polyfill esbuild's __name helper (injected into page.evaluate source) — must use
    // a raw string so esbuild itself doesn't also transform/reference __name here.
    await ctx.addInitScript('window.__name = window.__name || function(fn){ return fn; }')

    // Remove automation signals + polyfill esbuild helpers that leak into evaluate()
    await ctx.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
        Object.defineProperty(navigator, 'plugins', {
            get: () => {
                const arr = [
                    { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                    { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
                    { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
                ]
                return Object.assign(arr, { item: (i: number) => arr[i], namedItem: (n: string) => arr.find(p => p.name === n) ?? null })
            },
        })
        Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] })
            ; (window as any).chrome = {
                app: { isInstalled: false },
                runtime: {},
                loadTimes: () => ({}),
                csi: () => ({}),
            }
    })

    // Skip fonts, analytics, ads for speed
    await ctx.route(/\.(woff2?|ttf|otf|eot)(\?.*)?$/, r => r.abort())
    await ctx.route(/google-analytics\.com|doubleclick\.net|facebook\.net|hotjar\.com/, r => r.abort())

    return ctx.newPage()
}

// ─── WAIT FOR ANTI-BOT ───────────────────────────────────────────────────────

/**
 * GlobalSources uses Incapsula. Wait until the nav is visible —
 * if the interstitial fires we just wait; if it doesn't clear in time we throw.
 */
async function waitForNav(page: Page): Promise<void> {
    log('Waiting for Incapsula interstitial to clear…')

    // Step 1: wait for any pending navigation (Incapsula does a JS challenge redirect)
    try {
        await page.waitForLoadState('domcontentloaded', { timeout: 20_000 })
    } catch (_) { /* non-fatal */ }

    // Step 2: give Incapsula time to evaluate JS and maybe redirect again
    await sleep(4_000)

    // Step 3: wait for the *final* page to become network-idle
    try {
        await page.waitForLoadState('networkidle', { timeout: 30_000 })
    } catch (_) { /* non-fatal — continue even on timeout */ }

    // Step 4: confirm a real nav element exists  (polls with error tolerance)
    const deadline = Date.now() + TIMEOUT
    while (Date.now() < deadline) {
        try {
            const ready = await page.evaluate(() => {
                const selectors = [
                    '.top-nav', '.nav-bar', '.category-nav', '.header-nav',
                    'nav', '#header', '.gs-header', '.site-header',
                    '[class*="header"]', '[class*="nav"]',
                ]
                for (const s of selectors) {
                    if (document.querySelector(s)) return true
                }
                const block = document.getElementById('incapsula-redirect-iframe') ||
                    document.querySelector('.incapsula')
                return !block && document.readyState === 'complete'
            })
            if (ready) break
        } catch (_) {
            // Context destroyed (reload in progress) — wait and retry
        }
        await sleep(1_500)
    }

    // Final buffer for JS-rendered nav
    await sleep(2_000)
}

// ─── DOM EXTRACTION ──────────────────────────────────────────────────────────

/**
 * Called after hovering a top-level nav item to harvest the open mega-menu.
 * Works with both simple dropdown lists and multi-column mega-menus.
 */
async function extractOpenDropdown(page: Page, navItemText: string): Promise<SubCategory[]> {
    // Wait a beat for the dropdown animation
    await sleep(600)

    return page.evaluate((catName: string) => {
        function resolveHref(el: Element): string {
            const href = (el as HTMLAnchorElement).href || el.getAttribute('href') || ''
            if (!href) return 'https://www.globalsources.com'
            if (href.startsWith('http')) return href
            if (href.startsWith('//')) return `https:${href}`
            return `https://www.globalsources.com${href.startsWith('/') ? '' : '/'}${href}`
        }

        function clean(txt: string): string {
            return txt.replace(/\s+/g, ' ').trim()
        }

        // ── Strategy 1: look for a visible dropdown/panel that contains links ────
        // Collect ALL candidate containers (mega-menus, dropdowns, panels)
        const candidates: Element[] = []

        // Common patterns on B2B/trade sites
        const containerSelectors = [
            '[class*="mega-menu"]',
            '[class*="megamenu"]',
            '[class*="dropdown"]',
            '[class*="drop-down"]',
            '[class*="sub-menu"]',
            '[class*="submenu"]',
            '[class*="nav-panel"]',
            '[class*="category-panel"]',
            '[class*="panel-body"]',
            '[class*="hover"]',
            '.open > ul',
            '.active > ul',
            '[style*="display: block"] > ul',
            '[style*="display:block"] > ul',
        ]

        for (const sel of containerSelectors) {
            try {
                document.querySelectorAll(sel).forEach(el => {
                    const rect = el.getBoundingClientRect()
                    if (rect.width > 50 && rect.height > 20) {
                        candidates.push(el)
                    }
                })
            } catch (_) { /* ignore bad selectors */ }
        }

        const subItems: SubCategory[] = []
        const seen = new Set<string>()

        // Process each candidate — deduplicate by href
        for (const container of candidates) {
            const links = container.querySelectorAll('a')
            links.forEach(a => {
                const href = resolveHref(a)
                const name = clean(a.textContent || '')
                if (!name || seen.has(href)) return
                // Skip "back to parent" or near-identical links
                if (name.toLowerCase() === catName.toLowerCase()) return
                seen.add(href)
                subItems.push({ name, url: href })
            })
        }

        // ── Strategy 2: if no structured container found, grab any visible link
        //    that appeared near the cursor position ────────────────────────────
        if (subItems.length === 0) {
            const allLinks = Array.from(document.querySelectorAll('a'))
            allLinks.forEach(a => {
                const rect = a.getBoundingClientRect()
                // Link must be in the viewport and visible
                if (rect.width === 0 || rect.height === 0) return
                if (rect.top < 50) return // skip header links
                const href = resolveHref(a)
                const name = clean(a.textContent || '')
                if (!name || seen.has(href)) return
                seen.add(href)
                subItems.push({ name, url: href })
            })
        }

        return subItems
    }, navItemText)
}

// ─── MAIN SCRAPE LOGIC ───────────────────────────────────────────────────────

async function scrapeCategories(page: Page): Promise<Category[]> {
    log(`Navigating to ${GS_URL}`)
    await page.goto(GS_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT })

    await waitForNav(page)

    // Simulate a human landing on the page (ignore context errors — still loading)
    await page.evaluate(() => window.scrollBy({ top: 200, behavior: 'smooth' })).catch(() => { })
    await sleep(1_500)
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })).catch(() => { })
    await sleep(1_000)

    // ── Snapshot current DOM structure for debugging ─────────────────────────
    const title = await page.title().catch(() => '(unknown)')
    log(`Page title: "${title}"`)

    // Dump available nav selectors — retry if context destroyed mid-eval
    let navInfo: Record<string, number> = {}
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            navInfo = await page.evaluate(() => {
                const info: Record<string, number> = {}
                const candidates = [
                    'nav a', '.nav a', '#nav a', '.header a', '#header a',
                    '.top-nav a', '.main-nav a', '.site-nav a',
                    '[class*="nav"] a', '[class*="menu"] a', '[class*="category"] a',
                ]
                for (const sel of candidates) {
                    try {
                        const count = document.querySelectorAll(sel).length
                        if (count > 0) info[sel] = count
                    } catch (_) { /* skip */ }
                }
                return info
            })
            break
        } catch (err) {
            if (attempt < 2) {
                log(`navInfo eval context error — retrying (${attempt + 1}/3)`)
                await sleep(2_000)
                // Re-wait for stable context
                try { await page.waitForLoadState('networkidle', { timeout: 15_000 }) } catch (_) { }
            }
        }
    }
    log(`Nav selector counts: ${JSON.stringify(navInfo)}`)

    // ── Discover top-level nav items ─────────────────────────────────────────
    let navItems: Array<{ name: string; url: string; selector: string; index: number }> = []
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            navItems = await page.evaluate(() => {
                function resolveHref(el: Element): string {
                    const href = (el as HTMLAnchorElement).href || el.getAttribute('href') || ''
                    if (!href) return 'https://www.globalsources.com'
                    if (href.startsWith('http')) return href
                    if (href.startsWith('//')) return `https:${href}`
                    return `https://www.globalsources.com${href.startsWith('/') ? '' : '/'}${href}`
                }

                function clean(txt: string): string {
                    return (txt || '').replace(/\s+/g, ' ').trim()
                }

                // Priority order — first match with >= 3 links is used
                const containerSelectors = [
                    'nav > ul > li',
                    '#nav > ul > li',
                    '.nav > ul > li',
                    '.main-nav > ul > li',
                    '.top-nav > ul > li',
                    '.site-nav > ul > li',
                    '[class*="main-nav"] > ul > li',
                    '[class*="primary-nav"] > ul > li',
                    '[class*="site-nav"] > ul > li',
                    // Flat nav links (no ul nesting)
                    'nav > ul > li > a',
                    '.nav-bar a',
                    '[class*="nav-bar"] a',
                    '[id*="nav-bar"] a',
                    '[class*="category-bar"] a',
                    '[class*="categories"] > li > a',
                ]

                for (const sel of containerSelectors) {
                    const els = Array.from(document.querySelectorAll<Element>(sel))
                    if (els.length < 2) continue

                    const results: Array<{ name: string; url: string; selector: string; index: number }> = []
                    els.forEach((el, index) => {
                        // If `el` is a <li>, grab the first direct <a>
                        const anchor = el.tagName === 'A' ? el : el.querySelector(':scope > a') ?? el.querySelector('a')
                        if (!anchor) return
                        const name = clean(anchor.textContent || '')
                        const url = resolveHref(anchor)
                        if (name && url) results.push({ name, url, selector: sel, index })
                    })

                    if (results.length >= 2) return results
                }

                return []
            })
            break
        } catch (navErr) {
            if (attempt < 2) {
                log(`navItems eval context error — retrying (${attempt + 1}/3)`)
                await sleep(2_000)
                try { await page.waitForLoadState('networkidle', { timeout: 15_000 }) } catch (_) { }
            }
        }
    }

    log(`Found ${navItems.length} top-level nav items`)
    if (navItems.length === 0) {
        log('WARN: No nav items found — dumping body snippet for diagnosis')
        const snippet = await page.evaluate(() => document.body.innerHTML.substring(0, 3000))
        log(snippet)
        return []
    }

    // ── Hover each nav item and harvest subcategories ────────────────────────
    const categories: Category[] = []

    for (const item of navItems) {
        log(`Hovering: "${item.name}"`)

        try {
            // Re-query the element on the live page using its position
            const result = await page.evaluate(
                ({ selector, idx }: { selector: string; idx: number }) => {
                    const els = document.querySelectorAll(selector)
                    const el = els[idx]
                    if (!el) return null
                    const anchor = el.tagName === 'A' ? el : el.querySelector('a')
                    if (!anchor) return null
                    const rect = anchor.getBoundingClientRect()
                    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
                },
                { selector: item.selector, idx: item.index },
            )

            if (!result) {
                log(`  SKIP — element gone from DOM`)
                continue
            }

            await page.mouse.move(result.x, result.y)
            await sleep(800)

            const subcategories = await extractOpenDropdown(page, item.name)
            log(`  → ${subcategories.length} subcategories`)

            categories.push({
                name: item.name,
                url: item.url,
                subcategories,
            })
        } catch (err) {
            log(`  ERROR: ${(err as Error).message}`)
            categories.push({ name: item.name, url: item.url, subcategories: [] })
        }

        // Move mouse away so the dropdown closes before the next hover
        await page.mouse.move(0, 0)
        await sleep(400)
    }

    return categories
}

// ─── ALTERNATIVE: FULL PAGE LINK HARVEST ─────────────────────────────────────

/**
 * Fallback approach when the nav-hover approach yields thin results.
 * Navigates to the globalsources categories sitemap/all-categories page
 * and extracts every product category link.
 */
async function scrapeFromCategoryPage(page: Page): Promise<Category[]> {
    const CATEGORY_URLS = [
        'https://www.globalsources.com/all-categories',
        'https://www.globalsources.com/sitemap.htm',
        'https://www.globalsources.com/catalog',
    ]

    for (const url of CATEGORY_URLS) {
        log(`Trying fallback URL: ${url}`)
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT })
            await sleep(3_000)

            const count = await page.evaluate(() => document.querySelectorAll('a').length)
            log(`Found ${count} links on ${url}`)
            if (count < 5) continue

            const categories = await page.evaluate((baseUrl: string) => {
                function resolveHref(href: string): string {
                    if (!href) return baseUrl
                    if (href.startsWith('http')) return href
                    if (href.startsWith('//')) return `https:${href}`
                    return `${baseUrl}${href.startsWith('/') ? '' : '/'}${href}`
                }

                function clean(txt: string): string {
                    return (txt || '').replace(/\s+/g, ' ').trim()
                }

                // Group links by their parent container
                const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a'))
                    .filter(a => {
                        const href = a.href || a.getAttribute('href') || ''
                        return href.includes('globalsources.com') || href.startsWith('/')
                    })
                    .map(a => ({ name: clean(a.textContent || ''), url: resolveHref(a.getAttribute('href') || '') }))
                    .filter(l => l.name.length > 1 && l.name.length < 60)

                // Deduplicate
                const seen = new Set<string>()
                return links.filter(l => !seen.has(l.url) && seen.add(l.url))
            }, 'https://www.globalsources.com')

            if (categories.length > 5) {
                log(`Fallback extracted ${categories.length} category links`)
                return [{ name: 'All Categories', url: url, subcategories: categories }]
            }
        } catch (err) {
            log(`Fallback failed for ${url}: ${(err as Error).message}`)
        }
    }

    return []
}

// ─── DEEP HOVER — hover & capture each nav item's full mega-menu ─────────────

/**
 * Advanced extraction: captures the complete visible HTML of every dropdown
 * panel that opens on hover, then parses the entire link tree from it.
 */
async function deepHoverExtract(page: Page): Promise<Category[]> {
    log('Starting deep hover extraction…')

    // Get all first-level nav links
    const navLinks = await page.evaluate(() => {
        const all: Array<{ text: string; href: string; x: number; y: number }> = []
        const seen = new Set<string>()

        // Broad selector — grabs all visible links in header/nav area
        const links = Array.from(document.querySelectorAll<HTMLAnchorElement>(
            'header a, nav a, [class*="header"] a, [id*="header"] a, [class*="nav"] a, [id*="nav"] a'
        ))

        for (const a of links) {
            const rect = a.getBoundingClientRect()
            if (rect.width === 0 || rect.height === 0) continue
            if (rect.top > 200) continue // only consider links in the top portion

            const href = a.href || a.getAttribute('href') || ''
            const text = (a.textContent || '').replace(/\s+/g, ' ').trim()
            if (!text || text.length > 50 || seen.has(text + href)) continue
            seen.add(text + href)
            all.push({ text, href, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
        }
        return all
    })

    log(`Deep hover: ${navLinks.length} candidate nav links found`)

    const categories: Category[] = []
    const seen = new Set<string>()

    for (const link of navLinks) {
        const key = link.text + link.href
        if (seen.has(key)) continue
        seen.add(key)

        try {
            log(`  Hovering "${link.text}" at (${Math.round(link.x)}, ${Math.round(link.y)})`)
            await page.mouse.move(link.x, link.y)
            await sleep(700)

            // Capture ALL newly visible links (that weren't visible before hover)
            const revealed = await page.evaluate((hoverText: string) => {
                function resolveHref(href: string): string {
                    if (!href) return 'https://www.globalsources.com'
                    if (href.startsWith('http')) return href
                    if (href.startsWith('//')) return `https:${href}`
                    return `https://www.globalsources.com${href.startsWith('/') ? '' : '/'}${href}`
                }

                const result: Array<{ name: string; url: string }> = []
                const seenHrefs = new Set<string>()

                // Focus on containers that are currently open/visible
                const openContainers = Array.from(document.querySelectorAll<Element>(
                    [
                        '[class*="dropdown"]:not([style*="display: none"]):not([style*="display:none"])',
                        '[class*="submenu"]:not([style*="display: none"]):not([style*="display:none"])',
                        '[class*="mega-menu"]:not([style*="display: none"]):not([style*="display:none"])',
                        '[class*="megamenu"]:not([style*="display: none"]):not([style*="display:none"])',
                        '[class*="panel"]:not([style*="display: none"]):not([style*="display:none"])',
                        '.open ul',
                        '.active ul',
                        '[aria-expanded="true"] ul',
                        '[aria-expanded="true"] + *',
                    ].join(',')
                )).filter(el => {
                    const rect = el.getBoundingClientRect()
                    return rect.width > 80 && rect.height > 30
                })

                for (const container of openContainers) {
                    container.querySelectorAll<HTMLAnchorElement>('a').forEach(a => {
                        const href = resolveHref(a.getAttribute('href') || a.href || '')
                        const name = (a.textContent || '').replace(/\s+/g, ' ').trim()
                        if (!name || seenHrefs.has(href)) return
                        if (name.toLowerCase() === hoverText.toLowerCase()) return
                        seenHrefs.add(href)
                        result.push({ name, url: href })
                    })
                }
                return result
            }, link.text)

            categories.push({
                name: link.text,
                url: link.href.startsWith('http') ? link.href : `https://www.globalsources.com${link.href}`,
                subcategories: revealed,
            })

            log(`    → ${revealed.length} subcategories revealed`)
        } catch (err) {
            log(`  ERROR for "${link.text}": ${(err as Error).message}`)
        }

        await page.mouse.move(960, 500) // move to center to close dropdown
        await sleep(300)
    }

    // Merge: deduplicate top-level entries by name, union subcategories
    const merged = new Map<string, Category>()
    for (const cat of categories) {
        if (merged.has(cat.name)) {
            const existing = merged.get(cat.name)!
            const existingUrls = new Set(existing.subcategories.map(s => s.url))
            for (const sub of cat.subcategories) {
                if (!existingUrls.has(sub.url)) existing.subcategories.push(sub)
            }
        } else {
            merged.set(cat.name, cat)
        }
    }

    return Array.from(merged.values()).filter(c => c.subcategories.length > 0 || true)
}

// ─── PRECISION EXTRACTOR — BrowseProductCategories ──────────────────────────

/**
 * Parses the definitive category tree from:
 *   https://www.globalsources.com/links/BrowseProductCategories
 *
 * DOM structure (reverse-engineered):
 *   <dl>
 *     <dt><a href="/consumer-electronics/">Consumer Electronics</a></dt>
 *     <dd class="item">
 *       <a href="/category/audio-equipment-headphones-.../">Audio Equipment & Headphones</a>
 *       <a href="/category/amplifiers-.../">Amplifiers</a>
 *       ...
 *     </dd>
 *   </dl>
 *
 * Returns a 3-level tree:
 *   TopLevel → SubcategoryGroup → LeafItems
 */
async function extractCategoriesFromDl(page: Page): Promise<Category[]> {
    const GS = 'https://www.globalsources.com'
    return page.evaluate((baseUrl: string) => {
        function clean(el: Element | null): string {
            return (el?.textContent || '').replace(/\s+/g, ' ').trim()
        }
        function href(el: Element | null): string {
            const raw = (el as HTMLAnchorElement | null)?.getAttribute('href') || ''
            if (!raw) return baseUrl
            if (raw.startsWith('http')) return raw
            if (raw.startsWith('//')) return `https:${raw}`
            return `${baseUrl}${raw.startsWith('/') ? '' : '/'}${raw}`
        }

        type Leaf = { name: string; url: string }
        type Sub = { name: string; url: string; children: Leaf[] }
        type Cat = { name: string; url: string; subcategories: Sub[] }

        const categories: Cat[] = []

        document.querySelectorAll('dl').forEach(dl => {
            const dtA = dl.querySelector<HTMLAnchorElement>('dt a')
            if (!dtA) return
            const catName = clean(dtA)
            const catUrl = href(dtA)
            if (!catName) return

            const subcategories: Sub[] = []

            dl.querySelectorAll<HTMLElement>('dd.item').forEach(dd => {
                const links = Array.from(dd.querySelectorAll<HTMLAnchorElement>('a'))
                if (links.length === 0) return
                const subName = clean(links[0])
                const subUrl = href(links[0])
                if (!subName) return
                const children: Leaf[] = links.slice(1)
                    .map(a => ({ name: clean(a), url: href(a) }))
                    .filter(c => c.name.length > 0)
                subcategories.push({ name: subName, url: subUrl, children })
            })

            categories.push({ name: catName, url: catUrl, subcategories })
        })

        return categories
    }, GS)
}

// ─── ENTRY POINT ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    // Ensure output directory exists
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })

    let browser: Browser | null = null

    try {
        browser = await launchBrowser()
        log(`Browser launched (headless: ${!HEADFUL})`)

        const page = await createStealthPage(browser)
        const CAT_URL = 'https://www.globalsources.com/links/BrowseProductCategories'

        log(`Navigating to ${CAT_URL}`)
        await page.goto(CAT_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT })

        // Wait past any Incapsula interstitial
        try { await page.waitForLoadState('domcontentloaded', { timeout: 20_000 }) } catch (_) { }
        await sleep(4_000)
        try { await page.waitForLoadState('networkidle', { timeout: 30_000 }) } catch (_) { }
        await sleep(2_000)

        const title = await page.title().catch(() => '(unknown)')
        log(`Page: "${title}"`)

        const dlCount = await page.evaluate(() => document.querySelectorAll('dl').length).catch(() => 0)
        log(`Found ${dlCount} <dl> category blocks`)

        if (dlCount < 3) {
            log('ERROR: page did not load correctly — too few <dl> elements.')
            const links = await page.evaluate(() =>
                Array.from(document.querySelectorAll('a')).slice(0, 20).map(a => a.getAttribute('href') || '')
            ).catch(() => [] as string[])
            links.forEach((l: string) => log('  ' + l))
            process.exit(1)
        }

        log('Extracting category tree…')
        const categories = await extractCategoriesFromDl(page)
        log(`Extracted ${categories.length} top-level categories`)

        // ── Stats ────────────────────────────────────────────────────────────
        const totalSubcategories = categories.reduce((n, c) => n + c.subcategories.length, 0)
        const totalLeafNodes = categories.reduce(
            (n, c) => n + c.subcategories.reduce((m, s) => m + (s.children ?? []).length, 0), 0,
        )

        const result = {
            scrapedAt: new Date().toISOString(),
            source: CAT_URL,
            totalTopLevel: categories.length,
            totalSubcategories,
            totalLeafNodes,
            categories,
        }

        // ── Write JSON ────────────────────────────────────────────────────────
        fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2), 'utf-8')

        // ── Write CSV (4 columns) ─────────────────────────────────────────────
        const csvPath = OUT_PATH.replace(/\.json$/, '.csv')
        const csvRows = ['category,subcategory,sub_subcategory,url']
        for (const cat of categories) {
            for (const sub of cat.subcategories) {
                if ((sub.children ?? []).length === 0) {
                    csvRows.push(`"${q(cat.name)}","${q(sub.name)}","","${sub.url}"`)
                } else {
                    for (const leaf of (sub.children ?? [])) {
                        csvRows.push(`"${q(cat.name)}","${q(sub.name)}","${q(leaf.name)}","${leaf.url}"`)
                    }
                }
            }
            if (cat.subcategories.length === 0) {
                csvRows.push(`"${q(cat.name)}","","","${cat.url}"`)
            }
        }
        fs.writeFileSync(csvPath, csvRows.join('\n'), 'utf-8')

        // ── Summary ───────────────────────────────────────────────────────────
        const line = '─'.repeat(80)
        log('\n' + line)
        log(`Done.`)
        log(`  Top-level categories : ${categories.length}`)
        log(`  Subcategory groups   : ${totalSubcategories}`)
        log(`  Leaf-level items     : ${totalLeafNodes}`)
        log(`  JSON output          : ${OUT_PATH}`)
        log(`  CSV output           : ${csvPath}`)
        log(line)

        console.log('\n┌' + '─'.repeat(78) + '┐')
        for (const cat of categories) {
            const total = cat.subcategories.reduce((n, s) => n + 1 + (s.children ?? []).length, 0)
            console.log(`│  ${cat.name.padEnd(42)} ${String(cat.subcategories.length).padStart(3)} groups  ${String(total).padStart(4)} items`)
        }
        console.log('├' + '─'.repeat(78) + '┤')
        console.log(`│  TOTAL  ${''.padEnd(43)} ${String(totalSubcategories).padStart(3)} groups  ${String(totalLeafNodes).padStart(4)} items`)
        console.log('└' + '─'.repeat(78) + '┘')

    } finally {
        await browser?.close()
    }
}

function q(str: string): string { return str.replace(/"/g, '""') }

main().catch(err => {
    console.error('[gs-scraper] FATAL:', err)
    process.exit(1)
})
