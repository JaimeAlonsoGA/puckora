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
drop function if exists public.extract_asin_age_months (text);

-- ─── VIEW: PRODUCT FINANCIALS ────────────────────────────────────────────────
--
-- One row per (asin, category) rank — both best_seller and organic ranks.
-- Only products with price IS NOT NULL are included.
--
-- Columns:
--   Identity        — asin, category_id, rank, rank_type, category_depth
--   Fees            — price, fba_fee, referral_fee, net_per_unit
--   BSR estimate    — monthly_units_bsr    (power law on canonical rank, see below)
--   Review estimate — monthly_units_review (review velocity / review rate)
--   Blended         — monthly_units        (weighted blend, dynamic weights)
--   Revenue         — monthly_revenue, monthly_net, daily_velocity
--   Confidence      — 'low' | 'medium' | 'high'
--   Meta            — product_age_months, observed_at
--   Quality         — product_type_mismatch (Amazon organic misclassification flag)
--
-- Confidence rules:
--   high   — price + both fees present, review_count >= 100, listing_date IS NOT NULL
--   medium — price present, at least one fee present OR review_count >= 20
--   low    — price present but fees missing AND review_count < 20
--            (products without price are excluded entirely)
--
-- ── BSR power law ──────────────────────────────────────────────────────────
-- monthly_units_bsr = A × canonical_rank^(-B)
--
-- CANONICAL RANK CONVENTION (2026-04-07):
--   The canonical BSR is the HIGHEST-NUMBERED best_seller rank at the shallowest
--   scraped depth. This matches Zoof/H10 which report the Amazon product-page BSR —
--   which is the rank in the most competitive (largest) main category.
--
--   Example: B06XCTP65H has depth-2 best_seller ranks in 3 categories:
--     rank  2 in "Patio > Outdoor Décor"       ← small niche, not main BSR
--     rank  5 in "Tools & Home > Lighting"      ← mid-size category
--     rank 22 in "Home & Kitchen > Lighting"    ← main competitive category
--   Zoof BSR = 22. Taking rank DESC (max at min depth) always matches.
--
--   Previous approach used rank ASC (min = rank 2) which gave 157k estimate vs
--   actual 33k sales — 4.7× overestimate purely from rank selection.
--
-- Coefficients calibrated 2026-04-07 against 165-product Zoof ground-truth
-- sample (cat scratching post, electric candles, hydroponics, portable charger).
-- Calibration method: median ideal-A = median(zoof_mo_sales × rank^B) per depth
-- using max-rank-at-shallowest-depth strategy.
--
--   depth 1   (root dept)          A = 375,000  B = 0.93  (alias of d2)
--   depth 2   (broad sub-dept)     A = 375,000  B = 0.93  (median ideal-A, n=7)
--   depth 3   (department level)   A =  90,000  B = 0.91  (median ideal-A, n=65)
--   depth 4   (category level)     A =   9,000  B = 0.91  (median ideal-A, n=71)
--   depth 5–6 (sub-category)       A = 114,000  B = 0.88  (median ideal-A, n=16)
--   depth 7–8 (deep leaf)          A =   4,000  B = 0.84  (no calibration data)
--   depth 9+  (very deep leaf)     A =     600  B = 0.80  (no calibration data)80  (no calibration data)
--
-- ── Review velocity ─────────────────────────────────────────────────────────
-- monthly_units_review = review_count / age_months / review_rate
--   review_rate = 0.037  (recalibrated 2026-04-08; back-solved from n=140 matched
--                         Zoof products: median 3.72%, P25=2.25%, P75=7.54%)
--   By keyword: electric candles 3.04%, hydroponic 4.51%, cat scratching 5.86%,
--               portable charger 1.54%  — 0.037 is the empirical overall median.
--   Note: rate varies ~4× across categories (Electronics ~1.5%, Pet ~6%).
--   Per-category rates are the logical next improvement.
--   Only computed when listing_date IS NOT NULL.
--
-- ── Blended weights (dynamic) ───────────────────────────────────────────────
--   age unknown                     bsr=1.00  review=0.00  (no review signal)
--   review_count < 20               bsr=0.90  review=0.10  (reviews unreliable)
--   review_count >= 100 & age known bsr=0.20  review=0.80  (reviews highly reliable)
--   canonical_rank > 5000           bsr=0.30  review=0.70  (BSR unreliable in long tail)
--   default                         bsr=0.40  review=0.60  (matches Zoof/H10 better)
--
-- product_type_mismatch:
--   true when Amazon's organic rank has placed a non-swimwear product_type into
--   a swimwear/bikini category. Frontend should filter or visually flag these rows.

