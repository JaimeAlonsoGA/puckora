-- ============================================================
-- 00002_categories.sql
-- Amazon category tree with ltree for efficient traversal.
-- The 25k-row AmazonCategories.csv is processed by the Python
-- scraper and bulk-inserted through the service role.
-- ============================================================

-- ── Core category tree ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS amazon_categories (
  -- Primary key: Amazon browse node ID when known, otherwise generated UUID
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  parent_id    TEXT REFERENCES amazon_categories(id) ON DELETE SET NULL,

  -- Human-readable path: 'Appliances > Laundry > Washers & Dryers'
  full_path    TEXT NOT NULL,
  -- Breadcrumb array for UI rendering: ['Appliances','Laundry','Washers & Dryers']
  breadcrumb   TEXT[] NOT NULL DEFAULT '{}',
  -- ltree path for Postgres tree queries (uses slugified names)
  -- e.g. appliances.laundry_appliances.washers_dryers
  ltree_path   ltree,

  depth        INT NOT NULL DEFAULT 0,
  is_leaf      BOOLEAN NOT NULL DEFAULT FALSE,
  slug         TEXT NOT NULL,

  -- Marketplace association (same category name may have different IDs per MKT)
  marketplace  marketplace NOT NULL DEFAULT 'US',

  -- FBA fee reference data (populated where known)
  referral_fee_pct     NUMERIC(5,2),
  closing_fee_usd      NUMERIC(8,2),
  is_restricted        BOOLEAN NOT NULL DEFAULT FALSE,
  requires_approval    BOOLEAN NOT NULL DEFAULT FALSE,
  hazmat_risk          BOOLEAN NOT NULL DEFAULT FALSE,

  -- Metadata from product catalog (updated by background jobs)
  avg_bsr              INT,
  avg_price            NUMERIC(10,2),
  avg_rating           NUMERIC(3,2),
  product_count_est    INT,
  competition_level    competition_level,
  opportunity_score    NUMERIC(5,2),

  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_amazon_categories_updated_at
  BEFORE UPDATE ON amazon_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Indexes ───────────────────────────────────────────────────
-- Parent traversal
CREATE INDEX IF NOT EXISTS idx_categories_parent
  ON amazon_categories(parent_id);

-- Depth-first browsing
CREATE INDEX IF NOT EXISTS idx_categories_depth
  ON amazon_categories(depth);

-- ltree: ancestor / descendant queries (e.g. find all children of a node)
CREATE INDEX IF NOT EXISTS idx_categories_ltree
  ON amazon_categories USING GIST (ltree_path);

-- Fast text search on name (trigram — powers the search bar)
CREATE INDEX IF NOT EXISTS idx_categories_name_trgm
  ON amazon_categories USING GIN (name gin_trgm_ops);

-- Fast text search on full_path (autocomplete-style)
CREATE INDEX IF NOT EXISTS idx_categories_path_trgm
  ON amazon_categories USING GIN (full_path gin_trgm_ops);

-- Marketplace + depth combination (tree browser)
CREATE INDEX IF NOT EXISTS idx_categories_marketplace_depth
  ON amazon_categories(marketplace, depth);

-- Opportunity browsing (navigate by score DESC)
CREATE INDEX IF NOT EXISTS idx_categories_opportunity
  ON amazon_categories(opportunity_score DESC NULLS LAST)
  WHERE is_active = TRUE AND is_leaf = FALSE;

-- ── Referral fee table (category-level FBA fee config) ────────
-- Separate table so fees can be updated without touching category tree
CREATE TABLE IF NOT EXISTS category_fba_fees (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id         TEXT NOT NULL REFERENCES amazon_categories(id) ON DELETE CASCADE,
  marketplace         marketplace NOT NULL DEFAULT 'US',
  referral_fee_pct    NUMERIC(5,2) NOT NULL,
  min_referral_fee    NUMERIC(8,2),
  closing_fee_usd     NUMERIC(8,2),
  per_kg_fee_usd      NUMERIC(8,3),
  -- size tiers
  standard_size_fee   NUMERIC(8,2),
  oversize_fee        NUMERIC(8,2),
  source              TEXT NOT NULL DEFAULT 'amazon_public', -- 'amazon_public' | 'sp_api' | 'manual'
  valid_from          DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until         DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id, marketplace, valid_from)
);

CREATE INDEX IF NOT EXISTS idx_cat_fba_fees_category
  ON category_fba_fees(category_id, marketplace);

-- ── Helper functions for category navigation ──────────────────

-- Get all ancestors of a category (root → leaf path)
CREATE OR REPLACE FUNCTION get_category_ancestors(p_id TEXT)
RETURNS TABLE (id TEXT, name TEXT, depth INT, full_path TEXT)
LANGUAGE sql STABLE AS $$
  SELECT c.id, c.name, c.depth, c.full_path
  FROM amazon_categories c
  WHERE c.ltree_path @> (
    SELECT ltree_path FROM amazon_categories WHERE id = p_id
  )
  ORDER BY c.depth;
