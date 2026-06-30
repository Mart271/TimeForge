import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { getContext } from '../common/context/request-context';

export const REDIS_CLIENT = 'REDIS_CLIENT';

/** Tenant-scoped Redis cache (keys prefixed with `t:<tenantId>:`). */
@Injectable()
export class CacheService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private scopedKey(key: string): string {
    const tenant = getContext()?.tenantId ?? 'global';
    return `t:${tenant}:${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(this.scopedKey(key));
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async set(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
    await this.redis.set(this.scopedKey(key), JSON.stringify(value), 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(this.scopedKey(key));
  }
}
