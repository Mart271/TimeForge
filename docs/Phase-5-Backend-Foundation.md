# TimeForge — Phase 5: Backend Foundation

> Runnable NestJS scaffold — the foundation every business module builds on.
> Implements ONLY: auth, RBAC, tenant context, config, logging, validation,
> error handling, security middleware, Prisma/Postgres, Redis/BullMQ. **No business modules.**
> Status: **DELIVERED — code in the repository root; see `README.md` to run.**

---

## Goal

Stand up a production-shaped, runnable backend foundation that enforces the
frozen Phase 2–4 architecture: Clean Architecture module boundaries, four-layer
tenant isolation, permission-based RBAC, JWT auth with rotating refresh tokens,
and the cross-cutting infrastructure (config, logging, validation, errors,
security, queues, cache). Business modules (Phase 6+) plug into this without
touching the foundation.

## Assumptions

1. Builds on frozen Phases 1–4. Enums/permissions come from `packages/shared`.
2. Single-package monorepo using NestJS monorepo mode (`apps/api`, `apps/worker`)
   + a path-aliased `packages/shared`; can split into npm workspaces later.
3. Dev runs as the DB owner (isolation at the Prisma-middleware layer); RLS is
   provided and opt-in (see README → Row-Level Security).
4. `prisma db push` is used for the quickstart; `prisma migrate` for real history.

## Architecture Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| AD5-1 | NestJS monorepo mode, shared code via `@timeforge/shared` path alias | Matches Phase 2 layout; one install, simple to run |
| AD5-2 | Global guards in order Throttler → JWT → Permissions, + global ValidationPipe + exception filter | Default-deny security applied uniformly |
| AD5-3 | Tenant context via AsyncLocalStorage; Prisma `$use` injects `tenant_id` | Developer-proof tenant scoping (Phase 2 layer 3) |
| AD5-4 | Opaque, SHA-256-hashed refresh tokens with rotation families | Deterministic lookup + reuse detection; Argon2 for passwords |
| AD5-5 | RLS shipped as SQL + restricted role, opt-in | Correct DB backstop without breaking the quickstart |
| AD5-6 | Worker is a separate Nest application-context process on BullMQ | AI/reports/notifications never block the API |

## Files Generated

Key files (full tree in `README.md`):

```
package.json · tsconfig.base.json · tsconfig.json · nest-cli.json · .env.example
docker-compose.yml · docker/Dockerfile · .github/workflows/ci.yml
packages/shared/src/{enums,permissions,index}.ts
prisma/{schema.prisma, seed.ts, sql/rls.sql} · scripts/apply-rls.js
apps/api/src/main.ts · app.module.ts · config/* · common/{context,prisma,guards,decorators,filters}/*
apps/api/src/infra/{cache,storage,mailer,infra.module}.ts
apps/api/src/modules/{auth,rbac,health}/*
apps/worker/src/{main,worker.module}.ts · processors/notifications.processor.ts
```

## Implementation

- **Auth** (`modules/auth`): `POST /auth/login|refresh|logout|forgot-password|reset-password|verify-email`, `GET /auth/me`. Argon2 verify; JWT access (15m) + rotating refresh (httpOnly cookie, SHA-256 hash, family reuse-detection). Login/logout audited.
- **RBAC** (`modules/rbac` + guards/decorators): `@RequirePermissions(...)` + `PermissionsGuard` (default-deny, `*` = Admin); permissions resolved from role keys in the JWT via the shared catalog.
- **Tenant isolation**: `RequestContextMiddleware` (ALS) → `JwtAuthGuard` sets tenant/user → `PrismaService` `$use` injects `tenant_id` → `prisma/sql/rls.sql` (Postgres RLS backstop).
- **Cross-cutting**: typed config + zod env validation; pino structured logs with correlation IDs; global `ValidationPipe` (whitelist/forbid-unknown/transform, 422); global exception filter (standard envelope, no stack traces); helmet, CORS allow-list, throttler rate-limiting; `/api/v1` URI versioning.
- **Infra**: tenant-scoped Redis cache, file-storage abstraction, mailer abstraction, BullMQ root + example worker consumer.
- **Data**: Prisma schema (tenancy, org, settings, users, RBAC, refresh tokens, audit, idempotency) with standard columns + tenant-safe composite uniques; idempotent seed (5 roles, full permission catalog, demo users incl. an excluded intern).

## Security Notes

Default-deny auth on every route (except `@Public()`); tenant id never client-supplied; cross-tenant access returns 404; Argon2 password hashing; rotating refresh tokens with reuse detection; helmet + CORS + rate limiting; no stack-trace leakage; audit log append-only. RLS available as the DB-level backstop.

## Testing

Foundation is structured for Phase 8: domain/services are DI-driven and mockable; guards/pipes/filter are unit-testable; `npm run build` type-checks; CI runs install → prisma generate → build → db push → seed. Contract/RBAC/tenant-isolation suites are added in Phase 8.

## Risks

| Risk | Mitigation |
|------|------------|
| RLS + app role needs per-request GUC wiring | Dev uses owner + layer-3 filter; `runWithTenant` helper provided; wire as repositories land |
| Native dep (argon2) build on some platforms | Dockerfile installs build toolchain; prebuilt binaries on Node 20 |
| Spec drift | Phases 3–4 frozen; modules built against them |

## Improvements (later)

Split into npm workspaces; add OpenTelemetry tracing; transactional outbox; eslint/prettier configs + pre-commit; first unit/e2e tests; production secrets manager.

## Verification Checklist

**Completed**

- Monorepo (`apps/api`, `apps/worker`, `packages/shared`); Prisma + Postgres; Redis + BullMQ.
- ALS tenant context; JWT access + rotating refresh; Argon2; RBAC guards + decorators.
- Global validation pipe; exception filter + standard envelope; pino logging + correlation IDs; helmet/CORS/rate-limiting.
- Prisma tenant middleware; RLS migration + restricted role script; seeds (roles, permissions, employment types, default admin).
- `.env.example`, Docker Compose, Dockerfile, CI workflow, README with run steps.
- Module dependency rule documented; locked decisions reflected.

**Pending (Phase 6 — modules)**

- Core Organization → Users → Time Tracking → Smart Timesheets → Daily Scrum → KPI → Approvals → Payroll → Dashboard → AI, each against the frozen contracts, one at a time with review/refactor/test.

---

**Phase 5 delivered. Run it via `README.md`. Next: Phase 6 (modules), starting with Core Organization.**
