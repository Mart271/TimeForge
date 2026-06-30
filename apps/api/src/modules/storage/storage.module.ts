import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { STORAGE_PROVIDER, StorageProvider } from './storage.types';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { SupabaseStorageProvider } from './providers/supabase-storage.provider';
import { FileValidator } from './file-validator';
import { UploadService } from './upload.service';
import { StorageService } from './storage.service';

/**
 * Storage module — provider-swappable file storage. The active provider is
 * chosen by STORAGE_DRIVER (`local` | `supabase`); only this binding changes if
 * you later move to S3 or another backend.
 */
@Global()
@Module({
  providers: [
    FileValidator,
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): StorageProvider => {
        const driver = config.get<{ driver: string }>('storage')?.driver ?? 'local';
        return driver === 'supabase'
          ? new SupabaseStorageProvider(config)
          : new LocalStorageProvider();
      },
    },
    StorageService,
    UploadService,
  ],
  exports: [STORAGE_PROVIDER, StorageService, UploadService, FileValidator],
})
export class StorageModule {}
