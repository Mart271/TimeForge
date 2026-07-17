# TimeForge — Manual QA Script (Live Vercel + Railway)

Walk this top-to-bottom in a **real browser** (Chrome/Edge, normal + one incognito window).
Target: **https://time-forge-pi.vercel.app**

> **✅ UPDATE 2026-07-17 — a live production pass already confirmed the big-ticket items**
> (email delivery, login, register, RBAC sidebars, dept isolation, timer visibility, full EOD
> flow, leave file upload to Supabase). Those rows are pre-marked ✅ below. **Email delivery is
> CONFIRMED WORKING** — §11 is no longer a "known risk". The one real caveat is **cold-start
> latency**: open the site ~2 min before your demo or the first login page can sit blank ~25s.

**Legend:** ⬜ not tested · ✅ pass · ❌ fail (write the symptom) · ➖ N/A
**Tip:** keep DevTools open → **Console** tab (watch for red errors) and **Network** tab (watch for failed/red requests) the whole time.

---

## 0. Pre-flight (2 min)

| Item | How | Expect | Result |
|---|---|---|---|
| Site loads | Open the URL | Login page renders, no spinner-forever | ⬜ |
| API is up | You don't need to test — already verified: `/api/v1/health` = `{"status":"ok","db":"up"}` | — | ✅ (pre-verified) |
| Console clean on login | Open DevTools Console | No red errors | ⬜ |

**Demo accounts — all password `ChangeMe123!`:**

| Email | Role | Dept |
|---|---|---|
| `admin@demo.test` | Admin | — |
| `supervisor@demo.test` | Supervisor | Engineering (head) |
| `supervisor2@demo.test` | Supervisor | Marketing (head) |
| `employee@demo.test` | Employee | Engineering |
| `intern@demo.test` | Intern | Engineering |
| `marketing@demo.test` | Employee | Marketing |
| `hr@demo.test` | HR | Human Resources |
| `finance@demo.test` | Finance | — |
| `pending@demo.test` | pending approval | — |

> ⚠️ Registering a **new** account creates real pending data. Use `pending@demo.test` for approval tests, or delete any test account afterward.

---

## 1. Authentication & Navigation (all quick)

| # | Step | Expect | Result |
|---|---|---|---|
| 1.1 | Login as each role (admin, supervisor, hr, finance, employee, intern) | Lands on the correct dashboard, no error | ⬜ |
| 1.2 | On any page, press **F5 / reload** | Stays logged in (NOT bounced to login) | ⬜ |
| 1.3 | Click the **TimeForge logo** (top-left) | Returns to that role's dashboard | ⬜ |
| 1.4 | Click **Settings** (sidebar bottom) | Opens Settings — does NOT redirect to login | ⬜ |
| 1.5 | Open a notification with a "View" link | Opens the target page — does NOT redirect to login | ⬜ |
| 1.6 | Open **Support** (Help icon / `?modal=support`) | Support modal opens; **Back**/close returns you where you were | ⬜ |
| 1.7 | **Logout**, then paste a deep URL (e.g. `/dashboard`) | Stays on login (session truly cleared) | ⬜ |
| 1.8 | Registration → Step 1 department dropdown | Shows **department names** (Engineering, Marketing…), NOT UUIDs | ⬜ |
| 1.9 | Registration → Step 1 phone field | Rejects bad numbers; accepts `09XXXXXXXXX` / `+639XXXXXXXXX` | ⬜ |
| 1.10 | Registration → Step 2 | Has **Back** button, **Requested Role** = Employee/Intern only, password rejects weak (needs upper+lower+number+special), **no** duplicate Department or Terms | ⬜ |
| 1.11 | Complete registration | Redirects to login with "pending approval" message (no auto-login) | ⬜ |

> Pre-verified via API: department endpoint returns real names, RBAC returns 401 without a token.

---

## 2. Employee (`employee@demo.test`)

