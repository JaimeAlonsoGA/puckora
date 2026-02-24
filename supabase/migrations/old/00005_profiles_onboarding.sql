-- ============================================================
-- 00005_profiles_onboarding.sql
-- User profiles, plan management, onboarding state machine,
-- and atomic usage counters.
-- NOTE: Counters live in a separate table to avoid race conditions
-- under concurrent edge function calls.
-- ============================================================

-- ── User profiles (extends auth.users) ───────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  auth_id          UUID NOT NULL,  -- Explicit reference to auth.users.id
  email            TEXT NOT NULL,
  full_name        TEXT,
  avatar_url       TEXT,

  -- Subscription
  plan             plan_type NOT NULL DEFAULT 'free',
  stripe_customer_id      TEXT UNIQUE,
  stripe_subscription_id  TEXT,
  plan_expires_at         TIMESTAMPTZ,

  -- Amazon Seller Central integration (phase 2 — not MVP)
  amazon_seller_id  TEXT,
  -- Never store raw tokens in cleartext; use Supabase Vault secrets when available
  amazon_mws_token_ref TEXT,  -- reference ID to Supabase Vault secret

  -- Preferences (flexible JSONB; individual keys set by frontend)
  -- Shape: { primaryMarketplace, currency, darkMode, language, defaultWorkspaceId }
  preferences      JSONB NOT NULL DEFAULT '{}',

  -- Onboarding
  onboarding_completed_at TIMESTAMPTZ,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- FK from product_supplier_matches back to profiles (deferred add after both tables exist)
ALTER TABLE product_supplier_matches
  ADD CONSTRAINT fk_psm_verified_by
  FOREIGN KEY (verified_by_user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- ── Onboarding step tracker ───────────────────────────────────
-- Each row = one wizard step for one user.
-- completed_at = NULL means not yet completed.
-- data stores the answer/choice the user made at that step.
CREATE TABLE IF NOT EXISTS onboarding_steps (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  step         onboarding_step NOT NULL,
  completed_at TIMESTAMPTZ,
  -- Answers: { marketplace: 'US', niche: 'Pet supplies', goals: ['revenue', 'passive_income'] }
  data         JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, step)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_user
  ON onboarding_steps(user_id);

-- ── Usage counters (race-condition-safe plan limit tracking) ──
-- One row per (user × key × period_start).
-- Atomically incremented by increment_usage_counter() from migration 01.
-- Keys: 'daily_searches', 'daily_cost_calcs', 'monthly_competitor_analyses',
--       'daily_supplier_searches', 'daily_category_searches'
CREATE TABLE IF NOT EXISTS usage_counters (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  counter_key  TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,  -- truncated to day or month
  count        INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, counter_key, period_start)
);

CREATE INDEX IF NOT EXISTS idx_usage_counters_user_key
  ON usage_counters(user_id, counter_key, period_start);

-- Cleanup index: find old periods to prune
CREATE INDEX IF NOT EXISTS idx_usage_counters_period
  ON usage_counters(period_start);

-- ── Profile helper functions ──────────────────────────────────

-- Called by frontend / edge functions: get current plan + all counter values
CREATE OR REPLACE FUNCTION get_user_plan_status(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_plan      plan_type;
  v_counters  JSONB;
BEGIN
  SELECT plan INTO v_plan FROM profiles WHERE id = p_user_id;

  SELECT jsonb_object_agg(
    uc.counter_key,
    uc.count
  )
  INTO v_counters
  FROM usage_counters uc
  WHERE uc.user_id = p_user_id
    AND uc.period_start >= date_trunc('day', NOW() - INTERVAL '1 month');

  RETURN jsonb_build_object(
    'plan',     v_plan,
    'counters', COALESCE(v_counters, '{}'::JSONB)
  );
END;
$$;

-- Get onboarding completion map for a user
CREATE OR REPLACE FUNCTION get_onboarding_status(p_user_id UUID)
RETURNS JSONB LANGUAGE sql SECURITY DEFINER AS $$
  SELECT jsonb_object_agg(
    step::TEXT,
    jsonb_build_object(
      'completed', completed_at IS NOT NULL,
      'completed_at', completed_at,
      'data', data
    )
  )
  FROM onboarding_steps
  WHERE user_id = p_user_id;
$$;
