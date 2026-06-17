# Feature Specification: Al-Shaheen Baseline (As-Built Reference)

**Feature Branch**: `001-baseline-as-built`

**Created**: 2026-06-17

**Status**: Baseline — As-Built Reference (documents the system already in production-shape; NOT a proposal to rebuild)

**Input**: Reverse-documentation of the existing Al-Shaheen system: RSS ingestion, AI pipeline, Telegram review bot, and admin dashboard, as currently implemented.

> **Purpose of this document.** This is a *baseline* spec. It records WHAT the existing system does today so future feature specs (Phases 4–10) have a stable reference and a Constitution-aligned description to build against. It does not introduce new behavior. Where it names concrete files/tables/models, those live in the **As-Built Reference Map** appendix; the body stays behavior-focused.

## User Scenarios & Testing *(mandatory)*

The only human actor today is the **Editor/Admin** (the newsletter owner). There is no public reader-facing distribution yet (that is Phase 7). All journeys below are observable in the running system via `pnpm dev` on port 3210 and the Telegram bot.

### User Story 1 - Editor reviews and decides on the daily draft (Priority: P1)

Each day the system prepares a complete Arabic issue and sends it to the Editor in Telegram with an action keyboard. The Editor reads it and chooses one action: publish, reject, postpone, stop-for-today, regenerate, or open-in-dashboard-to-edit. Nothing reaches any public channel without the Editor's explicit approval.

**Why this priority**: This is the human-in-the-loop gate (Constitution Principle VI) and the core value — a trustworthy daily issue under a real brand requires a human decision.

**Independent Test**: With a draft in `in_review`, trigger send-review; confirm the Telegram message arrives with six buttons; press each and confirm the draft's status changes accordingly and (on publish) an archived issue is created.

**Acceptance Scenarios**:

1. **Given** a draft issue in `in_review`, **When** send-review runs, **Then** the Editor's Telegram chat receives the rendered issue plus an action keyboard (publish / reject / postpone / stop / regenerate / edit).
2. **Given** the review message, **When** the Editor presses **publish**, **Then** the draft becomes `approved` and an archived record is created in the published-issues store with a unique slug.
3. **Given** the review message, **When** the Editor presses **reject** / **postpone** / **stop**, **Then** the draft status becomes `rejected` / `postponed` / `rejected (stopped-for-today)` respectively, and nothing is published.
4. **Given** the review message, **When** the Editor presses **regenerate**, **Then** the system rebuilds the issue and sends a fresh review message.
5. **Given** any unauthenticated request to the webhook, **When** the shared secret is missing or wrong, **Then** the request is rejected (401).

---

### User Story 2 - System ingests fresh source items without duplicates (Priority: P1)

The system periodically reads the active RSS sources and stores new items, skipping anything it has already seen, so the pipeline always has fresh, de-duplicated material to work from.

**Why this priority**: Ingestion feeds everything downstream; with no fresh items there is no issue.

**Independent Test**: Trigger ingest twice in a row; confirm the first run inserts items and the second inserts no duplicates, and that each source's last-fetched timestamp updates.

**Acceptance Scenarios**:

1. **Given** active RSS sources, **When** ingest runs, **Then** new items are stored and each source's last-fetched time is updated.
2. **Given** an item whose URL was already stored, **When** ingest runs again, **Then** it is not duplicated (de-duplication is by a hash of the URL).
3. **Given** a source that fails to fetch or parse, **When** ingest runs, **Then** the failure is recorded in the error log and other sources still process.
4. **Given** a request without the shared ingest secret, **When** the ingest endpoint is called, **Then** it is rejected (401).

---

### User Story 3 - System builds an AI-for-entrepreneurs Arabic issue (Priority: P1)

From the pool of fresh items, the system classifies and scores each one, drops items that aren't relevant to "AI as an opportunity/tool/project for a Gulf entrepreneur," selects the survivors into a fixed issue layout, writes everything in the Al-Shaheen Arabic voice, and produces a headline and a short TL;DR — saving the result as a reviewable draft.

**Why this priority**: This is the editorial engine and the product's differentiator (Constitution Principles I & II).

