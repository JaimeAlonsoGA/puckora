-- ============================================================
-- 00009_embeddings.sql
-- pgvector embedding tables for semantic search across products,
-- categories, reviews, and suppliers.
-- All HNSW indexes use cosine distance (best for OpenAI embeddings).
-- ============================================================

-- ── Category embeddings ───────────────────────────────────────
-- Enables: "find categories similar to [user query]"
-- Generated from: category name + full_path + breadcrumb text
CREATE TABLE IF NOT EXISTS category_embeddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id TEXT NOT NULL REFERENCES amazon_categories(id) ON DELETE CASCADE,
  model       TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  embedding   vector(1536) NOT NULL,
  source_text TEXT NOT NULL,    -- the text that was embedded (for auditing)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(category_id, model)
);

CREATE INDEX IF NOT EXISTS idx_cat_embeddings_hnsw
  ON category_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ── Product embeddings ────────────────────────────────────────
-- Enables: semantic product search, "find similar products"
-- Generated from: title + brand + bullet_points (concatenated)
CREATE TABLE IF NOT EXISTS product_embeddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  model       TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  embedding   vector(1536) NOT NULL,
  source_text TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, model)
);

CREATE INDEX IF NOT EXISTS idx_prod_embeddings_hnsw
  ON product_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ── Review embeddings ─────────────────────────────────────────
-- Enables: competitor NLP clustering, pain-point detection
-- Generated from: individual review texts (negative only by default)
CREATE TABLE IF NOT EXISTS review_embeddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES competitor_analyses(id) ON DELETE SET NULL,
  review_id   TEXT NOT NULL,    -- Amazon review ID (stable external identifier)
  model       TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  embedding   vector(1536) NOT NULL,
  sentiment   TEXT,             -- 'positive' | 'negative' | 'neutral' | 'mixed'
  rating      INT CHECK (rating BETWEEN 1 AND 5),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(review_id, model)
);

CREATE INDEX IF NOT EXISTS idx_review_embeddings_product
  ON review_embeddings(product_id);

CREATE INDEX IF NOT EXISTS idx_review_embeddings_analysis
  ON review_embeddings(analysis_id)
  WHERE analysis_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_review_embeddings_hnsw
  ON review_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ── Supplier product embeddings ───────────────────────────────
-- Enables: the Amazon → Alibaba match bridge
-- Generated from: supplier_products title + categories + keywords
CREATE TABLE IF NOT EXISTS supplier_embeddings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_product_id UUID NOT NULL REFERENCES supplier_products(id) ON DELETE CASCADE,
  model               TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  embedding           vector(1536) NOT NULL,
  source_text         TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(supplier_product_id, model)
);

CREATE INDEX IF NOT EXISTS idx_supplier_embeddings_hnsw
  ON supplier_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ── RPC: Semantic category search ────────────────────────────
