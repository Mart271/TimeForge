import { Injectable } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import { StorageProvider, PutOptions } from '../storage.types';

/** Local-disk provider (dev/offline fallback). Files live under `var/storage/`. */
@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly root = join(process.cwd(), 'var', 'storage');

  async put(key: string, data: Buffer, _options?: PutOptions): Promise<string> {
    const target = join(this.root, key);
    await fs.mkdir(dirname(target), { recursive: true });
    await fs.writeFile(target, data);
    return key;
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(join(this.root, key));
  }

  async signedUrl(key: string): Promise<string> {
    return `file://${join(this.root, key)}`;
  }

  async remove(key: string): Promise<void> {
    await fs.rm(join(this.root, key), { force: true });
  }
}
