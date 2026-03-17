/**
 * GS Page Structure Audit
 *
 * Captures DOM structure needed to design the improved scraper:
 *   1. Category listing page — People Also Search, Trending, Top Categories
 *   2. Supplier listing page — supplier card structure
 *   3. Product detail page  — export market, key specs, payment, people-also-search
 *
 * Usage: npx tsx tools/gs/page-audit.ts
 * Output: data/gs-page-audit.json
 */
import fs from 'fs'
import path from 'path'
import { chromium } from 'playwright'
import { newGsContext, gsNavigate } from '../../../scrapers/globalsources/browser'

const URLS = {
    listing: 'https://www.globalsources.com/category/power-supplies-chargers-for-sale-price_12190/',
    suppliers: 'https://www.globalsources.com/category/power-supplies-chargers-manufacturer-supplier_12190/',
    product: 'https://www.globalsources.com/LED-candle/led-candle-electronic-candle-1212687211p.htm',
}
const OUT = path.resolve('data/gs-page-audit.json')

async function auditPage(
    browser: Parameters<typeof newGsContext>[0],
    label: string,
    url: string,
    extractFn: (page: import('playwright').Page) => Promise<Record<string, unknown>>,
) {
    console.log(`\n[${label}] navigating → ${url}`)
    const { page, ctx } = await newGsContext(browser)
    try {
        const ok = await gsNavigate(page, url)
        if (!ok) { console.log(`  ⚠ blocked`); return { blocked: true } }
        console.log(`  ✓ page loaded`)
        const data = await extractFn(page)
        return data
    } catch (e) {
        console.error(`  ✗ error:`, (e as Error).message)
        return { error: (e as Error).message }
    } finally {
        await page.close().catch(() => { })
        await ctx.close().catch(() => { })
    }
}

