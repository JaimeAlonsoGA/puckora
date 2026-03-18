-- ─────────────────────────────────────────────────────────────────────────────
-- Supabase cleanup migration — post Fly.io Postgres migration
--
-- These tables, views, functions, and enums have been moved to Fly.io Postgres
-- and are no longer needed in Supabase.
--
-- Reference SQL for the Fly-owned product_financials view now lives at:
--   packages/db/sql/product_financials_view.sql
-- It must not remain in supabase/migrations once this cleanup path is adopted.
--
-- WHEN TO RUN:
--   Only after you have:
--     1. Provisioned and verified the Fly.io Postgres instance
--     2. Migrated all data (scripts/migrate-to-flyio.sh) and confirmed row counts
--     3. Deployed the new web app (all services pointing to createFlyioDb())
--     4. Verified the scraper runs against DATABASE_URL, not Supabase
--     5. Run `npm run tsc --noEmit` on both apps with zero errors
--
-- WHAT STAYS in Supabase (NOT touched by this migration):
--   Tables : users, scrape_jobs
--   Views  : scrape_progress (rebuilt below without product references)
--   Enums  : scrape_executor, scrape_job_status, scrape_job_type
--   Auth   : auth.users, all Supabase auth machinery
--
-- WHAT IS REMOVED (moved to Fly.io):
--   Tables : amazon_categories, amazon_products, product_category_ranks,
--            amazon_keywords, amazon_keyword_products,
--            gs_categories, gs_suppliers, gs_products
--   Views  : product_financials, scrape_progress (old version with product joins)
--   Enums  : category_scrape_status, product_scrape_status,
--            gs_category_scrape_status, gs_scrape_status
--   Funcs  : show_limit, show_trgm  (pg_trgm helpers — not needed server-side)
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. Drop views that reference moved tables ─────────────────────────────────
-- product_financials joins amazon_products + product_category_ranks + amazon_categories.
-- It is now defined as a .existing() view in the Drizzle schema on Fly.io.
DROP VIEW IF EXISTS public.product_financials CASCADE;

-- scrape_progress references amazon_categories and amazon_products.
-- A trimmed version is recreated below (scrape_jobs row counts only).
DROP VIEW IF EXISTS public.scrape_progress CASCADE;

-- ── 2. Drop moved tables (order respects FK deps) ─────────────────────────────

-- GS tables (no cross-references to Amazon tables)
DROP TABLE IF EXISTS public.gs_products      CASCADE;
DROP TABLE IF EXISTS public.gs_suppliers     CASCADE;
DROP TABLE IF EXISTS public.gs_categories    CASCADE;

-- Amazon keyword tables (reference amazon_products / amazon_keywords)
DROP TABLE IF EXISTS public.amazon_keyword_products CASCADE;
DROP TABLE IF EXISTS public.amazon_keywords         CASCADE;

-- Amazon rank/product/category tables
DROP TABLE IF EXISTS public.product_category_ranks CASCADE;
DROP TABLE IF EXISTS public.amazon_products        CASCADE;
DROP TABLE IF EXISTS public.amazon_categories      CASCADE;

-- ── 3. Drop moved enums ───────────────────────────────────────────────────────
-- These enums were only used by the moved tables.  Supabase requires no dependent
-- columns exist before an enum can be dropped.
DROP TYPE IF EXISTS public.category_scrape_status;
DROP TYPE IF EXISTS public.product_scrape_status;
DROP TYPE IF EXISTS public.gs_category_scrape_status;
DROP TYPE IF EXISTS public.gs_scrape_status;

-- ── 4. Drop pg_trgm helper functions (no longer needed in Supabase) ──────────
-- search_categories RPC was replaced by an ilike() query in the web app
-- (services/market.ts).  show_limit / show_trgm are diagnostic helpers.
DROP FUNCTION IF EXISTS public.show_limit();
DROP FUNCTION IF EXISTS public.show_trgm(text);
DROP FUNCTION IF EXISTS public.search_categories(text, text, integer);

-- ── 5. Recreate scrape_progress as a lightweight Supabase-only view ───────────
-- The old version joined to amazon_categories / amazon_products which no longer
-- exist here.  This slimmed-down version only counts scrape_jobs by status,
-- which is all the Supabase side needs for the dashboard realtime indicator.
CREATE OR REPLACE VIEW public.scrape_progress AS
SELECT
    COUNT(*)                                              AS total_jobs,
    COUNT(*) FILTER (WHERE status = 'pending')            AS pending,
    COUNT(*) FILTER (WHERE status = 'claimed')            AS claimed,
    COUNT(*) FILTER (WHERE status = 'running')            AS running,
    COUNT(*) FILTER (WHERE status = 'done')               AS done,
    COUNT(*) FILTER (WHERE status = 'failed')             AS failed
FROM public.scrape_jobs;

-- Existing RLS on scrape_jobs already controls who can query this view.

DROP VIEW IF EXISTS public.scrape_progress CASCADE;
COMMIT;
