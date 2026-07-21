# AI Features — Improvement Plan

**Status:** Planning only — no implementation yet. We're focused on debugging/stability first.
**Last updated:** 2026-07-21

This is a survey of what AI already exists per role, the gaps, and prioritized ideas to close them. Grounded in the actual code (`prisma/schema.prisma` `AiFeature` enum, `apps/worker/src/ai/feature-handlers.ts`, `apps/web/features/*/components/`), not guesses.

---

## What exists today

The `AiFeature` enum has 14 values. Every job goes through the same pipeline: `POST /ai/jobs` (api) → BullMQ → worker builds a prompt via a feature handler → calls the model → `AiResult` stored → frontend polls (`runAndPollAiJob`, now a 120s window).

| Feature | Handler exists | Admin-toggleable | Frontend surface | Notes |
|---|---|---|---|---|
| `DAILY_SUMMARY` | ✅ | ✅ | **none — confirmed dead** | not enqueued anywhere in api or worker source, only appears in a Swagger enum |
| `WEEKLY_SUMMARY` | ✅ | ✅ | **none — confirmed dead** | same |
| `TIMESHEET_SUMMARY` | ✅ | ✅ | **none — confirmed dead** | same |
| `BLOCKER_DETECTION` | ✅ | ✅ | **none — confirmed dead** | a separate rule-based detector (`recurring-issue-detection.processor.ts`) exists alongside it but doesn't call this AI feature |
| `PRODUCTIVITY_INSIGHT` | ✅ | ✅ | Supervisor AI Insights (via `supervisor-ai.service.ts` aggregation) | feeds the team score, not a standalone card |
| `SUPERVISOR_ADVISORY` | ✅ | ✅ | Supervisor AI Insights | same aggregation path |
| `KPI_ANALYSIS` | ✅ (team-wide, per-template, 20 most recent progress rows) | ✅ | **none** | **dead feature — fully built, never called from any button** |
| `PAYROLL_VALIDATION` | ✅ | ✅ | HR AI Insights (Timesheet Status "AI Flag" / "Validation" columns) | real `AiJob`/`AiResult` data, not fake |
| `STANDUP_DRAFT` | ✅ | ❌ not in admin toggle list | Daily Scrum — AI Standup Composer | |
| `BLOCKER_ADVISORY` | ✅ | ❌ | not confirmed wired to a button yet | |
| `KPI_COPILOT` | ✅ (last 5 raw progress rows, no trend math) | ❌ | Employee Dashboard — "Get AI Advice" | one-shot, no history awareness |
| `INTERN_ADVISORY` | ✅ | ❌ | Employee Dashboard (intern role) — `AiInternAdvisoryCard` | |
| `IMPROVE_DESCRIPTION` | ✅ (+ new `task-plan` mode) | ❌ | "Improve with AI" (task input), "Suggest Output & Criteria with AI" (Plan New Task) | |
| `FINANCE_REPORT` | ✅ | ❌ | Finance AI Insights — `AiReportModal` | |

**Two structural gaps that cut across every role:**
1. **6 of 14 features aren't in the Admin AI Config toggle list** (`STANDUP_DRAFT`, `BLOCKER_ADVISORY`, `KPI_COPILOT`, `INTERN_ADVISORY`, `IMPROVE_DESCRIPTION`, `FINANCE_REPORT`). Admin can't turn these off org-wide even though the toggle screen implies full control.
2. **5 of 14 features are confirmed dead** — `KPI_ANALYSIS`, `DAILY_SUMMARY`, `WEEKLY_SUMMARY`, `TIMESHEET_SUMMARY`, `BLOCKER_DETECTION`. All fully built (real handlers, real prompts), all toggleable by admin, none ever enqueued by anything in the app — no button, no cron, no scheduled job. Confirmed by searching the api and worker source, not just the frontend.

---

## Supervisor

**Has today:** Supervisor AI Insights page, backed by `SUPERVISOR_ADVISORY` + `PRODUCTIVITY_INSIGHT`, aggregated in `supervisor-ai.service.ts` into a team score + AI-boosted ranking.

**Gaps / ideas:**
1. **Surface `KPI_ANALYSIS` per team member or per KPI template.** A supervisor reviewing "why is this person behind" currently only sees the raw progress bar (`ReviewDetailPanel`) — no AI reasoning. This is the single highest-leverage add since the backend is already built.
2. **AI-assisted coaching remarks.** Supervisors already write free-text remarks on approve/reject/revision-request (`ApprovalsService.decide`). A "Suggest remark" button — same pattern as `IMPROVE_DESCRIPTION`'s `task-plan` mode — could draft a remark from the timesheet's overtime/blocker/KPI context, which the supervisor edits before sending. Low effort: reuse the existing prompt-mode pattern.
3. **Overtime-aware team digest.** We just shipped OT visibility in the review queue (badges, stats card). A weekly `SUPERVISOR_ADVISORY` run that specifically flags "3 employees trending into overtime this period" would close the loop between visibility and action.

