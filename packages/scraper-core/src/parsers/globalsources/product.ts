/**
 * GlobalSources product detail page parser.
 *
 * Data sources (in order of reliability):
 *  1. JSON-LD schema.org/Product — SSR, always present, clean types
 *  2. "Shipping Information" blob — a single concatenated text string scraped
 *     from the logistics section; parsed with targeted regexes
 *  3. Supplier block — name extracted cleanly from DOM; meta fields from text
 *
 * The spec DT/DD approach is intentionally NOT used — GS renders spec rows via
 * Vue/Nuxt, and DT/DD only contains footer navigation links (useless).
 *
 * Unit conversion rules (mirrors the Amazon sp-api pattern):
 *  - Weight: Grams → kg (÷1000), Kilograms → kg (direct)
 *  - Dimensions: Centimeters → cm (direct), Inches → cm (×2.54)
 *  - Feet → null  (edge-case bad data; null > broken)
 *  - Millimeters → null  (never seen; null > broken)
 *
 * Called from: apps/scraper/gs/scraper/product.ts
 */

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface PriceTier {
  /** Minimum quantity (inclusive). */
  min_qty: number
  /** Maximum quantity (inclusive). null = "and above". */
  max_qty: number | null
  price_usd: number
}

/** Full product detail extracted from one GS product page. */
export interface GlobalSourcesProductDetail {
  // ── Identity ─────────────────────────────────────────────────────────────
  id: string                          // numeric string from URL (e.g. "1233123763")
  url: string
  name: string
  description: string | null

  // ── Pricing ───────────────────────────────────────────────────────────────
  price_low: number | null            // JSON-LD offers.lowPrice
  price_high: number | null           // JSON-LD offers.highPrice
  price_unit: string | null           // "Piece" | "Set" | "Unit" | ...
  price_tiers: PriceTier[]            // empty when flat pricing

  // ── MOQ ───────────────────────────────────────────────────────────────────
  moq_quantity: number | null
  moq_unit: string | null             // "Pieces" | "Sets" | ...

  // ── Item logistics — normalized numeric ──────────────────────────────────
  item_length_cm: number | null
  item_width_cm: number | null
  item_height_cm: number | null
  item_weight_kg: number | null

  // ── Carton logistics — normalized numeric ────────────────────────────────
  carton_length_cm: number | null
  carton_width_cm: number | null
  carton_height_cm: number | null
  carton_weight_kg: number | null
  units_per_carton: number | null

  // ── Shipping / origin ─────────────────────────────────────────────────────
  fob_port: string | null
  lead_time_days_min: number | null
  lead_time_days_max: number | null
  hts_code: string | null
  logistics_type: string | null       // "Common" | "Charged" | null

  // ── Identifiers / labels ──────────────────────────────────────────────────
  model_number: string | null
  brand_name: string | null
  certifications: string[]            // ["CE", "RoHS", ...]

  // ── Media ─────────────────────────────────────────────────────────────────
  image_primary: string | null
  images: string[]

  // ── Taxonomy ──────────────────────────────────────────────────────────────
  category_breadcrumb: string[]       // without "Home"

  // ── Supplier ──────────────────────────────────────────────────────────────
  supplier_name: string | null
  supplier_url: string | null
  supplier_country: string | null
  supplier_years_gs: number | null
  supplier_business_types: string[]
  supplier_trade_shows_count: number | null

  // ── Enriched product detail ───────────────────────────────────────────────
  /** Free-text key specifications / special features block (may be multi-line). */
  key_specifications: string | null
  /** Main export markets listed on the product page. */
  export_markets: string[]
  /** Accepted payment methods from the Payment Details table. */
  payment_methods: string[]
  /** "People Also Search" related terms shown on the product page. */
  people_also_search: string[]
  /** "Product Information" free-text paragraph. */
  product_info_text: string | null
  /** Supplier verification badges shown on the product page (e.g. "Premier Supplier"). */
  supplier_verifications: string[]
}

// ─── RAW DOM DATA (produced by page.evaluate in scraper) ─────────────────────

