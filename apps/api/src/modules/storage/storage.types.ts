/** DI token for the active storage provider. */
export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

export interface PutOptions {
  contentType?: string;
  upsert?: boolean;
}

/**
 * Storage provider port. Swap the implementation (Supabase, S3, local disk)
 * without changing callers — only the provider binding changes.
 */
export interface StorageProvider {
  /** Stores bytes at `key`; returns the stored key. */
  put(key: string, data: Buffer, options?: PutOptions): Promise<string>;
  /** Reads bytes at `key`. */
  get(key: string): Promise<Buffer>;
  /** Returns a time-limited signed URL for `key`. */
  signedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  /** Deletes `key`. */
  remove(key: string): Promise<void>;
}

/** Logical buckets/folders (Supabase Storage paths). */
export type StorageFolder =
  | 'avatars'
  | 'scrum-attachments'
  | 'reports'
  | 'exports'
  | 'documents';

export interface UploadInput {
  folder: StorageFolder;
  filename: string;
  data: Buffer;
  contentType: string;
  size: number;
}

export interface UploadResult {
  key: string;
  url: string;
}

export interface FileConstraints {
  maxBytes?: number;
  allowedMimeTypes?: string[];
}