drop view if exists public.product_financials;

create view public.product_financials as

with
    canonical_bsr as (
        -- Per-ASIN: the HIGHEST-NUMBERED best_seller rank at the shallowest scraped depth.
        --
        -- Rationale (discovered 2026-04-07 from Zoof BSR cross-check):
        --   A product like B06XCTP65H has three depth-2 best_seller entries:
        --     rank 2  in "Patio > Outdoor Décor"           (niche side-category)
        --     rank 5  in "Tools & Home > Lighting"          (mid-size category)
        --     rank 22 in "Home & Kitchen > Lighting"        (main, most competitive)
        --   Zoof reports BSR = 22. Taking rank DESC (highest number = most competitive
        --   category at shallowest depth) consistently matches the product-page BSR.
        --
        -- Performance: uses the denormalized category_depth column +
        --   partial composite index (asin, category_depth ASC, rank DESC)
        --   WHERE rank_type = 'best_seller'.  No join with amazon_categories needed.
        select distinct
            on (pcr.asin) pcr.asin,
            pcr.rank as bsr_rank,
            pcr.category_depth as bsr_depth,
            case
                when pcr.category_depth = 1 then 375000.0
                when pcr.category_depth = 2 then 375000.0
                when pcr.category_depth = 3 then 90000.0
                when pcr.category_depth = 4 then 9000.0
                when pcr.category_depth <= 6 then 114000.0
                when pcr.category_depth <= 8 then 4000.0
                else 600.0
            end as bsr_a,
            case
                when pcr.category_depth <= 2 then 0.93
                when pcr.category_depth <= 4 then 0.91
                when pcr.category_depth <= 6 then 0.88
                when pcr.category_depth <= 8 then 0.84
                else 0.80
            end as bsr_b
        from public.product_category_ranks pcr
        where
            pcr.rank_type = 'best_seller'
            and pcr.rank > 0
            and pcr.category_depth is not null
        order by pcr.asin, pcr.category_depth asc, pcr.rank desc -- max rank = most competitive
    ),
    base as (
        select
            p.asin,
            pcr.category_id,
            pcr.rank,
            pcr.rank_type,
            pcr.observed_at,
            ac.depth as category_depth,
            ac.full_path as category_path,
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
                when p.listing_date is not null then greatest(
                    extract(
                        year
                        from age (current_date, p.listing_date)
                    ) * 12 + extract(
                        month
                        from age (current_date, p.listing_date)
                    ),
                    1
                )::integer
                else null
            end as product_age_months,
            case
                when p.fba_fee is not null
                and p.referral_fee is not null then round(
                    (
                        p.price - p.fba_fee - p.referral_fee
                    )::numeric,
                    2
                )
                else null
            end as net_per_unit,
            case
                when p.fba_fee is not null
                and p.referral_fee is not null then round(
                    (p.fba_fee + p.referral_fee)::numeric,
                    2
                )
                else null
            end as total_amazon_fees,
            case
                when p.fba_fee is not null
                and p.referral_fee is not null
                and p.price > 0 then round(
                    (
                        (p.fba_fee + p.referral_fee) / p.price * 100
                    )::numeric,
                    1
                )
                else null
            end as amazon_fee_pct,
            -- BSR rank and coefficients come from canonical_bsr (shallowest best_seller rank).
            -- Fall back to this row's rank/depth when no best_seller data exists for this ASIN.
            coalesce(cb.bsr_rank, pcr.rank) as bsr_rank,
            coalesce(
                cb.bsr_a,
                case
                    when ac.depth = 1 then 375000.0
                    when ac.depth = 2 then 375000.0
                    when ac.depth = 3 then 90000.0
                    when ac.depth = 4 then 9000.0
                    when ac.depth <= 6 then 114000.0
                    when ac.depth <= 8 then 4000.0
                    else 600.0
                end
            ) as bsr_a,
            coalesce(
                cb.bsr_b,
                case
                    when ac.depth <= 2 then 0.93
                    when ac.depth <= 4 then 0.91
                    when ac.depth <= 6 then 0.88
                    when ac.depth <= 8 then 0.84
                    else 0.80
                end
            ) as bsr_b,
            (
                p.product_type in (
                    'SHIRT',
                    'APPAREL',
                    'TOPS',
                    'BLOUSE',
                    'SWEATER',
                    'JACKET',
                    'COAT',
                    'DRESS',
                    'PANTS',
                    'SKIRT'
                )
                and (
                    ac.full_path ilike '%swimwear%'
                    or ac.full_path ilike '%bikini%'
                    or ac.full_path ilike '%swimsuit%'
                    or ac.full_path ilike '%swim%'
                )
            ) as product_type_mismatch
        from
            public.amazon_products p
            join public.product_category_ranks pcr on pcr.asin = p.asin
            join public.amazon_categories ac on ac.id = pcr.category_id
            left join canonical_bsr cb on cb.asin = p.asin
        where
            p.price is not null
            and p.price > 0
            and pcr.rank > 0
    ),
    estimates as (
        select
            b.*,
            -- Use canonical bsr_rank (not per-row rank) so every row for the same ASIN
            -- carries the same, more accurate monthly_units_bsr estimate.
            round(
                b.bsr_a * power(b.bsr_rank::float, - b.bsr_b)
            )::integer as monthly_units_bsr,
            case
                when b.product_age_months is not null
                and b.review_count is not null
                and b.review_count > 0 then round(
                    b.review_count::float / b.product_age_months / 0.037
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
                when e.review_count < 20 then 0.90
                when e.review_count >= 100
                and e.product_age_months is not null then 0.35
                when e.bsr_rank > 5000 then 0.30
                else 0.55
            end as w_bsr,
            case
                when e.monthly_units_review is null then 0.00
                when e.review_count < 20 then 0.10
                when e.review_count >= 100
                and e.product_age_months is not null then 0.65
                when e.bsr_rank > 5000 then 0.70
                else 0.45
            end as w_review,
            case
                when e.fba_fee is not null
                and e.referral_fee is not null
                and e.review_count >= 100
                and e.product_age_months is not null then 'high'
                when e.fba_fee is not null
                or e.referral_fee is not null
                or coalesce(e.review_count, 0) >= 20 then 'medium'
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
    round(
        b.w_bsr * b.monthly_units_bsr + b.w_review * coalesce(b.monthly_units_review, 0)
    )::integer as monthly_units,
    round(
        (
            b.w_bsr * b.monthly_units_bsr + b.w_review * coalesce(b.monthly_units_review, 0)
        ) * b.price
    )::numeric(12, 2) as monthly_revenue,
    case
        when b.net_per_unit is not null then round(
            (
                b.w_bsr * b.monthly_units_bsr + b.w_review * coalesce(b.monthly_units_review, 0)
            ) * b.net_per_unit
        )::numeric(12, 2)
        else null
    end as monthly_net,
    round(
        (
            b.w_bsr * b.monthly_units_bsr + b.w_review * coalesce(b.monthly_units_review, 0)
        ) / 30.0,
        1
    ) as daily_velocity,
    b.w_bsr,
    b.w_review,
    b.confidence,
    b.product_type_mismatch,
    b.product_age_months,
    b.listing_date,
    case
        when b.product_age_months is not null
        and b.review_count is not null
        and b.review_count > 0 then round(
            (
                b.review_count::numeric / b.product_age_months
            ),
            2
        )
        else null
    end as review_rate_per_month,
    b.pkg_weight_kg,
    b.pkg_length_cm,
    b.pkg_width_cm,
    b.pkg_height_cm
from blended b;

comment on view public.product_financials is 'Real-time financial estimates per (asin, category_rank) pair.
   One row per rank — includes both best_seller and organic rank types.
   monthly_units_bsr is computed from the canonical (shallowest best_seller) rank
   for the ASIN — all rows for the same ASIN share the same BSR estimate.
   Excludes products without price. Confidence score signals estimate reliability.
   product_type_mismatch flags Amazon organic misclassification artefacts.
   Coefficients last calibrated 2026-04-07 against 165-product Zoof/H10 sample.
   No data is stored — all values computed live from amazon_products + product_category_ranks.';