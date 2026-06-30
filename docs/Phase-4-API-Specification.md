# TimeForge — Phase 4: API Specification

> The API contract for the entire system. OpenAPI-style, **contracts only — no controllers, services, Prisma, or NestJS code.**
> Base URL: `/api/v1` · Auth: Bearer JWT · Tenant scope: from token context (never client-supplied)
> Status: **DRAFT — awaiting approval before Phase 5 (Backend Foundation)**
> After approval, **freeze** Phases 3 + 4 as the source of truth.

---

## Goal

Specify every REST endpoint TimeForge exposes: method, path, purpose, required role(s) and permission(s), auth, tenant scope, validation, request/response shapes, error codes, rate limits, idempotency, audit + domain events, and pagination/filtering/sorting — module by module in dependency order. This is the contract Phase 5+ implements against.

---

## Assumptions

1. Builds on approved Phase 1–3. Entities, enums, and permissions reference the Phase 3 schema and the Phase 1 permission matrix (HR and Finance are distinct roles).
2. JSON only (`application/json`); UTF-8; times are ISO-8601 UTC; IDs are UUID v4.
3. Tenant scope is always derived from the authenticated context; **no endpoint accepts a `tenantId` in the body or query**.
4. Standard error envelope and status codes are as defined in Phase 2 §14.
5. All list endpoints are cursor-paginated by default and return tenant-scoped data only.

---

## Architecture Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| AD4-1 | **URI versioning** `/api/v1`. | Phase 2 AD2-17; future v2 coexists. |
| AD4-2 | **`resource:action` permission keys** (e.g., `time_entry:create`). | Maps 1:1 to RBAC seed + guards. |
| AD4-3 | **Cursor pagination** default; opaque `cursor`. | Stable at scale (Phase 3 AD3-9). |
| AD4-4 | **Idempotency-Key required** on money/AI/bulk mutations. | Safe retries (Phase 2 §19). |
| AD4-5 | **Standard CRUD template** reused across simple resources. | DRY contract; only differences are documented per module. |
| AD4-6 | **Every mutation lists its Audit + Domain events.** | Traceability; wires Phase 2 §10 + Phase 3 `audit_log`. |

---

## Files Generated

| File | Purpose |
|------|---------|
| `docs/Phase-4-API-Specification.md` | This document — the API contract. |

No source code in Phase 4.

---

## Implementation

> Contracts only. Global conventions below apply to **every** endpoint so they aren't repeated; per-module sections then list endpoints and detail the non-trivial ones.

### 0. Global Conventions

**Auth & tenant.** All endpoints require `Authorization: Bearer <access JWT>` except the public auth endpoints (login, refresh, forgot/reset password, verify email). The JWT carries `sub` (user id), `tenant_id`, `organization_id`, and roles; tenant scope and RBAC are enforced server-side (Phase 2 §6–7). Cross-tenant access is impossible (Phase 3 RLS).

**Common headers.**

```
Authorization: Bearer <jwt>        # all protected endpoints
Idempotency-Key: <uuid>            # required on flagged mutations
X-Request-Id: <uuid>               # optional; echoed back; generated if absent
```

**Standard error envelope** (Phase 2 §14) and codes:

```json
{ "error": { "code": "FORBIDDEN", "message": "human readable", "requestId": "uuid", "details": [] } }
```

| Code | Meaning | Typical cause |
|------|---------|---------------|
| 400 | Bad Request | malformed JSON / params |
| 401 | Unauthorized | missing/invalid/expired token |
| 403 | Forbidden | authenticated but lacks permission/scope |
| 404 | Not Found | missing **or cross-tenant** (no existence leak) |
| 409 | Conflict | optimistic-lock version mismatch, illegal state transition, duplicate |
| 422 | Unprocessable | validation failure (per-field `details`) |
| 429 | Too Many Requests | rate limit exceeded (`Retry-After` header) |
| 500 | Server Error | unexpected (no stack trace exposed) |

**Pagination contract (cursor, default).** Request: `?limit=20&cursor=<opaque>` (`limit` 1–100, default 20). Response:

```json
{ "data": [ ... ], "page": { "limit": 20, "nextCursor": "opaque|null", "hasMore": true } }
```

**Filtering / Sorting.** `?filter[field]=value`, date ranges `?from=&to=` (ISO-8601), `?status=`, free text `?q=`. Sorting `?sort=field` (asc) or `?sort=-field` (desc); only whitelisted fields per endpoint (stated in each list). Unknown filter/sort fields → `422`.

