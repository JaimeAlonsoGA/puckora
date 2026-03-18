# Local Vectors

This setup keeps Fly.io as the source of truth for catalog data and stores semantic-search embeddings on the Mac running development services.

Current scope:

- The shared vector boundary lives entirely in `packages/vectors`.
- Operational commands are owned by `packages/vectors` and exposed from the repo root as `vectors:*` scripts.
- The document store is generic: vectors are keyed by source scope + document kind + document id.
- OpenAI is the primary embedding provider right now.
- Ollama stays installed as the fallback path if you later decide cost is too high.

## Runtime

- Local Postgres 17 with `pgvector`
- Primary embeddings: OpenAI `text-embedding-3-small`
- Fallback embeddings: local Ollama `nomic-embed-text`
- Source catalog: Fly.io Postgres via `DATABASE_URL`
- Optional local Fly tunnel override: `DATABASE_PROXY_URL`
- Local vector DB: `VECTOR_DATABASE_URL` or `postgresql://127.0.0.1:5432/puckora_vectors`

## Commands

From the repo root:

```bash
npm run remote:up
npm run remote:status
npm run remote:job -- status
npm run vectors:sync
npm run vectors:watch
npm run vectors:batch
npm run vectors:backfill
npm run vectors:status
npm run vectors:query -- --scope amazon --kind product "portable standing desk"
npm run vectors:rebuild
```

Directly from the package:

```bash
npm --prefix packages/vectors run sync
npm --prefix packages/vectors run watch
npm --prefix packages/vectors run batch
npm --prefix packages/vectors run backfill
npm --prefix packages/vectors run status
npm --prefix packages/vectors run query -- --scope amazon --kind product "portable standing desk"
npm --prefix packages/vectors run rebuild
```

The package scripts auto-load the workspace root `.env`, so running them from `packages/vectors` does not require manual `export` steps.

## Remote executor mode

If this Mac is acting as the always-on scraper/vector executor and you are developing from a laptop:

```bash
npm run remote:up
```

That command:

- installs a persistent userspace Tailscale launch agent
- ensures local Postgres 17 is available on `127.0.0.1:5432`
- ensures the Fly proxy is available on `127.0.0.1:15432`
- re-publishes the local vector Postgres to the tailnet on port `6543`

Status and job control:

```bash
npm run remote:status
npm run remote:job -- start scraper-amazon -- npm --prefix apps/scraper run scrape:amazon:resume
npm run remote:job -- start vectors-backfill -- npm --prefix packages/vectors run backfill
npm run remote:job -- status
npm run remote:job -- logs scraper-amazon
npm run remote:job -- stop scraper-amazon
```

Important:

- do not run a separate `vectors:watch` while `vectors:backfill` is still active
- `vectors:backfill` already switches to watch mode automatically once backlog is complete

## Sync behavior

- Reads registered vector sources from Fly.io Postgres
- Stores them in one generic vector document table keyed by source scope + document kind + document id
- Checkpoints progress per registered source in `runs/vectors/sync-state.json`
- Tracks pending OpenAI batch submissions in `runs/vectors/openai-batch-state.json`
- Re-embeds only when the normalized document text changes
- Updates local metadata even when the embedding hash is unchanged

In practice that means:

- First run: backfills all eligible documents for the configured sources
- Later runs: incrementally process only rows whose normalized embedding text changed
- Model or dimension change: requires a rebuild of the local vector table and checkpoint
- `npm run vectors:status` shows current cursor positions and any pending OpenAI batch details

Current registered source coverage:

- Amazon product documents embed: `price`, `title`, `bullet_points`, `product_type`
- Amazon keyword documents embed: `keyword`
- Amazon category documents embed: `name`, `breadcrumb`

Product metadata like brand and category path is still stored for display and filtering, but it is not part of the embedded text.

## What this is for

Practical uses in the project:

- Similar product search from a free-text query
- Product-to-product similarity (`show me products like this one`)
- Smarter suggestion generation for research flows
- Better matching between keywords, products, and supplier discovery flows
- Later, hybrid ranking when combined with structured metrics from `product_financials`

For the web app specifically, the current integration point is `apps/web/app/api/research/suggestions/route.ts`, which already consumes vector search results.

## Optional env vars

