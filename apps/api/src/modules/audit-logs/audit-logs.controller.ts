import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { AuthPrincipal, CurrentUser, RequirePermissions } from '../../common/decorators';

@ApiTags('Audit Logs')
@ApiBearerAuth('access-token')
@Controller({ path: 'audit-logs', version: '1' })
export class AuditLogsController {
  constructor(private readonly svc: AuditLogsService) {}

  @Get()
  @RequirePermissions('audit:read_scoped')
  @ApiOperation({ summary: 'Query audit trail (Admin = full; HR/Finance = scoped to payroll/people events)' })
  @ApiQuery({ name: 'action', required: false, enum: ['LOGIN','LOGOUT','APPROVE','REJECT','REVISION_REQUEST','PAYROLL_EXPORT','ROLE_CHANGE','PASSWORD_CHANGE','AI_USAGE','SETTINGS_CHANGE','ADMIN_ACTION'] })
  @ApiQuery({ name: 'actorId',    required: false, type: String })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'entityId',   required: false, type: String })
  @ApiQuery({ name: 'q',          required: false, type: String, description: 'Free-text search on entityType' })
  @ApiQuery({ name: 'from',       required: false, type: String, description: 'ISO 8601 datetime' })
  @ApiQuery({ name: 'to',         required: false, type: String, description: 'ISO 8601 datetime' })
  @ApiQuery({ name: 'limit',      required: false, type: Number })
  @ApiQuery({ name: 'cursor',     required: false, type: String })
  findAll(
    @CurrentUser() u: AuthPrincipal,
    @Query() query: Record<string, string>,
  ) {
    return this.svc.findAll(u.tenantId, u, query);
  }

  @Get(':id')
  @RequirePermissions('audit:read_scoped')
  @ApiOperation({ summary: 'Fetch a single audit log entry' })
  findOne(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.findOne(u.tenantId, u, id);
  }
}
