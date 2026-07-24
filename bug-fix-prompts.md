# TimeForge Bug Fix Prompts — Chunked

Source: `TimeForge (1).docx` — 14 defects (untitled/unnumbered in source; numbered here as BUG-A through BUG-N in document order for tracking).

**How to use this:** Run one at a time, in a fresh session or clearly separated turn, in the suggested order below. Never batch multiple prompts into one request — that's what causes fixing one bug to silently break another. Each prompt has a hard scope boundary, a "do not touch" list, and its own verification checklist.

---

## Shared rules (paste once per session, or keep in CLAUDE.md — already partially covered by the repo's Bug-fix workflow section)

```
Before making any change:
1. State which files you intend to touch and why. Do not touch any file
   outside that list without asking first.
2. Read the existing code path fully before editing — don't guess at
   function signatures or DB schema.
3. Make the smallest change that fixes the described bug. Do not refactor,
   rename, or "clean up" unrelated code in the same file.
4. After the change, run any existing relevant tests (`npm run test` for
   the affected app) and confirm they pass. If no test covers this path,
   note that explicitly rather than skipping verification.
5. Summarize exactly what changed (files + diff summary) and explicitly
   call out any other feature/module that could be affected, so it can
   be spot-checked.
6. If the fix requires a schema change, generate a Prisma migration —
   don't hand-edit the DB.
```

---

## BUG-A — Timesheet rows don't link to Timesheet Entry Audit

**Where:** Employee Timesheets (daily summary table)

```
Fix: Timesheet table rows (Date, Time In, Time Out, Work Hours, Break
Time, Total) are static — clicking a row does nothing. There's no way
to reach the Timesheet Entry Audit for that day's detailed tasks and
deliverables.

Expected: each row is clickable and routes to that day's Timesheet
Entry Audit. Additionally, when a supervisor requests a revision, the
employee should be able to edit work details (project/task, description,
deliverables) inside the audit, while Start/End time and Duration stay
permanently locked.

Scope: frontend row click handler + routing to the audit view, and
conditional field-locking in the audit form based on timesheet status.

Note: this overlaps with the "Revision Requested" edit-unlock behavior
that may already exist elsewhere in the codebase (check
time-tracking module first) — if an edit-unlock mechanism already
exists, wire the new row-click route into it rather than building a
second one.

Do not touch: timesheet approval/rejection logic, payroll sync.

Verify: (a) clicking any row opens the correct day's audit, (b) audit
still opens correctly when reached via any other existing entry point,
(c) Start/End/Duration remain read-only in the audit regardless of
status, (d) edit only becomes available when status is "Revision
Requested".
```

---

## BUG-B — Role doesn't update to Supervisor on department assignment

**Where:** Department Directory (Assign Supervisor modal), User Profile Dropdown

```
Fix: Assigning a user as a department's supervisor via the Assign
Supervisor modal does not change their system role — their profile
badge still shows "Employee" and they can't access supervisor pages.

Expected: assigning a user as department supervisor elevates their
system role/permissions to Supervisor (or appends it as a secondary
role), the profile badge updates immediately, and supervisor routes
become accessible.

Scope: the Assign Supervisor mutation (backend — likely in
organization.service.ts or wherever department assignment lives),
whatever sets/reads the user's role for RBAC, and the frontend badge/
nav-guard that reads role.

Do not touch: other RBAC checks unrelated to this assignment flow, or
how existing supervisors already assigned were set (don't run a bulk
backfill unless asked).

Verify: (a) assigning a fresh employee as supervisor updates their role
immediately without re-login, (b) they can now access supervisor
dashboard/routes, (c) removing them as supervisor (if that flow exists)
is checked too — does the role correctly revert, or is that out of
scope? State which you handled, (d) existing employee-role users
unaffected.
```

---

## BUG-C — Supervisors missing from Admin Employee Directory and filters

**Where:** Admin → Employee Directory ("All Users" tab)

```
Fix: The "All Users" table only returns EMPLOYEE and ADMIN roles —
Supervisors are excluded entirely, and the Role filter dropdown doesn't
even list "Supervisor" as an option.

Expected: "All Users" returns every active account regardless of role,
including Supervisor, and the Role filter dropdown includes
"Supervisor" as a selectable value.

Scope: the backend query/endpoint powering the Employee Directory list
(check for a hardcoded role filter — likely an `in: [...]` list missing
SUPERVISOR), and the frontend dropdown's option source (likely also
hardcoded rather than derived from the role enum).

Do not touch: role-based page access/RBAC guards elsewhere — this bug
is specifically about the directory list query being incomplete, not
about permissions.

Verify: (a) directory now shows supervisors alongside employees/admins,
(b) filtering by "Supervisor" returns only supervisors, (c) filtering by
"Employee" or "Admin" still returns the same results as before (no
regression from the query change), (d) pagination/counts on the
directory page are still correct with the larger result set.
```

