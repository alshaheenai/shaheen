# Implementation Plan: Real Publishing (Phase 7 — النشر الفعلي)

**Branch**: `002-real-publishing` (working on `main`; no feature branch created) | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-real-publishing/spec.md`

## Summary

When the Editor approves a daily draft in Telegram, the issue is marked **ready** (archived to `published_issues`). A separate, guarded **publish trigger** then distributes the ready issue to three independent channels — **email** (Resend), the **public blog** (issue pages + archive on the existing app), and the **Telegram channel** — recording a per-channel result in the existing `published_issues.channel_results` jsonb. Each channel is idempotent and isolated (one failure never blocks the others), and the Editor can re-trigger only failed channels. Phase 7 also adds a **public double-opt-in subscribe flow** so the email list can grow. **X is deferred** (paid API tier); the orchestrator is channel-generic so X drops in later. The publish trigger is invokable manually now and will be cron-driven at ~03:00 in Phase 10.

## Technical Context

**Language/Version**: TypeScript on Next.js 16.2.9 (App Router), React 19.2.4, Node runtime for API routes.

**Primary Dependencies**: Supabase (`@supabase/supabase-js` 2.108, `@supabase/ssr` 0.12) — existing; **add `resend`** (official SDK, for batch send + idempotency + List-Unsubscribe). Telegram channel posting reuses the existing **raw `fetch`** pattern (no new dep, matches `lib/telegram.ts`). Email HTML rendered by a **plain template function** (no `@react-email` dep) to honor simplicity.

**Storage**: Supabase Postgres. Reuses `published_issues` (incl. `channel_results` jsonb), `publishing_channels`, `subscribers`. **One migration**: `subscribers` gets `confirmation_token` + `unsubscribe_token` (text) and default `status` flips to `pending`. No new tables; no new column on `published_issues` (distribution state derives from `channel_results`).

**Testing**: Live verification via `pnpm dev` on :3210 (project convention; production Turbopack build is slow). Trigger endpoints with the `x-ingest-secret` header. No unit-test harness exists in the repo; verification is the quickstart scenarios.

**Target Platform**: Same single deployable unit (`apps/web`), served on the project domain. Reader-facing pages are public, RTL Arabic (root layout already `lang="ar" dir="rtl"` with Thmanyah Sans).

**Project Type**: Web application (Next.js App Router) — single project under `apps/web`.

**Performance Goals**: Subscriber base small initially (hundreds → low thousands); email sent in batches of ≤100 per Resend call. A publish run completes in well under the publish window. No high-throughput requirement.

**Constraints**: Secrets in `apps/web/.env.local` only; all triggering endpoints guarded by `INGEST_SECRET`; reader pages read-only and unauthenticated; subscribe/confirm/unsubscribe handled server-side with unguessable tokens. Every email carries a working unsubscribe + a verified sending domain.

**Scale/Scope**: 3 channels + subscribe flow + blog pages + 1 migration + ~8 new `lib/` modules + ~6 routes/pages. X and WhatsApp out of scope.

## Constitution Check

*GATE: re-checked after Phase 1 design — still passing.*

| Principle | Assessment |
|-----------|------------|
| **I. Editorial focus** | N/A to distribution (no item selection here). No regression — relevance gate untouched. PASS |
| **II. Practical Arabic, data-driven brand** | Email/blog/Telegram all render Arabic from `brand_config`; channel targets (Telegram channel id, sender) live in `publishing_channels.config` / env, not hardcoded. New `getChannelConfig`/`getAppSetting` helpers read from DB. PASS |
| **III. Spec-first** | Spec + Clarify complete; this plan precedes any code. PASS |
| **IV. Security by default** | Publish trigger guarded by `INGEST_SECRET`; reader pages read-only; subscribe/confirm/unsubscribe via server routes (admin client) with unguessable tokens; RLS intact; secrets stay in env; X/social keys unused this phase. New migration keeps RLS. PASS |
| **V. Simplicity & surgical changes** | One new dep (`resend`); reuse raw `fetch` for Telegram; plain HTML email (no `@react-email`); no new tables; one minimal migration. Channel-generic orchestrator avoids per-channel branching sprawl. PASS |
| **VI. Human-in-the-loop publishing** | Distribution acts ONLY on Editor-approved (ready) issues; the publish trigger never creates or approves content. Cron (Phase 10) only fans out already-approved issues. PASS |

**Result: PASS** — no violations; Complexity Tracking left empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-real-publishing/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions (Resend, DNS, idempotency, state model)
├── data-model.md        # Phase 1 — subscribers migration + channel_results shape
├── contracts/
│   └── publishing-endpoints.md   # Phase 1 — endpoint + page contracts
├── quickstart.md        # Phase 1 — live verification scenarios (pnpm dev)
└── tasks.md             # Phase 2 — created by /speckit-tasks (NOT here)
```

### Source Code (repository root) — new/changed under `apps/web/src`

