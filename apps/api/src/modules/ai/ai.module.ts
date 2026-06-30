import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AI_QUEUE } from './ai.service';

@Module({
  imports: [BullModule.registerQueue({ name: AI_QUEUE })],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
