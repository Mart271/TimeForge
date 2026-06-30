import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import { AuthPrincipal, CurrentUser, RequirePermissions } from '../../common/decorators';

@Controller({ path: 'projects', version: '1' })
export class ProjectsController {
  constructor(private readonly svc: ProjectsService) {}

  @Get()
  @RequirePermissions('project:read')
  findAll(@CurrentUser() u: AuthPrincipal, @Query() query: Record<string, string>) {
    return this.svc.findAll(u.tenantId, u.organizationId, query);
  }

  @Get(':id')
  @RequirePermissions('project:read')
  findOne(@CurrentUser() u: AuthPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findOne(u.tenantId, u.organizationId, id);
  }

  @Post()
  @RequirePermissions('project:create')
  create(@CurrentUser() u: AuthPrincipal, @Body() dto: CreateProjectDto) {
    return this.svc.create(u.tenantId, u.organizationId, u.userId, dto);
  }

  @Patch(':id')
  @RequirePermissions('project:update')
  update(@CurrentUser() u: AuthPrincipal, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProjectDto) {
    return this.svc.update(u.tenantId, u.organizationId, id, u.userId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions('project:delete')
  remove(@CurrentUser() u: AuthPrincipal, @Param('id', ParseUUIDPipe) id: string, @Query('version', ParseIntPipe) version: number) {
    return this.svc.remove(u.tenantId, u.organizationId, id, u.userId, version);
  }
}
