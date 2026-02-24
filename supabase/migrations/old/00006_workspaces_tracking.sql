-- ============================================================
-- 00006_workspaces_tracking.sql
-- Research workspaces, product/keyword/supplier tracking,
-- and the organisation layer sitting between users and the
-- global product catalog.
-- ============================================================

-- ── Workspaces (named research boards) ───────────────────────
-- A workspace is the root container for a research project.
-- Free users get 1 default workspace; paid plans get unlimited.
CREATE TABLE IF NOT EXISTS workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  color       TEXT,   -- hex colour for UI card: '#4F46E5'
  icon        TEXT,   -- emoji or icon name: '🛒'
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Only one default workspace per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_one_default
  ON workspaces(user_id)
  WHERE is_default = TRUE;

CREATE INDEX IF NOT EXISTS idx_workspaces_user
  ON workspaces(user_id);

-- ── Collections (product groupings within a workspace) ────────
-- Allows users to organise products into named lists:
-- "Winners", "Rejected", "Deep-dive needed", etc.
CREATE TABLE IF NOT EXISTS collections (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  color        TEXT,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_collections_workspace
  ON collections(workspace_id);

-- ── Tracked products (user → global product_catalog link) ─────
-- This is the user's "saved product" row. It points to the global
-- products table rather than duplicating product data.
CREATE TABLE IF NOT EXISTS tracked_products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,

  -- User context
  notes         TEXT,
  tags          TEXT[] DEFAULT '{}',
  stage         TEXT NOT NULL DEFAULT 'researching',  -- 'researching' | 'sourcing' | 'ordered' | 'live' | 'dropped'

  -- Alert preferences per tracked product
  price_alert_below    NUMERIC(10,2),
  bsr_alert_above      INT,
  bsr_alert_below      INT,
  rating_alert_below   NUMERIC(3,2),

  -- Snapshot at the moment of tracking (for % change display)
  tracked_price        NUMERIC(10,2),
  tracked_bsr          INT,
  tracked_rating       NUMERIC(3,2),
  tracked_review_count INT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, product_id)
);

CREATE TRIGGER trg_tracked_products_updated_at
  BEFORE UPDATE ON tracked_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_tracked_products_user
  ON tracked_products(user_id);

CREATE INDEX IF NOT EXISTS idx_tracked_products_collection
  ON tracked_products(collection_id)
  WHERE collection_id IS NOT NULL;

-- ── Tracked keywords ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tracked_keywords (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,

  keyword      TEXT NOT NULL,
  marketplace  marketplace NOT NULL DEFAULT 'US',
  notes        TEXT,
  tags         TEXT[] DEFAULT '{}',

  -- Latest search results snapshot count (for change detection)
  last_result_count INT,
  last_checked_at   TIMESTAMPTZ,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, keyword, marketplace)
);

CREATE TRIGGER trg_tracked_keywords_updated_at
  BEFORE UPDATE ON tracked_keywords
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_tracked_keywords_user
  ON tracked_keywords(user_id);

-- ── Saved suppliers (user → global supplier link) ────────────
CREATE TABLE IF NOT EXISTS saved_suppliers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,

  notes       TEXT,
  tags        TEXT[] DEFAULT '{}',
  -- Linked Amazon product the user found this supplier for
  linked_product_id UUID REFERENCES products(id) ON DELETE SET NULL,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, supplier_id)
);

CREATE TRIGGER trg_saved_suppliers_updated_at
  BEFORE UPDATE ON saved_suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_saved_suppliers_user
  ON saved_suppliers(user_id);

-- ── Supplier inquiries (CRM-lite: track negotiations) ────────
CREATE TABLE IF NOT EXISTS supplier_inquiries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supplier_id  UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES products(id) ON DELETE SET NULL,

  subject      TEXT,
  message      TEXT,
  quoted_price NUMERIC(10,2),
  moq          INT,
  currency     TEXT DEFAULT 'USD',
  status       TEXT NOT NULL DEFAULT 'draft',  -- 'draft' | 'sent' | 'replied' | 'negotiating' | 'closed_won' | 'closed_lost'
  notes        TEXT,

  sent_at      TIMESTAMPTZ,
  replied_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_supplier_inquiries_updated_at
  BEFORE UPDATE ON supplier_inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_supplier_inquiries_user
  ON supplier_inquiries(user_id);
