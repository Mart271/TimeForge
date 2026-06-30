# TimeForge — Enterprise Workforce Management System

Multi-tenant **Workforce Performance, Timesheet & Daily Scrum** backend — **feature complete**.

**Stack:** NestJS 10 · TypeScript · PostgreSQL via Supabase (Prisma ORM) · Supabase Storage · Redis + BullMQ · JWT (rotating refresh) · Argon2 · OpenAI (async) · pino

> Supabase is used as managed Postgres + object storage only — **not** Supabase Auth. Auth is custom JWT/RBAC.

---

## Quickstart

```bash
cp .env.example .env
# Fill in DATABASE_URL, DIRECT_URL, REDIS_URL, JWT secrets

npm install
npx prisma generate
npx prisma migrate deploy       # or: npx prisma db push (dev only)
npm run db:seed
npm run start:api               # http://localhost:3000/api/v1
npm run start:worker            # separate terminal
```

Swagger UI: `http://localhost:3000/api/docs`
Swagger JSON: `http://localhost:3000/api/docs-json`

### Docker (full stack)

```bash
cp .env.example .env
docker compose up --build
```

---

## Seeded demo accounts (password: `ChangeMe123!`)

| Email | Role | Employment | Payroll |
|---|---|---|---|
| admin@demo.test | ADMIN | FULL_TIME | ✓ |
| supervisor@demo.test | SUPERVISOR | FULL_TIME | ✓ |
| hr@demo.test | HR | FULL_TIME | ✓ |
| finance@demo.test | FINANCE | FULL_TIME | ✓ |
| employee@demo.test | EMPLOYEE | EMPLOYEE | ✓ |
| intern@demo.test | EMPLOYEE | INTERN | ✗ |

---

## What's implemented

### Core Platform
- **Auth** — JWT access + rotating refresh tokens, Argon2 passwords
- **RBAC** — Permission-based roles, `@RequirePermissions` guard
- **Users** — CRUD, status lifecycle, employment type
- **Organization** — Settings, fiscal config
- **Departments / Teams / Clients / Projects / Work Categories**

### Workforce
- **Time Tracking** — Clock in/out, time entries
- **Smart Timesheets** — Weekly periods, submission workflow
- **Daily Scrum** — Standup entries (yesterday / today / blockers)
- **Approvals** — Supervisor approval flow, no-self-approval rule
- **KPI** — Templates, progress tracking
- **Payroll** — Periods, line items, export, rate management

### Enterprise
- **Notifications** — In-app, count, mark read
- **Audit Logs** — Append-only, role-scoped access
- **Dashboard** — KPI cards, pending approvals, attendance, payroll status, team summary
- **Reports** — Timesheet, payroll, KPI, productivity reports
- **Admin** — Bulk import, bulk approve, system metrics, health, org config

### AI (Async)
- **BullMQ-backed** — Jobs never block API requests
- **OpenAI provider** — Native fetch, stub fallback when key absent
- **Features** — Daily Summary, Weekly Summary, Timesheet Summary, Blocker Detection, KPI Analysis, Productivity Insight, Supervisor Advisory, Payroll Validation
- **Audit** — SHA-256 hashes of prompt + response stored; raw content never persisted

---

## Project structure

```
timeforge/
├── apps/
│   ├── api/                    # NestJS HTTP API (port 3000)
│   │   └── src/
│   │       ├── common/         # guards, decorators, filters, prisma, context
│   │       ├── config/         # typed config + env validation
│   │       └── modules/        # one folder per feature module
│   └── worker/                 # BullMQ consumer (AI + notifications queues)
│       └── src/
│           ├── ai/             # OpenAI provider + feature handlers
│           └── processors/     # AiProcessor, NotificationsProcessor
├── packages/shared/            # shared enums + permission catalog
├── prisma/                     # schema.prisma, migrations/, seed.ts
├── docs/                       # frozen API + DB contracts, release checklist
└── docker-compose.yml
```

---

## Architecture

### Tenant isolation (4 layers)
1. **JWT** — `tenantId` in every access token
2. **AsyncLocalStorage** — `RequestContextMiddleware` propagates tenantId per request
3. **Prisma middleware** — auto-injects `tenantId` on all reads/writes for tenant-scoped models
4. **Postgres RLS** — database-level backstop (`npm run db:rls` to enable)

### API conventions
- Base path: `/api/v1/`
- Auth: Bearer token (`Authorization: Bearer <token>`)
- Pagination: cursor-based (`cursor` + `limit` query params)
- Response envelope: `{ data, meta }` for lists; direct object for single resources
- Idempotency: `Idempotency-Key` header required on bulk and AI trigger endpoints

### Permission model
```
role → role_permissions → permission (e.g. "timesheet:submit", "payroll:read")
user → user_roles → role
```
`@RequirePermissions('x', 'y')` requires ALL listed permissions (AND logic).
For OR logic: put minimum permission on route, check higher in service.

---

## Scripts

| Command | Description |
|---|---|
| `npm run start:api` | Start API in watch mode |
| `npm run start:worker` | Start worker in watch mode |
| `npm run build` | Build api + worker for production |
| `npx prisma migrate deploy` | Apply migrations (production) |
| `npx prisma db push` | Sync schema without migration record (dev) |
| `npm run db:seed` | Seed roles, permissions, demo users |
| `npm run db:rls` | Apply Postgres RLS policies |

---

## Environment variables

See `.env.example` for all required variables. Key ones:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Pooled connection (port 6543 for Supabase) |
| `DIRECT_URL` | ✅ | Direct connection (port 5432, for migrations) |
| `REDIS_URL` | ✅ | BullMQ + cache |
| `JWT_ACCESS_SECRET` | ✅ | Change in production |
| `JWT_REFRESH_SECRET` | ✅ | Change in production |
| `OPENAI_API_KEY` | ⬜ | Leave empty for stub/fallback mode |
| `SUPABASE_SERVICE_ROLE_KEY` | ⬜ | Only needed for Supabase Storage |

---

## Release checklist

See [`docs/RELEASE-CHECKLIST.md`](./docs/RELEASE-CHECKLIST.md).
