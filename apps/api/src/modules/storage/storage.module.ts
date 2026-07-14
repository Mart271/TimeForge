import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { STORAGE_PROVIDER, StorageProvider } from './storage.types';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { SupabaseStorageProvider } from './providers/supabase-storage.provider';
import { FileValidator } from './file-validator';
import { UploadService } from './upload.service';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';

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
        const storage = config.get<{ driver: string; publicUrl?: string }>('storage');
        return storage?.driver === 'supabase'
          ? new SupabaseStorageProvider(config)
          : new LocalStorageProvider(storage?.publicUrl);
      },
    },
    StorageService,
    UploadService,
  ],
  controllers: [StorageController],
  exports: [STORAGE_PROVIDER, StorageService, UploadService, FileValidator],
})
export class StorageModule {}
