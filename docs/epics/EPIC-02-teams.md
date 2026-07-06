# EPIC 02 — Teams

**Depends on**: EPIC-01 (authenticated user context). **Blocks**: EPIC-03 (epics belong to teams),
EPIC-04 (tickets belong to teams).

Source requirements: spec §4. Cross-reference:
[`01-requirements-analysis.md`](../01-requirements-analysis.md) §3.2,
[`04-api-specification.md`](../04-api-specification.md) §2.

## Scope

In: team CRUD (create, list, rename, delete), uniqueness/non-empty validation, delete-blocked-if-
referenced (409), team management screen.

Out: ownership/membership, per-team access control (explicit non-goals — all verified users manage
all teams).

## Backend Tasks

### T02.1 — `teams` table + entity
- Per [`03-data-model.md`](../03-data-model.md) §2.4. Migration.

### T02.2 — Validation
- Name: trim, reject empty → 400.
- Uniqueness case-insensitive: query with normalized (lower-cased) comparison or rely on a
  case-insensitive collation on the unique index — pick one and be consistent; recommend
  **application-level normalization + DB unique index on the stored value**, so the uniqueness
  check doesn't depend on connection-level collation settings.
- Apply identically on create and rename (`PUT`).

### T02.3 — Delete guard
- Before delete, check for any `epics.team_id = id` or `tickets.team_id = id` rows.
- If any exist → 409 `TEAM_HAS_DEPENDENTS` with a message distinguishing "has epics" vs "has
  tickets" vs both, for a clearer UI message (spec: "UI must show a clear validation message").
- DB-level `ON DELETE RESTRICT` FK as a backstop in case the app-level check races (defense in
  depth, not the primary mechanism — avoid relying on catching a raw FK-constraint DB exception as
  the *only* signal, since that produces a worse error message).

### T02.4 — Endpoints
- `GET /teams`, `POST /teams`, `GET /teams/{id}`, `PUT /teams/{id}`, `DELETE /teams/{id}` per API
  spec §2.

## Frontend Tasks

### T02.5 — Team management screen
- List all teams with created/updated timestamps.
- Create form (name input, inline validation mirroring backend rules for fast feedback, but never
  trusting it — always handles the 400/409 from the server too).
- Rename in place (or a simple edit form).
- Delete button: disabled + tooltip/explanation when the team has dependents (spec wireframe note:
  "Disabled delete controls indicate records that cannot currently be deleted because they are
  referenced") — requires the list/detail response to convey whether a team has dependents, or the
  UI attempts delete and surfaces the 409 message; **recommended**: have `GET /teams` optionally
  include a `hasDependents` flag (cheap aggregate query) so the button can be disabled proactively
  rather than only failing after a click. Document this as a small API-spec addendum if implemented
  this way.

### T02.6 — Team selector (shared component)
- Used by the Kanban board (Epic 06) and ticket create/edit (Epic 04) — build once here so it's
  ready for reuse; keep it a dumb presentational component fed by the teams list query.

## Acceptance Criteria

1. Create team "Platform" → 201, appears in list.
2. Create team "platform" (different case) → 409 duplicate.
3. Create team "  " (whitespace only) → 400.
4. Rename team to a name that collides with another existing team (case-insensitive) → 409.
5. Delete an empty team → 200 (empty `data`), removed from list.
6. Attempt to delete a team with at least one epic → 409, team still present, UI shows a clear
   message (not a raw error dump).
7. Attempt to delete a team with at least one ticket (no epics) → 409.
8. After the blocking epic/ticket is deleted, the team becomes deletable.
