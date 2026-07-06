# EPIC 07 — Infrastructure & DevOps Skeleton

**Depends on**: nothing (build first). **Blocks**: all other epics (they develop against this).

## Goal

Stand up the full three-container (plus mail-capture) Docker Compose stack with empty/skeleton
services, automated migrations, and health checks, so every later epic is built and demoed inside
the real containerized environment from day one.

## Scope

In: repo scaffolding for both apps, Dockerfiles, `docker-compose.yml` + dev override, `.env.example`,
MySQL container with healthcheck, EF Core migration bootstrapping (empty initial migration is fine
at this stage), backend `/health` and `/health/ready`, frontend shell reachable through nginx.

Out: any business logic (auth, teams, tickets, etc.) — those are later epics.

## Tasks

### T07.1 — Backend project skeleton
- `dotnet new webapi` under `backend/src/TicketingSystem.Api`, plus empty `Application`,
  `Domain`, `Infrastructure` class libraries wired via project references (see
  [`02-architecture-and-tech-stack.md`](../02-architecture-and-tech-stack.md) §3).
- Add `TicketingSystem.sln` referencing all four projects + two test projects.
- `GET /health` (always 200) and `GET /health/ready` (200 only if `DbContext.Database.CanConnectAsync()` succeeds).

### T07.2 — EF Core + MySQL wiring
- Add `Pomelo.EntityFrameworkCore.MySql` to `Infrastructure`.
- `TicketingSystemDbContext` (empty `DbSet`s to be filled by later epics).
- Connection string from `ConnectionStrings__Default` env var (never hard-coded).
- Startup migration runner: on boot, `dbContext.Database.Migrate()` before accepting traffic (or a
  dedicated init container — either is fine; a startup hook is simpler for this scope).

### T07.3 — Dockerfiles
- `backend/Dockerfile`: multi-stage (`sdk` build → `aspnet` runtime), non-root user, `EXPOSE 8080`.
- `frontend/Dockerfile`: multi-stage (`node` build → `nginx:alpine` serve), `nginx.conf` proxying
  `/api/` to `http://backend:8080/`.

### T07.4 — docker-compose.yml
- `mysql`: `mysql:8`, named volume `mysql-data`, env from `.env` (`MYSQL_ROOT_PASSWORD`,
  `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`), healthcheck `mysqladmin ping -h localhost`.
- `backend`: `build: ./backend`, `depends_on: mysql: condition: service_healthy`, env for
  connection string / JWT signing key / SMTP config (placeholders until Epic 01 needs real values).
- `frontend`: `build: ./frontend`, `depends_on: backend`, port `80:80` (or `5173` for dev).
- `mailpit`: `axllent/mailpit`, ports `1025` (SMTP) and `8025` (web UI) — always included since no
  real relay is available outside a deployed/demo environment; production SMTP host
  (`relay1.dataart.com`) is purely a config value swapped via `.env`.
- `docker-compose.override.yml` (auto-loaded in dev): bind-mounts for hot reload, exposes MySQL
  port `3306` to host for debugging with a DB client.

### T07.5 — `.env.example`
- Every variable consumed by any service, with placeholder/dummy values and inline comments —
  `DB_ROOT_PASSWORD`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SIGNING_KEY`, `JWT_ISSUER`,
  `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `FRONTEND_BASE_URL` (used to
  build verification links).

### T07.6 — CI skeleton (recommended, not spec-mandated)
- GitHub Actions workflow: on PR, run `dotnet test` and `npm test` (wired up fully once Epic 08
  lands actual tests; skeleton job exists now so later epics just add steps).

## Acceptance Criteria

1. From a clean checkout, `docker compose up --build` succeeds with **no host-installed** .NET,
   Node, or MySQL.
2. `curl http://localhost/api/health` → 200 without any dependency.
3. `curl http://localhost/api/health/ready` → 200 only after MySQL is healthy and reachable;
   returns non-200 if the DB is down (verify by stopping the `mysql` container).
4. Restarting the whole stack does not lose data in the `mysql-data` volume (until an explicit
   `docker compose down -v`).
5. No secret value is committed — `.env` is gitignored, `.env.example` has placeholders only.
6. A fresh DB after startup has zero rows in any application table (trivially true here since no
   tables exist yet beyond migration history — re-verified meaningfully once Epic 01+ add tables).
