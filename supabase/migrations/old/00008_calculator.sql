-- ============================================================
-- 00008_calculator.sql
-- Cost calculator runs, saved templates, and the FBA fee cache
-- that prevents repeated SP-API calls for the same product.
-- ============================================================

-- ── FBA fee cache ─────────────────────────────────────────────
-- Populated by the SP-API edge function and/or the Python scraper.
-- Keyed by ASIN when available; falls back to weight + dimensions.
CREATE TABLE IF NOT EXISTS fba_fees_cache (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity: prefer ASIN lookup; dimension-based is fallback
  asin            TEXT,
  marketplace     marketplace NOT NULL DEFAULT 'US',
  category_id     TEXT REFERENCES amazon_categories(id) ON DELETE SET NULL,

  -- Physical dimensions (weight-based fees)
  weight_kg       NUMERIC(8,3),
  dimensions_cm   JSONB,   -- { l, w, h }
  is_oversize     BOOLEAN NOT NULL DEFAULT FALSE,
  is_hazmat       BOOLEAN NOT NULL DEFAULT FALSE,

  -- Fee values
  fulfillment_fee       NUMERIC(10,2),
  referral_fee_pct      NUMERIC(5,2),
  min_referral_fee      NUMERIC(8,2),
  monthly_storage_fee   NUMERIC(10,2),   -- per cubic foot / per unit
  long_term_storage_fee NUMERIC(10,2),   -- 365-day rate
  closing_fee           NUMERIC(8,2),    -- for media categories

  -- Source of truth
  source       TEXT NOT NULL DEFAULT 'calculated',  -- 'sp_api' | 'calculated' | 'manual'
  fee_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(asin, marketplace)
);

CREATE INDEX IF NOT EXISTS idx_fba_fees_asin
  ON fba_fees_cache(asin, marketplace)
  WHERE asin IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fba_fees_expiry
  ON fba_fees_cache(expires_at);

-- ── Cost calculation runs ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS cost_calculations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Optional links to global catalog records
  product_id           UUID REFERENCES products(id) ON DELETE SET NULL,
  supplier_product_id  UUID REFERENCES supplier_products(id) ON DELETE SET NULL,

  -- Display name (auto-generated or user-set)
  name         TEXT,

  -- Full input/output preserved for re-calculation without data loss
  input        JSONB NOT NULL,
  result       JSONB NOT NULL,

  -- Summary fields denormalised for list/sort (avoids JSONB scan)
  supplier_cost_per_unit    NUMERIC(10,2),
  shipping_cost_per_unit    NUMERIC(10,2),
  fba_fulfillment_fee       NUMERIC(10,2),
  fba_referral_fee          NUMERIC(10,2),
  total_landed_cost         NUMERIC(10,2),
  break_even_price          NUMERIC(10,2),
  recommended_sell_price    NUMERIC(10,2),
  projected_margin_pct      NUMERIC(5,2),
  projected_roi_pct         NUMERIC(5,2),
  projected_monthly_profit  NUMERIC(12,2),
  shipping_method           shipping_method,

  -- Calculator state
  is_favourite  BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived   BOOLEAN NOT NULL DEFAULT FALSE,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_cost_calculations_updated_at
  BEFORE UPDATE ON cost_calculations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_cost_calcs_user
  ON cost_calculations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cost_calcs_product
  ON cost_calculations(product_id)
  WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cost_calcs_fav
  ON cost_calculations(user_id)
  WHERE is_favourite = TRUE;

-- ── Calculator templates (saved presets) ─────────────────────
-- Users save common input configurations (e.g. "Standard Air Freight
-- from China with $0.25/unit labelling") to reuse across products.
CREATE TABLE IF NOT EXISTS calculation_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  -- Partial input defaults; any key overrides the calculator's defaults
  input_defaults JSONB NOT NULL DEFAULT '{}',
  is_default   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_calc_templates_updated_at
  BEFORE UPDATE ON calculation_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_calc_templates_user
  ON calculation_templates(user_id);
