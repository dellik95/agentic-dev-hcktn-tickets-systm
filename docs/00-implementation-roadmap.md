# Implementation Roadmap

Reading order for this doc set: this file → `01-requirements-analysis.md` →
`02-architecture-and-tech-stack.md` → `03-data-model.md` → `04-api-specification.md` → epics in
order below. Each epic file is independently actionable but assumes the architecture/data-model
decisions above are fixed.

## 1. Epic Sequence & Dependencies

```
EPIC-07 (Infra/DevOps skeleton)
    │  compose + empty services + DB up + migrations pipeline
    ▼
EPIC-01 (Auth & Accounts)
    │  users table, JWT issuance, email verification — everything else needs an authenticated user
    ▼
EPIC-02 (Teams) ──────► EPIC-03 (Epics) ──────► EPIC-04 (Tickets) ──────► EPIC-05 (Comments)
                                                        │
                                                        ▼
                                                EPIC-06 (Kanban Board)
                                                        │
                                                        ▼
                                                EPIC-08 (Testing, NFRs, hardening) — runs
                                                continuously alongside every epic above, plus a
                                                final pass.
```

Rationale: Teams → Epics → Tickets → Comments follows the FK dependency chain exactly (an epic
needs a team to exist; a ticket needs a team and optionally an epic; a comment needs a ticket). The
board (Epic 06) is a read/interaction layer over tickets and can't be meaningfully built before
Epic 04 has a working ticket API. Infra (Epic 07) is listed first because `docker compose up
--build` must work from day one — every subsequent epic should be developed and demoed against the
containerized stack, not a locally-run "trust me it'll work in Docker" setup.

## 2. Suggested Milestones

| Milestone | Scope | Exit criteria |
|---|---|---|
| M0 — Skeleton | Epic 07 core | `docker compose up --build` brings up mysql + empty backend (health endpoint) + empty frontend shell. Migrations run automatically, DB starts empty. |
| M1 — Auth | Epic 01 | Sign-up → verification email (visible in Mailpit) → verify → login → JWT-protected `/auth/me` works end-to-end. |
| M2 — Core domain CRUD | Epics 02, 03 | Team and Epic management screens fully functional against real API, 409 conflict rules verified. |
| M3 — Tickets | Epic 04 | Ticket create/edit/detail view works; cross-team epic validation enforced; all fields per spec table present. |
| M4 — Comments | Epic 05 | Comments addable/listed on ticket detail; `updatedAt` unaffected. |
| M5 — Board | Epic 06 | Full Kanban board: 5 columns, drag-and-drop persists + rolls back on failure, filters work, 100+ tickets stays usable. |
| M6 — Hardening | Epic 08 (final pass) | Test suite green, README complete, no committed secrets, full Definition of Done checklist passes. |

## 3. Definition of Done (source spec §13 — verbatim, as the release gate)

- [ ] A user can sign up, receive a verification email through the configured SMTP service, verify the account, and log in.
- [ ] Teams and epics can be managed through the UI and persist in the database.
- [ ] A verified user can create, view, edit, and delete tickets.
- [ ] A user can add comments and see their author and timestamp.
- [ ] The Kanban board shows tickets in the correct state columns for the selected team.
- [ ] Dragging a ticket to another column updates the server and remains correct after refreshing the page.
- [ ] The application can be started from a clean checkout with `docker compose up --build` from the repository root.
- [ ] The solution contains no hard-coded user password or committed secret.
- [ ] A fresh database starts with schema and migration metadata only; no application data is preloaded.
- [ ] QA can create all required test or demo data through the application UI or API without manually changing database records.

## 4. Cross-Epic Risks & Watch-Items

- **Cross-team referential rule (epic ↔ ticket ↔ team)** is the single easiest requirement to get
  subtly wrong (client-only validation, or missed on the update path when team changes). Called
  out in Epics 03, 04 explicitly with test cases.
  Cascade rules (409-on-delete-if-referenced for teams/epics, cascade-delete for
  ticket→comments) must be enforced at the DB level, not just application code, per
  [`03-data-model.md`](./03-data-model.md) §3.
- **`updated_at` semantics**: must advance only on real field/state change, never on no-op saves
  or comment adds. Easy to get wrong with EF Core's default `SaveChanges` timestamp interceptors —
  Epic 04 specifies the exact approach (check `ChangeTracker` for actually-modified properties).
- **Email verification token invalidation**: resend must invalidate prior tokens, not just add a
  new one — tested explicitly in Epic 01.
- **Docker Compose "no host runtime" constraint**: don't let local dev habits (running `npm run
  dev` or `dotnet run` directly against a host MySQL) drift the compose config out of sync. Epic
  07 owns keeping compose as the source of truth, with `docker-compose.override.yml` only adding
  dev conveniences (hot reload, exposed ports) — never replacing the base topology.
- **Secrets hygiene**: `.env.example` must be kept in sync with `.env` keys as epics add config
  (JWT signing key in Epic 01, SMTP creds in Epic 01, DB creds in Epic 07) — checked in Epic 08's
  final pass.

## 5. Stretch Backlog (only after all epics + DoD are green)

From spec §14 — password reset flow, comment edit/delete, ticket activity history, virtualized
board rendering. Not scheduled into any epic above; pick up only with time remaining.
