-- Migration: drop FK constraint on parent_asin
--
-- Rationale: the FK (references amazon_products(asin)) blocks every upsert where
-- the parent ASIN has not yet been scraped/enriched, which is the common case.
-- parent_asin is intentionally a soft reference (plain text) so it can be stored
-- regardless of whether the parent row exists in the table.

alter table public.amazon_products
drop constraint if exists amazon_products_parent_asin_fkey;