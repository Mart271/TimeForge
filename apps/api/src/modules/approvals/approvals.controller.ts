import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { AddRemarkDto, ApprovalQueue, DecisionDto } from './dto';
import { AuthPrincipal, CurrentUser, RequirePermissions } from '../../common/decorators';

@Controller({ path: 'approvals', version: '1' })
export class ApprovalsController {
  constructor(private readonly svc: ApprovalsService) {}

  /** Supervisor / Admin: list the review queue for their team / org. */
  @Get()
  @RequirePermissions('approval:read_team')
  findQueue(@CurrentUser() u: AuthPrincipal, @Query() query: ApprovalQueue) {
    return this.svc.findQueue(u, query);
  }

  /** Supervisor / Admin: get one timesheet + its full approval history. */
  @Get(':timesheetId')
  @RequirePermissions('approval:read_team')
  findDetail(
    @CurrentUser() u: AuthPrincipal,
    @Param('timesheetId', ParseUUIDPipe) timesheetId: string,
  ) {
    return this.svc.findDetail(u, timesheetId);
  }

  /**
   * Supervisor / Admin: SUBMITTED | UNDER_REVIEW → APPROVED | REJECTED | REVISION_REQUESTED.
   * Idempotency-Key recommended for safe retries.
   */
  @Post(':timesheetId/decision')
  @HttpCode(200)
  @RequirePermissions('approval:decide')
  decide(
    @CurrentUser() u: AuthPrincipal,
    @Param('timesheetId', ParseUUIDPipe) timesheetId: string,
    @Body() dto: DecisionDto,
  ) {
    return this.svc.decide(u, timesheetId, dto);
  }

  /** Supervisor / Admin: add a permanent coaching remark without changing state. */
  @Post(':timesheetId/remarks')
  @RequirePermissions('approval:remark')
  addRemark(
    @CurrentUser() u: AuthPrincipal,
    @Param('timesheetId', ParseUUIDPipe) timesheetId: string,
    @Body() dto: AddRemarkDto,
  ) {
    return this.svc.addRemark(u, timesheetId, dto);
  }
}
