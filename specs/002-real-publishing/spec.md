# Feature Specification: Real Publishing (Phase 7 — النشر الفعلي)

**Feature Branch**: `002-real-publishing`

**Created**: 2026-06-17

**Status**: Draft

**Input**: When the Editor approves a daily draft, actually distribute the published issue to its public channels — email (Resend), a public blog page, and the Telegram channel — each publishing independently and recording per-channel success/failure. (Original request also named an X thread; X was deferred during clarification — see Clarifications.) Builds on the baseline (`specs/001-baseline-as-built`).

> **Builds on**: `specs/001-baseline-as-built` (the system already produces an approved issue in `published_issues` with a unique slug, and has `publishing_channels`, `channel_results`, and `subscribers` tables, plus Resend/X keys in env). This spec adds the actual outward distribution.

> **Scope after clarification**: three channels in Phase 7 — **email, public blog, Telegram channel**. **X is deferred** (see Clarifications).

## Clarifications

### Session 2026-06-17

- Q: When the Editor approves a draft, when should distribution fire? → A: Approval marks the issue **ready to publish**; a separate **publish trigger** (a guarded endpoint, invokable manually now and cron-driven at ~03:00 in Phase 10) performs the fan-out. Decouples review time (~12:30) from publish time (~03:00).
- Q: Does Phase 7 include the public subscriber signup, or send to existing subscribers only? → A: **Include a public subscribe flow with double opt-in** (email confirmation before a subscriber is active). Requires a small `subscribers` migration (default `pending` + confirmation token).
- Q: Include the X (Twitter) channel in Phase 7 given it needs a paid API tier (~$100+/mo)? → A: **Defer X to a later phase.** Phase 7 ships email + blog + Telegram (all zero recurring cost); X can be added later by enabling its channel.

## User Scenarios & Testing *(mandatory)*

Actors: the **Editor/Admin** (approves and oversees distribution) and the **Reader** (subscriber or public visitor who receives/reads the issue). Distribution NEVER fires automatically — it follows an Editor approval (Constitution Principle VI).

### User Story 1 - Approved issue reaches readers by email (Priority: P1)

After the Editor approves a daily issue, the system sends the full Arabic issue by email to the active subscriber list, from the Al-Shaheen verified sender, with a working unsubscribe link. This is the primary distribution channel and the core of "real publishing."

**Why this priority**: Email is the newsletter's defining channel; without it there is no newsletter. It also carries the strongest legal/reputational obligations (sender verification, unsubscribe).

**Independent Test**: With a verified sending domain and at least one active subscriber, approve an issue; confirm each active subscriber receives one email rendering the issue in Arabic with the brand, and that the unsubscribe link works.

**Acceptance Scenarios**:

1. **Given** an approved issue and a verified sending domain, **When** the email channel runs, **Then** every active subscriber receives exactly one email of that issue, in Arabic, with the Al-Shaheen branding and a working unsubscribe link.
2. **Given** the email channel completes, **When** the Editor checks results, **Then** the per-channel outcome (sent count, failures) is recorded against the issue.
3. **Given** the email channel is re-triggered for the same issue, **When** it runs again, **Then** subscribers are not emailed the same issue twice (idempotent send).
4. **Given** a reader clicks unsubscribe, **When** they confirm, **Then** they are marked inactive and excluded from all future sends.
5. **Given** the sending domain is not yet verified, **When** the email channel runs, **Then** it fails cleanly, records the reason, and does not block the other channels.

---

### User Story 2 - Each issue has a public blog page (Priority: P1)

Every published issue is readable on a public web page at a stable, shareable URL that renders the full Arabic issue with the Al-Shaheen brand, plus a simple public archive listing past issues. This page is the canonical link the other channels point to.

**Why this priority**: The blog is the shareable home of each issue; email and Telegram both link to it, so it must exist for those channels to be useful.

**Independent Test**: Approve an issue; visit its public URL with no authentication and confirm the full issue renders in Arabic with branding; visit the archive and confirm the issue is listed.

**Acceptance Scenarios**:

1. **Given** a published issue with a unique slug, **When** any visitor opens its public URL, **Then** the full issue renders in Arabic with Al-Shaheen branding and requires no login.
2. **Given** several published issues, **When** a visitor opens the public archive, **Then** they see a list of published issues newest-first, each linking to its page.
3. **Given** a draft/unapproved issue, **When** anyone requests its URL, **Then** it is not publicly accessible.
4. **Given** a published issue's URL, **When** it is shared, **Then** it shows an appropriate title/description preview for link sharing.

---

### User Story 3 - Issue is announced to the Telegram channel (Priority: P2)

After approval, the system posts the issue to the public Al-Shaheen Telegram channel so channel followers are notified, with a link back to the blog page for the full read.

**Why this priority**: A no-cost, high-reach channel that reuses existing Telegram infrastructure; valuable but secondary to email + blog.

**Independent Test**: Approve an issue; confirm a post appears in the configured public Telegram channel containing the headline and a link to the blog page.