/**
 * Serializable snapshot of a GS product page, collected by page.evaluate().
 * Kept flat/primitive so it transfers cleanly out of browser context.
 */
export interface RawGlobalSourcesProductPage {
  url: string
  jsonLd: object[]

  /** Text from ".price-range" element (tiered pricing). Empty for flat prices. */
  priceRangeText: string
  /** Text from ".price-main" element (flat price + MOQ line). */
  priceMainText: string

  /**
   * Concatenated text of the "Shipping Information" section.
   * Format: "Shipping Information FOB Port{port}Lead Time{N}–{N} days
   *          Weight per Unit{N} {unit}Dimensions per Unit{N} x {N} x {N} {unit}
   *          HTS Code{code}Units per Export Carton{N}
   *          Export Carton Dimensions L/W/H{N} x {N} x {N} {unit}
   *          Logistics attributes{type}Export Carton Weight{N} Kilograms"
   */
  shippingText: string

  /** Supplier company name from clean DOM node (.supplier-name .name). */
  supplierName: string
  /** Supplier profile URL from the link wrapping the company name. */
  supplierUrl: string
  /** Years on GS platform from DOM (.gs-tag.years .num). -1 if not found. */
  supplierYears: number
  /** Full raw text of the supplier company-info block for meta extraction. */
  supplierBlockText: string

  /** Cert element text blobs (cert section text/HTML as text). */
  certTexts: string[]

  /** Image URLs from GS CDN (deduped, query-string stripped). */
  images: string[]

  // ── Enriched fields (new scraper phases) ─────────────────────────────────

  /** Full text of the ".specifications" section (heading included). */
  specificationsText: string
  /**
   * Raw text of the "Main Export Markets" section.
   * Extracted from the sibling content following the h2 heading.
   */
  exportMarketsText: string
  /**
   * Raw text from Payment Details (.ant-descriptions-row cells).
   * Format: "key1\tvalue1\nkey2\tvalue2\n..."
   */
  paymentText: string
  /**
   * Raw text of the "Product Information" free-text paragraph.
   */
  productInfoText: string
  /**
   * "People Also Search" items shown on the product page
   * (.seotp-category .tags-item textContent).
   */
  productPageRelated: string[]
  /**
   * Supplier verification badge alt texts from the product page
   * (e.g. "Premier Supplier", "Verified Supplier").
   */
  supplierVerifications: string[]
}

// ─── PARSER ──────────────────────────────────────────────────────────────────

