import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const PERMISSIONS_KEY = 'permissions';

/** Marks a route as public (skips JWT auth). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Declares the permissions required to access a route. */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export interface AuthPrincipal {
  userId: string;
  tenantId: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
}

/** Injects the authenticated principal (req.user). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthPrincipal => {
    return ctx.switchToHttp().getRequest().user;
  },
);
