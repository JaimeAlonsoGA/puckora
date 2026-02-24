# API Contracts

All Edge Functions are deployed to:
```
https://<project>.supabase.co/functions/v1/<function-name>
```

Every request requires:
```
Authorization: Bearer <supabase_jwt>
Content-Type: application/json
```

---

## Products Search
`GET /products-search`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | ✅ | Search query |
| `marketplace` | string | — | Default `US` |
| `page` | number | — | Default `1` |
| `min_price` | number | — | Filter |
| `max_price` | number | — | Filter |

**Response** `200 ApiSuccess<AmazonSearchResponse>`

---

## Product Detail
`GET /product-detail`

| Param | Type | Required |
|-------|------|----------|
| `asin` | string | ✅ |
| `marketplace` | string | — |

**Response** `200 ApiSuccess<AmazonProductDetail>`

---

## Cost Estimate
`POST /cost-estimate`

**Body** `CostCalculatorInput` (see `@repo/zod-schemas/src/calculator.ts`)

**Response** `200 ApiSuccess<{ fba_fee, referral_fee, total_fees, ... }>`

---

## Suppliers Search
`GET /suppliers-search`

| Param | Type | Required |
|-------|------|----------|
| `q` | string | ✅ |
| `page` | number | — |

**Response** `200 ApiSuccess<AlibabaSearchResponse>`

---

## Tracker Products
Multi-method endpoint:

| Method | Description |
|--------|-------------|
| `GET /tracker-products` | List saved products |
| `POST /tracker-products` | Save product (body: `SaveProductInput`) |
| `PATCH /tracker-products` | Update saved product (body: `{ id, ...updates }`) |
| `DELETE /tracker-products?id=` | Delete saved product |

---

## Categories Tree
`GET /categories-tree`

| Param | Type | Description |
|-------|------|-------------|
| `action` | `search` | If present: semantic search |
| `query` | string | Required when `action=search` |

**Response** `200 ApiSuccess<CategoryNode[]>`

---

## Competitor Analyze
`POST /competitor-analyze`

**Body:**
```json
{ "asin": "B08XYZ1234", "marketplace": "US", "depth": 2 }
```

**Response** `202 ApiSuccess<{ id: string, status: "pending" }>`

---

## Competitor Result
`GET /competitor-result?id=<analysis_id>`

**Response** `200 ApiSuccess<CompetitorAnalysis & { pain_point_clusters: PainPointCluster[] }>`

---

## Error Shape
All errors follow:
```json
{
  "error": "Human-readable message",
  "code": "OPTIONAL_ERROR_CODE"
}
```

Common HTTP codes:
- `400` — validation error
- `401` — missing/invalid JWT
- `403` — plan limit exceeded
- `404` — resource not found
- `502` — scraper/upstream error
