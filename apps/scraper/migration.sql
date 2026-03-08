-- ─────────────────────────────────────────────────────────────────────────────
-- Puckora — Core Schema
-- Run in Supabase SQL editor (Dashboard → SQL Editor → New Query)
-- Extensions required: pg_trgm, vector
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pg_trgm;
create extension if not exists vector;


-- ─── AMAZON CATEGORIES ───────────────────────────────────────────────────────
-- Populated once by the import script (import-categories.ts).
-- PK = Amazon browse node ID. No UUID.

create table public.amazon_categories (
  id              text primary key,               -- Amazon browse node ID e.g. "404809011"
  name            text        not null,           -- leaf name e.g. "Inner Tubes"
  full_path       text        not null,           -- "Automotive > … > Inner Tubes"
  breadcrumb      text[]      not null,
  depth           integer     not null,
  parent_id       text        references public.amazon_categories(id) on delete set null,
  is_leaf         boolean     not null default false,
  marketplace     text        not null default 'US',
  bestsellers_url text,

  -- Scrape lifecycle
  scrape_status   text        not null default 'pending',  -- 'pending'|'scraped'|'failed'
  last_scraped_at timestamptz,

  created_at      timestamptz not null default now()
);

create index on public.amazon_categories (parent_id);
create index on public.amazon_categories (marketplace, depth);
create index on public.amazon_categories (is_leaf)        where is_leaf = true;
create index on public.amazon_categories (scrape_status);
create index on public.amazon_categories (last_scraped_at nulls first);
create index on public.amazon_categories using gin (name      gin_trgm_ops);
create index on public.amazon_categories using gin (full_path gin_trgm_ops);

alter table public.amazon_categories enable row level security;
create policy "Public read" on public.amazon_categories for select using (true);


-- ─── AMAZON PRODUCTS ─────────────────────────────────────────────────────────
-- One row per ASIN, ever. PK = ASIN (natural key).
-- Scraped fields populated first pass. SP-API fields populated second pass.

create table public.amazon_products (
  asin              text primary key,

  -- ── From scraper (page parse) ──────────────────────────────────────────────
  price             numeric(10,2),         -- buy box / listed price, USD
  rating            numeric(3,2),          -- e.g. 4.5
  review_count      integer,
  product_url       text,

  -- ── From SP-API getCatalogItem ─────────────────────────────────────────────
  title             text,
  brand             text,
  manufacturer      text,
  model_number      text,
  package_quantity  integer,
  color             text,
  main_image_url    text,                  -- MAIN variant, highest resolution
  bullet_points     text[]      default '{}',
  product_type      text,                  -- Amazon product type e.g. "MOTORCYCLE_TIRE"
  browse_node_id    text,                  -- Amazon's primary classification for this ASIN

  -- Dimensions — all stored in metric, converted at write time
  -- Item = the product itself, Package = as shipped
  item_length_cm    numeric(8,2),
  item_width_cm     numeric(8,2),
  item_height_cm    numeric(8,2),
  item_weight_kg    numeric(8,4),
  pkg_length_cm     numeric(8,2),
  pkg_width_cm      numeric(8,2),
  pkg_height_cm     numeric(8,2),
  pkg_weight_kg     numeric(8,4),

  -- ── From SP-API getMyFeesEstimates ───────────────────────────────────────────────
  fba_fee numeric(8,2),         -- FBAPerUnitFulfillmentFee
  referral_fee        numeric(8,2),         -- ReferralFee (category % of sale price)

  -- ── Listing date from SP-API summaries.listingDate ───────────────────────
  listing_date        date,                 -- date product first appeared on Amazon

  -- ── Enrichment lifecycle ───────────────────────────────────────────────────
  scrape_status     text        not null default 'scraped',  -- 'scraped'|'enriched'|'enrichment_failed'
  enriched_at       timestamptz,

  -- ── Embedding — populated by separate job after full run ──────────────────
  -- Uses bullet_points + title as input. Leave null until you run the job.
  embedding         vector(1536),

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index on public.amazon_products (scrape_status);
create index on public.amazon_products (brand);
create index on public.amazon_products (product_type);
create index on public.amazon_products (browse_node_id);
create index on public.amazon_products (price);
create index on public.amazon_products (review_count desc);
create index on public.amazon_products (rating desc);
create index on public.amazon_products (referral_fee);
-- Uncomment after >1000 rows with embeddings populated:
-- create index on public.amazon_products using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_amazon_products_updated_at
  before update on public.amazon_products
  for each row execute function public.set_updated_at();

alter table public.amazon_products enable row level security;
create policy "Public read" on public.amazon_products for select using (true);


-- ─── PRODUCT CATEGORY RANKS ──────────────────────────────────────────────────
-- The graph edges. One row per (ASIN, category).
-- PK (asin, category_id) — on re-scrape, rank and observed_at are updated in place.
--
-- rank_type:
--   'best_seller' — product appeared on Amazon Best Sellers page (scraped)
--   'organic'     — SP-API salesRanks revealed this category membership

create table public.product_category_ranks (
  asin          text        not null references public.amazon_products(asin)    on delete cascade,
  category_id   text        not null references public.amazon_categories(id)    on delete cascade,
  rank          integer     not null,
  rank_type     text        not null,   -- 'best_seller' | 'organic'
  observed_at   timestamptz not null default now(),

  primary key (asin, category_id)
);

create index on public.product_category_ranks (category_id);
create index on public.product_category_ranks (asin);
create index on public.product_category_ranks (rank_type);
create index on public.product_category_ranks (rank);
create index on public.product_category_ranks (observed_at desc);

alter table public.product_category_ranks enable row level security;
create policy "Public read" on public.product_category_ranks for select using (true);


-- ─── USEFUL VIEWS ────────────────────────────────────────────────────────────

-- Products with their best-seller rank in a specific category
-- Usage: SELECT * FROM products_in_category WHERE category_id = '404809011' ORDER BY rank
create or replace view public.products_in_category as
select
  r.category_id,
  r.rank,
  r.rank_type,
  r.observed_at,
  p.*
from public.product_category_ranks r
join public.amazon_products p on p.asin = r.asin;

-- Scrape progress dashboard — run this anytime during a scrape run
create or replace view public.scrape_progress as
select
  (select count(*) from public.amazon_categories)                                        as total_categories,
  (select count(*) from public.amazon_categories where scrape_status = 'scraped')        as scraped,
  (select count(*) from public.amazon_categories where scrape_status = 'failed')         as failed,
  (select count(*) from public.amazon_categories where scrape_status = 'pending')        as pending,
  (select count(*) from public.amazon_products)                                          as total_products,
  (select count(*) from public.amazon_products   where scrape_status = 'enriched')       as enriched,
  (select count(*) from public.amazon_products   where scrape_status = 'enrichment_failed') as enrichment_failed,
  (select count(*) from public.product_category_ranks)                                   as total_edges,
  (select count(*) from public.product_category_ranks where rank_type = 'best_seller')   as best_seller_edges,
  (select count(*) from public.product_category_ranks where rank_type = 'organic')       as organic_edges;
