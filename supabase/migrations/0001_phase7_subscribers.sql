-- Phase 7 (Real Publishing): subscribers double opt-in support.
-- Adds confirmation + unsubscribe tokens and makes new subscribers start as 'pending'.
-- NOT YET APPLIED to production — apply via Supabase MCP apply_migration or the SQL Editor (gated task T040).

alter table public.subscribers
  add column if not exists confirmation_token text default gen_random_uuid()::text,
  add column if not exists unsubscribe_token  text default gen_random_uuid()::text;

-- New subscribers must confirm (double opt-in). Existing rows keep their current status.
alter table public.subscribers alter column status set default 'pending';

-- Backfill tokens for any pre-existing rows.
update public.subscribers
  set confirmation_token = coalesce(confirmation_token, gen_random_uuid()::text),
      unsubscribe_token  = coalesce(unsubscribe_token,  gen_random_uuid()::text)
  where confirmation_token is null or unsubscribe_token is null;

-- Fast, unguessable token lookups.
create unique index if not exists subscribers_confirmation_token_idx
  on public.subscribers (confirmation_token) where confirmation_token is not null;
create unique index if not exists subscribers_unsubscribe_token_idx
  on public.subscribers (unsubscribe_token) where unsubscribe_token is not null;
