-- ─────────────────────────────────────────────────────────────────────────────
-- Puckora — Product Financials Module
-- Run in Supabase SQL Editor after core migration
--
-- Delivers:
--   1. product_financials  — the finance view
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

-- Drop first so we can freely add/reorder columns without hitting
-- "cannot change name of view column" from CREATE OR REPLACE VIEW.
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

    -- Raw product fields
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

    -- ASIN age — computed from listing_date (populated by SP-API summaries.listingDate)
    -- NULL for products scraped before the listing_date column was added
    case
      when p.listing_date is not null
        then greatest(
          extract(year  from age(current_date, p.listing_date)) * 12
          + extract(month from age(current_date, p.listing_date)),
          1
        )::integer
      else null
    end                                       as product_age_months,

    -- Net per unit — what seller keeps after Amazon's cut
    -- null if either fee is missing (no silent estimation)
    case
      when p.fba_fee is not null and p.referral_fee is not null
        then round((p.price - p.fba_fee - p.referral_fee)::numeric, 2)
      else null
    end                                   as net_per_unit,

    -- Total Amazon fees combined
    case
      when p.fba_fee is not null and p.referral_fee is not null
        then round((p.fba_fee + p.referral_fee)::numeric, 2)
      else null
    end                                   as total_amazon_fees,

    -- Amazon fee % of price (useful for margin analysis)
    case
      when p.fba_fee is not null and p.referral_fee is not null and p.price > 0
        then round(((p.fba_fee + p.referral_fee) / p.price * 100)::numeric, 1)
      else null
    end                                   as amazon_fee_pct,

    -- ── BSR power law coefficients by depth tier ─────────────────────────────
    -- Calibrated 2026-03-08 against review velocity data.
    -- depth 9+ uses A=600, B=0.80: rank#1→600, rank#5→186, rank#10→119 units/month.
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

    -- ── Data-quality: product type vs category mismatch ──────────────────────
    -- FIX (2026-03-08): Flags ASINs where Amazon's organic rank has placed a
    -- clearly non-swimwear product_type into a swimwear/bikini category.
    -- These are Amazon classification artefacts, not scraper bugs.
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

    -- ── BSR estimate (always computable when rank exists) ────────────────────
    round(b.bsr_a * power(b.rank::float, -b.bsr_b))::integer
                                          as monthly_units_bsr,

    -- ── Review velocity estimate (only for B0 ASINs with enough reviews) ────
    -- Null when age unknown or review_count is null
    case
      when b.product_age_months is not null
       and b.review_count is not null
       and b.review_count > 0
        then round(
          b.review_count::float
          / b.product_age_months
          / 0.02
        )::integer
      else null
    end                                   as monthly_units_review

  from base b
),

blended as (
  select
    e.*,

    -- ── Dynamic weight selection ──────────────────────────────────────────────
    case
      when e.monthly_units_review is null           then 1.00   -- no age data
      when e.review_count < 20                      then 0.95   -- too few reviews
      when e.rank > 5000                            then 0.45   -- long tail
      else                                               0.65   -- default
    end                                   as w_bsr,

    case
      when e.monthly_units_review is null           then 0.00
      when e.review_count < 20                      then 0.05
      when e.rank > 5000                            then 0.55
      else                                               0.35
    end                                   as w_review,

    -- ── Confidence score ─────────────────────────────────────────────────────
    case
      when e.fba_fee is not null
       and e.referral_fee is not null
       and e.review_count >= 100
       and e.rank <= 500
        then 'high'
      when e.fba_fee is not null
        or  e.referral_fee is not null
        or  coalesce(e.review_count, 0) >= 20
        then 'medium'
      else 'low'
    end                                   as confidence

  from estimates e
)

