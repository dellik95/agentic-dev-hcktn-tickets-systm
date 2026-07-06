# Data Model — MySQL Schema

All tables use `CHAR(36)` UUIDs as primary keys (application-generated, e.g. UUIDv7 for
time-sortability) unless noted. All timestamps are `DATETIME(6)` stored in UTC. Managed via EF
Core Migrations (`backend/src/TicketingSystem.Infrastructure/Migrations`).

## 1. ERD (textual)

```
users            1 ──── * teams (no FK — teams are global, not owned)
teams            1 ──── * epics
teams            1 ──── * tickets
epics            1 ──── * tickets   (nullable FK, must match ticket.team_id)
users            1 ──── * tickets   (created_by)
tickets          1 ──── * comments
users            1 ──── * comments  (author)
users            1 ──── * email_verification_tokens
users            1 ──── * refresh_tokens
```

## 2. Tables

### 2.1 `users`
| Column | Type | Constraints |
|---|---|---|
| id | CHAR(36) | PK |
| email | VARCHAR(255) | NOT NULL, UNIQUE (stored lower-cased + trimmed) |
| password_hash | VARCHAR(255) | NOT NULL (Argon2id encoded hash string) |
| email_verified_at | DATETIME(6) | NULL — NULL means unverified |
| created_at | DATETIME(6) | NOT NULL DEFAULT now |
| updated_at | DATETIME(6) | NOT NULL DEFAULT now, on update |

- Uniqueness enforced via a **unique index on `email`** where email is always persisted
  lower-cased/trimmed at the application layer (MySQL collation `utf8mb4_0900_ai_ci` also gives
  case-insensitive comparison as a defense-in-depth backstop).

### 2.2 `email_verification_tokens`
| Column | Type | Constraints |
|---|---|---|
| id | CHAR(36) | PK |
| user_id | CHAR(36) | FK → users.id, NOT NULL |
| token_hash | VARCHAR(255) | NOT NULL, UNIQUE (store a hash of the token, not the raw value) |
| expires_at | DATETIME(6) | NOT NULL (issued_at + 24h) |
| used_at | DATETIME(6) | NULL |
| invalidated_at | DATETIME(6) | NULL — set when superseded by a newer resend |
| created_at | DATETIME(6) | NOT NULL DEFAULT now |

- A token is valid only if `used_at IS NULL AND invalidated_at IS NULL AND expires_at > NOW()`.
- On resend, all prior unused tokens for that `user_id` get `invalidated_at = NOW()`.

### 2.3 `refresh_tokens`
| Column | Type | Constraints |
|---|---|---|
| id | CHAR(36) | PK |
| user_id | CHAR(36) | FK → users.id, NOT NULL |
| token_hash | VARCHAR(255) | NOT NULL, UNIQUE |
| expires_at | DATETIME(6) | NOT NULL |
| revoked_at | DATETIME(6) | NULL |
| replaced_by_token_id | CHAR(36) | NULL, FK → refresh_tokens.id (rotation chain) |
| created_at | DATETIME(6) | NOT NULL DEFAULT now |

- Supports rotation: each refresh use issues a new row and revokes the old one.

### 2.4 `teams`
| Column | Type | Constraints |
|---|---|---|
| id | CHAR(36) | PK |
| name | VARCHAR(200) | NOT NULL, UNIQUE (case-insensitive via collation), stored trimmed |
| created_at | DATETIME(6) | NOT NULL DEFAULT now |
| updated_at | DATETIME(6) | NOT NULL DEFAULT now, on update |

- Delete: application-layer check (and defense-in-depth `ON DELETE RESTRICT` FKs from `epics` and
  `tickets`) → returns 409 if any row references the team. No cascade under any circumstance.

