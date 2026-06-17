# Quickstart — Verifying Real Publishing (Phase 7)

Live verification scenarios proving the feature end-to-end. Run from `apps/web` with the dev server (`pnpm dev`, port **3210**) — do not rely on the slow production build. These map to the spec's Success Criteria (SC-001…SC-007).

## Prerequisites

```bash
# repo root
pnpm install                       # picks up the new `resend` dep
SECRET=$(grep INGEST_SECRET apps/web/.env.local | cut -d= -f2)
# .env.local must have: RESEND_API_KEY, RESEND_FROM_EMAIL=news@alshaheenai.com, NEXT_PUBLIC_SITE_URL=http://localhost:3210
# Migration 0001_phase7_subscribers.sql applied (Supabase MCP apply_migration or SQL Editor)
# publishing_channels rows enabled: email (after domain verify), blog, telegram (config.channel_id=@AlShaheenAi)
cd apps/web && pnpm dev            # http://localhost:3210
```

Email channel additionally requires the **Resend domain `alshaheenai.com` verified** (DNS via Cloudflare MCP). Until then, the email channel is expected to fail cleanly while blog + Telegram succeed (SC-002).

## Scenario 1 — Double opt-in subscribe (SC-004)

1. Open `http://localhost:3210/subscribe`, submit a real test address.
2. Expect: a `subscribers` row with `status='pending'` and a confirmation email arrives.
3. Click the confirmation link → redirected to `/subscribe?confirmed=1`; row now `status='active'`, `confirmed_at` set.
4. Re-submit the same address → no duplicate, no second confirmation (no-op success).

**Pass**: subscriber becomes `active` only after confirming; no duplicates.

## Scenario 2 — Approve, then publish trigger fans out (SC-001, SC-002, SC-006)

1. Build a draft and approve it via the Telegram review bot (baseline flow) → a `published_issues` row exists (ready), `channel_results` empty.
2. Confirm it is **not** yet on the blog: `GET /issues/<slug>` ⇒ 404 (FR-015).
3. Fire the trigger:
   ```bash
   curl -XPOST localhost:3210/api/cron/publish -H "x-ingest-secret: $SECRET" \
     -H 'content-type: application/json' -d '{}'
   ```
4. Expect a JSON response with a per-channel result for each enabled channel (no missing channels — SC-001).
5. Verify each channel:
   - **blog**: `GET /issues/<slug>` now renders the full Arabic issue (RTL, brand); it appears on `/issues`.
   - **telegram**: the post appears in `@AlShaheenAi` with headline + link to the blog page.
   - **email**: active subscribers receive the issue from `news@alshaheenai.com` with a working unsubscribe link (if domain verified; else result shows `failed` with a clear reason and the other two still succeed — SC-002).

**Pass**: every enabled channel has a `success`/`failed`/`skipped` record; one channel's failure doesn't block others; unapproved issues refuse distribution.

## Scenario 3 — Idempotent re-trigger (SC-003)

1. Re-run the same `curl` from Scenario 2 (no `force`).
2. Expect: channels already at `success` are skipped — **no duplicate** emails, blog entries, or Telegram posts.
3. Re-run with `{"force":true,"channels":["telegram"]}` → only Telegram re-posts.

**Pass**: 0 duplicates on plain re-trigger; `force` re-runs only the named channel.

## Scenario 4 — Failed-channel recovery (SC-002, SC-007)

1. Temporarily misconfigure one channel (e.g. wrong Telegram `channel_id`) and trigger publish.
2. That channel records `failed`; others `success`.
3. In `/admin/issues/<id>`, see per-channel status; fix config; click "re-publish channel" for the failed one.
4. Expect: only that channel re-runs and turns `success`; successful channels untouched.

**Pass**: Editor identifies and recovers a failed channel without re-sending successful ones (< 2 min).

## Scenario 5 — Unsubscribe (SC-004)

1. In a received newsletter, click unsubscribe (and verify the one-click `List-Unsubscribe-Post` works from a supporting client).
2. Expect: subscriber `status='unsubscribed'`; excluded from the next publish run.

**Pass**: unsubscribed reader receives 0 further emails.

## References

- Endpoint/page contracts: [contracts/publishing-endpoints.md](./contracts/publishing-endpoints.md)
- Data shapes & migration: [data-model.md](./data-model.md)
- Decisions & rationale: [research.md](./research.md)
