-- Phase 7 / T023 — per-recipient newsletter send log (idempotency).
-- NOT YET APPLIED to production — apply via Supabase MCP apply_migration or the SQL Editor.

create table if not exists public.email_sends (
  id uuid primary key default gen_random_uuid(),
  published_issue_id uuid not null references public.published_issues on delete cascade,
  email text not null,
  status text not null default 'sent',
  resend_id text,
  sent_at timestamptz not null default now(),
  unique (published_issue_id, email)
);

create index if not exists email_sends_issue_idx on public.email_sends (published_issue_id);

alter table public.email_sends enable row level security;

-- Writes go through the service_role client (bypasses RLS) in the publish job.
-- Admins may read the log; no other role gets access.
drop policy if exists "admin read email_sends" on public.email_sends;
create policy "admin read email_sends" on public.email_sends
  for select to authenticated using (public.is_admin());
