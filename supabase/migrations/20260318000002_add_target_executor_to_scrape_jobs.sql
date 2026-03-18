alter table public.scrape_jobs
  add column if not exists target_executor public.scrape_executor not null default 'agent';

update public.scrape_jobs
set target_executor = coalesce(target_executor, executor, 'agent')
where target_executor is null;

create index if not exists idx_scrape_jobs_target_executor_status_created_at
  on public.scrape_jobs (target_executor, status, created_at);

alter type public.scrape_job_type rename value 'alibaba_search' to 'globalsources_search';