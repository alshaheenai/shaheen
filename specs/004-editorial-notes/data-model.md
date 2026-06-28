# Data Model: Editorial Notes

**Feature**: `004-editorial-notes` | **Date**: 2026-06-26

## New table: `editorial_notes`

A standing, Editor-authored Arabic opinion/instruction. Matching is semantic — **no tags or targeting columns**.

| Column       | Type          | Notes                                                        |
|--------------|---------------|--------------------------------------------------------------|
| `id`         | `uuid` PK     | `default gen_random_uuid()`                                  |
| `body`       | `text`        | NOT NULL. The note in Arabic, in the Editor's own words.      |
| `active`     | `boolean`     | NOT NULL `default true`. Standing until the Editor disables.  |
| `created_at` | `timestamptz` | NOT NULL `default now()`.                                    |
| `updated_at` | `timestamptz` | NOT NULL `default now()`; bump on update (trigger or in the server action). |

**Optional (P3, may defer — do NOT build unless cheap):** a `last_applied_at timestamptz` and/or a join recording which issue/story last used the note, for transparency. Not required by any P1/P2 story; omit from v1 unless trivial.

### Indexes
- Partial index on `active` is unnecessary at this scale (a handful of rows). Skip.

### RLS (mirror existing admin tables)
- Enable RLS.
- `SELECT` / `INSERT` / `UPDATE` / `DELETE` policies all gated by `is_admin()` (email present in `admins`), exactly like `sources`, `brand_config`, etc.
- The build job reads notes through `lib/supabase/admin.ts` (service-role, bypasses RLS) — consistent with every other background read.

### Migration
- Add to `supabase/setup.sql` (fresh-project parity) **and** apply as a migration to the official project `tciiwpzkgtsoypuaghld` via the `supabase` MCP.
- ⚠️ Applying to production is a **sensitive step** — only on the Editor's explicit go-ahead.

## Type deltas (`src/lib/pipeline/types.ts`)

Add an **optional** field so existing output stays valid when no note applies:

```ts
export type RoundupItem = {
  news_id: string;
  source_url: string | null;
  title: string;
  blurb: string;
  our_take?: string; // «بعين الشاهين» — present only when an editorial note applies
};

export type ToolItem = {
  news_id: string;
  source_url: string | null;
  name: string;
  blurb: string;
  our_take?: string; // «بعين الشاهين» — present only when an editorial note applies
};
```

`MainStory.our_take` already exists (required) — unchanged. When a note applies to the main story, its existing `our_take` carries the Editor's stance instead of an AI-only take.

## Note payload passed to prompts (in-memory, not persisted shape)

The three `write` prompts receive the active notes as a compact numbered list of bodies:

```
1) <body>
2) <body>
```

No id round-tripping and **no `applied_note_ids` output** — there is no cross-call bookkeeping (plan.md Decision 2). Each call only enforces **at most one note per story**.

- `mainStoryPrompt`: unchanged output (`our_take` carries the note's stance when one matches the main story).
- `roundupPrompt` / `toolsPrompt`: per-item **optional** `our_take?: string`, present only when a note matches that item.

## Data flow (per build)

1. `run.ts` loads active notes: `select body from editorial_notes where active = true`.
2. If none → skip injection entirely; behaviour identical to today (SC-003).
3. Main writer gets all active notes → returns `our_take` (note-bound if a note matches).
4. Roundup writer gets all active notes → returns items with optional `our_take`.
5. Tools writer gets all active notes → returns items with optional `our_take`.
6. Body assembled; rendered on **blog + email** (optional `our_take` shown only when present). The Telegram channel post is a summary (title + TL;DR bullets + blog link) and is unchanged.
7. Published issues are written separately and are **never** retro-modified by note changes (FR-008).
