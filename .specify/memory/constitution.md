<!--
SYNC IMPACT REPORT
==================
Version change: TEMPLATE (unversioned) → 1.0.0
Rationale: Initial ratification. First concrete constitution replacing the
placeholder template. MAJOR baseline (1.0.0) per semantic-versioning initial-adoption.

Modified principles: none (initial adoption — all principles newly defined)
Added principles:
  I.   Editorial Focus — AI for the Gulf Entrepreneur
  II.  Practical Arabic, Data-Driven Brand
  III. Spec-First Development (NON-NEGOTIABLE)
  IV.  Security by Default
  V.   Simplicity & Surgical Changes
  VI.  Human-in-the-Loop Publishing
Added sections:
  - Operational Constraints & Tech Stack (publishing cadence, single deployable unit, stack, secrets)
  - Development Workflow (Spec Kit order, CLAUDE.md↔AGENTS.md sync, live verification)
Removed sections: none

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check is dynamic
       ("[Gates determined based on constitution file]"); no edit needed.
  ✅ .specify/templates/spec-template.md — no constitution-mandated section added; aligned.
  ✅ .specify/templates/tasks-template.md — principle-driven task types (security/RLS,
       live-verification) are expressible under existing categories; no edit needed.
  ✅ CLAUDE.md / AGENTS.md — already encode spec-first, security, simplicity; consistent.

Follow-up TODOs: none. All placeholders resolved.
-->

# الشاهين (Al-Shaheen) Constitution

Al-Shaheen is an Arabic daily AI newsletter for Gulf entrepreneurs. This constitution
governs how the project is built and operated. It supersedes ad-hoc preferences; where it
conflicts with convenience, the constitution wins. It is consistent with, and sits above,
`CLAUDE.md` and `AGENTS.md`.

## Core Principles

### I. Editorial Focus — AI for the Gulf Entrepreneur

Al-Shaheen is NOT a general tech newsletter. Every published item MUST answer one question:
*how does a Gulf entrepreneur build with, profit from, or act on this AI development?*
The pipeline MUST score `relevance` (AI ↔ something an entrepreneur can build/use) and MUST
drop items below `RELEVANCE_MIN` (generic hardware, games, policy, pure research with no
actionable angle). This relevance gate is enforced in code (`lib/pipeline/run.ts`), not left
to prompt wording alone. **Rationale:** the editorial lens is the product's only durable
differentiator; diluting it makes the newsletter interchangeable with every other AI feed.

### II. Practical Arabic, Data-Driven Brand

Content MUST be written in clear, practical Arabic in the Al-Shaheen voice (confident,
concise, useful, lightly witty — never silly, never dead-formal). Brand identity — name,
tagline, tone, palette, section labels, and voice — MUST live in `brand_config` and
`NEXT_PUBLIC_BRAND_NAME`, NEVER hardcoded in components or prompts. The pipeline MUST read
voice and section labels from `brand_config` at runtime. **Rationale:** the brand is owned by
the editor, not the codebase; changing tone or section names must not require a code change.

### III. Spec-First Development (NON-NEGOTIABLE)

No feature code without a spec. Before any new feature, major refactor, DB/API change, UI
flow, or architectural decision, these MUST exist in order: **Spec → Clarifications → Plan →
Tasks**, then Implement. Spec files in `specs/` are the single source of truth. Work proceeds
through the Spec Kit workflow (`/speckit.specify → clarify → plan → tasks → implement`) with
no phase skipped for new/major/unclear work. Decisions not in the specs MUST be raised with
the user when they affect product, architecture, data, security, cost, or UX; otherwise they
are recorded under an **Assumptions** section. Trivial non-behavioral changes (typos,
formatting, doc wording, broken-import fixes) are exempt. **Rationale:** specs prevent rework
and silent scope drift, and let any session resume from a known state.

### IV. Security by Default

Every Supabase table MUST have RLS enabled. All writes MUST be gated by `is_admin()` (email
present in the `admins` table). Admin routes are guarded by `proxy.ts`; cron and webhook
routes are guarded by the shared `INGEST_SECRET`. Secrets live ONLY in `apps/web/.env.local`
(gitignored, documented in `.env.example`) — never committed, never inlined into client code
beyond the intended `NEXT_PUBLIC_*` values. All keys and any temporary PAT MUST be rotated
before production launch. **Rationale:** the service-role key bypasses RLS; a single leaked
secret or missing policy exposes the whole dataset.

### V. Simplicity & Surgical Changes

