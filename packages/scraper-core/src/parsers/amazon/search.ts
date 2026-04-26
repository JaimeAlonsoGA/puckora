/**
 * Amazon Best Sellers & keyword search results HTML parser.
 *
 * Pure string-based — no DOM / browser dependencies.
 * Compatible with Playwright (page.content()), fetch responses,
 * and any other HTML source.
 *
 * Best Sellers pages:  rank badge (#N) present → rank field is populated.
 * Keyword search pages: no rank badges → rank is null for all products.
 */

import { decodeHtmlEntities } from '../_utils'

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
    /** "+1K+ bought in past month" → 1000. Null when the badge is absent. */
    bought_past_month: number | null
}

// ─── RANK BADGE COUNT ─────────────────────────────────────────────────────────

/** Count real ranked items on the page by counting #N rank badges. */
export function countBadges(html: string): number {
    return (html.match(/class="zg-bdg-text[^"]*"[^>]*>#\d+</g) ?? []).length
}

// ─── PRODUCT PARSER ──────────────────────────────────────────────────────────

/**
 * Parse all products from an Amazon Best Sellers or keyword search-results HTML page.
 *
 * Best Sellers pages:  rank is extracted from the #N badge.
 * Keyword search pages: no badges present — rank is null for every product.
 *
 * The badge guard (`if (!badgeMatch && html.includes('zg-bdg-text')) continue`)
 * skips sponsored/carousel slots on Best Sellers pages while correctly passing
 * through all products on keyword pages (where the zg-bdg-text class never appears).
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

        // Amazon list-view injects the same ASIN twice per card:
        //   1st occurrence  → outer wrapper <div data-asin="…"> (left column: image + BPM badge)
        //   2nd occurrence  → inner product card (right column: title, price, rating)
        //
        // Keyword search pages also inject ASINs into sponsored carousels that precede
        // the organic grid by tens or hundreds of KB.  We must try ALL occurrences
        // (no cutoff) to find the one where parseName succeeds, then anchor the
        // card-local window to that position.
        const allPos: number[] = []
        let s = 0
        while (true) {
            const p = html.indexOf(`data-asin="${asin}"`, s)
            if (p === -1) break
            allPos.push(p)
            s = p + 1
        }

        // Step 1 — find namePos: iterate every occurrence until parseName works.
        // No distance cutoff here because the organic occurrence can be 60 KB+
        // after a sponsored occurrence.
        let name = ''
        let namePos = allPos[0]
        for (const pos of allPos) {
            const candidate = html.substring(pos, pos + 12_000)
            const n = parseName(candidate, asin)
            if (n) { name = n; namePos = pos; break }
        }
        if (!name) continue

        // Step 2 — card-local occurrences: keep only those within ±60 KB of namePos.
        // For list-view cards this captures both the left-column wrapper (BPM badge)
        // and the right-column inner card (title).  Occurrences further away are
        // sponsored repeats or related-section carousels — exclude them.
        const cardPos = allPos.filter((p) => Math.abs(p - namePos) < 60_000)
        const firstPos = cardPos[0]
        const lastPos = cardPos[cardPos.length - 1]

        // cardSpan covers the entire product card from the earliest local occurrence
        // to well past the latest.
        //
        // Why always lastPos + 28 KB (not a smaller "dual-occurrence" buffer):
        //
        //   Keyword search pages inject the same ASIN into a sponsored carousel that
        //   appears BEFORE the organic grid section — often 30–60 KB earlier. Both
        //   occurrences fall within the ±60 KB window, so cardPos always has 2 entries.
        //   parseName succeeds on the SPONSORED block first (Amazon renders real title
        //   spans there), so namePos = sponsoredPos and lastPos = organicPos.  The BPM
        //   badge lives 18–25 KB INTO the organic card (past lastPos).  A small
        //   "dual-occurrence" buffer of 12 KB would end at lastPos + 12 KB, cutting off
        //   the badge.  Using a fixed 28 KB past lastPos guarantees full coverage for
        //   every grid-view layout:
        //
        //   • sponsored-before-organic (dual):   window = [sponsoredPos .. organicPos+28K]
        //   • sponsored-after-organic (dual):    window = [organicPos .. sponsoredPos+28K]
        //   • single organic occurrence:         window = [organicPos .. organicPos+28K]
        //   • list-view left+right columns:      BPM sits before lastPos → always captured
        const cardSpan = html.substring(firstPos, lastPos + 28_000)

        // BSR badge: look in window starting 4 KB before firstPos (badge may sit in
        // an outer wrapper div that precedes the product card on Best Sellers pages).
        const badgeWindow = html.substring(Math.max(0, firstPos - 4_000), lastPos + 28_000)
        const badgeMatch = badgeWindow.match(/class="zg-bdg-text[^"]*"[^>]*>#(\d+)</)

        // On Best Sellers pages skip non-ranked slots (sponsored carousels, etc).
        // On keyword search pages there are no rank badges — all products pass.
        const rank = badgeMatch ? parseInt(badgeMatch[1]) : null
        if (!badgeMatch && html.includes('class="zg-bdg-text')) continue

        // Price / rating / review count come from the name-bearing inner block.
        const nameBlock = html.substring(namePos, namePos + 12_000)

        // BPM is parsed from the full card span so it's always in window regardless
        // of whether the card is single- or dual-occurrence.
        const bought_past_month = parseBoughtPastMonth(cardSpan)

        products.push({
            asin,
            rank,
            name,
            price: parsePrice(nameBlock),
            rating: parseRating(nameBlock),
            review_count: parseReviewCount(nameBlock),
            product_url: `https://www.amazon.com/dp/${asin}`,
            bought_past_month,
        })
    }

    return products
}

// ─── FIELD PARSERS ────────────────────────────────────────────────────────────

function parseName(block: string, asin?: string): string {
    // ── Direct text patterns (fast path — no nested tags inside the target element) ──
    const direct: RegExp[] = [
        // ── Best Sellers patterns ──────────────────────────────────────────────────
        /class="p13n-sc-truncated[^"]*"[^>]*>([^<]{5,300})</,
        /class="a-size-small[^"]*"[^>]*title="([^"]{5,300})"/,
        /class="[^"]*p13n-sc-css-line-clamp[^"]*"[^>]*>([^<]{5,300})</,
        /<img[^>]+class="[^"]*p13n[^"]*"[^>]+alt="([^"]{5,300})"/,
        /<img[^>]+alt="([^"]{5,300})"[^>]+class="[^"]*p13n[^"]*"/,
        /href="\/dp\/[^"]*"[^>]*aria-label="([^"]{5,300})"/,
        /aria-label="([^"]{5,300})"[^>]*href="\/dp\/[^"]*"/,
        /href="\/dp\/[A-Z0-9]{10}[^"]*"[^>]*title="([^"]{5,300})"/,
        /title="([^"]{5,300})"[^>]*href="\/dp\/[A-Z0-9]{10}/,
        // ── Keyword search result patterns ────────────────────────────────────────
        // Primary: <span class="a-size-medium [a-spacing-none ]a-color-base a-text-normal">Title
        // Covers both the version without and with the optional a-spacing-none spacing class.
        /class="a-size-medium a-color-base a-text-normal"[^>]*>([^<]{5,300})</,
        /class="a-size-medium a-spacing-none a-color-base a-text-normal"[^>]*>([^<]{5,300})</,
        /class="a-size-base-plus a-color-base a-text-normal"[^>]*>([^<]{5,300})</,
        /class="a-size-base a-color-base a-text-normal"[^>]*>([^<]{5,300})</,
        // data-cy title attribute on the h2 anchor
        /data-cy="title-recipe-title"[^>]*>([^<]{5,300})</,
        // s-line-clamp wrapper (title is the direct text child)
        /class="[^"]*s-line-clamp-[^"]*"[^>]*>([^<]{5,300})</,
    ]

    for (const p of direct) {
        const mm = block.match(p)
        if (mm) return decodeHtmlEntities(mm[1].trim())
    }

    // ── Nested-HTML patterns: element contains child tags — strip them ──
    const nested: RegExp[] = [
        /class="[^"]*p13n-sc-css-line-clamp[^"]*"[^>]*>([\s\S]{5,600}?)<\/div>/,
        /class="p13n-sc-truncated[^"]*"[^>]*>([\s\S]{5,400}?)<\/span>/,
        // Keyword search: <h2 class="a-size-medium [a-spacing-none] a-color-base a-text-normal">
        //   wraps an <a> which wraps a <span>Title</span>. Capture h2 content and strip tags.
        //   The {5,800} limit handles deeply-indented HTML (80-space indent × multiple levels).
        /class="a-size-medium[^"]*a-text-normal"[^>]*>([\s\S]{5,800}?)<\/h2>/,
        // s-line-clamp anchor may contain an h2>span structure — use 800-char limit for
        // the same reason (real-world Amazon search HTML is heavily indented).
        /class="[^"]*s-line-clamp-[^"]*"[^>]*>([\s\S]{5,800}?)<\/a>/,
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

    // Best Sellers
    const p13n = block.match(/class="p13n-sc-price"[^>]*>\s*\$([\d,]+(?:\.\d{2})?)\s*</)
    if (p13n) return toFloat(p13n[1])

    // Keyword search: a-offscreen contains the full "$X.XX" string
    const offscreen = block.match(/class="a-offscreen"[^>]*>\s*\$([\d,]+(?:\.\d{2})?)\s*</)
    if (offscreen) return toFloat(offscreen[1])

    // Keyword search: a-price-whole + a-price-fraction split
    const whole = block.match(/class="a-price-whole"[^>]*>([\d,]+)(?:\.|<)/)
    const fraction = block.match(/class="a-price-fraction"[^>]*>(\d{2})</)
    if (whole) {
        const combined = fraction ? `${whole[1]}.${fraction[1]}` : whole[1]
        const v = toFloat(combined)
        if (v) return v
    }

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

/**
 * Parse the "+X bought in past month" demand-signal badge.
 *
 * Amazon renders this as e.g. "1K+ bought in past month", "500+ bought in past month",
 * "+1K bought in past month". Converts "K" suffix to thousands.
 * Returns an integer (floor of the stated amount) or null when absent.
 */
export function parseBoughtPastMonth(block: string): number | null {
    const m = block.match(/\+?([\d,.]+)\s*[Kk]\+?\s+bought\s+in\s+(?:the\s+)?past\s+month/i)
        ?? block.match(/\+?([\d,]+)\+?\s+bought\s+in\s+(?:the\s+)?past\s+month/i)
    if (!m) return null
    const raw = m[1].replace(/,/g, '')
    // Check for K suffix from first branch (already checked in pattern)
    const isK = /[Kk]/.test(m[0].slice(0, m[0].indexOf('bought')))
    const n = parseFloat(raw)
    if (!isFinite(n) || n <= 0) return null
    return isK ? Math.round(n * 1_000) : Math.round(n)
}
