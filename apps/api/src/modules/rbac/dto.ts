import { IsArray, IsInt, IsIn, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { ALL_PERMISSIONS } from '@timeforge/shared';

const VALID_PERMISSIONS = [...ALL_PERMISSIONS];

export class CreateRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  name!: string;

  @IsArray()
  @IsString({ each: true })
  @IsIn(VALID_PERMISSIONS, { each: true })
  permissionKeys!: string[];
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(VALID_PERMISSIONS, { each: true })
  permissionKeys?: string[];

  // Optimistic locking version
  @IsInt()
  @Min(0)
  version!: number;
}