**Rate-limit tiers** (per user unless noted):

| Tier | Limit | Applies to |
|------|-------|------------|
| AUTH_STRICT | 5/min/IP (login), 3/min (forgot/reset) | auth endpoints |
| STANDARD | 120/min | normal reads/writes |
| HEAVY | 10/min | payroll generate/export, report builds |
| AI | 6/min | AI trigger endpoints |
| BULK | 6/min | bulk approve/import |

**Validation defaults.** Strict: unknown fields rejected (`422`), enums validated, UUIDs/dates/lengths checked, strings trimmed; required fields enforced.

**Audit & domain events.** Mutations record an `audit_log` row (Phase 3 `audit_action`) and may emit domain events (Phase 2 §10). Each endpoint below names them.

### 0.1 Standard CRUD Template (reused)

For simple resources (Departments, Teams, Projects, Clients, Work Categories), these five endpoints follow one shape; per-module sections list only the **resource path, permissions, validated fields, and list filters/sorts**.

| Method & Path | Purpose | Permission | Idemp. | Audit | Success |
|---|---|---|---|---|---|
| `GET /<res>` | list (paginated) | `<res>:read` | – | – | 200 + page |
| `GET /<res>/{id}` | fetch one | `<res>:read` | – | – | 200 / 404 |
| `POST /<res>` | create | `<res>:create` | optional | `ADMIN_ACTION` | 201 + entity |
| `PATCH /<res>/{id}` | update (optimistic `version`) | `<res>:update` | – | `ADMIN_ACTION` | 200 / 409 |
| `DELETE /<res>/{id}` | soft delete | `<res>:delete` | – | `ADMIN_ACTION` | 204 / 409 |

All template endpoints: auth required; tenant scope = ORG; STANDARD rate tier; responses carry standard columns (`id`, audit fields, `version`); `PATCH`/`DELETE` require the current `version` (body or `If-Match`) and return `409` on mismatch.

### 0.2 Permission Catalog (RBAC seed)

Keys grouped by module (assigned to roles per the Phase 1 matrix). Admin holds all.

```
auth         : (self) login, refresh, logout, forgot, reset, verify
user         : user:read, user:read_self, user:create, user:update, user:deactivate, user:assign_role
rbac         : role:read, role:create, role:update, role:delete, permission:read
organization : org:read, org:update, org_settings:read, org_settings:update, holiday:read, holiday:write
department   : department:read|create|update|delete
team         : team:read|create|update|delete
project      : project:read|create|update|delete
client       : client:read|create|update|delete
work_category: work_category:read|create|update|delete
time_entry   : time_entry:create|read|update|delete, time_entry:read_team, time_entry:read_org
timesheet    : timesheet:create|read|update|submit, timesheet:read_team, timesheet:read_org
scrum        : scrum:create|read|update, scrum:read_team
kpi          : kpi_template:read|create|update|delete, kpi_progress:read, kpi_progress:read_team, kpi_progress:read_org
approval     : approval:read_team, approval:decide, approval:remark
payroll      : payroll:read_self, payroll:read_status_team, payroll_period:read|create|update, payroll:generate, payroll:export, payroll_rate:read, payroll_rate:update
             # payroll_rate:read/update + amounts = Finance/Admin only (hidden from self, Supervisor, HR)
attendance   : attendance:read_org          (HR)
notification : notification:read_self, notification:update_self
ai           : ai:trigger_self, ai:trigger_team, ai:trigger_org, ai:read
audit        : audit:read_scoped, audit:read_org
dashboard    : dashboard:read_self|read_team|read_org
```

---

### 1. Authentication  `/api/v1/auth`

| Method & Path | Purpose | Auth | Idemp. | Rate | Audit | Domain events |
|---|---|---|---|---|---|---|
| `POST /auth/login` | password login → tokens | public | – | AUTH_STRICT | `LOGIN` | `UserLoggedIn` |
| `POST /auth/refresh` | rotate refresh → new tokens | public (cookie) | – | AUTH_STRICT | – | `SessionRotated` / `SessionRevoked` (reuse) |
| `POST /auth/logout` | revoke current session | required | – | STANDARD | `LOGOUT` | `SessionRevoked` |
| `POST /auth/forgot-password` | email reset token | public | – | AUTH_STRICT | – | `PasswordResetRequested` |
| `POST /auth/reset-password` | set new password via token | public | – | AUTH_STRICT | `PASSWORD_CHANGE` | `PasswordChanged` |
| `POST /auth/verify-email` | confirm email via token | public | – | AUTH_STRICT | – | `EmailVerified` |
| `GET  /auth/me` | current user + roles + perms | required | – | STANDARD | – | – |

