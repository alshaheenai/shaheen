# Phase 1 — Data Model: Real Publishing (Phase 7)

Phase 7 adds **no new tables**. It uses one small migration to `subscribers` and a defined shape for the existing `published_issues.channel_results` jsonb. All other tables are reused as-is.

## 1. `subscribers` (migration)

Existing columns (`supabase/setup.sql`): `id uuid pk`, `email text unique`, `name text`, `status text not null default 'active'`, `source text`, `confirmed_at timestamptz`, `created_at`, `updated_at`.

**Migration `supabase/migrations/0001_phase7_subscribers.sql`:**

| Change | Detail |
|--------|--------|
| Add `confirmation_token text` | default `gen_random_uuid()::text`; one-time, cleared on confirm. |
| Add `unsubscribe_token text` | default `gen_random_uuid()::text`; durable, used by one-click unsubscribe. |
| Alter default of `status` | `'active'` → `'pending'` (existing rows unchanged). |
| Backfill | set both tokens for any existing rows where null. |
| Index | unique index on `confirmation_token` and on `unsubscribe_token` (partial, where not null) for fast lookup. |

**State machine** (`status`):
```
pending  --confirm(token)-->  active  --unsubscribe(token)-->  unsubscribed
   │                                                               ▲
   └──────────────── (never emailed; only confirmation email) ─────┘
```
- Only `active` subscribers receive newsletters.
- `pending` receives exactly one confirmation email.
- `unsubscribed` receives nothing; re-subscribing moves them back to `pending` (re-confirm).

**Validation rules**:
- `email` unique, syntactically valid, lower-cased/trimmed on insert.
- A subscribe request for an existing `active` email is a no-op success (no duplicate, no new confirmation spam).
- Tokens are unguessable (UUID) and never exposed except in the user's own emailed links.

**RLS**: unchanged — the existing narrow `anon insert` policy stays; confirm/unsubscribe/list run via the service-role (admin) client server-side.

## 2. `published_issues.channel_results` (jsonb shape — no schema change)

Existing column: `channel_results jsonb not null default '{}'`. Phase 7 defines its shape:

```jsonc
{
  "email":    { "status": "success", "at": "2026-06-17T00:05:12Z", "summary": { "recipients": 142, "failed": 0, "batches": 2 } },
  "blog":     { "status": "success", "at": "2026-06-17T00:05:01Z", "summary": { "url": "https://alshaheenai.com/issues/2026-06-17-ab12cd34" } },
  "telegram": { "status": "failed",  "at": "2026-06-17T00:05:20Z", "summary": { "error": "bot is not an admin of the channel" } }
}
```

- **Keys**: channel name (`email` | `blog` | `telegram`; future `x`).
- **`status`**: `success` | `failed` | `skipped` (channel disabled).
- **`at`**: ISO 8601 timestamp of the attempt.
- **`summary`**: channel-specific — email: `{ recipients, failed, batches }`; blog: `{ url }`; telegram: `{ message_id }` or `{ error }`.
- **Derived states**:
  - *Ready (approved, not distributed)*: row exists, no channel at `success`.
  - *Publicly visible (blog)*: `channel_results.blog.status = 'success'`.
  - *Fully published*: every **enabled** channel at `success`.
- **Idempotency**: a channel at `success` is skipped on re-trigger unless `force=true`.

## 3. `publishing_channels` (reused; rows seeded, not schema)

Existing: `channel text unique`, `enabled boolean default false`, `config jsonb`. Phase 7 seeds/enables three rows:

| channel | enabled | config (jsonb) |
|---------|---------|----------------|
| `email` | true (after domain verified) | `{ "from": "news@alshaheenai.com" }` (sender; key from env) |
| `blog` | true | `{}` (no external target) |
| `telegram` | true | `{ "channel_id": "@AlShaheenAi" }` (public channel handle/id) |

The orchestrator only attempts `enabled` channels; a disabled channel records `status:'skipped'`.

## 4. `published_issues` (reused, unchanged)

`body jsonb` holds the `IssueBody` (from `lib/pipeline/types.ts`): `{ tldr_bullets: string[], main: MainStory|null, roundup: RoundupItem[], tools: ToolItem[] }`. `slug` (unique) is the public URL key. `title`, `issue_date` used by blog/email/Telegram. No changes.

## 5. Configuration entities (read-only helpers, no schema)

- **`brand_config`** (singleton) — name, tagline, palette, `settings` (voice, sections, domain, emails). Read by email/blog/Telegram renderers. New: an admin-client fetch variant for background jobs.
- **`app_settings`** (key/value) — `publish_time`, `timezone`, `review_mode`, etc. New `getAppSetting(key)` helper (publish trigger may consult, but Phase 7 doesn't schedule).

## Migration application

Apply `0001_phase7_subscribers.sql` to the official project (`tciiwpzkgtsoypuaghld`) via the **Supabase MCP `apply_migration`** (now connected) or the SQL Editor. Keep the file in `supabase/migrations/` and also fold the same DDL into `supabase/setup.sql` so a fresh project bootstrap stays complete (per the repo's single-setup-file convention).