**Independent Test**: Trigger build-issue against recent items; confirm a draft is produced with a headline, a 5-point TL;DR, one main story (with an editorial "our take"), a roundup, and a tools block — all in Arabic — and that low-relevance items were dropped.

**Acceptance Scenarios**:

1. **Given** a pool of fresh items, **When** the issue is built, **Then** each item is assigned scores including a **relevance** score, and items below the relevance threshold are dropped.
2. **Given** too few items survive the relevance gate, **When** building continues, **Then** the system falls back to the ranked pool so an issue can still be produced (no empty issue).
3. **Given** the surviving items, **When** the issue is composed, **Then** it contains a fixed layout: a 5-bullet TL;DR, one main story with an editorial "our take," a multi-item roundup, and a tools block.
4. **Given** the composed issue, **When** writing completes, **Then** all reader-facing text is in practical Arabic in the Al-Shaheen voice, and the issue has a headline and intro.
5. **Given** the draft is finalized, **When** it is saved, **Then** its status is `in_review` and the run's token usage and USD cost are recorded.
6. **Given** a request without the shared secret, **When** the build endpoint is called, **Then** it is rejected (401).

---

### User Story 4 - Admin operates the system from a dashboard (Priority: P2)

The Editor signs in by magic link and manages the system: brand configuration, RSS sources, the raw feed, draft/published issues, the per-task AI model configuration, and the history of pipeline runs (with cost).

**Why this priority**: Operational control of the system; valuable but the daily product can run via cron + Telegram without anyone opening the dashboard.

**Independent Test**: Sign in via magic link as an allow-listed admin; confirm each admin screen loads and a non-admin is refused.

**Acceptance Scenarios**:

1. **Given** an allow-listed admin email, **When** the user completes the magic-link sign-in, **Then** they can reach the admin screens (brand, sources, raw-feed, issues, models, runs).
2. **Given** a signed-in user whose email is not on the admin allow-list, **When** they open an admin screen, **Then** they see an "unauthorized" message and cannot read or write protected data.
3. **Given** an unauthenticated visitor, **When** they request any `/admin` route, **Then** they are redirected to sign in.
4. **Given** a completed pipeline run, **When** the Editor opens the runs screen, **Then** they see the run's status and its token/cost accounting.

---

### Edge Cases

- **Empty or stale source pool**: if no fresh items exist, the build produces no new draft rather than an empty issue; if few survive the relevance gate, the fallback keeps the issue populated.
- **Duplicate stories across sources**: the same story arriving from multiple feeds is de-duplicated at candidate selection by title similarity (in addition to URL-hash de-dup at ingest).
- **AI output that violates brand voice**: a non-blocking quality check scans for banned words from brand config and logs warnings; it does not silently rewrite or block the draft.
- **Telegram acknowledgement failures**: button handling is best-effort on acknowledgements so a transient Telegram error does not lose the action.
- **Secret missing on protected endpoints**: ingest, build, and webhook all reject unauthenticated calls (401).

## Requirements *(mandatory)*

### Functional Requirements

**Ingestion**
- **FR-001**: The system MUST read all active RSS sources and store newly-seen items for downstream processing.
- **FR-002**: The system MUST de-duplicate stored items by a hash of the item URL so the same URL is never stored twice.
- **FR-003**: The system MUST update each source's last-fetched time and MUST record per-source fetch/parse failures to an error log without aborting the whole run.
- **FR-004**: The ingestion endpoint MUST reject requests that do not present the shared ingest secret.

**Pipeline**
- **FR-005**: The system MUST classify and score each candidate item, producing at minimum a relevance score (AI ↔ entrepreneur-actionable), plus importance/novelty/risk and a tool flag, an Arabic summary, and a category.
- **FR-006**: The system MUST drop items whose relevance score is below the relevance threshold, and MUST fall back to the ranked pool when too few items survive so that an issue is never empty.
- **FR-007**: The system MUST select survivors into a fixed issue layout: one main story, a multi-item roundup, and a tools block (tools preferred from items flagged as tools).
- **FR-008**: The system MUST write all reader-facing content in practical Arabic in the Al-Shaheen voice, including, for the main story, an editorial "our take."
- **FR-009**: The system MUST produce an issue headline, intro, and a 5-bullet TL;DR.
- **FR-010**: The system MUST persist the result as a draft with status `in_review`.
- **FR-011**: The system MUST record per-run token usage and USD cost for the run.
- **FR-012**: The system MUST select the AI model per task from editable configuration (one model per task), not hardcoded.
- **FR-013**: The build endpoint MUST reject requests that do not present the shared secret.

