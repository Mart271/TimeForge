# TimeForge Backend — Release Checklist

## Infrastructure
- [ ] Redis running (`docker compose up -d redis` or managed Redis URL set in `.env`)
- [ ] Supabase PostgreSQL reachable (verify `DATABASE_URL` in `.env`)
- [ ] `npx prisma migrate status` — all migrations applied
- [ ] `npm run db:seed` — seed data loads cleanly
- [ ] `npm run start:api` — API starts with no exceptions
- [ ] `npm run start:worker` — Worker starts, BullMQ queues registered (`ai`, `notifications`)

## Environment Variables (`.env`)
- [ ] `DATABASE_URL` — Supabase direct connection (port 5432)
- [ ] `DATABASE_URL_POOLED` — Supabase transaction pooler (port 6543)
- [ ] `JWT_SECRET` — set and non-default
- [ ] `REDIS_URL` — Redis connection string
- [ ] `OPENAI_API_KEY` — set (or intentionally left empty for stub mode)
- [ ] `SUPABASE_URL` / `SUPABASE_ANON_KEY` — set if storage enabled
- [ ] `NODE_ENV=production` — for prod deployments

## API Contract
- [ ] `PATCH /payroll/rates/:userId` (was incorrectly `POST` — fixed)
- [ ] All Phase 4 endpoints implemented and match spec
- [ ] HTTP status codes correct (201 creates, 200 updates, 202 async, 204 deletes)
- [ ] Idempotency-Key required on bulk and AI trigger endpoints
- [ ] Cursor-based pagination on all list endpoints

## Swagger (`http://localhost:3000/api/docs`)
- [ ] All module tags visible: Auth, RBAC, Users, Organization, Departments, Teams, Clients, Projects, Work Categories, Time Tracking, Timesheets, Scrum, Approvals, KPI, Payroll, Notifications, Audit Logs, Dashboard, Reports, Admin, AI
- [ ] Every endpoint has `@ApiBearerAuth` and `@ApiOperation`
- [ ] Query parameters documented with `@ApiQuery`
- [ ] Request bodies documented with DTOs

## Security
- [ ] JWT guard active on all non-public routes
- [ ] RBAC (`@RequirePermissions`) on every mutation
- [ ] Tenant isolation — all queries scoped to `tenantId`
- [ ] Soft deletes — `deletedAt: null` filter on all reads
- [ ] Audit log written on: login, logout, approvals, payroll export, AI usage, bulk admin actions, role changes
- [ ] Rate limiting active (`ThrottlerGuard` — 120 req/min default)
- [ ] `OPENAI_API_KEY` never logged

## Core Workflows (smoke test)
- [ ] `POST /auth/login` → JWT returned
- [ ] Employee creates time entry → submits timesheet
- [ ] Supervisor approves timesheet → status becomes `APPROVED`
- [ ] Finance sees timesheet in `PAYROLL_READY` state
- [ ] Intern submits timesheet → excluded from payroll (`payrollEligible: false`)
- [ ] `POST /ai/jobs` → 202 with `jobId`
- [ ] `GET /ai/jobs/:id` → status transitions QUEUED → RUNNING → SUCCEEDED
- [ ] `GET /notifications/count` → returns `{ total, unread }`
- [ ] `GET /dashboard/summary` → returns scoped KPI data
- [ ] `GET /admin/health` → returns `{ status: "healthy" }`

## Quality
- [ ] `npx tsc --noEmit` → 0 errors (API + Worker)
- [ ] `npx prisma validate` → schema valid
- [ ] No circular dependency warnings on startup
- [ ] No unused providers in any module
- [ ] Worker reconnects to Redis on connection drop (BullMQ handles this)

## Frontend Integration Handoff
- [ ] Swagger JSON exported: `http://localhost:3000/api/docs-json`
- [ ] Postman / Bruno collection shared
- [ ] Seed credentials shared: `admin@demo.test / ChangeMe123!` (also `employee@`, `supervisor@`, `hr@`, `finance@`)
- [ ] Base URL and API version prefix documented (`/api/v1/`)
- [ ] Auth flow documented (Bearer token, refresh token rotation)

## Deployment Verification
- [ ] Production `.env` verified (no dev secrets, no placeholder values)
- [ ] `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are strong random strings (≥ 64 chars)
- [ ] `COOKIE_SECURE=true` (HTTPS enforced)
- [ ] `NODE_ENV=production`
- [ ] Supabase Storage bucket accessible with service role key
- [ ] Production database migrations applied (`npx prisma migrate deploy`)
- [ ] Health endpoint returns healthy: `GET /api/v1/health`
- [ ] Swagger UI disabled or access-restricted in production
- [ ] CORS `CORS_ORIGINS` set to frontend domain only
- [ ] Redis connection stable (worker logs show queue registration)
- [ ] Logs flowing to production log aggregator
- [ ] `OPENAI_API_KEY` set (or intentional stub mode documented)
