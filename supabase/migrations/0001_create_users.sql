-- ---------------------------------------------------------------------------
-- public.users
--
-- Application-facing user table that mirrors auth.users.
-- Managed by a trigger so the app never reads the restricted auth schema.
--
-- Rules:
--   • id is a 1:1 FK to auth.users — deleting an auth user cascades here.
--   • handle_new_user() fires on every auth.users INSERT to seed the row.
--   • RLS: users can only read and update their own row.
-- ---------------------------------------------------------------------------

create table if not exists public.users (
    id           uuid        primary key
                             references auth.users (id)
                             on delete cascade
                             not null,
    email        text        not null,
    display_name text,
    avatar_url   text,
    -- User preferences (independent columns — no JSONB blobs)
    marketplace  text        not null default 'US',
    language     text        not null default 'en',
    -- Timestamps
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

comment on table public.users is
    'App-facing user profiles, kept in sync with auth.users via trigger.';

-- Row-Level Security ----------------------------------------------------------

alter table public.users enable row level security;

create policy "users: self read"
    on public.users
    for select
    using (auth.uid() = id);

create policy "users: self update"
    on public.users
    for update
    using (auth.uid() = id);

-- Service-role bypass (used by admin clients in Route Handlers) ---------------
-- Uses the default service-role client which bypasses RLS.

-- Trigger: seed a row on auth.users INSERT ------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
-- Explicit empty search_path prevents privilege escalation
set search_path = ''
as $$
begin
    insert into public.users (id, email, display_name)
    values (
        new.id,
        new.email,
        coalesce(
            -- Client can supply display_name in options.data at sign-up
            new.raw_user_meta_data ->> 'display_name',
            -- OAuth providers often supply full_name
            new.raw_user_meta_data ->> 'full_name',
            -- Fallback: email prefix
            split_part(new.email, '@', 1)
        )
    );
    return new;
end;
$$;

create or replace trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_user();

-- Trigger: keep email in sync if auth.users.email changes ---------------------

create or replace function public.handle_user_email_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if new.email is distinct from old.email then
        update public.users
        set email      = new.email,
            updated_at = now()
        where id = new.id;
    end if;
    return new;
end;
$$;

create or replace trigger on_auth_user_email_updated
    after update on auth.users
    for each row
    when (new.email is distinct from old.email)
    execute function public.handle_user_email_update();