export function parseGlobalSourcesProductDetail(raw: RawGlobalSourcesProductPage): GlobalSourcesProductDetail | null {
  // ── 1. JSON-LD ────────────────────────────────────────────────────────────
  const productLd = (raw.jsonLd as any[]).find(ld => ld?.['@type'] === 'Product')
  const breadcrumbLd = (raw.jsonLd as any[]).find(ld => ld?.['@type'] === 'BreadcrumbList')

  if (!productLd) return null   // not a real product page

  const name: string = decodeHtmlEntities((productLd.name ?? '').trim())
  if (!name) return null

  const url: string = productLd.offers?.URL ?? raw.url
  const idMatch = url.match(/-(\d{8,})p\.htm/)
  const id = idMatch?.[1] ?? ''
  if (!id) return null

  const description: string | null = productLd.description
    ? decodeHtmlEntities(productLd.description.trim()) || null
    : null
  const price_low: number | null = productLd.offers?.lowPrice ?? null
  const price_high: number | null = productLd.offers?.highPrice ?? null

  // ── 2. Breadcrumb ─────────────────────────────────────────────────────────
  const category_breadcrumb: string[] = []
  if (breadcrumbLd?.itemListElement) {
    for (const item of breadcrumbLd.itemListElement as any[]) {
      const n: string = item.item?.name ?? item.name ?? ''
      if (n && n !== 'Home') category_breadcrumb.push(decodeHtmlEntities(n))
    }
  }

  // ── 3. Images ─────────────────────────────────────────────────────────────
  const ldImages: string[] = Array.isArray(productLd.image)
    ? productLd.image.map((i: string) => i.split('?')[0])
    : productLd.image ? [(productLd.image as string).split('?')[0]] : []

  const domImages = raw.images.map(i => i.split('?')[0])
  const images = [...new Set([...ldImages, ...domImages])].filter(Boolean)
  const image_primary = images[0] ?? null

  // ── 4. Price tiers + MOQ ──────────────────────────────────────────────────
  const { price_tiers, price_unit: tieredUnit } = parsePriceTiers(raw.priceRangeText)
  const { moq_quantity, moq_unit, price_unit: flatUnit } = parsePriceMain(raw.priceMainText)
  const price_unit = tieredUnit ?? flatUnit

  // For tiered products, MOQ = lowest tier's min_qty.
  const effective_moq_quantity = price_tiers.length > 0
    ? (price_tiers[0].min_qty ?? moq_quantity)
    : moq_quantity
  const effective_moq_unit = price_tiers.length > 0
    ? (tieredUnit ?? moq_unit)
    : moq_unit

  // ── 5. Shipping blob ──────────────────────────────────────────────────────
  const ship = parseShippingBlob(raw.shippingText)

  // ── 6. Certifications ─────────────────────────────────────────────────────
  const certifications = extractCertifications(raw.certTexts)

  // ── 7. Brand / model ─────────────────────────────────────────────────────
  // GS JSON-LD brand.name = the seller's legal company name, NOT the product brand.
  // GS also rarely populates sku/mpn. Parse from productInfoText first;
  // fall back to JSON-LD only when the value doesn't look like a company name.
  //
  // productInfoText format (concatenated, no separators):
  //   "Model NumberMA2-#5889Brand NameHIPPOoriginChinaSmall OrdersAccepted"
  const _infoText = (raw.productInfoText ?? '').trim()

  const brandFromInfo: string | null =
    decodeHtmlEntities(_infoText.match(/Brand Name(.+?)(?=origin|Small Orders|Mini Order|$)/i)?.[1]?.trim() ?? '') || null
  const modelFromInfo: string | null =
    decodeHtmlEntities(_infoText.match(/Model Number(.+?)(?=Brand Name|origin|Small Orders|$)/i)?.[1]?.trim() ?? '') || null

  const _ldBrand: string | null = typeof productLd.brand === 'object'
    ? (productLd.brand?.name?.trim() || null)
    : (productLd.brand?.trim() || null)

  // JSON-LD brand looks like a company name when it contains legal suffixes.
  const _looksLikeCompany = (s: string | null): boolean =>
    s != null &&
    /\b(co\.|ltd\.?|inc\.?|corp\.?|company|technology|technologies|electronics|industrial|industries|trade)\b/i.test(s)

  const brand_name: string | null = brandFromInfo
    ?? (_looksLikeCompany(_ldBrand) ? null : _ldBrand)

  const model_number: string | null =
    modelFromInfo ||
    productLd.sku?.trim() ||
    productLd.mpn?.trim() ||
    null

  // ── 8. Supplier ───────────────────────────────────────────────────────────
  const supplier = parseSupplierBlock({
    supplierName: raw.supplierName,
    supplierUrl: raw.supplierUrl,
    supplierYears: raw.supplierYears,
    supplierBlockText: raw.supplierBlockText,
  })

  // ── 9. Enriched fields ────────────────────────────────────────────────────
  const key_specifications = parseKeySpecifications(raw.specificationsText ?? '')
  const export_markets = parseExportMarkets(raw.exportMarketsText ?? '')
  const payment_methods = parsePaymentMethods(raw.paymentText ?? '')
  const people_also_search = (raw.productPageRelated ?? []).map(s => s.trim()).filter(Boolean)
  const product_info_text = (raw.productInfoText ?? '').trim() || null

  return {
    id,
    url,
    name,
    description,
    price_low,
    price_high,
    price_unit,
    price_tiers,
    moq_quantity: effective_moq_quantity,
    moq_unit: effective_moq_unit,
    item_length_cm: ship.item_length_cm,
    item_width_cm: ship.item_width_cm,
    item_height_cm: ship.item_height_cm,
    item_weight_kg: ship.item_weight_kg,
    carton_length_cm: ship.carton_length_cm,
    carton_width_cm: ship.carton_width_cm,
    carton_height_cm: ship.carton_height_cm,
    carton_weight_kg: ship.carton_weight_kg,
    units_per_carton: ship.units_per_carton,
    fob_port: ship.fob_port,
    lead_time_days_min: ship.lead_time_days_min,
    lead_time_days_max: ship.lead_time_days_max,
    hts_code: ship.hts_code,
    logistics_type: ship.logistics_type,
    model_number,
    brand_name,
    certifications,
    image_primary,
    images,
    category_breadcrumb,
    ...supplier,
    key_specifications,
    export_markets,
    payment_methods,
    people_also_search,
    product_info_text,
    supplier_verifications: raw.supplierVerifications ?? [],
  }
}

