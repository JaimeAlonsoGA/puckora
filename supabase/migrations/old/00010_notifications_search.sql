-- ============================================================
-- 00010_notifications_search.sql
-- Notifications centre (price alerts, BSR spikes, analysis done)
-- and search history (analytics + ML-powered suggestions).
-- ============================================================

-- ── Notifications ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type     notification_type NOT NULL,
  title    TEXT NOT NULL,
  body     TEXT,
  -- Rich context for deep link in frontend:
  -- { product_id, analysis_id, collection_id, url }
  data     JSONB,
  read_at  TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_date
  ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(user_id)
  WHERE read_at IS NULL;

-- ── Search history (append-only analytics log) ───────────────
-- Used for: query suggestions, "recent searches", analytics,
-- and eventually ML-powered personalised recommendations.
CREATE TABLE IF NOT EXISTS search_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,

  query        TEXT NOT NULL,
  search_type  search_type NOT NULL DEFAULT 'keyword',
  marketplace  marketplace NOT NULL DEFAULT 'US',
  result_count INT,

  -- Top result (for "what did the user actually look at" analytics)
  first_result_asin TEXT,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_history_user_date
  ON search_history(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_history_query_trgm
  ON search_history USING GIN (query gin_trgm_ops);

-- ── Search suggestions helper ─────────────────────────────────
-- Returns the user's most-frequent recent searches for autocomplete.
CREATE OR REPLACE FUNCTION get_search_suggestions(
  p_user_id   UUID,
  p_prefix    TEXT,
  p_limit     INT DEFAULT 5
)
RETURNS TABLE (query TEXT, count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT query, COUNT(*) AS count
  FROM search_history
  WHERE user_id = p_user_id
    AND query ILIKE p_prefix || '%'
    AND created_at > NOW() - INTERVAL '90 days'
  GROUP BY query
  ORDER BY count DESC, MAX(created_at) DESC
  LIMIT p_limit;
$$;

-- ── Notification preference settings ─────────────────────────
-- One row per user; all prefs stored in a single JSONB column
-- to avoid migration churn when new notification types are added.
-- Shape: { price_drop: true, bsr_spike: true, analysis_complete: true, plan_limit: false }
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id    UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{
    "price_drop": true,
    "bsr_spike": true,
    "bsr_drop": true,
    "analysis_complete": true,
    "plan_limit": true,
    "opportunity": true,
    "supplier_match": false,
    "system": true
  }',
  -- Push / email delivery channels
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  push_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Helper: mark all notifications read ───────────────────────
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE notifications
  SET read_at = NOW()
  WHERE user_id = p_user_id AND read_at IS NULL;
$$;
