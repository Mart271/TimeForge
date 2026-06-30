import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildPage, decodeCursor, PageResult } from '../../common/crud/crud.service';
import { AuthPrincipal } from '../../common/decorators';
import { PERMISSIONS } from '@timeforge/shared';
import {
  CreateKpiTemplateDto,
  KpiProgressQuery,
  KpiTemplateQuery,
  UpdateKpiTemplateDto,
} from './dto';

@Injectable()
export class KpiService {
  constructor(private readonly prisma: PrismaService) {}

  // ── KPI Templates ────────────────────────────────────────────────────────────

  async findAllTemplates(p: AuthPrincipal, query: KpiTemplateQuery) {
    const limit = Math.min(Number(query.limit ?? 20), 100);
    const where: Prisma.KpiTemplateWhereInput = {
      tenantId: p.tenantId,
      organizationId: p.organizationId,
      deletedAt: null,
      ...(query.q
        ? { name: { contains: query.q, mode: 'insensitive' } }
        : {}),
      ...(query.cursor ? { id: { gt: decodeCursor(query.cursor) } } : {}),
    };
    const items = await this.prisma.kpiTemplate.findMany({
      where,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });
    return buildPage(items, limit);
  }

  async findOneTemplate(p: AuthPrincipal, id: string) {
    const template = await this.prisma.kpiTemplate.findFirst({
      where: { id, tenantId: p.tenantId, organizationId: p.organizationId, deletedAt: null },
    });
    if (!template) throw new NotFoundException('KPI template not found');
    return template;
  }

  async createTemplate(p: AuthPrincipal, dto: CreateKpiTemplateDto) {
    // Check for duplicate name within org
    const exists = await this.prisma.kpiTemplate.findFirst({
      where: {
        tenantId: p.tenantId,
        organizationId: p.organizationId,
        name: dto.name,
        deletedAt: null,
      },
    });
    if (exists) throw new ConflictException('A KPI template with this name already exists');

    return this.prisma.kpiTemplate.create({
      data: {
        tenantId: p.tenantId,
        organizationId: p.organizationId,
        name: dto.name,
        description: dto.description ?? null,
        metricType: dto.metricType,
        period: dto.period,
        targetValue: dto.targetValue,
        appliesTo: dto.appliesTo ?? undefined,
        templateVersion: 1,
        createdBy: p.userId,
        updatedBy: p.userId,
      },
    });
  }

  async updateTemplate(p: AuthPrincipal, id: string, dto: UpdateKpiTemplateDto) {
    const template = await this.prisma.kpiTemplate.findFirst({
      where: { id, tenantId: p.tenantId, organizationId: p.organizationId, deletedAt: null },
    });
    if (!template) throw new NotFoundException('KPI template not found');
    if (template.version !== dto.version) throw new ConflictException('Version mismatch');

    // Check name uniqueness if name is being changed
    if (dto.name && dto.name !== template.name) {
      const nameConflict = await this.prisma.kpiTemplate.findFirst({
        where: {
          tenantId: p.tenantId,
          organizationId: p.organizationId,
          name: dto.name,
          deletedAt: null,
          id: { not: id },
        },
      });
      if (nameConflict) throw new ConflictException('A KPI template with this name already exists');
    }

    return this.prisma.kpiTemplate.update({
      where: { id },
      data: {
        name: dto.name ?? template.name,
        description: dto.description !== undefined ? dto.description : template.description,
        metricType: dto.metricType ?? template.metricType,
        period: dto.period ?? template.period,
        targetValue: dto.targetValue ?? template.targetValue,
        appliesTo: dto.appliesTo !== undefined ? dto.appliesTo : (template.appliesTo ?? undefined),
        templateVersion: { increment: 1 }, // bump version on every update
        updatedBy: p.userId,
        version: { increment: 1 },
      },
    });
  }

