import { ScrapedProduct } from './types'

// ─── BLOCK DETECTION ─────────────────────────────────────────────────────────

export function isEmptyCategory(html: string): boolean {
  return html.includes('there are no Best Sellers available in this category')
    || html.includes('no Best Sellers available')
}

export function isBlocked(html: string): boolean {
  const HARD_SIGNALS = [
    'action="/errors/validateCaptcha"',
    'action="/ap/cvf/verify"',
    'api-services-support@amazon.com',
    'This service is currently unavailable.',
  ]
  if (HARD_SIGNALS.some(s => html.includes(s))) return true

  const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '').toLowerCase().trim()
  const BLOCKED_TITLES = ['robot check', 'amazon sign-in', 'amazon sign in', '503 - service unavailable error']
  if (BLOCKED_TITLES.includes(title)) return true

  // No product grid = blocked or empty
  return !html.includes('data-asin="')
}

// ─── PRODUCT PARSER ──────────────────────────────────────────────────────────

/** Count real ranked items on the page by counting #N rank badges. */
export function countBadges(html: string): number {
  return (html.match(/class="zg-bdg-text[^"]*"[^>]*>#\d+</g) ?? []).length
}

export function parseProducts(html: string): ScrapedProduct[] {
  const products: ScrapedProduct[] = []
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

    // Badge: look in a window that spans 4 k BEFORE the data-asin as well as the
    // block itself — on many category pages the #N badge element sits in an outer
    // wrapper div that precedes the inner product-card data-asin.
    const badgeWindow = html.substring(Math.max(0, foundPos - 4_000), foundPos + 12_000)
    const badgeMatch = badgeWindow.match(/class="zg-bdg-text[^"]*"[^>]*>#(\d+)</)
    if (!badgeMatch) continue  // skip non-ranked items (sponsored carousels, recommendation sections)
    const rank = parseInt(badgeMatch[1])

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

// ─── FIELD PARSERS ───────────────────────────────────────────────────────────

function parseName(block: string, asin?: string): string {
  // ── Direct text patterns (fast path — no nested tags inside the target element) ──
  const direct: RegExp[] = [
    // Primary: stable Amazon Best Sellers class names
    /class="p13n-sc-truncated[^"]*"[^>]*>([^<]{5,300})</,
    /class="a-size-small[^"]*"[^>]*title="([^"]{5,300})"/,
    // Hash-agnostic CSS-module line-clamp class (simple text content)
    /class="[^"]*p13n-sc-css-line-clamp[^"]*"[^>]*>([^<]{5,300})</,
    // Product image alt text (both attribute orderings)
    /<img[^>]+class="[^"]*p13n[^"]*"[^>]+alt="([^"]{5,300})"/,
    /<img[^>]+alt="([^"]{5,300})"[^>]+class="[^"]*p13n[^"]*"/,
    // Product link aria-label (both attribute orderings)
    /href="\/dp\/[^"]*"[^>]*aria-label="([^"]{5,300})"/,
    /aria-label="([^"]{5,300})"[^>]*href="\/dp\/[^"]*"/,
    // title attribute on anchor linking to /dp/ (both orderings)
    /href="\/dp\/[A-Z0-9]{10}[^"]*"[^>]*title="([^"]{5,300})"/,
    /title="([^"]{5,300})"[^>]*href="\/dp\/[A-Z0-9]{10}/,
  ]
  for (const p of direct) {
    const mm = block.match(p)
    if (mm) return decodeHtmlEntities(mm[1].trim())
  }

  // ── Nested-HTML patterns: element contains child tags — strip them ──
  // Handles newer Amazon builds where the title div wraps a <span> for line clamping.
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

  // ── Ultimate fallback: try every /dp/{asin} anchor and strip inner tags ──
  // Every Best Sellers card has (at minimum) two anchors to the product's DP page:
  //   1. The image link: <a href="/dp/B0..."><img ...></a>  → strips to empty / short
  //   2. The title link: <a href="/dp/B0...">Product Name</a> → strips to the title
  // We iterate all occurrences and return the first one with ≥10 chars of text.
  if (asin) {
    const dpRe = new RegExp(`href="/dp/${asin}[^"]*"[^>]*>([\\s\\S]{2,500}?)<\/a>`, 'g')
    let dpMatch: RegExpExecArray | null
    while ((dpMatch = dpRe.exec(block)) !== null) {
      const txt = dpMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      if (txt.length >= 10) return decodeHtmlEntities(txt)
    }
  }

  return ''
}

// Returns a parsed float or null — never a string
export function parsePrice(block: string): number | null {
  const toFloat = (s: string) => {
    const v = parseFloat(s.replace(/,/g, ''))
    return isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null
  }

  // 1. <span class="p13n-sc-price">$18.99</span>
  const p13n = block.match(/class="p13n-sc-price"[^>]*>\s*\$([\d,]+(?:\.\d{2})?)\s*</)
  if (p13n) return toFloat(p13n[1])

  // 2. <span class="a-offscreen">$18.99</span>  (screen-reader span, very reliable)
  const offscreen = block.match(/class="a-offscreen"[^>]*>\s*\$([\d,]+(?:\.\d{2})?)\s*</)
  if (offscreen) return toFloat(offscreen[1])

  // 3. Price range: $18.99 – $24.99 — take the lower bound
  const range = block.match(/\$([\d,]+(?:\.\d{2})?)\s*[\u2013\u2014-]\s*\$/)
  if (range) return toFloat(range[1])

  // 4. Fallback: any $XX.XX in block
  const fallback = block.match(/\$([\d,]+(?:\.\d{2})?)/)
  if (fallback) return toFloat(fallback[1])

  return null
}

// Returns e.g. 4.5 — never "4.5 out of 5 stars"
export function parseRating(block: string): number | null {
  const m = block.match(/(\d\.\d)\s+out of 5/)
  if (!m) return null
  const v = parseFloat(m[1])
  return isFinite(v) && v >= 1 && v <= 5 ? v : null
}

// Handles "1,234 ratings", "1.2K ratings", "2M ratings"
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

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
}
