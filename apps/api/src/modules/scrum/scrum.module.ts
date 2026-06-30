import { Module } from '@nestjs/common';
import { ScrumController } from './scrum.controller';
import { ScrumService } from './scrum.service';

@Module({
  controllers: [ScrumController],
  providers: [ScrumService],
  exports: [ScrumService],
})
export class ScrumModule {}
