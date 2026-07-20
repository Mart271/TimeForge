import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildPage, decodeCursor } from '../../common/crud/crud.service';
import { AuthPrincipal } from '../../common/decorators';

// Actions visible to scoped readers (HR / Finance): payroll and people events.
const SCOPED_ACTIONS = [
  'LOGIN',
  'LOGOUT',
  'APPROVE',
  'REJECT',
  'REVISION_REQUEST',
  'PASSWORD_CHANGE',
  'ROLE_CHANGE',
  'PAYROLL_EXPORT',
  'ADMIN_ACTION',
  'PAYROLL_VALIDATED',
  'PAYROLL_APPROVED',
  'PAYROLL_REJECTED',
  'PAYROLL_SENT_TO_BANK',
] as const;

export interface AuditLogsQuery {
  action?: string;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  q?: string;
  from?: string;
  to?: string;
  limit?: string;
  cursor?: string;
}

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  private isOrgReader(user: AuthPrincipal): boolean {
    return user.permissions.includes('*') || user.permissions.includes('audit:read_org');
  }

  private isScopedReader(user: AuthPrincipal): boolean {
    return user.permissions.includes('audit:read_scoped');
  }

  async findAll(tenantId: string, user: AuthPrincipal, query: AuditLogsQuery) {
    const orgReader = this.isOrgReader(user);
    const scopedReader = this.isScopedReader(user);

    if (!orgReader && !scopedReader) {
      throw new ForbiddenException('Missing required permission');
    }

    const limit = Math.min(Number(query.limit ?? 20), 100);
    const cursor = query.cursor ? decodeCursor(query.cursor) : undefined;

    const where: Record<string, unknown> = { tenantId };

    // Scoped readers see only payroll/people-related actions.
    if (!orgReader) {
      where['action'] = { in: [...SCOPED_ACTIONS] };
    } else if (query.action) {
      where['action'] = query.action;
    }

    // Org readers can additionally filter by action even when already set above.
    if (orgReader && query.action) {
      where['action'] = query.action;
    }

    if (query.actorId)    where['actorId']    = query.actorId;
    if (query.entityType) where['entityType'] = query.entityType;
    if (query.entityId)   where['entityId']   = query.entityId;

    // Free-text search across entityType (case-insensitive).
    if (query.q) {
      where['entityType'] = { contains: query.q, mode: 'insensitive' };
    }

    if (query.from || query.to) {
      const createdAt: Record<string, Date> = {};
      if (query.from) createdAt['gte'] = new Date(query.from);
      if (query.to)   createdAt['lte'] = new Date(query.to);
      where['createdAt'] = createdAt;
    }

    const rows = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    // ── Enrich with actor profile ──────────────────────────────────────────
    // AuditLog has no Prisma relation to User (intentional — audit logs should
    // be immutable even if users are deleted). Batch-fetch actor profiles here.
    const actorIds = [...new Set(rows.map((r) => r.actorId).filter(Boolean) as string[])];
    const actors = actorIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: actorIds }, tenantId },
          select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true },
        })
      : [];
    const actorMap = new Map(actors.map((a) => [a.id, a]));

    const enriched = rows.map((r) => ({
      ...r,
      actor: r.actorId ? (actorMap.get(r.actorId) ?? null) : null,
    }));

    return buildPage(enriched as unknown as (typeof enriched[number] & { id: string })[], limit);
  }

  async findOne(tenantId: string, user: AuthPrincipal, id: string) {
    const orgReader = this.isOrgReader(user);
    const scopedReader = this.isScopedReader(user);

    if (!orgReader && !scopedReader) {
      throw new ForbiddenException('Missing required permission');
    }

    const log = await this.prisma.auditLog.findFirst({
      where: { id, tenantId },
    });

    if (!log) throw new NotFoundException(`Audit log ${id} not found`);

    // Scoped readers may not access actions outside their allowed set.
    if (!orgReader && !(SCOPED_ACTIONS as readonly string[]).includes(log.action)) {
      throw new ForbiddenException('Access to this audit log is restricted');
    }

    // Enrich single record with actor info
    const actor = log.actorId
      ? await this.prisma.user.findFirst({
          where: { id: log.actorId, tenantId },
          select: { id: true, firstName: true, lastName: true, email: true, jobTitle: true },
        })
      : null;

    return { ...log, actor: actor ?? null };
  }
}
