import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  STORAGE_PROVIDER,
  StorageProvider,
  UploadInput,
  UploadResult,
  FileConstraints,
} from './storage.types';
import { FileValidator } from './file-validator';

/** Validates + stores an upload, returning the key and a signed URL. */
@Injectable()
export class UploadService {
  constructor(
    @Inject(STORAGE_PROVIDER) private readonly provider: StorageProvider,
    private readonly validator: FileValidator,
  ) {}

  async upload(input: UploadInput, constraints?: FileConstraints): Promise<UploadResult> {
    this.validator.validate({ contentType: input.contentType, size: input.size }, constraints);
    const safe = input.filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
    const key = `${input.folder}/${randomUUID()}-${safe}`;
    await this.provider.put(key, input.data, { contentType: input.contentType, upsert: true });
    const url = await this.provider.signedUrl(key);
    return { key, url };
  }
}