-- Called by categories-tree edge function with a pre-computed embedding.
-- The query embedding is computed by the Python scraper or edge function
-- using OpenAI text-embedding-3-small.
CREATE OR REPLACE FUNCTION match_categories_semantic(
  query_embedding vector(1536),
  p_marketplace   marketplace DEFAULT 'US',
  p_match_count   INT         DEFAULT 20,
  p_min_similarity FLOAT      DEFAULT 0.4
)
RETURNS TABLE (
  id          TEXT,
  name        TEXT,
  full_path   TEXT,
  depth       INT,
  is_leaf     BOOLEAN,
  referral_fee_pct NUMERIC,
  opportunity_score NUMERIC,
  similarity  FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    c.id,
    c.name,
    c.full_path,
    c.depth,
    c.is_leaf,
    c.referral_fee_pct,
    c.opportunity_score,
    (1 - (ce.embedding <=> query_embedding))::FLOAT AS similarity
  FROM category_embeddings ce
  JOIN amazon_categories c ON c.id = ce.category_id
  WHERE c.marketplace = p_marketplace
    AND c.is_active = TRUE
    AND (1 - (ce.embedding <=> query_embedding)) >= p_min_similarity
  ORDER BY ce.embedding <=> query_embedding
  LIMIT p_match_count;
$$;

-- ── RPC: Semantic product search ─────────────────────────────
CREATE OR REPLACE FUNCTION match_products_semantic(
  query_embedding  vector(1536),
  p_marketplace    marketplace DEFAULT 'US',
  p_match_count    INT         DEFAULT 20,
  p_min_similarity FLOAT       DEFAULT 0.5,
  p_category_id    TEXT        DEFAULT NULL
)
RETURNS TABLE (
  id          UUID,
  asin        TEXT,
  title       TEXT,
  brand       TEXT,
  price       NUMERIC,
  rating      NUMERIC,
  bsr         INT,
  opportunity_score NUMERIC,
  marketplace marketplace,
  similarity  FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    p.id,
    p.asin,
    p.title,
    p.brand,
    p.price,
    p.rating,
    p.bsr,
    p.opportunity_score,
    p.marketplace,
    (1 - (pe.embedding <=> query_embedding))::FLOAT AS similarity
  FROM product_embeddings pe
  JOIN products p ON p.id = pe.product_id
  WHERE p.marketplace = p_marketplace
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (1 - (pe.embedding <=> query_embedding)) >= p_min_similarity
  ORDER BY pe.embedding <=> query_embedding
  LIMIT p_match_count;
$$;

-- ── RPC: Find supplier matches for a product ─────────────────
CREATE OR REPLACE FUNCTION match_suppliers_for_product(
  p_product_id    UUID,
  p_match_count   INT   DEFAULT 10,
  p_min_score     FLOAT DEFAULT 0.4
)
RETURNS TABLE (
  supplier_product_id UUID,
  supplier_id         UUID,
  supplier_name       TEXT,
  title               TEXT,
  price_min           NUMERIC,
  price_max           NUMERIC,
  moq                 INT,
  match_score         NUMERIC,
  similarity          FLOAT
)
LANGUAGE sql STABLE AS $$
  -- First try pre-computed bridge table (fastest)
  SELECT
    sp.id       AS supplier_product_id,
    sp.supplier_id,
    s.name      AS supplier_name,
    sp.title,
    sp.price_min,
    sp.price_max,
    sp.moq,
    psm.match_score,
    psm.match_score / 100.0 AS similarity
  FROM product_supplier_matches psm
  JOIN supplier_products sp ON sp.id = psm.supplier_product_id
  JOIN suppliers s ON s.id = sp.supplier_id
  WHERE psm.product_id = p_product_id
    AND psm.match_score >= p_min_score * 100
  ORDER BY psm.match_score DESC
  LIMIT p_match_count;
$$;

-- ── RPC: Find similar products ────────────────────────────────
CREATE OR REPLACE FUNCTION find_similar_products(
  p_product_id    UUID,
  p_match_count   INT   DEFAULT 10,
  p_min_similarity FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id            UUID,
  asin          TEXT,
  title         TEXT,
  price         NUMERIC,
  rating        NUMERIC,
  bsr           INT,
  opportunity_score NUMERIC,
  similarity    FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    p.id,
    p.asin,
    p.title,
    p.price,
    p.rating,
    p.bsr,
    p.opportunity_score,
    (1 - (pe2.embedding <=> pe1.embedding))::FLOAT AS similarity
  FROM product_embeddings pe1
  JOIN product_embeddings pe2
    ON pe2.product_id != p_product_id
   AND pe1.model = pe2.model
  JOIN products p ON p.id = pe2.product_id
  WHERE pe1.product_id = p_product_id
    AND (1 - (pe2.embedding <=> pe1.embedding)) >= p_min_similarity
    AND p.marketplace = (SELECT marketplace FROM products WHERE id = p_product_id)
  ORDER BY pe2.embedding <=> pe1.embedding
  LIMIT p_match_count;
$$;
