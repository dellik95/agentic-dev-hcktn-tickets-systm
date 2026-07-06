# Ticketing System

Kanban-style ticket tracker: three-tier SPA (React/TypeScript) + API (.NET, JWT auth) + RDBMS
(MySQL). Built against the requirements in
`Hackathon_Ticketing_System_Requirements_v3 1.docx`.

> Status: **planning complete, implementation not started**. This repository currently contains
> requirements analysis and per-epic implementation plans only — see `docs/`. Application code
> (`backend/`, `frontend/`, `docker-compose.yml`) will be added per the epic sequence below.

## Start Here (docs)

1. [`docs/01-requirements-analysis.md`](docs/01-requirements-analysis.md) — structured requirements, stack decisions, resolved ambiguities.
2. [`docs/02-architecture-and-tech-stack.md`](docs/02-architecture-and-tech-stack.md) — system architecture, repo layout, Docker Compose topology.
3. [`docs/03-data-model.md`](docs/03-data-model.md) — MySQL schema, constraints, ERD.
4. [`docs/04-api-specification.md`](docs/04-api-specification.md) — REST endpoints and contracts.
5. [`docs/00-implementation-roadmap.md`](docs/00-implementation-roadmap.md) — epic sequence, milestones, Definition of Done.
6. `docs/epics/EPIC-01` … `EPIC-08` — per-epic task breakdown and acceptance criteria.

## Planned Stack

- Frontend: React 18 + TypeScript, Vite, `@dnd-kit` for drag-and-drop.
- Backend: .NET 8, ASP.NET Core Web API, EF Core (Pomelo MySQL provider), JWT bearer auth,
  Argon2id password hashing.
- Database: MySQL 8.
- Local email testing: Mailpit (production/demo SMTP: `relay1.dataart.com`, config-driven).
- Orchestration: Docker Compose (`docker compose up --build` from repo root, no host runtime
  required).

## Epic Sequence

`EPIC-07` (infra skeleton) → `EPIC-01` (auth) → `EPIC-02` (teams) → `EPIC-03` (epics) →
`EPIC-04` (tickets) → `EPIC-05` (comments) → `EPIC-06` (Kanban board) → `EPIC-08` (testing/NFRs,
continuous + final pass). Rationale and milestones in the roadmap doc.

## Configuration

Copy `.env.example` to `.env` and fill in real values before running. Never commit `.env`.

## Running (once implementation lands)

```
docker compose up --build
```
