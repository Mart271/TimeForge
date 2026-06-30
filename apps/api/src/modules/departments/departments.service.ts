import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildPage, decodeCursor, ListQuery, PageResult } from '../../common/crud/crud.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto';
import { Department } from '@prisma/client';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, orgId: string, query: ListQuery): Promise<PageResult<Department>> {
    const limit = Math.min(Number(query.limit ?? 20), 100);
    const cursorWhere = query.cursor ? { id: { gt: decodeCursor(query.cursor) } } : {};
    const nameWhere = query.q ? { name: { contains: String(query.q), mode: 'insensitive' as const } } : {};
    const items = await this.prisma.department.findMany({
      where: { tenantId, organizationId: orgId, deletedAt: null, ...cursorWhere, ...nameWhere },
      orderBy: { name: 'asc' },
      take: limit + 1,
    });
    return buildPage(items, limit);
  }

  async findOne(tenantId: string, orgId: string, id: string): Promise<Department> {
    const item = await this.prisma.department.findFirst({ where: { id, tenantId, organizationId: orgId, deletedAt: null } });
    if (!item) throw new NotFoundException('Department not found');
    return item;
  }

  async create(tenantId: string, orgId: string, actorId: string, dto: CreateDepartmentDto): Promise<Department> {
    try {
      return await this.prisma.department.create({
        data: { tenantId, organizationId: orgId, name: dto.name, createdBy: actorId, updatedBy: actorId },
      });
    } catch (err: unknown) { handleP2002(err); }
  }

  async update(tenantId: string, orgId: string, id: string, actorId: string, dto: UpdateDepartmentDto): Promise<Department> {
    const existing = await this.findOne(tenantId, orgId, id);
    if (existing.version !== dto.version) throw new ConflictException('Version mismatch');
    const { version, ...rest } = dto;
    try {
      return await this.prisma.department.update({ where: { id }, data: { ...rest, updatedBy: actorId, version: { increment: 1 } } });
    } catch (err: unknown) { handleP2002(err); }
  }

  async remove(tenantId: string, orgId: string, id: string, actorId: string, version: number): Promise<void> {
    const existing = await this.findOne(tenantId, orgId, id);
    if (existing.version !== version) throw new ConflictException('Version mismatch');
    await this.prisma.department.update({ where: { id }, data: { deletedAt: new Date(), updatedBy: actorId, version: { increment: 1 } } });
  }
}

function handleP2002(err: unknown): never {
  const e = err as { code?: string };
  if (e?.code === 'P2002') throw new ConflictException('A department with this name already exists');
  throw err;
}