// ─── PRICE HELPERS ────────────────────────────────────────────────────────────

/**
 * Parse tiered pricing from `.price-range` text.
 *
 * Inputs observed:
 *   "US$ 7.43 1000–2999 Pieces US$ 6.93 3000–5999 Pieces US$ 5.43 >=10000 Pieces"
 *   "US$ 2.04 10–998 Units US$ 1.89 ≥999 Units"
 *
 * Returns tiers sorted ascending by min_qty.
 */
function parsePriceTiers(text: string): { price_tiers: PriceTier[]; price_unit: string | null } {
  if (!text) return { price_tiers: [], price_unit: null }

  const tiers: PriceTier[] = []
  let price_unit: string | null = null

  // Range tier: "US$ 7.43 1000–2999 Pieces"
  const rangeRe = /US\$\s*([\d.]+)\s+([\d,]+)[–\-]([\d,]+)\s+([A-Za-z]+)/g
  let m: RegExpExecArray | null
  while ((m = rangeRe.exec(text))) {
    price_unit = price_unit ?? m[4]
    tiers.push({
      price_usd: parseFloat(m[1]),
      min_qty: parseIntClean(m[2]),
      max_qty: parseIntClean(m[3]),
    })
  }

  // Open-ended tier: "US$ 1.89 ≥999 Units" or "US$ 5.43 >=10000 Pieces"
  const openRe = /US\$\s*([\d.]+)\s+[≥>=]+\s*([\d,]+)\s+([A-Za-z]+)/g
  while ((m = openRe.exec(text))) {
    price_unit = price_unit ?? m[3]
    tiers.push({
      price_usd: parseFloat(m[1]),
      min_qty: parseIntClean(m[2]),
      max_qty: null,
    })
  }

  tiers.sort((a, b) => a.min_qty - b.min_qty)
  return { price_tiers: tiers, price_unit }
}

/**
 * Parse flat-price line from `.price-main` text.
 *
 * Inputs observed:
 *   "US$ 22.8 / 1 Piece Minimum order: 1000 Pieces"
 *   "US$ 8.8 / 1 Piece Minimum order: 3000 Pieces"
 */
function parsePriceMain(text: string): {
  moq_quantity: number | null
  moq_unit: string | null
  price_unit: string | null
} {
  if (!text) return { moq_quantity: null, moq_unit: null, price_unit: null }

  // "/ 1 Piece" or "/ 1 Set"
  const unitMatch = text.match(/\/\s*\d+\s+([A-Za-z]+)/)
  const price_unit = unitMatch?.[1] ?? null

  // "Minimum order: 1000 Pieces"
  const moqMatch = text.match(/[Mm]inimum\s+order\s*:\s*([\d,]+)\s+([A-Za-z]+)/)
  const moq_quantity = moqMatch ? parseIntClean(moqMatch[1]) : null
  const moq_unit = moqMatch?.[2] ?? null

  return { moq_quantity, moq_unit, price_unit }
}

// ─── SHIPPING BLOB PARSER ─────────────────────────────────────────────────────

interface ShippingFields {
  fob_port: string | null
  lead_time_days_min: number | null
  lead_time_days_max: number | null
  item_weight_kg: number | null
  item_length_cm: number | null
  item_width_cm: number | null
  item_height_cm: number | null
  hts_code: string | null
  units_per_carton: number | null
  carton_length_cm: number | null
  carton_width_cm: number | null
  carton_height_cm: number | null
  carton_weight_kg: number | null
  logistics_type: string | null
}

