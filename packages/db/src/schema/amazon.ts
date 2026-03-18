/**
 * Drizzle schema: Amazon Best Sellers tables.
 *
 * amazon_categories         — category tree, scraped by the Amazon scraper
 * amazon_products           — product catalogue, enriched via SP-API
 * product_category_ranks    — BSR / organic rank observations (time-series)
 * amazon_keywords           — one row per unique (keyword, marketplace) pair
 * amazon_keyword_products   — junction: keyword × ASIN
 */
import { sql } from 'drizzle-orm'
import {
    pgTable,
    pgView,
    text,
    integer,
    boolean,
    real,
    numeric,
    date,
    timestamp,
    uuid,
    index,
    uniqueIndex,
    primaryKey,
} from 'drizzle-orm/pg-core'
import {
    categoryScrapeStatusEnum,
    productScrapeStatusEnum,
} from '../enums'

// ── amazon_categories ───────────────────────────────────────────────────────

export const amazonCategories = pgTable('amazon_categories', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    full_path: text('full_path').notNull(),
    depth: integer('depth').notNull(),
    breadcrumb: text('breadcrumb').array().notNull().default([]),
    is_leaf: boolean('is_leaf').notNull().default(false),
    marketplace: text('marketplace').notNull().default('US'),
    parent_id: text('parent_id'),
    bestsellers_url: text('bestsellers_url'),
    scrape_status: categoryScrapeStatusEnum('scrape_status').notNull().default('pending'),
    last_scraped_at: timestamp('last_scraped_at', { mode: 'string', withTimezone: true }),
    created_at: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    index('idx_amazon_categories_marketplace').on(t.marketplace),
    index('idx_amazon_categories_parent_id').on(t.parent_id),
    index('idx_amazon_categories_scrape_status').on(t.scrape_status),
])

// ── amazon_products ─────────────────────────────────────────────────────────

