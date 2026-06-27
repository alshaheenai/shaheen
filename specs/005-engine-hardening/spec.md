# Feature Spec: Engine & Operations Hardening

**Status**: In progress · **Scope**: surgical reliability/ops fixes to the existing engine + cron. No new surfaces, no restructuring of working code.

> Authored from the task brief (the inline R1–R7). Source of truth for this work.

## Requirements

- **R1 — OpenRouter retry (most important)**: add a bounded retry (3 attempts + exponential backoff ~1/2/4s) around the OpenRouter call in `lib/openrouter.ts` (`chat`/`chatJSON` fetch). Retry **only** on network errors / HTTP 429 / 5xx; never retry other 4xx. Token/cost accounting stays accurate — `recordUsage` counts only the successful call.

- **R2 — relevance-gate collapse alert**: in `lib/pipeline/run.ts`, when fewer than `MIN_SELECTABLE` items clear `RELEVANCE_MIN`, send **one** Telegram alert to the admin («⚠️ اليوم ضعيف…») via `tg()` and continue the build (no blocking; the existing fallback to the ranked pool stays).

- **R3 — cron failure alert**: when any cron route (`ingest`, `build-issue`, `send-review`, `publish`) fails, send a Telegram alert to the admin. Use one shared helper (no duplication); best-effort (never masks the original failure).

- **R4 — word-safe clipping**: move `clipWords()` from `lib/publish/telegram-channel.ts` to a shared location and use it in `formatReview()` instead of `clip()` (which cuts mid-word).

- **R5 — no hard-coded test email**: move `TEST_EMAIL` out of `lib/publish/email.ts` into an env var, documented in `.env.example`; no explicit address left in code.

- **R6 — base-URL for the edit link**: in `handleReviewAction()` (`lib/telegram.ts`) build the «تعديل» link from `getBaseUrl()` / `NEXT_PUBLIC_SITE_URL` (`lib/site.ts`) instead of the hard-coded `alshaheenai.com` fallback.

## Gated (requires Mohammed's explicit approval — do NOT run automatically)

- **R7 — delete the test subscriber row** `alshaheendaily@gmail.com` from `subscribers` on the production Supabase project `tciiwpzkgtsoypuaghld`. Ask for explicit approval before any production-data change.

## Verification

- `pnpm --filter web lint` clean + `next build` passes.
- Live: force a cron failure → R3 alert; weak day → R2 alert; simulate one 5xx → build still succeeds (R1).

## Constraints
- Match existing code style; no Radix; don't delete pre-existing dead code (flag only). Commit + push after verification. Stop at sensitive steps for approval.
