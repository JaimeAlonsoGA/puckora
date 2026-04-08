-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add parent_asin to amazon_products
-- 2026-04-08
--
-- Rationale:
--   SP-API catalog/2022-04-01 'relationships' includedData returns the parent
--   ASIN when the fetched ASIN is a variation child (type = 'VARIATION').
--   Storing parent_asin enables:
--     - variation_count: COUNT of amazon_products sharing same parent_asin
--     - deduplication: group child variants under one parent in results
--
-- Idempotent: uses IF NOT EXISTS / IF EXISTS guards throughout.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.amazon_products
    add column if not exists parent_asin text references public.amazon_products(asin) on delete set null;

create index if not exists idx_amazon_products_parent_asin
    on public.amazon_products (parent_asin)
    where parent_asin is not null;