**Detailed — `POST /api/v1/auth/login`**

- Purpose: authenticate by email + password; issue access + rotating refresh tokens.
- Roles/Permissions: none (public). Auth required: no. Tenant scope: resolved from the user.
- Validation: `email` (email, required), `password` (string, 8–128, required). Unknown fields → 422.
- Request:

```json
{ "email": "user@org.com", "password": "••••••••" }
```

- Response `200`:

```json
{ "accessToken": "jwt", "tokenType": "Bearer", "expiresIn": 900,
  "user": { "id": "uuid", "email": "user@org.com", "roles": ["EMPLOYEE"], "organizationId": "uuid" } }
```

(refresh token set as `httpOnly`, `Secure`, `SameSite=Strict` cookie)
- Errors: `401` bad credentials / unverified email, `422` validation, `429` throttled.
- Idempotency: n/a. Audit: `LOGIN` (success and failure). Domain: `UserLoggedIn`.

**Detailed — `POST /api/v1/auth/refresh`**

- Purpose: rotate the refresh token family; detect reuse.
- Request: refresh token from cookie (or body `{ "refreshToken": "..." }`).
- Response `200`: new access token (+ rotated refresh cookie).
- Errors: `401` invalid/expired; **reuse detected → whole family revoked, `401`** (`SessionRevoked`). Rate: AUTH_STRICT.

---

### 2. Users  `/api/v1/users`

| Method & Path | Purpose | Permission | Roles | Idemp. | Audit | Domain |
|---|---|---|---|---|---|---|
| `GET /users` | list users | `user:read` | Supervisor (team), HR, Finance, Admin | – | – | – |
| `GET /users/{id}` | fetch user | `user:read` / self `user:read_self` | all (self) | – | – | – |
| `POST /users` | invite/create user | `user:create` | Admin | optional | `ADMIN_ACTION` | `UserInvited` |
| `PATCH /users/{id}` | update profile/assignment | `user:update` | Admin | – | `ADMIN_ACTION` | `UserUpdated` |
| `POST /users/{id}/deactivate` | deactivate | `user:deactivate` | Admin | – | `ADMIN_ACTION` | `UserDeactivated` |
| `POST /users/{id}/roles` | assign/replace roles | `user:assign_role` | Admin | – | `ROLE_CHANGE` | `RoleChanged` |
| `PATCH /users/me` | edit own profile | `user:read_self` | all | – | – | `UserUpdated` |

- Tenant scope: ORG (self endpoints OWN). List filters: `status`, `departmentId`, `teamId`, `role`, `q` (name/email). Sort: `createdAt`, `lastName`, `email`.
- `POST /users` validation: `email` (unique per tenant), `firstName`, `lastName`, `role` (access role enum: EMPLOYEE/SUPERVISOR/HR/FINANCE/ADMIN), `employmentType` (enum: EMPLOYEE/INTERN/CONTRACTOR/PART_TIME/FULL_TIME), `departmentId?`, `teamId?`, `supervisorId?`, `hourlyRate?` (numeric ≥ 0; Finance/Admin only), `payrollEligible?` (bool; defaults `true`, or `false` when `employmentType = INTERN`). Sends invite + verification.
- **Response shaping:** `hourlyRate` is **omitted from user responses** unless the caller is Finance/Admin (BR-PAY-06) — including a user's own `GET /users/me`.
- `409` on duplicate email or `version` mismatch (PATCH).

---

### 3. Roles & Permissions  `/api/v1/roles`, `/api/v1/permissions`

| Method & Path | Purpose | Permission | Roles |
|---|---|---|---|
| `GET /roles` | list roles | `role:read` | Admin |
| `POST /roles` | create role | `role:create` | Admin |
| `PATCH /roles/{id}` | rename / set permissions | `role:update` | Admin |
| `DELETE /roles/{id}` | delete custom role | `role:delete` | Admin |
| `GET /permissions` | list permission catalog | `permission:read` | Admin |

