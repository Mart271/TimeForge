import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { ReportsController } from './reports.controller';
import { DashboardService } from './dashboard.service';

@Module({
  controllers: [DashboardController, ReportsController],
  providers: [DashboardService],
})
export class DashboardReportsModule {}
