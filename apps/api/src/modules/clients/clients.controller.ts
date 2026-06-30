import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto } from './dto';
import { AuthPrincipal, CurrentUser, RequirePermissions } from '../../common/decorators';

@Controller({ path: 'clients', version: '1' })
export class ClientsController {
  constructor(private readonly svc: ClientsService) {}

  @Get()
  @RequirePermissions('client:read')
  findAll(@CurrentUser() u: AuthPrincipal, @Query() query: Record<string, string>) {
    return this.svc.findAll(u.tenantId, u.organizationId, query);
  }

  @Get(':id')
  @RequirePermissions('client:read')
  findOne(@CurrentUser() u: AuthPrincipal, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findOne(u.tenantId, u.organizationId, id);
  }

  @Post()
  @RequirePermissions('client:create')
  create(@CurrentUser() u: AuthPrincipal, @Body() dto: CreateClientDto) {
    return this.svc.create(u.tenantId, u.organizationId, u.userId, dto);
  }

  @Patch(':id')
  @RequirePermissions('client:update')
  update(@CurrentUser() u: AuthPrincipal, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateClientDto) {
    return this.svc.update(u.tenantId, u.organizationId, id, u.userId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions('client:delete')
  remove(@CurrentUser() u: AuthPrincipal, @Param('id', ParseUUIDPipe) id: string, @Query('version', ParseIntPipe) version: number) {
    return this.svc.remove(u.tenantId, u.organizationId, id, u.userId, version);
  }
}