- Tenant scope ORG. `PATCH /roles/{id}` body: `name?`, `permissionKeys: string[]` (validated against catalog). System roles (EMPLOYEE/INTERN/SUPERVISOR/HR/FINANCE/ADMIN) are not deletable → `409`. Audit `ROLE_CHANGE`; domain `RolePermissionsChanged`.

---

### 4. Core Organization  `/api/v1/organization`

| Method & Path | Purpose | Permission | Roles | Audit | Domain |
|---|---|---|---|---|---|
| `GET /organization` | org profile | `org:read` | Admin, HR, Finance | – | – |
| `PATCH /organization` | update profile/timezone | `org:update` | Admin | `SETTINGS_CHANGE` | `OrgUpdated` |
| `GET /organization/settings` | read centralized settings | `org_settings:read` | Admin, HR, Finance | – | – |
| `PUT /organization/settings/{key}` | upsert a setting | `org_settings:update` | Admin (payroll.* also Finance) | `SETTINGS_CHANGE` | `SettingChanged` |
| `GET /organization/holidays` | list holidays | `holiday:read` | all | – | – |
| `POST /organization/holidays` | add holiday | `holiday:write` | Admin/HR | `ADMIN_ACTION` | `HolidayAdded` |
| `DELETE /organization/holidays/{id}` | remove holiday | `holiday:write` | Admin/HR | `ADMIN_ACTION` | `HolidayRemoved` |

- Settings map to `organization_settings` (key/value/type). `PUT .../settings/{key}` validates `value` against `type` and a known-key schema (e.g., `payroll.periods`, `payroll.overtime`, `schedule.workweek`, `ai.provider`, `ai.model`, `ai.toggles`, `ai.token_budget`). `payroll.*` keys also writable by Finance. Holidays drive attendance/overtime.

---

### 5–9. Departments, Teams, Projects, Clients, Work Categories

All five use the **Standard CRUD Template (§0.1)**. Differences:

| Module | Path | Permissions | Create validation | List filters / sort |
|--------|------|-------------|-------------------|---------------------|
| Departments | `/departments` | `department:*` | `name` (unique per org) | `q`; sort `name`,`createdAt` |
| Teams | `/teams` | `team:*` | `name`, `departmentId` (FK), `supervisorId?` | `departmentId`; sort `name` |
| Projects | `/projects` | `project:*` | `name`, `code` (unique), `clientId?`, `billable` (bool) | `clientId`,`billable`,`q`; sort `name`,`code` |
| Clients | `/clients` | `client:*` | `name`, `contact?` | `q`; sort `name` |
| Work Categories | `/work-categories` | `work_category:*` | `name` (unique per org) | `q`; sort `name` |

Roles: create/update/delete = Admin; read = any authenticated org member (used by pickers). All tenant-safe FKs validated (referenced row must be same tenant) → `422`/`404` otherwise.

---

### 10. Time Entries  `/api/v1/time-entries`

| Method & Path | Purpose | Permission | Idemp. | Audit | Domain |
|---|---|---|---|---|---|
| `GET /time-entries` | list own/team/org entries | `time_entry:read` (+`_team`/`_org`) | – | – | – |
| `POST /time-entries` | create manual entry | `time_entry:create` | optional | – | `TimeEntryCreated` |
| `POST /time-entries/start` | start a running timer | `time_entry:create` | – | – | `TimerStarted` |
| `POST /time-entries/{id}/stop` | stop running timer | `time_entry:update` | – | – | `TimerStopped` |
| `PATCH /time-entries/{id}` | edit draft entry | `time_entry:update` | – | – | `TimeEntryUpdated` |
| `DELETE /time-entries/{id}` | soft delete draft | `time_entry:delete` | – | – | `TimeEntryDeleted` |

- Tenant scope: OWN (team/org via `*_team`/`*_org`). Once the entry's timesheet is `SUBMITTED`+, edits are blocked → `409`.
- List filters: `from`,`to` (date range on `startTime`), `projectId`,`clientId`,`workCategoryId`,`userId` (team/org readers only), `running=true`. Sort: `-startTime` (default), `duration`.
- Rate: STANDARD.

**Detailed — `POST /api/v1/time-entries`**

