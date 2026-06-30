import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, TimeEntry } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildPage, decodeCursor, PageResult } from '../../common/crud/crud.service';
import { AuthPrincipal } from '../../common/decorators';
import { PERMISSIONS } from '@timeforge/shared';
import { CreateTimeEntryDto, StartTimerDto, UpdateTimeEntryDto, TimeEntryQuery } from './dto';

@Injectable()
export class TimeTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Reads (own / team / org scoped) ────────────────────────────────────────

  async findAll(p: AuthPrincipal, query: TimeEntryQuery): Promise<PageResult<TimeEntry>> {
    const limit = Math.min(Number(query.limit ?? 20), 100);
    const where: Prisma.TimeEntryWhereInput = {
      tenantId: p.tenantId,
      organizationId: p.organizationId,
      deletedAt: null,
      ...(await this.resolveUserFilter(p, query.userId)),
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.workCategoryId ? { workCategoryId: query.workCategoryId } : {}),
      ...(query.running === 'true' ? { endTime: null } : {}),
      ...(query.from || query.to
        ? {
            startTime: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(query.cursor ? { id: { gt: decodeCursor(query.cursor) } } : {}),
    };
    const items = await this.prisma.timeEntry.findMany({
      where,
      orderBy: [{ startTime: 'desc' }, { id: 'asc' }],
      take: limit + 1,
    });
    return buildPage(items, limit);
  }

  async findOne(p: AuthPrincipal, id: string): Promise<TimeEntry> {
    const entry = await this.prisma.timeEntry.findFirst({
      where: { id, tenantId: p.tenantId, organizationId: p.organizationId, deletedAt: null },
    });
    if (!entry) throw new NotFoundException('Time entry not found');
    if (entry.userId !== p.userId && !(await this.canViewOther(p, entry.userId))) {
      throw new ForbiddenException('Not permitted to view this entry');
    }
    return entry;
  }

  // ── Writes (own only) ───────────────────────────────────────────────────────

  async create(p: AuthPrincipal, dto: CreateTimeEntryDto): Promise<TimeEntry> {
    const start = new Date(dto.startTime);
    const end = dto.endTime ? new Date(dto.endTime) : null;
    if (end && end <= start) throw new UnprocessableEntityException('endTime must be after startTime');
    await this.validateRefs(p, dto.projectId, dto.clientId, dto.workCategoryId);
    if (!end) await this.assertNoRunningTimer(p);
    return this.prisma.timeEntry.create({
      data: {
        tenantId: p.tenantId,
        organizationId: p.organizationId,
        userId: p.userId,
        source: 'MANUAL',
        startTime: start,
        endTime: end,
        durationMinutes: end ? this.minutes(start, end) : null,
        projectId: dto.projectId ?? null,
        clientId: dto.clientId ?? null,
        workCategoryId: dto.workCategoryId ?? null,
        description: dto.description ?? null,
        referenceLinks: dto.referenceLinks ?? undefined,
        createdBy: p.userId,
        updatedBy: p.userId,
      },
    });
  }

  async startTimer(p: AuthPrincipal, dto: StartTimerDto): Promise<TimeEntry> {
    await this.assertNoRunningTimer(p);
    await this.validateRefs(p, dto.projectId, dto.clientId, dto.workCategoryId);
    return this.prisma.timeEntry.create({
      data: {
        tenantId: p.tenantId,
        organizationId: p.organizationId,
        userId: p.userId,
        source: 'TIMER',
        startTime: new Date(),
        endTime: null,
        durationMinutes: null,
        projectId: dto.projectId ?? null,
        clientId: dto.clientId ?? null,
        workCategoryId: dto.workCategoryId ?? null,
        description: dto.description ?? null,
        createdBy: p.userId,
        updatedBy: p.userId,
      },
    });
  }

  async stopTimer(p: AuthPrincipal, id: string): Promise<TimeEntry> {
    const entry = await this.ownEntry(p, id);
    if (entry.endTime) throw new ConflictException('Timer is already stopped');
    const end = new Date();
    return this.prisma.timeEntry.update({
      where: { id },
      data: {
        endTime: end,
        durationMinutes: this.minutes(entry.startTime, end),
        updatedBy: p.userId,
        version: { increment: 1 },
      },
    });
  }

  async update(p: AuthPrincipal, id: string, dto: UpdateTimeEntryDto): Promise<TimeEntry> {
    const entry = await this.ownEntry(p, id);
    if (entry.version !== dto.version) throw new ConflictException('Version mismatch');
    if (entry.timesheetId) throw new ConflictException('Entry is locked by a submitted timesheet');

    const start = dto.startTime ? new Date(dto.startTime) : entry.startTime;
    const end = dto.endTime ? new Date(dto.endTime) : entry.endTime;
    if (end && end <= start) throw new UnprocessableEntityException('endTime must be after startTime');
    await this.validateRefs(p, dto.projectId, dto.clientId, dto.workCategoryId);

    return this.prisma.timeEntry.update({
      where: { id },
      data: {
        startTime: start,
        endTime: end,
        durationMinutes: end ? this.minutes(start, end) : null,
        projectId: dto.projectId ?? entry.projectId,
        clientId: dto.clientId ?? entry.clientId,
        workCategoryId: dto.workCategoryId ?? entry.workCategoryId,
        description: dto.description ?? entry.description,
        referenceLinks: dto.referenceLinks ?? undefined,
        updatedBy: p.userId,
        version: { increment: 1 },
      },
    });
  }

  async remove(p: AuthPrincipal, id: string, version: number): Promise<void> {
    const entry = await this.ownEntry(p, id);
    if (entry.version !== version) throw new ConflictException('Version mismatch');
    if (entry.timesheetId) throw new ConflictException('Entry is locked by a submitted timesheet');
    await this.prisma.timeEntry.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: p.userId, version: { increment: 1 } },
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private can(p: AuthPrincipal, perm: string): boolean {
    return p.permissions.includes('*') || p.permissions.includes(perm);
  }

  private async resolveUserFilter(
    p: AuthPrincipal,
    requestedUserId?: string,
  ): Promise<Prisma.TimeEntryWhereInput> {
    if (this.can(p, PERMISSIONS.TIME_ENTRY_READ_ORG)) {
      return requestedUserId ? { userId: requestedUserId } : {};
    }
    if (this.can(p, PERMISSIONS.TIME_ENTRY_READ_TEAM)) {
      const ids = await this.teamUserIds(p);
      if (requestedUserId && !ids.includes(requestedUserId)) {
        throw new ForbiddenException('That user is outside your team');
      }
      return { userId: requestedUserId ?? { in: ids } };
    }
    if (requestedUserId && requestedUserId !== p.userId) {
      throw new ForbiddenException('You can only view your own entries');
    }
    return { userId: p.userId };
  }

  private async canViewOther(p: AuthPrincipal, ownerId: string): Promise<boolean> {
    if (this.can(p, PERMISSIONS.TIME_ENTRY_READ_ORG)) return true;
    if (this.can(p, PERMISSIONS.TIME_ENTRY_READ_TEAM)) {
      return (await this.teamUserIds(p)).includes(ownerId);
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

  private minutes(start: Date, end: Date): number {
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
  }

  private async ownEntry(p: AuthPrincipal, id: string): Promise<TimeEntry> {
    const entry = await this.prisma.timeEntry.findFirst({
      where: { id, tenantId: p.tenantId, organizationId: p.organizationId, deletedAt: null },
    });
    if (!entry) throw new NotFoundException('Time entry not found');
    if (entry.userId !== p.userId) throw new ForbiddenException('You can only modify your own entries');
    return entry;
  }

  private async assertNoRunningTimer(p: AuthPrincipal): Promise<void> {
    const running = await this.prisma.timeEntry.findFirst({
      where: { tenantId: p.tenantId, userId: p.userId, endTime: null, deletedAt: null },
    });
    if (running) throw new ConflictException('You already have a running timer');
  }

  private async validateRefs(
    p: AuthPrincipal,
    projectId?: string,
    clientId?: string,
    workCategoryId?: string,
  ): Promise<void> {
    const scope = { tenantId: p.tenantId, organizationId: p.organizationId, deletedAt: null };
    if (projectId && !(await this.prisma.project.findFirst({ where: { id: projectId, ...scope } }))) {
      throw new UnprocessableEntityException('Invalid projectId');
    }
    if (clientId && !(await this.prisma.client.findFirst({ where: { id: clientId, ...scope } }))) {
      throw new UnprocessableEntityException('Invalid clientId');
    }
    if (
      workCategoryId &&
      !(await this.prisma.workCategory.findFirst({ where: { id: workCategoryId, ...scope } }))
    ) {
      throw new UnprocessableEntityException('Invalid workCategoryId');
    }
  }
}