select
  -- ── Identity ─────────────────────────────────────────────────────────────
  b.asin,
  b.category_id,
  b.rank,
  b.rank_type,
  b.category_depth,
  b.category_path,
  b.observed_at,

  -- ── Product snapshot ─────────────────────────────────────────────────────
  b.title,
  b.brand,
  b.product_type,
  b.main_image_url,
  b.price,
  b.rating,
  b.review_count,

  -- ── Fees ─────────────────────────────────────────────────────────────────
  b.fba_fee,
  b.referral_fee,
  b.total_amazon_fees,
  b.amazon_fee_pct,
  b.net_per_unit,

  -- ── Unit estimates ────────────────────────────────────────────────────────
  b.monthly_units_bsr,
  b.monthly_units_review,

  -- ── Blended monthly units ─────────────────────────────────────────────────
  round(
    b.w_bsr    * b.monthly_units_bsr
    + b.w_review * coalesce(b.monthly_units_review, 0)
  )::integer                              as monthly_units,

  -- ── Revenue ───────────────────────────────────────────────────────────────
  round(
    (b.w_bsr * b.monthly_units_bsr + b.w_review * coalesce(b.monthly_units_review, 0))
    * b.price
  )::numeric(12,2)                        as monthly_revenue,

  -- ── Net profit (null when fees unavailable — no silent estimation) ────────
  case
    when b.net_per_unit is not null
      then round(
        (b.w_bsr * b.monthly_units_bsr + b.w_review * coalesce(b.monthly_units_review, 0))
        * b.net_per_unit
      )::numeric(12,2)
    else null
  end                                     as monthly_net,

  -- ── Daily velocity ────────────────────────────────────────────────────────
  round(
    (b.w_bsr * b.monthly_units_bsr + b.w_review * coalesce(b.monthly_units_review, 0))
    / 30.0
  , 1)                                    as daily_velocity,

  -- ── Weights used (useful for debugging + frontend tooltips) ──────────────
  b.w_bsr,
  b.w_review,

  -- ── Confidence ────────────────────────────────────────────────────────────
  b.confidence,

  -- ── Data quality ─────────────────────────────────────────────────────────
  b.product_type_mismatch,

  -- ── Meta ──────────────────────────────────────────────────────────────────
  b.product_age_months,
  b.listing_date,

  -- Reviews acquired per month since listing (proxy for sales velocity)
  -- Null when listing_date or review_count is unavailable
  case
    when b.product_age_months is not null
     and b.review_count is not null
     and b.review_count > 0
      then round((b.review_count::numeric / b.product_age_months), 2)
    else null
  end                                     as review_rate_per_month,

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


-- ─── USAGE EXAMPLES ──────────────────────────────────────────────────────────
--
-- Top 20 products in a category by estimated monthly revenue:
--   SELECT asin, title, rank, monthly_units, monthly_revenue, monthly_net, confidence
--   FROM product_financials
--   WHERE category_id = '5016321011'
--     AND rank_type = 'best_seller'
--   ORDER BY monthly_revenue DESC
--   LIMIT 20;
--
-- Same query but excluding Amazon misclassifications:
--   SELECT asin, title, rank, monthly_units, monthly_revenue, confidence
--   FROM product_financials
--   WHERE category_id = '23709663011'
--     AND rank_type = 'best_seller'
--     AND product_type_mismatch = false
--   ORDER BY monthly_revenue DESC
--   LIMIT 20;
--
-- All estimates for a single ASIN across every category it ranks in:
--   SELECT category_id, category_path, rank, rank_type,
--          monthly_units, monthly_revenue, confidence
--   FROM product_financials
--   WHERE asin = 'B09NXRJV11'
--   ORDER BY rank_type, rank;
--
-- Category-level aggregate (total addressable demand):
--   SELECT category_id, category_path,
--          COUNT(*)                          AS products,
--          SUM(monthly_units)                AS total_monthly_units,
--          SUM(monthly_revenue)              AS total_monthly_revenue,
--          ROUND(AVG(monthly_net),2)         AS avg_net_per_product,
--          COUNT(*) FILTER (WHERE confidence = 'high')          AS high_confidence_count,
--          COUNT(*) FILTER (WHERE product_type_mismatch = true) AS misclassified_count
--   FROM product_financials
--   WHERE rank_type = 'best_seller'
--   GROUP BY category_id, category_path
--   ORDER BY total_monthly_revenue DESC;
--
-- Review velocity for a single ASIN (reviews/month since listing → inferred sales):
--   SELECT asin, title, listing_date, product_age_months, review_count,
--          review_rate_per_month,
--          round(review_rate_per_month / 0.02) AS implied_monthly_sales
--   FROM product_financials
--   WHERE asin = 'B0FGFSSYQX';