| # | Step | Expect | Result |
|---|---|---|---|
| 2.1 | Dashboard loads | Renders, Clock In + Request Leave actions visible | ⬜ |
| 2.2 | **Global timer chip** (top bar) | **Visible** while clocked in (recording dot + elapsed) | ⬜ |
| 2.3 | Go to Daily Scrum, **Clock In** | Timer starts, session shows Active | ⬜ |
| 2.4 | Add a scrum **task** (title, expected output, measurement) | Task saves and appears in the plan | ⬜ |
| 2.5 | Fill **Work Details** (task + description) and Save | Saves; toast confirms | ⬜ |
| 2.6 | **End of Day Review** button | Becomes **enabled** once plan + work details exist (was the bug — now fixed) | ⬜ |
| 2.7 | Open EOD modal | Shows **Today's Commitments = your actual tasks** (not "No scrum entry") | ⬜ |
| 2.8 | Fill accomplishments, check the accuracy box, **Submit** | Succeeds; session closes; "timed out" banner; timer idle | ⬜ |
| 2.9 | After EOD | Timer chip gone; cannot re-clock-in until tomorrow (by design) | ⬜ |
| 2.10 | Timesheets → submit a timesheet | Submits; status becomes Submitted | ⬜ |
| 2.11 | Leave → submit a request **with a file attachment** | Uploads on Vercel, request appears in list, file downloadable | ⬜ |
| 2.12 | PDF export (timesheet/report) | Downloads a valid PDF | ⬜ |
| 2.13 | Profile | Loads; avatar + details show; can open edit | ⬜ |

---

## 3. Intern (`intern@demo.test`)

| # | Step | Expect | Result |
|---|---|---|---|
| 3.1 | Same core flow as Employee (2.1–2.9) | Works identically | ⬜ |
| 3.2 | Intern labeling | Where role/employment is shown, reads **Intern** (not "Employee") | ⬜ |
| 3.3 | Global timer chip | **Visible** (interns are time-tracking) | ⬜ |

---

## 4. Supervisor (`supervisor@demo.test` = Engineering)

| # | Step | Expect | Result |
|---|---|---|---|
| 4.1 | Dashboard loads | Team-scoped metrics, no cross-department data | ⬜ |
| 4.2 | Daily Scrum / **Team Scrum Submissions** loads | Shows submissions | ⬜ |
| 4.3 | **Department isolation** | Only **Engineering** people appear (Eli, Ivy, etc.) — **no Marketing (Marco)** | ⬜ |
| 4.4 | A **locked** commitment shows an **Unlock Commitment** button + "Locked" badge | Visible | ⬜ |
| 4.5 | Click Unlock → modal | **Unlock button disabled until reason ≥ 5 chars** | ⬜ |
| 4.6 | Enter reason, Unlock | Success toast; badge/button disappear; employee gets a notification | ⬜ |
| 4.7 | **Global timer chip** | **Hidden** (even though supervisor may have a session) | ⬜ |
| 4.8 | No Employee work-session UI (Clock In card) on their pages | Correct | ⬜ |
| 4.9 | Timesheet approval queue | Shows only Engineering timesheets; can approve/reject/request-revision | ⬜ |
| 4.10 | Leave approvals | Only Engineering requests visible | ⬜ |
| 4.11 | **Cross-dept probe** — log in as `supervisor2@demo.test` (Marketing) and confirm they see **only Marketing**, not Engineering | Isolation holds both ways | ⬜ |

> Pre-verified via API (8/8): cross-department unlock → **403**; Marketing supervisor can't touch Engineering and vice-versa; admin org-wide → 200.

---

## 5. HR (`hr@demo.test`)

| # | Step | Expect | Result |
|---|---|---|---|
| 5.1 | Dashboard loads | Renders | ⬜ |
| 5.2 | **Sidebar** | Has Dashboard, Timesheets, Leave Management, Payroll Processing, AI Insights, Attendance Reports — **NO Employees, NO Departments, NO System/AI-Settings** | ⬜ |
| 5.3 | Payroll Processing | Loads and works | ⬜ |
| 5.4 | Attendance validation | Can review hours/attendance | ⬜ |
| 5.5 | **Global timer chip** | **Hidden** | ⬜ |

