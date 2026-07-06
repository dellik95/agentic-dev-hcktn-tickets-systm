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
| Frontend | React 19 + TypeScript, Vite build, React Router **data router** (`createBrowserRouter`, loader-based route protection), TanStack Query (server-state/cache), `@dnd-kit` (drag-and-drop, accessible, no native HTML5 DnD quirks) | Modern, fast dev loop, strong typing end-to-end when paired with generated API types |
| Rich text | TipTap (`@tiptap/react` + `starter-kit` + `extension-placeholder`) for editing, `dompurify` for sanitizing before display | Epic description and ticket body are HTML, not plain text. Stored HTML is sanitized on every render (`RichTextViewer`) — the API accepts arbitrary strings, so a direct API caller (not just the UI) could submit a hostile payload; sanitizing only at input time wouldn't catch that. |
| Frontend styling | Tailwind CSS v4 (`@tailwindcss/vite`, no separate config file) | Utility-first, fast to iterate on, no separate CSS-Modules bookkeeping |
| Backend | .NET 10, ASP.NET Core Web API, controller style, **CQRS via MediatR** (commands/queries, one handler per use case) | Latest .NET, cross-platform, first-class Docker support, strong EF Core + JWT ecosystem; CQRS keeps each use case isolated and testable |
| Validation | FluentValidation, wired in as a MediatR pipeline behavior — runs before every handler | Declarative, composable, keeps validation out of handler bodies |
| Object mapping | AutoMapper (entity → DTO projections) | Removes hand-written mapping boilerplate as DTOs grow across epics |
| Error handling | Global `IExceptionHandler` (`GlobalExceptionHandler`) catches handler-thrown `ApiException` subclasses and FluentValidation's `ValidationException`, renders every response — success or failure — as the same `{ success, data, error }` shape | One error path instead of a per-controller try/catch; uniform client-side handling |
| ORM/migrations | EF Core, **pinned to 9.0.17** (not 10.x) — see note below, Pomelo.EntityFrameworkCore.MySql 9.0.0 | Mature MySQL provider, migrations satisfy "automated schema creation" requirement |
| NuGet package versioning | Central Package Management (`Directory.Packages.props`, `ManagePackageVersionsCentrally=true`) | One version per package across every backend project — no per-csproj version drift |
| Auth | JWT bearer (access token, short-lived ~15 min) + rotating refresh token (refresh token in `localStorage`, access token in-memory only — documented trade-off in Epic 01) | Explicit stack requirement; refresh rotation mitigates long-lived-token theft risk |
| Password hashing | Argon2id via `Konscious.Security.Cryptography.Argon2` | Explicit requirement |
| Email | `MailKit`/`MimeKit` SMTP client, config-driven (`relay1.dataart.com` in non-local envs) | Supports arbitrary SMTP relay per spec |
| Database | MySQL 8.x (official `mysql:8` image) | User-specified substitution for the doc's Postgres example |
| Local SMTP | Mailpit container (dev/compose only) | Lets sign-up/verification flow be tested end-to-end without a real relay |
| Containerization | Docker Compose (`frontend`, `backend`, `mysql`, `mailpit`) | Mandatory per spec §2 |
| Testing — backend | xUnit (unit: validators, Argon2id hasher; integration: `WebApplicationFactory`) | Covers ≥1 backend business flow |
| Testing — frontend | Vitest + React Testing Library (unit) | Covers ≥1 frontend flow |
| Testing — E2E | Playwright (`e2e/`), run against the real `docker compose up --build` stack, driven through Mailpit's API for verification links | End-to-end proof the three tiers are wired correctly, not just each tier in isolation |
| CI | GitHub Actions (`.github/workflows/ci.yml`): backend build+test, frontend build+test, then a docker-compose-backed E2E job | Every PR into `main` is gated on all three |

> **EF Core version note**: the app targets **net10.0**, but every `Microsoft.EntityFrameworkCore.*`
> package is pinned to **9.0.17**, not 10.x. `Pomelo.EntityFrameworkCore.MySql` — the only
> actively-maintained MySQL provider — hard-depends on `Microsoft.EntityFrameworkCore.Relational
> [9.0.0, 9.0.999]` and has not shipped an EF Core 10-compatible release. A net10 host consuming
> net8/9-targeted libraries is fine (forward compatibility); mixing EF Core 9.x and 10.x packages
> in one dependency graph is not. All EF Core versions live in one place
> (`backend/Directory.Packages.props`) — bump them together once Pomelo catches up.