export const amazonProducts = pgTable('amazon_products', {
    asin: text('asin').primaryKey(),
    title: text('title'),
    brand: text('brand'),
    manufacturer: text('manufacturer'),
    price: real('price'),
    rating: real('rating'),
    review_count: integer('review_count'),
    main_image_url: text('main_image_url'),
    product_url: text('product_url'),
    product_type: text('product_type'),
    color: text('color'),
    model_number: text('model_number'),
    package_quantity: integer('package_quantity'),
    bullet_points: text('bullet_points').array(),
    browse_node_id: text('browse_node_id'),
    listing_date: date('listing_date'),
    // Dimensions
    item_length_cm: real('item_length_cm'),
    item_width_cm: real('item_width_cm'),
    item_height_cm: real('item_height_cm'),
    item_weight_kg: real('item_weight_kg'),
    pkg_length_cm: real('pkg_length_cm'),
    pkg_width_cm: real('pkg_width_cm'),
    pkg_height_cm: real('pkg_height_cm'),
    pkg_weight_kg: real('pkg_weight_kg'),
    // Fees
    fba_fee: real('fba_fee'),
    referral_fee: real('referral_fee'),
    embedding: text('embedding'),
    // Status
    scrape_status: productScrapeStatusEnum('scrape_status').notNull().default('scraped'),
    enriched_at: timestamp('enriched_at', { mode: 'string', withTimezone: true }),
    created_at: timestamp('created_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    index('idx_amazon_products_scrape_status').on(t.scrape_status),
    index('idx_amazon_products_updated_at').on(t.updated_at),
])

// ── product_category_ranks ──────────────────────────────────────────────────

export const productCategoryRanks = pgTable('product_category_ranks', {
    asin: text('asin').notNull().references(() => amazonProducts.asin),
    category_id: text('category_id').notNull().references(() => amazonCategories.id),
    rank: integer('rank').notNull(),
    rank_type: text('rank_type').notNull(),
    observed_at: timestamp('observed_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    primaryKey({ columns: [t.asin, t.category_id] }),
    index('idx_product_category_ranks_category_id').on(t.category_id),
    index('idx_product_category_ranks_observed_at').on(t.observed_at),
])

// ── amazon_keywords ─────────────────────────────────────────────────────────

export const amazonKeywords = pgTable('amazon_keywords', {
    id: uuid('id').primaryKey().defaultRandom(),
    keyword: text('keyword').notNull(),
    marketplace: text('marketplace').notNull().default('US'),
    total_results: integer('total_results'),
    unique_brands: integer('unique_brands'),
    last_searched_at: timestamp('last_searched_at', { mode: 'string', withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    uniqueIndex('idx_amazon_keywords_keyword_marketplace').on(t.keyword, t.marketplace),
])

// ── amazon_keyword_products ─────────────────────────────────────────────────

export const amazonKeywordProducts = pgTable('amazon_keyword_products', {
    keyword_id: uuid('keyword_id').notNull().references(() => amazonKeywords.id, { onDelete: 'cascade' }),
    asin: text('asin').notNull().references(() => amazonProducts.asin),
}, (t) => [
    primaryKey({ columns: [t.keyword_id, t.asin] }),
    index('idx_amazon_keyword_products_asin').on(t.asin),
])

// ── product_financials view ──────────────────────────────────────────────────
// One row per (asin, category) rank. Only products with price > 0.
// Full SQL + calibration notes: supabase/migrations/20260317000002_product_financials_view.sql

export const productFinancialsView = pgView('product_financials', {
    // Identity
    asin: text('asin'),
    category_id: text('category_id'),
    rank: integer('rank'),
    rank_type: text('rank_type'),
    category_depth: integer('category_depth'),
    category_path: text('category_path'),
    observed_at: timestamp('observed_at', { mode: 'string', withTimezone: true }),
    // Product snapshot
    title: text('title'),
    brand: text('brand'),
    product_type: text('product_type'),
    main_image_url: text('main_image_url'),
    price: real('price'),
    rating: real('rating'),
    review_count: integer('review_count'),
    // Fees
    fba_fee: real('fba_fee'),
    referral_fee: real('referral_fee'),
    total_amazon_fees: numeric('total_amazon_fees'),
    amazon_fee_pct: numeric('amazon_fee_pct'),
    net_per_unit: numeric('net_per_unit'),
    // Unit estimates
    monthly_units_bsr: integer('monthly_units_bsr'),
    monthly_units_review: integer('monthly_units_review'),
    monthly_units: integer('monthly_units'),
    // Revenue
    monthly_revenue: numeric('monthly_revenue'),
    monthly_net: numeric('monthly_net'),
    daily_velocity: numeric('daily_velocity'),
    // Blend weights (for tooltips)
    w_bsr: real('w_bsr'),
    w_review: real('w_review'),
    // Confidence
    confidence: text('confidence'),
    // Data quality
    product_type_mismatch: boolean('product_type_mismatch'),
    // Meta
    product_age_months: integer('product_age_months'),
    listing_date: date('listing_date'),
    review_rate_per_month: numeric('review_rate_per_month'),
    // Dimensions
    pkg_weight_kg: real('pkg_weight_kg'),
    pkg_length_cm: real('pkg_length_cm'),
    pkg_width_cm: real('pkg_width_cm'),
    pkg_height_cm: real('pkg_height_cm'),
}).as(sql`
with base as (
  select
    p.asin,
    pcr.category_id,
    pcr.rank,
    pcr.rank_type,
    pcr.observed_at,
    ac.depth                              as category_depth,
    ac.full_path                          as category_path,
    p.price,
    p.fba_fee,
    p.referral_fee,
    p.review_count,
    p.rating,
    p.title,
    p.brand,
    p.product_type,
    p.main_image_url,
    p.pkg_weight_kg,
    p.pkg_length_cm,
    p.pkg_width_cm,
    p.pkg_height_cm,
    p.listing_date,
    case
      when p.listing_date is not null
        then greatest(
          extract(year  from age(current_date, p.listing_date)) * 12
          + extract(month from age(current_date, p.listing_date)),
          1
        )::integer
      else null
    end                                   as product_age_months,
    case
      when p.fba_fee is not null and p.referral_fee is not null
        then round((p.price - p.fba_fee - p.referral_fee)::numeric, 2)
      else null
    end                                   as net_per_unit,
    case
      when p.fba_fee is not null and p.referral_fee is not null
        then round((p.fba_fee + p.referral_fee)::numeric, 2)
      else null
    end                                   as total_amazon_fees,
    case
      when p.fba_fee is not null and p.referral_fee is not null and p.price > 0
        then round(((p.fba_fee + p.referral_fee) / p.price * 100)::numeric, 1)
      else null
    end                                   as amazon_fee_pct,
    case
      when ac.depth <= 2 then 350000.0
      when ac.depth <= 4 then 120000.0
      when ac.depth <= 6 then  25000.0
      when ac.depth <= 8 then   4000.0
      else                        600.0
    end                                   as bsr_a,
    case
      when ac.depth <= 2 then 0.93
      when ac.depth <= 4 then 0.91
      when ac.depth <= 6 then 0.88
      when ac.depth <= 8 then 0.84
      else                    0.80
    end                                   as bsr_b,
    (
      p.product_type in (
        'SHIRT', 'APPAREL', 'TOPS', 'BLOUSE', 'SWEATER',
        'JACKET', 'COAT', 'DRESS', 'PANTS', 'SKIRT'
      )
      and (
        ac.full_path ilike '%swimwear%'
        or ac.full_path ilike '%bikini%'
        or ac.full_path ilike '%swimsuit%'
        or ac.full_path ilike '%swim%'
      )
    )                                     as product_type_mismatch
  from amazon_products p
  join product_category_ranks pcr on pcr.asin = p.asin
  join amazon_categories ac       on ac.id = pcr.category_id
  where p.price is not null
    and p.price > 0
    and pcr.rank > 0
),
estimates as (
  select
    b.*,
    round(b.bsr_a * power(b.rank::float, -b.bsr_b))::integer as monthly_units_bsr,
    case
      when b.product_age_months is not null
       and b.review_count is not null
       and b.review_count > 0
        then round(b.review_count::float / b.product_age_months / 0.02)::integer
      else null
    end                                   as monthly_units_review
  from base b
),
blended as (
  select
    e.*,
    case
      when e.monthly_units_review is null then 1.00
      when e.review_count < 20            then 0.95
      when e.rank > 5000                  then 0.45
      else                                     0.65
    end                                   as w_bsr,
    case
      when e.monthly_units_review is null then 0.00
      when e.review_count < 20            then 0.05
      when e.rank > 5000                  then 0.55
      else                                     0.35
    end                                   as w_review,
    case
      when e.fba_fee is not null
       and e.referral_fee is not null
       and e.review_count >= 100
       and e.rank <= 500
        then 'high'
      when e.fba_fee is not null
        or  e.referral_fee is not null
        or  coalesce(e.review_count, 0) >= 20
        then 'medium'
      else 'low'
    end                                   as confidence
  from estimates e
)
select
  b.asin,
  b.category_id,
  b.rank,
  b.rank_type,
  b.category_depth,
  b.category_path,
  b.observed_at,
  b.title,
  b.brand,
  b.product_type,
  b.main_image_url,
  b.price,
  b.rating,
  b.review_count,
  b.fba_fee,
  b.referral_fee,
  b.total_amazon_fees,
  b.amazon_fee_pct,
  b.net_per_unit,
  b.monthly_units_bsr,
  b.monthly_units_review,
  round(
    b.w_bsr * b.monthly_units_bsr
    + b.w_review * coalesce(b.monthly_units_review, 0)
  )::integer                              as monthly_units,
  round(
    (b.w_bsr * b.monthly_units_bsr + b.w_review * coalesce(b.monthly_units_review, 0))
    * b.price
  )::numeric(12,2)                        as monthly_revenue,
  case
    when b.net_per_unit is not null
      then round(
        (b.w_bsr * b.monthly_units_bsr + b.w_review * coalesce(b.monthly_units_review, 0))
        * b.net_per_unit
      )::numeric(12,2)
    else null
  end                                     as monthly_net,
  round(
    (b.w_bsr * b.monthly_units_bsr + b.w_review * coalesce(b.monthly_units_review, 0))
    / 30.0
  , 1)                                    as daily_velocity,
  b.w_bsr,
  b.w_review,
  b.confidence,
  b.product_type_mismatch,
  b.product_age_months,
  b.listing_date,
  case
    when b.product_age_months is not null
     and b.review_count is not null
     and b.review_count > 0
      then round(b.review_count::numeric / b.product_age_months, 2)
    else null
  end                                     as review_rate_per_month,
  b.pkg_weight_kg,
  b.pkg_length_cm,
  b.pkg_width_cm,
  b.pkg_height_cm
from blended b
`)
