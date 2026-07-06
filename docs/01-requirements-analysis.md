# Requirements Analysis — App Ticketing System

Source: `Hackathon_Ticketing_System_Requirements_v3 1.docx` (Participant Requirements Specification).
This document restates the source requirements in structured form, maps them to the chosen stack,
flags ambiguities/gaps with a resolved decision, and lists explicit non-goals. It is the reference
all epic documents derive from.

## 1. Product Summary

A three-tier Kanban-style ticket tracker:
- **Presentation**: SPA (React + TypeScript).
- **Application/API**: HTTP API (.NET, JWT-authenticated).
- **Persistence**: RDBMS (MySQL — substituted for the doc's PostgreSQL example; the spec explicitly
  allows "a dedicated server-based RDBMS container", not naming a fixed vendor).

Mandatory domain scope: authentication, teams, epics, tickets, comments, draggable Kanban board.
Explicitly out of scope: Scrum/sprints, SSO, roles/permissions, attachments, notifications,
real-time collaboration, reporting.

## 2. Stack Decisions (this project vs. source doc)

| Concern | Source doc | This project | Notes |
|---|---|---|---|
| RDBMS | "such as PostgreSQL" (example only) | **MySQL 8.x** | Satisfies "dedicated server-based RDBMS container"; requirement is vendor-agnostic. |
| Frontend | Unrestricted SPA | **React 18 + TypeScript**, Vite | |
| Backend | Unrestricted | **.NET 8, ASP.NET Core Web API** | |
| Auth transport | "Cookie-based sessions or bearer-token ... both acceptable" | **JWT bearer tokens** | Access token short-lived; refresh-token rotation recommended (see Epic 01). Tokens never placed in URLs (spec requirement §9), except the single-use email-verification token, which is explicitly allowed in the verification link. |
| Password hashing | "such as Argon2id" | **Argon2id** (via `Konscious.Security.Cryptography` or ASP.NET Identity's PBKDF2 fallback if Argon2id lib unavailable — decide in Epic 01) | Non-negotiable: never plaintext. |
| Orchestration | `docker compose up --build` from repo root, no host runtime required | **Docker Compose**: `frontend`, `backend`, `mysql`, optionally `mailhog` for local SMTP testing | |
| Migrations | "automated through migrations or equivalent" | **EF Core Migrations** applied automatically on backend startup (or a dedicated migration step/container) | |
| Email | Configurable SMTP, must support `relay1.dataart.com` | **SMTP client in backend**, config-driven host/port/creds, swappable for local dev (e.g., MailHog/Mailpit container) | |

## 3. Functional Requirements — Structured Breakdown

### 3.1 Accounts & Authentication (source §3)
- Sign-up: email + password. Email trimmed, case-insensitive compare, unique.
- Password: min 8 chars, hashed (Argon2id), never plaintext, never logged.
- Email verification: sent via SMTP on sign-up; link/token expires in 24h, single-use.
- Unverified accounts blocked from the app (all business endpoints and screens).
- Resend verification: available from login or verification-result screen; issuing a new token
  **invalidates all previously issued unused tokens** for that account.
- Successful verification → redirect to login (no auto-login required).
- Public (unauthenticated) surface: sign-up, login, verify-email, resend-verification, static
  assets, optional health/readiness endpoints. Everything else requires a valid JWT.

### 3.2 Teams (source §4)
- CRUD: create, list, rename, delete. No update-in-place restrictions beyond name rules.
- Fields: id, name, created_at, updated_at.
- Name: non-empty after trim, unique case-insensitively.
- Delete blocked (**409 Conflict**) if team has any tickets or epics — no cascade delete, ever.
- No ownership/membership model — any verified user manages any team (flat authorization model).

### 3.3 Epics (source §5)
- Belongs to exactly one team, fixed at creation (no re-parenting).
- Fields: id, team_id, title, description (optional), created_at, updated_at.
- Title: non-empty after trim.
- Dedicated CRUD screen (separate from ticket UI).
- Delete blocked (**409 Conflict**) if any ticket references the epic.
- Referential rule (critical, cross-checked with tickets): a ticket's epic must belong to the same
  team as the ticket — enforced server-side, not just in the UI.

### 3.4 Tickets (source §6)
Fields (see table below), all server-validated regardless of client input:

| Field | Required | Type/Values | Behavior notes |
|---|---|---|---|
| id | yes | server-generated (UUID or numeric) | stable, unique |
| team_id | yes | FK → teams | determines board |
| type | yes | `bug \| feature \| fix` | label only, no workflow branching |
| state | yes | `new \| ready_for_implementation \| in_progress \| ready_for_acceptance \| done` | fixed 5-state workflow, free transitions (no sequence enforcement) |
| epic_id | no | FK → epics, nullable | must be null or belong to ticket's team |
| title | yes | text, non-empty trimmed | no enforced max length |
| body | yes | long text, non-empty | markdown/plain text acceptable |
| created_at | yes | UTC timestamp | server-set at creation |
| updated_at | yes | UTC timestamp | server-set on field/state change; **not** on comment add |
| created_by | yes | FK → users | from auth context, immutable |

Operations: create, read (full detail incl. created_by/at, modified_at), update (type, team, epic,
title, body, state), delete (with confirmation; cascades to comments only).

Critical invariants:
- Changing `team_id` must clear/replace `epic_id` in the UI; backend must reject an update where
  `epic_id` doesn't belong to the (possibly new) `team_id`.
- `updated_at` must only advance on an actual field/state change — a no-op save must not touch it.
- Drag-and-drop state changes persist immediately via the API (no optimistic-only state).

### 3.5 Comments (source §7)
- Fields: id, ticket_id, author (user), body, created_at.
- Body non-empty.
- Chronological, oldest-first display.
- Does **not** touch ticket `updated_at` (and therefore not board ordering).
- Immutable in mandatory scope (edit/delete = stretch goal only).

### 3.6 Kanban Board (source §8)
- One team in view at a time; team selector present.
- Exactly 5 columns, fixed order matching the state enum.
- Card shows at least title + type; epic display recommended.
- Drag-and-drop across any two columns (no sequence enforcement) → persists via API.
- Failed persist → card snaps back, error shown (optimistic UI with rollback).
- Column ordering: most-recently-modified first; no custom manual ordering needed.
- Filters: ticket type, epic, case-insensitive substring title search; AND-combined; client- or
  server-side implementation both acceptable.
- Must stay usable at ≥100 tickets per board (perf/UX baseline, not a hard scale target).

### 3.7 API & Persistence (source §9)
- All mutations go through the API → RDBMS; **no localStorage as system of record**.
- Referential integrity via DB constraints and/or server validation.
- Meaningful HTTP status codes: 400 (validation), 401 (auth), 404 (missing), **409** (delete
  conflicts on teams/epics in use).
- IDs: UUID or numeric, either acceptable — **decision: UUID (v7 or v4)** for ids to avoid
  enumeration and simplify future distributed scenarios; documented in Epic 04/data model.
- Timestamps: ISO-8601 UTC everywhere in the API.
- Auth transport: JWT bearer (this project's decision) — tokens never in URLs, except the
  single-use email-verification token.
- No concurrent-edit conflict detection required (last-write-wins is acceptable).
- DB schema via migrations; **fresh DB has zero application data** after migration (no seed data
  in the default startup path — QA creates data through UI/API only).

### 3.8 Minimum Screens (source §10)
1. Sign-up
2. Email verification result
3. Verification-email resend (folded into login/verification-result screens)
4. Login
5. Kanban board with team selector
6. Ticket create/edit/details
7. Team management
8. Epic management

### 3.9 Non-Functional Requirements (source §11)
- **Security**: authenticated endpoints protected, passwords hashed, input validated, no secrets
  (SMTP creds, JWT signing key, DB creds) committed to source control — use `.env` / compose
  secrets, `.env.example` committed instead.
- **Reliability**: refresh or app restart must never lose persisted data (rules out any
  in-memory-only persistence).
- **Usability**: loading/empty/success/error states across screens.
- **Compatibility**: current desktop Chrome, Edge, or Firefox.
- **Maintainability**: README with prerequisites, configuration, startup commands.
- **Testing**: automated tests covering ≥1 backend business flow and ≥1 frontend-or-API flow
  (minimum bar — this project aims higher per Epic 08).

### 3.10 Definition of Done (source §13)
Directly usable as the project's release checklist; reproduced verbatim in
[`docs/00-implementation-roadmap.md`](./00-implementation-roadmap.md) §"Definition of Done".

## 4. Ambiguities & Resolved Decisions

| # | Ambiguity in source doc | Resolution for this project |
|---|---|---|
| 1 | RDBMS is "such as PostgreSQL" — is a different RDBMS acceptable? | Yes — requirement is "dedicated server-based RDBMS container"; MySQL 8 satisfies it. Documented explicitly since it deviates from the doc's example. |
| 2 | Auth transport: cookie vs bearer — which to pick? | Bearer JWT, per explicit stack requirement from the user. Access token in memory on the client (not localStorage, to reduce XSS token-theft surface); refresh token strategy defined in Epic 01. |
| 3 | ID strategy: UUID vs numeric | UUID (server-generated) — avoids sequential-ID enumeration, matches "Identifiers may be UUIDs" allowance. |
| 4 | Argon2id library availability in .NET ecosystem | Use `Konscious.Security.Cryptography.Argon2` (actively maintained, pure-.NET, no native deps) rather than ASP.NET Core Identity's default PBKDF2, to meet the explicit Argon2id ask. Decision finalized in Epic 01 with a fallback note. |
| 5 | SMTP for local dev vs `relay1.dataart.com` for "real" sending | Config-driven `SmtpOptions` (host/port/user/pass/from), backed by env vars; local/dev compose profile points at a MailHog/Mailpit container so the flow is testable without real relay access; `relay1.dataart.com` is the production/demo config value, never hard-coded. |
| 6 | "Health/readiness endpoints may remain public" — required or optional? | Optional per spec; implemented anyway (`/health`) since Docker Compose healthchecks need it for reliable `depends_on` ordering. |
| 7 | Filtering: client vs server side | Server-side query params (`type`, `epicId`, `q`) on the ticket list endpoint, since board must stay usable at 100+ tickets and server-side avoids shipping the full dataset. Client applies no extra filtering beyond what's server-returned. |
| 8 | Manual drag ordering within a column | Explicitly not required by spec — column sort is always `updated_at DESC`. No `position`/`order` column needed. |
| 9 | Token invalidation on resend — hard delete old tokens or mark used? | Mark superseded tokens as invalidated (soft), keep for audit/debugging; only the newest unexpired token is valid. |

## 5. Explicit Non-Goals (source §12 — do not build)

Scrum/sprints/backlogs/story points/velocity/burndown; SSO/OAuth/social login; roles, team
membership, private teams, per-ticket ACLs; file attachments, notifications, mentions, watchers,
audit history, real-time multi-user sync; custom workflows/types, subtasks, dependencies, time
tracking, reporting dashboards; production-grade deployment/HA/mail infra.

Stretch (optional, only after mandatory scope is fully done, see Epic 08 backlog):
password reset, comment edit/delete, ticket activity history, virtualized board rendering.

## 6. Document Map

- [`00-implementation-roadmap.md`](./00-implementation-roadmap.md) — sequencing, milestones, DoD checklist
- [`02-architecture-and-tech-stack.md`](./02-architecture-and-tech-stack.md) — system architecture, repo layout, Docker Compose
- [`03-data-model.md`](./03-data-model.md) — MySQL schema, constraints, ERD
- [`04-api-specification.md`](./04-api-specification.md) — REST endpoints, request/response contracts, status codes
- `epics/EPIC-01` … `EPIC-08` — per-epic implementation plans with task breakdowns and acceptance criteria
