# Deployment Guide

## Prerequisites

- Supabase project created at [supabase.com](https://supabase.com)
- Fly.io account + `flyctl` CLI installed
- Node.js ≥ 20, npm ≥ 10
- Python 3.11+
- Supabase CLI installed (`npm i -g supabase`)

---

## 1. Environment Setup

```bash
cp .env.example .env
# Fill in SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, etc.

cp apps/scraper/.env.example apps/scraper/.env
# Fill in API_KEY, SUPABASE_*, OPENAI_API_KEY, etc.
```

---

## 2. Database Setup

### Step 2a: Deploy Migrations

12 SQL migration files are ready in `supabase/migrations/` (00001-00012). They must be executed in order.

**Option A: Via Supabase Dashboard (Quickest)**
1. Go to: https://app.supabase.com/project/emgphxaontmuhhfsltpd/sql/new
2. For each file (00001 through 00012), copy entire SQL and run in order
3. Verify each completes without errors

**Option B: Via Supabase CLI (Teams)**
```bash
supabase link --project-ref emgphxaontmuhhfsltpd
supabase db push
```

**Option C: Direct psql Connection**
```bash
# Get connection string from Supabase Dashboard → Settings → Database
psql "postgresql://postgres:password@host:5432/postgres" -f supabase/migrations/00001_*.sql
# Repeat for each file 00002-00012
```

### Step 2b: Populate Categories & Generate Embeddings

Once migrations deploy, run the one-time setup:

```bash
node scripts/setup-embeddings.js
```

This imports 25,234 Amazon categories and generates OpenAI embeddings (~20-30 min total):
- Step 1: CSV import via `upsert_category()` RPC
- Step 2: OpenAI embedding generation (1536-dim vectors)
- Step 3: Verify semantic search with HNSW indexes

**Expected Output:**
```
✓ CSV Import Complete: 25234 total, 25234 inserted
✓ Embedding Generation Complete: 25234 total, 25234 embedded
✓ Semantic search working: 5 matches found
```

---

## 3. Generate TypeScript Types

```bash
npm run gen:types
# Writes to supabase/types.ts
```

---

## 4. Deploy Edge Functions

```bash
npm run deploy:functions
# Runs scripts/deploy-functions.sh
# Deploys all supabase/functions/* via `supabase functions deploy`
```

Set Edge Function secrets:
```bash
supabase secrets set SCRAPER_SERVICE_URL=https://silkflow-scraper.fly.dev
supabase secrets set SCRAPER_API_KEY=your-secret-key
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PRICE_STARTER=price_...
supabase secrets set STRIPE_PRICE_PRO=price_...
supabase secrets set STRIPE_PRICE_BUSINESS=price_...
```

---

## 5. Deploy Python Scraper

```bash
cd apps/scraper

# First deploy
flyctl launch --name silkflow-scraper --region iad

# Set secrets
flyctl secrets set API_KEY=your-secret-key
flyctl secrets set SUPABASE_URL=https://...supabase.co
flyctl secrets set SUPABASE_SERVICE_ROLE_KEY=...
flyctl secrets set OPENAI_API_KEY=sk-...

# Deploy
npm run deploy:scraper  # from root
# or
flyctl deploy           # from apps/scraper
```

---

## 6. Deploy Frontend

```bash
# Build
npm run build

# Deploy to Vercel (recommended)
vercel --prod

# Or Netlify
netlify deploy --prod --dir apps/web/dist
```

Set environment variables in Vercel/Netlify dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`

---

## 7. Chrome Extension

```bash
cd apps/extension
npm run build
# Produces dist/ — load as unpacked extension in Chrome Dev Tools
# For production: submit dist/ to Chrome Web Store
```

---

## CI/CD

See `.github/workflows/ci.yml` (lint + typecheck + build on every PR)
and `.github/workflows/deploy.yml` (deploy on push to `main`).
