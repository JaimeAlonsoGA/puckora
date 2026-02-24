-- ============================================================
-- 00003_product_catalog.sql
-- Global shared product cache — the most important design decision.
-- Every user looking up ASIN X in marketplace M reads from and writes
-- to these tables. The scraper populates them; users only point to them.
-- Time-series history is partitioned by year for efficient pruning.
-- ============================================================

-- ── Core product record ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asin         TEXT NOT NULL,
  marketplace  marketplace NOT NULL DEFAULT 'US',

  -- Identity
  title        TEXT NOT NULL,
  brand        TEXT,
  main_image_url TEXT,
  image_urls   TEXT[] DEFAULT '{}',

  -- Classification
  category_id  TEXT REFERENCES amazon_categories(id) ON DELETE SET NULL,
  category_path TEXT,  -- denormalised for fast display without JOIN

  -- Pricing
  price        NUMERIC(10,2),
  price_min    NUMERIC(10,2),  -- lowest listing price
  price_max    NUMERIC(10,2),  -- highest listing price
  currency     TEXT NOT NULL DEFAULT 'USD',

  -- Ratings
  rating       NUMERIC(3,2),
  review_count INT,

  -- Ranking
  bsr          INT,
  bsr_category TEXT,   -- exact BSR category string from Amazon

  -- Sales estimates (from Keepa / SP-API / modelled)
  monthly_sales_est   INT,
  monthly_revenue_est NUMERIC(12,2),

  -- Physical dimensions (for FBA fee calculation & supplier search)
  weight_kg    NUMERIC(8,3),
  dimensions_cm JSONB,   -- { l: number, w: number, h: number }
  volume_cm3   NUMERIC(12,2) GENERATED ALWAYS AS (
    COALESCE((dimensions_cm->>'l')::NUMERIC, 0) *
    COALESCE((dimensions_cm->>'w')::NUMERIC, 0) *
    COALESCE((dimensions_cm->>'h')::NUMERIC, 0)
  ) STORED,

  -- Listing characteristics
  is_fba              BOOLEAN,
  is_sold_by_amazon   BOOLEAN,
  seller_count        INT,
  fba_seller_count    INT,

  -- Signal scores (computed by Python analytics layer)
  competition_level    competition_level,
  opportunity_score    NUMERIC(5,2) CHECK (opportunity_score BETWEEN 0 AND 100),
  demand_score         NUMERIC(5,2) CHECK (demand_score BETWEEN 0 AND 100),
  trend_score          NUMERIC(5,2) CHECK (trend_score BETWEEN 0 AND 100),  -- rising / falling

  -- Safety flags
  is_adult    BOOLEAN NOT NULL DEFAULT FALSE,
  is_hazmat   BOOLEAN NOT NULL DEFAULT FALSE,
  is_oversized BOOLEAN NOT NULL DEFAULT FALSE,

  -- Raw scraper payload (full response kept for reprocessing without re-scrape)
  raw_data    JSONB,

  -- Freshness management (cron-driven refresh queue)
  scraped_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  needs_refresh_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(asin, marketplace)
);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Product extended detail (scraped on demand — heavier, less cached) ──
CREATE TABLE IF NOT EXISTS product_details (
  product_id       UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,

  description      TEXT,
  bullet_points    TEXT[] DEFAULT '{}',
  parent_asin      TEXT,

  -- Review breakdown
  review_distribution JSONB,   -- { "1": 12, "2": 8, "3": 45, "4": 200, "5": 900 }
  -- Seller breakdown
  seller_breakdown JSONB,      -- { fba_count, fbm_count, amazon_direct_count, top3_share_pct }
  -- Variations (colour/size matrix)
  variations       JSONB,
  -- Frequently bought-with ASINs
  bought_together  TEXT[] DEFAULT '{}',
  -- Extracted keywords from title + bullets (used for supplier search)
  keywords         TEXT[] DEFAULT '{}',
  -- A+ content present
  has_aplus        BOOLEAN NOT NULL DEFAULT FALSE,

  scraped_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_product_details_updated_at
  BEFORE UPDATE ON product_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Product time-series history (partitioned by year) ─────────
-- Snapshots are taken automatically by trigger when products row is updated
-- and when the scraper refreshes an ASIN.
CREATE TABLE IF NOT EXISTS product_history (
  id              UUID NOT NULL DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  bsr             INT,
  price           NUMERIC(10,2),
  rating          NUMERIC(3,2),
  review_count    INT,
  monthly_sales_est INT,
  seller_count    INT,
  opportunity_score NUMERIC(5,2),

  snapshot_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (snapshot_at);

-- Initial partitions (extend yearly by the ops cron job)
CREATE TABLE IF NOT EXISTS product_history_2025
  PARTITION OF product_history
  FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE IF NOT EXISTS product_history_2026
  PARTITION OF product_history
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE TABLE IF NOT EXISTS product_history_2027
  PARTITION OF product_history
  FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

CREATE TABLE IF NOT EXISTS product_history_future
  PARTITION OF product_history
  FOR VALUES FROM ('2028-01-01') TO ('2099-01-01');

-- ── Indexes ───────────────────────────────────────────────────

-- The most common lookup: ASIN + marketplace
CREATE INDEX IF NOT EXISTS idx_products_asin_mkt
  ON products(asin, marketplace);

-- Category browsing
CREATE INDEX IF NOT EXISTS idx_products_category
  ON products(category_id)
  WHERE category_id IS NOT NULL;

-- BSR leaderboard queries
CREATE INDEX IF NOT EXISTS idx_products_bsr
  ON products(marketplace, bsr ASC NULLS LAST)
  WHERE bsr IS NOT NULL;

-- Opportunity module: ranked by score
CREATE INDEX IF NOT EXISTS idx_products_opportunity
  ON products(marketplace, opportunity_score DESC NULLS LAST)
  WHERE opportunity_score IS NOT NULL;

-- Refresh queue: find stale products for background refresh
CREATE INDEX IF NOT EXISTS idx_products_refresh_queue
  ON products(needs_refresh_at ASC);

-- Full-text search on title (trigram for partial matching)
CREATE INDEX IF NOT EXISTS idx_products_title_trgm
  ON products USING GIN (title gin_trgm_ops);

-- Brand filtering
CREATE INDEX IF NOT EXISTS idx_products_brand
  ON products(brand)
  WHERE brand IS NOT NULL;

-- History time-series queries per product
CREATE INDEX IF NOT EXISTS idx_product_history_product_at
  ON product_history(product_id, snapshot_at DESC);

-- ── Trigger: auto-snapshot when scraped data changes ──────────
CREATE OR REPLACE FUNCTION snapshot_product_on_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Only write a snapshot when meaningful metrics actually changed
  IF (OLD.bsr              IS DISTINCT FROM NEW.bsr)
  OR (OLD.price            IS DISTINCT FROM NEW.price)
  OR (OLD.rating           IS DISTINCT FROM NEW.rating)
  OR (OLD.review_count     IS DISTINCT FROM NEW.review_count)
  OR (OLD.monthly_sales_est IS DISTINCT FROM NEW.monthly_sales_est)
  OR (OLD.opportunity_score IS DISTINCT FROM NEW.opportunity_score)
  THEN
    INSERT INTO product_history (
      product_id, bsr, price, rating, review_count,
      monthly_sales_est, seller_count, opportunity_score
    ) VALUES (
      NEW.id, NEW.bsr, NEW.price, NEW.rating, NEW.review_count,
      NEW.monthly_sales_est, NEW.seller_count, NEW.opportunity_score
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_product_snapshot
  AFTER UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION snapshot_product_on_update();

-- ── Refresh queue helper ──────────────────────────────────────
-- The background refresh edge function calls this to claim a batch
-- atomically (SKIP LOCKED prevents double-processing).
CREATE OR REPLACE FUNCTION claim_products_for_refresh(p_batch_size INT DEFAULT 50)
RETURNS TABLE (id UUID, asin TEXT, marketplace marketplace)
LANGUAGE sql AS $$
  SELECT p.id, p.asin, p.marketplace
  FROM products p
  WHERE p.needs_refresh_at <= NOW()
  ORDER BY p.needs_refresh_at ASC
  LIMIT p_batch_size
  FOR UPDATE SKIP LOCKED;
$$;