- Roles: Employee (incl. interns) / Supervisor (own); Admin (org). Permission: `time_entry:create`. Auth: yes. Tenant scope: OWN.
- Validation: `startTime` (ISO, required), `endTime` (ISO, > startTime, optional for running), `projectId?`/`clientId?`/`workCategoryId?` (tenant-safe FKs), `description?` (≤ 5000), `referenceLinks?` (URL[]), `deliverables?` (array). `duration_minutes` derived. One running timer per user (else `409`).
- Request:

```json
{ "projectId": "uuid", "clientId": "uuid", "workCategoryId": "uuid",
  "startTime": "2026-06-29T01:00:00Z", "endTime": "2026-06-29T04:00:00Z",
  "description": "Implemented approval guard", "referenceLinks": ["https://..."] }
```

- Response `201`: the created entry (with `id`, `durationMinutes`, standard columns, `version`).
- Errors: `409` overlapping running timer / submitted lock, `422` bad time range or FK, `403` not owner.
- Idempotency: optional `Idempotency-Key`. Audit: – (high-volume; covered by timesheet submit). Domain: `TimeEntryCreated`.

---

### 11. Timesheets  `/api/v1/timesheets`

| Method & Path | Purpose | Permission | Idemp. | Audit | Domain |
|---|---|---|---|---|---|
| `GET /timesheets` | list (own/team/org) | `timesheet:read`(+scope) | – | – | – |
| `GET /timesheets/{id}` | fetch with entries | `timesheet:read` | – | – | – |
| `POST /timesheets` | create draft for a period | `timesheet:create` | optional | – | `TimesheetCreated` |
| `PATCH /timesheets/{id}` | edit draft (add/remove entries, KPIs) | `timesheet:update` | – | – | `TimesheetUpdated` |
| `POST /timesheets/{id}/submit` | submit for review | `timesheet:submit` | optional | – | `TimesheetSubmitted` |

- Tenant scope OWN (+team/org readers). Submit allowed only from `DRAFT`/`REVISION_REQUESTED` and requires documented business value + task status + outputs + linked KPIs (else `422`); illegal state → `409` (state machine, Phase 2 §16).
- List filters: `status`, `userId`(team/org), `from`,`to` (period), `q`. Sort: `-periodStart`, `status`.

**Detailed — `POST /api/v1/timesheets/{id}/submit`**

- Permission `timesheet:submit`; roles Employee (incl. interns) / Supervisor (own). Tenant scope OWN. Transaction (Phase 2 §17).
- Request: `{ }` (optional note). Response `200`: timesheet with `status: SUBMITTED`, `submittedAt`, new `version`.
- Errors: `409` not in submittable state / version mismatch, `422` missing required smart-timesheet fields.
- Audit: – (state captured in approval trail). Domain: `TimesheetSubmitted` → triggers notification to supervisor.

---

### 12. Daily Scrum  `/api/v1/scrum-entries`

| Method & Path | Purpose | Permission | Audit | Domain |
|---|---|---|---|---|
| `GET /scrum-entries` | list own/team | `scrum:read`(+`_team`) | – | – |
| `POST /scrum-entries` | submit daily update | `scrum:create` | – | `ScrumSubmitted` |
| `PATCH /scrum-entries/{id}` | edit same-day entry | `scrum:update` | – | `ScrumUpdated` |
| `POST /scrum-entries/{id}/comment` | supervisor comment | `scrum:read_team` | – | `ScrumCommented` |

- Tenant scope OWN (team for supervisors). One entry per user per day (`409` on duplicate). Validation: `entryDate` (date, not future), `yesterday`,`today`,`blockers?`,`notes?` (≤ 5000 each). Filters: `from`,`to`,`userId`(team),`hasBlockers`. Sort `-entryDate`.

---

### 13. KPI  `/api/v1/kpi`

| Method & Path | Purpose | Permission | Roles |
|---|---|---|---|
| `GET /kpi/templates` | list templates | `kpi_template:read` | Admin/Supervisor |
| `POST /kpi/templates` | create template | `kpi_template:create` | Admin |
| `PATCH /kpi/templates/{id}` | update (new version) | `kpi_template:update` | Admin |
| `DELETE /kpi/templates/{id}` | retire template | `kpi_template:delete` | Admin |
| `GET /kpi/progress` | progress (own/team/org) | `kpi_progress:read`(+scope) | all (own) |

