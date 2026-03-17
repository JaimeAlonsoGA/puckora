/**
 * GlobalSources listing page parser.
 *
 * GS category pages are Vue SPAs (data-v-* attributes) — product cards
 * are client-side rendered. This parser operates on the serialized card
 * data extracted via page.evaluate() AFTER Vue has hydrated, not on the
 * raw initial HTML.
 *
 * Called from: apps/scraper/gs/scraper/listing.ts
 */

// ─── OUTPUT TYPE ──────────────────────────────────────────────────────────────

/**
 * A single product as extracted from a GlobalSources category listing card.
 * This is the "thin" listing-level record — detailed specs come from
 * parseGsProductDetail() after visiting the individual product page.
 */
export interface GlobalSourcesListingCard {
  /** GS product ID — numeric suffix before `p.htm` in the URL. */
  id: string
  url: string
  name: string
  /** Primary price (lowest in range), USD. */
  price_low: number | null
  /** Upper bound of price range, USD. Equals price_low when no range shown. */
  price_high: number | null
  price_unit: string | null       // "Piece" | "Unit" | "Set" | etc.
  moq_quantity: number | null
  moq_unit: string | null         // "Pieces" | "Units" | "Sets" | etc.
  image_primary: string | null
  /** Supplier badge tags from the card (Premier Supplier, Verified, etc.) */
  tags: string[]
  supplier_name: string | null
  /** Source category URL this card was found on. */
  source_category_url: string
}

// ─── PARSER ──────────────────────────────────────────────────────────────────

/** Raw card data as extracted via page.evaluate() in listing.ts */
export interface RawGlobalSourcesCard {
  productUrl: string
  productName: string
  priceText: string
  moqText: string
  unit: string
  image: string
  tags: string[]
  supplierName: string
}

/**
 * Parse raw card DOM data into a typed GlobalSourcesListingCard.
 * Returns null if the card is missing essential fields (name, URL).
 */
export function parseGlobalSourcesListingCard(raw: RawGlobalSourcesCard, sourceCategoryUrl: string): GlobalSourcesListingCard | null {
  const name = raw.productName.trim()
  const url = raw.productUrl.trim()
  if (!name || !url) return null

  // Extract GS product ID from URL: /{slug}-{id}p.htm
  const idMatch = url.match(/-(\d+)p\.htm/)
  const id = idMatch?.[1] ?? ''
  if (!id) return null

  // Parse price: "US$ 1.89 - 2.04" or "US$ 22.80"
  const priceMatch = raw.priceText.match(/\$\s*([\d.]+)\s*(?:-\s*([\d.]+))?/)
  const price_low = priceMatch ? parseFloat(priceMatch[1]) : null
  const price_high = priceMatch?.[2] ? parseFloat(priceMatch[2]) : price_low

  // Parse unit: "/ Piece" → "Piece"
  const price_unit = raw.unit.replace(/^\/\s*/, '').trim() || null

  // Parse MOQ: "10 Units (MOQ)" or "1000 Pieces (MOQ)"
  const moqMatch = raw.moqText.match(/^(\d[\d,]*)\s+([A-Za-z]+)/)
  const moq_quantity = moqMatch ? parseInt(moqMatch[1].replace(/,/g, ''), 10) : null
  const moq_unit = moqMatch?.[2] ?? null

  // Normalise image URL (strip query params that change over time)
  const image_primary = raw.image.split('?')[0] || null

  return {
    id,
    url,
    name,
    price_low,
    price_high,
    price_unit,
    moq_quantity,
    moq_unit,
    image_primary,
    tags: raw.tags.filter(Boolean),
    supplier_name: raw.supplierName.trim() || null,
    source_category_url: sourceCategoryUrl,
  }
}
