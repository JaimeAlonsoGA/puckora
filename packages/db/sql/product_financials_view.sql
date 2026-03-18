-- ─────────────────────────────────────────────────────────────────────────────
-- Puckora — Product Financials Module
-- Fly.io Postgres reference SQL
--
-- Historical note:
-- This SQL used to live under supabase/migrations, but the catalog tables and
-- this view now belong to Fly.io Postgres. It must not be applied to Supabase
-- after the cleanup migration removes catalog concerns from that database.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── SCHEMA DELTA ────────────────────────────────────────────────────────────
-- Idempotent: adds listing_date to existing tables if not already present.

alter table public.amazon_products
  add column if not exists listing_date date;


-- Drop the old ASIN-decode helper — listing_date is the definitive source now.
drop function if exists public.extract_asin_age_months(text);


-- ─── VIEW: PRODUCT FINANCIALS ────────────────────────────────────────────────
--
-- One row per (asin, category) rank — both best_seller and organic ranks.
-- Only products with price IS NOT NULL are included.
--
-- Columns:
--   Identity        — asin, category_id, rank, rank_type, category_depth
--   Fees            — price, fba_fee, referral_fee, net_per_unit
--   BSR estimate    — monthly_units_bsr    (power law on rank + category depth)
--   Review estimate — monthly_units_review (review velocity / review rate)
--   Blended         — monthly_units        (weighted blend, dynamic weights)
--   Revenue         — monthly_revenue, monthly_net, daily_velocity
--   Confidence      — 'low' | 'medium' | 'high'
--   Meta            — product_age_months, observed_at
--   Quality         — product_type_mismatch (Amazon organic misclassification flag)
--
-- Confidence rules:
--   high   — price + both fees present, review_count >= 100, rank <= 500
--   medium — price present, at least one fee present OR review_count >= 20
--   low    — price present but fees missing AND review_count < 20
--            (products without price are excluded entirely)
--
-- BSR power law: monthly_units = A × rank^(-B)
-- Coefficients calibrated by category depth as volume tier proxy:
--   depth 1–2  (top-level dept)   A = 350,000  B = 0.93
--   depth 3–4  (mid-level)        A = 120,000  B = 0.91
--   depth 5–6  (subcategory)      A =  25,000  B = 0.88  (was 35k)
--   depth 7–8  (deep leaf)        A =   4,000  B = 0.84  (was 8k)
--   depth 9+   (very deep leaf)   A =     600  B = 0.80  (was 2k)
--   Calibrated 2026-03-08: depth 9+ rank #1 = ~600 units/month, cross-checked
--   against review velocity for B07NYT8T9T (567 reviews / 85 months / 0.02 = 333).
--   Post-run calibration: for each tier, find median review_count/age/0.02 at rank ~50.
--
-- Review velocity: monthly_units = review_count / age_months / review_rate
--   review_rate = 0.02 (industry consensus: ~2% of buyers leave a review)
--   Only computed when listing_date is present (populated by SP-API product_site_launch_date)
--
-- Blended weights (dynamic):
--   Default          bsr=0.65  review=0.35
--   review_count<20  bsr=0.95  review=0.05   (not enough reviews to trust)
--   rank>5000        bsr=0.45  review=0.55   (BSR unreliable in long tail)
--   age unknown      bsr=1.00  review=0.00   (listing_date unavailable)
--
-- product_type_mismatch:
--   true when Amazon's organic rank has placed a non-swimwear product_type into
--   a swimwear/bikini category. Frontend should filter or visually flag these rows.

drop view if exists public.product_financials;

create view public.product_financials as