- Templates: `name`, `metricType` (enum), `period` (enum), `targetValue` (numeric), `appliesTo` (roles/depts). Editing bumps `templateVersion` (history preserved). Progress is **read-only via API** — updated by the system from approved logs (Phase 1 BR-KPI-01). Filters on progress: `userId`(team/org),`kpiTemplateId`,`periodKey`. Sort `-periodKey`.

---

### 14. Approvals  `/api/v1/approvals`

| Method & Path | Purpose | Permission | Idemp. | Audit | Domain |
|---|---|---|---|---|---|
| `GET /approvals` | review queue (team) | `approval:read_team` | – | – | – |
| `GET /approvals/{timesheetId}` | submission detail | `approval:read_team` | – | – | – |
| `POST /approvals/{timesheetId}/decision` | approve / reject / revise | `approval:decide` | **required** | `APPROVE`/`REJECT`/`REVISION_REQUEST` | `TimesheetApproved`/`Rejected`/`RevisionRequested` |
| `POST /approvals/{timesheetId}/remarks` | add remark | `approval:remark` | – | – | `RemarkAdded` |

- Tenant scope TEAM (Supervisor) / ORG (Admin). **No self-approval** (Phase 1 BR-APP-04) → `403`. Decision runs in a transaction; emits the KPI/notification/audit handlers (Phase 2 §10).

**Detailed — `POST /api/v1/approvals/{timesheetId}/decision`**

- Permission `approval:decide`; roles Supervisor(team)/Admin. Idempotency-Key **required**. Tenant scope TEAM.
- Validation: `action` (`APPROVE`|`REJECT`|`REQUEST_REVISION`), `remark` (required & non-empty for REJECT/REQUEST_REVISION), `expectedVersion` (timesheet `version`).
- Request:

```json
{ "action": "REQUEST_REVISION", "remark": "Add KPI links for the API work.", "expectedVersion": 3 }
```

- Response `200`: updated timesheet (`status`, `version`) + approval record.
- Errors: `403` self-approval / not team, `409` illegal transition or version mismatch, `422` missing remark.
- Audit: action-specific. Domain: `TimesheetApproved` (→ `PAYROLL_READY`, KPI update, notify) / `Rejected` / `RevisionRequested`.

---

### 15. Payroll  `/api/v1/payroll`

| Method & Path | Purpose | Permission | Idemp. | Rate | Audit | Domain |
|---|---|---|---|---|---|---|
| `GET /payroll/periods` | list periods | `payroll_period:read` | – | STANDARD | – | – |
| `POST /payroll/periods` | open a period | `payroll_period:create` | – | STANDARD | `ADMIN_ACTION` | `PayrollPeriodOpened` |
| `POST /payroll/periods/{id}/generate` | compute line items | `payroll:generate` | **required** | HEAVY | `ADMIN_ACTION` | `PayrollGenerated` |
| `POST /payroll/periods/{id}/lock` | lock period | `payroll_period:update` | – | STANDARD | `ADMIN_ACTION` | `PayrollLocked` |
| `POST /payroll/periods/{id}/export` | export PDF/Excel | `payroll:export` | **required** | HEAVY | `PAYROLL_EXPORT` | `PayrollExported` |
| `GET /payroll/reports/{id}` | fetch report + line items | `payroll_period:read` | – | STANDARD | – | – |
| `GET /payroll/me` | own payroll **status** (hours/state, no amounts) | `payroll:read_self` | – | STANDARD | – | – |
| `GET /payroll/rates/{userId}` | read hourly rate | `payroll_rate:read` | – | STANDARD | – | – |
| `PATCH /payroll/rates/{userId}` | set hourly rate | `payroll_rate:update` | – | STANDARD | `SETTINGS_CHANGE` | `RateChanged` |

- Roles: Finance + Admin. Tenant scope ORG. Generation aggregates only `PAYROLL_READY` hours (Phase 1 BR-PAY-01) for **payroll-eligible users only — interns (`payroll_eligible=false`) are excluded** (BR-PAY-05); computes approved/pending/rejected/overtime/estimated pay. Export runs async (BullMQ) → returns a job/report ref; files land in object storage. Re-export after lock requires explicit re-open (`409` otherwise). Idempotency-Key dedupes generate/export. Employees see only their own payroll **status** via `GET /payroll/me` (no amounts); Supervisors see team status; hourly rate and computed pay are **Finance/Admin-only** (BR-PAY-06).

