# Feature Spec (brief): Stale-Draft Guard for send-review

**Status**: Draft · **Created**: 2026-06-29 · **Scope**: `apps/web/src/app/api/cron/send-review/route.ts` (+ reuse the existing Telegram alert helper). Surgical; one guard + one alert.

## Goal
Stop the nightly review from ever sending a **stale** draft. Today `send-review` picks the latest `in_review` draft with no date check (route.ts:19–26). If a build fails one night, it would send an old leftover draft and the Editor could approve a weeks-old issue (this exact case was cleaned manually on 2026-06-28: an 18-day-old `in_review` draft). Decision (Editor, 2026-06-29): when there's no fresh draft, **don't send — alert the Editor on Telegram.**

## How send-review works today
- Manual path: if the request body has `draftId`, that specific draft is sent (explicit override).
- Automatic path (the nightly cron): selects the latest `in_review` draft by `created_at desc, limit 1` — **no freshness check**.

## Requirements

### R1 — Freshness guard on the automatic path
- On the **automatic path only** (no `draftId` in the body), the selected `in_review` draft must be **fresh**: its `issue_date` is **not older than ~1 day** before the current date (Riyadh). A normal nightly draft has `issue_date = tomorrow`, so it passes; the stale case (`issue_date` weeks in the past) is rejected. The ~1-day tolerance absorbs timezone skew in how `issue_date` is stamped.
- If the latest `in_review` draft is **stale**, treat it as "no fresh draft" (do **not** send it).
- **Manual `draftId` path is exempt** — if the Editor passes an explicit `draftId`, send it as-is even if old (e.g., re-sending a postponed draft).

### R2 — Alert instead of sending when no fresh draft
- When the automatic path finds **no fresh** `in_review` draft (none at all, or only stale), send **one** Telegram alert to the admin chat (reuse the existing alert helper added for cron failures, e.g. `alertCronFailure`, or the same `tg()` path): «⚠️ لا مسودة جديدة للمراجعة الليلة — تحقّق من دورة البناء».
- Return a clear non-sending response (e.g. `{ ok: false, skipped: "no_fresh_draft" }`, HTTP 200 — this is an expected guard, not a server error). Do **not** throw.

## Acceptance
- A fresh draft (`issue_date = tomorrow`) → sent normally, no alert (unchanged behavior).
- Only a stale draft present (`issue_date` weeks ago) → **not sent**, exactly one Telegram alert delivered.
- No `in_review` draft at all → **not sent**, exactly one alert.
- Request with explicit `draftId` pointing at an old draft → still sent (guard bypassed).

## Out of scope (deferred)
- Auto-expiring / marking old `in_review` drafts as `rejected` in the build step — not needed; the send-side guard is sufficient. Revisit only if leftover drafts pile up.
- Any change to the manual `draftId` override.

## Verification
- `pnpm --filter web lint` clean; `next build` passes.
- Live (safe): temporarily insert a stale `in_review` draft (`issue_date` weeks past) with no real content, hit `send-review` (automatic path) → confirm it is NOT sent and the «لا مسودة جديدة» alert arrives; then delete the temp draft. Confirm a fresh draft still sends normally (or reason about it if no fresh draft exists that moment).

## Constitution alignment
- **V. Simplicity / surgical**: one date guard + one alert in a single route; reuses the existing alert helper.
- **VI. Human-in-the-loop**: protects the Editor from unknowingly approving a stale issue, and tells them when a build failed.
