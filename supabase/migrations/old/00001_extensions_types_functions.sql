-- ============================================================
-- 00001_extensions_types_functions.sql
-- FOUNDATION: Extensions, enums, and shared utility functions.
-- Must run FIRST — everything else depends on these.
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";       -- gen_random_uuid fallback
CREATE EXTENSION IF NOT EXISTS "vector";          -- pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS "ltree";           -- hierarchical category tree
CREATE EXTENSION IF NOT EXISTS "pg_trgm";         -- trigram for fast ILIKE / FTS
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- query performance monitoring

-- ── Enums ────────────────────────────────────────────────────

-- Marketplaces (Amazon + Alibaba cross-reference)
DO $$ BEGIN
  CREATE TYPE marketplace AS ENUM (
    'US','CA','MX','BR',
    'UK','DE','FR','IT','ES','NL','SE','PL','TR',
    'AE','SA','IN','JP','AU','SG'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Subscription plans
DO $$ BEGIN
  CREATE TYPE plan_type AS ENUM ('free','starter','pro','agency');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Async job status (competitor analysis, batch scraping)
DO $$ BEGIN
  CREATE TYPE job_status AS ENUM ('pending','queued','processing','complete','failed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Competition density signal
DO $$ BEGIN
  CREATE TYPE competition_level AS ENUM ('low','medium','high','very_high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Shipping methods for the cost calculator
DO $$ BEGIN
  CREATE TYPE shipping_method AS ENUM ('air','sea','express','lcl');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Cost-calculator warning severity
DO $$ BEGIN
  CREATE TYPE warning_severity AS ENUM ('info','warning','critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Notification categories
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'price_drop','bsr_spike','bsr_drop','analysis_complete',
    'plan_limit','system','opportunity','supplier_match'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Search intent types
DO $$ BEGIN
  CREATE TYPE search_type AS ENUM ('keyword','asin','category','brand','supplier');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Supplier matching method
DO $$ BEGIN
  CREATE TYPE match_method AS ENUM ('semantic','keyword','manual','sp_api');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Opportunity signal category
DO $$ BEGIN
  CREATE TYPE opportunity_type AS ENUM ('pain_gap','price_gap','review_gap','bsr_trend','niche_entry','seasonal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Onboarding wizard steps (ordered)
DO $$ BEGIN
  CREATE TYPE onboarding_step AS ENUM (
    'marketplace','niche','business_model','goals',
    'first_search','save_product','run_calculator','complete'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Shared Utility Functions ──────────────────────────────────

-- Auto-update updated_at on any table
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- URL/path-safe slug from arbitrary text
CREATE OR REPLACE FUNCTION slugify(v TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT lower(
    regexp_replace(
      regexp_replace(trim(v), '[^a-zA-Z0-9\s\-]', '', 'g'),
      '[\s\-]+', '-', 'g'
    )
  );
$$;

-- Sanitize an ltree label (letters, digits, underscores only)
CREATE OR REPLACE FUNCTION to_ltree_label(v TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT regexp_replace(
    regexp_replace(lower(trim(v)), '[^a-z0-9]+', '_', 'g'),
    '^_|_$', '', 'g'
  );
$$;

-- Atomic usage counter increment — returns the new count.
-- Callers: edge functions enforcing plan limits.
CREATE OR REPLACE FUNCTION increment_usage_counter(
  p_user_id    UUID,
  p_key        TEXT,
  p_period     TEXT  DEFAULT 'daily'   -- 'daily' | 'monthly'
)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_period_start TIMESTAMPTZ;
  v_new_count    INT;
BEGIN
  v_period_start := CASE p_period
    WHEN 'daily'   THEN date_trunc('day', NOW() AT TIME ZONE 'UTC')
    WHEN 'monthly' THEN date_trunc('month', NOW() AT TIME ZONE 'UTC')
    ELSE date_trunc('day', NOW() AT TIME ZONE 'UTC')
  END;

  INSERT INTO usage_counters (user_id, counter_key, period_start, count)
    VALUES (p_user_id, p_key, v_period_start, 1)
  ON CONFLICT (user_id, counter_key, period_start)
  DO UPDATE SET
    count      = usage_counters.count + 1,
    updated_at = NOW()
  RETURNING count INTO v_new_count;

  RETURN v_new_count;
END;
$$;

-- Read current usage for a key/period (no increment)
CREATE OR REPLACE FUNCTION get_usage_count(
  p_user_id UUID,
  p_key     TEXT,
  p_period  TEXT DEFAULT 'daily'
)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_period_start TIMESTAMPTZ;
  v_count        INT;
BEGIN
  v_period_start := CASE p_period
    WHEN 'daily'   THEN date_trunc('day', NOW() AT TIME ZONE 'UTC')
    WHEN 'monthly' THEN date_trunc('month', NOW() AT TIME ZONE 'UTC')
    ELSE date_trunc('day', NOW() AT TIME ZONE 'UTC')
  END;

  SELECT COALESCE(count, 0)
    INTO v_count
    FROM usage_counters
   WHERE user_id     = p_user_id
     AND counter_key = p_key
     AND period_start = v_period_start;

  RETURN COALESCE(v_count, 0);
END;
$$;
