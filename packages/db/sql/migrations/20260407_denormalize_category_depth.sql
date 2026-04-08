-- Migration: 20260407_denormalize_category_depth
--
-- PURPOSE:
--   Add a denormalized `category_depth` column to product_category_ranks so the
--   canonical_bsr lookup in product_financials can run as an index-only scan
--   instead of joining amazon_categories at query time.
--
--   Before: canonical_bsr CTE joins 2.26M best_seller rows × amazon_categories
--           and does a full sort → multi-second scan on every product_financials query.
--   After:  index-only DISTINCT ON (asin) with ORDER BY (asin, category_depth, rank)
--           on the partial composite index → sub-millisecond per-ASIN lookups.
--
-- STEPS:
--   1. Add column
--   2. Back-fill from amazon_categories (one-time, ~3M rows)
--   3. Create partial composite index for canonical_bsr lookups
--   4. Create trigger to keep category_depth in sync on future inserts/updates

-- ── 1. Add column ────────────────────────────────────────────────────────────
ALTER TABLE public.product_category_ranks
  ADD COLUMN IF NOT EXISTS category_depth smallint;

-- ── 2. Back-fill ─────────────────────────────────────────────────────────────
UPDATE public.product_category_ranks pcr
SET    category_depth = ac.depth
FROM   public.amazon_categories ac
WHERE  ac.id = pcr.category_id
  AND  pcr.category_depth IS NULL;

-- ── 3. Partial composite index (the critical performance win) ─────────────────
-- Covers: DISTINCT ON (asin) ORDER BY asin, category_depth ASC, rank DESC
-- for best_seller rows only. Index-only scan: no table access needed.
CREATE INDEX CONCURRENTLY IF NOT EXISTS product_category_ranks_bs_canonical_idx
  ON public.product_category_ranks (asin, category_depth ASC, rank DESC)
  WHERE rank_type = 'best_seller';

-- ── 4. Trigger to auto-fill on insert/update ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.pcr_set_category_depth()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.category_depth IS NULL THEN
    SELECT depth INTO NEW.category_depth
    FROM public.amazon_categories
    WHERE id = NEW.category_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pcr_category_depth_trg ON public.product_category_ranks;
CREATE TRIGGER pcr_category_depth_trg
  BEFORE INSERT OR UPDATE OF category_id ON public.product_category_ranks
  FOR EACH ROW EXECUTE FUNCTION public.pcr_set_category_depth();