/**
 * Parse the "Shipping Information" concatenated text blob.
 *
 * The blob has no delimiters — each field's value ends where the next label
 * begins. We anchor on label boundaries to extract each segment.
 *
 * Edge cases handled:
 *   - Lead time "3–10 days" or "15–20 days" or single "20 days"
 *   - Weight in Grams or Kilograms
 *   - Dimensions in Centimeters or Inches (converted); Feet → null
 *   - Missing "Logistics attributes" section (optional)
 */
function parseShippingBlob(text: string): ShippingFields {
  const empty: ShippingFields = {
    fob_port: null, lead_time_days_min: null, lead_time_days_max: null,
    item_weight_kg: null, item_length_cm: null, item_width_cm: null, item_height_cm: null,
    hts_code: null, units_per_carton: null,
    carton_length_cm: null, carton_width_cm: null, carton_height_cm: null,
    carton_weight_kg: null, logistics_type: null,
  }
  if (!text || !text.includes('FOB Port')) return empty

  // FOB Port
  const fob_port = between(text, 'FOB Port', 'Lead Time')?.trim() || null

  // Lead Time: "3–10 days" | "15–20 days" | "20 days"
  const leadRaw = between(text, 'Lead Time', 'Weight per Unit')?.replace(/days?/i, '').trim() ?? ''
  const leadRange = leadRaw.match(/(\d+)[–\-](\d+)/)
  const leadSingle = leadRange ? null : leadRaw.match(/^\s*(\d+)\s*$/)
  const lead_time_days_min = leadRange
    ? parseInt(leadRange[1], 10)
    : (leadSingle ? parseInt(leadSingle[1], 10) : null)
  const lead_time_days_max = leadRange
    ? parseInt(leadRange[2], 10)
    : (leadSingle ? parseInt(leadSingle[1], 10) : null)

  // Item Weight: "80.0 Grams" | "0.08 Kilograms"
  const weightRaw = between(text, 'Weight per Unit', 'Dimensions per Unit')?.trim() ?? ''
  const item_weight_kg = parseWeightToKg(weightRaw)

  // Item Dimensions: "12.0 x 9.0 x 5.0 Centimeters" | "20.0 x 10.5 x 8.0 Inches"
  const itemDimRaw = between(text, 'Dimensions per Unit', 'HTS Code')?.trim() ?? ''
  const [item_length_cm, item_width_cm, item_height_cm] = parseDims3(itemDimRaw)

  // HTS Code
  const hts_code = between(text, 'HTS Code', 'Units per Export Carton')?.trim() || null

  // Units per Export Carton
  const unitsRaw = between(text, 'Units per Export Carton', 'Export Carton')?.trim() ?? ''
  const units_per_carton = unitsRaw ? (parseInt(unitsRaw, 10) || null) : null

  // Carton Dimensions: "82.0 x 42.0 x 45.0 Centimeters"
  const cartonDimRaw = (
    between(text, 'Export Carton Dimensions L/W/H', 'Logistics attributes') ??
    between(text, 'Export Carton Dimensions L/W/H', 'Export Carton Weight')
  )?.trim() ?? ''
  const [carton_length_cm, carton_width_cm, carton_height_cm] = parseDims3(cartonDimRaw)

  // Logistics Type (optional): "Common" | "Charged"
  const logisticsRaw = between(text, 'Logistics attributes', 'Export Carton Weight')?.trim()
  const logistics_type = logisticsRaw || null

  // Carton Weight: always "N.N Kilograms"
  const cartonWeightRaw = after(text, 'Export Carton Weight')?.trim() ?? ''
  const carton_weight_kg = parseWeightToKg(cartonWeightRaw)

  // Sanity check: if item dims exceed the carton's largest dimension by >20%,
  // the vendor likely entered mm values but labelled them Centimeters on GS.
  // Dividing by 10 (mm → cm) is the heuristic correction.
  let [il, iw, ih] = [item_length_cm, item_width_cm, item_height_cm]
  if (il != null && carton_length_cm != null && carton_width_cm != null && carton_height_cm != null) {
    const cartonMax = Math.max(carton_length_cm, carton_width_cm, carton_height_cm)
    const itemMax = Math.max(il, iw ?? 0, ih ?? 0)
    if (itemMax > cartonMax * 1.2) {
      il = round2(il / 10)
      iw = iw != null ? round2(iw / 10) : null
      ih = ih != null ? round2(ih / 10) : null
    }
  }

  return {
    fob_port, lead_time_days_min, lead_time_days_max,
    item_weight_kg, item_length_cm: il, item_width_cm: iw, item_height_cm: ih,
    hts_code, units_per_carton,
    carton_length_cm, carton_width_cm, carton_height_cm, carton_weight_kg,
    logistics_type,
  }
}