Write the minimum code that solves the problem — nothing speculative. No abstractions for
single-use code, no unrequested flexibility or configurability, no error handling for
impossible scenarios. When editing existing code, touch only what the request needs, match
existing style, and do not refactor what isn't broken. Remove only the orphans your own change
created; mention — do not delete — pre-existing dead code. If 200 lines could be 50, rewrite
it. **Rationale:** this is a single-maintainer project; every line is a maintenance liability.

### VI. Human-in-the-Loop Publishing

No issue is published automatically. Every draft MUST be reviewed and approved by an admin via
the Telegram review bot before it reaches any public channel (email, blog, Telegram channel,
X). Publish, reject, postpone, regenerate, and stop actions are exercised by a human through
Telegram; the system prepares and waits. **Rationale:** an AI-written newsletter under a real
brand carries reputational and factual risk; a human gate is the safeguard.

## Operational Constraints & Tech Stack

**Single deployable unit.** All application and engine logic lives in `apps/web` (Next.js 16
App Router). Ingestion, the AI pipeline, the Telegram bot, and publishing are `lib/` modules +
`app/api/cron/*` and `app/api/telegram/*` routes. `services/` is intentionally empty.

**Daily publishing cadence** (the operational heartbeat; times are the target schedule):
- **11:00 PM** — Ingest RSS sources → `raw_items`.
- **12:00 AM** — Build today's issue → `draft_issues`.
- **12:30 AM** — Send draft to the admin via Telegram for review.
- **3:00 AM** — Publish the approved issue to all channels.

Scheduling is triggered by an external cron/n8n hitting the guarded endpoints; the cadence is
a product commitment, and changes to it are governance-level (see below).

**Stack (approved).** Next.js 16 + Tailwind v4 + shadcn/ui (RTL Arabic) · Supabase (Postgres +
Auth + RLS) · OpenRouter (one model per task from `ai_models_config`, with per-run token + USD
cost accounting; images via nano-banana on the same key) · Resend (email) · Telegram bot via
the existing webhook · PostHog + Sentry for observability. Adding a new external service or
dependency is an architectural decision and requires a spec.

**Build gotcha.** `NEXT_PUBLIC_*` values are inlined at build time; changing the Supabase
URL/anon key or brand env requires a rebuild, not just a restart.

## Development Workflow

1. **Read first:** `docs/HANDOFF.md`, this constitution, existing specs, `CLAUDE.md` /
   `AGENTS.md`, and project memory before meaningful work.
2. **Spec Kit order:** clarify → plan → tasks → implement, skipping nothing for new/major/
   unclear work. If asked to implement while spec artifacts are missing, stop and create them.
3. **Live verification:** use `pnpm dev` (port 3210) to verify behavior before claiming done;
   the production Turbopack `next build` is slow and not required for local verification.
   Trigger jobs locally via the guarded cron endpoints with the `x-ingest-secret` header.
4. **Instruction sync:** `CLAUDE.md` and `AGENTS.md` MUST stay aligned on core rules (overview,
   architecture, spec-first workflow, commands, security, style, deployment). Editing shared
   rules in one requires updating the other.
5. **Plugins:** install only Claude Code plugins that directly match approved tools/workflow;
   no speculative installs.

## Governance

This constitution supersedes other practices. Compliance is verified at the **Constitution
Check** gate in every plan (`/speckit.plan`); violations must be justified in the plan's
Complexity Tracking section or the design changed to comply.

**Amendments** require: a written rationale, a version bump per the policy below, an update to
the Sync Impact Report at the top of this file, and propagation to any affected templates and
to `CLAUDE.md` / `AGENTS.md`. Changes to the **publishing cadence**, the **editorial relevance
gate**, the **security rules**, or the **human-in-the-loop gate** are governance-level and MUST
be made as explicit amendments, not incidental code changes.

**Versioning policy** (semantic):
- **MAJOR** — backward-incompatible governance/principle removals or redefinitions.
- **MINOR** — a new principle/section added or materially expanded guidance.
- **PATCH** — clarifications, wording, or non-semantic refinements.

**Compliance review.** Every spec, plan, and PR is checked against these principles. Added
complexity must be justified against Principle V. Runtime development guidance lives in
`CLAUDE.md`, `AGENTS.md`, and `docs/HANDOFF.md`, which remain subordinate to this constitution.

**Version**: 1.0.0 | **Ratified**: 2026-06-17 | **Last Amended**: 2026-06-17
