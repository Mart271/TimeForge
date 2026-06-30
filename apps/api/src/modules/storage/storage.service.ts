import { Inject, Injectable } from '@nestjs/common';
import { STORAGE_PROVIDER, StorageProvider, PutOptions } from './storage.types';

/** Lower-level storage facade — delegates to the configured provider. */
@Injectable()
export class StorageService {
  constructor(@Inject(STORAGE_PROVIDER) private readonly provider: StorageProvider) {}

  put(key: string, data: Buffer, options?: PutOptions): Promise<string> {
    return this.provider.put(key, data, options);
  }

  get(key: string): Promise<Buffer> {
    return this.provider.get(key);
  }

  signedUrl(key: string, expiresInSeconds?: number): Promise<string> {
    return this.provider.signedUrl(key, expiresInSeconds);
  }

  remove(key: string): Promise<void> {
    return this.provider.remove(key);
  }
}