**Review & Publish**
- **FR-014**: The system MUST send the review-ready draft to the Editor's Telegram chat with an action keyboard offering publish, reject, postpone, stop-for-today, regenerate, and edit.
- **FR-015**: On **publish**, the system MUST mark the draft approved and create an archived published record with a unique slug; on **reject/postpone/stop**, it MUST set the corresponding status and publish nothing; on **regenerate**, it MUST rebuild and re-send for review.
- **FR-016**: No issue may reach any channel without explicit Editor approval (human-in-the-loop).
- **FR-017**: The Telegram webhook MUST reject requests that do not present the shared secret.

**Admin & Security**
- **FR-018**: The system MUST authenticate admins via magic-link sign-in and MUST guard all `/admin` routes, redirecting unauthenticated users to sign in.
- **FR-019**: The system MUST restrict admin screens and all protected writes to emails present on the admin allow-list (`is_admin()`), with row-level security enabled on every table.
- **FR-020**: The system MUST provide admin screens for brand configuration, sources, the raw feed, issues, AI models, and pipeline runs.

**Brand & Schedule**
- **FR-021**: Brand identity (name, tagline, tone, palette, section labels, voice, banned words) MUST be data-driven and editable without code changes; the pipeline MUST read voice and section labels at runtime.
- **FR-022**: The daily operational schedule (timezone, prepare-by time, publish time, review mode) MUST be stored as editable settings rather than hardcoded.

### Key Entities

- **Source**: an active RSS feed the system polls. Key attributes: name, URL, type, active flag, fetch interval, last-fetched time, trust weight.
- **Raw item**: a fetched feed entry. Key attributes: source, URL, URL hash (dedup key), title, content.
- **Processed item**: a classified/scored candidate. Key attributes: relevance, importance, novelty, risk, tool flag, Arabic summary, category, audience.
- **Draft issue**: a composed, review-stage issue. Key attributes: status (`in_review`/`approved`/`rejected`/`postponed`), body (TL;DR, main + our-take, roundup, tools), headline/intro, run reference.
- **Published issue**: an approved, archived issue. Key attributes: source draft, issue date, type, title, unique slug, body, channel results.
- **Pipeline run**: a record of one build. Key attributes: date, status, error, state (candidate/scored/relevant counts, dropped count, draft id) and token/cost accounting.
- **AI model config**: per-task model selection with temperature and token limits.
- **Brand config**: singleton brand identity (name, tagline, tone, palette, section labels, voice, banned words).
- **App settings**: editable operational settings (review mode, publish time, prepare-by time, timezone).
- **Admin**: an allow-listed email permitted to manage the system.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Running ingest twice in succession adds zero duplicate items on the second run.
- **SC-002**: A build run on a non-empty fresh pool produces exactly one complete Arabic draft (headline + 5-bullet TL;DR + one main story with an "our take" + roundup + tools) and never an empty issue.
- **SC-003**: Every published item is one a Gulf entrepreneur can act on (build with / profit from / decide on); generic items below the relevance threshold are excluded.
- **SC-004**: No issue is ever published without an explicit Editor approval action in Telegram.
- **SC-005**: Every build run has its token usage and USD cost recorded and visible to the Editor.
- **SC-006**: Each protected endpoint (ingest, build, webhook) refuses requests lacking the shared secret, and non-admins cannot read or write protected data.
- **SC-007**: A complete daily issue is produced within a few minutes of triggering the build (observed ~2.5 minutes for 40–48 items).

## Assumptions

