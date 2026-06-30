import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { BullModule } from '@nestjs/bullmq';
import configuration from '../../api/src/config/configuration';
import { validate } from '../../api/src/config/env.validation';
import { PrismaModule } from '../../api/src/common/prisma/prisma.module';
import { NotificationsProcessor } from './processors/notifications.processor';
import { AiProcessor } from './processors/ai.processor';
import { OpenAiProvider } from './ai/openai.provider';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], validate }),
    LoggerModule.forRoot({ pinoHttp: { autoLogging: false } }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = new URL(config.get<string>('redisUrl')!);
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port) || 6379,
            password: url.password || undefined,
            maxRetriesPerRequest: null,
          },
        };
      },
    }),
    BullModule.registerQueue({ name: 'notifications' }),
    BullModule.registerQueue({ name: 'ai' }),
    PrismaModule,
  ],
  providers: [NotificationsProcessor, AiProcessor, OpenAiProvider],
})
export class WorkerModule {}
