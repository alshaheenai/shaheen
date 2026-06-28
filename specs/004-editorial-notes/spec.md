# Feature Specification: Editorial Notes — «نصيحة الشاهين» (standing editorial guidance)

**Feature Branch**: `004-editorial-notes`

**Created**: 2026-06-26

**Status**: Implemented (code complete; lint + `next build` green). Gated, pending Editor go-ahead: **T002** (prod migration on `tciiwpzkgtsoypuaghld`) and **T008** (live build verify). Live render/CRUD/regression checks (T012/T015/T016/T017) depend on those gated steps; FR-009 confirmed by design (regen calls `buildDailyIssue`, which reloads active notes each run).

**Input**: The Editor (Mohammed) records standing personal editorial opinions/knowledge ("notes"). On each build the engine **semantically** decides whether a note genuinely applies to a selected story, and — when it does — expresses the Editor's stance **faithfully** through that story's «بعين الشاهين» (`our_take`) line. Notes are durable: they influence **future** issues whenever a relevant topic recurs; they affect the current issue only while it is still an unpublished draft. Builds on the baseline (`specs/001-baseline-as-built`) and the live pipeline (`lib/pipeline/run.ts`).

> **Builds on**: `specs/001-baseline-as-built`. The engine already writes a `MainStory.our_take` («بعين الشاهين») per `IssueBody` and renders it on blog/email/Telegram. This spec adds Editor-authored standing notes that steer that line, and extends the line to roundup/tools when a note applies.

> **Scope after clarification**: v1 input is the **admin UI only** (Telegram input deferred). Notes flow through the **existing** «بعين الشاهين» block — **no new reader-facing block or label**.

## Clarifications

### Session 2026-06-26

- Q: What is the nature of a note — a one-shot annotation on one story, or standing knowledge? → A: **Standing editorial knowledge.** It is stored and "taken into account from the next issue onward"; it is not consumed after one use.
- Q: How does the engine link a note to the right story in future issues? → A: **AI semantic matching, no tags.** The Editor writes free Arabic text; the engine decides relevance.
- Q: When a note applies, how does it appear to the reader? → A: **A single «بعين الشاهين» block** for that story, written by the AI but **bound faithfully** to the Editor's note. No separate human/AI label (chosen over two distinct blocks or a verbatim block).
- Q: Which stories can a note affect? → A: **Any selected story** — main, roundup, or tools — wherever it semantically matches. Roundup/tools (which today have no «بعين الشاهين») gain a short one only when a note applies.
- Q: When does a note take effect? → A: **From the next build onward.** It affects the current issue **only if that issue is still an unpublished draft** (via a rebuild/regen). A **published** issue is never altered.
- Q: Where does the Editor write notes? → A: **Admin UI in v1** (`/admin/notes`). Telegram input is deferred to a later iteration.
- Q: Lifecycle of a note? → A: **Standing** — active until the Editor disables it; re-applied every time the topic recurs. Notes are editable and deletable.
- Q: Fidelity? → A: **Concrete recommendations are preserved faithfully** (e.g., "the $20 plan is not enough — take the $115 one" must not be softened, flipped, or contradicted by the AI).

## User Scenarios & Testing *(mandatory)*

Actors: the **Editor/Admin** (records and manages notes; still reviews every draft via Telegram before it publishes — Constitution Principle VI) and the **Reader** (receives the issue with the Editor's stance woven into the relevant story's «بعين الشاهين»).

### User Story 1 - Editor's stance reaches readers on matching stories (Priority: P1)

The Editor records a standing opinion (e.g., "Anthropic's $20 Cloud plan is not enough for real projects — recommend the $115 plan"). On the next build, whenever a selected story is genuinely about that topic, the story's «بعين الشاهين» expresses the Editor's stance in the newsletter voice. This is the core value: the Editor's experience shapes the product without writing each issue by hand.

**Why this priority**: This is the feature. Without it there is nothing to ship.

**Independent Test**: Save one note about a topic, run a live build of an issue that contains a story on that topic, and confirm the story's «بعين الشاهين» reflects the Editor's stance.

**Acceptance Scenarios**:

1. **Given** an active note about topic X, **When** the engine builds an issue whose selected stories include a story about X, **Then** that story's «بعين الشاهين» conveys the Editor's stance on X.
2. **Given** an active note about topic X, **When** the built issue contains no story about X, **Then** no «بعين الشاهين» mentions the note and the note remains active for future builds.
3. **Given** no active notes, **When** the engine builds an issue, **Then** output behaviour is unchanged from before this feature (no regression).

### User Story 2 - The Editor's recommendation is conveyed faithfully (Priority: P1)

When a note carries a concrete recommendation, the published «بعين الشاهين» must convey it without softening, reversing, or contradicting it — even when the underlying source article recommends the opposite.

