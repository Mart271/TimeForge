import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, AuthPrincipal } from '../decorators';

/**
 * Permission-based, default-deny authorization (Phase 2 §9). Reads the
 * @RequirePermissions() metadata; `*` (Admin) bypasses. Routes with no
 * declared permissions pass (auth alone is enough).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];
    if (required.length === 0) return true;

    const user: AuthPrincipal | undefined = context.switchToHttp().getRequest().user;
    const perms = user?.permissions ?? [];
    if (perms.includes('*')) return true;

    const ok = required.every((p) => perms.includes(p));
    if (!ok) throw new ForbiddenException('Missing required permission');
    return true;
  }
}
