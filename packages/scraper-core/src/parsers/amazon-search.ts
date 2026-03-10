/**
 * Amazon Best Sellers & search results HTML parser.
 *
 * Pure string-based — no DOM / browser dependencies.
 * Compatible with Playwright (page.content()), fetch responses,
 * and any other HTML source.
 */

import { decodeHtmlEntities } from './_utils'

// ─── OUTPUT TYPE ──────────────────────────────────────────────────────────────

/** A single product as extracted from an Amazon listing page. */
export interface ScrapedListing {
    asin: string
    /** BSR rank badge number (e.g. 1–100 on Best Sellers, null on search pages). */
    rank: number | null
    name: string
    price: number | null
    rating: number | null
    review_count: number | null
    product_url: string
}

// ─── RANK BADGE COUNT ─────────────────────────────────────────────────────────

/** Count real ranked items on the page by counting #N rank badges. */
export function countBadges(html: string): number {
    return (html.match(/class="zg-bdg-text[^"]*"[^>]*>#\d+</g) ?? []).length
}

// ─── PRODUCT PARSER ──────────────────────────────────────────────────────────

/**
 * Parse all products from an Amazon Best Sellers or search-results HTML page.
 *
 * Rank is extracted from the #N badge when present (Best Sellers pages).
 * On plain search pages the rank field will be null.
 */
export function parseProducts(html: string): ScrapedListing[] {
    const products: ScrapedListing[] = []
    const seen = new Set<string>()
    const re = /data-asin="([A-Z0-9]{10})"/g
    let m: RegExpExecArray | null

    while ((m = re.exec(html)) !== null) {
        const asin = m[1]
        if (seen.has(asin)) continue
        seen.add(asin)

        // Amazon injects the same ASIN into sponsored carousels / hero slots that
        // appear BEFORE the ranked grid in the DOM.  Those slots use a different card
        // template where parseName always fails.  We try every occurrence of
        // data-asin="{asin}" until we find one whose block yields a parseable name.
        let name = ''
        let block = ''
        let foundPos = 0
        let searchFrom = 0

        while (true) {
            const pos = html.indexOf(`data-asin="${asin}"`, searchFrom)
            if (pos === -1) break
            const candidate = html.substring(pos, pos + 12_000)
            const candidateName = parseName(candidate, asin)
            if (candidateName) { name = candidateName; block = candidate; foundPos = pos; break }
            searchFrom = pos + 1
        }

        if (!name) continue

        // Badge: look in a window that spans 4k BEFORE the data-asin as well as
        // the block itself — on many category pages the #N badge element sits in
        // an outer wrapper div that precedes the inner product-card data-asin.
        const badgeWindow = html.substring(Math.max(0, foundPos - 4_000), foundPos + 12_000)
        const badgeMatch = badgeWindow.match(/class="zg-bdg-text[^"]*"[^>]*>#(\d+)</)

        // On Best Sellers pages, skip non-ranked items (sponsored carousels, recommendation sections).
        // On search pages there are no badges at all — all products are included.
        const rank = badgeMatch ? parseInt(badgeMatch[1]) : null
        if (!badgeMatch && html.includes('class="zg-bdg-text')) continue

        products.push({
            asin,
            rank,
            name,
            price: parsePrice(block),
            rating: parseRating(block),
            review_count: parseReviewCount(block),
            product_url: `https://www.amazon.com/dp/${asin}`,
        })
    }

    return products
}

// ─── FIELD PARSERS ────────────────────────────────────────────────────────────

function parseName(block: string, asin?: string): string {
    // ── Direct text patterns (fast path — no nested tags inside the target element) ──
    const direct: RegExp[] = [
        /class="p13n-sc-truncated[^"]*"[^>]*>([^<]{5,300})</,
        /class="a-size-small[^"]*"[^>]*title="([^"]{5,300})"/,
        /class="[^"]*p13n-sc-css-line-clamp[^"]*"[^>]*>([^<]{5,300})</,
        /<img[^>]+class="[^"]*p13n[^"]*"[^>]+alt="([^"]{5,300})"/,
        /<img[^>]+alt="([^"]{5,300})"[^>]+class="[^"]*p13n[^"]*"/,
        /href="\/dp\/[^"]*"[^>]*aria-label="([^"]{5,300})"/,
        /aria-label="([^"]{5,300})"[^>]*href="\/dp\/[^"]*"/,
        /href="\/dp\/[A-Z0-9]{10}[^"]*"[^>]*title="([^"]{5,300})"/,
        /title="([^"]{5,300})"[^>]*href="\/dp\/[A-Z0-9]{10}/,
    ]

    for (const p of direct) {
        const mm = block.match(p)
        if (mm) return decodeHtmlEntities(mm[1].trim())
    }

    // ── Nested-HTML patterns: element contains child tags — strip them ──
    const nested: RegExp[] = [
        /class="[^"]*p13n-sc-css-line-clamp[^"]*"[^>]*>([\s\S]{5,600}?)<\/div>/,
        /class="p13n-sc-truncated[^"]*"[^>]*>([\s\S]{5,400}?)<\/span>/,
    ]

    for (const p of nested) {
        const mm = block.match(p)
        if (mm) {
            const txt = mm[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
            if (txt.length >= 5) return decodeHtmlEntities(txt)
        }
    }

    // ── Ultimate fallback: iterate /dp/{asin} anchors and strip inner tags ──
    if (asin) {
        const dpRe = new RegExp(`href="/dp/${asin}[^"]*"[^>]*>([\\s\\S]{2,500}?)<\\/a>`, 'g')
        let dpMatch: RegExpExecArray | null
        while ((dpMatch = dpRe.exec(block)) !== null) {
            const txt = dpMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
            if (txt.length >= 10) return decodeHtmlEntities(txt)
        }
    }

    return ''
}