$$;

-- Get direct children of a category
CREATE OR REPLACE FUNCTION get_category_children(p_id TEXT)
RETURNS TABLE (id TEXT, name TEXT, depth INT, is_leaf BOOLEAN, full_path TEXT, product_count_est INT, opportunity_score NUMERIC)
LANGUAGE sql STABLE AS $$
  SELECT c.id, c.name, c.depth, c.is_leaf, c.full_path, c.product_count_est, c.opportunity_score
  FROM amazon_categories c
  WHERE c.parent_id = p_id
    AND c.is_active = TRUE
  ORDER BY c.name;
$$;

-- Get entire subtree of a category (up to depth limit)
CREATE OR REPLACE FUNCTION get_category_subtree(p_id TEXT, p_max_depth INT DEFAULT 3)
RETURNS TABLE (id TEXT, name TEXT, parent_id TEXT, depth INT, is_leaf BOOLEAN, full_path TEXT)
LANGUAGE sql STABLE AS $$
  SELECT c.id, c.name, c.parent_id, c.depth, c.is_leaf, c.full_path
  FROM amazon_categories c
  WHERE c.ltree_path <@ (
    SELECT ltree_path FROM amazon_categories WHERE id = p_id
  )
  AND c.depth <= (SELECT depth FROM amazon_categories WHERE id = p_id) + p_max_depth
  AND c.is_active = TRUE
  ORDER BY c.depth, c.name;
$$;

-- Text search across categories (powers search bar + autocomplete)
CREATE OR REPLACE FUNCTION search_categories(
  p_query      TEXT,
  p_marketplace marketplace DEFAULT 'US',
  p_limit      INT DEFAULT 20
)
RETURNS TABLE (
  id TEXT, name TEXT, full_path TEXT, depth INT, is_leaf BOOLEAN,
  referral_fee_pct NUMERIC, opportunity_score NUMERIC, rank REAL
)
LANGUAGE sql STABLE AS $$
  SELECT
    c.id, c.name, c.full_path, c.depth, c.is_leaf,
    c.referral_fee_pct, c.opportunity_score,
    ts_rank(
      to_tsvector('english', c.name || ' ' || c.full_path),
      plainto_tsquery('english', p_query)
    ) AS rank
  FROM amazon_categories c
  WHERE c.marketplace = p_marketplace
    AND c.is_active = TRUE
    AND (
      c.name       ILIKE '%' || p_query || '%'
      OR c.full_path ILIKE '%' || p_query || '%'
    )
  ORDER BY
    -- Exact name match comes first
    (c.name ILIKE p_query)        DESC,
    -- Then shallow categories (root-level)
    c.depth                        ASC,
    -- Then by opportunity signal
    c.opportunity_score            DESC NULLS LAST,
    c.name                         ASC
  LIMIT p_limit;
$$;

-- CSV import helper: upsert a category from the Python scraper
-- Called after parsing each row of AmazonCategories.csv
CREATE OR REPLACE FUNCTION upsert_category(
  p_id          TEXT,
  p_name        TEXT,
  p_parent_id   TEXT,
  p_full_path   TEXT,
  p_breadcrumb  TEXT[],
  p_depth       INT,
  p_is_leaf     BOOLEAN,
  p_marketplace marketplace DEFAULT 'US'
)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_slug        TEXT;
  v_ltree_path  ltree;
  v_parent_ltree ltree;
BEGIN
  v_slug := slugify(p_name);

  IF p_parent_id IS NOT NULL THEN
    SELECT ltree_path INTO v_parent_ltree
      FROM amazon_categories WHERE id = p_parent_id;
    v_ltree_path := v_parent_ltree || text2ltree(to_ltree_label(p_name));
  ELSE
    v_ltree_path := text2ltree(to_ltree_label(p_name));
  END IF;

  INSERT INTO amazon_categories (
    id, name, parent_id, full_path, breadcrumb, ltree_path,
    depth, is_leaf, slug, marketplace
  )
  VALUES (
    p_id, p_name, p_parent_id, p_full_path, p_breadcrumb, v_ltree_path,
    p_depth, p_is_leaf, v_slug, p_marketplace
  )
  ON CONFLICT (id) DO UPDATE SET
    name         = EXCLUDED.name,
    parent_id    = EXCLUDED.parent_id,
    full_path    = EXCLUDED.full_path,
    breadcrumb   = EXCLUDED.breadcrumb,
    ltree_path   = EXCLUDED.ltree_path,
    depth        = EXCLUDED.depth,
    is_leaf      = EXCLUDED.is_leaf,
    slug         = EXCLUDED.slug,
    updated_at   = NOW();
END;
$$;