**Detailed — `POST /api/v1/payroll/periods/{id}/export`**

- Permission `payroll:export`; roles Finance/Admin. Idempotency-Key required. Rate HEAVY. Tenant scope ORG.
- Request: `{ "format": "PDF" | "XLSX" | "BOTH" }`. Response `202`:

```json
{ "jobId": "uuid", "status": "QUEUED", "reportId": "uuid" }
```

- Errors: `409` period not generated / not locked (per settings), `403` not Finance/Admin, `429` throttled.
- Audit: `PAYROLL_EXPORT`. Domain: `PayrollExported` (→ notify Finance when files ready).

---

### 16. Notifications  `/api/v1/notifications`

| Method & Path | Purpose | Permission |
|---|---|---|
| `GET /notifications` | list own | `notification:read_self` |
| `POST /notifications/{id}/read` | mark read | `notification:update_self` |
| `POST /notifications/read-all` | mark all read | `notification:update_self` |

- Tenant scope OWN. Filters: `status`,`type`. Sort `-createdAt`. Delivery (email/in-app) is system-driven from domain events; this module is read/ack only.

---

### 17. AI  `/api/v1/ai`

| Method & Path | Purpose | Permission | Idemp. | Rate | Audit | Domain |
|---|---|---|---|---|---|---|
| `POST /ai/jobs` | trigger an AI feature | `ai:trigger_self`(+`_team`/`_org`) | **required** | AI | `AI_USAGE` | `AiJobQueued` |
| `GET /ai/jobs/{id}` | job status | `ai:read` | – | STANDARD | – | – |
| `GET /ai/results/{jobId}` | fetch result (summary/recommendation) | `ai:read` | – | STANDARD | – | – |

- Tenant scope OWN/TEAM/ORG by feature. Runs async (BullMQ). **No raw prompt/response is returned or stored** — only `ai_results` (summary, recommendation, confidence); `ai_audit` keeps hashes (Phase 3). Advisory only; never mutates payroll/approvals.

**Detailed — `POST /api/v1/ai/jobs`**

- Validation: `feature` (enum `ai_feature`), `subjectType`+`subjectId` (tenant-safe target, e.g., a timesheet), `options?`. Idempotency-Key required (dedup per subject+version).
- Request: `{ "feature": "TIMESHEET_SUMMARY", "subjectType": "timesheet", "subjectId": "uuid" }`
- Response `202`: `{ "jobId": "uuid", "status": "QUEUED" }`.
- Errors: `403` feature disabled (org `ai.toggles`) / scope, `422` bad subject, `429` AI tier.
- Audit: `AI_USAGE` (feature, provider, model, tokens via `ai_jobs`). Domain: `AiJobQueued` → on completion `AiJobSucceeded`/`AiJobFailed`.

---

### 18. Audit Logs  `/api/v1/audit-logs`

| Method & Path | Purpose | Permission | Roles |
|---|---|---|---|
| `GET /audit-logs` | query audit trail | `audit:read_org` / `audit:read_scoped` | Admin (org); HR, Finance (scoped) |
| `GET /audit-logs/{id}` | fetch one | `audit:read_org`/`scoped` | as above |

- **Read-only** (append-only store; no create/update/delete). Tenant scope ORG (Admin) or scoped (HR, Finance see payroll/people-related actions). Filters: `action`,`actorId`,`entityType`,`entityId`,`from`,`to`. Sort `-createdAt`. Cursor pagination.

---

### 19. Admin  `/api/v1/admin`

Administrative/cross-cutting operations (Admin role; ORG scope).

| Method & Path | Purpose | Permission | Idemp. | Audit |
|---|---|---|---|---|
| `GET /admin/overview` | tenant/org health & counts | `org:read` | – | – |
| `POST /admin/users/import` | bulk user import | `user:create` | **required** (BULK) | `ADMIN_ACTION` |
| `POST /admin/approvals/bulk` | bulk approve queue | `approval:decide` | **required** (BULK) | `APPROVE` |
| `GET /admin/feature-flags` | read flags (future-ready) | `org:read` | – | – |

- Bulk endpoints accept arrays with per-item results (`207`-style body: `{ "results": [{ "id", "status", "error?" }] }`), are idempotent via key, and respect the same per-item rules (no self-approval, state machine).

---

### 20. Dashboard & Reports  `/api/v1/dashboard` *(read models — required by brief, not in the numbered list)*

