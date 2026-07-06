# API Specification

Base path: `/api/v1`. All responses JSON. All timestamps ISO-8601 UTC (`2026-07-06T12:34:56.000Z`).
Auth: `Authorization: Bearer <access_token>` header, except the public endpoints listed in §1.

## 0. Error Contract

```json
{
  "code": "TEAM_HAS_TICKETS",
  "message": "Team cannot be deleted because it still has tickets.",
  "errors": { "field": ["reason"] }
}
```
- `400 Bad Request` — validation failure (missing/invalid field, bad enum value).
- `401 Unauthorized` — missing/invalid/expired token.
- `403 Forbidden` — reserved, unused in mandatory scope (no role model).
- `404 Not Found` — referenced entity doesn't exist.
- `409 Conflict` — delete blocked by existing references, or uniqueness violation (duplicate email/team name).

## 1. Auth (public except where noted)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | public | `{ email, password }` → 201, sends verification email. 409 if email taken. |
| POST | `/auth/login` | public | `{ email, password }` → 200 `{ accessToken, refreshToken, expiresIn }`. 401 bad creds. 403 if unverified (`code: EMAIL_NOT_VERIFIED`). |
| POST | `/auth/logout` | authenticated | revokes current refresh token. 204. |
| POST | `/auth/refresh` | public (requires valid refresh token in body/cookie) | rotates refresh token → new access+refresh pair. 401 if invalid/expired/revoked. |
| GET | `/auth/verify-email?token=...` | public | validates token, sets `email_verified_at`, marks token used → 200. 400/410 if invalid/expired. |
| POST | `/auth/resend-verification` | public | `{ email }` → 202 always (avoid user enumeration), issues new token, invalidates prior ones, no-op silently if already verified/unknown email. |
| GET | `/auth/me` | authenticated | current user `{ id, email, emailVerifiedAt }`. |

## 2. Teams (authenticated)

| Method | Path | Description |
|---|---|---|
| GET | `/teams` | list all teams `[{ id, name, createdAt, updatedAt }]` |
| POST | `/teams` | `{ name }` → 201. 400 empty/whitespace name. 409 duplicate (case-insensitive). |
| GET | `/teams/{id}` | 200 or 404 |
| PUT | `/teams/{id}` | `{ name }` (rename) → 200. Same validation as create. |
| DELETE | `/teams/{id}` | 204. **409** (`code: TEAM_HAS_DEPENDENTS`) if team has any epics or tickets. |

## 3. Epics (authenticated)

| Method | Path | Description |
|---|---|---|
| GET | `/teams/{teamId}/epics` | list epics for a team |
| POST | `/teams/{teamId}/epics` | `{ title, description? }` → 201. Team fixed from route, immutable after. |
| GET | `/epics/{id}` | 200 or 404 |
| PUT | `/epics/{id}` | `{ title, description? }` — team NOT editable. |
| DELETE | `/epics/{id}` | 204. **409** (`code: EPIC_HAS_TICKETS`) if referenced by any ticket. |

## 4. Tickets (authenticated)

| Method | Path | Description |
|---|---|---|
| GET | `/teams/{teamId}/tickets` | list tickets for team board. Query params: `type`, `epicId`, `q` (title substring, case-insensitive), `state`. AND-combined. |
| POST | `/teams/{teamId}/tickets` | `{ type, title, body, epicId? }` → 201. `state` defaults to `new`. `createdBy` from auth context. |
| GET | `/tickets/{id}` | full detail incl. `createdBy`, `createdAt`, `updatedAt`. 404 if missing. |
| PUT | `/tickets/{id}` | `{ type, teamId, epicId, title, body, state }` → 200. Full update; `updatedAt` bumped only if a value actually changed. 400 if `epicId` doesn't belong to `teamId`. |
| PATCH | `/tickets/{id}/state` | `{ state }` → 200. Dedicated endpoint for drag-and-drop — smaller payload, same validation/`updatedAt` rule. |
| DELETE | `/tickets/{id}` | 204. Cascades to comments (DB-level). No confirmation server-side (UI's job); no blocking conditions. |

Ticket response shape:
```json
{
  "id": "uuid",
  "teamId": "uuid",
  "epicId": "uuid|null",
  "type": "bug|feature|fix",
  "state": "new|ready_for_implementation|in_progress|ready_for_acceptance|done",
  "title": "string",
  "body": "string",
  "createdBy": { "id": "uuid", "email": "string" },
  "createdAt": "iso8601",
  "updatedAt": "iso8601"
}
```

## 5. Comments (authenticated)

| Method | Path | Description |
|---|---|---|
| GET | `/tickets/{ticketId}/comments` | chronological oldest-first `[{ id, ticketId, author, body, createdAt }]` |
| POST | `/tickets/{ticketId}/comments` | `{ body }` → 201. Non-empty body required. Does not touch ticket `updatedAt`. |

## 6. Health (public, optional per spec, implemented for compose orchestration)

| Method | Path | Description |
|---|---|---|
| GET | `/health` | liveness — 200 if process up |
| GET | `/health/ready` | readiness — 200 only if DB reachable |

## 7. Validation Rules Enforced Server-Side (non-exhaustive cross-reference)

- Every enum field (`type`, `state`) validated against the fixed set — invalid value → 400,
  regardless of what the client sends.
- `title`/`name`/`body` fields: trimmed, rejected if empty after trim.
- Team name & user email: case-insensitive uniqueness re-checked server-side even if the UI
  pre-validates.
- Ticket `epicId` × `teamId` consistency re-checked server-side on every create/update — the
  single most important cross-entity rule in the spec (source §5–6).
- Auth: unverified users get 403 on all business endpoints (only the public auth endpoints in §1
  are reachable pre-verification).
