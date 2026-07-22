import {
  Body,
  Controller,
  Get,
  Query,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { TriggerAiJobDto } from './dto';
import { AuthPrincipal, CurrentUser, RequirePermissions } from '../../common/decorators';

@ApiTags('AI')
@ApiBearerAuth('access-token')
@Controller({ path: 'ai', version: '1' })
export class AiController {
  constructor(private readonly svc: AiService) {}

  @Get('jobs')
  @RequirePermissions('ai:read')
  @ApiOperation({ summary: 'List AI jobs (own by default; ai:read_org for all)' })
  @ApiQuery({ name: 'feature', required: false, enum: ['DAILY_SUMMARY','WEEKLY_SUMMARY','TIMESHEET_SUMMARY','BLOCKER_DETECTION','PRODUCTIVITY_INSIGHT','SUPERVISOR_ADVISORY','KPI_ANALYSIS','PAYROLL_VALIDATION'] })
  @ApiQuery({ name: 'status',  required: false, enum: ['QUEUED','RUNNING','SUCCEEDED','FAILED'] })
  @ApiQuery({ name: 'limit',   required: false, type: Number })
  @ApiQuery({ name: 'cursor',  required: false, type: String })
  listJobs(
    @CurrentUser() u: AuthPrincipal,
    @Query() query: Record<string, string>,
  ) {
    return this.svc.listJobs(u, query);
  }

    @Post('jobs')
  @HttpCode(202)
  // No @RequirePermissions here — which permission is actually required
  // (ai:trigger_self / _team / _org) depends on the requested feature, and
  // AiService.triggerJob() already resolves and enforces the right one per
  // feature. A blanket ai:trigger_self gate here previously 403'd any role
  // that only has _team/_org (e.g. HR/Finance triggering PAYROLL_VALIDATION,
  // an org-scoped feature) even though the service would have allowed it.
  @ApiOperation({ summary: 'Trigger an async AI feature job. Returns 202 with jobId.' })
  @ApiHeader({ name: 'Idempotency-Key', required: true, description: 'Dedup key per subject+version' })
  triggerJob(
    @CurrentUser() u: AuthPrincipal,
    @Body() dto: TriggerAiJobDto,
    @Headers('Idempotency-Key') idempotencyKey: string,
  ) {
    if (!idempotencyKey?.trim()) {
      throw new UnprocessableEntityException('Idempotency-Key header is required');
    }
    return this.svc.triggerJob(u, dto, idempotencyKey.trim());
  }

  @Get('jobs/:id')
  @RequirePermissions('ai:read')
  @ApiOperation({ summary: 'Poll AI job status (QUEUED / RUNNING / SUCCEEDED / FAILED)' })
  getJob(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.getJob(u, id);
  }

  @Get('results/:jobId')
  @RequirePermissions('ai:read')
  @ApiOperation({ summary: 'Fetch AI result (summary + recommendation + confidence). No raw prompt/response.' })
  getResult(
    @CurrentUser() u: AuthPrincipal,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ) {
    return this.svc.getResult(u, jobId);
  }
}
