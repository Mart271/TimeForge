# Admin / HR / Finance — Live Production QA + Finance AI Insights Freeze Fix (2026-07-17)

**Environment:** `https://time-forge-pi.vercel.app` (Vercel) + Railway API + Supabase, driven
through the real Chrome/Brave connector (hydrates React properly; JS-driven DOM checks reliable,
screenshots occasionally time out).

---

## 1. Admin — verified live (as `admin@demo.test`)

| Page | Result |
|---|---|
| Dashboard (System Overview) | ✅ loads with real stats |
| **Approvals** | ✅ loads; **4 pending accounts** listed (`pending@demo.test`, `marktagab0@gmail.com`, `marktagab08@gmail.com`, `jocelynprado35@gmail.com`) with Approve buttons + modal surface. **Did NOT finalize an approval** — it mutates a production account; the guardrail correctly blocked the click. Modal (dept/role/employment selectors) was verified on localhost in phase 3. |
| **Employee Management** | ✅ **149 rows**, department names shown (Engineering/Marketing/HR — **no UUIDs**, confirming the dept-name fix live), **Invite Employee** button present |
| **Department Management** | ✅ 8 departments by name, "Add Department" present |
| **AI Config** | ✅ 8 per-feature toggles; **Provider: OPENAI, live connection (qwen/qwen3)** — AI subsystem is connected |

## 2. HR — verified live (as `hr@demo.test`)

| Page | Result |
|---|---|
| Sidebar | ✅ correct — no Employees/Departments/System (the HR-sidebar fix) |
| **Payroll Processing** | ✅ payroll-period selector, **Export PDF/Excel/CSV + "Send to Finance"**, currency **₱ (no `$`)** |
| **Attendance Reports** | ✅ filters (Employee/Department/Period), 10 data rows, Export |

## 3. Finance — verified live (as `finance@demo.test`)

| Page | Result |
|---|---|
| Dashboard | ✅ loads; **sidebar = exactly** Dashboard, Payroll Processing, Financial Reports, AI Insights; ₱ currency |
| **Financial Reports** | ✅ analytics tabs (Dashboard/Attendance/History), **34 chart elements render**, Attendance Export, no errors |
| **AI Insights** | ⚠️ **Page froze the renderer ~90s+ on cold load** — see §4. AI subsystem itself is fine (`/ai/jobs` → 200; OPENAI live per Admin AI Config). |

## 4. Finance AI Insights freeze — root cause + fix

**File:** `apps/web/features/finance-ai/components/FinanceAiInsightsContent.tsx`

### Symptom
Navigating to `/finance/ai-insights` on a cold stack froze the browser renderer for ~90s+
(CDP `Runtime.evaluate` timed out repeatedly). Other heavy admin pages loaded slowly (10–20s) but
recovered; this one did not, until navigated away.

### Root cause (verified in code)
The page mounts **five heavy AI-analytics queries at once** — `getAiDashboard`, `getAiAlerts`,
`getAiForecast`, `getAiBudget`, `getAiLiability` — each an expensive backend aggregation. They had:
- **No `staleTime`** → every remount / focus refetched all five.
- **Aggressive `refetchInterval`** — `alerts` every **30 s**, dashboard/liability 60 s, forecast/budget 120 s.

On a **cold Railway instance** (hobby tier sleeps) the five calls pile up, then resolve near-
simultaneously and re-render **6 recharts charts + a budget table + 6 recommendation cards at once**.
The 30–60 s polling then keeps re-firing the heavy queries and re-rendering the whole tree. That
**sustained main-thread load** (repeated recharts `ResponsiveContainer` mounts + full-tree re-renders
against a slow cold backend) is what pegged the renderer — not an infinite loop.

There was also a latent **operator-precedence bug** on the Validation stage row:
`processingHealth ?? 0 >= 80` parses as `processingHealth ?? (0 >= 80)`, so any non-null value
rendered "completed" regardless of the 80 threshold.

### Fix applied (this pass)
Same pattern the team already used on Finance Reports (`docs/BUG-FIX-PLAN.md` Fix I):
- Added **`staleTime: 5 min`** to all five queries → stops refetch-on-remount storms.
- Relaxed **`refetchInterval` to 5 min** for all five (was 30 s–120 s) and set
  **`refetchIntervalInBackground: false`** → no heavy polling while the tab is unfocused.
- Fixed the precedence bug → `(processingHealth ?? 0) >= 80`.

Result: far less sustained load; the page no longer re-renders 6 charts every 30–60 s against a
cold backend. `tsc` clean.

### What the fix does NOT fully solve (recommended follow-ups)
- The **first** cold load still fires all five queries + renders all charts once. To eliminate the
  initial stall:
  1. **Warm Railway** (paid tier or an uptime pinger) — biggest single win; the cold-start is the
     real amplifier. Also fixes the ~25 s cold login page.
  2. **Lazy-load / defer below-the-fold charts** (forecast/budget/cash-flow) until scrolled into view.
  3. **Cache the AI-aggregation endpoints** server-side (short TTL) so the five calls are cheap.
  4. Consider consolidating the 5 endpoints into 1 combined `dashboard` payload.
- These are optional hardening, not required for the demo once the site is warmed.

---

## 5. Production readiness: ~92%

**Verified working live:** auth (incl. password-reset email delivery), RBAC/sidebars/dept isolation,
security, employee + supervisor core flows (EOD, leave + file upload, timer), Settings, and now the
**Admin/HR/Finance functional surfaces**.

**Remaining (unverified / not-a-bug):**
- Actual prod **mutations** not executed (approve/invite/create-dept) — surfaces verified, writes avoided to protect prod data.
- Timesheet submit→reject→resubmit + PDF, Team Schedule, midnight auto-close, mobile layout — not driven.
- **Cold-start latency** (operational, not a defect) — **warm the site ~2 min before the demo**; do NOT open Finance AI Insights cold in front of the panel.
- Minor UI: #20 (redundant header buttons), #21 (avatar), #22 (edit-dept head name), #29 (notification links).

---

## 6. Files changed this pass
- `apps/web/features/finance-ai/components/FinanceAiInsightsContent.tsx` — `staleTime` + relaxed polling on the 5 heavy queries; precedence-bug fix on the Validation stage.

## 7. Demo-day checklist (operational)
1. **Warm the site** ~2 min before presenting (open login + one authed page per role).
2. Avoid opening **Finance AI Insights** as the very first cold action.
3. Demo accounts (all `ChangeMe123!`): `admin@`, `supervisor@`, `supervisor2@`, `employee@`, `intern@`, `marketing@`, `hr@`, `finance@`, `pending@` `@demo.test`.
4. Test data left on prod: `employee@demo.test` has an extra leave request (Sep 15–16, Annual, PENDING, with a test PDF) + a scrum/EOD from the flow test — delete for a clean slate if desired.
