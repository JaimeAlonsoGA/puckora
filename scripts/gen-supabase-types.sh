#!/usr/bin/env bash
# scripts/gen-supabase-types.sh
# Regenerate TypeScript types from Supabase schema.
# Usage: bash scripts/gen-supabase-types.sh

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "→ Generating Supabase types..."
npx supabase gen types typescript \
  --project-id "$(grep SUPABASE_PROJECT_ID "$PROJECT_DIR/.env" | cut -d= -f2 | tr -d '"')" \
  --schema public \
  > "$PROJECT_DIR/supabase/types.ts"

echo "✅ supabase/types.ts updated"
