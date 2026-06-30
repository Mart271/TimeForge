import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTimesheetDto {
  @IsString()
  periodStart!: string; // ISO date string, e.g. "2025-06-01"

  @IsString()
  periodEnd!: string; // ISO date string, e.g. "2025-06-30"

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  summary?: string;
}

export class UpdateTimesheetDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  summary?: string;

  @Type(() => Number)
  version!: number;
}

export class SubmitTimesheetDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  summary?: string;

  @Type(() => Number)
  version!: number;
}

const DECIDE_STATUSES = ['APPROVED', 'REJECTED', 'REVISION_REQUESTED'] as const;
export type DecisionStatus = (typeof DECIDE_STATUSES)[number];

export class DecideTimesheetDto {
  @IsIn(DECIDE_STATUSES)
  decision!: DecisionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  remark?: string;

  @Type(() => Number)
  version!: number;
}

export class AttachEntriesDto {
  @IsArray()
  @IsUUID(undefined, { each: true })
  entryIds!: string[];
}

export interface TimesheetQuery {
  limit?: string;
  cursor?: string;
  status?: string;
  userId?: string;
  from?: string; // filter by periodStart ≥ from
  to?: string;   // filter by periodStart ≤ to
}
