import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { AuthPrincipal, CurrentUser, RequirePermissions } from '../../common/decorators';

@ApiTags('Notifications')
@ApiBearerAuth('access-token')
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  // ─── List ──────────────────────────────────────────────────────────────────

  @Get()
  @RequirePermissions('notification:read_self')
  @ApiOperation({ summary: 'List own notifications (cursor-paginated)' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'SENT', 'READ', 'FAILED'] })
  @ApiQuery({ name: 'type', required: false, enum: ['SUBMISSION', 'APPROVAL_DECISION', 'REVISION_REQUEST', 'DEADLINE', 'PAYROLL_READY', 'AI_REPORT'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  findAll(
    @CurrentUser() u: AuthPrincipal,
    @Query() query: Record<string, string>,
  ) {
    return this.svc.findAll(u.tenantId, u.userId, query);
  }

  // ─── Count ─────────────────────────────────────────────────────────────────

  @Get('count')
  @RequirePermissions('notification:read_self')
  @ApiOperation({ summary: 'Get total and unread notification counts' })
  @ApiOkResponse({ schema: { example: { total: 42, unread: 5 } } })
  count(@CurrentUser() u: AuthPrincipal) {
    return this.svc.count(u.tenantId, u.userId);
  }

  // ─── Mark one read ─────────────────────────────────────────────────────────

  @Post(':id/read')
  @HttpCode(200)
  @RequirePermissions('notification:update_self')
  @ApiOperation({ summary: 'Mark a notification as read' })
  markRead(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.markRead(u.tenantId, u.userId, id);
  }

  // ─── Mark all read ─────────────────────────────────────────────────────────

  @Post('read-all')
  @HttpCode(200)
  @RequirePermissions('notification:update_self')
  @ApiOperation({ summary: 'Mark all own notifications as read' })
  markAllRead(@CurrentUser() u: AuthPrincipal) {
    return this.svc.markAllRead(u.tenantId, u.userId);
  }
}
