#!/usr/bin/env bash
set -euo pipefail

# Type generation strategy:
#   Supabase  → packages/types/src/database.types.ts  (auth, users, scrape_jobs)
#               Generated via `supabase gen types` from the remote project.
#   Fly.io PG → packages/db/src/schema/            (product catalog, categories, keywords)
#               packages/types/src/catalog.types.ts is generated from the Drizzle schema.
#               packages/types/src/index.ts is generated to combine:
#                 - Supabase-owned app types from database.types.ts
#                 - Fly-owned catalog types from catalog.types.ts

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SUPABASE_PROJECT_ID="gtypksowbkxxdptxsdbs"

echo "🔄 Generating Supabase types (auth / scrape_jobs / users)..."

# If SUPABASE_PROJECT_ID is set, generate from remote; otherwise skip
if [ -n "${SUPABASE_PROJECT_ID:-}" ]; then
  npx supabase gen types typescript \
    --project-id "$SUPABASE_PROJECT_ID" \
    > "$PROJECT_ROOT/packages/types/src/database.types.ts"
  echo "✅ database.types.ts generated from Supabase project"
else
  echo "⚠️  SUPABASE_PROJECT_ID not set — skipping remote type generation"
  echo "   Using existing database.types.ts"
fi

echo "🔄 Generating Fly catalog facade types..."
npx tsx "$PROJECT_ROOT/scripts/gen-catalog-types.ts"

echo "🔄 Generating index.ts..."
npx tsx "$PROJECT_ROOT/scripts/gen-index.ts"

echo "✅ Type generation complete!"