> **MediatR / AutoMapper licensing note**: both packages (same author) moved to a commercial
> license at MediatR 13+ and AutoMapper 15+. Pinned to the last Apache-2.0/MIT releases — **MediatR
> 12.5.0**, **AutoMapper 14.0.0** — so the stack has no commercial dependency. AutoMapper 14.0.0
> carries a known high-severity advisory (GHSA-rvv3-g6hj-g44x: unbounded-recursion DoS on
> self-referential object graphs), fixed only in the commercially-licensed 15.1.1+. Accepted: every
> mapping in this codebase is a flat, non-recursive DTO projection over our own entities — the
> attacker-controlled deep-graph precondition doesn't apply here. Revisit if that stops being true.

## 3. Repository Layout

```
Tiketing-System/
├── docker-compose.yml
├── docker-compose.override.yml        # local dev overrides (exposed DB/API ports, Development env)
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
│   ├── NuGet.Config             # scoped to nuget.org only (avoids unreachable corporate feeds)
│   ├── Directory.Build.props    # shared TargetFramework (net10.0), Nullable, ImplicitUsings
│   ├── Directory.Packages.props # Central Package Management — one version per package, solution-wide
│   ├── TicketingSystem.slnx
│   ├── src/
│   │   ├── TicketingSystem.Api/            # controllers (thin: ISender.Send + ApiResponse wrap), JWT config, GlobalExceptionHandler
│   │   ├── TicketingSystem.Application/    # Commands/Queries + FluentValidation validators, DTOs, ApiException types, MappingProfile
│   │   ├── TicketingSystem.Domain/         # entities, enums, domain rules
│   │   └── TicketingSystem.Infrastructure/ # command/query Handlers (need the DbContext), EF Core DbContext, migrations, SMTP client, Argon2 hasher
│   └── tests/
│       ├── TicketingSystem.UnitTests/      # validators, Argon2id hasher — no DB
│       └── TicketingSystem.IntegrationTests/
├── e2e/                          # Playwright, run against the real docker-compose stack
│   ├── tests/
│   ├── helpers/                  # Mailpit API client, sign-up+verify+login flow
│   └── playwright.config.ts
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── src/
    │   ├── api/             # axios client (envelope-unwrapping interceptor), error helpers, token store
    │   ├── features/
    │   │   ├── auth/        # session.ts (plain module — route loaders can't use React context)
    │   │   ├── teams/       # TeamsPage, shared TeamSelector for later epics
    │   │   ├── epics/
    │   │   ├── tickets/
    │   │   └── board/
    │   └── app/             # routes.tsx (data router config), AppShell (nav bar), router.tsx
    └── src/test/            # Vitest setup
```

Rationale for backend layering (Domain/Application/Infrastructure/Api): keeps EF Core and SMTP
concerns out of business logic, so unit tests don't need a database or network — commands, queries,
and validators in Application are plain objects; only their handlers (in Infrastructure) touch the
DbContext. This is proportionate to hackathon scope — no extra layers beyond this.

## 4. Docker Compose Topology

Services:
- **mysql**: `mysql:8`, named volume for data, healthcheck via `mysqladmin ping`, dev-safe default
  root password / app database / app user baked into `docker-compose.yml` via `${VAR:-default}` —
  no `.env` file required for a clean-checkout run (see §5 below for why there's no committed
  `.env`); create one only to override a value.
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

- **Validation**: FluentValidation validators run as a MediatR pipeline behavior before every
  command/query handler executes; syntactic rules (non-empty-after-trim, format, length) live in
  the validator, semantic/DB-dependent rules (uniqueness, existence, cross-team epic/ticket
  referential rule) live in the handler and throw a typed `ApiException`. Both are enforced
  server-side regardless of client behavior.
- **Error contract**: every response — success or failure — has the same shape:
  `{ success: bool, data: T | null, error: { code, message, fieldErrors? } | null }`. A global
  `IExceptionHandler` renders every thrown exception into this shape with the correct HTTP status
  (400/401/403/404/409) — detailed in `04-api-specification.md`.
- **Timestamps**: all entities use `DATETIME(6)`/`TIMESTAMP` in UTC; API layer serializes as
  ISO-8601 with `Z` suffix.
- **Secrets**: dev-safe defaults are baked directly into `docker-compose.yml` (`${VAR:-default}`)
  rather than a committed `.env` file — putting a JWT signing key or DB password in a tracked file,
  even a throwaway dev one, is exactly the pattern secret scanners exist to catch, and git history
  is permanent. `.env` stays gitignored and optional, for overriding a value (e.g. real
  `relay1.dataart.com` SMTP credentials) without touching version control.
- **Logging**: structured logging (`Serilog` or built-in `ILogger`), never logs passwords, tokens,
  or SMTP credentials.