## Finance

**Has today:** `FINANCE_REPORT` via `AiReportModal`, plus a Finance AI Insights dashboard (`FinanceAiInsightsContent`) — need to confirm how much of that dashboard is live AI vs. computed analytics (same hybrid pattern as HR, likely).

**Gaps / ideas:**
1. **`PAYROLL_VALIDATION` anomaly explanations, not just flags.** HR's Timesheet Status table already shows a Pass/Overtime-Warning/Fail badge from `PAYROLL_VALIDATION`. Finance's payroll processing table (`FinancePayrollProcessingContent`) shows the same underlying data but no AI narrative — "why is this line item flagged" — before Finance approves/locks. Reuse the existing job, add a drill-down.
2. **Pre-lock sanity check.** Right now "Send to Finance" / "Lock Period" is a one-click action. A `PAYROLL_VALIDATION` run gating the lock button (or at minimum a one-click "Run AI Check" before locking) would catch anomalies before they're irreversible — periods can't be regenerated once locked (we hit this exact wall during QA testing).
3. **Cash-flow / budget narrative.** `FINANCE_REPORT` already exists for on-demand reports; consider a scheduled monthly run attached to the Financial Reports page, not just the modal trigger.

## HR

**Has today:** The most complete AI page in the app — HR AI Insights combines `PAYROLL_VALIDATION` results with real payroll/timesheet/attendance data (Payroll Oversight Hub, AI Action Center, Timesheet AI Flag column, Attendance Trends).

**Gaps / ideas:**
1. **`KPI_ANALYSIS` org-wide view.** HR already has org-wide read access; a KPI Analysis rollup ("which templates/departments are trending down") fits naturally next to the existing Attendance Trends chart.
2. **Compliance-risk explanations.** The AI Action Center already renders `COMPLIANCE_RISK` / `CRITICAL_ERROR` items with a title + description — confirm these come from a real AI job (likely `PAYROLL_VALIDATION`) vs. rule-based; if rule-based, an AI pass to explain *why* and suggest a fix would strengthen it without a new feature.
3. **Onboarding/offboarding assist.** Nothing today touches account approvals or employee lifecycle. A `IMPROVE_DESCRIPTION`-style "draft the rejection/approval reason" for pending account requests would mirror the pattern already built for timesheets.

## Admin

**Has today:** AI Config toggle screen (8 of 14 features), System Overview dashboard (no AI).

**Gaps / ideas:**
1. **Fix the toggle list first** — add the missing 6 features so "disable an AI feature org-wide" actually covers all of them. This is a bug more than a feature, but it blocks admin control over everything proposed above.
2. **Cost/usage visibility.** `AiJob` already tracks `totalTokens`, `latencyMs`, `provider`, `model` per job. An admin-facing "AI usage this month" card (job count by feature, token spend) would use data that's already being recorded and currently invisible.
3. **Per-feature model override.** Not urgent, but the reasoning-model latency issue we just fixed (`openai.provider.ts`) suggests giving admin a model picker per feature (e.g., a cheap fast model for `IMPROVE_DESCRIPTION`, a stronger one for `FINANCE_REPORT`) would avoid one-size-fits-all `OPENAI_MODEL`.

---

## Suggested order (once debugging work is done)

1. Admin toggle list fix (small, unblocks trust in the toggle screen) + wire up `KPI_ANALYSIS` somewhere (biggest visible win, zero new backend).
2. Supervisor "Suggest remark" (reuses the `task-plan`-style mode pattern, high daily-use value).
3. Finance pre-lock AI check (prevents an already-hit irreversible mistake).
4. HR KPI Analysis rollup + AI usage/cost card for Admin.
5. Everything else as capacity allows.

## Open questions for you
- 5 features (`KPI_ANALYSIS`, `DAILY_SUMMARY`, `WEEKLY_SUMMARY`, `TIMESHEET_SUMMARY`, `BLOCKER_DETECTION`) are confirmed built-but-unused — decide which get a UI (see role sections above for where they'd fit) vs. get retired from the enum to stop cluttering the admin toggle screen.
- Confirm how much of `FinanceAiInsightsContent` is live AI vs. computed stats, to scope Finance work accurately.