```text
apps/web/src/
├── lib/
│   ├── publish/
│   │   ├── run.ts                # orchestrator: publishIssue(issueId,{channels,force}); loops enabled channels, writes channel_results
│   │   ├── email.ts              # render + Resend batch send + List-Unsubscribe + idempotency
│   │   ├── telegram-channel.ts   # post to public channel (raw fetch)
│   │   └── blog.ts               # validate renderable + mark blog channel published (no external call)
│   ├── email/
│   │   └── templates.ts          # Arabic RTL HTML: newsletter issue + confirmation email
│   ├── subscribers.ts            # createPending, confirm, unsubscribe, listActive (admin client)
│   ├── channels.ts               # getEnabledChannels / getChannelConfig (publishing_channels)
│   ├── settings.ts               # getAppSetting(key) (app_settings)
│   ├── site.ts                   # getBaseUrl() + issueUrl(slug) for absolute links
│   └── brand.ts                  # (existing) + add admin-client brand fetch for jobs
├── app/
│   ├── api/
│   │   ├── cron/publish/route.ts # POST publish trigger (guarded by INGEST_SECRET)
│   │   ├── subscribe/route.ts    # POST public subscribe → pending + confirmation email
│   │   ├── subscribe/confirm/route.ts  # GET confirm token → active
│   │   └── unsubscribe/route.ts  # GET/POST token → inactive (List-Unsubscribe target)
│   ├── issues/
│   │   ├── page.tsx              # public archive (distributed issues, newest-first)
│   │   └── [slug]/page.tsx       # public issue page (generateMetadata for share preview)
│   └── subscribe/
│       └── page.tsx              # public subscribe form + thank-you/confirm states
├── components/
│   └── issue-view.tsx            # shared RTL renderer for IssueBody (reused by blog page)
└── (admin) app/admin/issues/...  # add per-channel status + "re-publish failed channel" action

supabase/migrations/
└── 0001_phase7_subscribers.sql   # confirmation_token, unsubscribe_token, default status 'pending'
```

**Structure Decision**: Single Next.js project under `apps/web` (the project's single deployable unit per the constitution). Publishing logic lives in `lib/publish/*` mirroring the existing `lib/pipeline/*` staged-module style; routes under `app/api/*` follow the existing guarded-cron pattern. The blog reuses the existing root layout (RTL + brand font) and a shared `IssueBody` renderer.

## Key design decisions (detail in research.md)

1. **State model — no new column.** Approval (Telegram publish button) archives to `published_issues` = *ready*. Distribution state lives entirely in `channel_results` (`{ email|blog|telegram: { status, at, summary } }`). An issue is publicly visible on the blog only when `channel_results.blog.status = 'success'`. Idempotency = skip a channel already at `success` unless `force`.
2. **Publish ordering & the blog dependency (IMPORTANT).** Email and Telegram embed the blog URL, and the blog page returns 404 until `channel_results.blog.status='success'`. Therefore the orchestrator publishes **blog FIRST**, and attempts email/Telegram **only if the blog step succeeded** (otherwise it records them `failed` with reason `"blog not live"` — never mails a dead link). `blog.ts` is a pure DB-visibility flip (no external call) so it effectively always succeeds; the ordering + conditional is made **explicit** in `run.ts`, not left to loop order. Email and Telegram remain independent of each other.
3. **Publish trigger.** `POST /api/cron/publish` (guarded). Body `{ issueId?, channels?: string[], force?: bool }`. **Default target is *today's* ready issue only** (`issue_date = today`, date-guarded); the no-arg form NEVER sweeps a backlog of older approved-but-undistributed issues (those must be named explicitly via `issueId`). Returns per-channel results. Phase 10 cron calls this at ~03:00.
4. **Email.** Resend SDK; batch ≤100; recipients = `subscribers` where `status='active'`, ordered **deterministically by `id`** with fixed chunk size so batch composition (and thus the per-batch `Idempotency-Key = hash(issueId, batchIndex)`) is stable across retries even if the list changes between runs; `List-Unsubscribe` + `List-Unsubscribe-Post: One-Click` headers → unsubscribe route; zero active = success no-op.
5. **Double opt-in + abuse control.** Subscribe → row `status='pending'` + `confirmation_token`; confirmation email; confirm route flips to `active`. Stable `unsubscribe_token` per subscriber for one-click unsubscribe. **Abuse guard (Principle IV):** the public `POST /api/subscribe` MUST throttle — per-email cooldown (no re-send if a `pending` row was touched within ~5 min; reuse `updated_at`) AND a per-IP attempt cap per window; unknown/duplicate emails return success without sending a second confirmation. Prevents using our verified domain to email-bomb third parties or burn Resend quota.
6. **DNS / domain verification.** Add `alshaheenai.com` in Resend → obtain SPF/DKIM/DMARC records → add via **Cloudflare MCP** → verify. Prerequisite for the email channel (FR-018); blog/Telegram do not depend on it.
7. **Oversight/retry.** `/admin/issues/[id]` shows per-channel status and a server action that calls `publishIssue` for a single failed channel (admin-gated, `force=true` on that one channel).
8. **Blog freshness.** `/issues` and `/issues/[slug]` MUST use a revalidation strategy (e.g. `revalidate` / on-publish revalidation) so a newly-distributed issue appears promptly and isn't statically cached indefinitely.

## Irreversible / outward-facing steps — require explicit user go-ahead at the implement pause

These are NOT part of any autonomous run and cannot be undone by re-running:
1. **DNS changes** on the real `alshaheenai.com` via Cloudflare MCP + Resend domain verification.
2. **Any real email send** — during verification the only `active` subscriber must be a test address, never a real list.
3. **Applying the migration** to the production Supabase project (`tciiwpzkgtsoypuaghld`).

The build order is designed so all of code (lib/publish, routes, blog pages, subscribe flow, email templates) can be implemented and reviewed *before* any of the above three is performed.

## Complexity Tracking

> No constitution violations — no entries.