with base as (
  select
    p.asin,
    pcr.category_id,
    pcr.rank,
    pcr.rank_type,
    pcr.observed_at,
    ac.depth                              as category_depth,
    ac.full_path                          as category_path,
    p.price,
    p.fba_fee,
    p.referral_fee,
    p.review_count,
    p.rating,
    p.title,
    p.brand,
    p.product_type,
    p.main_image_url,
    p.pkg_weight_kg,
    p.pkg_length_cm,
    p.pkg_width_cm,
    p.pkg_height_cm,
    p.listing_date,
    case
      when p.listing_date is not null
        then greatest(
          extract(year  from age(current_date, p.listing_date)) * 12
          + extract(month from age(current_date, p.listing_date)),
          1
        )::integer
      else null
    end                                       as product_age_months,
    case
      when p.fba_fee is not null and p.referral_fee is not null
        then round((p.price - p.fba_fee - p.referral_fee)::numeric, 2)
      else null
    end                                   as net_per_unit,
    case
      when p.fba_fee is not null and p.referral_fee is not null
        then round((p.fba_fee + p.referral_fee)::numeric, 2)
      else null
    end                                   as total_amazon_fees,
    case
      when p.fba_fee is not null and p.referral_fee is not null and p.price > 0
        then round(((p.fba_fee + p.referral_fee) / p.price * 100)::numeric, 1)
      else null
    end                                   as amazon_fee_pct,
    case
      when ac.depth <= 2 then 350000.0
      when ac.depth <= 4 then 120000.0
      when ac.depth <= 6 then  25000.0
      when ac.depth <= 8 then   4000.0
      else                        600.0
    end                                   as bsr_a,
    case
      when ac.depth <= 2 then 0.93
      when ac.depth <= 4 then 0.91
      when ac.depth <= 6 then 0.88
      when ac.depth <= 8 then 0.84
      else                    0.80
    end                                   as bsr_b,
    (
      p.product_type in (
        'SHIRT', 'APPAREL', 'TOPS', 'BLOUSE', 'SWEATER',
        'JACKET', 'COAT', 'DRESS', 'PANTS', 'SKIRT'
      )
      and (
        ac.full_path ilike '%swimwear%'
        or ac.full_path ilike '%bikini%'
        or ac.full_path ilike '%swimsuit%'
        or ac.full_path ilike '%swim%'
      )
    )                                     as product_type_mismatch
  from public.amazon_products p
  join public.product_category_ranks pcr on pcr.asin = p.asin
  join public.amazon_categories ac       on ac.id = pcr.category_id
  where p.price is not null
    and p.price > 0
    and pcr.rank > 0
),
estimates as (
  select
    b.*,
    round(b.bsr_a * power(b.rank::float, -b.bsr_b))::integer as monthly_units_bsr,
    case
      when b.product_age_months is not null
       and b.review_count is not null
       and b.review_count > 0
        then round(
          b.review_count::float / b.product_age_months / 0.02
        )::integer
      else null
    end as monthly_units_review
  from base b
),
blended as (
  select
    e.*,
    case
      when e.monthly_units_review is null then 1.00
      when e.review_count < 20 then 0.95
      when e.rank > 5000 then 0.45
      else 0.65
    end as w_bsr,
    case
      when e.monthly_units_review is null then 0.00
      when e.review_count < 20 then 0.05
      when e.rank > 5000 then 0.55
      else 0.35
    end as w_review,
    case
      when e.fba_fee is not null
       and e.referral_fee is not null
       and e.review_count >= 100
       and e.rank <= 500
        then 'high'
      when e.fba_fee is not null
        or e.referral_fee is not null
        or coalesce(e.review_count, 0) >= 20
        then 'medium'
      else 'low'
    end as confidence
  from estimates e
)
select
  b.asin,
  b.category_id,
  b.rank,
  b.rank_type,
  b.category_depth,
  b.category_path,
  b.observed_at,
  b.title,
  b.brand,
  b.product_type,
  b.main_image_url,
  b.price,
  b.rating,
  b.review_count,
  b.fba_fee,
  b.referral_fee,
  b.total_amazon_fees,
  b.amazon_fee_pct,
  b.net_per_unit,
  b.monthly_units_bsr,
  b.monthly_units_review,
  round(b.w_bsr * b.monthly_units_bsr + b.w_review * coalesce(b.monthly_units_review, 0))::integer as monthly_units,
  round((b.w_bsr * b.monthly_units_bsr + b.w_review * coalesce(b.monthly_units_review, 0)) * b.price)::numeric(12,2) as monthly_revenue,
  case
    when b.net_per_unit is not null
      then round(
        (b.w_bsr * b.monthly_units_bsr + b.w_review * coalesce(b.monthly_units_review, 0))
        * b.net_per_unit
      )::numeric(12,2)
    else null
  end as monthly_net,
  round((b.w_bsr * b.monthly_units_bsr + b.w_review * coalesce(b.monthly_units_review, 0)) / 30.0, 1) as daily_velocity,
  b.w_bsr,
  b.w_review,
  b.confidence,
  b.product_type_mismatch,
  b.product_age_months,
  b.listing_date,
  case
    when b.product_age_months is not null
     and b.review_count is not null
     and b.review_count > 0
      then round((b.review_count::numeric / b.product_age_months), 2)
    else null
  end as review_rate_per_month,
  b.pkg_weight_kg,
  b.pkg_length_cm,
  b.pkg_width_cm,
  b.pkg_height_cm
from blended b;

comment on view public.product_financials is
  'Real-time financial estimates per (asin, category_rank) pair.
   One row per rank — includes both best_seller and organic rank types.
   Excludes products without price. Confidence score signals estimate reliability.
   product_type_mismatch flags Amazon organic misclassification artefacts.
   No data is stored — all values computed live from amazon_products + product_category_ranks.';