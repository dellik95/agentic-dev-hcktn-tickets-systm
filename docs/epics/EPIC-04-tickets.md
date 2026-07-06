# EPIC 04 — Tickets

**Depends on**: EPIC-02 (team), EPIC-03 (epic, optional reference). **Blocks**: EPIC-05
(comments reference a ticket), EPIC-06 (board renders tickets).

Source requirements: spec §6, §9 (validation/status codes). Cross-reference:
[`01-requirements-analysis.md`](../01-requirements-analysis.md) §3.4,
[`03-data-model.md`](../03-data-model.md) §2.6,
[`04-api-specification.md`](../04-api-specification.md) §4.

This is the largest and highest-risk epic — most of the spec's cross-entity validation rules live
here.

## Backend Tasks

### T04.1 — `tickets` table + entity
- Per data model §2.6: `type`/`state` as MySQL `ENUM`, mapped to C# enums in EF Core.
- `id` UUID, `created_by` FK to `users`, `epic_id` nullable FK to `epics`.

### T04.2 — Field validation
- `type` ∈ `{bug, feature, fix}` — reject any other value (including case variants) → 400. EF Core
  enum conversion alone isn't sufficient at the API boundary — validate the raw incoming string
  explicitly before mapping, so an invalid value produces a clean 400 rather than a deserialization
  exception/500.
- `state` ∈ the fixed 5-value set — same treatment.
- `title`: trim, reject empty → 400. `body`: reject empty (no trim requirement stated beyond
  non-empty, but trim before the emptiness check to catch whitespace-only bodies) → 400.

### T04.3 — Cross-team epic/team consistency (critical rule)
- On **create**: if `epicId` is provided, load the epic and verify `epic.team_id == teamId` from
  the route/body. Mismatch → 400 (`EPIC_TEAM_MISMATCH`), not 404 — the epic exists, it's just
  invalid for this ticket.
- On **update**: same check runs against the ticket's *new* `teamId` (which may differ from its
  current one). If the request changes `teamId` without also clearing/replacing `epicId` to one
  valid in the new team, reject with 400 — the backend must not silently null it out; per spec,
  clearing the epic on team change is a **UI** responsibility, and the backend's job is to reject
  an inconsistent combination rather than guess.
- Implement this as a single reusable validator (e.g., `TicketEpicTeamConsistencyValidator`) called
  from both the create and update handlers — this is the rule most likely to be implemented once
  and forgotten on the second path, so structure the code so there's only one place it can live.

### T04.4 — `updated_at` correctness
- EF Core's `SaveChanges` must only stamp `updated_at = now` when at least one tracked scalar
  property on the `Ticket` entity actually changed value (compare `ChangeTracker.Entries<Ticket>()`
  `.Properties.Any(p => p.IsModified)` — EF Core already only marks `IsModified` when the new value
  differs from the original, so a "no-op save" (client resubmits identical values) naturally
  produces no modified properties and therefore no timestamp bump). Do **not** use MySQL's
  `ON UPDATE CURRENT_TIMESTAMP` on this column, since that fires on any UPDATE statement touching
  the row regardless of whether values changed, and would also fire from Epic 05's comment-count
  side effects if any ever existed (they don't, but keep the column's semantics
  self-contained to the ticket entity for exactly this reason).
- Adding a comment (Epic 05) must never touch this table's `updated_at` — enforced by construction
  since comment inserts are a separate table/aggregate with no trigger back onto `tickets`.

### T04.5 — State transitions
- No sequence enforcement — any state → any other state is valid (spec §6, §8). Validation is only
  "is this one of the 5 known values," nothing about legal from/to pairs.
- `PATCH /tickets/{id}/state` (dedicated endpoint, per API spec §4) for the drag-and-drop path —
  smaller payload than a full `PUT`, same validation + `updated_at` rule, returns 200 with the
  fresh entity wrapped in the standard envelope (`ApiResponse.Ok(ticket)`) — simplest for the
  client to reconcile against in Epic 06's optimistic-update flow, and consistent with every other
  endpoint's "always 200/201 + envelope, never 204" convention (see EPIC-02/03's delete decisions).

### T04.6 — List/filter endpoint
- `GET /teams/{teamId}/tickets?type=&epicId=&state=&q=`, all filters optional and AND-combined.
- `q` — case-insensitive substring match on `title` (`LOWER(title) LIKE LOWER(CONCAT('%', @q, '%'))`
  or equivalent parameterized query — never string-concatenate raw SQL).
- Default sort: `updated_at DESC` (spec §8 — "most recently modified first" within a column; the
  API returns this order for the whole team's tickets, and the board simply buckets by `state`
  without re-sorting).
- Must perform acceptably at 100+ tickets for one team — a single indexed query
  (`team_id` + optional filters), no N+1 (eager-load `epic` and `createdBy` needed for the card/
  list view in one query via `Include`/projection).

### T04.7 — CRUD endpoints
- Per API spec §4: `POST`, `GET` (list + detail), `PUT`, `PATCH .../state`, `DELETE`.
- Delete: cascades to comments at the DB level (Epic 05's FK); no additional backend guard needed
  (unlike teams/epics, tickets have no "can't delete if referenced" rule — nothing references a
  ticket except its own comments, which cascade).

## Frontend Tasks

### T04.8 — Ticket create/edit/details view
- Single view/modal handling all three modes per spec §10 wireframe 3.
- Fields: team (selector, reuse T02.6), type (select), epic (select, options filtered to the
  chosen team's epics — refetch/filter whenever team selection changes), title, body (rich text
  via the shared `RichTextEditor`/`RichTextViewer` components — same as Epic 03's description,
  stored as sanitized HTML rather than plain text; supersedes the original "markdown is a
  nice-to-have" note), state (select, editable here in addition to drag-and-drop).
- Read-only fields shown in details mode: id, createdBy, createdAt, updatedAt.
- **Team-change-clears-epic UX** (spec §6): when the user changes the team dropdown while editing,
  immediately clear the epic selection in the form state — don't wait for a failed submit.

### T04.9 — Create/delete entry points
- "Create ticket" action reachable from the board (Epic 06) and this epic's own testing surface.
- Delete requires an explicit confirmation dialog (spec §6) before calling the DELETE endpoint.

## Acceptance Criteria

1. Create a ticket with a valid team, no epic → 201, `state` defaults to `new`, `createdBy` matches
   the authenticated user, `createdAt`/`updatedAt` set in UTC.
2. Create a ticket with an epic belonging to a *different* team than the ticket's team → 400, no
   row created.
3. Edit a ticket's title only → `updatedAt` advances; re-submitting the exact same values via the
   edit form a second time → `updatedAt` does **not** advance.
4. Edit a ticket's `team` to a different team while it has an epic set for the old team → backend
   rejects the combination unless the client also sends a valid (or null) epic for the new team;
   verify the UI's clear-on-team-change behavior prevents users from ever hitting this in normal
   use.
5. `PATCH /tickets/{id}/state` with an invalid state string → 400, ticket state unchanged.
6. `PATCH` state from `new` directly to `done` → 200 (no sequence enforcement).
7. Filtering `GET /teams/{id}/tickets?type=bug&q=login` returns only bug-type tickets whose title
   contains "login" (case-insensitive), combined with AND.
8. Deleting a ticket removes its comments (verified once Epic 05 exists) and the ticket itself;
   confirmation step is required in the UI before the call fires.
9. Board/list of 100+ tickets for one team returns and renders without noticeable lag (informal
   perf check, not a strict SLA).
