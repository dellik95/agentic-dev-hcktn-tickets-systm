# Architecture & Tech Stack

## 1. System Overview

Three-tier architecture, each tier independently deployable as a container:

```
┌─────────────────────┐        HTTPS/JSON+JWT        ┌──────────────────────┐        SQL (TCP 3306)        ┌───────────────┐
│  frontend (SPA)      │ ───────────────────────────▶ │  backend (Web API)   │ ───────────────────────────▶ │  mysql (RDBMS)│
│  React + TypeScript  │ ◀─────────────────────────── │  ASP.NET Core / .NET │ ◀──────────────────────────── │               │
│  served by nginx     │                                │  JWT auth, EF Core   │                              │               │
└─────────────────────┘                                └───────────┬──────────┘                              └───────────────┘
                                                                     │ SMTP
                                                                     ▼
                                                          ┌──────────────────────┐
                                                          │ SMTP relay            │
                                                          │ relay1.dataart.com    │
                                                          │ (local: MailHog/      │
                                                          │  Mailpit container)   │
                                                          └──────────────────────┘
```

- Presentation, application, and persistence tiers are physically separate containers — satisfies
  the "clear separation between presentation, application/API, and persistence tiers" requirement
  even though backend could technically serve the SPA (we choose not to, for clean separation and
  independent scaling/dev workflows).
- Single entry point for local/QA use: `docker compose up --build` from repo root.

## 2. Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React 18 + TypeScript, Vite build, React Router, TanStack Query (server-state/cache), `@dnd-kit` (drag-and-drop, accessible, no native HTML5 DnD quirks) | Modern, fast dev loop, strong typing end-to-end when paired with generated API types |
| Frontend styling | CSS Modules or Tailwind (implementation detail, decide in Epic 06) | Not spec-constrained |
| Backend | .NET 8, ASP.NET Core Web API, minimal-API or controller style (decide in Epic 01, likely controllers for testability/clarity at this scope) | Cross-platform, first-class Docker support, strong EF Core + JWT ecosystem |
| ORM/migrations | EF Core 8 with Pomelo.EntityFrameworkCore.MySql provider | Mature MySQL provider, migrations satisfy "automated schema creation" requirement |
| Auth | JWT bearer (access token, short-lived ~15 min) + rotating refresh token (httpOnly cookie or secure storage — finalized in Epic 01) | Explicit stack requirement; refresh rotation mitigates long-lived-token theft risk |
| Password hashing | Argon2id via `Konscious.Security.Cryptography.Argon2` | Explicit requirement |
| Email | `MailKit`/`MimeKit` SMTP client, config-driven (`relay1.dataart.com` in non-local envs) | Supports arbitrary SMTP relay per spec |
| Database | MySQL 8.x (official `mysql:8` image) | User-specified substitution for the doc's Postgres example |
| Local SMTP | MailHog or Mailpit container (dev/compose only) | Lets sign-up/verification flow be tested end-to-end without a real relay |
| Containerization | Docker Compose (`frontend`, `backend`, `mysql`, `mailpit`) | Mandatory per spec §2 |
| Testing — backend | xUnit + WebApplicationFactory (integration) + Testcontainers-for-MySQL (optional, or a docker-compose test profile) | Covers ≥1 backend business flow end-to-end against a real MySQL |
| Testing — frontend | Vitest + React Testing Library; Playwright for one E2E flow (sign-up → verify → login → board) | Covers ≥1 frontend/API flow |
| CI | Not mandated by spec; recommended GitHub Actions workflow running backend+frontend test suites (see Epic 08) | Maintainability |

## 3. Repository Layout

```
Tiketing-System/
├── docker-compose.yml
├── docker-compose.override.yml        # local dev overrides (hot reload, mailpit, exposed DB port)
├── .env.example
├── README.md
├── docs/
│   ├── 00-implementation-roadmap.md
│   ├── 01-requirements-analysis.md
│   ├── 02-architecture-and-tech-stack.md
│   ├── 03-data-model.md
│   ├── 04-api-specification.md
│   └── epics/
│       ├── EPIC-01-auth-and-accounts.md
│       ├── EPIC-02-teams.md
│       ├── EPIC-03-epics.md
│       ├── EPIC-04-tickets.md
│       ├── EPIC-05-comments.md
│       ├── EPIC-06-kanban-board.md
│       ├── EPIC-07-infrastructure-devops.md
│       └── EPIC-08-testing-quality-nfr.md
├── backend/
│   ├── Dockerfile
│   ├── TicketingSystem.sln
│   ├── src/
│   │   ├── TicketingSystem.Api/            # controllers, DI wiring, Program.cs, JWT config
│   │   ├── TicketingSystem.Application/    # use-cases/services, DTOs, validation
│   │   ├── TicketingSystem.Domain/         # entities, enums, domain rules
│   │   └── TicketingSystem.Infrastructure/ # EF Core DbContext, migrations, SMTP client, Argon2 hasher
│   └── tests/
│       ├── TicketingSystem.UnitTests/
│       └── TicketingSystem.IntegrationTests/
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── src/
    │   ├── api/            # generated/typed API client
    │   ├── features/
    │   │   ├── auth/
    │   │   ├── teams/
    │   │   ├── epics/
    │   │   ├── tickets/
    │   │   └── board/
    │   ├── components/     # shared UI primitives
    │   └── app/             # router, layout, providers
    └── tests/
```

Rationale for backend layering (Domain/Application/Infrastructure/Api): keeps EF Core and SMTP
concerns out of business logic, so unit tests (Epic 08) don't need a database or network. This is
proportionate to hackathon scope — no extra layers beyond this.

## 4. Docker Compose Topology

Services:
- **mysql**: `mysql:8`, named volume for data, healthcheck via `mysqladmin ping`, env-configured
  root password / app database / app user via `.env`.
- **backend**: builds from `backend/Dockerfile`, depends on `mysql` healthcheck, runs EF Core
  migrations on startup (hosted service or entrypoint script), exposes port 8080 internally,
  reads JWT signing key / SMTP config / DB connection string from environment.
- **frontend**: builds from `frontend/Dockerfile` (multi-stage: `npm run build` → nginx serving
  static files), proxies `/api/*` to `backend` via nginx config, exposes port 80/5173.
- **mailpit** (dev/compose profile only, not part of "production" path but always present for this
  hackathon's default `docker compose up --build` since no real relay is available to graders):
  SMTP capture + web UI to inspect verification emails.

No host-installed runtime required — only Docker/Docker Compose, matching the "clean checkout"
requirement.

## 5. Cross-Cutting Concerns

- **Validation**: FluentValidation (or DataAnnotations + manual checks) in the Application layer;
  every rule from the requirements doc (non-empty-after-trim, uniqueness, enum values, cross-team
  epic/ticket referential rule) is enforced server-side regardless of client behavior.
- **Error contract**: consistent JSON problem-details shape (`{ code, message, errors? }`) mapped
  to correct HTTP status (400/401/404/409) — detailed in `04-api-specification.md`.
- **Timestamps**: all entities use `DATETIME(6)`/`TIMESTAMP` in UTC; API layer serializes as
  ISO-8601 with `Z` suffix.
- **Secrets**: `.env` (gitignored) + `.env.example` (committed, no real values) for DB creds, JWT
  signing key, SMTP creds. Nothing sensitive ever hard-coded or committed.
- **Logging**: structured logging (`Serilog` or built-in `ILogger`), never logs passwords, tokens,
  or SMTP credentials.