**Why this priority**: A note that gets diluted or flipped is worse than no note — it misrepresents the Editor. Fidelity is what makes the feature trustworthy.

**Independent Test**: Use a note whose recommendation contradicts the source article (source says "$20 plan"; note says "$115 plan"); build; confirm the «بعين الشاهين» recommends the $115 plan and does not endorse the $20 plan.

**Acceptance Scenarios**:

1. **Given** a note with a specific recommendation that contradicts the source, **When** the story is written, **Then** the «بعين الشاهين» states the Editor's recommendation and does not endorse the contradicted option.
2. **Given** a note with a concrete figure/price/name, **When** the story is written, **Then** that figure/price/name appears unchanged.

### User Story 3 - Manage notes from the admin (Priority: P2)

The Editor can create, edit, deactivate/reactivate, and delete notes from `/admin/notes`, seeing all current notes and their active state — no code change or deploy.

**Why this priority**: Notes accumulate; without management they become unmaintainable. Not needed for the very first live proof, hence P2.

**Independent Test**: Create a note, edit its text, deactivate it, and confirm a subsequent build no longer applies it; reactivate and confirm it applies again.

**Acceptance Scenarios**:

1. **Given** the admin notes page, **When** the Editor adds a note, **Then** it is persisted and active by default.
2. **Given** an active note, **When** the Editor deactivates it, **Then** the next build does not apply it.
3. **Given** any note, **When** the Editor edits or deletes it, **Then** the change persists and is reflected on the next build.
4. **Given** a non-admin, **When** they attempt to read or write notes, **Then** access is denied (RLS `is_admin()`).

### User Story 4 - Current draft vs published issue (Priority: P2)

A newly added/edited note can be applied to the **current** issue only while it is still an unpublished draft, by rebuilding/regenerating it. An already-**published** issue is never changed by a note.

**Why this priority**: Protects published trust (immutability) while letting the Editor fix a draft he is reviewing.

**Independent Test**: With a draft open for review, add a relevant note, regenerate, and confirm the draft now reflects it; then publish, add another relevant note, and confirm the published issue is unchanged.

**Acceptance Scenarios**:

1. **Given** an unpublished draft and a new relevant note, **When** the Editor regenerates the draft, **Then** the draft reflects the note.
2. **Given** a published issue, **When** a relevant note is added or edited, **Then** the published issue's stored content is not modified.

### User Story 5 - Notes apply across blocks (Priority: P3)

A note applies to whichever selected story matches — main, roundup, or tools. Roundup/tools items, which today carry only a `blurb`, gain a short «بعين الشاهين» line **only** when a note applies to them.

**Why this priority**: Broadens coverage so the Editor's stance is not missed when the relevant story isn't the main one. P3 because the main-story path already delivers most of the value.

**Independent Test**: Save a note matching a topic that appears as a roundup/tools item (not the main story); build; confirm that item carries a short «بعين الشاهين» reflecting the note, and other roundup/tools items do not.

**Acceptance Scenarios**:

1. **Given** an active note matching a roundup/tools item, **When** the issue is built, **Then** that item shows a short «بعين الشاهين» reflecting the note.
2. **Given** no note matches a roundup/tools item, **When** the issue is built, **Then** that item shows no «بعين الشاهين» (unchanged from today).

### Edge Cases

- **No active notes** → pipeline behaves exactly as today (no extra fields, no «بعين الشاهين» on roundup/tools).
- **Multiple notes match one story** → at most **one** note (the strongest match) is applied per story; one editorial take per story.
- **One note matches several stories in the same issue** → it may surface on each genuinely-matching story. This is rare (`dedupeByTitle` already removes same-headline duplicates) and a take appearing twice is mildly redundant, not broken — no cross-call dedup is built for it.
- **Note matches a candidate that the relevance gate drops** → the note is simply not applied that day; it stays active.
- **Weak/uncertain match** → the engine does NOT force-apply; "no match" is the safe default.
- **Two notes that contradict each other** → out of scope for v1; the Editor is responsible for keeping notes coherent (no automatic conflict resolution).
- **Already-published issue** → never modified by note add/edit/delete.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST persist Editor-authored notes (free Arabic text) with an `active` flag and created/updated timestamps.
- **FR-002**: The system MUST let an admin create, edit, deactivate/reactivate, and delete notes from `/admin/notes`. All reads/writes MUST be gated by `is_admin()` (RLS), consistent with every other admin table.
- **FR-003**: On each build, the engine MUST load the **active** notes and make them available to the story-writing step.
- **FR-004**: The story-writing step MUST decide **semantically** (no tags) whether a note genuinely applies to a given selected story, applying **at most one note per story**. Uncertain matches MUST default to "not applied". (No cross-story bookkeeping: each writing call enforces the per-story cap on its own; the rare case of one note matching two distinct selected stories in the same issue is acceptable — see Edge Cases.)
- **FR-005**: When a note applies to a story, the engine MUST express the Editor's stance through that story's «بعين الشاهين» (`our_take`) line, in the newsletter voice.
- **FR-006**: The engine MUST convey concrete recommendations/figures from the note **faithfully** — never softening, reversing, or contradicting them, even when the source article disagrees.
- **FR-007**: For roundup/tools items (which have no «بعين الشاهين» today), the engine MUST generate a short «بعين الشاهين» line **only** when a note applies; otherwise those items are unchanged.
- **FR-008**: Notes MUST take effect **from the next build onward**. Adding/editing/deleting a note MUST NOT modify any **published** issue's stored content.
- **FR-009**: The Editor MUST be able to apply a new/edited note to the **current** issue only while it is an **unpublished draft**, via the existing rebuild/regenerate path.
- **FR-010**: Notes MUST be **standing** — they remain active and re-apply whenever a relevant topic recurs, until the Editor deactivates or deletes them (no automatic expiry in v1).
- **FR-011**: The full-issue renderers (**blog** `issue-view.tsx` and **email** templates) MUST render the resulting «بعين الشاهين» — including the new optional roundup/tools line — with no new reader-facing label or block. The **Telegram channel** post is a deliberate **summary** (headline + a few TL;DR bullets + blog link) and is **unchanged**; the Editor's take reaches Telegram readers through the blog link.
- **FR-012** *(out of scope marker)*: Telegram input of notes is **deferred**; v1 input is the admin UI only.