  async removeTemplate(p: AuthPrincipal, id: string, version: number) {
    const template = await this.prisma.kpiTemplate.findFirst({
      where: { id, tenantId: p.tenantId, organizationId: p.organizationId, deletedAt: null },
    });
    if (!template) throw new NotFoundException('KPI template not found');
    if (template.version !== version) throw new ConflictException('Version mismatch');

    await this.prisma.kpiTemplate.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: p.userId, version: { increment: 1 } },
    });
  }

  // ── KPI Progress ─────────────────────────────────────────────────────────────

  /**
   * KPI progress is read-only via API; it is updated internally by the
   * approval decision handler (BR-KPI-01: updates only from approved logs).
   */
  async findProgress(p: AuthPrincipal, query: KpiProgressQuery): Promise<PageResult<any>> {
    const limit = Math.min(Number(query.limit ?? 20), 100);
    const where: Prisma.KpiProgressWhereInput = {
      tenantId: p.tenantId,
      organizationId: p.organizationId,
      deletedAt: null,
      ...(await this.resolveProgressUserFilter(p, query.userId)),
      ...(query.kpiTemplateId ? { kpiTemplateId: query.kpiTemplateId } : {}),
      ...(query.periodKey ? { periodKey: query.periodKey } : {}),
      ...(query.cursor ? { id: { gt: decodeCursor(query.cursor) } } : {}),
    };
    const items = await this.prisma.kpiProgress.findMany({
      where,
      include: { kpiTemplate: { select: { name: true, metricType: true, period: true } } },
      orderBy: [{ periodKey: 'desc' }, { id: 'asc' }],
      take: limit + 1,
    });
    return buildPage(items as any[], limit);
  }

  /**
   * System-internal: upsert KPI progress for a user when a timesheet is approved.
   * Adds approved hours to HOURS-metric KPIs applicable to the user.
   * Called from ApprovalsService after successful APPROVE decision.
   */
  async upsertProgressFromApproval(
    tenantId: string,
    organizationId: string,
    userId: string,
    approvedMinutes: number,
  ): Promise<void> {
    const approvedHours = approvedMinutes / 60;

    // Find all HOURS metric templates for this org
    const templates = await this.prisma.kpiTemplate.findMany({
      where: {
        tenantId,
        organizationId,
        metricType: 'HOURS',
        deletedAt: null,
      },
    });

    for (const tpl of templates) {
      // periodKey: use YYYY-MM for MONTHLY, YYYY-WNN for WEEKLY etc.
      const now = new Date();
      const periodKey = this.buildPeriodKey(tpl.period, now);

      await this.prisma.kpiProgress.upsert({
        where: {
          tenantId_kpiTemplateId_userId_periodKey: {
            tenantId,
            kpiTemplateId: tpl.id,
            userId,
            periodKey,
          },
        },
        create: {
          tenantId,
          organizationId,
          kpiTemplateId: tpl.id,
          userId,
          periodKey,
          currentValue: approvedHours,
          targetValue: tpl.targetValue,
          createdBy: userId,
          updatedBy: userId,
        },
        update: {
          currentValue: { increment: approvedHours },
          updatedBy: userId,
          version: { increment: 1 },
        },
      });
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private can(p: AuthPrincipal, perm: string): boolean {
    return p.permissions.includes('*') || p.permissions.includes(perm);
  }

  private async resolveProgressUserFilter(
    p: AuthPrincipal,
    requestedUserId?: string,
  ): Promise<Prisma.KpiProgressWhereInput> {
    if (this.can(p, PERMISSIONS.KPI_PROGRESS_READ_ORG)) {
      return requestedUserId ? { userId: requestedUserId } : {};
    }
    if (this.can(p, PERMISSIONS.KPI_PROGRESS_READ_TEAM)) {
      const ids = await this.teamUserIds(p);
      if (requestedUserId && !ids.includes(requestedUserId)) {
        throw new ForbiddenException('That user is outside your team');
      }
      return { userId: requestedUserId ?? { in: ids } };
    }
    // Own only
    if (requestedUserId && requestedUserId !== p.userId) {
      throw new ForbiddenException('You can only view your own KPI progress');
    }
    return { userId: p.userId };
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

  private buildPeriodKey(period: string, date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = date.getUTCDate();

    switch (period) {
      case 'DAILY':
        return `${y}-${m}-${String(d).padStart(2, '0')}`;
      case 'WEEKLY': {
        // ISO week number
        const startOfYear = new Date(Date.UTC(y, 0, 1));
        const weekNum = Math.ceil(
          ((date.getTime() - startOfYear.getTime()) / 86_400_000 + startOfYear.getUTCDay() + 1) / 7,
        );
        return `${y}-W${String(weekNum).padStart(2, '0')}`;
      }
      case 'PAYROLL_PERIOD':
        return d <= 15 ? `${y}-${m}-H1` : `${y}-${m}-H2`;
      case 'MONTHLY':
      default:
        return `${y}-${m}`;
    }
  }
}
