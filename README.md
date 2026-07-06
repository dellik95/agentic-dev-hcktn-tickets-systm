# Ticketing System

Kanban-style ticket tracker: three-tier SPA (React/TypeScript) + API (.NET, JWT auth) + RDBMS
(MySQL). Built against the requirements in
`Hackathon_Ticketing_System_Requirements_v3 1.docx`.

> Status: **All epics (01–08) implemented** — auth, teams, epics, tickets, comments, the Kanban
> board, and the EPIC-08 testing/hardening pass. See
> [`docs/00-implementation-roadmap.md`](docs/00-implementation-roadmap.md) for the Definition of
> Done this was built against.

## Start Here (docs)

1. [`docs/01-requirements-analysis.md`](docs/01-requirements-analysis.md) — structured requirements, stack decisions, resolved ambiguities.
2. [`docs/02-architecture-and-tech-stack.md`](docs/02-architecture-and-tech-stack.md) — system architecture, repo layout, Docker Compose topology.
3. [`docs/03-data-model.md`](docs/03-data-model.md) — MySQL schema, constraints, ERD.
4. [`docs/04-api-specification.md`](docs/04-api-specification.md) — REST endpoints and contracts.
5. [`docs/00-implementation-roadmap.md`](docs/00-implementation-roadmap.md) — epic sequence, milestones, Definition of Done.
6. `docs/epics/EPIC-01` … `EPIC-08` — per-epic task breakdown and acceptance criteria.

## Stack

- Frontend: React 19 + TypeScript, Vite, Tailwind CSS v4, React Router (data router), TanStack
  Query, `@dnd-kit` for drag-and-drop.
- Backend: .NET 10, ASP.NET Core Web API, EF Core 9 (Pomelo MySQL provider — see
  [`docs/02-architecture-and-tech-stack.md`](docs/02-architecture-and-tech-stack.md) for the
  version-pinning note), JWT bearer auth, Argon2id password hashing, Central Package Management.
- Database: MySQL 8.
- Local email testing: Mailpit (production/demo SMTP: `relay1.dataart.com`, config-driven).
- Orchestration: Docker Compose (`docker compose up --build` from repo root, no host runtime
  required).

## Epic Sequence

`EPIC-07` (infra) → `EPIC-01` (auth) → `EPIC-02` (teams) → `EPIC-03` (epics) → `EPIC-04` (tickets) →
`EPIC-05` (comments) → `EPIC-06` (Kanban board, breadcrumb navigation) → `EPIC-08` (testing/NFRs,
final pass). Each epic shipped on its own branch with a green CI run before merging — rationale and
milestones in the roadmap doc.

## Prerequisites

Docker and Docker Compose are the only requirements — no local Node.js, .NET SDK, or MySQL install
is needed to run the app. (You'll want the .NET 10 SDK and Node 22 locally only if you're going to
edit code and run the test suites outside a container — see [Tests](#tests) below.)

## Configuration

`docker-compose.yml` bakes in dev-safe defaults for every setting, so `docker compose up --build`
works from a clean checkout with zero setup — no `.env` file required. Copy
[`.env.example`](.env.example) to `.env` (gitignored) only if you want to override something:

| Variable | Purpose |
| --- | --- |
| `DB_ROOT_PASSWORD`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT` | MySQL credentials/port used by both the `mysql` container and the backend's connection string. |
| `JWT_SIGNING_KEY`, `JWT_ISSUER`, `JWT_ACCESS_TOKEN_MINUTES`, `JWT_REFRESH_TOKEN_DAYS` | JWT bearer auth signing key/issuer and token lifetimes. Change `JWT_SIGNING_KEY` for anything beyond local dev. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Where verification emails are sent. Defaults point at the bundled `mailpit` container; set `SMTP_HOST=relay1.dataart.com` (plus credentials) to send through the real relay instead. |
| `FRONTEND_BASE_URL` | Base URL embedded in verification email links. |

## Running

```
docker compose up --build
```

- Frontend: http://localhost
- Backend API: http://localhost/api/v1 (also http://localhost:8080 directly, exposed by the dev
  override)
- Mailpit (captured emails): http://localhost:8025
- MySQL: localhost:3306 (exposed by the dev override for inspection with a DB client)

A fresh database starts with schema/migrations only — no seeded teams, epics, tickets, or users.
Create everything QA needs (a user via sign-up, teams, epics, tickets, comments) through the app's
own UI or API; there is no separate seed script or manual DB-editing step.

## Tests

```
cd backend && dotnet test        # unit tests + integration tests (the latter spin up their own
                                  # MySQL and Mailpit containers via Testcontainers — Docker must be
                                  # running, but the app stack itself doesn't need to be up)
cd frontend && npm test          # component tests (Vitest + React Testing Library)
cd e2e && npm test                # end-to-end tests (Playwright, against a real running stack --
                                  # run `docker compose up --build -d` first)
```

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs all three (backend, frontend, then
a docker-compose-backed E2E job) on every PR into `main`.
