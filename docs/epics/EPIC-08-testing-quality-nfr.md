# EPIC 08 — Testing, Quality & Non-Functional Requirements

**Depends on**: runs alongside every other epic (add tests as each lands); this file also defines
a **final hardening pass** that depends on EPIC-01 through EPIC-06 all being functionally done.

Source requirements: spec §11 (NFRs), §13 (Definition of Done). Cross-reference:
[`01-requirements-analysis.md`](../01-requirements-analysis.md) §3.9,
[`00-implementation-roadmap.md`](../00-implementation-roadmap.md) §3–4.

## Scope

In: the mandatory minimum (≥1 backend business flow test, ≥1 frontend-or-API flow test) plus a
reasonable amount above that minimum given this is a reference implementation; README; secrets
audit; cross-browser sanity check; final Definition-of-Done walkthrough.

Out: full coverage metrics/CI gating thresholds — not requested by spec, would be scope creep for
a hackathon-scale deliverable.

## Tasks

### T08.1 — Backend integration test: full auth business flow
- Sign up → verify email (using the token captured directly from the test's email-sender fake/
  Mailpit API, not by parsing UI) → login → call an authenticated endpoint → succeeds; then a
  second attempt to reuse the verification token fails. This single test exercises the highest-risk
  epic (01) end-to-end against a real MySQL (via Testcontainers or the compose test profile), not
  mocks — the actual DB constraints and Argon2id hashing are part of what's being verified.

### T08.2 — Backend integration test: ticket cross-team validation
- Create team A + epic under A, team B; attempt to create a ticket in team B referencing epic-of-A
  → 400. Then create it correctly under team A → 201. Covers the single riskiest business rule
  identified in Epic 04.

### T08.3 — Backend integration test: delete-conflict guards
- Team with a ticket → delete attempt → 409. Epic with a ticket → delete attempt → 409. Both
  become deletable once their blocking ticket is removed.

### T08.4 — Backend unit tests
- Argon2id hasher (hash → verify roundtrip, wrong password fails).
- `updated_at`-only-on-real-change logic (Epic 04, T04.4) — the easiest rule to silently regress;
  worth a fast unit test independent of the DB (mock/in-memory `ChangeTracker` scenario or a
  focused EF Core in-memory-provider test).

### T08.5 — Frontend/E2E test: sign-up-to-board flow
- Playwright: sign up → pull verification link from Mailpit's HTTP API → verify → log in → create
  a team → create an epic → create a ticket → drag it to another column → refresh → assert it's
  still in the new column. This single E2E test is the project's strongest signal that the three
  tiers are wired correctly end-to-end, satisfying "≥1 frontend or API flow" with margin.

### T08.6 — Frontend unit/component tests (Vitest + RTL)
- Drag-and-drop rollback-on-failure behavior (Epic 06, T06.4) — mock a failing `PATCH`, assert the
  card returns to its original column and an error is shown.
- Filter AND-combination logic (Epic 06, T06.5) if implemented client-side.
- Team-change-clears-epic form behavior (Epic 04, T04.8).

### T08.7 — README
- Prerequisites (Docker + Docker Compose only).
- Configuration: how to populate `.env` from `.env.example`, what each variable means, where
  `relay1.dataart.com` vs local Mailpit is toggled.
- Startup: `docker compose up --build`, where to reach the frontend/backend/Mailpit UI once up.
- How to run backend and frontend test suites.
- Note on empty-database-by-default and how QA should create demo data (through the UI/API).

### T08.8 — Secrets audit (final pass)
- Grep the full repo history-to-be-committed for anything resembling a password, connection
  string, or API key before the first push; confirm `.env` is gitignored and only `.env.example`
  (placeholder values) is tracked.
- Confirm no test fixture hard-codes a real-looking SMTP credential or reuses a "real" password
  string anywhere the DoD checklist ("no hard-coded user password or committed secret") could flag
  it.

### T08.9 — Cross-browser sanity pass
- Manually exercise the full happy path (sign-up → board → drag) in current desktop Chrome, Edge,
  and Firefox per spec §11 compatibility requirement. No automated cross-browser matrix required
  at this scope — a manual pass is proportionate.

### T08.10 — Final Definition-of-Done walkthrough
- Run every checkbox in [`00-implementation-roadmap.md`](../00-implementation-roadmap.md) §3
  against the actual running `docker compose up --build` stack, from a clean checkout/clean
  volumes, as the literal QA process described in the spec would.

## Acceptance Criteria

1. `dotnet test` (backend) and the frontend test command both pass in CI (or locally if CI isn't
   wired) with zero failing tests.
2. The E2E test (T08.5) passes against a freshly built `docker compose up --build` stack, not a
   pre-warmed dev environment.
3. README alone is sufficient for someone unfamiliar with the project to get it running (spot-check
   by having a teammate — or a fresh terminal session with no shell history/aliases — follow it
   literally).
4. No secret is present in any tracked file (verified by the T08.8 audit, not just by claim).
5. Every Definition-of-Done checkbox in the roadmap doc is checked off against the real running
   stack, not inferred from code review alone.
