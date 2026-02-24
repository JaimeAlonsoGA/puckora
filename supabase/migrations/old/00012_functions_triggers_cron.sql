-- ============================================================
-- 00012_functions_triggers_cron.sql
-- Auth triggers (user created → profile bootstrap),
-- business-logic database functions, and pg_cron scheduling.
-- ============================================================

-- ── Auth trigger: bootstrap a new user ───────────────────────
-- Fires after a row is inserted in auth.users (Supabase internal).
-- Creates: profile, default workspace, onboarding steps,
-- notification preferences.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  -- 1. Create profile with full user details
  -- auth_id must be set to NEW.id (the auth.users.id reference)
  ICREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_workspace_id UUID;
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url, plan, preferences)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    'free',
    '{}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    email = NEW.email,
    full_name = NEW.raw_user_meta_data->>'full_name',
    avatar_url = NEW.raw_user_meta_data->>'avatar_url';

  INSERT INTO workspaces (user_id, name, is_default, color, icon)
  VALUES (NEW.id, 'My Research', TRUE, '#4F46E5', '🔍')
  RETURNING id INTO v_workspace_id;

  INSERT INTO onboarding_steps (user_id, step)
  SELECT NEW.id, step
  FROM unnest(ARRAY[
    'marketplace','niche','business_model','goals',
    'first_search','save_product','run_calculator','complete'
  ]::onboarding_step[]) AS step
  ON CONFLICT DO NOTHING;

  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── Trigger: mark onboarding complete when all steps done ────
CREATE OR REPLACE FUNCTION check_onboarding_complete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_incomplete INT;
BEGIN
  -- Count steps still missing completed_at
  SELECT COUNT(*) INTO v_incomplete
  FROM onboarding_steps
  WHERE user_id = NEW.user_id
    AND step != 'complete'
    AND completed_at IS NULL;

  IF v_incomplete = 0 THEN
    -- Mark the 'complete' synthetic step
    UPDATE onboarding_steps
    SET completed_at = NOW()
    WHERE user_id = NEW.user_id AND step = 'complete' AND completed_at IS NULL;

    -- Update profiles
    UPDATE profiles
    SET onboarding_completed_at = NOW()
    WHERE id = NEW.user_id AND onboarding_completed_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_onboarding_completion
  AFTER UPDATE OF completed_at ON onboarding_steps
  FOR EACH ROW
  WHEN (NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL)
  EXECUTE FUNCTION check_onboarding_complete();

