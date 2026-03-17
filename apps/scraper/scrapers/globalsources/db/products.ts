/**
 * gs_products DB operations.
 *
 * Works against the gs_products table from migration 0004_globalsources.sql.
 *
 * upsertGsProducts()      — batched upsert, onConflict: 'id'. Call after
 *                           resolving supplier_id via upsertGsSupplier().
 * markGsProductFailed()   — mark a URL as failed for later retry.
 * getFailedGsProductUrls() — fetch product URLs that failed for retry.
 */
import { log } from '../../../shared/logger'
import { IS_DEBUG } from '../../../shared/db'
import type { GlobalSourcesProductDetail } from '@puckora/scraper-core'
import type { Json } from '@puckora/types'
import { GS_CONFIG } from '../config'
import type { DB } from '../../../shared/db'

// ─── ROW SHAPE ───────────────────────────────────────────────────────────────

interface GsProductRow {
    id: string
    url: string
    supplier_id: string | null
    name: string
    description: string | null
    price_low: number | null
    price_high: number | null
    price_unit: string | null
    price_tiers: Json | null
    moq_quantity: number | null
    moq_unit: string | null
    item_length_cm: number | null
    item_width_cm: number | null
    item_height_cm: number | null
    item_weight_kg: number | null
    carton_length_cm: number | null
    carton_width_cm: number | null
    carton_height_cm: number | null
    carton_weight_kg: number | null
    units_per_carton: number | null
    fob_port: string | null
    lead_time_days_min: number | null
    lead_time_days_max: number | null
    hts_code: string | null
    logistics_type: string | null
    model_number: string | null
    brand_name: string | null
    certifications: string[]
    image_primary: string | null
    images: Json | null
    category_breadcrumb: string[]
    source_category_id: string | null
    key_specifications: string | null
    export_markets: string[]
    payment_methods: string[]
    people_also_search: string[]
    product_info_text: string | null
    scrape_status: 'scraped' | 'failed'
    scraped_at: string
}

// ─── MAPPER ───────────────────────────────────────────────────────────────────

function toRow(
    detail: GlobalSourcesProductDetail,
    supplier_id: string | null,
    source_category_id: string | null,
): GsProductRow {
    return {
        id: detail.id,
        url: detail.url,
        supplier_id,
        name: detail.name,
        description: detail.description,
        price_low: detail.price_low != null ? Math.round(detail.price_low * 100) / 100 : null,
        price_high: detail.price_high != null ? Math.round(detail.price_high * 100) / 100 : null,
        price_unit: detail.price_unit,
        price_tiers: detail.price_tiers.length > 0 ? (detail.price_tiers as unknown as Json) : null,
        moq_quantity: detail.moq_quantity,
        moq_unit: detail.moq_unit,
        item_length_cm: detail.item_length_cm,
        item_width_cm: detail.item_width_cm,
        item_height_cm: detail.item_height_cm,
        item_weight_kg: detail.item_weight_kg,
        carton_length_cm: detail.carton_length_cm,
        carton_width_cm: detail.carton_width_cm,
        carton_height_cm: detail.carton_height_cm,
        carton_weight_kg: detail.carton_weight_kg,
        units_per_carton: detail.units_per_carton,
        fob_port: detail.fob_port,
        lead_time_days_min: detail.lead_time_days_min,
        lead_time_days_max: detail.lead_time_days_max,
        hts_code: detail.hts_code,
        logistics_type: detail.logistics_type,
        model_number: detail.model_number,
        brand_name: detail.brand_name,
        certifications: detail.certifications,
        image_primary: detail.image_primary,
        images: detail.images.length > 0 ? (detail.images as Json) : null,
        category_breadcrumb: detail.category_breadcrumb,
        source_category_id,
        key_specifications: detail.key_specifications ?? null,
        export_markets: detail.export_markets ?? [],
        payment_methods: detail.payment_methods ?? [],
        people_also_search: detail.people_also_search ?? [],
        product_info_text: detail.product_info_text ?? null,
        scrape_status: 'scraped',
        scraped_at: new Date().toISOString(),
    }
}

// ─── UPSERT ───────────────────────────────────────────────────────────────────

export async function upsertGsProducts(
    db: DB,
    details: Array<{ detail: GlobalSourcesProductDetail; supplierId: string | null; sourceCategoryId: string | null }>,
): Promise<void> {
    const rows = details.map(({ detail, supplierId, sourceCategoryId }) =>
        toRow(detail, supplierId, sourceCategoryId)
    )

    for (let i = 0; i < rows.length; i += GS_CONFIG.batch_size) {
        const batch = rows.slice(i, i + GS_CONFIG.batch_size)
        const batchLabel = `batch ${Math.floor(i / GS_CONFIG.batch_size) + 1}/${Math.ceil(rows.length / GS_CONFIG.batch_size)}`

        if (IS_DEBUG) {
            batch.forEach(r => log.info(`[gs_products] ${r.id} ${r.name.slice(0, 60)}`))
        }

        const t0 = Date.now()
        const { error } = await db
            .from('gs_products')
            .upsert(batch, { onConflict: 'id' })

        if (error) {
            log.db.error('gs_products', 'upsert', error, batchLabel)
            const sample = batch.slice(0, 5).map(r => `${r.id}(sup=${r.supplier_id ?? 'null'})`).join(', ')
            log.error(`  sample rows: ${sample} …`)
        } else {
            log.db.uploadDone('gs_products', batch.length, Date.now() - t0)
        }
    }
}

export async function markGsProductFailed(db: DB, url: string, id: string): Promise<void> {
    await db.from('gs_products').upsert(
        { id, url, name: url, scrape_status: 'failed', scraped_at: new Date().toISOString() },
        { onConflict: 'id' }
    )
}

export async function getFailedGsProductUrls(db: DB): Promise<string[]> {
    const { data, error } = await db
        .from('gs_products')
        .select('url')
        .eq('scrape_status', 'failed')

    if (error) {
        log.error(`getFailedGsProductUrls: ${error.message}`)
        return []
    }
    return (data as { url: string }[]).map(r => r.url)
}
