# Phase 1 — Contracts: Publishing Endpoints & Pages

All API routes run on the Node runtime. Triggering/admin endpoints are guarded by `INGEST_SECRET` (header `x-ingest-secret`, matching the baseline). Public reader/subscribe routes are unauthenticated but write only via server-side admin client with unguessable tokens.

## A. Publish trigger — `POST /api/cron/publish`

**Guard**: `x-ingest-secret: <INGEST_SECRET>` (401 otherwise).

**Request body** (all optional):
```jsonc
{
  "issueId": "uuid",        // default: TODAY'S ready issue only (issue_date = today). Older approved-but-undistributed issues are NEVER swept by the no-arg form — name them explicitly.
  "channels": ["email","blog","telegram"],  // default: all enabled channels
  "force": false            // re-run channels already at success
}
```

**Behavior**: For the target issue, run channels in this **mandatory order**: **`blog` first**, then `email` and `telegram`. For each requested ∩ enabled channel: if already `success` and not `force`, keep it (record/keep `success`); else run it and write its result into `published_issues.channel_results.<channel>`.
- **Blog dependency**: `email` and `telegram` embed the blog URL, so they are attempted **only if `blog` is `success`** for this issue. If blog is not live, email/telegram are recorded `failed` with `summary.error = "blog not live"` (never send a dead link).
- Email and telegram are independent **of each other** — one failing never aborts the other.
- Never acts on an issue that is not Editor-approved (no matching `published_issues` row ⇒ 404/no-op). The default (no `issueId`) is date-guarded to today's issue to avoid distributing a backlog.

**Response** `200`:
```jsonc
{
  "issueId": "uuid",
  "slug": "2026-06-17-ab12cd34",
  "results": {
    "email":    { "status": "success", "summary": { "recipients": 142, "failed": 0 } },
    "blog":     { "status": "success", "summary": { "url": "https://.../issues/2026-06-17-ab12cd34" } },
    "telegram": { "status": "failed",  "summary": { "error": "…" } }
  }
}
```
**Errors**: `401` (bad secret), `404` (no ready issue / issueId not found), `200` with per-channel `failed` entries for channel-level failures (not a top-level error — partial success is normal).

## B. Public subscribe — `POST /api/subscribe`

**Request** (form post or JSON): `{ "email": "x@y.com", "name": "optional" }`

**Behavior**: validate + normalize email. Upsert a `subscribers` row:
- new ⇒ `status='pending'`, fresh `confirmation_token`, send confirmation email.
- existing `pending` ⇒ resend confirmation (rate-limited; don't spam).
- existing `active` ⇒ no-op success.
- existing `unsubscribed` ⇒ back to `pending`, new token, send confirmation.

**Abuse guard (required)**: throttle to stop the verified domain being used to email-bomb third parties or burn Resend quota — (a) per-email cooldown: do not (re)send a confirmation if the `pending` row's `updated_at` is within ~5 min; (b) per-IP attempt cap per window. Unknown/duplicate emails return success **without** sending a second confirmation.

**Response**: `200 { "ok": true, "state": "pending|already_active" }` (never reveal whether an email already existed beyond the active/pending distinction needed for UX). On invalid email `400 { "ok": false, "error": "invalid_email" }`. On throttle `429 { "ok": false, "error": "rate_limited" }`.

## C. Confirm subscription — `GET /api/subscribe/confirm?token=<confirmation_token>`

**Behavior**: match `confirmation_token` ⇒ set `status='active'`, `confirmed_at=now()`, clear `confirmation_token`. Idempotent (already-active token ⇒ still success).

**Response**: `302` redirect to `/subscribe?confirmed=1` (friendly Arabic thank-you state). Unknown/expired token ⇒ redirect to `/subscribe?error=invalid`.

## D. Unsubscribe — `GET` and `POST /api/unsubscribe?token=<unsubscribe_token>`

**Behavior**: match `unsubscribe_token` ⇒ set `status='unsubscribed'`. Idempotent. `POST` supports the email **List-Unsubscribe-Post one-click** flow; `GET` supports the human link (renders a confirmation page). Excludes the subscriber from all future sends immediately.

**Response**: `GET` ⇒ `200` Arabic confirmation page; `POST` ⇒ `200 { "ok": true }`. Unknown token ⇒ `200`/page that states it's already unsubscribed (no token enumeration signal).

## E. Public blog pages (read-only Server Components)

- **`GET /issues`** — archive: lists `published_issues` where `channel_results.blog.status = 'success'`, newest-first (by `issue_date`/`published_at`), each linking to its page. Title, date, TL;DR teaser.
- **`GET /issues/[slug]`** — single issue: fetch by unique `slug` (must be blog-published, else `404`/notFound). Renders full `IssueBody` in RTL Arabic with brand. `generateMetadata` ⇒ `<title>`, description (from intro/TL;DR), Open-Graph/Twitter card for link previews.
- **`GET /subscribe`** — subscribe form + states (`?confirmed=1`, `?error=invalid`). Posts to `/api/subscribe`.

**Visibility rule**: drafts and approved-but-not-blog-published issues are NOT reachable on `/issues*` (FR-015).

## F. Admin oversight (server action, not a public contract)

On `/admin/issues/[id]`: render per-channel status from `channel_results`; a "re-publish channel" action calls the same `publishIssue(issueId, { channels: [ch], force: true })` used by the trigger, restricted to admins (`is_admin()`), and refreshes the row.

## Channel module contract (internal `lib/publish/*`)

Each channel exports `publish<Channel>(issue, ctx): Promise<ChannelResult>` where
```ts
type ChannelResult = { status: "success" | "failed" | "skipped"; at: string; summary?: Record<string, unknown> };
```
The orchestrator (`lib/publish/run.ts`) owns reading the issue, looping enabled channels, idempotency skip, calling each module, and persisting `channel_results`. Channel modules never write `channel_results` themselves (single writer = orchestrator).