// ─── UNIT CONVERSION ──────────────────────────────────────────────────────────

/** Convert weight string to kg. Supports Grams / Kilograms. null for unknown. */
function parseWeightToKg(raw: string): number | null {
  const m = raw.match(/([\d.]+)\s*([A-Za-z]+)/)
  if (!m) return null
  const v = parseFloat(m[1])
  const u = m[2].toLowerCase()
  if (u === 'grams' || u === 'gram') return round4(v / 1000)
  if (u === 'kilograms' || u === 'kilogram') return round4(v)
  return null   // pounds, ounces, etc. not seen — null > broken
}

/**
 * Parse "L x W x H Unit" string into [length, width, height] in cm.
 * Centimeters → direct. Inches → ×2.54. Millimeters → ÷10. Feet → null.
 */
function parseDims3(raw: string): [number | null, number | null, number | null] {
  const m = raw.match(/([\.\d]+)\s*[xX×]\s*([\d.]+)\s*[xX×]\s*([\d.]+)\s*([A-Za-z]+)/)
  if (!m) return [null, null, null]
  const [l, w, h] = [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])]
  const u = m[4].toLowerCase()
  if (u === 'centimeters' || u === 'centimeter') return [round2(l), round2(w), round2(h)]
  if (u === 'inches' || u === 'inch') return [round2(l * 2.54), round2(w * 2.54), round2(h * 2.54)]
  if (u === 'millimeters' || u === 'millimeter') return [round2(l / 10), round2(w / 10), round2(h / 10)]
  return [null, null, null]   // feet, unknown → null > broken
}

// ─── CERTIFICATIONS ───────────────────────────────────────────────────────────

const CERT_PATTERNS = [
  'CE', 'RoHS', 'FCC', 'ISO', 'BIS', 'UL', 'CCC', 'CB', 'ETL', 'TUV',
  'REACH', 'MSDS', 'BSCI', 'GRS', 'GOTS', 'EN71', 'ASTM', 'EN62133',
]

/** Extract recognized cert names from raw cert text blobs. Returns deduped array. */
function extractCertifications(certTexts: string[]): string[] {
  const found = new Set<string>()
  const combined = certTexts.join(' ')
  for (const cert of CERT_PATTERNS) {
    if (new RegExp(`(?<![A-Za-z])${cert}(?![A-Za-z])`).test(combined)) {
      found.add(cert)
    }
  }
  return [...found]
}

// ─── SUPPLIER BLOCK ───────────────────────────────────────────────────────────

interface SupplierInput {
  supplierName: string
  supplierUrl: string
  supplierYears: number
  supplierBlockText: string
}

type SupplierFields = Pick<GlobalSourcesProductDetail,
  | 'supplier_name' | 'supplier_url' | 'supplier_country' | 'supplier_years_gs'
  | 'supplier_business_types' | 'supplier_trade_shows_count'
>

