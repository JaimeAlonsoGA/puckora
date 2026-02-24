#!/usr/bin/env bash
# scripts/deploy-functions.sh
# Deploy all Supabase Edge Functions.
# Usage: bash scripts/deploy-functions.sh

set -euo pipefail

FUNCTIONS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/supabase/functions"

FUNCTIONS=(
  products-search
  product-detail
  cost-estimate
  suppliers-search
  tracker-products
  categories-tree
  competitor-analyze
  competitor-result
  on-user-created
  stripe-webhook
  sp-api-lookup
)

echo "→ Deploying ${#FUNCTIONS[@]} Edge Functions..."

for fn in "${FUNCTIONS[@]}"; do
  echo "  Deploying $fn..."
  npx supabase functions deploy "$fn" --no-verify-jwt
done

echo ""
echo "✅ All Edge Functions deployed."
echo ""
echo "Remember to set secrets:"
echo "  npx supabase secrets set SCRAPER_SERVICE_URL=https://silkflow-scraper.fly.dev"
echo "  npx supabase secrets set SCRAPER_API_KEY=..."
