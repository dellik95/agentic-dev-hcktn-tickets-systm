# Ticketing System

Kanban-style ticket tracker: three-tier SPA (React/TypeScript) + API (.NET, JWT auth) + RDBMS
(MySQL). Built against the requirements in
`Hackathon_Ticketing_System_Requirements_v3 1.docx`.

> Status: **EPIC-07 (infra) and EPIC-01 (auth) implemented.** See
> [`docs/00-implementation-roadmap.md`](docs/00-implementation-roadmap.md) for what's next.

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

`EPIC-07` (infra skeleton, done) → `EPIC-01` (auth, done) → `EPIC-02` (teams) → `EPIC-03` (epics) →
`EPIC-04` (tickets) → `EPIC-05` (comments) → `EPIC-06` (Kanban board) → `EPIC-08` (testing/NFRs,
continuous + final pass). Rationale and milestones in the roadmap doc.

## Configuration

`docker-compose.yml` bakes in dev-safe defaults for every setting, so `docker compose up --build`
works from a clean checkout with zero setup — no `.env` file required. Copy `.env.example` to
`.env` (gitignored) only if you want to override something, e.g. pointing `SMTP_*` at
`relay1.dataart.com` instead of the local Mailpit container.

## Running

```
docker compose up --build
```

- Frontend: http://localhost
- Backend API: http://localhost/api/v1 (also http://localhost:8080 directly, exposed by the dev
  override)
- Mailpit (captured emails): http://localhost:8025
- MySQL: localhost:3306 (exposed by the dev override for inspection with a DB client)

## Tests

```
cd backend && dotnet test
cd frontend && npm test
```

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs both plus a docker-compose smoke
test on every PR into `main`.
