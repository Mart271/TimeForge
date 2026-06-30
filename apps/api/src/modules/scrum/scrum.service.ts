import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, ScrumEntry } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildPage, decodeCursor, PageResult } from '../../common/crud/crud.service';
import { AuthPrincipal } from '../../common/decorators';
import { PERMISSIONS } from '@timeforge/shared';
import {
  CommentScrumEntryDto,
  CreateScrumEntryDto,
  ScrumQuery,
  UpdateScrumEntryDto,
} from './dto';

@Injectable()
export class ScrumService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Reads ───────────────────────────────────────────────────────────────────

  async findAll(p: AuthPrincipal, query: ScrumQuery): Promise<PageResult<ScrumEntry>> {
    const limit = Math.min(Number(query.limit ?? 20), 100);
    const where: Prisma.ScrumEntryWhereInput = {
      tenantId: p.tenantId,
      organizationId: p.organizationId,
      deletedAt: null,
      ...(await this.resolveUserFilter(p, query.userId)),
      ...(query.hasBlockers === 'true' ? { blockers: { not: null } } : {}),
      ...(query.from || query.to
        ? {
            entryDate: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.cursor ? { id: { gt: decodeCursor(query.cursor) } } : {}),
    };
    const items = await this.prisma.scrumEntry.findMany({
      where,
      orderBy: [{ entryDate: 'desc' }, { id: 'asc' }],
      take: limit + 1,
    });
    return buildPage(items, limit);
  }

  async findOne(p: AuthPrincipal, id: string): Promise<ScrumEntry> {
    const entry = await this.prisma.scrumEntry.findFirst({
      where: { id, tenantId: p.tenantId, organizationId: p.organizationId, deletedAt: null },
    });
    if (!entry) throw new NotFoundException('Scrum entry not found');
    await this.assertCanView(p, entry.userId);
    return entry;
  }

  // ── Writes ──────────────────────────────────────────────────────────────────

  async create(p: AuthPrincipal, dto: CreateScrumEntryDto): Promise<ScrumEntry> {
    const entryDate = new Date(dto.entryDate);
    if (isNaN(entryDate.getTime())) {
      throw new UnprocessableEntityException('entryDate must be a valid date');
    }

    // entryDate must not be in the future (compare by date only, UTC)
    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);
    if (entryDate > today) {
      throw new UnprocessableEntityException('entryDate cannot be in the future');
    }

    // One entry per user per day
    const existing = await this.prisma.scrumEntry.findFirst({
      where: {
        tenantId: p.tenantId,
        userId: p.userId,
        entryDate,
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException('A scrum entry already exists for this date');
    }

    return this.prisma.scrumEntry.create({
      data: {
        tenantId: p.tenantId,
        organizationId: p.organizationId,
        userId: p.userId,
        entryDate,
        yesterday: dto.yesterday,
        today: dto.today,
        blockers: dto.blockers ?? null,
        notes: dto.notes ?? null,
        createdBy: p.userId,
        updatedBy: p.userId,
      },
    });
  }

  /**
   * Owner can edit their own entry on the same day only.
   */
  async update(p: AuthPrincipal, id: string, dto: UpdateScrumEntryDto): Promise<ScrumEntry> {
    const entry = await this.ownEntry(p, id);
    if (entry.version !== dto.version) throw new ConflictException('Version mismatch');

    return this.prisma.scrumEntry.update({
      where: { id },
      data: {
        yesterday: dto.yesterday ?? entry.yesterday,
        today: dto.today ?? entry.today,
        blockers: dto.blockers !== undefined ? (dto.blockers ?? null) : entry.blockers,
        notes: dto.notes !== undefined ? (dto.notes ?? null) : entry.notes,
        updatedBy: p.userId,
        version: { increment: 1 },
      },
    });
  }

  /**
   * Supervisor adds a comment to an entry on their team (stored in supervisorNote).
   */
  async comment(p: AuthPrincipal, id: string, dto: CommentScrumEntryDto): Promise<ScrumEntry> {
    const entry = await this.prisma.scrumEntry.findFirst({
      where: { id, tenantId: p.tenantId, organizationId: p.organizationId, deletedAt: null },
    });
    if (!entry) throw new NotFoundException('Scrum entry not found');

    // Must be the supervisor or admin
    if (!this.can(p, PERMISSIONS.SCRUM_READ_TEAM)) {
      throw new ForbiddenException('Only supervisors can comment on team scrum entries');
    }

    // Supervisor scope: entry owner must be in their team
    if (!(await this.isInTeam(p, entry.userId))) {
      throw new ForbiddenException('This entry is outside your team');
    }

    if (entry.version !== dto.version) throw new ConflictException('Version mismatch');

    return this.prisma.scrumEntry.update({
      where: { id },
      data: {
        supervisorNote: dto.comment,
        updatedBy: p.userId,
        version: { increment: 1 },
      },
    });
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private can(p: AuthPrincipal, perm: string): boolean {
    return p.permissions.includes('*') || p.permissions.includes(perm);
  }

  private async resolveUserFilter(
    p: AuthPrincipal,
    requestedUserId?: string,
  ): Promise<Prisma.ScrumEntryWhereInput> {
    if (this.can(p, PERMISSIONS.SCRUM_READ_TEAM)) {
      const ids = await this.teamUserIds(p);
      if (requestedUserId && !ids.includes(requestedUserId)) {
        throw new ForbiddenException('That user is outside your team');
      }
      return { userId: requestedUserId ?? { in: ids } };
    }
    if (requestedUserId && requestedUserId !== p.userId) {
      throw new ForbiddenException('You can only view your own scrum entries');
    }
    return { userId: p.userId };
  }

  private async assertCanView(p: AuthPrincipal, ownerId: string): Promise<void> {
    if (ownerId === p.userId) return;
    if (this.can(p, PERMISSIONS.SCRUM_READ_TEAM)) {
      if ((await this.teamUserIds(p)).includes(ownerId)) return;
    }
    throw new ForbiddenException('Not permitted to view this scrum entry');
  }

  private async isInTeam(p: AuthPrincipal, userId: string): Promise<boolean> {
    if (this.can(p, PERMISSIONS.SCRUM_READ_TEAM)) {
      return (await this.teamUserIds(p)).includes(userId);
    }
    return false;
  }

  private async teamUserIds(p: AuthPrincipal): Promise<string[]> {
    const reports = await this.prisma.user.findMany({
      where: {
        tenantId: p.tenantId,
        organizationId: p.organizationId,
        supervisorId: p.userId,
        deletedAt: null,
      },
      select: { id: true },
    });
    return [p.userId, ...reports.map((r) => r.id)];
  }

  private async ownEntry(p: AuthPrincipal, id: string): Promise<ScrumEntry> {
    const entry = await this.prisma.scrumEntry.findFirst({
      where: { id, tenantId: p.tenantId, organizationId: p.organizationId, deletedAt: null },
    });
    if (!entry) throw new NotFoundException('Scrum entry not found');
    if (entry.userId !== p.userId) {
      throw new ForbiddenException('You can only modify your own scrum entries');
    }
    return entry;
  }
}
