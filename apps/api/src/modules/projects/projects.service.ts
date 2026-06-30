import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildPage, decodeCursor, ListQuery, PageResult } from '../../common/crud/crud.service';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import { Project } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, orgId: string, query: ListQuery): Promise<PageResult<Project>> {
    const limit = Math.min(Number(query.limit ?? 20), 100);
    const cursorWhere = query.cursor ? { id: { gt: decodeCursor(query.cursor) } } : {};
    const nameWhere = query.q ? { name: { contains: String(query.q), mode: 'insensitive' as const } } : {};
    const clientWhere = query.clientId ? { clientId: String(query.clientId) } : {};
    const billableWhere = query.billable !== undefined ? { billable: query.billable === 'true' } : {};
    const items = await this.prisma.project.findMany({
      where: { tenantId, organizationId: orgId, deletedAt: null, ...cursorWhere, ...nameWhere, ...clientWhere, ...billableWhere },
      orderBy: { name: 'asc' },
      take: limit + 1,
    });
    return buildPage(items, limit);
  }

  async findOne(tenantId: string, orgId: string, id: string): Promise<Project> {
    const item = await this.prisma.project.findFirst({ where: { id, tenantId, organizationId: orgId, deletedAt: null } });
    if (!item) throw new NotFoundException('Project not found');
    return item;
  }

  async create(tenantId: string, orgId: string, actorId: string, dto: CreateProjectDto): Promise<Project> {
    if (dto.clientId) {
      const client = await this.prisma.client.findFirst({ where: { id: dto.clientId, tenantId, organizationId: orgId, deletedAt: null } });
      if (!client) throw new NotFoundException('Client not found');
    }
    try {
      return await this.prisma.project.create({
        data: { tenantId, organizationId: orgId, ...dto, billable: dto.billable ?? true, createdBy: actorId, updatedBy: actorId },
      });
    } catch (err: unknown) { handleP2002(err); }
  }

  async update(tenantId: string, orgId: string, id: string, actorId: string, dto: UpdateProjectDto): Promise<Project> {
    const existing = await this.findOne(tenantId, orgId, id);
    if (existing.version !== dto.version) throw new ConflictException('Version mismatch');
    if (dto.clientId) {
      const client = await this.prisma.client.findFirst({ where: { id: dto.clientId, tenantId, organizationId: orgId, deletedAt: null } });
      if (!client) throw new NotFoundException('Client not found');
    }
    const { version, ...rest } = dto;
    try {
      return await this.prisma.project.update({ where: { id }, data: { ...rest, updatedBy: actorId, version: { increment: 1 } } });
    } catch (err: unknown) { handleP2002(err); }
  }

  async remove(tenantId: string, orgId: string, id: string, actorId: string, version: number): Promise<void> {
    const existing = await this.findOne(tenantId, orgId, id);
    if (existing.version !== version) throw new ConflictException('Version mismatch');
    await this.prisma.project.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: actorId, version: { increment: 1 } } });
  }
}

function handleP2002(err: unknown): never {
  const e = err as { code?: string };
  if (e?.code === 'P2002') throw new ConflictException('A project with this code already exists');
  throw err;
}
