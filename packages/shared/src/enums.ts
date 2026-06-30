/**
 * Shared domain enums — the single source of truth used by both API and worker.
 * These mirror the Phase 3 database enums.
 */

/** Access role — drives RBAC/permissions (Phase 1). */
export enum Role {
  EMPLOYEE = 'EMPLOYEE',
  SUPERVISOR = 'SUPERVISOR',
  HR = 'HR',
  FINANCE = 'FINANCE',
  ADMIN = 'ADMIN',
}

/** Employment type — drives operational processing (payroll, attendance). */
export enum EmploymentType {
  EMPLOYEE = 'EMPLOYEE',
  INTERN = 'INTERN',
  CONTRACTOR = 'CONTRACTOR',
  PART_TIME = 'PART_TIME',
  FULL_TIME = 'FULL_TIME',
}

/** Account / employment status. Payroll requires ACTIVE. */
export enum UserStatus {
  INVITED = 'INVITED',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
}

export enum TimesheetStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REVISION_REQUESTED = 'REVISION_REQUESTED',
  PAYROLL_READY = 'PAYROLL_READY',
}

export enum ApprovalAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REQUEST_REVISION = 'REQUEST_REVISION',
}

export enum PayrollPeriodStatus {
  OPEN = 'OPEN',
  GENERATED = 'GENERATED',
  APPROVED = 'APPROVED',
  EXPORTED = 'EXPORTED',
}

export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REVISION_REQUEST = 'REVISION_REQUEST',
  PAYROLL_EXPORT = 'PAYROLL_EXPORT',
  ROLE_CHANGE = 'ROLE_CHANGE',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  AI_USAGE = 'AI_USAGE',
  SETTINGS_CHANGE = 'SETTINGS_CHANGE',
  ADMIN_ACTION = 'ADMIN_ACTION',
}

export enum AiProvider {
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  LOCAL = 'LOCAL',
}
