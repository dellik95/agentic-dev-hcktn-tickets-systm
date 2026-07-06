# EPIC 06 — Kanban Board

**Depends on**: EPIC-02 (team selector), EPIC-03 (epic filter), EPIC-04 (tickets + state
endpoint). **Blocks**: nothing (this is the primary screen / capstone integration point).

Source requirements: spec §8. Cross-reference:
[`01-requirements-analysis.md`](../01-requirements-analysis.md) §3.6,
[`04-api-specification.md`](../04-api-specification.md) §4.

This epic is primarily frontend; the backend surface it needs (list/filter, `PATCH .../state`) is
already delivered by Epic 04 — this epic's backend task list is intentionally short.

## Backend Tasks

### T06.1 — Confirm list endpoint shape supports the board directly
- Verify `GET /teams/{teamId}/tickets` (Epic 04, T04.6) returns everything the board needs in one
  call: `id, type, state, title, epic{id,title}, updatedAt` at minimum, sorted `updatedAt DESC`, so
  the frontend can bucket by `state` client-side without extra requests per column.
- No new endpoint needed unless profiling during this epic shows the combined payload is too large
  at 100+ tickets — not expected at hackathon scale, but call it out as a fallback (paginate per
  column) if it becomes an issue.

## Frontend Tasks

### T06.2 — Board layout
- Team selector at the top (reuse T02.6). Five fixed columns in workflow order: New, Ready for
  Implementation, In Progress, Ready for Acceptance, Done (human-readable labels mapped from the
  API's snake_case enum values — spec §6 explicitly calls this out).
- Each column header shows the ticket count for quick scanning.

### T06.3 — Card rendering
- Minimum: title + type badge (spec §8). Also show epic title when set (spec recommends it).
- Cards sorted within their column by `updatedAt DESC` (server already returns this order; the
  client buckets without re-sorting to avoid drift from the server's ordering contract).

### T06.4 — Drag-and-drop
- Use `@dnd-kit` (accessible, works well with keyboard + touch, avoids native HTML5 DnD's
  inconsistent drag-image/ghost behavior across browsers).
- On drop into a different column: **optimistic update** — move the card in local state
  immediately, fire `PATCH /tickets/{id}/state`, and:
  - on success: reconcile with the server response (in case `updatedAt` or other fields differ).
  - on failure: move the card back to its original column and show an error toast/banner (spec §8
    — "the card must return to its previous column and the UI must display an error").
- Dropping within the same column (reordering) is a no-op against the API — spec explicitly says
  custom manual ordering is not required; don't build drag-to-reorder-within-column at all, only
  drag-between-columns, to avoid implying a feature that doesn't persist.

### T06.5 — Filters
- Type filter (multi-select or single-select — spec just says "filtering by ticket type", a
  single-select dropdown is sufficient), epic filter (dropdown scoped to the selected team's
  epics, including an "all epics" / "no epic" option), title search (debounced text input,
  case-insensitive substring).
- AND-combined. Decide client-side vs server-side per team size — given the ≤100-ticket usability
  bar, either works; **recommended**: fetch the full team ticket list once (Epic 04's list
  endpoint already returns everything needed) and filter client-side for snappier UX with no
  extra round-trips per keystroke; re-fetch only on team change or after a mutating action
  (create/edit/delete/state-change) invalidates the cached list.
- Filter state should live in the URL (query params) so a board view is shareable/refresh-safe —
  nice-to-have, not spec-required, but cheap with React Router.

### T06.6 — Create/open ticket entry points
- "Create ticket" button on the board (opens Epic 04's create form, pre-filled with the currently
  selected team).
- Clicking a card opens the ticket details view (Epic 04/05) in place (modal or navigation — either
  satisfies spec §8's "clear way to ... open an existing ticket").

### T06.7 — Loading/empty/error states
- Loading skeleton while the ticket list fetches.
- Empty state per column (and empty state for "team has zero tickets at all").
- Network/API error banner distinct from the per-drag error handling in T06.4.

### T06.8 — Perf check at scale
- Manually seed ≥100 tickets on one team (via the API/UI, not DB seed data — matches spec §9's "no
  preloaded data" rule, this is just a manual QA step, not part of the default startup path) and
  confirm the board renders and drags smoothly. If not, the first lever is `React.memo` on card
  components plus keying by ticket id; only reach for a virtualization library if that's still not
  enough (virtualization itself is explicitly a stretch item per spec §14, not required for the
  100-ticket bar).

## Acceptance Criteria

1. Selecting a team shows exactly 5 columns in the fixed workflow order, populated with that
   team's tickets only.
2. Dragging a card to a different column updates its state via the API and the card persists in
   the new column after a full page refresh.
3. Simulating a failed `PATCH` (e.g., dev-tools network throttling/blocking, or a temporarily
   invalid ticket id) causes the card to snap back to its original column with a visible error.
4. Type filter + epic filter + title search combine with AND logic — e.g., filtering `type=bug`
   and a search term that only matches a feature-type ticket yields zero results, not the bug list
   unioned with the search.
5. Creating a ticket from the board immediately shows it in the correct column without a manual
   page refresh.
6. Board remains responsive (scrolling, dragging, filtering) with 100+ tickets loaded for one team.
7. Refreshing the page preserves the correct column placement for every ticket (state is
   server-persisted, not client-only).
