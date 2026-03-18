#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# migrate-to-flyio.sh
#
# Historical one-time migration: Supabase → Fly.io Postgres
#
# This script exists only for the original catalog move from Supabase to Fly.
# It is not part of the steady-state architecture. Current catalog/category/
# keyword/rank ownership is Fly.io Postgres; Supabase retains only auth,
# users, scrape_jobs, and lightweight scrape_progress.
#
# Prerequisites:
#   - pg_dump / pg_restore (Postgres client tools) installed
#   - SUPABASE_DB_URL  — connection to Supabase (direct or session pooler)
#       format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
#            or postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-*.pooler.supabase.com:5432/postgres
#   - DATABASE_URL     — Fly.io Postgres connection string
#       obtained via: fly postgres connect -a <app-name>  or from fly.io dashboard
#
# Usage:
#   SUPABASE_DB_URL="postgresql://..." DATABASE_URL="postgresql://..." bash scripts/migrate-to-flyio.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

: "${SUPABASE_DB_URL:?  SUPABASE_DB_URL must be set}"
: "${DATABASE_URL:?      DATABASE_URL (Fly.io) must be set}"

DUMP_DIR="$(mktemp -d)"
SCHEMA_DUMP="$DUMP_DIR/schema.sql"
DATA_DUMP="$DUMP_DIR/data.dump"

# Tables to migrate from the legacy Supabase catalog layout
# (auth/app tables stay in Supabase)
TABLES=(
    amazon_categories
    amazon_products
    product_category_ranks
    amazon_keywords
    amazon_keyword_products
    gs_categories
    gs_suppliers
    gs_products
)

# Build -t flags for pg_dump
TABLE_FLAGS=()
for t in "${TABLES[@]}"; do
    TABLE_FLAGS+=("-t" "$t")
done

echo ""
echo "━━━  Puckora DB migration: Supabase → Fly.io  ━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Step 1/5 — Preparing Fly.io schema bootstrap..."
psql "$DATABASE_URL" <<'SQL'
DROP VIEW IF EXISTS public.product_financials CASCADE;
DROP VIEW IF EXISTS public.scrape_progress CASCADE;

DROP TABLE IF EXISTS public.amazon_keyword_products CASCADE;
DROP TABLE IF EXISTS public.product_category_ranks CASCADE;
DROP TABLE IF EXISTS public.amazon_keywords CASCADE;
DROP TABLE IF EXISTS public.amazon_products CASCADE;
DROP TABLE IF EXISTS public.amazon_categories CASCADE;
DROP TABLE IF EXISTS public.gs_products CASCADE;
DROP TABLE IF EXISTS public.gs_suppliers CASCADE;
DROP TABLE IF EXISTS public.gs_categories CASCADE;

DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;

DROP TYPE IF EXISTS public.category_scrape_status CASCADE;
DROP TYPE IF EXISTS public.product_scrape_status CASCADE;
DROP TYPE IF EXISTS public.gs_category_scrape_status CASCADE;
DROP TYPE IF EXISTS public.gs_scrape_status CASCADE;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE public.category_scrape_status AS ENUM ('pending', 'scraped', 'failed');
CREATE TYPE public.product_scrape_status AS ENUM ('scraped', 'enriched', 'enrichment_failed');
CREATE TYPE public.gs_category_scrape_status AS ENUM ('pending', 'scraped', 'failed');
CREATE TYPE public.gs_scrape_status AS ENUM ('scraped', 'failed');
SQL
echo "  ✓ extensions ready"
echo ""

echo "Step 2/5 — Dumping schema from Supabase (tables only)..."
# --schema-only: DDL only (tables, indexes, constraints)
# --no-owner: skip OWNER TO postgres (Fly.io user differs)
# --no-acl: skip GRANT/REVOKE (Supabase RLS doesn't apply on Fly.io)
# --no-comments: skip COMMENTs to keep it clean
pg_dump \
    --schema-only \
    --no-owner \
    --no-acl \
    --schema=public \
    "${TABLE_FLAGS[@]}" \
    "$SUPABASE_DB_URL" \
    -f "$SCHEMA_DUMP"

# Fly's unmanaged postgres-flex image does not ship pgvector.
# Keep the embedding payload as text for now so the catalog migration can proceed.
perl -0pi -e 's/public\.vector\(1536\)/text/g; s/\bvector\(1536\)/text/g' "$SCHEMA_DUMP"

# Supabase schema dumps can contain RLS / auth-specific statements that don't belong on Fly.
perl -0pi -e 's/^CREATE POLICY\b.*?;\n//msg; s/^ALTER TABLE(?: ONLY)? .* (?:ENABLE|FORCE) ROW LEVEL SECURITY;\n//mg; s/^.*\bauthenticated\b.*\n//mg; s/^.*\banon\b.*\n//mg; s/^.*\bauth\.[^\n]*\n//mg; s/^.*set_updated_at\(\).*\n//mg' "$SCHEMA_DUMP"
echo "  ✓ schema dumped to $SCHEMA_DUMP"
echo ""

echo "Step 3/5 — Applying schema to Fly.io..."
psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f "$SCHEMA_DUMP"
echo "  ✓ schema applied"
echo ""

echo "Step 4/5 — Dumping data from Supabase (custom format for parallel restore)..."
pg_dump \
    --data-only \
    --no-owner \
    --format=custom \
    --compress=4 \
    "${TABLE_FLAGS[@]}" \
    "$SUPABASE_DB_URL" \
    -f "$DATA_DUMP"
echo "  ✓ data dumped to $DATA_DUMP ($(du -sh "$DATA_DUMP" | cut -f1))"
echo ""

echo "Step 5/5 — Restoring data to Fly.io (4 parallel workers)..."
pg_restore \
    --no-owner \
    --disable-triggers \
    --jobs=4 \
    -d "$DATABASE_URL" \
    "$DATA_DUMP"
echo "  ✓ restore complete"
echo ""

echo "━━━  Verifying row counts  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
for t in "${TABLES[@]}"; do
    SB=$(psql "$SUPABASE_DB_URL" -t -c "SELECT COUNT(*) FROM $t;" | tr -d ' ')
    FLY=$(psql "$DATABASE_URL"   -t -c "SELECT COUNT(*) FROM $t;" | tr -d ' ')
    STATUS="✓"
    [[ "$SB" != "$FLY" ]] && STATUS="✗ MISMATCH"
    printf "  %s  %-40s  supabase=%-8s  fly=%s\n" "$STATUS" "$t" "$SB" "$FLY"
done
echo ""
echo "Migration complete. Clean up temp files: rm -rf $DUMP_DIR"
