-- Add demand-signal field scraped from Amazon search result HTML.
-- "+1K+ bought in past month" is parsed by the scraper, stored verbatim as an
-- integer count.  When present it overrides the BSR/review-blend in
-- product_financials so monthly_units reflects the exact Amazon signal.

ALTER TABLE amazon_products
ADD COLUMN IF NOT EXISTS bought_past_month integer;