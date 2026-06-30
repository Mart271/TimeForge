import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EmploymentType } from '@prisma/client';

// ─── Bulk user import ────────────────────────────────────────────────────────

export class ImportUserItemDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @IsEnum(['EMPLOYEE', 'SUPERVISOR', 'HR', 'FINANCE', 'ADMIN'])
  role!: string;

  @IsEnum(EmploymentType)
  employmentType!: EmploymentType;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsUUID()
  supervisorId?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  payrollEligible?: boolean;
}

export class BulkImportUsersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportUserItemDto)
  users!: ImportUserItemDto[];
}

// ─── Bulk approve ────────────────────────────────────────────────────────────

export class BulkApproveItemDto {
  @IsUUID()
  timesheetId!: string;

  @IsInt()
  @Min(0)
  expectedVersion!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  remark?: string;
}

export class BulkApproveDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkApproveItemDto)
  items!: BulkApproveItemDto[];
}

// ─── Config upsert ───────────────────────────────────────────────────────────

export class UpsertConfigDto {
  @IsNotEmpty()
  value!: unknown;
}
