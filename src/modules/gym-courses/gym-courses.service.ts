import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GymCoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId obligatoire');

    return this.prisma.gymCourse.findMany({
      where: { tenantId: tenantId.trim() },
      include: { coach: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async create(tenantId: string, body: any) {
    const cleanTenantId = tenantId?.trim();

    if (!cleanTenantId) throw new BadRequestException('tenantId obligatoire');
    if (!body?.title?.trim()) throw new BadRequestException('Nom du cours obligatoire');
    if (!body?.dayOfWeek?.trim()) throw new BadRequestException('Jour obligatoire');
    if (!body?.startTime?.trim()) throw new BadRequestException('Heure début obligatoire');
    if (!body?.endTime?.trim()) throw new BadRequestException('Heure fin obligatoire');

    return this.prisma.gymCourse.create({
      data: {
        tenantId: cleanTenantId,
        coachId: body.coachId || null,
        title: body.title.trim(),
        description: body.description?.trim() || null,
        dayOfWeek: body.dayOfWeek.trim(),
        startTime: body.startTime.trim(),
        endTime: body.endTime.trim(),
        capacity: body.capacity ? Number(body.capacity) : null,
        isActive: body.isActive !== undefined ? !!body.isActive : true,
      },
      include: { coach: true },
    });
  }

  async update(tenantId: string, id: string, body: any) {
    const existing = await this.prisma.gymCourse.findFirst({
      where: { id, tenantId },
    });

    if (!existing) throw new BadRequestException('Cours introuvable');

    return this.prisma.gymCourse.update({
      where: { id },
      data: {
        coachId: body.coachId !== undefined ? body.coachId || null : existing.coachId,
        title: body.title !== undefined ? body.title.trim() : existing.title,
        description:
          body.description !== undefined
            ? body.description?.trim() || null
            : existing.description,
        dayOfWeek: body.dayOfWeek !== undefined ? body.dayOfWeek.trim() : existing.dayOfWeek,
        startTime: body.startTime !== undefined ? body.startTime.trim() : existing.startTime,
        endTime: body.endTime !== undefined ? body.endTime.trim() : existing.endTime,
        capacity:
          body.capacity !== undefined
            ? body.capacity
              ? Number(body.capacity)
              : null
            : existing.capacity,
        isActive: body.isActive !== undefined ? !!body.isActive : existing.isActive,
      },
      include: { coach: true },
    });
  }

  async setActive(tenantId: string, id: string, isActive: boolean) {
    const existing = await this.prisma.gymCourse.findFirst({
      where: { id, tenantId },
    });

    if (!existing) throw new BadRequestException('Cours introuvable');

    await this.prisma.gymCourse.update({
      where: { id },
      data: { isActive },
    });

    return { message: isActive ? 'Cours activé' : 'Cours désactivé' };
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.gymCourse.findFirst({
      where: { id, tenantId },
    });

    if (!existing) throw new BadRequestException('Cours introuvable');

    await this.prisma.gymCourse.delete({ where: { id } });

    return { message: 'Cours supprimé' };
  }
}
