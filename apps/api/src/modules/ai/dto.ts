import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

// Features that run in OWN scope (caller's own data)
export const OWN_FEATURES = [
  'DAILY_SUMMARY',
  'WEEKLY_SUMMARY',
  'TIMESHEET_SUMMARY',
  'BLOCKER_DETECTION',
  'STANDUP_DRAFT',
  'BLOCKER_ADVISORY',
  'KPI_COPILOT',
  'INTERN_ADVISORY',
  'IMPROVE_DESCRIPTION',
] as const;

// Features that require TEAM scope (supervisor's team)
export const TEAM_FEATURES = [
  'PRODUCTIVITY_INSIGHT',
  'SUPERVISOR_ADVISORY',
  'KPI_ANALYSIS',
] as const;

// Features that require ORG scope (admin / finance)
export const ORG_FEATURES = ['PAYROLL_VALIDATION'] as const;

export const ALL_AI_FEATURES = [
  ...OWN_FEATURES,
  ...TEAM_FEATURES,
  ...ORG_FEATURES,
] as const;

export type AiFeatureKey = typeof ALL_AI_FEATURES[number];

// Valid subject types and their required permissions
export const SUBJECT_TYPES = [
  'timesheet',
  'user',
  'payroll_period',
  'kpi_template',
] as const;

export class TriggerAiJobDto {
  @IsEnum(ALL_AI_FEATURES)
  feature!: AiFeatureKey;

  @IsString()
  @IsEnum(SUBJECT_TYPES)
  subjectType!: string;

  @IsUUID()
  subjectId!: string;

  @IsOptional()
  options?: Record<string, unknown>;
}