---

## BUG-D — Duplicate user records allowed with same email

**Where:** Admin → Employees (Employee Directory)

```
Fix: Two separate user rows exist with the identical email address
(shangealone17@gmail.com) — the system isn't enforcing email
uniqueness.

Expected: email addresses are enforced unique at the database level.
Same first/last name is fine; same email is not. Directory shows one
row per email.

Scope: (1) add a unique constraint/index on the email column via a
Prisma migration, (2) registration/invitation validation to reject a
duplicate email with a clear error before hitting the DB constraint,
(3) — separately — decide what to do with the EXISTING duplicate
records found in QA: do not silently delete/merge user data. Flag the
specific duplicate pair to the user/admin for manual review before any
merge, since merging could affect linked timesheets/payroll history.

Do not touch: any other uniqueness assumptions (e.g. username) unless
also broken — stay scoped to email.

Verify: (a) migration applies cleanly against current data — if it
fails because the existing duplicate rows violate the new unique
constraint, STOP and report that back rather than force-deleting rows,
(b) attempting to create/invite a user with an already-used email is
rejected with a clear message, (c) case sensitivity — confirm whether
"User@x.com" and "user@x.com" should collide (likely yes) and handle
accordingly.
```

---

## BUG-E — Admin/HR/Finance profile modal shows irrelevant employee fields

**Where:** Employee Profile modal, viewing Admin/HR/Finance accounts

```
Fix: The profile modal uses one generic template for every role, so
viewing an Admin's profile still shows "Department," "Supervisor," and
"Hourly Rate (PHP)" fields that don't apply to that role.

Expected: the modal renders fields conditionally based on the viewed
user's role. Admin/HR/Finance should not see Department/Supervisor/
Hourly Rate unless those roles are later given role-appropriate fields
of their own (out of scope here — just hide what doesn't apply for now
unless told otherwise).

Scope: frontend conditional rendering in the profile modal component
only, driven by the viewed user's role field (already available via
RBAC data).

Do not touch: the underlying user data model — Admin/HR/Finance
accounts may still legitimately have null Department/Supervisor/Rate
values in the DB; this is purely a display fix.

Verify: (a) viewing an Employee profile still shows all fields exactly
as before, (b) viewing Admin/HR/Finance hides the 3 listed fields, (c)
no layout breakage (empty gaps, broken grid) when fields are hidden —
check the modal renders cleanly for each role.
```

---

## BUG-F — "Department Head" should read "Department Supervisor"

**Where:** Admin → Departments (Edit Department modal)

```
Fix: copy-only. The Edit Department modal labels the leader-assignment
dropdown "Department Head (optional)" and its subtitle says "...reassign
its manager." — inconsistent with the rest of the platform's
"Supervisor" terminology.

Expected: label changes to "Department Supervisor" (keep "(optional)"
if that reflects actual behavior — confirm the field is genuinely
optional before keeping that qualifier), and the subtitle changes to
"...reassign its supervisor."

Scope: text-only changes in the Edit Department modal component. No
logic, no props, no data changes.

Do not touch: any other modal/screen — do a repo-wide check for other
"Department Head" or "manager" strings referring to this same concept
and list them, but only change this one modal unless asked to fix all
occurrences in this same pass (recommend doing a follow-up terminology
pass separately rather than scope-creeping this fix).

Verify: modal renders the new copy correctly, no truncation/overflow
from the longer string "Department Supervisor" vs "Department Head".
```

---

## BUG-G — Active Payruns table lacks unique identifiers

**Where:** Admin → Finance & Reports → Payroll (Active Payruns table)

```
Fix: rows are hard to distinguish when multiple departments share the
same pay period — only Pay Period, Department/Entity, Gross Total,
Status, and Actions are shown.

Expected: add a Payrun ID/Batch Number column and an Employee Count
column (e.g. "12 Employees").

Scope: backend — expose a batch identifier (create one if the payrun
generation process doesn't already assign one) and an employee count
in the payrun list API response. Frontend — add the two columns to the
table.

Do not touch: payroll calculation logic, approval workflow, or how
individual payrun batches are generated — this is additive
(new identifying columns), not a change to what a payrun contains.

Verify: (a) every existing payrun row displays a stable, unique batch
ID (not regenerated on every page load), (b) employee count matches
the actual number of employees included in that batch, (c) sorting/
filtering the table (if it exists) still works with the new columns.
```

