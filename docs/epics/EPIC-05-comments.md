# EPIC 05 — Comments

**Depends on**: EPIC-04 (a ticket must exist to comment on). **Blocks**: nothing (leaf feature).

Source requirements: spec §7. Cross-reference:
[`01-requirements-analysis.md`](../01-requirements-analysis.md) §3.5,
[`04-api-specification.md`](../04-api-specification.md) §5.

## Scope

In: add comment, list comments chronologically, author + timestamp display.

Out (mandatory scope; stretch per spec §14): edit/delete own comments.

## Backend Tasks

### T05.1 — `comments` table + entity
- Per [`03-data-model.md`](../03-data-model.md) §2.7. FK `ticket_id → tickets.id`,
  `ON DELETE CASCADE` (the one intentional cascade in the schema). FK `author_id → users.id`.

### T05.2 — Validation
- `body`: trim, reject empty → 400.
- `ticket_id` must reference an existing ticket → 404 if not.
- `author_id` always taken from the authenticated user's JWT claim — never accepted from the
  request body (prevents spoofing another user as the comment author).

### T05.3 — Explicitly verify no side effect on ticket
- The comment-insert code path must not touch the `tickets` row at all — no `SaveChanges` call
  that includes a loaded/modified `Ticket` entity in the same unit of work as a comment insert.
  This is worth a dedicated integration test (Epic 08) precisely because it's a one-line regression
  away from breaking (e.g., someone "helpfully" adds `ticket.UpdatedAt = DateTime.UtcNow` near the
  comment-creation code for an unrelated reason).

### T05.4 — Endpoints
- `GET /tickets/{ticketId}/comments` — ordered `created_at ASC` (oldest first, per spec §7).
- `POST /tickets/{ticketId}/comments` — `{ body }` → 201, returns the created comment with author
  info resolved (id + email, matching the ticket response's `createdBy` shape for consistency).

## Frontend Tasks

### T05.5 — Comment list + composer on ticket details view
- Rendered within the ticket create/edit/details view (Epic 04, spec wireframe 3) below the ticket
  fields.
- List: chronological oldest-first, each entry shows author email + relative/absolute timestamp.
- Composer: textarea + submit, disabled while a request is in flight, clears on success, inline
  error on failure (empty-body validation mirrors backend but backend is authoritative).
- After adding a comment, do **not** refetch/mutate the parent ticket's `updatedAt` display — the
  UI should reflect that the ticket itself is untouched (useful manual/exploratory check during
  Epic 08 hardening).

## Acceptance Criteria

1. Add a comment to a ticket → 201, appears at the bottom of the (oldest-first) list immediately.
2. Add a comment with an empty/whitespace-only body → 400, not persisted.
3. Two comments added in sequence render in creation order (oldest first), not reverse.
4. Adding a comment does not change the parent ticket's `updatedAt` (verify via `GET /tickets/{id}`
   before and after) and therefore doesn't reorder it on the Kanban board (Epic 06).
5. Deleting the parent ticket removes all its comments (cascade) — verify no orphaned comment rows
   remain.
6. Comment author is always the authenticated caller, never a client-supplied value (attempt to
   pass a different `authorId`/`author` in the request body and confirm it's ignored).
