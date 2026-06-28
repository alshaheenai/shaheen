# Implementation Plan: Editorial Notes — «نصيحة الشاهين»

**Branch**: `004-editorial-notes` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-editorial-notes/spec.md`

## Summary

Add Editor-authored **standing editorial notes**. The engine loads the active notes at build time, and the existing story-writing step decides **semantically** whether a note applies to a selected story; when it does, the story's «بعين الشاهين» (`our_take`) conveys the Editor's stance **faithfully**. No new pipeline node and no new reader-facing block (Constitution V). Roundup/tools items gain an **optional** «بعين الشاهين» line, rendered only when a note applies. Notes are managed from a new `/admin/notes` page; Telegram input is deferred.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 App Router (React 19), Node runtime.

**Primary Dependencies**: Supabase (`lib/supabase/admin.ts` service-role for the build; SSR + RLS for admin UI), OpenRouter (`lib/openrouter.ts`, `chatJSON`, per-task model from `ai_models_config`), shadcn-on-@base-ui.

**Storage**: Supabase Postgres — one new table `editorial_notes` (RLS, admin-gated). No other schema change.

**Testing**: Live verification per Constitution (real build + manual review). No unit-test harness in the pipeline today; verification is by running the build/publish endpoints and inspecting output (matches how 002 was verified).

**Target Platform**: The single `apps/web` deployable (VPS + Docker, Phase 10) and `next dev` locally.

**Project Type**: Web app (one deployable unit; engine = `lib/` + `app/api/cron/*`).

**Performance/Cost**: Notes are appended to the three `write` prompts. With a small active-note count the added tokens are negligible and tracked in `pipeline_runs.state.tokens` like every other call. If note volume grows large, move to retrieval (tags/embeddings) — out of scope for v1.

**Scale/Scope**: Single-editor tool; expected a handful of active notes. One table, one admin page, three prompt edits, one `run.ts` edit, three renderer edits.

## Constitution Check

*GATE: must pass before and after design.*

- **III. Spec-First (non-negotiable)** — ✅ spec approved before this plan; tasks follow.
- **V. Simplicity & Surgical Changes** — ✅ no separate AI node; reuse the existing `write` step and the `our_take` line; the only new surface is one table + one admin page. Optional `our_take` on roundup/tools is additive and backward-compatible.
- **VI. Human-in-the-Loop Publishing** — ✅ notes never auto-publish; every draft still passes Telegram review.
- **IV. Security by Default** — ✅ `editorial_notes` ships with RLS on; writes gated by `is_admin()`, mirroring existing admin tables. Production migration is a **sensitive step** requiring the Editor's explicit go-ahead.
- **II. Practical Arabic, Data-Driven Brand** — ✅ stance rendered through the existing data-driven «بعين الشاهين» voice (`brand_config`).

No violations → Complexity Tracking not needed.

## Key Design Decisions (from clarify, no open unknowns)

1. **No separate matching node.** Active notes are passed inside the existing `mainStoryPrompt` / `roundupPrompt` / `toolsPrompt`. Each `write` call is instructed to apply **at most one strongly-matching note** to a story and to default to "no match" when uncertain.
2. **Per-story cap only — no cross-call dedup.** All active notes are passed to all three `write` calls; each call enforces **at most one note per story** on its own. We deliberately do **not** thread "already-applied" ids between calls: asking the LLM to do uuid bookkeeping on top of writing is the least-reliable part of the design and buys a guarantee it can't keep (a missed report re-applies the note anyway). The rare case of one note matching two distinct selected stories is acceptable, and `dedupeByTitle` (run.ts:59) already removes same-headline duplicates. (Simplicity — Constitution V.)
3. **Note payload to prompts.** Notes are passed simply as their body text (a short numbered list); no id round-tripping is needed since there is no cross-call bookkeeping.
4. **Fidelity.** Each `write` prompt carries an explicit instruction: convey the note's concrete recommendation/figure unchanged; never soften, reverse, or endorse a contradicted option.
5. **Optional `our_take` on roundup/tools.** `RoundupItem`/`ToolItem` gain an optional `our_take`. Renderers show it only when present → zero change when no note applies (FR-007, SC-003).
6. **Draft vs published.** Notes affect only the **build**. The Telegram "regen" path rebuilds the draft and therefore picks up notes automatically; a **published** issue is a separate immutable record in `published_issues` and is never touched (FR-008/FR-009). Verification, not new code, is expected here.

## Project Structure

### Documentation (this feature)

```text
specs/004-editorial-notes/
├── spec.md          # approved
├── plan.md          # this file
├── data-model.md    # editorial_notes + type deltas
└── tasks.md         # dependency-ordered tasks
```

(No `contracts/` — no new public HTTP contract; the admin page uses server actions. No `research.md` — all decisions resolved in clarify.)

### Source Code (touch list, repository `apps/web`)

```text
supabase/                      # + migration: editorial_notes table + RLS (apply to prod = sensitive)
src/lib/database.types.ts      # regenerate (new table types)
src/lib/pipeline/types.ts      # + optional our_take on RoundupItem, ToolItem
src/lib/pipeline/prompts.ts    # mainStoryPrompt/roundupPrompt/toolsPrompt: accept notes; fidelity rule; optional our_take outputs (roundup/tools)
src/lib/pipeline/run.ts        # load active notes; pass to all three writers; map our_take into roundup/tools
src/components/issue-view.tsx  # render roundup/tools our_take when present (main our_take already rendered, line ~48)
src/lib/email/templates.ts     # render roundup/tools our_take when present (main our_take already rendered, line ~113)
# src/lib/publish/telegram-channel.ts — NO CHANGE: channel post is a summary (title + TL;DR bullets + blog link), no story bodies
src/app/admin/notes/           # NEW page: list + create/edit/toggle/delete (is_admin-gated server actions)
```

**Structure Decision**: Follows the existing engine + admin layout exactly; no new architectural boundary. The admin page mirrors an existing CRUD page (e.g., `/admin/sources`).

## Phasing (maps to spec user stories)

- **Phase 1 — Data foundation** (blocks everything): migration + types.
- **Phase 2 — Engine (US1, US2 / P1)**: prompts + `run.ts` matching + fidelity; **live build verify** with a test note. This alone proves the feature.
- **Phase 3 — Render (US1 end-to-end, US5 / P1–P3)**: show the optional roundup/tools `our_take` on **blog + email** (the full-issue renderers). The Telegram channel summary is unchanged.
- **Phase 4 — Admin (US3 / P2)**: `/admin/notes` CRUD so notes are maintainable without code.
- **Phase 5 — Draft/published + regression (US4 / P2)**: verify regen applies to drafts, published untouched, no-notes regression.

## Risks & Mitigations

- **Over-application** (AI forces a weak match) → prompt defaults to "no match"; manual review during Phase 2 verify; one-note-per-story cap.
- **Cross-call duplication** (same note on two distinct stories) → accepted as rare and benign (Decision 2); `dedupeByTitle` already removes same-headline duplicates. No bookkeeping built.
- **Prompt bloat as notes grow** → acceptable for v1's small volume; retrieval is a flagged future change, not built now.
- **Production migration** → sensitive; apply only on the Editor's explicit go-ahead via the `supabase` MCP (the official project `tciiwpzkgtsoypuaghld`).