---

## BUG-H — HR role lacks access to Attendance Reports

**Where:** Navigation Sidebar (Finance & Reports section) / Role Access

```
Fix: Attendance Reports is visible to Admin but not accessible to HR —
either missing from HR's sidebar or blocked by a permissions check.

Expected: HR role gets view + export access to Attendance Reports
(Days Logged, Absences, Tardiness, Attendance %).

Scope: RBAC permission grant for HR on this specific module
(packages/shared/src/permissions.ts and wherever the permission is
checked — @RequirePermissions guard on the backend route, and the
sidebar nav catalog in navigation.service.ts that decides visibility).

Do not touch: HR's access to any other module — grant only this one
permission, don't broaden HR's role generally.

Verify: (a) HR user now sees Attendance Reports in the sidebar, (b) HR
can open it and see data (not just see the nav item), (c) HR can export
if export exists for Admin, (d) no other role's Attendance Reports
access changed, (e) an HR user still cannot access modules they
shouldn't (spot check one other Admin-only module to confirm you didn't
accidentally widen HR's permission set).
```

---

## BUG-I — Redundant "Productivity Report" button in Admin Reports header

**Where:** Finance & Reports → Reports (Administrative Reports page header)

```
Fix: "Productivity Report" exists as both a header toggle button on the
Admin Reports page AND a separate item in the main sidebar — redundant.

Expected: pick one. Default to removing the header button since
Productivity Report already has its own sidebar entry (unless the user
tells you sidebar and header are meant to serve different purposes —
ask if unclear rather than assuming).

Scope: frontend only — remove the redundant header toggle button
component/route reference. Do not remove the sidebar item.

Do not touch: the Productivity Report page/data itself, or the "Admin
Reports" toggle that presumably stays.

Verify: (a) sidebar Productivity Report still works and is unaffected,
(b) Admin Reports header no longer shows the duplicate button, (c) no
dead route or broken link left behind from the removed button.
```

---

## BUG-J — Missing icon for "Security Logs" in sidebar

**Where:** Main Navigation Sidebar (System section)

```
Fix: "Security Logs" has no icon while "System Logs," "AI Settings,"
and "KPI Management" all have matching outline-style icons — visual
inconsistency/misalignment.

Expected: add a matching outline icon (shield or lock suggested) for
Security Logs.

Scope: frontend only — the sidebar nav icon mapping (navigation.service.ts
or wherever icon-per-nav-item is defined) and the icon set already in
use (match the existing icon library/style, don't introduce a new icon
package for one icon).

Do not touch: any other nav item's icon or ordering.

Verify: icon renders at the same size/alignment as sibling items in the
System section, no layout shift to other items.
```

---

## BUG-K — Employee can't edit "Planned Target" for selected KPI

**Where:** Employee Daily Scrum / Plan Commitment Task form

```
Fix: selecting a KPI Indicator auto-populates Planned Target (e.g. "12")
but the field is locked — it's showing the Admin's master/total target,
not letting the employee set their own daily commitment.

Expected: three distinct values need to exist and be tracked
separately:
  1. Admin's master Total Target (already exists, set in KPI Management)
  2. Employee's Planned Target for today — must be an EDITABLE input,
     pre-filled as a suggestion but changeable
  3. Employee's Actual Completed value at End of Day — a separate input
     that doesn't currently exist and needs to be added

Scope: (1) remove readonly/disabled from the Planned Target input,
(2) backend/schema change to store planned-target-per-day as its own
field distinct from the KPI's master target (check if this field
already exists as read-only-derived vs needs a new column — migration
likely required), (3) add the EOD "Actual Completed" input and its
storage field.

This is related to, but distinct from, the general KPI Metric ↔ Daily
Scrum integration work — if that integration is already built or in
progress elsewhere, confirm this fix aligns with that data model rather
than creating a second, conflicting way of storing KPI target data.

Do not touch: the Admin KPI Management master target definition itself
— that value should remain the ceiling/reference, not be edited from
here.

Verify: (a) employee can now type a custom planned target different
from the master target, (b) an EOD actual-completed input exists and
saves, (c) achievement % (if calculated anywhere) now compares actual
vs PLANNED target, not master target — confirm which comparison is
correct with the user if ambiguous, (d) existing scrum entries without
a planned-target value don't break when rendered.
```

