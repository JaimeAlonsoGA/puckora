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
  text,
  integer,
  boolean,
  real,
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
  // Variation hierarchy
  parent_asin: text('parent_asin'),
  // Demand signals (scraped from Amazon search page HTML)
  bought_past_month: integer('bought_past_month'),
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