### 2.5 `epics`
| Column | Type | Constraints |
|---|---|---|
| id | CHAR(36) | PK |
| team_id | CHAR(36) | FK → teams.id, NOT NULL, `ON DELETE RESTRICT` |
| title | VARCHAR(300) | NOT NULL, stored trimmed |
| description | TEXT | NULL |
| created_at | DATETIME(6) | NOT NULL DEFAULT now |
| updated_at | DATETIME(6) | NOT NULL DEFAULT now, on update |

- Index on `team_id` (board/epic-list queries scoped per team).
- Delete: RESTRICT if any `tickets.epic_id` references it → 409.

### 2.6 `tickets`
| Column | Type | Constraints |
|---|---|---|
| id | CHAR(36) | PK |
| team_id | CHAR(36) | FK → teams.id, NOT NULL, `ON DELETE RESTRICT` |
| epic_id | CHAR(36) | FK → epics.id, NULL, `ON DELETE RESTRICT` |
| type | ENUM('bug','feature','fix') | NOT NULL |
| state | ENUM('new','ready_for_implementation','in_progress','ready_for_acceptance','done') | NOT NULL DEFAULT 'new' |
| title | VARCHAR(500) | NOT NULL, stored trimmed |
| body | LONGTEXT | NOT NULL |
| created_by | CHAR(36) | FK → users.id, NOT NULL |
| created_at | DATETIME(6) | NOT NULL DEFAULT now |
| updated_at | DATETIME(6) | NOT NULL DEFAULT now, updated **only** by application logic on real field/state change (not via MySQL auto-on-update, to satisfy "unchanged save must not advance it") |

- Indexes: `(team_id, state)` for board queries, `(team_id, epic_id)`, full-text or `LIKE`-friendly
  index consideration on `title` for substring search (at hackathon scale, a plain `LIKE '%q%'`
  with the `(team_id)` index is sufficient — no need for full-text index at ≤100s of rows).
- **Cross-table check** (`epic_id` must belong to `team_id`): MySQL has no native cross-column FK
  composite-check for this shape; enforced in the Application layer (transactional check before
  insert/update) — see Epic 04. Optionally reinforced with a trigger if the team wants
  belt-and-suspenders DB-level protection (documented as optional in Epic 04, not required).
- `updated_at` deliberately **not** set via SQL `ON UPDATE CURRENT_TIMESTAMP` — EF Core sets it
  explicitly in the application only when a tracked property actually changed, so unchanged saves
  and comment inserts never bump it.

### 2.7 `comments`
| Column | Type | Constraints |
|---|---|---|
| id | CHAR(36) | PK |
| ticket_id | CHAR(36) | FK → tickets.id, NOT NULL, `ON DELETE CASCADE` |
| author_id | CHAR(36) | FK → users.id, NOT NULL |
| body | TEXT | NOT NULL |
| created_at | DATETIME(6) | NOT NULL DEFAULT now |

- `ON DELETE CASCADE` on `ticket_id` — the one intentional cascade in the schema, matching
  "deleting a ticket also deletes its comments."
- Index on `(ticket_id, created_at)` for chronological fetch.

## 3. Constraint Summary (referential integrity matrix)

| Parent | Child | On delete | Enforced by |
|---|---|---|---|
| teams | epics | RESTRICT | DB FK + app check (for clean 409 message before DB throws) |
| teams | tickets | RESTRICT | DB FK + app check |
| epics | tickets | RESTRICT | DB FK + app check |
| tickets | comments | CASCADE | DB FK |
| users | tickets (created_by) | RESTRICT (users aren't deletable in mandatory scope) | DB FK |
| users | comments (author) | RESTRICT | DB FK |

## 4. Migration Policy

- All schema changes via EF Core Migrations, applied automatically on backend container startup
  (`dbContext.Database.Migrate()` in a startup hook, gated by the `mysql` healthcheck).
- Fresh database after migration: tables exist, zero rows in `users`/`teams`/`epics`/`tickets`/
  `comments` — no seed data in the default path (spec §9 requirement). A separate, explicitly
  invoked dev-only seed script may exist for local manual testing but must never run automatically
  in the compose default path.
