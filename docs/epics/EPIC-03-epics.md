# EPIC 03 — Epics

**Depends on**: EPIC-02 (a team must exist to create an epic). **Blocks**: EPIC-04 (tickets
optionally reference an epic).

Source requirements: spec §5. Cross-reference:
[`01-requirements-analysis.md`](../01-requirements-analysis.md) §3.3,
[`04-api-specification.md`](../04-api-specification.md) §3.

## Scope

In: epic CRUD scoped to a team, team fixed at creation (no re-parenting), delete-blocked-if-
referenced-by-tickets (409), dedicated epic management screen.

Out: moving an epic between teams (explicit non-goal, spec §5).

## Backend Tasks

### T03.1 — `epics` table + entity
- Per [`03-data-model.md`](../03-data-model.md) §2.5. Migration. FK `team_id → teams.id`,
  `ON DELETE RESTRICT`.

### T03.2 — Validation
- `title`: trim, reject empty → 400. `description`: optional, no format constraint.
- `team_id` must reference an existing team → 404/400 if not (creation route takes `teamId` from
  the URL path per API spec, so an invalid team id in the path is a 404 on the parent resource).
- **Immutability of `team_id` after creation**: the update endpoint (`PUT /epics/{id}`) must not
  accept a `teamId` field at all (or must ignore/reject it if present) — this is the epic's core
  business rule and the easiest one to accidentally allow via a generic "PATCH the whole entity"
  implementation. Be explicit in the DTO: `UpdateEpicRequest { title, description }` — no
  `teamId` field exists on the wire for updates.

### T03.3 — Delete guard
- Before delete, check `tickets.epic_id = id`. Any row → 409 `EPIC_HAS_TICKETS`.
- Same defense-in-depth FK `RESTRICT` backstop pattern as Epic 02.

### T03.4 — Endpoints
- `GET /teams/{teamId}/epics`, `POST /teams/{teamId}/epics`, `GET /epics/{id}`, `PUT /epics/{id}`,
  `DELETE /epics/{id}` per API spec §3.

## Frontend Tasks

### T03.5 — Epic management screen (separate from ticket UI per spec §5)
- Team selector (reuse Epic 02's T02.6 component) to scope the epic list.
- List epics for selected team with title/description/timestamps.
- Create form: title (required), description (optional, textarea).
- Edit form: title/description only — **no team field shown as editable** (reinforces backend
  immutability with matching UX, avoids a confusing "why didn't my team change save" bug report).
- Delete button, disabled/explained when the epic has referencing tickets (same pattern as Epic 02
  T02.5 — consider a shared `hasDependents`-style flag on the list response for consistency).

## Acceptance Criteria

1. Create an epic under Team A → 201, `teamId` matches Team A, appears only in Team A's epic list.
2. Attempt to create an epic under a non-existent team id → 404.
3. Create epic with empty/whitespace title → 400.
4. Edit an epic's title/description → 200, `updatedAt` advances; team unchanged even if a `teamId`
   were somehow included in the request body (backend ignores/rejects it).
5. Delete an epic with no tickets → 204.
6. Delete an epic referenced by at least one ticket → 409, epic still present.
7. Epic list for Team A never shows epics belonging to Team B.
