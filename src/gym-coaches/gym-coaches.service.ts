import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GymCoachesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.gymCoach.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
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
    return this.prisma.gymCoach.create({
      data: {
        tenantId,
        name: data.name,
        specialty: data.specialty || null,
        phone: data.phone || null,
        email: data.email || null,
      },
    });
  }
}
