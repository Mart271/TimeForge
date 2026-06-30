import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseFloatPipe,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { CreatePayrollPeriodDto, ExportPayrollDto, PayrollPeriodQuery } from './dto';
import { AuthPrincipal, CurrentUser, RequirePermissions } from '../../common/decorators';

@Controller({ path: 'payroll', version: '1' })
export class PayrollController {
  constructor(private readonly svc: PayrollService) {}

  // ── Payroll Periods ──────────────────────────────────────────────────────────

  @Get('periods')
  @RequirePermissions('payroll_period:read')
  findAllPeriods(
    @CurrentUser() u: AuthPrincipal,
    @Query() query: PayrollPeriodQuery,
  ) {
    return this.svc.findAllPeriods(u, query);
  }

  @Get('periods/:id')
  @RequirePermissions('payroll_period:read')
  findOnePeriod(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.findOnePeriod(u, id);
  }

  @Post('periods')
  @RequirePermissions('payroll_period:create')
  createPeriod(
    @CurrentUser() u: AuthPrincipal,
    @Body() dto: CreatePayrollPeriodDto,
  ) {
    return this.svc.createPeriod(u, dto);
  }

  /** Compute payroll line items from PAYROLL_READY timesheets. Idempotent on re-run. */
  @Post('periods/:id/generate')
  @HttpCode(200)
  @RequirePermissions('payroll:generate')
  generateReport(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.generateReport(u, id);
  }

  /** Lock the period — no further edits after this. */
  @Post('periods/:id/lock')
  @HttpCode(200)
  @RequirePermissions('payroll_period:update')
  lockPeriod(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.lockPeriod(u, id);
  }

  /**
   * Export the payroll report (MVP: synchronous).
   * Idempotency-Key recommended for safe retries.
   */
  @Post('periods/:id/export')
  @HttpCode(200)
  @RequirePermissions('payroll:export')
  exportReport(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExportPayrollDto,
  ) {
    return this.svc.exportReport(u, id, dto);
  }

  /** Fetch a generated report + line items. Finance/Admin only. */
  @Get('reports/:id')
  @RequirePermissions('payroll_period:read')
  findReport(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.findReport(u, id);
  }

  // ── Employee self-view (hours only, no amounts) ──────────────────────────────

  @Get('me')
  @RequirePermissions('payroll:read_self')
  getMyStatus(@CurrentUser() u: AuthPrincipal) {
    return this.svc.getMyPayrollStatus(u);
  }

  // ── Hourly Rate Management (Finance / Admin) ─────────────────────────────────

  @Get('rates/:userId')
  @RequirePermissions('payroll_rate:read')
  getRate(
    @CurrentUser() u: AuthPrincipal,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.svc.getRate(u, userId);
  }

  @Patch('rates/:userId')
  @RequirePermissions('payroll_rate:update')
  updateRate(
    @CurrentUser() u: AuthPrincipal,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('rate', ParseFloatPipe) rate: number,
    @Query('version', ParseIntPipe) version: number,
  ) {
    return this.svc.updateRate(u, userId, rate, version);
  }
}
