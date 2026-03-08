import { CONFIG } from './config'
import { CatalogItemResult, FeeEstimateResult, SpApiDimension, SpApiDimensions } from './types'
import { log } from './logger'

// ─── TOKEN MANAGER ────────────────────────────────────────────────────────────

interface AccessToken {
  value: string
  expires_at: number  // epoch ms
}

let _token: AccessToken | null = null

async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (_token && _token.expires_at - now > 60_000) return _token.value

  const res = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: CONFIG.sp_refresh_token,
      client_id: CONFIG.sp_client_id,
      client_secret: CONFIG.sp_client_secret,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`SP-API token refresh failed: ${res.status} ${body}`)
  }

  const data = await res.json() as { access_token: string; expires_in: number }
  _token = {
    value: data.access_token,
    expires_at: now + data.expires_in * 1_000,
  }

  log.api('Access token refreshed')
  return _token.value
}

// ─── RATE LIMITER — strict sequential, never fails ───────────────────────────

async function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

async function spApiCall<T>(
  url: string,
  options: RequestInit = {},
  attempt = 0
): Promise<T | null> {
  const token = await getAccessToken()

  const res = await fetch(url, {
    ...options,
    headers: {
      'x-amz-access-token': token,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })

  // Rate throttled
  if (res.status === 429) {
    if (attempt >= CONFIG.spapi_retry_max) {
      log.warn(`SP-API 429 — max retries reached for ${url}`)
      return null
    }
    log.warn(`SP-API 429 — waiting ${CONFIG.spapi_retry_on_429_ms / 1000}s (attempt ${attempt + 1})`)
    await sleep(CONFIG.spapi_retry_on_429_ms)
    return spApiCall<T>(url, options, attempt + 1)
  }

  // Server error
  if (res.status === 503) {
    if (attempt >= CONFIG.spapi_retry_max) {
      log.warn(`SP-API 503 — max retries reached`)
      return null
    }
    log.warn(`SP-API 503 — waiting ${CONFIG.spapi_retry_on_503_ms / 1000}s (attempt ${attempt + 1})`)
    await sleep(CONFIG.spapi_retry_on_503_ms)
    return spApiCall<T>(url, options, attempt + 1)
  }

  // Product not found — not an error, just no data
  if (res.status === 404) return null

  if (!res.ok) {
    const body = await res.text()
    log.warn(`SP-API ${res.status} for ${url}: ${body.slice(0, 200)}`)
    if (attempt < CONFIG.spapi_retry_max) {
      await sleep(5_000)
      return spApiCall<T>(url, options, attempt + 1)
    }
    return null
  }

  return res.json() as Promise<T>
}

// ─── UNIT CONVERTERS ─────────────────────────────────────────────────────────

function toCm(d: SpApiDimension | undefined): number | null {
  if (!d || d.value == null) return null
  const v = Number(d.value)
  if (!isFinite(v)) return null
  if (d.unit === 'inches') return Math.round(v * 2.54 * 100) / 100
  if (d.unit === 'centimeters') return Math.round(v * 100) / 100
  if (d.unit === 'feet') return Math.round(v * 30.48 * 100) / 100
  return Math.round(v * 100) / 100  // assume cm if unknown unit
}

function toKg(d: SpApiDimension | undefined): number | null {
  if (!d || d.value == null) return null
  const v = Number(d.value)
  if (!isFinite(v)) return null
  if (d.unit === 'pounds') return Math.round(v * 0.453592 * 10000) / 10000
  if (d.unit === 'kilograms') return Math.round(v * 10000) / 10000
  if (d.unit === 'ounces') return Math.round(v * 0.0283495 * 10000) / 10000
  if (d.unit === 'grams') return Math.round(v / 1000 * 10000) / 10000
  return Math.round(v * 10000) / 10000  // assume kg
}

function parseDimensions(dims: SpApiDimensions | undefined) {
  return {
    length_cm: toCm(dims?.length),
    width_cm: toCm(dims?.width),
    height_cm: toCm(dims?.height),
    weight_kg: toKg(dims?.weight),
  }
}

// ─── getCatalogItem ───────────────────────────────────────────────────────────

interface RawCatalogResponse {
  asin: string
  summaries?: Array<{
    marketplaceId: string
    itemName?: string
    brand?: string
    manufacturer?: string
    modelNumber?: string
    packageQuantity?: number
    color?: string
    browseClassification?: { classificationId: string; displayName: string }
    websiteDisplayGroup?: string
  }>
  attributes?: Record<string, Array<{ value: unknown; language_tag?: string; marketplace_id?: string }>>
  dimensions?: Array<{
    marketplaceId: string
    item?: SpApiDimensions
    package?: SpApiDimensions
  }>
  images?: Array<{
    marketplaceId: string
    images: Array<{ variant: string; link: string; height: number; width: number }>
  }>
  productTypes?: Array<{ marketplaceId: string; productType: string }>
  salesRanks?: Array<{
    marketplaceId: string
    classificationRanks?: Array<{ classificationId: string; title: string; rank: number; link?: string }>
    displayGroupRanks?: Array<{ websiteDisplayGroup: string; title: string; rank: number; link?: string }>
  }>
}

export async function getCatalogItem(asin: string): Promise<CatalogItemResult | null> {
  const includedData = [
    'summaries',
    'attributes',
    'dimensions',
    'images',
    'productTypes',
    'salesRanks',
  ].join(',')

  const url = `https://sellingpartnerapi-na.amazon.com/catalog/2022-04-01/items/${asin}` +
    `?marketplaceIds=${CONFIG.sp_marketplace_id}&includedData=${includedData}&locale=en_US`

  await sleep(CONFIG.spapi_delay_ms)

  const raw = await spApiCall<RawCatalogResponse>(url)
  if (!raw) return null

  // ── Summaries ───────────────────────────────────────────────────────────────
  const summary = raw.summaries?.find(s => s.marketplaceId === CONFIG.sp_marketplace_id)
    ?? raw.summaries?.[0]

  // ── Attributes ──────────────────────────────────────────────────────────────
  const attrs = raw.attributes ?? {}

  // bullet_points: array of strings
  const bullet_points: string[] = (attrs['bullet_point'] ?? [])
    .filter(b => !b.marketplace_id || b.marketplace_id === CONFIG.sp_marketplace_id)
    .map(b => String(b.value ?? '').trim())
    .filter(Boolean)

  // Helper: pick attribute value for current marketplace (or first available)
  const attrVal = (key: string): unknown | null => {
    const arr = attrs[key] ?? []
    const byMkt = arr.find(a => a.marketplace_id === CONFIG.sp_marketplace_id)
    const any = arr.find(a => a.value != null)
    return (byMkt ?? any)?.value ?? null
  }

  // list_price from attributes (most reliable price source)
  const rawListPrice = attrVal('list_price') as { value?: number; currency?: string } | number | null
  const list_price = rawListPrice != null
    ? typeof rawListPrice === 'object' && rawListPrice !== null
      ? (typeof rawListPrice.value === 'number' ? Math.round(rawListPrice.value * 100) / 100 : null)
      : (typeof rawListPrice === 'number' ? Math.round(rawListPrice * 100) / 100 : null)
    : null

  // ── Dimensions ──────────────────────────────────────────────────────────────
  const dimsEntry = raw.dimensions?.find(d => d.marketplaceId === CONFIG.sp_marketplace_id)
    ?? raw.dimensions?.[0]
  const itemDims = parseDimensions(dimsEntry?.item)
  const pkgDims = parseDimensions(dimsEntry?.package)

  // ── Images ──────────────────────────────────────────────────────────────────
  const imagesEntry = raw.images?.find(i => i.marketplaceId === CONFIG.sp_marketplace_id)
    ?? raw.images?.[0]
  const mainImage = imagesEntry?.images?.find(i => i.variant === 'MAIN')
  // Prefer largest available — sort by pixel area descending
  const sortedImages = imagesEntry?.images?.filter(i => i.variant === 'MAIN')
    .sort((a, b) => (b.height * b.width) - (a.height * a.width))
  const main_image_url = sortedImages?.[0]?.link ?? mainImage?.link ?? null

  // ── Product types ────────────────────────────────────────────────────────────
  const pt = raw.productTypes?.find(p => p.marketplaceId === CONFIG.sp_marketplace_id)
    ?? raw.productTypes?.[0]

  // ── Sales ranks ─────────────────────────────────────────────────────────────
  const ranksEntry = raw.salesRanks?.find(r => r.marketplaceId === CONFIG.sp_marketplace_id)
    ?? raw.salesRanks?.[0]
  const classification_ranks = (ranksEntry?.classificationRanks ?? []).map(r => ({
    classificationId: r.classificationId,
    rank: r.rank,
  }))
  const display_ranks = (ranksEntry?.displayGroupRanks ?? []).map(r => ({
    classificationId: r.websiteDisplayGroup,
    rank: r.rank,
  }))
  // category_ranks: classification ranks only (real browse node IDs that exist in amazon_categories).
  // displayGroupRanks use string keys like 'fashion_display_on_website' that are not in our DB.
  const category_ranks = classification_ranks

  return {
    title: summary?.itemName ?? null,
    brand: summary?.brand ?? null,
    manufacturer: summary?.manufacturer ?? null,
    model_number: summary?.modelNumber ?? null,
    package_quantity: summary?.packageQuantity ?? null,
    color: summary?.color ?? null,
    list_price,
    main_image_url,
    bullet_points,
    product_type: pt?.productType ?? null,
    browse_node_id: summary?.browseClassification?.classificationId ?? null,

    item_length_cm: itemDims.length_cm,
    item_width_cm: itemDims.width_cm,
    item_height_cm: itemDims.height_cm,
    item_weight_kg: itemDims.weight_kg,
    pkg_length_cm: pkgDims.length_cm,
    pkg_width_cm: pkgDims.width_cm,
    pkg_height_cm: pkgDims.height_cm,
    pkg_weight_kg: pkgDims.weight_kg,

    category_ranks,
  }
}

// ─── getMyFeesEstimates (batch, up to 20 ASINs per call) ────────────────────

// The batch endpoint returns a bare array of FeesEstimateResult (no payload wrapper)
type RawFeesEstimatesResponse = Array<{
  Status?: string
  FeesEstimateIdentifier?: { SellerInputIdentifier?: string }
  FeesEstimate?: {
    TotalFeesEstimate?: { Amount: number }
    FeeDetailList?: Array<{
      FeeType: string
      FinalFee?: { Amount: number }
      FeeAmount?: { Amount: number }
      IncludedFeeDetailList?: Array<{
        FeeType: string
        FinalFee?: { Amount: number }
        FeeAmount?: { Amount: number }
      }>
    }>
  }
  Error?: { Type: string; Code: string; Message: string }
}>

export async function getFeesEstimatesBatch(
  items: Array<{ asin: string; price: number }>,
): Promise<Map<string, FeeEstimateResult>> {
  const result = new Map<string, FeeEstimateResult>()
  const BATCH = 20
  const url = 'https://sellingpartnerapi-na.amazon.com/products/fees/v0/feesEstimate'

  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH)

    // Body is a bare array of FeesEstimateByIdRequest objects.
    // PriceToEstimateFees/IsAmazonFulfilled/Identifier go inside FeesEstimateRequest;
    // IdType and IdValue are siblings of FeesEstimateRequest.
    const body = batch.map(({ asin, price }) => ({
      FeesEstimateRequest: {
        MarketplaceId: CONFIG.sp_marketplace_id,
        IsAmazonFulfilled: true,
        PriceToEstimateFees: {
          ListingPrice: { Amount: price, CurrencyCode: 'USD' },
          Shipping: { Amount: 0, CurrencyCode: 'USD' },
        },
        Identifier: asin,
      },
      IdType: 'ASIN',
      IdValue: asin,
    }))

    // Batch endpoint rate limit is 0.5 req/s → min 2 s between calls
    await sleep(Math.max(CONFIG.spapi_delay_ms, 2_000))

    const raw = await spApiCall<RawFeesEstimatesResponse>(url, {
      method: 'POST',
      body: JSON.stringify(body),
    })

    if (!Array.isArray(raw)) continue

    for (const entry of raw) {
      const asin = entry.FeesEstimateIdentifier?.SellerInputIdentifier
      if (!asin) continue

      if (entry.Status !== 'Success' || entry.Error) {
        const msg = entry.Error?.Message ?? entry.Status ?? 'unknown error'
        log.warn(`Fee estimate error for ${asin}: ${msg}`)
        result.set(asin, { fba_fee: null, referral_fee: null })
        continue
      }

      const fees = entry.FeesEstimate
      const toAmt = (v: number | null | undefined) =>
        v != null && isFinite(Number(v)) ? Math.round(Number(v) * 100) / 100 : null

      // FBAPerUnitFulfillmentFee can appear at the top level of FeeDetailList,
      // or nested inside IncludedFeeDetailList of a parent fee (e.g. "FBAFees").
      const allFees = [
        ...(fees?.FeeDetailList ?? []),
        ...(fees?.FeeDetailList ?? []).flatMap(f => f.IncludedFeeDetailList ?? []),
      ]

      const fbaFee = toAmt(
        allFees.find(f => f.FeeType === 'FBAFees')?.FinalFee?.Amount
      )
      const refFee = toAmt(
        allFees.find(f => f.FeeType === 'ReferralFee')?.FinalFee?.Amount
      )

      if (fbaFee === null) {
        const types = allFees.map(f => f.FeeType).join(', ') || '(none)'
        log.warn(`No FBAFees for ${asin} — fee types: ${types}`)
      }

      result.set(asin, {
        fba_fee: fbaFee,
        referral_fee: refFee,
      })
    }

    log.api(`Fee batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(items.length / BATCH)} — ${batch.length} ASINs`)
  }

  return result
}
