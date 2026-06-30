import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateOrgDto, CreateHolidayDto } from './dto';

const KNOWN_SETTING_TYPES: Record<string, string> = {
  'timezone': 'scalar',
  'payroll.periods': 'json',
  'payroll.overtime': 'json',
  'schedule.workweek': 'json',
  'ai.provider': 'scalar',
  'ai.model': 'scalar',
  'ai.toggles': 'json',
  'ai.token_budget': 'scalar',
};

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Profile ─────────────────────────────────────────────────────────────────

  async getOrg(tenantId: string, organizationId: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id: organizationId, tenantId, deletedAt: null },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async updateOrg(
    tenantId: string,
    organizationId: string,
    actorId: string,
    dto: UpdateOrgDto,
  ) {
    await this.getOrg(tenantId, organizationId);
    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: { ...dto, updatedBy: actorId, version: { increment: 1 } },
    });
    await this.audit(tenantId, actorId, AuditAction.SETTINGS_CHANGE, 'organization', organizationId);
    return updated;
  }

  // ── Settings ─────────────────────────────────────────────────────────────────

  async getSettings(tenantId: string, organizationId: string) {
    return this.prisma.organizationSetting.findMany({
      where: { tenantId, organizationId, deletedAt: null },
      orderBy: { key: 'asc' },
    });
  }

  async upsertSetting(
    tenantId: string,
    organizationId: string,
    actorId: string,
    key: string,
    value: unknown,
    typeHint?: string,
  ) {
    const type = typeHint ?? KNOWN_SETTING_TYPES[key] ?? 'json';
    if (type === 'scalar' && typeof value !== 'string' && typeof value !== 'number') {
      throw new UnprocessableEntityException(`Setting '${key}' expects a scalar value`);
    }
    const result = await this.prisma.organizationSetting.upsert({
      where: { tenantId_organizationId_key: { tenantId, organizationId, key } },
      update: { value: value as object, type, updatedBy: actorId, version: { increment: 1 } },
      create: { tenantId, organizationId, key, value: value as object, type, createdBy: actorId, updatedBy: actorId },
    });
    await this.audit(tenantId, actorId, AuditAction.SETTINGS_CHANGE, 'setting', result.id);
    return result;
  }

  // ── Holidays ─────────────────────────────────────────────────────────────────

  async getHolidays(tenantId: string, organizationId: string) {
    return this.prisma.holiday.findMany({
      where: { tenantId, organizationId, deletedAt: null },
      orderBy: { date: 'asc' },
    });
  }

  async createHoliday(
    tenantId: string,
    organizationId: string,
    actorId: string,
    dto: CreateHolidayDto,
  ) {
    try {
      const holiday = await this.prisma.holiday.create({
        data: {
          tenantId,
          organizationId,
          name: dto.name,
          date: new Date(dto.date),
          recurring: dto.recurring ?? false,
          createdBy: actorId,
          updatedBy: actorId,
        },
      });
      await this.audit(tenantId, actorId, AuditAction.ADMIN_ACTION, 'holiday', holiday.id);
      return holiday;
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e?.code === 'P2002') throw new ConflictException('Holiday already exists for this date and name');
      throw err;
    }
  }

  async removeHoliday(
    tenantId: string,
    organizationId: string,
    actorId: string,
    id: string,
    version: number,
  ) {
    const holiday = await this.prisma.holiday.findFirst({
      where: { id, tenantId, organizationId, deletedAt: null },
    });
    if (!holiday) throw new NotFoundException('Holiday not found');
    if (holiday.version !== version) throw new ConflictException('Version mismatch');
    await this.prisma.holiday.update({
      where: { id },
      data: { deletedAt: new Date(), updatedBy: actorId, version: { increment: 1 } },
    });
    await this.audit(tenantId, actorId, AuditAction.ADMIN_ACTION, 'holiday', id);
  }

  private async audit(
    tenantId: string,
    actorId: string,
    action: AuditAction,
    entityType: string,
    entityId: string,
  ) {
    await this.prisma.auditLog.create({ data: { tenantId, actorId, action, entityType, entityId } });
  }
}