> Pre-verified via API: HR sidebar now excludes Employees/Departments/SYSTEM.

---

## 6. Finance (`finance@demo.test`)

| # | Step | Expect | Result |
|---|---|---|---|
| 6.1 | Dashboard loads | Renders | ⬜ |
| 6.2 | **Sidebar contains ONLY:** Dashboard, Payroll Processing, Financial Reports, AI Insights | Exactly those 4 | ⬜ |
| 6.3 | Payroll Processing | Loads; amounts in **₱ (PHP)**, never `$` | ⬜ |
| 6.4 | Financial Reports | Loads | ⬜ |
| 6.5 | AI Insights | Loads / generates | ⬜ |
| 6.6 | **Global timer chip** | **Hidden** | ⬜ |

---

## 7. Admin (`admin@demo.test`)

| # | Step | Expect | Result |
|---|---|---|---|
| 7.1 | Dashboard (System Overview) loads | Real stats, no `undefined%` | ⬜ |
| 7.2 | Daily Scrum area | Shows **Management** view (not the personal employee scrum page) | ⬜ |
| 7.3 | **Employees** tab | Each employee row shows its **department name** (not "—" / not UUID) | ⬜ |
| 7.4 | **Invite Employee** | Sends invite; **check whether the invite email actually arrives** (see §11) | ⬜ |
| 7.5 | **Approvals** | Approve `pending@demo.test`: can set Department, Employment Type, Final Role; department shows **names** not UUIDs | ⬜ |
| 7.6 | Assign a Supervisor via approval/edit | Member's supervisor syncs to the department head | ⬜ |
| 7.7 | **Departments** — create one | UI updates immediately (new dept appears without full reload) | ⬜ |
| 7.8 | Edit Department | Shows the **department head's name**, not a UUID | ⬜ |
| 7.9 | AI Insights / AI Settings (`/admin/ai-config`) | Loads (per-feature toggles) | ⬜ |
| 7.10 | **Global timer chip** | **Hidden** | ⬜ |

> Pre-verified via API: `/users` now returns `department.name`; secret token fields (passwordResetToken, etc.) are **no longer leaked** in responses.

---

## 8. Daily Scrum lifecycle (deep)

| # | Step | Expect | Result |
|---|---|---|---|
| 8.1 | Save Daily Scrum | Persists after reload | ⬜ |
| 8.2 | Complete all tasks | Entry shows **Locked** state | ⬜ |
| 8.3 | EOD after requirements met | Enables + submits (see §2.6–2.8) | ⬜ |
| 8.4 | Supervisor unlocks it (§4.6) → re-check as employee | Employee can edit again; sees unlock notification with the reason | ⬜ |
| 8.5 | Midnight auto-close | If a session is left open past midnight, it auto-stops (hard to test on demand — note if you can) | ⬜ |
| 8.6 | Daily Scrum History | Accessible, shows past entries | ⬜ |

---

## 9. Timesheets

| # | Step | Expect | Result |
|---|---|---|---|
| 9.1 | Employee submits timesheet | Appears in supervisor's approval queue (same department) | ⬜ |
| 9.2 | Supervisor rejects with a remark | Timesheet unlocks; remark visible to employee | ⬜ |
| 9.3 | Employee edits + resubmits | Works | ⬜ |
| 9.4 | PDF download | Valid PDF | ⬜ |

---

## 10. Team Schedule

| # | Step | Expect | Result |
|---|---|---|---|
| 10.1 | Add Shift | Saves without a false "overlap" error | ⬜ |
| 10.2 | Save Draft, close, reopen | Draft persisted | ⬜ |
| 10.3 | Department dropdown | Shows department **names** (not UUIDs) | ⬜ |

---

## 11. Email delivery — ✅ CONFIRMED WORKING (2026-07-17)

**Email delivery is verified working on production** — a password-reset email was received in a
real inbox (full path: API → mailer → Supabase edge fn → SMTP → inbox). No longer a known risk.

> **Gotcha when re-testing:** Forgot Password returns `202 {"status":"ok"}` **whether or not the
> address is a registered account** (anti-enumeration). It only *sends* for a **registered
> ACTIVE/INVITED** account. So "no email" for a random address is EXPECTED, not a failure — always
> test with an address that has a real account.

