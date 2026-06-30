import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RequirePermissions } from '../../common/decorators';

@ApiTags('RBAC')
@ApiBearerAuth('access-token')
@Controller({ path: 'permissions', version: '1' })
export class PermissionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions('permission:read')
  @ApiOperation({ summary: 'List the full permission catalog' })
  async findAll() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: { key: 'asc' },
    });
    return { data: permissions };
  }
}