async function main() {
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
    })

    const result: Record<string, unknown> = {}

    // ──────────────────────────────────────────────────────
    // 1. LISTING PAGE
    // ──────────────────────────────────────────────────────
    result.listing = await auditPage(browser, 'listing', URLS.listing, async (page) => {
        await page.waitForSelector('.product-list .item', { timeout: 20_000 }).catch(() => { })
        await page.waitForTimeout(2000)

        return page.evaluate(() => {
            function t(el: Element | null) { return el?.textContent?.trim().replace(/\s+/g, ' ') ?? '' }
            function classOf(el: Element) { return el?.className ?? '' }

            // Dump all top-level section class names to discover widget containers
            const topSections = Array.from(document.querySelectorAll('body > * > section, body > * > div, .layout-main > *, main > *'))
                .slice(0, 30)
                .map(el => ({ tag: el.tagName, cls: classOf(el), text: t(el).slice(0, 60) }))

            // Look for "People Also Search" — try many candidate selectors
            const pasSelectors = [
                '[class*="also-search"]', '[class*="also_search"]', '[class*="people-also"]',
                '[class*="related-search"]', '[class*="relatedSearch"]',
                '[class*="hot-search"]', '[class*="hot_search"]',
                '[class*="search-tag"]', '[class*="tag-group"]',
                '[class*="keyword"]',
            ]
            const pasWidgets = pasSelectors.flatMap(sel => {
                const els = Array.from(document.querySelectorAll(sel)).slice(0, 3)
                return els.map(el => ({ sel, cls: classOf(el), text: t(el).slice(0, 200) }))
            })

            // Scan headings for "People Also Search", "Trending", "Top Categories"
            const headings = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,span,p'))
                .filter(el => {
                    const txt = t(el).toLowerCase()
                    return txt.includes('people also') || txt.includes('trending') || txt.includes('top categor')
                })
                .map(el => ({
                    tag: el.tagName, cls: classOf(el), text: t(el).slice(0, 100),
                    parentCls: classOf(el.parentElement!),
                    grandParentCls: classOf(el.parentElement?.parentElement!),
                    siblingCount: el.parentElement?.children.length ?? 0,
                    parentHTML: el.parentElement?.innerHTML.slice(0, 500) ?? '',
                }))

            // Scan all elements for links that look like related-search tags
            const searchTagEls = Array.from(document.querySelectorAll('a'))
                .filter(a => {
                    const href = (a as HTMLAnchorElement).href
                    return href?.includes('/searchList') || href?.includes('?kw_query') || href?.includes('keyWord')
                })
                .slice(0, 30)
                .map(a => ({
                    cls: classOf(a),
                    parentCls: classOf(a.parentElement!),
                    href: (a as HTMLAnchorElement).href,
                    text: t(a),
                }))

            // Look for Trending section
            const trendSelectors = [
                '[class*="trend"]', '[class*="hot-product"]', '[class*="hotProduct"]',
                '[class*="popular"]', '[class*="best-sell"]', '[class*="new-arrive"]',
            ]
            const trendWidgets = trendSelectors.flatMap(sel => {
                const els = Array.from(document.querySelectorAll(sel)).slice(0, 2)
                return els.map(el => ({ sel, cls: classOf(el), text: t(el).slice(0, 200) }))
            })

            // Top Categories
            const catSelectors = [
                '[class*="top-cat"]', '[class*="topCat"]', '[class*="sub-cat"]',
                '[class*="catNav"]', '[class*="cat-nav"]', '[class*="side-cat"]',
                '[class*="category-nav"]', '[class*="filter-cat"]',
                '[class*="category-list"]',
            ]
            const catWidgets = catSelectors.flatMap(sel => {
                const els = Array.from(document.querySelectorAll(sel)).slice(0, 2)
                return els.map(el => ({ sel, cls: classOf(el), text: t(el).slice(0, 300) }))
            })

            // Raw page title + meta description
            const title = document.title
            const metaDesc = (document.querySelector('meta[name="description"]') as HTMLMetaElement)?.content ?? ''

            // Dump first product card HTML for sanity
            const firstCard = document.querySelector('.product-list .item')?.innerHTML.slice(0, 600) ?? ''

            // Dump all unique class names in the page that might be interesting
            const allClasses = new Set<string>()
            document.querySelectorAll('*').forEach(el => {
                (el.className?.toString() ?? '').split(' ').forEach(c => {
                    if (c && (
                        c.includes('search') || c.includes('trend') || c.includes('popular') ||
                        c.includes('hot') || c.includes('related') || c.includes('keyword') ||
                        c.includes('also') || c.includes('cat') || c.includes('tag') ||
                        c.includes('sidebar') || c.includes('widget') || c.includes('panel')
                    )) allClasses.add(c)
                })
            })

            return {
                title, metaDesc, topSections, headings, pasWidgets,
                trendWidgets, catWidgets, searchTagEls, firstCard,
                interestingClasses: [...allClasses].slice(0, 100),
            }
        })
    })

    // ──────────────────────────────────────────────────────
    // 2. SUPPLIER LISTING PAGE
    // ──────────────────────────────────────────────────────
    result.suppliers = await auditPage(browser, 'suppliers', URLS.suppliers, async (page) => {
        // GS supplier pages might use different selectors
        await Promise.race([
            page.waitForSelector('[class*="supplier"]', { timeout: 15_000 }),
            page.waitForSelector('[class*="company"]', { timeout: 15_000 }),
        ]).catch(() => { })
        await page.waitForTimeout(2000)

        return page.evaluate(() => {
            function t(el: Element | null) { return el?.textContent?.trim().replace(/\s+/g, ' ') ?? '' }
            function classOf(el: Element | null) { return el?.className ?? '' }

            // Find supplier cards
            const cardSelectors = [
                '[class*="supplier-item"]', '[class*="supplier-card"]', '[class*="supplier-list"] > *',
                '[class*="company-item"]', '[class*="company-card"]',
                '[class*="manf-item"]', '[class*="mfr-item"]',
                '.item-list > .item', '[class*="result-item"]',
            ]
            let cards: Element[] = []
            for (const sel of cardSelectors) {
                const found = Array.from(document.querySelectorAll(sel))
                if (found.length > 0) { cards = found.slice(0, 3); break }
            }

            // If not found via class, find repeated blocks that look like supplier cards
            if (cards.length === 0) {
                // Look for elements containing both a company name link and a country text
                const allDivs = Array.from(document.querySelectorAll('div, li, article'))
                cards = allDivs.filter(el => {
                    const txt = t(el)
                    return el.querySelectorAll('a').length >= 2 &&
                        txt.length > 50 && txt.length < 1000 &&
                        (txt.includes('Verified') || txt.includes('Business Type') || txt.includes('Export') || txt.includes('Employees'))
                }).slice(0, 3)
            }

            // Capture full HTML + text of first 3 cards
            const cardData = cards.map(card => ({
                cls: classOf(card),
                html: card.innerHTML.slice(0, 1500),
                text: t(card).slice(0, 600),
            }))

            // Scan for field labels we expect
            const fieldLabels = ['Business Type', 'Main Products', 'No. of Employees', 'Export Market',
                'Verified', 'Response', 'Years', 'Country', 'Certification']
            const labelEls = fieldLabels.flatMap(label => {
                return Array.from(document.querySelectorAll('*'))
                    .filter(el => el.children.length === 0 && t(el).includes(label))
                    .slice(0, 2)
                    .map(el => ({
                        label,
                        cls: classOf(el), parentCls: classOf(el.parentElement),
                        parentParentCls: classOf(el.parentElement?.parentElement ?? null),
                        siblingText: t(el.parentElement).slice(0, 200),
                    }))
            })

            // Dump all unique classes that look relevant
            const allClasses = new Set<string>()
            document.querySelectorAll('*').forEach(el => {
                (el.className?.toString() ?? '').split(' ').forEach(c => {
                    if (c && (
                        c.includes('supplier') || c.includes('company') || c.includes('manf') ||
                        c.includes('card') || c.includes('item') || c.includes('profile') ||
                        c.includes('verif') || c.includes('certif') || c.includes('product') ||
                        c.includes('employee') || c.includes('export') || c.includes('trade')
                    )) allClasses.add(c)
                })
            })

            return { cardData, labelEls, interestingClasses: [...allClasses].slice(0, 100), title: document.title }
        })
    })

    // ──────────────────────────────────────────────────────
    // 3. PRODUCT DETAIL PAGE
    // ──────────────────────────────────────────────────────
    result.product = await auditPage(browser, 'product', URLS.product, async (page) => {
        await page.waitForSelector('[class*="product-name"], h1', { timeout: 15_000 }).catch(() => { })
        await page.waitForTimeout(3000)

        return page.evaluate(() => {
            function t(el: Element | null) { return el?.textContent?.trim().replace(/\s+/g, ' ') ?? '' }
            function classOf(el: Element | null) { return el?.className ?? '' }

            // ── Export market ─────
            const exportMarketSelectors = [
                '[class*="export-market"]', '[class*="exportMarket"]', '[class*="main-market"]',
                '[class*="mainMarket"]', '[class*="target-market"]',
            ]
            const exportMarket = (() => {
                for (const sel of exportMarketSelectors) {
                    const el = document.querySelector(sel)
                    if (el) return { sel, cls: classOf(el), text: t(el).slice(0, 200) }
                }
                // Look for the label text
                const labelEl = Array.from(document.querySelectorAll('*'))
                    .find(el => el.children.length === 0 && (
                        t(el).includes('Main Export Market') || t(el).includes('Export Market') || t(el).includes('Main Markets')
                    ))
                if (labelEl) return {
                    label: t(labelEl),
                    parentCls: classOf(labelEl.parentElement),
                    parentText: t(labelEl.parentElement).slice(0, 200),
                }
                return null
            })()

            // ── Key Specifications / Special Features ─────
            const specSelectors = [
                '[class*="key-spec"]', '[class*="keySpec"]', '[class*="special-feat"]',
                '[class*="specification"]', '[class*="product-spec"]',
                '[class*="prod-spec"]', '[class*="spec-table"]', '[class*="feature"]',
                '.tab-content', '[class*="tab-panel"]', '[class*="detail-tab"]',
            ]
            const specWidgets = specSelectors.flatMap(sel => {
                const els = Array.from(document.querySelectorAll(sel)).slice(0, 2)
                return els.map(el => ({ sel, cls: classOf(el), text: t(el).slice(0, 400) }))
            })

            // Try to find DT/DD pairs (even if mostly footer nav, report what's here)
            const dtEls = Array.from(document.querySelectorAll('dt')).slice(0, 20)
                .map(dt => ({ dt: t(dt), dd: t(dt.nextElementSibling) }))

            // ── Payment details ─────
            const paymentSelectors = [
                '[class*="payment"]', '[class*="pay-term"]', '[class*="payTerm"]',
                '[class*="trade-term"]', '[class*="tradeTerm"]',
            ]
            const paymentWidgets = paymentSelectors.flatMap(sel => {
                const els = Array.from(document.querySelectorAll(sel)).slice(0, 2)
                return els.map(el => ({ sel, cls: classOf(el), text: t(el).slice(0, 300) }))
            })
            // Scan for payment label
            const paymentLabel = Array.from(document.querySelectorAll('*'))
                .filter(el => el.children.length === 0 && (
                    t(el).includes('Payment Terms') || t(el).includes('Payment Type') ||
                    t(el).includes('T/T') || t(el).includes('Letter of Credit') || t(el).includes('L/C')
                ))
                .slice(0, 3)
                .map(el => ({ text: t(el).slice(0, 100), parentCls: classOf(el.parentElement), parentText: t(el.parentElement).slice(0, 200) }))

            // ── People Also Search on product page ─────
            const pasProdSelectors = [
                '[class*="also-search"]', '[class*="also_search"]', '[class*="people-also"]',
                '[class*="related-search"]', '[class*="similar"]', '[class*="recommend"]',
                '[class*="related-product"]', '[class*="you-may"]', '[class*="also-view"]',
            ]
            const pasProdWidgets = pasProdSelectors.flatMap(sel => {
                const els = Array.from(document.querySelectorAll(sel)).slice(0, 2)
                return els.map(el => ({ sel, cls: classOf(el), text: t(el).slice(0, 300) }))
            })

            // ── Headings to discover section labels ─────
            const sectionHeadings = Array.from(document.querySelectorAll('h1,h2,h3,h4,[class*="section-title"],[class*="block-title"]'))
                .map(el => ({ tag: el.tagName, cls: classOf(el), text: t(el).slice(0, 80) }))

            // ── Scan elements for key label text ─────
            const keyLabels = [
                'Export Market', 'Key Specifications', 'Special Features',
                'Payment Terms', 'People Also', 'Product Information',
                'Port of Loading', 'Production Capacity', 'Packaging',
                'Min Order', 'Supply Ability',
            ]
            const labelFinds = keyLabels.map(label => {
                const found = Array.from(document.querySelectorAll('*'))
                    .filter(el => el.children.length < 3 && t(el).includes(label))
                    .slice(0, 2)
                    .map(el => ({
                        cls: classOf(el), tag: el.tagName,
                        parentCls: classOf(el.parentElement),
                        grandParentCls: classOf(el.parentElement?.parentElement ?? null),
                        sectionHTML: el.closest('[class*="section"],[class*="block"],[class*="panel"],[class*="tab"]')
                            ?.innerHTML.slice(0, 800) ?? el.parentElement?.parentElement?.innerHTML.slice(0, 500) ?? '',
                    }))
                return { label, found }
            })

            // ── Full page class audit ─────
            const allClasses = new Set<string>()
            document.querySelectorAll('*').forEach(el => {
                (el.className?.toString() ?? '').split(' ').forEach(c => {
                    if (c && (
                        c.includes('spec') || c.includes('export') || c.includes('market') ||
                        c.includes('payment') || c.includes('pay') || c.includes('also') ||
                        c.includes('similar') || c.includes('related') || c.includes('feature') ||
                        c.includes('detail') || c.includes('info') || c.includes('tab') ||
                        c.includes('panel') || c.includes('section')
                    )) allClasses.add(c)
                })
            })

            return {
                title: document.title,
                exportMarket, specWidgets, dtEls, paymentWidgets, paymentLabel,
                pasProdWidgets, sectionHeadings, labelFinds,
                interestingClasses: [...allClasses].slice(0, 150),
            }
        })
    })

    await browser.close()

    fs.mkdirSync(path.dirname(OUT), { recursive: true })
    fs.writeFileSync(OUT, JSON.stringify(result, null, 2))
    console.log(`\n✓ Audit written to ${OUT}`)
}

main().catch(e => { console.error(e); process.exit(1) })