| Method & Path | Purpose | Permission |
|---|---|---|
| `GET /dashboard/summary` | role-scoped KPIs/metrics | `dashboard:read_self`/`_team`/`_org` |
| `GET /dashboard/attendance` | attendance trends | `attendance:read_org` (HR) / `dashboard:read_org` |
| `GET /reports/productivity` | productivity report | `dashboard:read_team`/`_org` |

- Tenant scope by role (self/team/org). Read-only aggregates (Phase 3 §9: indexed queries + Redis cache). Filters: `from`,`to`,`departmentId`,`teamId`,`projectId`. Cached responses carry `Cache-Control` + are invalidated on domain events.

---

## Security Notes

Every protected endpoint enforces auth → tenant context → permission + scope → validation before the handler (Phase 2 §6). Tenant ID is never accepted from the client. `404` is returned for cross-tenant access (no existence leak). Money/AI/bulk mutations require an `Idempotency-Key`; auth endpoints use the strict rate tier with `Retry-After`. AI endpoints never return raw prompts/responses. All mutations are audited; payroll, role changes, settings, and AI usage are always logged.

## Testing

Contract tests (Phase 8) assert, per endpoint: the RBAC matrix (allowed roles 2xx, others 403), tenant isolation (cross-tenant → 404), validation (422 with field details, unknown-field rejection), state-machine guards (illegal transition → 409), optimistic-lock conflict (→ 409), idempotency replay (same key → same result, no duplicate side effects), pagination/filter/sort contracts, and rate-limit behavior (429 + Retry-After). An OpenAPI document generated from this spec backs request/response schema validation.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Spec/implementation drift | Medium | Freeze Phases 3+4; generate OpenAPI + contract tests; PR review against this doc. |
| Over-broad list endpoints leaking team/org data | High | Separate `*_team`/`*_org` permissions; default to OWN scope. |
| Idempotency gaps on money ops | High | Required key on generate/export/bulk; deterministic job IDs. |
| N+1 / heavy dashboard queries | Medium | Dedicated read endpoints + cache; bounded page sizes. |

## Improvements (post-MVP)

Public webhooks + outbox event stream; GraphQL/BFF for dashboards; ETag/conditional requests; bulk CSV exports for all lists; field-level response shaping (`?fields=`); per-endpoint OpenAPI examples published via Swagger UI; API keys/service accounts for integrations.

---

## Verification Checklist

**Completed**

- Global conventions defined once (auth, tenant scope, errors, pagination, filtering/sorting, rate tiers, idempotency, audit/domain events, headers).
- Standard CRUD template + permission catalog (RBAC seed) provided.
- All 19 modules in dependency order specified (1 Auth … 19 Admin) + Dashboard/Reports read models; each endpoint lists method, path, purpose, permission, roles, auth, tenant scope, idempotency, audit, and domain events.
- Detailed OpenAPI-style contracts (request/response/errors/validation) for the key endpoints of every complex module (auth, time entries, timesheets, approvals, payroll, AI).
- Reflects approved changes: HR vs Finance split, privacy-preserving AI endpoints, centralized organization settings, `/api/v1`, optimistic locking via `expectedVersion`/`version`.
- Role vs employment-type separated (`employmentType` on users; payroll filters `payroll_eligible` + `status=ACTIVE`); interns excluded from payroll; hourly rate hidden from self/Supervisor/HR (Finance/Admin only).
- Contracts only — **no controllers, services, Prisma, or NestJS code.**

**Pending (next: Phase 5 — Backend Foundation)**

- Implement only foundation: auth, RBAC guards/policies, tenant context + Prisma middleware + RLS wiring, config, logging, validation, error filter, security middleware. No business modules yet.

**Locked decisions** (resolved; frozen)

- **No partial approval** — `/approvals/{timesheetId}/decision` acts on the whole timesheet (no per-entry payload).
- **Payroll immutable after export** — no re-export of a locked period; corrections are a next-cycle adjustment.
- **KPI templates: current version only.**
- **Timestamps are UTC end-to-end**; the org tz is applied at the frontend for display and date-filter boundaries.

**Risks / Improvements:** see sections above.

---

**STOP — Phase 4 complete. Awaiting approval to proceed to Phase 5 (Backend Foundation). On approval, freeze Phases 3 + 4 as the source of truth.**
