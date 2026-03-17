/**
 * gs_suppliers DB operations.
 *
 * gs_suppliers is platform-agnostic — rows keyed by (platform, platform_supplier_id).
 * upsertGsSupplier()      — from product detail page, returns row UUID for FK.
 * upsertGsSupplierCards() — from supplier listing page, enriches existing rows.
 */
import { log } from '../../../shared/logger'
import type { GlobalSourcesProductDetail } from '@puckora/scraper-core'
import type { GsSupplierCard } from '../pages/supplier-listing'
import type { DB } from '../../../shared/db'

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface SupplierRow {
    platform_supplier_id: string
    profile_url: string | null
    name: string
    country?: string | null
    years_on_platform: number | null
    business_types: string[]
    trade_shows_count: number | null
    main_products?: string[]
    employee_count?: number | null
    export_markets?: string[]
    verifications?: string[]
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Extract the numeric supplier ID from a GS profile URL.
 * "//ldnio.manufacturer.globalsources.com/homepage_6008851380496.htm"
 * → "6008851380496"
 */
export function extractGsSupplierId(profileUrl: string): string | null {
    const m = profileUrl.match(/homepage[_-](\d{8,})\.htm/)
    if (m) return m[1]
    const m2 = profileUrl.match(/[/_-](\d{8,})/)
    if (m2) return m2[1]
    return null
}

/**
 * Parse a GS employee count string into a representative number.
 * "51-100" → 51, "101-500" → 101, ">1000" → 1001, "Unknown" → null
 */
function parseEmployeeCount(raw: string): number | null {
    const m = raw.match(/(\d+)/)
    return m ? parseInt(m[1], 10) : null
}

// ─── UPSERT (from product detail) ────────────────────────────────────────────

/**
 * Upsert one GS supplier from a scraped product detail.
 * Returns the supplier row's UUID, or null on error / missing ID.
 */
export async function upsertGsSupplier(
    db: DB,
    detail: GlobalSourcesProductDetail,
): Promise<string | null> {
    if (!detail.supplier_name) return null

    const supplierId = detail.supplier_url
        ? extractGsSupplierId(detail.supplier_url)
        : null

    if (!supplierId) return null

    const row: SupplierRow = {
        platform_supplier_id: supplierId,
        profile_url: detail.supplier_url,
        name: detail.supplier_name,
        country: detail.supplier_country ?? undefined,
        years_on_platform: detail.supplier_years_gs,
        business_types: detail.supplier_business_types,
        trade_shows_count: detail.supplier_trade_shows_count,
        verifications: detail.supplier_verifications?.length
            ? detail.supplier_verifications
            : undefined,
    }

    const { data, error } = await db
        .from('gs_suppliers')
        .upsert(row, { onConflict: 'platform_supplier_id', ignoreDuplicates: false })
        .select('id')
        .single()

    if (error) {
        log.db.error('gs_suppliers', 'upsert', error)
        return null
    }

    return (data as any)?.id ?? null
}

// ─── UPSERT CARDS (from supplier listing) ────────────────────────────────────

/**
 * Upsert supplier cards from the supplier listing page.
 * Enriches existing rows with main_products, employee_count, export_markets.
 */
export async function upsertGsSupplierCards(
    db: DB,
    cards: GsSupplierCard[],
): Promise<void> {
    const rows: SupplierRow[] = []

    for (const card of cards) {
        if (!card.platformSupplierId) continue
        rows.push({
            platform_supplier_id: card.platformSupplierId,
            profile_url: card.profileUrl || null,
            name: card.name,
            country: card.country,
            years_on_platform: card.yearsOnGs,
            business_types: card.businessTypes,
            trade_shows_count: null,
            main_products: card.mainProducts,
            employee_count: card.employeeCount ? parseEmployeeCount(card.employeeCount) : null,
            export_markets: card.exportMarkets,
            verifications: card.verifications,
        })
    }

    if (rows.length === 0) return

    const { error } = await db
        .from('gs_suppliers')
        .upsert(rows, { onConflict: 'platform_supplier_id', ignoreDuplicates: false })

    if (error) {
        log.db.error('gs_suppliers', 'upsert (cards)', error)
    } else {
        log.db.uploadDone('gs_suppliers', rows.length, 0)
    }
}
