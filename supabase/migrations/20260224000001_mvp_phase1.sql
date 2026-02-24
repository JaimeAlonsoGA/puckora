-- =============================================================================
-- MVP Phase 1 — Silkflow
-- Created: 2026-02-24
-- Tables: trending_products, referral_codes, referral_events, affiliate_profiles
-- Profile columns: experience_level, budget_range
-- RPC: resolve_referral
-- =============================================================================

-- ─── Profile enrichment ──────────────────────────────────────────────────────

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS experience_level text
        CHECK (experience_level IN ('beginner', 'researching', 'launched')),
    ADD COLUMN IF NOT EXISTS budget_range text
        CHECK (budget_range IN ('under_1k', '1k_3k', '3k_10k', 'over_10k'));

-- ─── Trending products ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.trending_products (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asin                text NOT NULL,
    title               text NOT NULL,
    image_url           text,
    bsr                 integer,
    monthly_sales_est   integer,
    price               numeric(10, 2),
    marketplace         text NOT NULL DEFAULT 'US',
    category            text,
    opportunity_score   numeric(5, 2),
    competition_score   numeric(5, 2),
    refreshed_at        timestamptz NOT NULL DEFAULT now(),
    created_at          timestamptz NOT NULL DEFAULT now(),
    UNIQUE (asin, marketplace)
);

-- Readable by anyone (public trending feed)
ALTER TABLE public.trending_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trending_products_public_read"
    ON public.trending_products
    FOR SELECT
    USING (true);

-- Index for the feed query
CREATE INDEX IF NOT EXISTS idx_trending_opp_score
    ON public.trending_products (opportunity_score DESC NULLS LAST);

-- ─── Referral infrastructure ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.referral_codes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    code        varchar(12) NOT NULL UNIQUE,
    created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referral_codes_owner_read"
    ON public.referral_codes
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "referral_codes_owner_insert"
    ON public.referral_codes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ─── Referral events ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.referral_events (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_user_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    referred_user_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_type          text NOT NULL CHECK (event_type IN ('signup', 'first_payment', 'renewal')),
    revenue_amount      numeric(10, 2),
    created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;

-- Referrer can read their own events
CREATE POLICY "referral_events_referrer_read"
    ON public.referral_events
    FOR SELECT
    USING (auth.uid() = referrer_user_id);

-- ─── Affiliate profiles ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.affiliate_profiles (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    commission_rate  numeric(5, 4) NOT NULL DEFAULT 0.30,
    payout_email     text,
    total_earned     numeric(10, 2) NOT NULL DEFAULT 0,
    status           text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'suspended')),
    created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.affiliate_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "affiliate_profiles_owner_read"
    ON public.affiliate_profiles
    FOR SELECT
    USING (auth.uid() = user_id);

-- ─── resolve_referral RPC ─────────────────────────────────────────────────────
-- Called during signup to associate a new user with their referrer.

CREATE OR REPLACE FUNCTION public.resolve_referral(
    p_code          varchar(12),
    p_new_user_id   uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_referrer_id uuid;
BEGIN
    -- Look up the referrer
    SELECT user_id INTO v_referrer_id
    FROM public.referral_codes
    WHERE code = p_code
    LIMIT 1;

    IF v_referrer_id IS NULL THEN
        RETURN; -- invalid code, silently ignore
    END IF;

    -- Prevent self-referral
    IF v_referrer_id = p_new_user_id THEN
        RETURN;
    END IF;

    -- Record the signup event
    INSERT INTO public.referral_events (referrer_user_id, referred_user_id, event_type)
    VALUES (v_referrer_id, p_new_user_id, 'signup')
    ON CONFLICT DO NOTHING;
END;
$$;
