-- ============================================================
-- 00011_rls_policies.sql
-- Row Level Security policies for all application tables.
-- Three principals:
--   authenticated  → regular signed-in user
--   service_role   → Supabase Edge Functions / Python backend (bypasses RLS)
--   anon           → unauthenticated (read-only public data only)
--
-- Design rules:
-- 1. Users only ever see their own rows (strict user_id = auth.uid()).
-- 2. Shared/global tables (products, suppliers, categories) are
--    readable by authenticated users; writes are service_role only.
-- 3. service_role bypasses RLS at the connection level but we add
--    explicit service policies where helpful for documentation.
-- 4. No policy is created for tables the anon role must never access.
-- ============================================================

-- ── Enable RLS on all tables ──────────────────────────────────
ALTER TABLE profiles                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_steps            ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_counters              ENABLE ROW LEVEL SECURITY;

ALTER TABLE workspaces                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_keywords            ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_suppliers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_inquiries          ENABLE ROW LEVEL SECURITY;

ALTER TABLE competitor_analyses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pain_point_clusters         ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_reports         ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_opportunities        ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_signals               ENABLE ROW LEVEL SECURITY;

ALTER TABLE cost_calculations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculation_templates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fba_fees_cache              ENABLE ROW LEVEL SECURITY;

ALTER TABLE notifications               ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences    ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history              ENABLE ROW LEVEL SECURITY;

-- Global catalog tables
ALTER TABLE amazon_categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_fba_fees           ENABLE ROW LEVEL SECURITY;
ALTER TABLE products                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_details             ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_history             ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_supplier_matches    ENABLE ROW LEVEL SECURITY;

-- Embedding tables
ALTER TABLE category_embeddings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_embeddings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_embeddings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_embeddings         ENABLE ROW LEVEL SECURITY;

-- ── profiles ─────────────────────────────────────────────────
CREATE POLICY "profiles: own row only"
  ON profiles FOR ALL
  USING (auth.uid() = id);

-- ── onboarding_steps ─────────────────────────────────────────
CREATE POLICY "onboarding_steps: own rows"
  ON onboarding_steps FOR ALL
  USING (auth.uid() = user_id);

-- ── usage_counters ───────────────────────────────────────────
-- Users can read their own counters; increment is done via SECURITY DEFINER RPC.
CREATE POLICY "usage_counters: own read"
  ON usage_counters FOR SELECT
  USING (auth.uid() = user_id);

-- ── workspaces ───────────────────────────────────────────────
CREATE POLICY "workspaces: own rows"
  ON workspaces FOR ALL
  USING (auth.uid() = user_id);

-- ── collections ──────────────────────────────────────────────
CREATE POLICY "collections: via own workspace"
  ON collections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspaces w
      WHERE w.id = collections.workspace_id
        AND w.user_id = auth.uid()
    )
  );

-- ── tracked_products ─────────────────────────────────────────
CREATE POLICY "tracked_products: own rows"
  ON tracked_products FOR ALL
  USING (auth.uid() = user_id);

-- ── tracked_keywords ─────────────────────────────────────────
CREATE POLICY "tracked_keywords: own rows"
  ON tracked_keywords FOR ALL
  USING (auth.uid() = user_id);

-- ── saved_suppliers ──────────────────────────────────────────
CREATE POLICY "saved_suppliers: own rows"
  ON saved_suppliers FOR ALL
  USING (auth.uid() = user_id);

-- ── supplier_inquiries ────────────────────────────────────────
CREATE POLICY "supplier_inquiries: own rows"
  ON supplier_inquiries FOR ALL
  USING (auth.uid() = user_id);

-- ── competitor_analyses ──────────────────────────────────────
CREATE POLICY "competitor_analyses: own rows"
  ON competitor_analyses FOR ALL
  USING (auth.uid() = user_id);

-- Service role updates status + progress (scraper callback)
CREATE POLICY "competitor_analyses: service update"
  ON competitor_analyses FOR UPDATE
  USING (auth.role() = 'service_role');

-- ── pain_point_clusters ──────────────────────────────────────
-- Access via analysis (which is user-owned)
CREATE POLICY "pain_point_clusters: via own analysis"
  ON pain_point_clusters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitor_analyses ca
      WHERE ca.id = pain_point_clusters.analysis_id
        AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "pain_point_clusters: service insert"
  ON pain_point_clusters FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ── opportunity_reports ───────────────────────────────────────