**Acceptance Scenarios**:

1. **Given** an approved issue and a configured channel, **When** the Telegram-channel step runs, **Then** a post appears in the public channel with the issue headline/summary and a link to the blog page.
2. **Given** the post fails (e.g. bot lacks channel rights), **When** the step runs, **Then** the failure is recorded and the other channels are unaffected.
3. **Given** the same issue is re-triggered, **When** the step runs again, **Then** it does not create a duplicate post.

---

### User Story 4 - Editor oversees and recovers distribution (Priority: P2)

The Editor can see, per issue, which channels succeeded and which failed, and can re-trigger only the failed channels without re-sending the successful ones.

**Why this priority**: Distribution touches several unreliable external services; the Editor needs visibility and a safe retry, or partial failures become silent (violates the project's no-silent-failure stance).

**Independent Test**: Force one channel to fail; confirm the Editor sees the per-channel status and can re-run just that channel, after which all channels show success and nothing was duplicated.

**Acceptance Scenarios**:

1. **Given** a published issue, **When** the Editor views it, **Then** each channel's status (success/failure, timestamp, summary like sent-count or post link) is visible.
2. **Given** one channel failed, **When** the Editor re-triggers that channel, **Then** only that channel runs and previously-successful channels are not re-published.
3. **Given** all channels succeeded, **When** the Editor views the issue, **Then** it is clearly marked fully published.

---

### Edge Cases

- **Empty/zero active subscribers**: the email channel records "0 recipients" as a successful no-op rather than an error.
- **Partial channel failure**: one channel failing (email/blog/Telegram) MUST NOT prevent the others from publishing; each result is recorded independently.
- **Re-trigger / double-fire**: re-running publication for an already-published issue+channel MUST NOT duplicate emails or posts (idempotency per issue+channel).
- **Unverified sending domain**: email fails cleanly with a clear recorded reason; blog/Telegram still publish.
- **Oversized content for Telegram**: summarized; never truncated mid-word; always ends with the blog link.
- **Unsubscribe race**: a reader who unsubscribes after a send is queued but before it is delivered is excluded from that send if still pending, and from all future sends.
- **Approval → publish gap**: approval sets the issue to *ready to publish*; nothing is distributed until the publish trigger fires (manual now / cron at ~03:00 in Phase 10). An approved-but-not-yet-published issue is visible to the Editor as ready, with no channel results yet.
- **Invalid/bouncing email addresses**: recorded as per-recipient failures without failing the whole send.

## Requirements *(mandatory)*

### Functional Requirements

**Orchestration & control**
- **FR-001**: Editor approval MUST mark the issue as *ready to publish* but MUST NOT itself distribute to channels; distribution happens only when a separate **publish trigger** fires. No distribution may occur without a prior Editor approval (human-in-the-loop).
- **FR-001a**: The publish trigger MUST be a guarded endpoint that can be invoked manually now and scheduled by cron (~03:00) in Phase 10; firing it distributes a ready issue to all enabled channels.
- **FR-002**: Each of the three Phase-7 channels (email, blog, Telegram) MUST publish independently; a failure in one MUST NOT block or roll back the others. (The orchestration MUST be channel-generic so a deferred channel such as X can be added later by enabling it.)
- **FR-003**: The system MUST record a per-channel result for each issue (status, timestamp, and a channel-appropriate summary such as recipient count, post URL, or error reason).
- **FR-004**: Re-triggering publication MUST be idempotent per issue+channel: it MUST NOT duplicate emails, blog entries, or channel posts.
- **FR-005**: The Editor MUST be able to re-trigger only the channels that failed for a given issue, without re-publishing channels that already succeeded.
- **FR-006**: Only channels that are enabled in configuration MUST be attempted; a disabled channel is skipped and recorded as skipped.
- **FR-007**: Every endpoint that triggers distribution MUST reject requests lacking the shared secret (consistent with the baseline's guarded endpoints).

**Email channel**
- **FR-008**: The system MUST send the approved issue by email to all active subscribers, in Arabic, rendered with the Al-Shaheen brand.
- **FR-009**: Emails MUST be sent from the verified Al-Shaheen domain sender and MUST include a working one-click unsubscribe mechanism.
- **FR-010**: Unsubscribing MUST mark the subscriber inactive and exclude them from all future sends.
- **FR-011**: The email send MUST record recipient count and per-recipient failures, and MUST treat zero active subscribers as a successful no-op.
- **FR-012**: The system MUST provide a public subscribe action that acquires subscribers via double opt-in: a new subscriber is recorded as `pending` and becomes `active` only after confirming via a tokenized link emailed to them. (Requires a `subscribers` migration: default status `pending` + a confirmation token.)

**Blog channel**
- **FR-013**: The system MUST serve a public, unauthenticated web page for each published issue at a stable URL derived from the issue's unique slug, rendering the full issue in Arabic with Al-Shaheen branding.
- **FR-014**: The system MUST serve a public archive page listing published issues newest-first, each linking to its page.
- **FR-015**: Unapproved/draft issues MUST NOT be publicly accessible.
- **FR-016**: Each public issue page MUST expose share-friendly title/description metadata for link previews.

**Telegram channel**
- **FR-017**: The system MUST post each published issue to the configured public Telegram channel, including the headline/summary and a link to the blog page.

**Setup / prerequisites**
- **FR-018**: The system MUST allow the Al-Shaheen sending domain to be verified for email (publishing the required DNS authentication records), and the email channel depends on this verification being complete.
- **FR-019**: Channel targets and credentials MUST be configured via existing configuration/secrets (data-driven brand; secrets in env), not hardcoded.

> **Deferred (not in Phase 7):** X (Twitter) thread posting — deferred because it requires a paid X API tier (~$100+/mo). The orchestration is channel-generic (FR-002) so X can be added later as an enabled channel without rework.

### Key Entities

- **Published issue**: the approved issue being distributed (from baseline) — unique slug, Arabic body (TL;DR, main + our-take, roundup, tools), title, issue date.
- **Channel result**: per issue+channel outcome — channel name, status (success/failure/skipped), timestamp, summary payload (recipient count, post URL, or error reason). Stored as a structured map keyed by channel on the published issue (the existing `channel_results` jsonb column) — no separate table is required; this also serves as the per-channel idempotency record.
- **Publishing channel config**: which channels are enabled and their target configuration (e.g. Telegram channel id, sender address).
- **Subscriber**: a reader on the email list — email address, status (pending/active/unsubscribed), confirmation state, timestamps.
- **Public reader**: an unauthenticated visitor of the blog (no stored identity required to read).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: When the Editor approves an issue, all enabled channels are attempted and a per-channel result is recorded for each, with 100% of attempts producing a success/failure/skipped record (no silent gaps).
- **SC-002**: A single channel failure leaves the other channels fully published (0 cross-channel blocking).
- **SC-003**: Re-triggering publication of an already-published issue results in 0 duplicate emails, blog entries, or channel posts.
- **SC-004**: 100% of newsletter emails are sent from the verified Al-Shaheen domain and contain a working unsubscribe link; an unsubscribed reader receives 0 further emails.
- **SC-005**: Every published issue is reachable at its public URL by an unauthenticated visitor within the publish window, and appears in the public archive.
- **SC-006**: No issue is ever distributed to any channel without a preceding Editor approval (verified by attempting distribution on an unapproved issue and observing it is refused).
- **SC-007**: The Editor can identify and recover a failed channel for any issue in under 2 minutes using the per-channel status, without re-sending successful channels.

## Assumptions

> The following are informed defaults chosen to keep the spec complete. The three product/architecture decisions are now settled (see Clarifications, Session 2026-06-17).

- **Publish timing (decided)**: approval marks the issue *ready to publish*; a distinct **publish trigger** (a guarded endpoint, manually invokable now and cron-driven at ~03:00 in Phase 10) fans out to the channels, decoupling review time (~12:30) from publish time (~03:00).
- **Subscriber signup (decided)**: Phase 7 includes a public subscribe form with double-opt-in email confirmation; new subscribers are `pending` until they confirm.
- **X channel (decided: deferred)**: X is deferred to a later phase because it requires a paid X API tier (~$100+/mo). Phase 7 ships email + blog + Telegram. The orchestration stays channel-generic so X can be enabled later without rework.
- **Email content**: the email contains the full issue (not just a teaser), matching a newsletter's expectation; Telegram carries a summary + a link to the blog.
- **Blog hosting**: the blog is served by the existing application (same deployable unit) at the project domain; a full custom CMS is out of scope.
- **Localization/RTL**: all reader-facing output is Arabic, right-to-left, reusing the existing brand styling.
- **Sending domain**: `news@alshaheenai.com` on `alshaheenai.com`; DNS records for email auth are added via the Cloudflare MCP as a prerequisite setup task.
- **Idempotency key**: idempotency is tracked per issue+channel (e.g. via the recorded channel results), so re-triggers are safe.
- **Out of scope (explicit)**: the **X (Twitter) channel** (deferred — paid API tier), weekly digest (Phase 8), reader ratings/analytics wiring (Phase 9), VPS deploy + cron scheduling (Phase 10 — Phase 7 provides the manually-triggerable publish endpoint that Phase 10 will schedule), issue cover images (Phase 6).
- **Dependencies**: builds on the baseline system; reuses `published_issues` (incl. its `channel_results` jsonb column), `publishing_channels` (rows are `enabled=false` by default and must be enabled/configured), `subscribers`, and the configured Resend/Telegram credentials in env.
- **Schema reality (verified 2026-06-17)**: `channel_results` is a jsonb column on `published_issues` (not a table) — sufficient for per-channel results + idempotency. `publishing_channels(channel, enabled, config)` exists. `subscribers(email, status, confirmed_at, source, name)` exists; double opt-in (if chosen) needs a migration (default `pending` + confirmation token). No other new tables are anticipated for Phase 7.