```bash
VECTOR_DATABASE_URL=postgresql://127.0.0.1:5432/puckora_vectors
VECTOR_EMBEDDING_PROVIDER=openai
VECTOR_EMBEDDING_MODEL=text-embedding-3-small
VECTOR_EMBEDDING_DIMENSIONS=1536
VECTOR_SYNC_BATCH_SIZE=25
VECTOR_SYNC_POLL_MS=30000
VECTOR_OPENAI_BATCH_SIZE=5000
VECTOR_OPENAI_BATCH_POLL_MS=300000
VECTOR_OLLAMA_BASE_URL=http://127.0.0.1:11434
VECTOR_SYNC_STATE_FILE=/absolute/path/to/sync-state.json
VECTOR_OPENAI_BATCH_STATE_FILE=/absolute/path/to/openai-batch-state.json
VECTOR_MIN_SCORE=0.5
VECTOR_QUERY_LIMIT=6
```

Fallback procedure:

1. Set `VECTOR_EMBEDDING_PROVIDER=ollama`
2. Set `VECTOR_EMBEDDING_MODEL=nomic-embed-text`
3. Set `VECTOR_EMBEDDING_DIMENSIONS=768`
4. Run `npm run vectors:rebuild`

## OpenAI bulk backfill

Manual chunk mode:

1. Run `npm run vectors:rebuild` once if you changed provider/model/dimensions.
2. Run `npm run vectors:batch` to submit the next bulk embedding job.
3. Re-run `npm run vectors:batch` later to poll and apply the result.
4. Re-run it again to submit the next chunk.
5. Keep `npm run vectors:watch` running separately if you want near-real-time updates while enrichment continues.

One-command mode:

1. Run `npm run vectors:rebuild` once if you changed provider/model/dimensions.
2. Run `npm run vectors:backfill`.
3. It will submit batches, poll them every `VECTOR_OPENAI_BATCH_POLL_MS`, apply results, submit the next chunk, and when no backlog remains it will automatically enter watch mode.

## Recommended live-safe scraper env

This is the conservative restart profile I recommend while the large enrichment run is active:

```bash
export SP_CATALOG_INTERVAL_MS=700
export SP_FEES_BATCH_INTERVAL_MS=3000
export SP_RETRY_MAX=3
export SP_RETRY_ON_429_MS=60000
export SP_RETRY_ON_503_MS=120000
export MAX_CATS_PER_RUN=6000
```

Then run:

```bash
npm run db:proxy
npm --prefix apps/scraper run scrape:amazon:resume
```

## Tailscale access

Once Tailscale is authenticated on the Mac, expose local Postgres to the tailnet instead of the public internet. The intended shape is:

- Mac hosts Postgres locally
- OpenAI generates embeddings by default; Ollama stays available on the Mac as the local fallback option
- Tailscale forwards tailnet TCP `6543` to local Postgres `5432`
- Laptop queries the Mac-hosted vector Postgres over the tailnet
- The laptop does not need direct Ollama access unless you intentionally switch provider back to `ollama`

Helper script:

```bash
bash scripts/tailscale-local-vectors.sh up
bash scripts/tailscale-local-vectors.sh serve
bash scripts/tailscale-local-vectors.sh status
```

Example target connection string from another machine:

```bash
postgresql://<mac-tailnet-ip>:6543/puckora_vectors
```

What to configure on the laptop:

1. Install Tailscale and join the same tailnet.
2. Verify the Mac tailnet address is reachable.
3. Set `VECTOR_DATABASE_URL` on the laptop to the Mac tailnet Postgres endpoint.
4. Use Tailscale SSH to connect to the Mac when you want to start, stop, or inspect scraper/vector jobs.
5. Start the app from the laptop.

SSH is the simplest control plane for remote development because it lets you:

- run `npm run remote:status`
- tail scraper/vector log files
- start or stop tracked background jobs
- inspect local Postgres / Fly proxy / Tailscale state directly on the Mac

Useful smoke tests on the Mac:

```bash
psql 'postgresql://127.0.0.1:5432/puckora_vectors' -Atqc "select current_database(), current_user;"
psql 'postgresql://127.0.0.1:5432/puckora_vectors' -Atqc "select count(*) from public.vector_documents;"
```

Root runtime note:

- `runs/remote-jobs/` is disposable runtime state created by `npm run remote:job -- ...`
- it contains PID files, logs, and command captures for detached jobs
- delete it only after the related detached jobs are stopped or no longer need their logs

Important:

- `npm run dev` on the laptop does not automatically discover this DB by magic.
- The app must read `VECTOR_DATABASE_URL` and use it for vector queries.
- The current repo includes the package-owned vector tooling, but the web app still needs explicit wiring wherever you want semantic search to appear.