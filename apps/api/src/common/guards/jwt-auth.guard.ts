import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY, AuthPrincipal } from '../decorators';
import { setContextValue } from '../context/request-context';

/**
 * Global JWT guard. Skips routes marked @Public(). On success it pushes the
 * tenant/user/permissions into the request context (Phase 2 layer 2).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest<TUser = AuthPrincipal>(err: unknown, user: TUser): TUser {
    if (err || !user) {
      throw err instanceof Error ? err : new UnauthorizedException();
    }
    const principal = user as unknown as AuthPrincipal;
    setContextValue({
      tenantId: principal.tenantId,
      organizationId: principal.organizationId,
      userId: principal.userId,
      roles: principal.roles,
      permissions: principal.permissions,
    });
    return user;
  }
}
