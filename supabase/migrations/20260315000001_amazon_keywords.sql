-- ── amazon_keywords ────────────────────────────────────────────────────────────
-- One row per unique (keyword, marketplace) pair — canonical market data, not
-- user-scoped. Keywords are public Amazon data shared across all users.
-- total_results and unique_brands come directly from SP-API refinements.
-- last_searched_at is bumped on every upsert so stale data is easy to identify.
CREATE TABLE amazon_keywords (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword          text        NOT NULL,
    marketplace      text        NOT NULL DEFAULT 'US',
    total_results    integer,
    unique_brands    integer,
    last_searched_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (keyword, marketplace)
);

CREATE INDEX idx_amazon_keywords_keyword_marketplace
    ON amazon_keywords(keyword, marketplace);

-- ── amazon_keyword_products ──────────────────────────────────────────────────
-- Pure junction table: which ASINs appeared for a given keyword search.
-- No rank stored here — display order comes from product_financials.rank (BSR).
-- Both the extension scraper and SP-API tracks write to this same table;
-- conflicts are silently ignored (ON CONFLICT DO NOTHING).
CREATE TABLE amazon_keyword_products (
    keyword_id  uuid NOT NULL REFERENCES amazon_keywords(id) ON DELETE CASCADE,
    asin        text NOT NULL REFERENCES amazon_products(asin),
    PRIMARY KEY (keyword_id, asin)
);

CREATE INDEX idx_amazon_keyword_products_asin
    ON amazon_keyword_products(asin);

-- ── Row-Level Security ─────────────────────────────────────────────────────────
ALTER TABLE amazon_keywords         ENABLE ROW LEVEL SECURITY;
ALTER TABLE amazon_keyword_products ENABLE ROW LEVEL SECURITY;

-- Keywords are canonical market data — public read, any authenticated user can write.
CREATE POLICY "public read keywords"
    ON amazon_keywords FOR SELECT
    USING (true);

CREATE POLICY "authenticated users can write keywords"
    ON amazon_keywords FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "authenticated users can update keywords"
    ON amazon_keywords FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "authenticated users can delete keywords"
    ON amazon_keywords FOR DELETE TO authenticated
    USING (true);

-- Keyword-product links are public data — anyone can read, authenticated users can write.
CREATE POLICY "public read keyword products"
    ON amazon_keyword_products FOR SELECT
    USING (true);

CREATE POLICY "authenticated users can write keyword products"
    ON amazon_keyword_products FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "authenticated users can delete keyword products"
    ON amazon_keyword_products FOR DELETE TO authenticated
    USING (true);
