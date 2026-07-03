import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ScrumTaskStatus } from '@prisma/client';

export class CreateScrumEntryDto {
  /** ISO date string, e.g. "2026-06-30" — must not be in the future. */
  @IsDateString()
  entryDate!: string;

  @IsString()
  @MaxLength(5000)
  yesterday!: string;

  @IsString()
  @MaxLength(5000)
  today!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  blockers?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  /** Self-reported task progress for the day, 0–100. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  progress?: number;

  @IsOptional()
  @IsEnum(ScrumTaskStatus)
  status?: ScrumTaskStatus;
}

export class UpdateScrumEntryDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  yesterday?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  today?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  blockers?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  /** Self-reported task progress for the day, 0–100. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  progress?: number;

  @IsOptional()
  @IsEnum(ScrumTaskStatus)
  status?: ScrumTaskStatus;

  @IsInt()
  @Type(() => Number)
  version!: number;
}

export class CommentScrumEntryDto {
  @IsString()
  @MaxLength(2000)
  comment!: string;

  @IsInt()
  @Type(() => Number)
  version!: number;
}

export interface ScrumQuery {
  limit?: string;
  cursor?: string;
  userId?: string;
  from?: string;
  to?: string;
  hasBlockers?: string; // "true" | "false"
}
