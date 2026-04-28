import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GymCoachesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    const cleanTenantId = tenantId?.trim();

    if (!cleanTenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    const coaches = await this.prisma.gymCoach.findMany({
      where: { tenantId: cleanTenantId },
      orderBy: { createdAt: 'desc' },
    });

    return coaches.map((coach: any) => ({
      ...coach,
      displayName:
        coach.name ||
        coach.fullName ||
        `${coach.firstName || ''} ${coach.lastName || ''}`.trim() ||
        coach.email ||
        'Coach',
    }));
  }

  async create(
    tenantId: string,
    data: {
      name: string;
      specialty?: string;
      phone?: string;
      email?: string;
    },
  ) {
    const cleanTenantId = tenantId?.trim();
    const name = data.name?.trim();

    if (!cleanTenantId) {
      throw new BadRequestException('tenantId obligatoire');
    }

    if (!name) {
      throw new BadRequestException('Nom du coach obligatoire');
    }

    return this.prisma.gymCoach.create({
      data: {
        tenantId: cleanTenantId,
        name,
        specialty: data.specialty?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim().toLowerCase() || null,
      },
    });
  }

  async update(id: string, tenantId: string, body: any) {
  return this.prisma.gymCoach.update({
    where: { id },
    data: {
      name: body.name,
      specialty: body.specialty,
      phone: body.phone,
      email: body.email,
    },
  });
}
}



