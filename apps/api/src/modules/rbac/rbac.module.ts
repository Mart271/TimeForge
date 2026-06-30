import { Module } from '@nestjs/common';
import { RbacService } from './rbac.service';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { PermissionsController } from './permissions.controller';

@Module({
  controllers: [RolesController, PermissionsController],
  providers: [RbacService, RolesService],
  exports: [RbacService],
})
export class RbacModule {}
