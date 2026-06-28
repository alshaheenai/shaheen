-- Feature 004 (Editorial Notes / نصيحة الشاهين) — standing editorial guidance.
-- Editor-authored Arabic notes the engine applies semantically through «بعين الشاهين».
-- NOT YET APPLIED to production — apply via Supabase MCP apply_migration or the SQL Editor (gated task T002).

create table if not exists public.editorial_notes (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- keep updated_at fresh (shared helper from setup.sql)
drop trigger if exists trg_editorial_notes_updated_at on public.editorial_notes;
create trigger trg_editorial_notes_updated_at before update on public.editorial_notes
  for each row execute function public.set_updated_at();

-- RLS: admin-all, mirroring every other admin table. The build job reads via the
-- service_role client (bypasses RLS); admins manage notes through the SSR session.
alter table public.editorial_notes enable row level security;
drop policy if exists "admin all" on public.editorial_notes;
create policy "admin all" on public.editorial_notes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
