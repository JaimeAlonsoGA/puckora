-- ============================================================
-- 00004_supplier_catalog.sql
-- Global Alibaba supplier + product cache, and the crucial
-- Amazon → Alibaba bridge (product_supplier_matches).
-- Separating supplier data from user saves prevents re-scraping
-- the same supplier profile for every user who views it.
-- ============================================================

-- ── Global supplier cache ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alibaba_id       TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  url              TEXT,
  country          TEXT,
  years_on_platform INT,

  -- Trust signals
  is_verified         BOOLEAN NOT NULL DEFAULT FALSE,
  is_trade_assurance  BOOLEAN NOT NULL DEFAULT FALSE,
  is_gold_supplier    BOOLEAN NOT NULL DEFAULT FALSE,
  response_rate_pct   NUMERIC(5,2),
  response_time_hours INT,
  transaction_level   TEXT,    -- e.g. 'Diamond', 'Gold', 'None'

  -- Profile
  main_categories      TEXT[] DEFAULT '{}',
  main_products        TEXT[] DEFAULT '{}',
  total_reviews        INT,
  avg_rating           NUMERIC(3,2),
  annual_revenue_usd   BIGINT,
  employees_count      INT,
  certifications       TEXT[] DEFAULT '{}',

  -- Matching metadata (used by semantic bridge)
  embedding_keywords   TEXT[] DEFAULT '{}',  -- extracted for supplier→product matching

  raw_data         JSONB,

  scraped_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  needs_refresh_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Individual product listings from suppliers ────────────────
CREATE TABLE IF NOT EXISTS supplier_products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id         UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  alibaba_product_id  TEXT NOT NULL UNIQUE,
  title               TEXT NOT NULL,
  image_url           TEXT,

  -- Pricing
  price_min    NUMERIC(10,2),
  price_max    NUMERIC(10,2),
  currency     TEXT NOT NULL DEFAULT 'USD',
  moq          INT NOT NULL DEFAULT 1,
  unit         TEXT NOT NULL DEFAULT 'piece',
  -- MOQ price breakpoints: [{ min_qty, max_qty, price_per_unit }]
  price_tiers  JSONB,

  -- Logistics
  is_customizable   BOOLEAN NOT NULL DEFAULT FALSE,
  shipping_options  TEXT[] DEFAULT '{}',
  lead_time_days    INT,

  -- Classification (for matching to Amazon products)
  categories   TEXT[] DEFAULT '{}',
  keywords     TEXT[] DEFAULT '{}',

  raw_data     JSONB,
  scraped_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_supplier_products_updated_at
  BEFORE UPDATE ON supplier_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Amazon → Alibaba product bridge ──────────────────────────
-- This table is the core of the "supplier search" feature.
-- Python backend computes matches using embedding similarity and
-- keyword overlap; service role writes matches here.
-- Frontend queries: given product_id, find best supplier candidates.
CREATE TABLE IF NOT EXISTS product_supplier_matches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_product_id UUID NOT NULL REFERENCES supplier_products(id) ON DELETE CASCADE,

  match_score         NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (match_score BETWEEN 0 AND 100),
  match_method        match_method NOT NULL DEFAULT 'semantic',
  match_signals       JSONB,  -- { keyword_overlap: 0.8, embedding_similarity: 0.87 }

  -- Verified by a user (manual confirmation)
  verified_by_user_id UUID,   -- references profiles(id) — set FK in migration 05
  verified_at         TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(product_id, supplier_product_id)
);

CREATE TRIGGER trg_product_supplier_matches_updated_at
  BEFORE UPDATE ON product_supplier_matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_suppliers_alibaba_id
  ON suppliers(alibaba_id);

CREATE INDEX IF NOT EXISTS idx_suppliers_country
  ON suppliers(country);

CREATE INDEX IF NOT EXISTS idx_suppliers_verified
  ON suppliers(is_verified, is_trade_assurance);

CREATE INDEX IF NOT EXISTS idx_suppliers_refresh_queue
  ON suppliers(needs_refresh_at ASC);

CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier
  ON supplier_products(supplier_id);

CREATE INDEX IF NOT EXISTS idx_supplier_products_title_trgm
  ON supplier_products USING GIN (title gin_trgm_ops);

-- The key query: given an Amazon product, find best supplier candidates
CREATE INDEX IF NOT EXISTS idx_psm_product_score
  ON product_supplier_matches(product_id, match_score DESC);

CREATE INDEX IF NOT EXISTS idx_psm_supplier_product
  ON product_supplier_matches(supplier_product_id);
