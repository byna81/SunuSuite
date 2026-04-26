import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GymCoursesService {
  constructor(private prisma: PrismaService) {}

  // =============================
  // GET ALL COURSES
  // =============================
  async getAll(tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    return this.prisma.gymCourse.findMany({
      where: { tenantId },
      include: {
        coach: true, // IMPORTANT pour afficher prénom/nom côté mobile
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // =============================
  // CREATE COURSE
  // =============================
  async create(tenantId: string, body: any) {
    if (!tenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    if (!body.title || body.title.trim() === '') {
      throw new BadRequestException('Nom du cours obligatoire');
    }

    if (!body.daysOfWeek || !Array.isArray(body.daysOfWeek)) {
      throw new BadRequestException('Jours obligatoires');
    }

    return this.prisma.gymCourse.create({
      data: {
        tenantId,

        coachId: body.coachId || null,

        title: body.title.trim(),
        description: body.description || null,

        daysOfWeek: body.daysOfWeek,

        startTime: body.startTime || null,
        endTime: body.endTime || null,

        capacity:
          body.capacity !== undefined && body.capacity !== ''
            ? Number(body.capacity)
            : null,

        location: body.location || null,

        level: body.level || null,
        accessType: body.accessType || 'subscription',

        sessionPrice:
          body.sessionPrice !== undefined && body.sessionPrice !== ''
            ? Number(body.sessionPrice)
            : null,
      },
    });
  }

  // =============================
  // UPDATE COURSE
  // =============================
  async update(id: string, tenantId: string, body: any) {
    if (!tenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    const existing = await this.prisma.gymCourse.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new BadRequestException('Cours introuvable');
    }

    return this.prisma.gymCourse.update({
      where: { id },
      data: {
        title: body.title ?? existing.title,
        description: body.description ?? existing.description,

        daysOfWeek: body.daysOfWeek ?? existing.daysOfWeek,

        startTime: body.startTime ?? existing.startTime,
        endTime: body.endTime ?? existing.endTime,

        capacity:
          body.capacity !== undefined && body.capacity !== ''
            ? Number(body.capacity)
            : existing.capacity,

        coachId: body.coachId ?? existing.coachId,

        location: body.location ?? existing.location,

        level: body.level ?? existing.level,
        accessType: body.accessType ?? existing.accessType,

        sessionPrice:
          body.sessionPrice !== undefined && body.sessionPrice !== ''
            ? Number(body.sessionPrice)
            : existing.sessionPrice,
      },
    });
  }

  // =============================
  // DELETE COURSE
  // =============================
  async delete(id: string, tenantId: string) {
    if (!tenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    const existing = await this.prisma.gymCourse.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new BadRequestException('Cours introuvable');
    }

    await this.prisma.gymCourse.delete({
      where: { id },
    });

    return { message: 'Cours supprimé' };
  }

  // =============================
  // ACTIVATE / DEACTIVATE
  // =============================
  async activate(id: string, tenantId: string) {
    return this.setActive(id, tenantId, true);
  }

  async deactivate(id: string, tenantId: string) {
    return this.setActive(id, tenantId, false);
  }

  private async setActive(
    id: string,
    tenantId: string,
    isActive: boolean,
  ) {
    if (!tenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    const existing = await this.prisma.gymCourse.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new BadRequestException('Cours introuvable');
    }

    await this.prisma.gymCourse.update({
      where: { id },
      data: { isActive },
    });

    return {
      message: isActive ? 'Cours activé' : 'Cours désactivé',
    };
  }
}