### Key Entities *(include if feature involves data)*

- **EditorialNote**: a standing, Editor-authored Arabic opinion/instruction. Attributes: stable id, body text, active flag, created/updated timestamps. Optionally (P3, may defer): a record of the last issue/story it was applied to, for transparency. No tags, no per-note targeting metadata (matching is semantic).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After saving a note about topic X, a live build of an issue that contains an X story expresses the Editor's stance in that story's «بعين الشاهين» (verified on a real build, not a unit test).
- **SC-002**: In 100% of applied cases, a concrete recommendation/figure in the note appears unchanged and uncontradicted in the published «بعين الشاهين» (manual review of applied cases).
- **SC-003**: With no active notes, a built issue is behaviourally identical to pre-feature output (no regression; no «بعين الشاهين» added to roundup/tools).
- **SC-004**: Adding/editing/deleting a note never changes the stored content of an already-published issue (verified by comparing the published record before/after).
- **SC-005**: The Editor can create, edit, or deactivate a note from `/admin` in under one minute, with no code change or deploy.
- **SC-006**: At most one editorial take appears per story; no story ever shows two «بعين الشاهين» blocks.

## Assumptions

- **Input surface**: v1 is the admin UI only (`/admin/notes`); Telegram input is deferred to a later iteration (Editor confirmed 2026-06-26).
- **Matching mechanism**: semantic matching is performed by the **existing** OpenRouter writing model inside the current story-writing step — **no separate pipeline node** (Constitution Principle V, "simplicity first"). Active notes are passed in that step's prompt.
- **Cost/scale**: with a small number of active notes the added prompt tokens are modest and acceptable. If notes grow large in volume, retrieval (tags/embeddings) becomes a **future** change — explicitly out of scope for v1.
- **Rendering reuse**: the **blog** (`issue-view.tsx`) and **email** renderers already display `MainStory.our_take` conditionally; v1 reuses that path and adds an **optional** «بعين الشاهين» field to roundup/tools items, rendered only when present. The **Telegram channel** post is summary-only (no story bodies) and is not changed.
- **Voice & brand**: notes are written by the Editor in Arabic; the engine renders them in the data-driven «بعين الشاهين» voice from `brand_config` (Constitution Principle II).
- **Human-in-the-loop preserved**: notes do not bypass review — every draft still goes through Telegram approval before publishing (Constitution Principle VI).
- **Security**: the new `editorial_notes` table follows the existing pattern — RLS on, writes gated by `is_admin()` (Constitution Principle IV); the production migration is a sensitive step requiring the Editor's explicit go-ahead.
- **Out of scope (v1)**: Telegram input; conflict resolution between contradictory notes; per-note analytics/usage dashboards; auto-expiry.

## Constitution Alignment

- **III. Spec-First (non-negotiable)**: this spec precedes any implementation; plan → tasks → implement follow.
- **V. Simplicity & Surgical Changes**: no new pipeline node and no new reader-facing block — reuse the story-writing step and the «بعين الشاهين» line.
- **VI. Human-in-the-Loop Publishing**: notes are Editor-authored and still pass Telegram review; nothing auto-publishes.
- **II. Practical Arabic, Data-Driven Brand**: the stance is rendered in the existing brand voice/labels.
- **IV. Security by Default**: `editorial_notes` is RLS-protected and admin-gated like every other table.
