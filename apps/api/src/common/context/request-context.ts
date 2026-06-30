import { Injectable, NestMiddleware } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

/** Per-request ambient context (Phase 2 layer 2). */
export interface RequestContext {
  requestId: string;
  tenantId?: string;
  organizationId?: string;
  userId?: string;
  roles?: string[];
  permissions?: string[];
}

const als = new AsyncLocalStorage<RequestContext>();

export function getContext(): RequestContext | undefined {
  return als.getStore();
}

/** Merge values into the current request context (e.g., after auth). */
export function setContextValue(patch: Partial<RequestContext>): void {
  const store = als.getStore();
  if (store) Object.assign(store, patch);
}

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return als.run(ctx, fn);
}

/** Initializes the ALS store and a correlation id for every request. */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    res.setHeader('x-request-id', requestId);
    runWithContext({ requestId }, () => next());
  }
}
