import { Injectable } from '@nestjs/common';
import { ROLE_PERMISSIONS, Role } from '@timeforge/shared';

@Injectable()
export class RbacService {
  /** Expands a set of role keys into a flat permission set (`*` = Admin). */
  resolvePermissions(roleKeys: string[]): string[] {
    const set = new Set<string>();
    for (const key of roleKeys) {
      const perms = ROLE_PERMISSIONS[key as Role];
      if (!perms) continue;
      if (perms.includes('*')) return ['*'];
      perms.forEach((p) => set.add(p));
    }
    return [...set];
  }
}
