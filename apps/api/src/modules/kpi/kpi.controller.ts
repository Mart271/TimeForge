import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { KpiService } from './kpi.service';
import {
  CreateKpiTemplateDto,
  KpiProgressQuery,
  KpiTemplateQuery,
  UpdateKpiTemplateDto,
} from './dto';
import { AuthPrincipal, CurrentUser, RequirePermissions } from '../../common/decorators';

@Controller({ path: 'kpi', version: '1' })
export class KpiController {
  constructor(private readonly svc: KpiService) {}

  // ── Templates ───────────────────────────────────────────────────────────────

  @Get('templates')
  @RequirePermissions('kpi_template:read')
  findAllTemplates(
    @CurrentUser() u: AuthPrincipal,
    @Query() query: KpiTemplateQuery,
  ) {
    return this.svc.findAllTemplates(u, query);
  }

  @Get('templates/:id')
  @RequirePermissions('kpi_template:read')
  findOneTemplate(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.findOneTemplate(u, id);
  }

  @Post('templates')
  @RequirePermissions('kpi_template:create')
  createTemplate(
    @CurrentUser() u: AuthPrincipal,
    @Body() dto: CreateKpiTemplateDto,
  ) {
    return this.svc.createTemplate(u, dto);
  }

  @Patch('templates/:id')
  @RequirePermissions('kpi_template:update')
  updateTemplate(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateKpiTemplateDto,
  ) {
    return this.svc.updateTemplate(u, id, dto);
  }

  @Delete('templates/:id')
  @HttpCode(204)
  @RequirePermissions('kpi_template:delete')
  removeTemplate(
    @CurrentUser() u: AuthPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('version', ParseIntPipe) version: number,
  ) {
    return this.svc.removeTemplate(u, id, version);
  }

  // ── Progress (read-only) ────────────────────────────────────────────────────

  @Get('progress')
  @RequirePermissions('kpi_progress:read')
  findProgress(
    @CurrentUser() u: AuthPrincipal,
    @Query() query: KpiProgressQuery,
  ) {
    return this.svc.findProgress(u, query);
  }
}
