/**
 * gs_products DB operations — Drizzle/Fly.io version.
 */
import { sql, eq } from 'drizzle-orm'
import { gsProducts } from '@puckora/db'
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
        try {
            await db
                .insert(gsProducts)
                .values(batch as typeof gsProducts.$inferInsert[])
                .onConflictDoUpdate({
                    target: gsProducts.id,
                    set: {
                        url: sql`excluded.url`,
                        supplier_id: sql`excluded.supplier_id`,
                        source_category_id: sql`excluded.source_category_id`,
                        name: sql`excluded.name`,
                        description: sql`excluded.description`,
                        brand_name: sql`excluded.brand_name`,
                        model_number: sql`excluded.model_number`,
                        price_low: sql`excluded.price_low`,
                        price_high: sql`excluded.price_high`,
                        price_unit: sql`excluded.price_unit`,
                        price_tiers: sql`excluded.price_tiers`,
                        moq_quantity: sql`excluded.moq_quantity`,
                        moq_unit: sql`excluded.moq_unit`,
                        item_length_cm: sql`excluded.item_length_cm`,
                        item_width_cm: sql`excluded.item_width_cm`,
                        item_height_cm: sql`excluded.item_height_cm`,
                        item_weight_kg: sql`excluded.item_weight_kg`,
                        carton_length_cm: sql`excluded.carton_length_cm`,
                        carton_width_cm: sql`excluded.carton_width_cm`,
                        carton_height_cm: sql`excluded.carton_height_cm`,
                        carton_weight_kg: sql`excluded.carton_weight_kg`,
                        units_per_carton: sql`excluded.units_per_carton`,
                        fob_port: sql`excluded.fob_port`,
                        lead_time_days_min: sql`excluded.lead_time_days_min`,
                        lead_time_days_max: sql`excluded.lead_time_days_max`,
                        hts_code: sql`excluded.hts_code`,
                        logistics_type: sql`excluded.logistics_type`,
                        image_primary: sql`excluded.image_primary`,
                        images: sql`excluded.images`,
                        certifications: sql`excluded.certifications`,
                        export_markets: sql`excluded.export_markets`,
                        payment_methods: sql`excluded.payment_methods`,
                        people_also_search: sql`excluded.people_also_search`,
                        category_breadcrumb: sql`excluded.category_breadcrumb`,
                        key_specifications: sql`excluded.key_specifications`,
                        product_info_text: sql`excluded.product_info_text`,
                        scrape_status: sql`excluded.scrape_status`,
                        scraped_at: sql`excluded.scraped_at`,
                        updated_at: sql`now()`,
                    },
                })
            log.db.uploadDone('gs_products', batch.length, Date.now() - t0)
        } catch (err) {
            log.db.error('gs_products', 'upsert', err as Error, batchLabel)
            const sample = batch.slice(0, 5).map(r => `${r.id}(sup=${r.supplier_id ?? 'null'})`).join(', ')
            log.error(`  sample rows: ${sample} …`)
        }
    }
}

export async function markGsProductFailed(db: DB, url: string, id: string): Promise<void> {
    await db
        .insert(gsProducts)
        .values({ id, url, name: url, scrape_status: 'failed', scraped_at: new Date().toISOString() })
        .onConflictDoUpdate({
            target: gsProducts.id,
            set: {
                scrape_status: sql`excluded.scrape_status`,
                scraped_at: sql`excluded.scraped_at`,
                updated_at: sql`now()`,
            },
        })
}

export async function getFailedGsProductUrls(db: DB): Promise<string[]> {
    const rows = await db
        .select({ url: gsProducts.url })
        .from(gsProducts)
        .where(eq(gsProducts.scrape_status, 'failed'))

    return rows.map(r => r.url)
}
