/**
 * gs_suppliers DB operations — Drizzle/Fly.io version.
 */
import { sql } from 'drizzle-orm'
import { gsSuppliers } from '@puckora/db'
import { log } from '../../../shared/logger'
import type { GlobalSourcesProductDetail } from '@puckora/scraper-core'
import type { GsSupplierCard } from '../pages/supplier-listing'
import type { DB } from '../../../shared/db'

export function extractGsSupplierId(profileUrl: string): string | null {
    const m = profileUrl.match(/homepage[_-](\d{8,})\.htm/)
    if (m) return m[1]
    const m2 = profileUrl.match(/[/_-](\d{8,})/)
    if (m2) return m2[1]
    return null
}

function parseEmployeeCount(raw: string): number | null {
    const m = raw.match(/(\d+)/)
    return m ? parseInt(m[1], 10) : null
}

export async function upsertGsSupplier(
    db: DB,
    detail: GlobalSourcesProductDetail,
): Promise<string | null> {
    if (!detail.supplier_name) return null

    const supplierId = detail.supplier_url
        ? extractGsSupplierId(detail.supplier_url)
        : null

    if (!supplierId) return null

    try {
        const rows = await db
            .insert(gsSuppliers)
            .values({
                platform_supplier_id: supplierId,
                profile_url: detail.supplier_url ?? null,
                name: detail.supplier_name,
                country: detail.supplier_country ?? null,
                years_on_platform: detail.supplier_years_gs ?? null,
                business_types: detail.supplier_business_types ?? [],
                trade_shows_count: detail.supplier_trade_shows_count ?? null,
                verifications: detail.supplier_verifications?.length ? detail.supplier_verifications : [],
            })
            .onConflictDoUpdate({
                target: gsSuppliers.platform_supplier_id,
                set: {
                    profile_url: sql`excluded.profile_url`,
                    name: sql`excluded.name`,
                    country: sql`excluded.country`,
                    years_on_platform: sql`excluded.years_on_platform`,
                    business_types: sql`excluded.business_types`,
                    verifications: sql`excluded.verifications`,
                    updated_at: sql`now()`,
                },
            })
            .returning({ id: gsSuppliers.id })

        return rows[0]?.id ?? null
    } catch (err) {
        log.db.error('gs_suppliers', 'upsert', err as Error)
        return null
    }
}

export async function upsertGsSupplierCards(
    db: DB,
    cards: GsSupplierCard[],
): Promise<void> {
    const rows = cards
        .filter(c => !!c.platformSupplierId)
        .map(card => ({
            platform_supplier_id: card.platformSupplierId!,
            profile_url: card.profileUrl ?? null,
            name: card.name,
            country: card.country ?? null,
            years_on_platform: card.yearsOnGs ?? null,
            business_types: card.businessTypes ?? [],
            trade_shows_count: null as number | null,
            main_products: card.mainProducts ?? [],
            employee_count: card.employeeCount ? parseEmployeeCount(card.employeeCount) : null,
            export_markets: card.exportMarkets ?? [],
            verifications: card.verifications ?? [],
        }))

    if (rows.length === 0) return

    try {
        await db
            .insert(gsSuppliers)
            .values(rows)
            .onConflictDoUpdate({
                target: gsSuppliers.platform_supplier_id,
                set: {
                    main_products: sql`excluded.main_products`,
                    employee_count: sql`excluded.employee_count`,
                    export_markets: sql`excluded.export_markets`,
                    updated_at: sql`now()`,
                },
            })
        log.db.uploadDone('gs_suppliers', rows.length, 0)
    } catch (err) {
        log.db.error('gs_suppliers', 'upsert (cards)', err as Error)
    }
}

// ─── (end of file) ─────────────────────────────────────────────────────────
