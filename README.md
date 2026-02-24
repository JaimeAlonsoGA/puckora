# Silkflow

Amazon FBA product research SaaS platform — the only tool that calculates total landed cost from Alibaba to Amazon margin in a single guided flow.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS v4 (Vercel) |
| Business Logic | Supabase Edge Functions (Deno/TypeScript) |
| Data Layer | Supabase PostgreSQL + pg_vector |
| Scraping / NLP | Python FastAPI + Playwright (Fly.io) |
| Extension | Chrome MV3 + React + Vite CRXJS |

## Architecture

```
Frontend / Chrome Extension
        ↓
Supabase Edge Functions  ←→  Supabase DB (PostgreSQL + pg_vector)
        ↓
Python FastAPI (Fly.io)  ←→  Amazon / Alibaba / SP-API / Keepa / OpenAI
```

## Monorepo Packages

- `@repo/types` — shared TypeScript types
- `@repo/zod-schemas` — shared Zod validation schemas
- `@repo/ui` — shared React UI components
- `@repo/utils` — shared utilities (formatters, amazon helpers, FBA math)
- `@repo/eslint-config` — shared ESLint config
- `@repo/typescript-config` — shared tsconfig bases

## Getting Started

```bash
# Install dependencies
npm install

# Start frontend dev server
npm run dev:web

# Start Python scraper (requires Python 3.11+ and venv)
cd apps/scraper && pip install -r requirements.txt
npm run dev:scraper

# Type check all packages
npm run typecheck
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values.
Each app also has its own `.env.example`.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for step-by-step deployment instructions.

## Modules

1. Product Research Engine
2. Deep Product Analyzer
3. Total Cost Calculator (USP)
4. Supplier Bridge (Alibaba)
5. Saved Products & Tracker
6. Chrome Extension
7. Category Navigator (Embeddings)
8. Competitor Review Analyzer (NLP/AI)

See [docs/MODULES.md](docs/MODULES.md) for detailed module documentation.
