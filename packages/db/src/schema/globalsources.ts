/**
 * Drizzle schema: GlobalSources supplier/product tables.
 *
 * gs_categories   — GS product categories (seeded from JSON at scraper start)
 * gs_suppliers    — supplier profiles extracted from product pages
 * gs_products     — supplier product listings
 */
import {
    pgTable,
    text,
    integer,
    real,
    timestamp,
    uuid,
    index,
    uniqueIndex,
    jsonb,
} from 'drizzle-orm/pg-core'
import { gsCategoryScrapeStatusEnum, gsScrapeStatusEnum } from '../enums'

// ── gs_categories ───────────────────────────────────────────────────────────

export const gsCategories = pgTable('gs_categories', {
    id: uuid('id').primaryKey().defaultRandom(),
    url: text('url').notNull(),
    name: text('name'),
    slug: text('slug'),
    gs_category_id: text('gs_category_id'),
    people_also_search: text('people_also_search').array().notNull().default([]),
    top_categories: text('top_categories').array().notNull().default([]),
    trending: text('trending').array().notNull().default([]),
    scrape_status: gsCategoryScrapeStatusEnum('scrape_status').notNull().default('pending'),
    last_scraped_at: timestamp('last_scraped_at', { mode: 'string', withTimezone: true }),
    created_at: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    uniqueIndex('idx_gs_categories_url').on(t.url),
])

// ── gs_suppliers ────────────────────────────────────────────────────────────

export const gsSuppliers = pgTable('gs_suppliers', {
    id: uuid('id').primaryKey().defaultRandom(),
    platform_supplier_id: text('platform_supplier_id').notNull(),
    name: text('name').notNull(),
    profile_url: text('profile_url'),
    country: text('country'),
    years_on_platform: integer('years_on_platform'),
    employee_count: integer('employee_count'),
    trade_shows_count: integer('trade_shows_count'),
    business_types: text('business_types').array().notNull().default([]),
    main_products: text('main_products').array().notNull().default([]),
    export_markets: text('export_markets').array().notNull().default([]),
    verifications: text('verifications').array().notNull().default([]),
    created_at: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    uniqueIndex('idx_gs_suppliers_platform_id').on(t.platform_supplier_id),
])

// ── gs_products ─────────────────────────────────────────────────────────────

export const gsProducts = pgTable('gs_products', {
    id: text('id').primaryKey(),
    url: text('url').notNull(),
    supplier_id: uuid('supplier_id').references(() => gsSuppliers.id),
    source_category_id: uuid('source_category_id').references(() => gsCategories.id),
    name: text('name').notNull(),
    description: text('description'),
    brand_name: text('brand_name'),
    model_number: text('model_number'),
    // Pricing
    price_low: real('price_low'),
    price_high: real('price_high'),
    price_unit: text('price_unit'),
    price_tiers: jsonb('price_tiers'),
    // MOQ
    moq_quantity: integer('moq_quantity'),
    moq_unit: text('moq_unit'),
    // Dimensions
    item_length_cm: real('item_length_cm'),
    item_width_cm: real('item_width_cm'),
    item_height_cm: real('item_height_cm'),
    item_weight_kg: real('item_weight_kg'),
    carton_length_cm: real('carton_length_cm'),
    carton_width_cm: real('carton_width_cm'),
    carton_height_cm: real('carton_height_cm'),
    carton_weight_kg: real('carton_weight_kg'),
    units_per_carton: integer('units_per_carton'),
    // Logistics
    fob_port: text('fob_port'),
    lead_time_days_min: integer('lead_time_days_min'),
    lead_time_days_max: integer('lead_time_days_max'),
    hts_code: text('hts_code'),
    logistics_type: text('logistics_type'),
    // Media
    image_primary: text('image_primary'),
    images: jsonb('images'),
    // Arrays
    certifications: text('certifications').array().notNull().default([]),
    export_markets: text('export_markets').array().notNull().default([]),
    payment_methods: text('payment_methods').array().notNull().default([]),
    people_also_search: text('people_also_search').array().notNull().default([]),
    category_breadcrumb: text('category_breadcrumb').array().notNull().default([]),
    // Text
    key_specifications: text('key_specifications'),
    product_info_text: text('product_info_text'),
    // Status
    scrape_status: gsScrapeStatusEnum('scrape_status').notNull().default('scraped'),
    scraped_at: timestamp('scraped_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
    created_at: timestamp('created_at', { mode: 'string', withTimezone: true }).defaultNow(),
    updated_at: timestamp('updated_at', { mode: 'string', withTimezone: true }),
}, (t) => [
    index('idx_gs_products_supplier_id').on(t.supplier_id),
    index('idx_gs_products_source_category_id').on(t.source_category_id),
    index('idx_gs_products_scrape_status').on(t.scrape_status),
])