---

## BUG-L — No way to view all KPI Performance Scorecards

**Where:** KPI Performance Scorecard section

```
Fix: only a single scorecard for one role is shown, with no dropdown,
pagination, or "View All" to browse other roles/employees/departments.

Expected: add a way to browse all active scorecards — a filter dropdown
to switch between roles/employees, or a dedicated aggregated list/
dashboard view.

Scope: backend — an endpoint returning an aggregated list of scorecards
scoped to the requesting user's access level (Admin sees all, Supervisor
sees their department, etc. — confirm the correct scoping rule against
existing RBAC patterns in the codebase rather than inventing one).
Frontend — add the selector/list UI.

Do not touch: how an individual scorecard is calculated/rendered — this
is about discovery/navigation between existing scorecards, not the
scorecard content itself.

Verify: (a) an Admin can browse all scorecards, (b) a Supervisor only
sees scorecards within their scoping rule (not everyone's), (c) the
originally-working single-scorecard view still works when accessed
directly.
```

---

## BUG-M — Supervisor incorrectly listed among their own team's underperforming members

**Where:** Management Workspace → KPI Dashboard → Identify Underperforming Members

```
Fix: the supervisor's own account shows up in the list of underperforming
team members for their own department, mislabeled with role "Employee".

Expected: the query backing this table should exclude the department's
supervisor entirely — this view is for management oversight of direct
reports, not the supervisor themselves.

Scope: backend query filtering this specific table — exclude the
logged-in supervisor's user ID (or filter out SUPERVISOR role) from the
underperforming-members query.

Do not touch: role badges elsewhere in the system, or other KPI
dashboard tables/widgets — confirm this exclusion is needed only in
this specific "Identify Underperforming Members" query, not applied
globally to every team-member list (some other view may legitimately
want to include the supervisor).

Verify: (a) the supervisor no longer appears in their own
underperforming-members list, (b) all their actual direct reports still
appear correctly, (c) check one other team-member-listing view (if any
exists) to confirm you didn't accidentally apply this exclusion there
too when it wasn't asked for.
```

---

## BUG-N — No way for an employee to signal return from active leave

**Where:** Leave Management / Employee Dashboard

```
Fix: once an employee's leave is active, there's no button/flow for them
to end it early or confirm return — status stays stuck, and the
supervisor's "Active Leave" counter never decrements from the employee
side.

Expected: employee on active leave gets a "Return to Work" / "End Leave"
action. On click:
  1. their availability status updates to Active/Working
  2. supervisor's "Active Leave" counter decrements
  3. a notification fires to supervisor + HR confirming the return

Scope: frontend — a state-dependent action button shown only while
status is "Active Leave". Backend — the state transition (leave record
update, user availability status update) and hooking into the existing
notification system (repo already has an AuditLog+Notification pattern
for mutating actions on payroll/HR/AI — follow that same pattern here
rather than building a new notification path).

Do not touch: leave request/approval creation flow (the "start leave"
side) — this is only about ending an already-active leave.

Verify: (a) clicking Return to Work updates the employee's own status
immediately, (b) the supervisor's dashboard counter reflects the change
without needing a manual refresh (or on next load if realtime isn't in
scope — confirm which), (c) supervisor and HR both receive the
notification, (d) an employee NOT currently on leave never sees this
button.
```

---

## Suggested order

Group by risk and independence — do standalone/low-risk items first, save anything touching KPI data model or RBAC role assignment for its own isolated session:

1. BUG-F (copy only — trivial warm-up)
2. BUG-J (icon only — trivial)
3. BUG-I (remove redundant button — frontend only)
4. BUG-E (profile modal conditional rendering — frontend only)
5. BUG-G (payrun table columns — additive, low risk)
6. BUG-C (directory query missing supervisor role)
7. BUG-H (HR permission grant — isolated RBAC change)
8. BUG-D (email uniqueness — **check for existing duplicate data before running the migration**)
9. BUG-A (timesheet row → audit link + edit-lock)
10. BUG-M (exclude supervisor from underperforming list)
11. BUG-N (return-from-leave flow)
12. BUG-B (role escalation on supervisor assignment — RBAC, do alone)
13. BUG-L (scorecard aggregation view — new endpoint + scoping rules)
14. BUG-K (Planned Target editable + Actual Completed — largest, touches KPI data model; if BUG-007 from the prior QA round's "KPI integration" work is being done in the same project, sequence this AFTER that so they don't define conflicting KPI-tracking fields)
