---
description: "Task list for Feature 004 — Editorial Notes (نصيحة الشاهين)"
---

# Tasks: Editorial Notes — «نصيحة الشاهين»

**Input**: Design documents from `specs/004-editorial-notes/`
**Prerequisites**: spec.md, plan.md, data-model.md
**Tests**: Not requested (repo has no test harness). Verification = live build + manual review, per Constitution.
**Paths**: App code under `apps/web/src/`. Migration under `supabase/` (+ MCP apply to prod).

> **Story map** (spec.md): **US1** engine applies the note (P1) · **US2** faithful conveyance (P1) · **US3** admin CRUD (P2) · **US4** draft-vs-published (P2) · **US5** roundup/tools coverage (P3).
> **Dependency order**: data → engine (US1/US2, proves the feature) → render (makes it visible end-to-end + US5) → admin (US3) → draft/published + regression (US4). Admin (Phase 4) is independent of render and could run in parallel once data exists.
> **⛔ GATED** tasks touch irreversible/outward state (production migration, real build run on prod) — require **explicit Editor go-ahead**; excluded from any autonomous run.

## Phase 1: Data foundation (blocks everything)

- [ ] T001 Create the `editorial_notes` migration: add to `supabase/setup.sql` (fresh-project parity) and a new file `supabase/migrations/00XX_editorial_notes.sql` — table per [data-model.md](./data-model.md) (`id`, `body` NOT NULL, `active` default true, `created_at`, `updated_at`) + **RLS enabled** + SELECT/INSERT/UPDATE/DELETE policies gated by `is_admin()`. File only — do NOT apply yet.
- [ ] T002 ⛔ GATED — apply the migration to the official project `tciiwpzkgtsoypuaghld` via the `supabase` MCP (`apply_migration`). Requires Editor go-ahead. Verify with `list_tables` that `editorial_notes` exists with RLS on.
- [ ] T003 [P] Regenerate `apps/web/src/lib/database.types.ts` for the new table (or hand-add the `editorial_notes` Row/Insert/Update types) so the admin client and server actions are typed.
- [ ] T004 [P] `apps/web/src/lib/pipeline/types.ts` — add optional `our_take?: string` to `RoundupItem` and `ToolItem` (per data-model.md). No change to `MainStory`.

**Checkpoint**: table exists (gated), types compile.

---

## Phase 2: Engine — apply notes (US1 + US2, P1) — *proves the feature*

- [ ] T005 `apps/web/src/lib/pipeline/prompts.ts` — extend `mainStoryPrompt` to accept the active notes (list of bodies). Add a notes block + instructions: apply **at most one strongly-matching** note to this story; default to "no match" if uncertain; **convey concrete recommendations/figures faithfully, never soften/reverse/contradict** (FR-006). The note's stance goes into the existing `our_take`. No new output field (no id bookkeeping — plan.md Decision 2).
- [ ] T006 [P] `prompts.ts` — extend `roundupPrompt` and `toolsPrompt` the same way: add the notes list + same instructions, and a **per-item optional `our_take`** (present only when a note matches that item). Keep existing fields unchanged so no-note output is identical (SC-003).
- [ ] T007 `apps/web/src/lib/pipeline/run.ts` — before writing, load active notes: `select body from editorial_notes where active = true` (admin client). If empty, skip injection entirely. Pass the **same** active-notes list to all three writers (`mainStoryPrompt`, `roundupPrompt`, `toolsPrompt`). Map any returned `our_take` into `roundupItems` / `toolItems`. No cross-call threading.
- [ ] T008 ⛔ GATED — **live verify (US1/US2)**: insert one test note (e.g., the Cloud-pricing example with a contradicting recommendation) → run `build-issue` on an issue containing a matching story → confirm the story's «بعين الشاهين» states the Editor's recommendation, keeps the concrete figure, and does NOT endorse the contradicted option. Then deactivate the note, rebuild, confirm output reverts (SC-003 regression). (Gated: runs the real engine/model + writes a draft.)

**Checkpoint**: notes change the built draft faithfully; no notes = no change.

---

## Phase 3: Render the optional take (US1 end-to-end + US5, P1–P3)

- [ ] T009 [P] `apps/web/src/components/issue-view.tsx` (blog) — render `our_take` for roundup/tools items **only when present**, in the same «بعين الشاهين» style as the main story (which already renders at ~line 48). RTL.
- [ ] T010 [P] `apps/web/src/lib/email/templates.ts` — render roundup/tools `our_take` when present (email-safe markup), consistent with the main-story take (already rendered at ~line 113).
- [ ] T011 ~~telegram-channel~~ **NO CHANGE**: the channel post is a deliberate summary (title + TL;DR bullets + blog link) and renders no story bodies; the take reaches Telegram readers via the blog link. Confirm only — no edit.
- [ ] T012 Verify render using the existing **test mode** (`/api/cron/publish` test path) + blog preview: a built draft with an applied roundup/tools note shows the take on **blog** and **email (test)**; items without a note show no take (US5 AS-2).

**Checkpoint**: an applied note is visible to readers on blog + email; the Telegram summary is unchanged; unaffected items show no take.

---

## Phase 4: Admin management (US3, P2) — *independent of Phase 3*

- [ ] T013 Create `apps/web/src/app/admin/notes/page.tsx` — list all notes (body, active state, updated_at), following an existing admin CRUD page (`/admin/sources`) for layout + the shadcn-on-@base-ui rules (no `Button asChild`; `buttonVariants()` on links; no Radix).
- [ ] T014 Server actions for create / edit / toggle-active / delete — gated by `is_admin()` (use the SSR/admin pattern already used by other admin mutations); bump `updated_at` on edit.
- [ ] T015 Verify CRUD: create → edit → deactivate → reactivate → delete from `/admin/notes`; confirm a non-admin session is denied read/write (RLS `is_admin()`), matching other admin tables (SC-005 + US3 AS-4).

**Checkpoint**: notes are maintainable with no code change or deploy.

---

## Phase 5: Draft vs published + regression (US4, P2)

- [ ] T016 Verify the Telegram **regen** path rebuilds an unpublished draft and now picks up a newly-added note (FR-009). If regen does not reload notes, fix `run.ts`/regen to reload active notes on each build.
- [ ] T017 Verify a **published** issue's stored content in `published_issues` is unchanged after adding/editing/deleting a relevant note (FR-008 / SC-004): capture the record, change notes, confirm no diff.

**Checkpoint**: drafts update on regen; published issues are immutable to note changes.

---

## Phase 6: Docs & sync

- [ ] T018 [P] Update `docs/HANDOFF.md` (feature 004 done + how notes work) and keep `CLAUDE.md` ↔ `AGENTS.md` in sync if any shared rule changed. Mark `spec.md` Status → Implemented.
- [ ] T019 [P] Add an `/admin/notes` link from the admin dashboard/nav so the page is reachable.

---

## Notes for the builder

- Keep it surgical: the only new files are the migration, `app/admin/notes/*`, and (optionally) a tiny notes helper. Everything else is additive edits to existing files.
- Do **not** introduce a separate AI matching node (Constitution V) — notes ride inside the existing three `write` calls (plan.md Decision 1–2).
- Token cost of injected notes is tracked automatically in `pipeline_runs.state.tokens`; no extra accounting needed.
- Telegram **input** of notes is explicitly out of scope here (deferred).