- This document describes the system **as built**; it does not propose changes. Any divergence found later between this baseline and the code should be reconciled by updating this spec, not by silently changing behavior.
- The only human user today is the Editor/Admin. Public reader-facing distribution (email, blog, Telegram channel, X) is **out of scope here** and is specified separately under Phase 7.
- Scheduling itself (a cron/n8n trigger hitting the guarded endpoints) is environmental and is provisioned at deployment (Phase 10); the schedule *values* are stored in settings today.
- The shared secret guarding ingest/build/webhook is the same `INGEST_SECRET`.
- Reasonable defaults observed in code (relevance threshold, block sizes, batch size, candidate cap) are treated as current configuration, not as requirements frozen for all time; changes to the relevance gate are governance-level per the Constitution.

---

## As-Built Reference Map *(appendix — concrete implementation pointers; informational)*

> Kept out of the behavioral body deliberately. This maps the requirements above to today's code so the baseline is a usable reference. Verified against the codebase on 2026-06-17.

**Ingestion** — `apps/web/src/lib/ingest.ts`, route `app/api/cron/ingest` (header `x-ingest-secret`). Reads active `type='rss'` `sources`, max 20 items/feed, upserts `raw_items` on `url_hash = sha256(url)`, updates `sources.last_fetched_at`, logs to `errors_log`.

**Pipeline** — `apps/web/src/lib/pipeline/{run,prompts,types}.ts`, model layer `lib/openrouter.ts`, route `app/api/cron/build-issue` (header `x-ingest-secret`, optional body `{candidateLimit}`). Constants: `CANDIDATE_LIMIT=60`, `BATCH=6`, `RELEVANCE_MIN=40`, `MIN_SELECTABLE=4`, `TOOLS_COUNT=3`, `ROUNDUP_COUNT=6`, main=1, TL;DR=5 bullets. Candidate de-dup by title Jaccard >0.6. Stages: classify+score → relevance gate → select blocks → write (main+our_take / roundup / tools) → headline+TL;DR → non-blocking banned-word check → persist `draft_issues` (`in_review`) → update `pipeline_runs.state` (incl. `.tokens`). Per-task models from `ai_models_config` (e.g. classify/score/select/verify → `google/gemini-2.5-flash`, write/headline → `anthropic/claude-sonnet-4`). USD cost from OpenRouter usage headers.

**Review bot** — `apps/web/src/lib/telegram.ts`, routes `app/api/cron/send-review` and `app/api/telegram/webhook` (guard `?secret=` or `x-telegram-bot-api-secret-token`, both vs `INGEST_SECRET`). Callbacks `rv:<action>:<draftId>` for publish/reject/postpone/stop/regen/edit. Publish → draft `approved` + upsert `published_issues` (unique slug) + mark `processed_items` selected. Regen → `buildDailyIssue()` via `after()`. Edit → links `/admin/issues/{id}`.

**Admin** — `apps/web/src/app/admin/{brand,sources,raw-feed,issues,models,runs}`. Auth: Supabase magic-link OTP; session via `proxy.ts`/middleware; `admin/layout.tsx` calls RPC `is_admin()` (checks `admins` table by JWT email). RLS on all tables; admin-only writes; public read on `brand_config`/`categories`/`published_issues`; anon insert on `subscribers`/`feedback_ratings`.

**Schedule (settings)** — `app_settings`: `review_mode='manual'`, `publish_time='03:00'`, `prepare_by_time='00:30'`, `timezone='Asia/Riyadh'`. (Note: the Constitution states the target cadence as ingest 11pm / build 12am / review 12:30 / publish 3am; reconcile the stored values vs the cadence when Phase 5 scheduling UI is built.)

**Tables (20)** — admins, brand_config, app_settings, categories, sources, raw_items, processed_items, gifts, ads, draft_issues, published_issues, gifts_used, gifts_scheduled, ads_calendar, ai_models_config, publishing_channels, subscribers, feedback_ratings, errors_log, pipeline_runs.

**Not yet built (tracked, out of baseline scope)**: gifts surfacing (Phase 4), review-mode/schedule UI (5), images (6), public distribution — email/blog/Telegram-channel/X (7), weekly digest (8), reader ratings + analytics wiring (9), VPS deploy + cron (10).