CREATE POLICY "opportunity_reports: via own analysis"
  ON opportunity_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM competitor_analyses ca
      WHERE ca.id = opportunity_reports.analysis_id
        AND ca.user_id = auth.uid()
    )
  );

CREATE POLICY "opportunity_reports: service insert"
  ON opportunity_reports FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ── market_opportunities ──────────────────────────────────────
-- Public market-level data — all authenticated users can read
CREATE POLICY "market_opportunities: read authenticated"
  ON market_opportunities FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── trend_signals ─────────────────────────────────────────────
CREATE POLICY "trend_signals: read authenticated"
  ON trend_signals FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── cost_calculations ─────────────────────────────────────────
CREATE POLICY "cost_calculations: own rows"
  ON cost_calculations FOR ALL
  USING (auth.uid() = user_id);

-- ── calculation_templates ─────────────────────────────────────
CREATE POLICY "calculation_templates: own rows"
  ON calculation_templates FOR ALL
  USING (auth.uid() = user_id);

-- ── fba_fees_cache ────────────────────────────────────────────
-- Read-only for authenticated users; writes via service role
CREATE POLICY "fba_fees_cache: read authenticated"
  ON fba_fees_cache FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── notifications ─────────────────────────────────────────────
CREATE POLICY "notifications: own rows"
  ON notifications FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "notifications: service insert"
  ON notifications FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ── notification_preferences ─────────────────────────────────
CREATE POLICY "notification_preferences: own row"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id);

-- ── search_history ────────────────────────────────────────────
CREATE POLICY "search_history: own rows"
  ON search_history FOR ALL
  USING (auth.uid() = user_id);

-- ── Global catalog: products ──────────────────────────────────
-- All authenticated users can read; service role writes
CREATE POLICY "products: read authenticated"
  ON products FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "products: service write"
  ON products FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "products: service update"
  ON products FOR UPDATE
  USING (auth.role() = 'service_role');

-- ── product_details ───────────────────────────────────────────
CREATE POLICY "product_details: read authenticated"
  ON product_details FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "product_details: service write"
  ON product_details FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "product_details: service update"
  ON product_details FOR UPDATE
  USING (auth.role() = 'service_role');

-- ── product_history ───────────────────────────────────────────
-- Users can only read history for products they track
CREATE POLICY "product_history: via tracked product"
  ON product_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tracked_products tp
      WHERE tp.product_id = product_history.product_id
        AND tp.user_id = auth.uid()
    )
  );

CREATE POLICY "product_history: service write"
  ON product_history FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ── amazon_categories ─────────────────────────────────────────
CREATE POLICY "amazon_categories: read authenticated"
  ON amazon_categories FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "amazon_categories: service write"
  ON amazon_categories FOR ALL
  USING (auth.role() = 'service_role');

-- ── category_fba_fees ─────────────────────────────────────────
CREATE POLICY "category_fba_fees: read authenticated"
  ON category_fba_fees FOR SELECT
  USING (auth.role() = 'authenticated');

-- ── suppliers ─────────────────────────────────────────────────
CREATE POLICY "suppliers: read authenticated"
  ON suppliers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "suppliers: service write"
  ON suppliers FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "suppliers: service update"
  ON suppliers FOR UPDATE
  USING (auth.role() = 'service_role');

-- ── supplier_products ─────────────────────────────────────────
CREATE POLICY "supplier_products: read authenticated"
  ON supplier_products FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "supplier_products: service write"
  ON supplier_products FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ── product_supplier_matches ──────────────────────────────────
CREATE POLICY "product_supplier_matches: read authenticated"
  ON product_supplier_matches FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "product_supplier_matches: service write"
  ON product_supplier_matches FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "product_supplier_matches: user verify"
  ON product_supplier_matches FOR UPDATE
  USING (
    -- Users can only set verified_by_user_id on their own match confirmations
    auth.uid() = verified_by_user_id
    OR auth.role() = 'service_role'
  );

-- ── Embedding tables (service writes, authenticated reads) ────
CREATE POLICY "category_embeddings: read authenticated"
  ON category_embeddings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "category_embeddings: service write"
  ON category_embeddings FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "product_embeddings: read authenticated"
  ON product_embeddings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "product_embeddings: service write"
  ON product_embeddings FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "review_embeddings: read authenticated"
  ON review_embeddings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "review_embeddings: service write"
  ON review_embeddings FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "supplier_embeddings: read authenticated"
  ON supplier_embeddings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "supplier_embeddings: service write"
  ON supplier_embeddings FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
