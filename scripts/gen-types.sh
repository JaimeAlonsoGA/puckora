#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SUPABASE_PROJECT_ID="gtypksowbkxxdptxsdbs"

echo "🔄 Generating Supabase types..."

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

echo "🔄 Generating index.ts..."
npx tsx "$PROJECT_ROOT/scripts/gen-index.ts"

echo "✅ Type generation complete!"
