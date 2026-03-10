-- ---------------------------------------------------------------------------
-- 0003_scrape_enums
--
-- Converts the domain string columns that were stored as plain `text` into
-- typed Postgres enums. This gives the DB the same constraint enforcement that
-- the TypeScript constants (SCRAPE_JOB_STATUS, CATEGORY_SCRAPE_STATUS, etc.)
-- provide at the application level.
--
-- Enum values MUST stay in sync with the constant objects defined in:
--   packages/scraper-core/src/schemas/job.ts
--
-- Migration is safe to apply to empty tables OR tables with existing rows that
-- already contain only valid enum values. A data-fix step normalises the
-- known historical bug ('processing' → 'running' on scrape_jobs.status).
-- ---------------------------------------------------------------------------

-- ─── 1. CREATE ENUM TYPES ────────────────────────────────────────────────────

create type public.scrape_job_type as enum (
    'amazon_search',
    'amazon_product',
    'alibaba_search'
);

create type public.scrape_job_status as enum (
    'pending',
    'claimed',
    'running',
    'done',
    'failed'
);

create type public.scrape_executor as enum (
    'extension',
    'agent'
);

create type public.product_scrape_status as enum (
    'scraped',
    'enriched',
    'enrichment_failed'
);

create type public.category_scrape_status as enum (
    'pending',
    'scraped',
    'failed'
);

-- ─── 2. DROP DEPENDENT VIEWS ───────────────────────────────────────────────
-- scrape_progress references amazon_categories.scrape_status and
-- amazon_products.scrape_status — Postgres blocks ALTER COLUMN TYPE while any
-- view depends on those columns. Drop now, recreate at end of migration.

drop view if exists public.scrape_progress;

-- ─── 3. DATA FIX: normalise historical bad values ────────────────────────────
-- The web app briefly wrote 'processing' instead of 'running' to scrape_jobs.
-- Fix those rows so the USING cast below doesn't error.

update public.scrape_jobs
    set status = 'running'
    where status = 'processing';

-- ─── 4. ALTER scrape_jobs ────────────────────────────────────────────────────
-- Drop the default before altering the column type; re-add it afterwards.

alter table public.scrape_jobs
    alter column status drop default;

alter table public.scrape_jobs
    alter column type     type public.scrape_job_type
                          using type::public.scrape_job_type,
    alter column status   type public.scrape_job_status
                          using status::public.scrape_job_status,
    alter column executor type public.scrape_executor
                          using executor::public.scrape_executor;

-- Restore the default now that the column type is the enum.
alter table public.scrape_jobs
    alter column status set default 'pending'::public.scrape_job_status;

-- ─── 5. ALTER amazon_products ────────────────────────────────────────────────
-- amazon_products.scrape_status has DEFAULT 'scraped' — must drop before altering.

alter table public.amazon_products
    alter column scrape_status drop default;

alter table public.amazon_products
    alter column scrape_status type public.product_scrape_status
                               using scrape_status::public.product_scrape_status;

alter table public.amazon_products
    alter column scrape_status set default 'scraped'::public.product_scrape_status;

-- ─── 6. ALTER amazon_categories ──────────────────────────────────────────────
-- amazon_categories.scrape_status has DEFAULT 'pending' — must drop before altering.

alter table public.amazon_categories
    alter column scrape_status drop default;

alter table public.amazon_categories
    alter column scrape_status type public.category_scrape_status
                               using scrape_status::public.category_scrape_status;

alter table public.amazon_categories
    alter column scrape_status set default 'pending'::public.category_scrape_status;

-- ─── 7. RECREATE DEPENDENT VIEWS ─────────────────────────────────────────────
-- Recreate scrape_progress now that the column types are enums.
-- The query body is identical — enum values are comparable to string literals
-- in Postgres so no SQL changes are required.

create or replace view public.scrape_progress as
select
  (select count(*) from public.amazon_categories)                                               as total_categories,
  (select count(*) from public.amazon_categories where scrape_status = 'scraped')               as scraped,
  (select count(*) from public.amazon_categories where scrape_status = 'failed')                as failed,
  (select count(*) from public.amazon_categories where scrape_status = 'pending')               as pending,
  (select count(*) from public.amazon_products)                                                 as total_products,
  (select count(*) from public.amazon_products   where scrape_status = 'enriched')              as enriched,
  (select count(*) from public.amazon_products   where scrape_status = 'enrichment_failed')     as enrichment_failed,
  (select count(*) from public.product_category_ranks)                                          as total_edges,
  (select count(*) from public.product_category_ranks where rank_type = 'best_seller')          as best_seller_edges,
  (select count(*) from public.product_category_ranks where rank_type = 'organic')              as organic_edges;