function parseSupplierBlock(input: SupplierInput): SupplierFields {
  const text = input.supplierBlockText

  // Country: "N yrs China This supplier..." — country is between yrs and "This"
  const countryMatch = text.match(/\d+\s+yrs?\s+([A-Z][a-zA-Z\s]+?)(?:\s+This\s|\s+Response|$)/m)
  const supplier_country = countryMatch?.[1]?.trim() ?? null

  // "Response Rate: High"
  const rateMatch = text.match(/Response\s+Rate\s*:\s*(\S+)/i)

  // "Avg Response Time: ≤24 h" | "24–48 h"
  const timeMatch = text.match(/Avg\s+Response\s+Time\s*:\s*([^\n]+?)(?:\s+Trade|\s+Business|$)/i)

  // "Business Type Manufacturer, Exporter" (no colon on GS)
  const bizMatch = text.match(/Business\s+Type\s+(.+?)(?:\n|Chat|Follow|$)/i)
  const supplier_business_types = bizMatch
    ? bizMatch[1].split(/[,;]+/).map((s: string) => s.trim()).filter(Boolean)
    : []

  // "exhibited at N Global Sources Trade Shows"
  const showMatch = text.match(/exhibited\s+at\s+(\d+)\s+Global\s+Sources/i)
  const supplier_trade_shows_count = showMatch ? parseInt(showMatch[1], 10) : null

  return {
    supplier_name: input.supplierName.trim() || null,
    supplier_url: input.supplierUrl || null,
    supplier_country,
    supplier_years_gs: input.supplierYears > 0 ? input.supplierYears : null,
    supplier_business_types,
    supplier_trade_shows_count,
  }
}

// ─── STRING UTILS ─────────────────────────────────────────────────────────────

/** Text between two label anchors (exclusive). Returns null if not found. */
function between(text: string, startLabel: string, endLabel: string): string | null {
  const si = text.indexOf(startLabel)
  if (si === -1) return null
  const rest = text.slice(si + startLabel.length)
  const ei = rest.indexOf(endLabel)
  return ei === -1 ? null : rest.slice(0, ei)
}

/** Text after a label anchor to end of string. Returns null if label not found. */
function after(text: string, label: string): string | null {
  const i = text.indexOf(label)
  return i === -1 ? null : text.slice(i + label.length)
}

/** Parse integer, stripping commas. */
function parseIntClean(s: string): number {
  return parseInt(s.replace(/,/g, ''), 10)
}

function round2(v: number): number { return Math.round(v * 100) / 100 }
function round4(v: number): number { return Math.round(v * 10000) / 10000 }

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
}

// ─── ENRICHED FIELD PARSERS ───────────────────────────────────────────────────

/**
 * Strip the section heading from the raw specifications text and return
 * up to ~2000 chars of the body.
 *
 * Input example:
 *   "Key Specifications/ Special Features\nSpecial Features:\nVoltage: 5V..."
 */
function parseKeySpecifications(raw: string): string | null {
  if (!raw) return null
  const cleaned = raw
    // Strip everything up to (and including) the first colon after "Key Specifications"
    // Handles both newline-separated and single-line formats:
    //   "Key Specifications/ Special Features: <data>"
    //   "Key Specifications/ Special Features:\n<data>"
    .replace(/^Key\s+Specifications[^:]*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned.slice(0, 2000) || null
}

/**
 * Parse a comma/newline separated list of export market names.
 *
 * Input example (after stripping heading in page.evaluate):
 *   "North America, Europe, Southeast Asia,Middle East"
 */
function parseExportMarkets(raw: string): string[] {
  if (!raw) return []
  // Strip the heading prefix that may arrive as part of the container text
  const stripped = raw.replace(/^Main\s+Export\s+Markets\s*/i, '').trim()
  return stripped
    .split(/[,\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 1 && s.length < 60)
}

/**
 * Parse payment methods from tab-separated key/value payment details text.
 *
 * Input example:
 *   "Payment Terms\tL/C, T/T, Western Union\nAccepted Currencies\tUSD"
 *
 * Returns an array of all distinct values (splits on comma within values too).
 */
function parsePaymentMethods(raw: string): string[] {
  if (!raw) return []
  const methods: string[] = []
  for (const line of raw.split('\n')) {
    const [, value] = line.split('\t')
    if (!value) continue
    for (const part of value.split(/[,;]+/)) {
      const m = part.trim()
      if (m && m.length > 0 && m.length < 80) methods.push(m)
    }
  }
  return [...new Set(methods)]
}
