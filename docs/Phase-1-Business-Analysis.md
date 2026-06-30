# TimeForge — Phase 1: Business Analysis

> Workforce Performance, Timesheet & Daily Scrum Management System
> Enterprise Multi-Tenant SaaS · MVP for a 2-week internship (~60 eng. hrs)
> Status: **DRAFT — awaiting approval before Phase 2 (Architecture Blueprint)**

---

## Goal

Establish a complete, shared understanding of *what* TimeForge must do before any design or code is written. This phase converts the Project Brief and Technical Blueprint into an unambiguous specification of business goals, actors, end-to-end workflows, the permission model, business rules, edge cases, and acceptance criteria. No architecture and no implementation are produced here — those follow in Phases 2–9 after this is approved.

The product's defining idea (from the brief and blueprint) is the **Smart Timesheet paradigm shift**: TimeForge does not merely record *how long* someone worked, it records *what business value was delivered* and ties that value to measurable KPIs, an approval trail, and payroll.

---

## Assumptions

These are working assumptions for the MVP. Items marked **(confirm)** should be validated before or during Phase 2.

1. **Tenancy model — internal, not commercial.** TimeForge is an **internal enterprise application**, not a product sold to external customers. There is **no billing, subscription, licensing, or paywall**. Multi-tenancy is retained purely to **isolate data between organizations managed within the same deployment** (and, below that, between departments/teams). One deployment may host a single organization or several internally-managed organizations; every row still carries `tenant_id` + `organization_id` so isolation holds regardless. *(Resolves the earlier tenant↔organization open item.)*
2. **Access role vs. employment type (separated).** **Access roles** drive permissions/RBAC: Employee, Supervisor, HR, Finance, System Administrator. **Employment type** drives operational processing (payroll, attendance, benefits, KPIs): `EMPLOYEE | INTERN | CONTRACTOR | PART_TIME | FULL_TIME`. An **intern** is an *Employee-role* user with `employment_type = INTERN` and `payroll_eligible = false` — identical access to an Employee, minus payroll. This separation keeps permission logic and operational logic independent and extensible (e.g., contractors who aren't paid via the payroll module). **HR and Finance are distinct roles**: HR is people/attendance-focused; Finance owns payroll preparation, hourly rates, payroll settings, and export.
3. **A user has exactly one primary role per organization** for the MVP (no multi-role stacking yet), but the model is permission-based so stacking can be added later.
4. **Supervisors can also be employees.** A supervisor may submit their own timesheets; those are approved by *their* supervisor or an admin — never self-approved (see Business Rules BR-APP-04).
5. **Payroll is "preparation," not disbursement.** TimeForge computes *estimated* payroll and exports reports (PDF/Excel). It does not pay anyone, integrate with banks, or file taxes in the MVP.
6. **Hourly-rate model.** Compensation is hourly. Each user has an `hourly_rate`; overtime is hours beyond a configurable daily/period threshold. Salaried/mixed models are future work.
7. **Payroll periods** default to 1st–15th and 16th–end-of-month, configurable per organization.
8. **Time zones.** Each organization has a default time zone; entries are stored in UTC and displayed in the org/user time zone. **(confirm)**
9. **AI is assistive, never authoritative.** AI outputs (summaries, validations, advisories) are suggestions surfaced to humans; they never auto-approve, auto-reject, or alter payroll figures without human action.
10. **Locked technology decisions** (confirmed with stakeholder):
    - Backend: **NestJS + TypeScript**
    - Frontend: **Next.js + React + TypeScript**
    - Database: **Supabase PostgreSQL** (managed Postgres; shared schema with `tenant_id` on every row, enforced via query filter + Row-Level Security)
    - ORM: **Prisma**
    - Storage: **Supabase Storage** (provider-abstracted; local fallback)
    - Authentication: **Custom JWT + refresh tokens (NestJS)** — *not* Supabase Auth
    - Queue & cache: **BullMQ + Redis**
    - AI: **provider-abstraction layer, default provider OpenAI**
11. **Non-goals — explicitly removed, will not be built.** Subscription plans, billing, payment gateways (Stripe/PayMongo), usage limits/metering, trials, and license management. TimeForge is internal; a commercial layer adds complexity without serving the brief.
12. **Confirmed cross-cutting building blocks** (kept; detailed in Phase 2): multi-tenancy, RBAC, audit logs, AI provider abstraction, background jobs (**BullMQ + Redis**), notifications, file storage, domain events, security hardening, and **feature flags as a future-ready capability** (designed for, not built in the MVP — e.g., toggling AI or Payroll per organization).
13. **Deferred — not in MVP but architecture-compatible:** biometric/geofenced attendance, SSO/SAML & SCIM, native mobile apps, real-time collaborative editing, multi-currency payroll, and external HRIS/payroll integrations.

> **Implementation Strategy (2-week MVP).** All required modules from the project brief **will be implemented**. Advanced capabilities within each module are intentionally scoped to an MVP suitable for a 2-week (~60-hour) development schedule. **No required module is omitted.**

---

## Architecture Decisions

Phase-1-level decisions only (full architecture is Phase 2). These are the analysis-level commitments that shape everything downstream.

| # | Decision | Rationale |
|---|----------|-----------|
| AD-1 | **Domain-centric module boundaries** matching the brief's modules (Auth, Org, Users, RBAC, Departments, Projects/Clients, Time Tracking, Smart Timesheets, Daily Scrum, KPIs, Approvals, Payroll, Dashboard, Notifications, AI, Audit, Admin, Reports, Settings). | Keeps the system modular and independently expandable; each maps to a bounded context. |
| AD-2 | **Tenant isolation is a cross-cutting invariant, not per-query effort.** Every table carries `tenant_id` + `organization_id`; isolation enforced by a global mechanism so developers cannot forget it. | Brief's hard requirement: "Developers must never manually remember tenant filters … No cross-tenant leakage." |
| AD-3 | **RBAC is permission-based, not role-string checks.** Roles map to a permission set; guards/policies check permissions. | Allows new roles and fine-grained changes without rewriting authorization logic. |
| AD-4 | **The Smart Timesheet is the aggregate root for productivity**, linking time entries, outputs/deliverables, task status, and achieved KPIs. | This is the core product differentiator and the unit that flows through approval into payroll. |
| AD-5 | **Approval is a strict state machine** (`SUBMITTED → UNDER_REVIEW → APPROVED \| REJECTED \| REVISION_REQUESTED → PAYROLL_READY`). Only valid transitions allowed; remarks captured per transition. | Matches blueprint Module 3; guarantees auditable, predictable payroll inputs. |
| AD-6 | **Audit log is append-only and immutable**; sensitive actions are recorded and never deletable. | Brief: "Immutable … Never allow deletion." |
| AD-7 | **AI behind a provider abstraction** with prompt logging, token accounting, and model selection. | Brief's AI requirements; default OpenAI, swappable. |
| AD-8 | **Soft delete everywhere** (`deleted_at`) for business records; audit records are exempt (never deleted at all). | Preserves history for coaching, payroll defensibility, and analytics. |
| AD-9 | **Organization is the configuration aggregate**: Organization → Departments, Teams, Projects, Clients, Users, KPI Templates, Payroll Settings, Work Schedule, Holiday Calendar, AI Settings. | Replaces any SaaS billing/plan layer with the structure the brief actually needs. |
| AD-10 | **Async-first infrastructure**: background jobs on **BullMQ + Redis** (AI generation, report/export building, notifications, recurring schedules); **domain events** decouple modules; a **file-storage** abstraction handles attachments/exports. | Keeps request paths fast; runs AI/payroll/report work off the hot path; clean module seams. |
| AD-11 | **Feature flags — future-ready capability, not implemented in the MVP.** The design leaves seams to enable/disable heavier modules (AI, Payroll) per organization later. | Demonstrates extensibility without spending build time during a 2-week MVP. |
| AD-12 | **No commercial layer.** No billing/subscription/payment/licensing modules exist anywhere in the system. | Internal enterprise app; removed by decision. |

---

## Files Generated

| File | Purpose |
|------|---------|
| `docs/Phase-1-Business-Analysis.md` | This document — the approved input to Phase 2. |

No source code is generated in Phase 1.

---

## Implementation

> "Implementation" for Phase 1 = the Business Analysis itself: goals, actors, workflows, permissions, business rules, edge cases.

### 1. Business & System Goals

**Business goals (from brief §3):**

- Centralize workforce time + productivity tracking in one platform.
- Replace manual timesheets with structured digital work logs tied to measurable outputs.
- Embed Daily Scrum into the daily workflow.
- Monitor KPIs at individual, departmental, and organizational levels.
- Streamline supervisor review/approval.
- Produce payroll-ready reports from approved hours.
- Give management real-time dashboards and analytics.
- Demonstrate practical AI for reporting and decision support.

**System success criteria (measurable):**

- A complete employee lifecycle works end-to-end: clock-in → smart timesheet → daily scrum → supervisor approval → payroll-ready → payroll export.
- Zero cross-tenant data leakage under test (tenant isolation tests pass 100%).
- RBAC enforced on every endpoint (no capability reachable by an unauthorized role).
- Payroll figures are reproducible and traceable to approved entries.
- AI features produce summaries/insights with full prompt + token logging.

### 2. Actors

| Actor | Type | Responsibilities | Notes |
|-------|------|------------------|-------|
| **Employee** | Human | Track time, document work/business value, submit smart timesheets, submit daily scrum, view own KPIs/productivity. | Owns only their own data. |
| **Intern** | Human | Same operational workflow as Employee (time, timesheets, scrum, KPIs, attendance) — the flow stops *before* payroll. | Access role = Employee; `employment_type = INTERN`; `payroll_eligible = false`. |
| **Supervisor** | Human | Review team submissions, approve/reject/request revision with remarks, monitor team performance, watch recurring blockers. | Scope limited to assigned team/department. May also act as an Employee. |
| **HR (Human Resources)** | Human | Monitor attendance, run people/attendance reporting, view approved data & dashboards. | People-focused; reads approved data; no payroll export, no work-content editing. |
| **Finance** | Human | Prepare payroll from approved hours, manage hourly rates & payroll settings, export payroll (PDF/Excel), ensure payroll accuracy. | Money-focused; reads approved data; no people management, no work-content editing. |
| **System Administrator** | Human | Manage users, departments, projects, clients, KPIs, roles/permissions, settings, AI configuration; full administration. | Global CRUD within tenant. |
| **System / Scheduler** | Automated | Auto-calculate totals, trigger AI jobs, send notifications/reminders, rotate tokens. | Acts under service identity; still audited. |
| **AI Provider** | External | Generate summaries, validations, analyses, advisories on request. | Abstracted; default OpenAI. Never an approver. |

### 2.1 Organization Management Model (configuration hierarchy)

The Organization is the top-level configuration aggregate — the structure that stands in place of any SaaS billing/plan layer:

```
Organization
├── Departments
├── Teams
├── Projects
├── Clients
├── Users
├── KPI Templates
├── Payroll Settings   (periods, overtime rule, hourly-rate policy)
├── Work Schedule      (standard working days/hours, expected daily hours)
├── Holiday Calendar   (non-working days, holiday handling)
└── AI Settings        (provider, model, feature toggles, token budget)
```

- **Departments → Teams** provide two-level grouping; supervisors are scoped to teams/departments for approval routing.
- **KPI Templates** are reusable definitions assigned to roles/departments; per-user KPI progress are instances of them.
- **Work Schedule + Holiday Calendar** define *expected* hours and non-working days — the baseline for attendance, overtime, and payroll.
- **Payroll Settings** hold periods (1–15, 16–EOM default), overtime rule, and rate policy.
- **AI Settings** hold provider/model selection, per-feature toggles (feature flags), and token budget.

**Core lifecycle spine** (the path development prioritizes):
`Authentication → Organization Management → Time Tracking → Smart Timesheets → Daily Scrum → Supervisor Approval → Payroll Preparation → Dashboard & Analytics → AI Insights`

### 3. End-to-End Workflows

**W1 — Organization Management / setup (Admin).** Admin configures the organization aggregate: departments, teams, projects, clients, users & role assignments, KPI templates, payroll settings (periods, overtime, rates), work schedule, holiday calendar, time zone, and AI settings. Output: a configured organization ready for users.

**W2 — User onboarding & authentication.** Admin invites a user (or user self-registers if enabled) → email verification → first login → role/department/supervisor assigned → user active. Auth supports JWT access + rotating refresh tokens, forgot/reset password, session revocation, and device tracking.

**W3 — Daily time tracking (Employee).** Employee starts/stops a timer (or adds a manual entry) capturing date, start, end, duration, project, client, department, task, work category, description, attachments, reference links, and deliverables. System auto-calculates daily/weekly/monthly/payroll-period totals.

**W4 — Smart Timesheet submission (Employee).** Employee compiles entries into a timesheet for a day/period, enriching each with business value, task status, outputs produced, and achieved KPIs, then submits. State becomes `SUBMITTED`. Once submitted, content locks pending review.

**W5 — Daily Scrum (Employee).** Employee submits a structured daily update: yesterday's work, today's plan, blockers, notes for supervisor. Supervisor can comment; recurring blockers are surfaced.

**W6 — Supervisor approval (Supervisor).** Per blueprint Module 3 state machine:
`SUBMITTED` → supervisor opens review (`UNDER_REVIEW`) → **Approve** (`APPROVED` → unlocks `PAYROLL_READY`), **Reject** (`REJECTED`, mandatory remark), or **Request Revision** (`REVISION_REQUESTED`, mandatory remark, returns to employee). Remarks are permanently attached to the record for coaching history.

**W7 — KPI auto-update (System).** On approval, KPI progress updates **strictly from approved work logs** (never from drafts or pending items). Progress rolls up to individual, department, and organization levels.

**W8 — Payroll preparation (Finance).** Finance selects a payroll period; the system aggregates approved hours, pending hours, rejected hours, overtime, attendance summary, hourly rate, and estimated payroll, then exports to PDF and Excel. **Only payroll-eligible users (Employees) are included; interns are excluded** (BR-PAY-05). HR independently monitors attendance and people reporting over the same approved data (no payroll export).

**W9 — Dashboards & analytics (All, role-scoped).** Real-time, role-scoped dashboards: total hours rendered, productivity, department performance, pending approvals, KPI completion, attendance trends, billable vs non-billable, project allocation, payroll summary.

**W10 — AI assistance (System + Human review).** On schedule or on demand, AI generates daily/weekly summaries, KPI analysis, payroll validation (anomaly/discrepancy detection), recurring-blocker detection, and supervisor advisories. Every call logs prompt, model, and token usage. Humans always review; AI never approves or changes payroll.

**W11 — Notifications.** Triggered on submission, approval decisions, revision requests, approaching deadlines/missed scrum, payroll export readiness, and AI report availability.

**W12 — Audit logging.** Append-only records for login/logout, approve/reject, payroll export, role change, password change, AI usage, settings changes, and admin actions. Immutable; never deleted.

### 4. Permission Matrix (RBAC overview)

Columns are **access roles**. *Intern* is shown separately to make the payroll delta explicit, but it is technically an Employee-role user with `employment_type = INTERN` (so its only difference from Employee is payroll). Legend: **Own/Self** = own records; **Team** = supervised team; **Org** = whole organization; **View** = read-only; **Hidden** = not visible even to self; ✗ = none.

| Capability | Employee | Intern | Supervisor | HR | Finance | Admin |
|---|---|---|---|---|---|---|
| Login / view self | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Track time / edit own draft entries | Own | Own | Own | ✗ | ✗ | Org |
| Submit daily scrum | Own | Own | Own | ✗ | ✗ | Org |
| Submit smart timesheet | Own | Own | Own | ✗ | ✗ | Org |
| View own KPIs / productivity | Own | Own | Own | ✗ | ✗ | Org |
| Review & approve/reject/revise timesheets | ✗ | ✗ | Team | View | View | Org |
| Add supervisor remarks | ✗ | ✗ | Team | ✗ | ✗ | Org |
| View KPIs (team / org) | ✗ | ✗ | Team | Org (view) | Org (view) | Org |
| View attendance | Own | Own | Team | Org | Org (view) | Org |
| Monitor attendance & people reporting | ✗ | ✗ | Team | Org | ✗ | Org |
| View own payroll status (no amounts) | Self | ✗ | — | — | — | Org |
| View payroll status (team / org) | ✗ | ✗ | Team (status) | Org (view) | Org | Org |
| Prepare / generate payroll | ✗ | ✗ | ✗ | ✗ | Org | Org |
| Export payroll (PDF / Excel) | ✗ | ✗ | ✗ | ✗ | Org | Org |
| View / manage hourly rate | Hidden | ✗ | ✗ | ✗ | Org | Org |
| Manage payroll settings | ✗ | ✗ | ✗ | ✗ | Org | Org |
| Manage users / departments / projects / clients | ✗ | ✗ | ✗ | ✗ | ✗ | Org |
| Manage KPI templates | ✗ | ✗ | ✗ | ✗ | ✗ | Org |
| Manage roles / permissions | ✗ | ✗ | ✗ | ✗ | ✗ | Org |
| Configure org settings / AI | ✗ | ✗ | ✗ | ✗ | payroll.* | Org |
| Trigger AI summaries / insights | Own | Own | Team | Org | Org | Org |
| View audit logs | ✗ | ✗ | ✗ | View (scoped) | View (scoped) | Org |

All capabilities are implicitly scoped to the caller's **tenant**; cross-tenant access is never permitted for any role. Hourly rate and computed pay are visible only to Finance/Admin — **hidden from the employee themselves** and from Supervisors/HR (BR-PAY-06).

### 5. Business Rules (selected, authoritative)

*Tenancy & data*

- **BR-TEN-01** Every business record carries `tenant_id`, `organization_id`, `created_by`, `updated_by`, `created_at`, `updated_at`, `deleted_at`.
- **BR-TEN-02** Every read/write is automatically scoped to the current tenant; no endpoint may return another tenant's data, and internal IDs are never exposed across tenants.
- **BR-TEN-03** Business records use soft delete; audit records are never deleted.

*Time tracking*

- **BR-TIME-01** Duration is derived from start/end; manual duration must reconcile with start/end.
- **BR-TIME-02** Two running timers for the same user are not allowed simultaneously; overlapping entries are flagged (configurable hard-block vs warning). **(confirm)**
- **BR-TIME-03** Totals are auto-computed at daily, weekly, monthly, and payroll-period granularity.

*Smart timesheet & approval*

- **BR-TS-01** A timesheet must include documented business value, task status, outputs, and linked KPIs before it can be submitted.
- **BR-TS-02** Submitted timesheets are immutable except through an explicit revision cycle.
- **BR-APP-01** Valid transitions only: `SUBMITTED → UNDER_REVIEW → {APPROVED | REJECTED | REVISION_REQUESTED}`; `APPROVED → PAYROLL_READY`.
- **BR-APP-02** Reject and Request-Revision require a non-empty supervisor remark.
- **BR-APP-03** Supervisors may act only on their own team's submissions.
- **BR-APP-04** No self-approval: a user can never approve their own timesheet.
- **BR-APP-05** Remarks are permanent and attached to the record (coaching history); they are never edited away or deleted.

*KPI*

- **BR-KPI-01** KPI progress updates **only** from approved work logs.
- **BR-KPI-02** Changing a KPI definition does not retroactively rewrite already-approved historical progress (versioned). **(confirm)**

*Payroll*

- **BR-PAY-01** Only `PAYROLL_READY` (approved) hours count toward estimated payroll.
- **BR-PAY-02** Estimated payroll = approved regular hours × hourly rate + overtime per the overtime rule.
- **BR-PAY-03** Payroll periods default to 1–15 and 16–EOM, configurable per org.
- **BR-PAY-04** Once a payroll period is exported/locked, later changes to underlying entries require a new revision + re-export with an audit trail (no silent edits). **(confirm exact lock semantics)**
- **BR-PAY-05** A user is included in payroll only when **`payroll_eligible = TRUE` AND `status = ACTIVE`** — an explicit flag check, never `role != INTERN`. Interns (`employment_type = INTERN`) default to `payroll_eligible = false` and never appear in payroll, though their hours are still tracked, approved, and counted toward attendance/KPIs.
- **BR-PAY-06** Hourly rate and computed pay are visible only to **Finance and Admin** — hidden from the employee themselves and from Supervisors/HR. Employees may view their own payroll *status* (hours buckets, approval state) without monetary amounts.
- **BR-EMP-01** **Access role** governs permissions; **employment type** governs operational processing (payroll, attendance, benefits, KPIs). The two are independent — e.g., a contractor may hold the Employee role yet be `payroll_eligible = false`.

*Organization, schedule & attendance*

- **BR-ORG-01** Departments contain Teams; supervisors are assigned at team/department level and may act only within their scope (ties to BR-APP-03).
- **BR-ORG-02** KPI Templates are defined at the organization level and assigned to roles/departments; per-user KPI progress are instances of those templates.
- **BR-SCHED-01** The Work Schedule defines expected working days and daily hours; attendance and overtime are measured relative to it.
- **BR-SCHED-02** Days on the Holiday Calendar are non-working by default and excluded from expected hours; work logged on a holiday is flagged for holiday/overtime handling per Payroll Settings.
- **BR-OT-01** Overtime = approved hours beyond the scheduled threshold (daily and/or per-period) defined in Payroll Settings.

*Auth & security*

- **BR-SEC-01** Email verification is required before access.
- **BR-SEC-02** Refresh tokens rotate on use; reuse of a rotated token revokes the session (theft detection).
- **BR-SEC-03** All sensitive actions are audited immutably.

### 6. Edge Cases (to be designed for)

- Forgotten running timer (overnight / multi-day) — needs auto-stop or max-duration cap + prompt.
- Overlapping or duplicate entries / double counting.
- Timesheet or work spanning a payroll-period boundary.
- Employee with no assigned supervisor, or supervisor deactivated mid-cycle (re-routing / fallback to admin).
- Supervisor submitting their own timesheet (must route to a different approver).
- Retroactive edits after payroll export (BR-PAY-04).
- Intern (or other non-payroll-eligible) user with approved hours — included in attendance/KPI rollups but excluded from payroll (BR-PAY-05).
- Role or department change mid-period (which approver/period applies).
- Soft-deleted project/client/department still referenced by historical entries (must still render).
- Time-zone & DST boundaries on start/end times.
- Missed daily scrum / backfilling past days.
- KPI definition changed mid-period (versioning).
- AI provider outage, rate limit, or token budget exceeded (graceful degradation; feature stays optional).
- Tenant suspension / over-quota.
- Concurrent edits to the same record (optimistic locking / version conflict).
- Rejected→resubmit loops; partial approval where some entries are approved and others rejected. **(confirm partial-approval policy)**

### 7. Domain Glossary (ubiquitous language)

Tenant; Organization; Department; Team; Project; Client; User; Role; Permission; Time Entry; Smart Timesheet; Work Log; Deliverable; Work Category; Daily Scrum Entry; Blocker; KPI Template; KPI Progress; Approval; Approval State; Remark; Payroll Settings; Payroll Period; Payroll Report; Overtime; Work Schedule; Holiday Calendar; Attendance; Dashboard; AI Settings; AI Insight; Prompt Log; Token Usage; Notification; Feature Flag; Domain Event; Background Job (BullMQ/Redis); Audit Log; Session; Refresh Token; Device.

---

## Security Notes

Phase-1-level security posture (detailed design in Phase 2):

- **Tenant isolation** is the top security invariant — enforced globally (query filter + Postgres RLS), tested explicitly, and never left to per-query discipline.
- **AuthN:** JWT access tokens + rotating refresh tokens, email verification, forgot/reset password, session revocation, device tracking, password hashing (argon2/bcrypt).
- **AuthZ:** permission-based RBAC with route guards + policy checks; default-deny.
- **Defense in depth:** Helmet, rate limiting, CORS allow-list, input validation (reject unknown fields), output encoding (XSS), parameterized queries (SQL/NoSQL injection prevention), request size limits, secure cookies, trusted proxy.
- **Audit:** immutable, append-only logging of all sensitive actions; never deletable.
- **AI safety:** AI is assistive only; prompts and token usage logged; no PII leaves the tenant boundary beyond what is required for the requested feature.
- **No stack traces** or internal IDs exposed to clients.

---

## Testing

How Phase 1 requirements will be validated in later phases (planned now so design is testable):

- **Acceptance criteria per module** (sample): each module gets Given/When/Then criteria — e.g., *Approval:* "Given a SUBMITTED timesheet, when a supervisor rejects without a remark, then the action is refused (422)."
- **RBAC test matrix:** every capability × every role asserted (allowed/denied) — the permission matrix above becomes a test fixture.
- **Tenant isolation tests:** attempts to read/write across tenants must fail for every endpoint; ID enumeration across tenants must 404, not 403-with-leak.
- **State-machine tests:** all valid transitions succeed; all invalid transitions are rejected.
- **Payroll correctness:** computed totals reconcile exactly with approved entries across period boundaries and overtime cases.
- **AI contract tests:** provider abstraction returns structured output; prompt + token logging recorded; provider-outage path degrades gracefully.

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Scope vs 2 weeks / ~60 hrs.** The brief is large (18+ modules). | High | All required modules are built but scoped to MVP depth; build the lifecycle spine first (Auth → Time → Smart Timesheet → Approval → Payroll), then KPI/Dashboard/AI. |
| **Tenant data leakage.** Any miss = critical breach. | Critical | Global enforcement (RLS + filter), default-deny, dedicated isolation test suite. |
| **Payroll correctness disputes.** Wrong numbers erode trust. | High | Deterministic, fully traceable computation; lock/export semantics; audit trail. |
| **AI cost / latency / outages.** | Medium | Provider abstraction, token budgets, caching, async jobs, graceful degradation; AI optional to core flow. |
| **Approval-routing gaps** (no supervisor, self-approval). | Medium | Explicit routing rules + fallbacks defined in Business Rules/edge cases. |
| **Over-engineering** against the timeline. | Medium | "MVP with enterprise architecture" — clean seams, minimal features; defer the out-of-scope list. |

---

## Improvements (future expansion — out of MVP scope)

SSO/SAML & SCIM provisioning; native mobile apps; geofenced/biometric attendance; customer invoicing & billing; multi-currency & salaried/mixed pay models; external HRIS/payroll integrations; real-time collaborative editing & presence; webhooks & public API; advanced anomaly detection and forecasting; granular custom roles; in-app coaching/goal-setting; multi-language/i18n.

---

## Verification Checklist

**Completed**

- Both source documents (Project Brief + Technical Blueprint) read and reconciled — consistent with the master prompt.
- Business & system goals, success criteria captured.
- Actors identified: 5 access roles (Employee, Supervisor, HR, Finance, Admin) + employment types (incl. Intern via `employment_type`) + system + AI.
- 12 end-to-end workflows mapped (W1–W12), including the full approval state machine.
- RBAC permission matrix drafted (capability × role, tenant-scoped).
- Authoritative business rules captured across tenancy, time, timesheet/approval, KPI, payroll, security.
- Edge cases and domain glossary documented.
- Foundational tech decisions locked (NestJS, Next.js, Postgres shared-schema + tenant_id, AI abstraction defaulting to OpenAI).
- Coverage cross-checked against brief functional requirements §6.1–6.7, AI §7, users §5, deliverables §8.
- Scope refined per stakeholder: **internal enterprise app — no billing/subscription/licensing**; multi-tenancy retained only for internal org/department isolation.
- **Organization Management model** added (Departments, Teams, Projects, Clients, Users, KPI Templates, Payroll Settings, Work Schedule, Holiday Calendar, AI Settings) + core lifecycle spine.
- Cross-cutting infrastructure confirmed: BullMQ/Redis background jobs, notifications, file storage, domain events, and feature-flag readiness (designed for, not built in MVP).

**Pending (next: Phase 2 — Architecture Blueprint)**

- System architecture, module boundaries, folder structure, data/event flow, background jobs, caching, logging, validation, error handling, security layers — delivered as Mermaid diagrams. No implementation yet.

**Locked decisions** (resolved before Phase 5 — supersede earlier **(confirm)** flags)

- **Partial approval: not supported in MVP** — a timesheet is approved or rejected as a whole.
- **Payroll is immutable after export** (`OPEN → GENERATED → APPROVED → EXPORTED/LOCKED`); corrections go into the next cycle as adjustments, never by editing exported payroll.
- **KPI templates: current version only** in MVP — definition changes apply going forward; existing records are unchanged (historical versioning deferred).
- **Time zones: store everything in UTC**; each organization has a configured tz (e.g., `Asia/Manila`); the frontend converts for display.
- **Time-entry overlap:** one running timer per user (DB-enforced); overlapping completed entries are warned, not hard-blocked.

**Risks:** see Risks section (scope, tenant leakage, payroll correctness, AI dependency).

**Improvements:** see Improvements section (future expansion backlog).

---

**STOP — Phase 1 complete. Awaiting your approval to proceed to Phase 2 (Architecture Blueprint).**
