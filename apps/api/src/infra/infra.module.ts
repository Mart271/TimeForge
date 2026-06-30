import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { CacheService, REDIS_CLIENT } from './cache.service';
import { MailerService } from './mailer.service';

// File storage now lives in modules/storage (StorageModule) — provider-swappable
// (local | supabase). Inject StorageService / UploadService from there.

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis(config.get<string>('redisUrl')!, { maxRetriesPerRequest: null }),
    },
    CacheService,
    MailerService,
  ],
  exports: [REDIS_CLIENT, CacheService, MailerService],
})
export class InfraModule {}
