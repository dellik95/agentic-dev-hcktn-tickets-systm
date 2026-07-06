# EPIC 01 — Authentication & Accounts

**Depends on**: EPIC-07 (compose stack, empty DbContext). **Blocks**: every other epic (all
business endpoints require an authenticated, verified user).

Source requirements: spec §3, §9 (auth transport), §10 (sign-up/login/verify/resend screens),
§11 (security NFRs). Cross-reference: [`01-requirements-analysis.md`](../01-requirements-analysis.md) §3.1.

## Scope

In: sign-up, login, logout, JWT access+refresh issuance, email verification (send + confirm +
resend + invalidate-on-resend), password hashing (Argon2id), route/endpoint protection, the four
auth-related screens.

Out: password reset (stretch, §14), SSO/OAuth (explicit non-goal), roles/permissions (non-goal).

## Backend Tasks

### T01.1 — `users` table + EF Core entity
- Per [`03-data-model.md`](../03-data-model.md) §2.1. Migration adds `users` table.
- Email normalization (trim + lowercase) happens in the Application layer before persistence and
  before every lookup — never rely on DB collation alone.

### T01.2 — Password hashing service
- `IPasswordHasher` abstraction, Argon2id implementation via `Konscious.Security.Cryptography.Argon2`.
- Parameters: reasonable work factor for a hackathon VM (e.g., memory=19MB/iterations=2/parallelism=1
  as a starting point per OWASP guidance) — tune if login/signup latency becomes noticeable.
- Unit-testable in isolation (no DB, no HTTP) — feeds Epic 08's backend business-flow test.

### T01.3 — Sign-up flow (`POST /auth/signup`)
- Validate: email format, password ≥ 8 chars.
- Reject duplicate email (case-insensitive) → 409.
- Hash password, insert user with `email_verified_at = NULL`.
- Generate verification token (random, high-entropy, e.g. 32 bytes base64url), store only its hash
  in `email_verification_tokens` (per data model §2.2), `expires_at = now + 24h`.
- Send verification email via SMTP client with link `{FRONTEND_BASE_URL}/verify-email?token=...`.
- Response 201 — do not leak whether email existed pre-signup beyond the 409 (acceptable per spec;
  spec doesn't require anti-enumeration on signup, only implicitly relevant on resend).

### T01.4 — Email verification (`GET /auth/verify-email`)
- Look up token by hash; valid iff not used, not invalidated, not expired.
- On success: set `users.email_verified_at = now`, mark token `used_at = now`. Response 200.
- On invalid/expired: 400/410 with a code the frontend maps to "request a new link" messaging.
- Token is single-use — a second call with the same token after success must fail.

### T01.5 — Resend verification (`POST /auth/resend-verification`)
- Given `{ email }`: if user exists and is unverified, invalidate all prior unused tokens for that
  user (`invalidated_at = now`), issue a new one, send email.
- If user doesn't exist or is already verified: still return 202 (avoid user enumeration) but do
  nothing server-side.

### T01.6 — Login (`POST /auth/login`)
- Verify credentials (constant-time password compare via the Argon2id verify call).
- If unverified → 403 `EMAIL_NOT_VERIFIED` (frontend routes to resend UI).
- If verified → issue access token (JWT, short TTL ~15 min, claims: `sub`=user id, `email`) +
  refresh token (opaque random value, hashed before storage per data model §2.3, longer TTL e.g.
  7 days).
- 401 on bad credentials — same generic message whether email doesn't exist or password is wrong
  (no user enumeration via login either).

### T01.7 — Refresh & logout
- `POST /auth/refresh`: validate refresh token hash, not expired/revoked → issue new access+refresh
  pair, revoke old refresh token, link via `replaced_by_token_id` (rotation).
- `POST /auth/logout`: revoke the presented refresh token.
- Reused/revoked refresh token → 401 (basic replay-detection: if a revoked token is presented
  again, consider revoking the entire chain from that point — defensive, not spec-required, but
  cheap to add).

### T01.8 — JWT middleware / endpoint protection
- ASP.NET Core JWT bearer authentication configured with signing key from `JWT_SIGNING_KEY` env
  var (never hard-coded — matches spec's "no committed secret").
- `[Authorize]` on every controller except `AuthController`'s public actions (signup, login,
  verify-email, resend-verification) and `/health*`.
- Additional requirement beyond plain `[Authorize]`: verified-email gate — a valid JWT for an
  unverified user must still be rejected on business endpoints (edge case: user signs up, never
  verifies, but somehow has a token — shouldn't normally happen since login blocks unverified
  users, but enforce defensively with a custom requirement/filter).

### T01.9 — SMTP integration
- `IEmailSender` abstraction, MailKit-based implementation, config-driven host/port/credentials/from.
- Local/dev: points at `mailpit:1025` (no auth). Non-local: `relay1.dataart.com` config values via
  env — never hard-coded, per spec §11 and §13 ("no committed secret").

## Frontend Tasks

### T01.10 — Sign-up screen
- Email + password fields, client-side hints (8+ chars) but never trusts client validation alone.
- On success: show "check your email" state (no auto-login).

### T01.11 — Email verification result screen
- Reads `?token=` from URL, calls verify endpoint on mount, shows success/failure state.
- Failure state includes a "resend verification email" action (T01.13).

### T01.12 — Login screen
- Email + password, generic error message on 401.
- On 403 `EMAIL_NOT_VERIFIED`: inline message + resend action (T01.13) instead of generic error.

### T01.13 — Resend-verification action
- Shared component/form (email input) usable from both login and verification-result screens per
  spec §3/§10.
- Always shows a neutral success message ("if an account exists, an email was sent") regardless of
  backend's silent no-op path — keeps enumeration protection consistent in the UI too.

### T01.14 — Token storage & auth context
- Access token held in memory (React context/store), **not** localStorage (reduces XSS token-theft
  blast radius). Refresh token: httpOnly secure cookie (preferred) — decide final mechanism here
  and document it in code comments/README, since spec allows either transport but tokens must
  never appear in URLs (spec §9) except the one-time verification token.
- Axios/fetch interceptor: attach `Authorization: Bearer` header, transparently retry once via
  `/auth/refresh` on a 401, redirect to login if refresh also fails.

## Acceptance Criteria

1. Sign up with a new email → 201, email appears in Mailpit with a working verification link.
2. Logging in before verification → 403, UI shows resend option, not a generic error.
3. Clicking the verification link → account verified, redirected to login (no auto-login).
4. Reusing the same verification link a second time → fails (single-use enforced).
5. Waiting past 24h (or manipulating `expires_at` in a test) → link fails as expired.
6. Requesting a resend, then trying the *old* link → old link now invalid (invalidation-on-resend
   enforced) — the *new* link still works.
7. Login with correct credentials post-verification → access+refresh tokens issued; `/auth/me`
   returns the user with a valid access token; fails with 401 without one.
8. Duplicate sign-up with same email (any case variant, e.g. `User@x.com` vs `user@x.com`) → 409.
9. Password under 8 characters → 400 at signup.
10. No password appears anywhere in logs; DB `password_hash` column never contains plaintext.
11. No JWT signing key, SMTP password, or DB password appears in any committed file.