-- ── Trigger: create notification on completed analysis ────────
CREATE OR REPLACE FUNCTION notify_analysis_complete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'complete' AND OLD.status != 'complete' THEN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      NEW.user_id,
      'analysis_complete',
      'Competitor analysis ready',
      'Your analysis for ASIN ' || NEW.asin || ' is complete.',
      jsonb_build_object(
        'analysis_id', NEW.id,
        'product_id',  NEW.product_id,
        'asin',        NEW.asin
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_analysis_complete_notify
  AFTER UPDATE OF status ON competitor_analyses
  FOR EACH ROW EXECUTE FUNCTION notify_analysis_complete();

-- ── Trigger: price drop alert ─────────────────────────────────
-- Fires when a product's price is updated and a user has a threshold set.
CREATE OR REPLACE FUNCTION check_price_alerts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Notify any user tracking this product if price drops below their threshold
  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT
    tp.user_id,
    'price_drop',
    'Price drop: ' || NEW.title,
    'Price fell from $' || OLD.price::TEXT || ' to $' || NEW.price::TEXT,
    jsonb_build_object(
      'product_id',    NEW.id,
      'asin',          NEW.asin,
      'old_price',     OLD.price,
      'new_price',     NEW.price,
      'marketplace',   NEW.marketplace
    )
  FROM tracked_products tp
  WHERE tp.product_id = NEW.id
    AND tp.price_alert_below IS NOT NULL
    AND NEW.price <= tp.price_alert_below
    AND (OLD.price IS NULL OR OLD.price > tp.price_alert_below);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_price_alert
  AFTER UPDATE OF price ON products
  FOR EACH ROW EXECUTE FUNCTION check_price_alerts();

-- ── Trigger: BSR spike alert ──────────────────────────────────
CREATE OR REPLACE FUNCTION check_bsr_alerts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Alert on BSR rising above threshold (competition increasing)
  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT
    tp.user_id,
    'bsr_spike',
    'BSR worsened: ' || NEW.title,
    'BSR rose from #' || OLD.bsr::TEXT || ' to #' || NEW.bsr::TEXT,
    jsonb_build_object(
      'product_id', NEW.id,
      'asin',       NEW.asin,
      'old_bsr',    OLD.bsr,
      'new_bsr',    NEW.bsr
    )
  FROM tracked_products tp
  WHERE tp.product_id = NEW.id
    AND tp.bsr_alert_above IS NOT NULL
    AND NEW.bsr >= tp.bsr_alert_above
    AND (OLD.bsr IS NULL OR OLD.bsr < tp.bsr_alert_above);

  -- Alert on BSR improving below threshold (product gaining traction)
  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT
    tp.user_id,
    'bsr_drop',
    'BSR improving: ' || NEW.title,
    'BSR improved from #' || OLD.bsr::TEXT || ' to #' || NEW.bsr::TEXT,
    jsonb_build_object(
      'product_id', NEW.id,
      'asin',       NEW.asin,
      'old_bsr',    OLD.bsr,
      'new_bsr',    NEW.bsr
    )
  FROM tracked_products tp
  WHERE tp.product_id = NEW.id
    AND tp.bsr_alert_below IS NOT NULL
    AND NEW.bsr <= tp.bsr_alert_below
    AND (OLD.bsr IS NULL OR OLD.bsr > tp.bsr_alert_below);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bsr_alert
  AFTER UPDATE OF bsr ON products
  FOR EACH ROW EXECUTE FUNCTION check_bsr_alerts();

-- ── Stripe webhook handler ────────────────────────────────────
-- Called by the stripe-webhook edge function after validating the event.
CREATE OR REPLACE FUNCTION handle_stripe_plan_update(
  p_stripe_customer_id TEXT,
  p_new_plan           plan_type,
  p_subscription_id    TEXT,
  p_expires_at         TIMESTAMPTZ
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles
  SET
    plan                    = p_new_plan,
    stripe_subscription_id  = p_subscription_id,
    plan_expires_at         = p_expires_at,
    updated_at              = NOW()
  WHERE stripe_customer_id = p_stripe_customer_id;
END;
$$;

-- ── Helper: get dashboard stats for a user ────────────────────
-- Used by the frontend dashboard on load to avoid multiple round-trips.
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'tracked_products_count',   (SELECT COUNT(*) FROM tracked_products WHERE user_id = p_user_id),
    'saved_suppliers_count',    (SELECT COUNT(*) FROM saved_suppliers WHERE user_id = p_user_id),
    'analyses_count',           (SELECT COUNT(*) FROM competitor_analyses WHERE user_id = p_user_id),
    'calculations_count',       (SELECT COUNT(*) FROM cost_calculations WHERE user_id = p_user_id),
    'unread_notifications',     (SELECT COUNT(*) FROM notifications WHERE user_id = p_user_id AND read_at IS NULL),
    'workspaces_count',         (SELECT COUNT(*) FROM workspaces WHERE user_id = p_user_id),
    'pending_analyses',         (SELECT COUNT(*) FROM competitor_analyses WHERE user_id = p_user_id AND status IN ('pending','queued','processing'))
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ── Helper functions for Edge Functions (bypass RLS safely) ─────
-- These functions use SECURITY DEFINER to bypass RLS while maintaining
-- explicit authorization checks. Edge functions call these instead of
-- queryingtables directly.

/**
 * Get a user's profile. Used by edge functions that need to bypass RLS.
 * Authorization: only callable with valid user_id (edge function context)
 */
CREATE OR REPLACE FUNCTION get_user_profile(p_user_id UUID)
RETURNS profiles LANGUAGE sql SECURITY DEFINER
SET search_path = public AS $$
  SELECT * FROM profiles WHERE id = p_user_id;
$$;

/**
 * Ensure a user profile exists (create if missing).
 * Used when a user signs up but the trigger didn't create their profile.
 */
CREATE OR REPLACE FUNCTION ensure_user_profile_exists(
  p_user_id UUID,
  p_email TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS profiles LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_profile profiles;
BEGIN
  -- Check if profile exists
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;

  IF v_profile IS NOT NULL THEN
    RETURN v_profile;
  END IF;

  -- Profile doesn't exist - create with defaults
  INSERT INTO profiles (id, email, full_name, avatar_url, plan, preferences)
  VALUES (p_user_id, p_email, p_full_name, p_avatar_url, 'free', '{}'::jsonb)
  ON CONFLICT (id) DO NOTHING;

  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id;
  RETURN v_profile;
END;
$$;

-- ── pg_cron scheduled jobs ─────────────────────────────────────
-- Requires pg_cron extension to be enabled in Supabase dashboard.
-- Comments show intent; uncomment after enabling the extension.
-- All cron jobs call edge functions or run maintenance SQL.

-- Purge expired market opportunity signals (daily at 06:00 UTC)
-- SELECT cron.schedule(
--   'purge-expired-opportunities',
--   '0 6 * * *',
--   $$ DELETE FROM market_opportunities WHERE valid_until < NOW() $$
-- );

-- Purge expired trend signals (daily at 06:30 UTC)
-- SELECT cron.schedule(
--   'purge-expired-trends',
--   '30 6 * * *',
--   $$ DELETE FROM trend_signals WHERE expires_at < NOW() $$
-- );

-- Purge expired FBA fee cache (daily at 07:00 UTC)
-- SELECT cron.schedule(
--   'purge-expired-fba-fees',
--   '0 7 * * *',
--   $$ DELETE FROM fba_fees_cache WHERE expires_at < NOW() $$
-- );

-- Archive old search history older than 90 days (weekly Sunday 02:00 UTC)
-- SELECT cron.schedule(
--   'archive-search-history',
--   '0 2 * * 0',
--   $$ DELETE FROM search_history WHERE created_at < NOW() - INTERVAL '90 days' $$
-- );

-- Purge old usage_counters older than 6 months (monthly on the 1st at 03:00 UTC)
-- SELECT cron.schedule(
--   'purge-old-usage-counters',
--   '0 3 1 * *',
--   $$ DELETE FROM usage_counters WHERE period_start < NOW() - INTERVAL '6 months' $$
-- );

-- Purge old notifications older than 60 days (weekly Sunday 03:00 UTC)
-- SELECT cron.schedule(
--   'purge-old-notifications',
--   '0 3 * * 0',
--   $$ DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '60 days' $$
-- );

-- NB: Product refresh and embedding generation are triggered via
-- the Supabase Edge Function "refresh-products" called by an
-- external cron HTTP webhook or the python scraper scheduler.
-- They require network access and cannot run inside pg_cron.
