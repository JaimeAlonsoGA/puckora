-- ---------------------------------------------------------------------------
-- public.scrape_jobs
--
-- Job queue for the scraping system.
--
-- Jobs are inserted by the web app (user-initiated searches / product lookups)
-- and consumed by the Chrome extension (executor = 'extension') or the
-- server-side Apify runner (executor = 'agent').
--
-- Supabase Realtime is enabled on this table so the extension can subscribe
-- to its own pending jobs without polling.
--
-- Status transitions:
--   pending → processing → done
--                        ↘ failed
--
-- Rules:
--   • user_id is a 1:1 FK to public.users (cascading delete).
--   • RLS: users can only see and write their own rows.
--   • The admin/service-role client bypasses RLS for the enrich endpoint.
-- ---------------------------------------------------------------------------

create table public.scrape_jobs (
    id           uuid        primary key default gen_random_uuid(),
    user_id      uuid        not null
                             references public.users (id)
                             on delete cascade,
    -- Discriminated job type — matches ScrapeJobPayload.type in scraper-core
    type         text        not null,
    -- Lifecycle status (SCRAPE_JOB_STATUSES constant in @puckora/scraper-core)
    status       text        not null default 'pending',
    -- Full structured payload — validated against ScrapeJobPayloadSchema
    payload      jsonb       not null,
    -- Filled in by the enrich endpoint after the executor posts results
    result       jsonb,
    -- Human-readable error if status = 'failed'
    error        text,
    -- Which executor picked up the job ('extension' | 'agent')
    executor     text,
    -- Timestamps
    claimed_at   timestamptz,
    completed_at timestamptz,
    created_at   timestamptz not null default now()
);

comment on table public.scrape_jobs is
    'Scrape job queue consumed by Chrome extension or Apify agent.';

-- Row-Level Security ----------------------------------------------------------

alter table public.scrape_jobs enable row level security;

-- Users manage only their own jobs. The service-role client used in Route
-- Handlers will bypass this policy automatically.
create policy "scrape_jobs: self all"
    on public.scrape_jobs
    for all
    using (user_id = auth.uid());

-- Realtime subscription -------------------------------------------------------
-- The Chrome extension subscribes filtered by user_id so it only wakes when
-- the authenticated user creates a job.

alter publication supabase_realtime add table public.scrape_jobs;

-- Index for the extension subscription filter ---------------------------------

create index scrape_jobs_user_status_idx
    on public.scrape_jobs (user_id, status);
