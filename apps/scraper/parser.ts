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

export function parseProducts(html: string): ScrapedProduct[] {
  const products: ScrapedProduct[] = []
  const seen = new Set<string>()
  const re = /data-asin="([A-Z0-9]{10})"/g
  let m: RegExpExecArray | null
  let rank = 0

  while ((m = re.exec(html)) !== null) {
    const asin = m[1]
    if (seen.has(asin)) continue
    seen.add(asin)
    rank++

    const start = html.indexOf(`data-asin="${asin}"`)
    if (start === -1) continue
    const block = html.substring(start, start + 8_000)

    const name = parseName(block)
    if (!name) continue

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

function parseName(block: string): string {
  const patterns = [
    /class="p13n-sc-truncated[^"]*"[^>]*>([^<]{5,300})</,
    /class="a-size-small[^"]*"[^>]*title="([^"]{5,300})"/,
    /_cDEzb_p13n-sc-css-line-clamp[^>]*>([^<]{5,300})</,
  ]
  for (const p of patterns) {
    const mm = block.match(p)
    if (mm) return decodeHtmlEntities(mm[1].trim())
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
