import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StorageProvider, PutOptions } from '../storage.types';

interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
  bucket: string;
}

/**
 * Supabase Storage provider. Uses the service-role key (server-side only) so
 * uploads bypass row policies; never expose that key to the client.
 */
@Injectable()
export class SupabaseStorageProvider implements StorageProvider {
  private readonly client: SupabaseClient;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    const sb = config.get<SupabaseConfig>('supabase')!;
    if (!sb.url || !sb.serviceRoleKey) {
      throw new Error('Supabase storage selected but SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set');
    }
    this.client = createClient(sb.url, sb.serviceRoleKey, { auth: { persistSession: false } });
    this.bucket = sb.bucket;
  }

  async put(key: string, data: Buffer, options?: PutOptions): Promise<string> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(key, data, { contentType: options?.contentType, upsert: options?.upsert ?? true });
    if (error) throw error;
    return key;
  }

  async get(key: string): Promise<Buffer> {
    const { data, error } = await this.client.storage.from(this.bucket).download(key);
    if (error || !data) throw error ?? new Error(`Object not found: ${key}`);
    return Buffer.from(await data.arrayBuffer());
  }

  async signedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(key, expiresInSeconds);
    if (error || !data) throw error ?? new Error(`Could not sign URL: ${key}`);
    return data.signedUrl;
  }

  async remove(key: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([key]);
    if (error) throw error;
  }
}
