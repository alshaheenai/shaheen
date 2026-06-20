# Feature Spec (brief): Home Page Redesign

**Status**: Implemented · **Scope**: `apps/web/src/app/page.tsx` only (reader-facing). No new logic — reuses existing pieces.

## Goal
Turn the bare landing page into a real home: a subscribe hero + the latest published newsletters, so a first-time visitor can subscribe or start reading immediately.

## Requirements
- **R1 — Hero**: brand name (`getBrand()`) + `brand.tagline` + the **existing** subscribe form (`SubscribeForm` from `/subscribe`) inline. No new subscribe logic.
- **R2 — "أحدث النشرات"**: query `published_issues` with the **same visibility filter as `/issues`** (`channel_results.blog.status === "success"` AND `slug` present), ordered by `published_at` desc, the **latest 6**. One card per issue: title + `issue_date` + first `body.tldr_bullets[0]` (teaser) → links to `/issues/[slug]`. Reuse the `IssueBody` type.
- **R3 — "كل النشرات"** link → `/issues`, shown only when there are issues.
- **R4 — Empty state**: «أول نشرة قريباً — اشترك ليصلك».
- **R5**: remove the «لوحة التحكم» (admin) button from the home page.
- **R6**: RTL, match the Al-Shaheen identity + existing styling; follow the UI rule — `buttonVariants()` on `<Link>` (no `Button asChild`); `export const revalidate = 300` (same as `/issues`). Card cover images deferred to Phase 6 (text only).

## Out of scope / constraints
- Do **not** touch `/issues` or `/issues/[slug]`.
- No new components beyond inline cards in `page.tsx`; reuse `SubscribeForm`, `getBrand`, the server Supabase client, `buttonVariants`, and `IssueBody`.

## Verification
- `eslint` clean; `next build` passes; no remaining «لوحة التحكم» on the home page.

## Note
- The DB query fetches a small buffer (12) and slices to 6 after the JS visibility filter (mirrors `/issues`, which filters in JS), guaranteeing up to 6 *published* cards.
