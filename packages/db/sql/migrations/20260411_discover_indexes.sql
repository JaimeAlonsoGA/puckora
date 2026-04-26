-- Discover cleanup after moving financial computation to the application layer.
--
-- The old product_financials view and BSR-oriented discover indexes are no
-- longer used. Discover now queries amazon_products directly and orders by the
-- high-confidence bought_past_month × price revenue signal.

DROP VIEW IF EXISTS product_financials;

DROP INDEX CONCURRENTLY IF EXISTS product_category_ranks_bs_canonical_idx;
DROP INDEX CONCURRENTLY IF EXISTS product_category_ranks_bsr_top300k_idx;
DROP INDEX CONCURRENTLY IF EXISTS idx_amazon_products_price;
DROP INDEX CONCURRENTLY IF EXISTS idx_amazon_products_rating;
DROP INDEX CONCURRENTLY IF EXISTS idx_amazon_products_review_count;

CREATE INDEX CONCURRENTLY IF NOT EXISTS amazon_products_discover_bpm_revenue_idx
ON amazon_products (((bought_past_month * price)) DESC)
WHERE
    bought_past_month IS NOT NULL
    AND bought_past_month > 0
    AND price IS NOT NULL
    AND price > 0;