/** Parse price from a product card HTML block. Returns a float or null. */
export function parsePrice(block: string): number | null {
    const toFloat = (s: string) => {
        const v = parseFloat(s.replace(/,/g, ''))
        return isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null
    }

    const p13n = block.match(/class="p13n-sc-price"[^>]*>\s*\$([\d,]+(?:\.\d{2})?)\s*</)
    if (p13n) return toFloat(p13n[1])

    const offscreen = block.match(/class="a-offscreen"[^>]*>\s*\$([\d,]+(?:\.\d{2})?)\s*</)
    if (offscreen) return toFloat(offscreen[1])

    const range = block.match(/\$([\d,]+(?:\.\d{2})?)\s*[\u2013\u2014-]\s*\$/)
    if (range) return toFloat(range[1])

    const fallback = block.match(/\$([\d,]+(?:\.\d{2})?)/)
    if (fallback) return toFloat(fallback[1])

    return null
}

/** Parse star rating from a product card HTML block. Returns e.g. 4.5 or null. */
export function parseRating(block: string): number | null {
    const m = block.match(/(\d\.\d)\s+out of 5/)
    if (!m) return null
    const v = parseFloat(m[1])
    return isFinite(v) && v >= 1 && v <= 5 ? v : null
}

/** Parse review count. Handles full numbers ("1,234"), "1.2K", "2M". */
export function parseReviewCount(block: string): number | null {
    const full = block.match(/(\d{1,3}(?:,\d{3})*)\s+(?:ratings?|reviews?|customer reviews?)/)
    if (full) {
        const v = parseInt(full[1].replace(/,/g, ''), 10)
        return isFinite(v) ? v : null
    }

    const abbr = block.match(/([\d.]+)([KMk])\s+(?:ratings?|reviews?|customer reviews?)/)
    if (abbr) {
        const n = parseFloat(abbr[1])
        const mult = abbr[2].toUpperCase() === 'K' ? 1_000 : 1_000_000
        return isFinite(n) ? Math.round(n * mult) : null
    }

    return null
}
