import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ApprovalsModule } from '../approvals/approvals.module';
import { UsersModule } from '../users/users.module';
import { OrganizationModule } from '../organization/organization.module';

@Module({
  imports: [ApprovalsModule, UsersModule, OrganizationModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