| # | Step | Expect | Result |
|---|---|---|---|
| 11.1 | Register a new account (real inbox) | Verification email arrives | ⬜ (retest if desired) |
| 11.2 | Forgot Password → **registered** email | Reset email arrives with a working link | ✅ verified 2026-07-17 |
| 11.3 | Complete a password reset via that link | Succeeds; can log in with new password | ⬜ (retest if desired) |
| 11.4 | Admin → Invite Employee | Invite email arrives | ⬜ |
| 11.5 | Approve a pending account | Approval email arrives | ⬜ |

**If a NEW email failure ever appears** (it isn't now), the mechanics + fix are in
`docs/HANDOFF-CONTEXT-2026-07-14.md` §4 (Railway `Mailer strategy: ...` log line, edge-fn curl
test, `supabase secrets set`). Do not chase this proactively — email is currently healthy.

---

## 12. Security spot-checks

| # | Step | Expect | Result |
|---|---|---|---|
| 12.1 | As Employee, paste an admin URL (`/admin/employees`) | Redirected to own dashboard (not shown admin content) | ⬜ |
| 12.2 | As Supervisor, try another dept's record via direct URL/API | **403 Forbidden** | ⬜ |
| 12.3 | In DevTools Network, inspect a `/users` response | No `passwordResetToken` / `passwordHash` fields present | ⬜ |
| 12.4 | Log out → hit protected API without token | 401 | ⬜ |

---

## 13. Cross-cutting (do throughout)

| # | Check | Result |
|---|---|---|
| 13.1 | Zero red **Console** errors across all pages visited | ⬜ |
| 13.2 | Zero failed (red) **Network** requests (ignore expected 401/403 probes) | ⬜ |
| 13.3 | No unexpected redirects to login while navigating | ⬜ |
| 13.4 | Reload works on every page | ⬜ |
| 13.5 | **Mobile**: DevTools device toolbar (or phone) — layouts render, sidebar collapses to a menu | ⬜ |
| 13.6 | Currency is **₱** everywhere, never `$` | ⬜ |

---

## Already verified for you — ✅ CONFIRMED LIVE ON PRODUCTION (2026-07-17)

Verified against `https://time-forge-pi.vercel.app` via the real Chrome/Brave connector + prod API:

- ✅ **Email delivery works** — password-reset email received in a real inbox
- ✅ Login (employee/finance/supervisor), Register (dept dropdown = real names, no UUIDs)
- ✅ HR sidebar excludes Employees/Departments/System; Finance sidebar = exactly the 4 items
- ✅ Supervisor Team Scrum = department-isolated (Engineering-only); Finance→/time-tracking redirected
- ✅ Settings card layout, RBAC-correct (4 cards for employee)
- ✅ Timer chip shows for clocked-in employee, hidden for other roles
- ✅ **Full EOD flow**: enables after plan+details → submit → session closes ("timed out" banner)
- ✅ EOD modal shows the real task commitment (not empty state)
- ✅ Mandatory unlock reason enforced (422 short/missing; 404 valid-reason+fake-id)
- ✅ **Leave submit + overlap validation + file upload to Supabase storage** (`attachments: 1`)
- ✅ API health (`db: up`), CORS + credentialed requests, `/users` has `department.name` + no leaked secret tokens

## The ONE real thing to watch (not a bug)

1. **Cold-start latency** — first load when the stack is cold is slow (login form ~25s blank,
   departments ~2s). Railway hobby sleep + Vercel cold functions. **Warm the site ~2 min before
   your demo.** Optionally keep Railway warm (paid tier or an uptime pinger).

## Still un-driven (low risk; retest if time permits)

- Timesheet submit→reject→resubmit + PDF (§9), Team Schedule shifts (§10)
- Supervisor unlock happy-path click-through of an actual locked entry (RBAC + mandatory reason ARE confirmed)
- Midnight auto-close (8.5), mobile layout (13.5), notification "view details" links (#29)
