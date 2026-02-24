# Scraper Strategy

## Architecture

The scraper is a Python 3.11 FastAPI service deployed to Fly.io.
It owns a pool of Playwright Chromium browsers and is called exclusively
by Supabase Edge Functions via `scraperClient` (authenticated with `X-API-Key`).

```
Edge Function → POST https://silkflow-scraper.fly.dev/<route>
                    Header: X-API-Key: <SCRAPER_API_KEY>
```

## Amazon Search Scraping

**URL**: `https://www.amazon.{tld}/s?k={query}&page={n}`

**Selector strategy** (robust to A/B tests):
- Items: `[data-component-type="s-search-result"]`
- ASIN: `data-asin` attribute on item
- Title: `h2 a span`
- Price: `.a-price .a-offscreen`
- Rating: `.a-icon-star-small .a-icon-alt`
- Review count: `[aria-label*="ratings"]`
- Image: `.s-image`

**Anti-bot measures**:
- Random User-Agent rotation (Chromium on Windows)
- Realistic locale / timezone (`en-US`, `America/New_York`)
- Rotating residential proxies (configured via `PROXY_URL` or `PROXY_LIST`)
- `wait_until="domcontentloaded"` — avoid triggering bot detection on networkidle

## Amazon Product Detail Scraping

**URL**: `https://www.amazon.{tld}/dp/{asin}`

**Key selectors**:
- Title: `#productTitle`
- Price: `.a-price .a-offscreen`
- Rating: `#acrPopover .a-icon-alt`
- Review count: `#acrCustomerReviewText`
- Bullet points: `#feature-bullets li span.a-list-item`
- Images: `#altImages img`
- BSR: `#SalesRank`

## Alibaba Scraping

**URL**: `https://www.alibaba.com/trade/search?SearchText={query}&page={n}`

**Key selectors**:
- Items: `.organic-list-item`
- Product ID: `data-product-id`
- Title: `.search-card-e-title span`
- Supplier: `.search-card-e-company`
- Price: `.search-card-e-price-main`
- Image: `img.search-image-gallery__item-img`

## SP-API Integration (Production)

Flow:
1. Exchange `SP_API_REFRESH_TOKEN` for access token via LWA:
   ```
   POST https://api.amazon.com/auth/o2/token
   grant_type=refresh_token&refresh_token=...&client_id=...&client_secret=...
   ```
2. Call `ProductFeesV0` API:
   ```
   GET https://sellingpartnerapi-na.amazon.com/products/fees/v0/items/{asin}/feesEstimate
   ```
3. Parse `FeesEstimateResult` → referral fee + FBA fulfillment fee

Currently stubbed in `apps/scraper/app/sp_api/fees.py`.

## Keepa Integration (Production)

Use the Keepa API to retrieve BSR history and price history:
```
GET https://api.keepa.com/product?key={KEEPA_API_KEY}&domain=1&asin={ASIN}&stats=1&history=1
```

Keepa returns compressed time-series arrays (Unix minutes encoding).
Decode with: `timestamp_ms = (keepa_time + 21564000) * 60000`

## Rate Limiting & Throttling

- Playwright pool: configurable size (default 2 concurrent browsers)
- Semaphore per pool slot to prevent overloading
- Add delays between requests for production (1–3s randomized)
- Respect Fly.io machine limits (see `fly.toml`: 2 CPUs + 2GB RAM)

## Proxy Rotation (Production)

Set `PROXY_URL` in `.env` for a single proxy, or extend `app/core/proxy.py`
with a list for round-robin rotation. Recommended providers:
- Oxylabs (residential)
- BrightData (residential + datacenter)
- SmartProxy
